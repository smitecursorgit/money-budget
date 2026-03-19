import { Request, Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { fetchYooPayment } from '../lib/yookassa';
import { isYooKassaNotificationIp } from '../lib/yookassaIp';

const router = Router();

type YooNotificationBody = {
  type?: string;
  event?: string;
  object?: {
    id?: string;
    status?: string;
    paid?: boolean;
    metadata?: Record<string, unknown>;
    amount?: { value?: string; currency?: string };
  };
};

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

async function handlePaymentSucceeded(paymentId: string): Promise<void> {
  const remote = await fetchYooPayment(paymentId);
  if (remote.status !== 'succeeded' || !remote.paid) {
    console.warn('[yookassa webhook] payment not succeeded after fetch', paymentId, remote.status);
    return;
  }

  const metaTg = remote.metadata?.telegram_user_id;
  const telegramUserId =
    typeof metaTg === 'string' || typeof metaTg === 'number' ? String(metaTg) : null;
  if (!telegramUserId) {
    console.warn('[yookassa webhook] missing telegram_user_id in payment metadata', paymentId);
    return;
  }

  const amountNum = Number(remote.amount?.value);
  const amountOk = remote.amount?.currency === 'RUB' && Number.isFinite(amountNum) && amountNum === 199;
  if (!amountOk) {
    console.warn('[yookassa webhook] unexpected amount', paymentId, remote.amount);
    return;
  }

  let tgBig: bigint;
  try {
    tgBig = BigInt(telegramUserId);
  } catch {
    console.warn('[yookassa webhook] invalid telegram_user_id', telegramUserId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const dup = await tx.yookassaProcessedPayment.findUnique({ where: { paymentId } });
    if (dup) return;

    const user = await tx.user.findUnique({ where: { telegramId: tgBig } });
    if (!user) {
      console.warn('[yookassa webhook] user not found for telegram id', telegramUserId);
      return;
    }

    const now = new Date();
    const base =
      user.subscriptionEndsAt && user.subscriptionEndsAt > now ? user.subscriptionEndsAt : now;
    const subscriptionEndsAt = addDays(base, 30);

    await tx.user.update({
      where: { id: user.id },
      data: { subscriptionEndsAt },
    });
    await tx.yookassaProcessedPayment.create({
      data: { paymentId, userId: user.id },
    });
  });
}

async function processYookassaNotification(req: Request, res: Response): Promise<void> {
  const skipIp = process.env.YOOKASSA_WEBHOOK_SKIP_IP === '1';
  const clientIp = req.ip || req.socket.remoteAddress || '';
  if (!skipIp && !isYooKassaNotificationIp(clientIp)) {
    console.warn('[yookassa webhook] rejected IP', clientIp);
    res.sendStatus(403);
    return;
  }

  const body = req.body as YooNotificationBody;
  if (body?.type !== 'notification') {
    res.sendStatus(200);
    return;
  }
  if (body.event !== 'payment.succeeded') {
    res.sendStatus(200);
    return;
  }

  const paymentId = body.object?.id;
  if (!paymentId) {
    res.sendStatus(200);
    return;
  }

  try {
    if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_SECRET_KEY) {
      console.error('[yookassa webhook] YooKassa credentials missing');
      res.sendStatus(503);
      return;
    }
    await handlePaymentSucceeded(paymentId);
  } catch (e) {
    console.error('[yookassa webhook] handler error', e);
    res.sendStatus(500);
    return;
  }

  res.sendStatus(200);
}

router.post('/', (req, res, next) => {
  void processYookassaNotification(req, res).catch(next);
});

export default router;
