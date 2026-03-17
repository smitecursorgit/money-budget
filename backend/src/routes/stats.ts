import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { prisma, withRetry } from '../lib/prisma';
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

    const [user, budget] = await withRetry(() => Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      budgetId ? prisma.budget.findUnique({ where: { id: budgetId } }) : null,
    ]));
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

    const [incomeAgg, expenseAgg] = await withRetry(() => Promise.all([
      prisma.transaction.aggregate({
        where: { ...txWhere, type: 'income' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...txWhere, type: 'expense' },
        _sum: { amount: true },
      }),
    ]));

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
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    console.error('Stats summary error:', JSON.stringify({ code: e.code, message: e.message, stack: err instanceof Error ? err.stack : undefined }));
    res.status(500).json({ error: `Не удалось загрузить сводку: ${e.message?.slice(0, 150) || 'unknown'}` });
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
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    console.error('Stats by-category error:', JSON.stringify({ code: e.code, message: e.message }));
    res.status(500).json({ error: `Не удалось загрузить категории: ${e.message?.slice(0, 150) || 'unknown'}` });
  }
});

router.get('/monthly', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const budgetId = await getBudgetId(userId);
    const months = Math.min(Math.max(parseInt((req.query.months as string) || '6'), 1), 24);
    const cutoffDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

    // Aggregate at DB level — do NOT load all rows (was major perf issue for users with many transactions)
    const budgetCondition = budgetId
      ? Prisma.sql`(budget_id = ${budgetId} OR (user_id = ${userId} AND budget_id IS NULL))`
      : Prisma.sql`user_id = ${userId}`;

    type Row = { month: string; type: string; total: string };
    const rowsRaw = await prisma.$queryRaw<Row[]>(
      Prisma.sql`
        SELECT to_char(date, 'YYYY-MM') as month, type, SUM(amount::float) as total
        FROM transactions
        WHERE date >= ${cutoffDate}
          AND ${budgetCondition}
        GROUP BY to_char(date, 'YYYY-MM'), type
      `
    );

    const byMonth = new Map<string, { income: number; expense: number }>();
    for (const r of rowsRaw) {
      if (!byMonth.has(r.month)) byMonth.set(r.month, { income: 0, expense: 0 });
      const acc = byMonth.get(r.month)!;
      const amt = parseFloat(r.total) || 0;
      if (r.type === 'income') acc.income += amt;
      else acc.expense += amt;
    }

    const rows = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { income, expense }]) => ({ month, income, expense }));

    res.json(rows);
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    console.error('Stats monthly error:', JSON.stringify({ code: e.code, message: e.message }));
    res.status(500).json({ error: `Не удалось загрузить статистику: ${e.message?.slice(0, 150) || 'unknown'}` });
  }
});

export default router;
