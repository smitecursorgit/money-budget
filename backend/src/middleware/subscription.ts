import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { hasSubscriptionAccess } from '../lib/subscription';

export async function subscriptionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        trialStart: true,
        subscriptionEndsAt: true,
        createdAt: true,
        subscriptionExempt: true,
        telegramId: true,
      },
    });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    if (!hasSubscriptionAccess(user)) {
      res.status(403).json({
        error: 'Пробный период истёк. Оформите подписку.',
        code: 'SUBSCRIPTION_REQUIRED',
      });
      return;
    }
    next();
  } catch (e) {
    console.error('[subscriptionMiddleware]', e);
    res.status(500).json({ error: 'Не удалось проверить подписку' });
  }
}
