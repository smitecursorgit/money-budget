import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authMiddleware);

const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().optional(),
  date: z.string().optional(),
  note: z.string().optional(),
});

const UpdateTransactionSchema = CreateTransactionSchema.partial();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { type, categoryId, from, to, limit = '200', offset = '0' } = req.query;

    const where: Record<string, unknown> = { userId };
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
        orderBy: { date: 'desc' },
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
  const userId = req.user!.userId;
  const parse = CreateTransactionSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { amount, type, categoryId, date, note } = parse.data;

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      amount,
      type,
      categoryId,
      date: date ? new Date(date) : new Date(),
      note,
    },
    include: { category: true },
  });

  res.status(201).json(transaction);
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
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
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.transaction.delete({ where: { id } });
  res.status(204).send();
});

export default router;
