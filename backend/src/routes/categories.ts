import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getBudgetId } from '../lib/budget';

const router = Router();
router.use(authMiddleware);

const CategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['income', 'expense']),
  keywords: z.array(z.string()).default([]),
  icon: z.string().default('💰'),
  color: z.string().default('#6C63FF'),
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const budgetId = await getBudgetId(userId);
    const categories = await prisma.category.findMany({
      where: { OR: [{ budgetId }, { userId, budgetId: null }] },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    res.json(categories);
  } catch (err) {
    console.error('Categories list error:', err);
    res.status(500).json({ error: 'Не удалось загрузить категории' });
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
    const parse = CategorySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }
    const category = await prisma.category.create({
      data: { ...parse.data, userId, budgetId },
    });
    res.status(201).json(category);
  } catch (err) {
    console.error('Category create error:', err);
    res.status(500).json({ error: 'Не удалось создать категорию' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const budgetId = await getBudgetId(userId);
    const existing = await prisma.category.findFirst({
      where: { id, userId, ...(budgetId ? { OR: [{ budgetId }, { budgetId: null }] } : {}) },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const parse = CategorySchema.partial().safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }

    const updated = await prisma.category.update({ where: { id }, data: parse.data });
    res.json(updated);
  } catch (err) {
    console.error('Category update error:', err);
    res.status(500).json({ error: 'Не удалось обновить категорию' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const budgetId = await getBudgetId(userId);
    const existing = await prisma.category.findFirst({
      where: { id, userId, ...(budgetId ? { OR: [{ budgetId }, { budgetId: null }] } : {}) },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Category delete error:', err);
    res.status(500).json({ error: 'Не удалось удалить категорию' });
  }
});

export default router;
