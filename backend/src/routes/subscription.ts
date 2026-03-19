import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createYooPayment, newIdempotenceKey } from '../lib/yookassa';
import { subscriptionUserJson } from '../lib/subscription';

const router = Router();

router.get('/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        trialStart: true,
        subscriptionEndsAt: true,
        createdAt: true,
        subscriptionExempt: true,
        telegramId: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(subscriptionUserJson(user));
  } catch (e) {
    console.error('[subscription/status]', e);
    res.status(500).json({ error: 'Не удалось получить статус подписки' });
  }
});

router.post('/payment', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { telegramId: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const returnUrl =
      process.env.YOOKASSA_RETURN_URL ||
      process.env.MINI_APP_URL ||
      process.env.FRONTEND_URL ||
      'https://t.me';

    const telegramUserId = String(user.telegramId);

    const payment = await createYooPayment({
      amountValue: '199.00',
      currency: 'RUB',
      description: 'Подписка на месяц — бюджет',
      returnUrl,
      telegramUserId,
      idempotenceKey: newIdempotenceKey(),
    });

    if (!payment.confirmationUrl) {
      res.status(502).json({ error: 'Платёж создан без ссылки подтверждения' });
      return;
    }

    res.json({ confirmationUrl: payment.confirmationUrl, paymentId: payment.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[subscription/payment]', msg);
    if (msg.includes('YOOKASSA_SHOP_ID')) {
      res.status(503).json({ error: 'Платежи временно недоступны' });
      return;
    }
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});

export default router;
