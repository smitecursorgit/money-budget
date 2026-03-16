import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getBudgetId } from '../lib/budget';

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
    const budgetId = await getBudgetId(userId);
    const fromParam = parseDate(req.query.from);
    const toParam = parseDate(req.query.to);

    if ((req.query.from && !fromParam) || (req.query.to && !toParam)) {
      res.status(400).json({ error: 'Неверный формат даты. Используйте ISO 8601.' });
      return;
    }

    const [user, budget] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      budgetId ? prisma.budget.findUnique({ where: { id: budgetId } }) : null,
    ]);
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

    const txWhere = budgetId
      ? { OR: [{ budgetId }, { userId, budgetId: null }], date: { gte: dateFrom, lt: dateTo } }
      : { userId, date: { gte: dateFrom, lt: dateTo } };

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...txWhere, type: 'income' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...txWhere, type: 'expense' },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);
    const initialBalance = budget ? Number(budget.initialBalance) : 0;

    res.json({
      income,
      expense,
      balance: initialBalance + income - expense,
      initialBalance,
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
    const budgetId = await getBudgetId(userId);
    const fromParam = parseDate(req.query.from);
    const toParam = parseDate(req.query.to);

    if ((req.query.from && !fromParam) || (req.query.to && !toParam)) {
      res.status(400).json({ error: 'Неверный формат даты. Используйте ISO 8601.' });
      return;
    }

    const { type } = req.query;
    const typeFilter = type === 'income' || type === 'expense' ? type : undefined;

    const baseWhere = budgetId ? { OR: [{ budgetId }, { userId, budgetId: null }] } : { userId };
    const where: Record<string, unknown> = { ...baseWhere };
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
    const budgetId = await getBudgetId(userId);
    const months = Math.min(Math.max(parseInt((req.query.months as string) || '6'), 1), 24);

    const where = budgetId
      ? { OR: [{ budgetId }, { userId, budgetId: null }], date: { gte: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000) } }
      : { userId, date: { gte: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000) } };

    const txs = await prisma.transaction.findMany({
      where,
      select: { date: true, type: true, amount: true },
    });

    const byMonth = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const month = t.date.toISOString().slice(0, 7);
      if (!byMonth.has(month)) byMonth.set(month, { income: 0, expense: 0 });
      const acc = byMonth.get(month)!;
      const amt = Number(t.amount);
      if (t.type === 'income') acc.income += amt;
      else acc.expense += amt;
    }

    const rows = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { income, expense }]) => ({ month, income, expense }));

    res.json(rows);
  } catch (err) {
    console.error('Stats monthly error:', err);
    res.status(500).json({ error: 'Не удалось загрузить помесячную статистику' });
  }
});

export default router;
