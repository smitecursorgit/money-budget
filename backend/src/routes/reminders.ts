import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authMiddleware);

const validDate = z.string().refine((s) => !isNaN(new Date(s).getTime()), { message: 'Invalid date' });

const ReminderSchema = z.object({
  title: z.string().min(1).max(100),
  amount: z.number().positive().optional(),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
  nextDate: validDate,
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: { nextDate: 'asc' },
    });
    res.json(reminders);
  } catch (err) {
    console.error('Reminders list error:', err);
    res.status(500).json({ error: 'Не удалось загрузить напоминания' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const parse = ReminderSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }
    const { title, amount, recurrence, nextDate } = parse.data;
    const reminder = await prisma.reminder.create({
      data: { userId, title, amount, recurrence, nextDate: new Date(nextDate) },
    });
    res.status(201).json(reminder);
  } catch (err) {
    console.error('Reminder create error:', err);
    res.status(500).json({ error: 'Не удалось создать напоминание' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.reminder.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const parse = ReminderSchema.partial().merge(z.object({ isActive: z.boolean().optional() })).safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }

    const data = parse.data;
    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.recurrence !== undefined ? { recurrence: data.recurrence } : {}),
        ...(data.nextDate !== undefined ? { nextDate: new Date(data.nextDate) } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Reminder update error:', err);
    res.status(500).json({ error: 'Не удалось обновить напоминание' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.reminder.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    await prisma.reminder.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Reminder delete error:', err);
    res.status(500).json({ error: 'Не удалось удалить напоминание' });
  }
});

router.get('/upcoming', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const days = Math.min(Math.max(parseInt((req.query.days as string) || '7') || 7, 1), 365);
    const until = new Date();
    until.setDate(until.getDate() + days);

    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
        isActive: true,
        nextDate: { lte: until },
      },
      orderBy: { nextDate: 'asc' },
    });

    res.json(reminders);
  } catch (err) {
    console.error('Reminders upcoming error:', err);
    res.status(500).json({ error: 'Failed to load reminders' });
  }
});

export default router;
