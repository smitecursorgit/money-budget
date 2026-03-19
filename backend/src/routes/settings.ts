import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import { prisma } from '../lib/prisma';
import { subscriptionUserJson } from '../lib/subscription';

const router = Router();
router.use(authMiddleware);
router.use(subscriptionMiddleware);

const SettingsSchema = z.object({
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  periodStart: z.number().min(1).max(28).optional(),
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currency: true,
        timezone: true,
        periodStart: true,
        firstName: true,
        username: true,
        trialStart: true,
        subscriptionEndsAt: true,
        createdAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { trialStart, subscriptionEndsAt, createdAt, ...rest } = user;
    res.json({
      ...rest,
      ...subscriptionUserJson({ trialStart, subscriptionEndsAt, createdAt }),
    });
  } catch (err) {
    console.error('Settings get error:', err);
    res.status(500).json({ error: 'Не удалось загрузить настройки' });
  }
});

router.patch('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const parse = SettingsSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: parse.data,
      select: { currency: true, timezone: true, periodStart: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Не удалось сохранить настройки' });
  }
});

export default router;
