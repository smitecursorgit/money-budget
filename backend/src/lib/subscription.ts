import type { User } from '@prisma/client';

/** 72 часа с начала триала */
export const TRIAL_MS = 72 * 60 * 60 * 1000;

export type SubscriptionFields = Pick<User, 'trialStart' | 'subscriptionEndsAt' | 'createdAt'>;

export function trialStartedAt(u: SubscriptionFields): Date {
  return u.trialStart ?? u.createdAt;
}

export function hasSubscriptionAccess(u: SubscriptionFields, now: Date = new Date()): boolean {
  const trialStart = trialStartedAt(u);
  const trialEnds = new Date(trialStart.getTime() + TRIAL_MS);
  if (now < trialEnds) return true;
  const end = u.subscriptionEndsAt;
  return end != null && end > now;
}

export function subscriptionUserJson(u: SubscriptionFields) {
  const trialStart = trialStartedAt(u);
  return {
    trialStart: trialStart.toISOString(),
    subscriptionEndsAt: u.subscriptionEndsAt?.toISOString() ?? null,
    hasSubscriptionAccess: hasSubscriptionAccess(u),
  };
}
