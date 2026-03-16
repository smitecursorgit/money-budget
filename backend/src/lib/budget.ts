import { prisma, withRetry } from './prisma';

/**
 * Resolves the effective budget ID for a user (current or first).
 * Migrates legacy users (no budgetId on data) to a default budget.
 * Returns null on any error — callers fall back to userId-only queries.
 */
export async function getBudgetId(userId: string): Promise<string | null> {
  try {
    const user = await withRetry(() => prisma.user.findUnique({
      where: { id: userId },
      include: { budgets: { orderBy: { createdAt: 'asc' } } },
    }));
    if (!user) return null;

    // Already have current budget
    if (user.currentBudgetId) return user.currentBudgetId;

    // Have budgets but no current — set first as current
    if (user.budgets.length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentBudgetId: user.budgets[0].id },
      });
      return user.budgets[0].id;
    }

    // No budgets — try migration (legacy user with userId-only data)
    try {
      await migrateUserToBudgets(userId);
      return getBudgetId(userId);
    } catch (migrateErr) {
      console.error('[migrateUserToBudgets]', migrateErr);
      return null;
    }
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
