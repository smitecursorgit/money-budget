import { prisma, withRetry } from './prisma';

const BUDGET_CACHE_TTL_MS = 30_000; // 30 seconds
const budgetCache = new Map<string, { id: string | null; expires: number }>();

function getCachedBudgetId(userId: string): string | null | undefined {
  const entry = budgetCache.get(userId);
  if (!entry || Date.now() > entry.expires) return undefined;
  return entry.id;
}

function setCachedBudgetId(userId: string, id: string | null): void {
  budgetCache.set(userId, { id, expires: Date.now() + BUDGET_CACHE_TTL_MS });
}

/** Call when user changes current budget (select/create/delete) to avoid stale cache. */
export function invalidateBudgetCache(userId: string): void {
  budgetCache.delete(userId);
}

/**
 * Resolves the effective budget ID for a user (current or first).
 * Migrates legacy users (no budgetId on data) to a default budget.
 * Returns null on any error — callers fall back to userId-only queries.
 * Cached 30s to avoid repeated DB calls when multiple routes load in parallel.
 */
export async function getBudgetId(userId: string): Promise<string | null> {
  const cached = getCachedBudgetId(userId);
  if (cached !== undefined) return cached;

  try {
    const user = await withRetry(() => prisma.user.findUnique({
      where: { id: userId },
      include: { budgets: { orderBy: { createdAt: 'asc' } } },
    }));
    if (!user) {
      setCachedBudgetId(userId, null);
      return null;
    }

    let result: string | null;

    // Already have current budget
    if (user.currentBudgetId) {
      result = user.currentBudgetId;
    } else if (user.budgets.length > 0) {
      // Have budgets but no current — set first as current
      await prisma.user.update({
        where: { id: userId },
        data: { currentBudgetId: user.budgets[0].id },
      });
      result = user.budgets[0].id;
    } else {
      // No budgets — try migration (legacy user with userId-only data)
      try {
        await migrateUserToBudgets(userId);
        return getBudgetId(userId);
      } catch (migrateErr) {
        console.error('[migrateUserToBudgets]', migrateErr);
        result = null;
      }
    }

    setCachedBudgetId(userId, result);
    return result;
  } catch (err) {
    console.error('[getBudgetId]', err);
    return null;
  }
}

/**
 * Migrates a legacy user: creates default budget, assigns all data to it.
 */
export async function migrateUserToBudgets(userId: string): Promise<void> {
  const budgetCount = await prisma.budget.count({ where: { userId } });
  if (budgetCount > 0) return;

  const budget = await prisma.budget.create({
    data: { userId, name: 'Основной' },
  });

  await Promise.all([
    prisma.category.updateMany({ where: { userId }, data: { budgetId: budget.id } }),
    prisma.transaction.updateMany({ where: { userId }, data: { budgetId: budget.id } }),
    prisma.reminder.updateMany({ where: { userId }, data: { budgetId: budget.id } }),
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: { currentBudgetId: budget.id },
  });
}
