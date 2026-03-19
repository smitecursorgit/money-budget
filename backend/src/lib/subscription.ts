import type { User } from '@prisma/client';

/** 72 часа с начала триала */
export const TRIAL_MS = 72 * 60 * 60 * 1000;

export type SubscriptionFields = Pick<User, 'trialStart' | 'subscriptionEndsAt' | 'createdAt'>;

export type SubscriptionCheckUser = SubscriptionFields & {
  subscriptionExempt?: boolean;
  telegramId?: bigint | null;
};

function parseExemptTelegramIdsFromEnv(): Set<string> {
  const raw = process.env.SUBSCRIPTION_EXEMPT_TELEGRAM_IDS || '';
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** ID из env SUBSCRIPTION_EXEMPT_TELEGRAM_IDS (через запятую/пробел). Перезапуск сервера после изменения. */
export function isTelegramIdExemptByEnv(telegramId: string): boolean {
  return parseExemptTelegramIdsFromEnv().has(telegramId);
}

export function trialStartedAt(u: SubscriptionFields): Date {
  return u.trialStart ?? u.createdAt;
}

export function hasSubscriptionAccess(u: SubscriptionCheckUser, now: Date = new Date()): boolean {
  if (u.subscriptionExempt === true) return true;
  const tg = u.telegramId != null ? String(u.telegramId) : '';
  if (tg && isTelegramIdExemptByEnv(tg)) return true;

  const trialStart = trialStartedAt(u);
  const trialEnds = new Date(trialStart.getTime() + TRIAL_MS);
  if (now < trialEnds) return true;
  const end = u.subscriptionEndsAt;
  return end != null && end > now;
}

export function subscriptionUserJson(u: SubscriptionCheckUser) {
  const trialStart = trialStartedAt(u);
  return {
    trialStart: trialStart.toISOString(),
    subscriptionEndsAt: u.subscriptionEndsAt?.toISOString() ?? null,
    subscriptionExempt: u.subscriptionExempt === true,
    hasSubscriptionAccess: hasSubscriptionAccess(u),
  };
}
