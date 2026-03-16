import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getBudgetId } from '../lib/budget';

const router = Router();
router.use(authMiddleware);

const CreateBudgetSchema = z.object({
  name: z.string().min(1).max(80),
});

const UpdateBudgetSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  initialBalance: z.number().optional(),
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(budgets);
  } catch (err) {
    console.error('Budgets list error:', err);
    res.status(500).json({ error: 'Не удалось загрузить профили' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const parse = CreateBudgetSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }

    const budget = await prisma.budget.create({
      data: { userId, name: parse.data.name },
    });

    // If first budget, set as current
    const count = await prisma.budget.count({ where: { userId } });
    if (count === 1) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentBudgetId: budget.id },
      });
    }

    res.status(201).json(budget);
  } catch (err: unknown) {
    const prismaErr = err as { code?: string; meta?: { target?: string[] }; message?: string };
    console.error('Budget create error:', {
      code: prismaErr.code,
      message: prismaErr.message,
      meta: prismaErr.meta,
      stack: err instanceof Error ? err.stack : undefined,
    });
    let msg = 'Не удалось создать профиль.';
    if (prismaErr.code === 'P2002') msg = 'Профиль с таким именем уже существует.';
    else if (prismaErr.code === 'P2003') msg = 'Ошибка базы данных. Проверьте подключение.';
    else if (prismaErr.message?.includes('connection') || prismaErr.message?.includes('timeout')) {
      msg = 'Сервер базы данных не отвечает. Попробуйте через минуту.';
    }
    res.status(500).json({ error: msg });
  }
});

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const parse = UpdateBudgetSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        ...(parse.data.name !== undefined && { name: parse.data.name }),
        ...(parse.data.initialBalance !== undefined && { initialBalance: parse.data.initialBalance }),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Budget update error:', err);
    res.status(500).json({ error: 'Не удалось обновить профиль' });
  }
});

router.post('/:id/select', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { currentBudgetId: id },
    });

    res.json({ currentBudgetId: id });
  } catch (err) {
    console.error('Budget select error:', err);
    res.status(500).json({ error: 'Не удалось переключить профиль' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const count = await prisma.budget.count({ where: { userId } });
    if (count <= 1) {
      res.status(400).json({ error: 'Нельзя удалить последний профиль' });
      return;
    }

    await prisma.budget.delete({ where: { id } });

    // If was current, switch to another
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.currentBudgetId === id) {
      const next = await prisma.budget.findFirst({ where: { userId } });
      await prisma.user.update({
        where: { id: userId },
        data: { currentBudgetId: next?.id ?? null },
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Budget delete error:', err);
    res.status(500).json({ error: 'Не удалось удалить профиль' });
  }
});

export default router;
