import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authMiddleware);

router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { from, to } = req.query;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tz = user?.timezone || 'Europe/Moscow';
  const periodStart = user?.periodStart || 1;

  let dateFrom: Date;
  let dateTo: Date;

  if (from && to) {
    dateFrom = new Date(from as string);
    dateTo = new Date(to as string);
  } else {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    if (day >= periodStart) {
      dateFrom = new Date(year, month, periodStart);
      dateTo = new Date(year, month + 1, periodStart);
    } else {
      dateFrom = new Date(year, month - 1, periodStart);
      dateTo = new Date(year, month, periodStart);
    }
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: dateFrom, lt: dateTo } },
    select: { amount: true, type: true },
  });

  type TxRow = { amount: unknown; type: string };
  const income = (transactions as TxRow[])
    .filter((t) => t.type === 'income')
    .reduce((sum: number, t) => sum + Number(t.amount), 0);

  const expense = (transactions as TxRow[])
    .filter((t) => t.type === 'expense')
    .reduce((sum: number, t) => sum + Number(t.amount), 0);

  res.json({
    income,
    expense,
    balance: income - expense,
    period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
  });
});

router.get('/by-category', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { from, to, type } = req.query;

  const where: Record<string, unknown> = { userId };
  if (type) where['type'] = type;
  if (from || to) {
    where['date'] = {
      ...(from ? { gte: new Date(from as string) } : {}),
      ...(to ? { lte: new Date(to as string) } : {}),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { select: { name: true, icon: true, color: true } } },
  });

  const grouped: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};

  for (const t of transactions) {
    const key = t.categoryId || 'uncategorized';
    const name = t.category?.name || 'Без категории';
    const icon = t.category?.icon || '📦';
    const color = t.category?.color || '#71717a';

    if (!grouped[key]) {
      grouped[key] = { name, icon, color, total: 0, count: 0 };
    }
    grouped[key].total += Number(t.amount);
    grouped[key].count += 1;
  }

  const result = Object.values(grouped).sort((a, b) => b.total - a.total);
  res.json(result);
});

router.get('/monthly', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const months = parseInt((req.query.months as string) || '6');

  const rows = await prisma.$queryRaw<
    Array<{ month: string; income: string; expense: string }>
  >`
    SELECT
      TO_CHAR(date, 'YYYY-MM') as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id = ${userId}
      AND date >= NOW() - INTERVAL '${months} months'
    GROUP BY TO_CHAR(date, 'YYYY-MM')
    ORDER BY month ASC
  `;

  res.json(
    rows.map((r: { month: string; income: string; expense: string }) => ({
      month: r.month,
      income: Number(r.income),
      expense: Number(r.expense),
    }))
  );
});

export default router;
