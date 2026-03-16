import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authMiddleware);

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Returns the UTC offset in milliseconds for a timezone at a given point in time. */
function getTzOffsetMs(tz: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * Calculates the current billing period boundaries in UTC,
 * correctly adjusted for the user's timezone.
 */
function getCurrentPeriod(tz: string, periodStart: number): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  const offsetMs = getTzOffsetMs(tz, now);

  // Shift `now` by the offset to get a Date whose UTC fields equal local wall-clock time
  const localNow = new Date(now.getTime() + offsetMs);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth(); // 0-based
  const day = localNow.getUTCDate();

  let dateFrom: Date;
  let dateTo: Date;

  if (day >= periodStart) {
    dateFrom = new Date(Date.UTC(year, month, periodStart) - offsetMs);
    dateTo = new Date(Date.UTC(year, month + 1, periodStart) - offsetMs);
  } else {
    dateFrom = new Date(Date.UTC(year, month - 1, periodStart) - offsetMs);
    dateTo = new Date(Date.UTC(year, month, periodStart) - offsetMs);
  }

  return { dateFrom, dateTo };
}

router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const fromParam = parseDate(req.query.from);
    const toParam = parseDate(req.query.to);

    if ((req.query.from && !fromParam) || (req.query.to && !toParam)) {
      res.status(400).json({ error: 'Неверный формат даты. Используйте ISO 8601.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const tz = user?.timezone || 'Europe/Moscow';
    const periodStart = user?.periodStart || 1;

    let dateFrom: Date;
    let dateTo: Date;

    if (fromParam && toParam) {
      dateFrom = fromParam;
      dateTo = toParam;
    } else {
      ({ dateFrom, dateTo } = getCurrentPeriod(tz, periodStart));
    }

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'income', date: { gte: dateFrom, lt: dateTo } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: dateFrom, lt: dateTo } },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);

    res.json({
      income,
      expense,
      balance: income - expense,
      period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
    });
  } catch (err) {
    console.error('Stats summary error:', err);
    res.status(500).json({ error: 'Не удалось загрузить сводку' });
  }
});

router.get('/by-category', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const fromParam = parseDate(req.query.from);
    const toParam = parseDate(req.query.to);

    if ((req.query.from && !fromParam) || (req.query.to && !toParam)) {
      res.status(400).json({ error: 'Неверный формат даты. Используйте ISO 8601.' });
      return;
    }

    const { type } = req.query;
    const typeFilter = type === 'income' || type === 'expense' ? type : undefined;

    const where: Record<string, unknown> = { userId };
    if (typeFilter) where['type'] = typeFilter;
    if (fromParam || toParam) {
      where['date'] = {
        ...(fromParam ? { gte: fromParam } : {}),
        ...(toParam ? { lte: toParam } : {}),
      };
    }

    // DB-side GROUP BY — no loading all rows into JS memory
    const grouped = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    if (grouped.length === 0) {
      res.json([]);
      return;
    }

    // Batch-fetch category metadata
    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is string => id !== null);

    const categories = categoryIds.length
      ? await prisma.category.findMany({ where: { id: { in: categoryIds } } })
      : [];

    const catMap = new Map(categories.map((c) => [c.id, c]));

    const result = grouped
      .map((g) => {
        const cat = g.categoryId ? catMap.get(g.categoryId) : undefined;
        return {
          name: cat?.name ?? 'Без категории',
          icon: cat?.icon ?? '📦',
          color: cat?.color ?? '#71717a',
          total: Number(g._sum.amount ?? 0),
          count: g._count.id,
        };
      })
      .sort((a, b) => b.total - a.total);

    res.json(result);
  } catch (err) {
    console.error('Stats by-category error:', err);
    res.status(500).json({ error: 'Не удалось загрузить статистику по категориям' });
  }
});

router.get('/monthly', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const months = Math.min(Math.max(parseInt((req.query.months as string) || '6'), 1), 24);

    const rows = await prisma.$queryRaw<
      Array<{ month: string; income: string; expense: string }>
    >`
      SELECT
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= NOW() - (${months} * INTERVAL '1 month')
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    res.json(
      rows.map((r) => ({
        month: r.month,
        income: Number(r.income),
        expense: Number(r.expense),
      }))
    );
  } catch (err) {
    console.error('Stats monthly error:', err);
    res.status(500).json({ error: 'Не удалось загрузить помесячную статистику' });
  }
});

export default router;
