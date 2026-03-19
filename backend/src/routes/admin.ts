import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

const SubscriptionExemptSchema = z.object({
  telegramUserId: z.string().regex(/^\d+$/, 'telegramUserId: только цифры'),
  exempt: z.boolean(),
});

/**
 * Выдать / снять бессрочный доступ без оплаты (по Telegram user id).
 * curl -X POST "$API/admin/subscription-exempt" \
 *   -H "Content-Type: application/json" -H "X-Admin-Secret: $SECRET" \
 *   -d '{"telegramUserId":"123456789","exempt":true}'
 */
router.post('/subscription-exempt', async (req: Request, res: Response): Promise<void> => {
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected) {
    res.status(503).json({ error: 'ADMIN_API_SECRET не задан — админ-API отключён' });
    return;
  }
  if (req.headers['x-admin-secret'] !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parse = SubscriptionExemptSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { telegramUserId, exempt } = parse.data;

  try {
    const result = await prisma.user.updateMany({
      where: { telegramId: BigInt(telegramUserId) },
      data: { subscriptionExempt: exempt },
    });
    if (result.count === 0) {
      res.status(404).json({
        error:
          'Пользователь не найден. Сначала откройте Mini App этим аккаунтом, чтобы создалась запись в БД.',
      });
      return;
    }
    res.json({ ok: true, telegramUserId, exempt });
  } catch (e) {
    console.error('[admin/subscription-exempt]', e);
    res.status(500).json({ error: 'Не удалось обновить пользователя' });
  }
});

export default router;
