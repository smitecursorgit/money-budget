import crypto from 'crypto';

const API = 'https://api.yookassa.ru/v3';

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) throw new Error('YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required');
  return `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`;
}

export type YooPaymentCreate = {
  amountValue: string;
  currency: string;
  description: string;
  returnUrl: string;
  telegramUserId: string;
  idempotenceKey: string;
};

export async function createYooPayment(input: YooPaymentCreate): Promise<{
  id: string;
  confirmationUrl: string | null;
  status: string;
}> {
  const body = {
    amount: { value: input.amountValue, currency: input.currency },
    capture: true,
    confirmation: { type: 'redirect', return_url: input.returnUrl },
    description: input.description,
    metadata: { telegram_user_id: input.telegramUserId },
    payment_method_types: ['bank_card', 'sbp'],
  };

  const res = await fetch(`${API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': input.idempotenceKey,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    id?: string;
    status?: string;
    confirmation?: { confirmation_url?: string };
    description?: string;
    code?: string;
  };

  if (!res.ok) {
    const msg = data.description || data.code || res.statusText;
    throw new Error(`YooKassa create payment failed: ${msg}`);
  }

  return {
    id: data.id!,
    status: data.status!,
    confirmationUrl: data.confirmation?.confirmation_url ?? null,
  };
}

export async function fetchYooPayment(paymentId: string): Promise<{
  id: string;
  status: string;
  paid: boolean;
  metadata?: Record<string, unknown>;
  amount?: { value: string; currency: string };
}> {
  const res = await fetch(`${API}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });
  const data = (await res.json()) as {
    id?: string;
    status?: string;
    paid?: boolean;
    metadata?: Record<string, unknown>;
    amount?: { value: string; currency: string };
    description?: string;
  };
  if (!res.ok) {
    throw new Error(data.description || `YooKassa get payment ${res.status}`);
  }
  return {
    id: data.id!,
    status: data.status!,
    paid: !!data.paid,
    metadata: data.metadata,
    amount: data.amount,
  };
}

export function newIdempotenceKey(): string {
  return crypto.randomUUID();
}
