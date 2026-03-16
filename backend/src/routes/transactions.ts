import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getBudgetId } from '../lib/budget';

const router = Router();
router.use(authMiddleware);

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
    const { type, categoryId, from, to, limit = '200', offset = '0' } = req.query;

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
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ transactions, total });
  } catch (err) {
    console.error('Transactions list error:', err);
    res.status(500).json({ error: 'Failed to load transactions' });
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
