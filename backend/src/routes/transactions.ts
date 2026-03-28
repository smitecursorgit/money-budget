import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { prisma, withRetry } from '../lib/prisma';
import { getBudgetId } from '../lib/budget';
import { assertCategoryAccessible } from '../lib/categoryAccess';

const router = Router();
router.use(authMiddleware);

function parseListLimitOffset(query: Request['query']): { limit: number; offset: number } {
  const limitRaw = parseInt(String(query.limit ?? '200'), 10);
  const offsetRaw = parseInt(String(query.offset ?? '0'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, limitRaw)) : 200;
  const offset = Number.isFinite(offsetRaw) ? Math.min(100_000, Math.max(0, offsetRaw)) : 0;
  return { limit, offset };
}

const validDate = z.string().refine((s) => !isNaN(new Date(s).getTime()), { message: 'Invalid date' });

const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().optional(),
  date: validDate.optional(),
  note: z.string().max(500).optional(),
});

const UpdateTransactionSchema = CreateTransactionSchema.partial();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const budgetId = await getBudgetId(userId);
    const { type, categoryId, from, to } = req.query;
    const { limit, offset } = parseListLimitOffset(req.query);

    const where: Record<string, unknown> = budgetId
      ? { OR: [{ budgetId }, { userId, budgetId: null }] }
      : { userId };
    if (type) where['type'] = type;
    if (categoryId) where['categoryId'] = categoryId;
    if (from || to) {
      where['date'] = {
        ...(from ? { gte: new Date(from as string) } : {}),
        ...(to ? { lte: new Date(to as string) } : {}),
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ transactions, total });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    console.error('Transactions list error:', JSON.stringify({ code: e.code, message: e.message }));
    res.status(500).json({ error: `Ошибка загрузки: ${e.message?.slice(0, 150) || 'unknown'}` });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const budgetId = await getBudgetId(userId);
    if (!budgetId) {
      res.status(400).json({ error: 'Создайте профиль бюджета в настройках' });
      return;
    }
    const parse = CreateTransactionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }

    const { amount, type, categoryId, date, note } = parse.data;
    if (categoryId) {
      const ok = await assertCategoryAccessible(userId, budgetId, categoryId);
      if (!ok) {
        res.status(400).json({ error: 'Категория не найдена или недоступна' });
        return;
      }
    }
    const transaction = await prisma.transaction.create({
      data: { userId, budgetId, amount, type, categoryId, date: date ? new Date(date) : new Date(), note },
      include: { category: true },
    });
    res.status(201).json(transaction);
  } catch (err) {
    console.error('Transaction create error:', err);
    res.status(500).json({ error: 'Не удалось сохранить операцию' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const budgetId = await getBudgetId(userId);
    const existing = await prisma.transaction.findFirst({
      where: { id, userId, ...(budgetId ? { OR: [{ budgetId }, { budgetId: null }] } : {}) },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const parse = UpdateTransactionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }

    const data = parse.data;
    if (data.categoryId) {
      const ok = await assertCategoryAccessible(userId, budgetId, data.categoryId);
      if (!ok) {
        res.status(400).json({ error: 'Категория не найдена или недоступна' });
        return;
      }
    }
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
      include: { category: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Transaction update error:', err);
    res.status(500).json({ error: 'Не удалось обновить операцию' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const budgetId = await getBudgetId(userId);
    const existing = await prisma.transaction.findFirst({
      where: { id, userId, ...(budgetId ? { OR: [{ budgetId }, { budgetId: null }] } : {}) },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Transaction delete error:', err);
    res.status(500).json({ error: 'Не удалось удалить операцию' });
  }
});

export default router;
