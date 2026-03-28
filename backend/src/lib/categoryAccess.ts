import { prisma } from './prisma';

/**
 * Ensures category belongs to the user and is visible for the current budget (or legacy null budget).
 */
export async function assertCategoryAccessible(
  userId: string,
  budgetId: string | null,
  categoryId: string
): Promise<boolean> {
  const cat = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
      ...(budgetId ? { OR: [{ budgetId }, { budgetId: null }] } : {}),
    },
  });
  return !!cat;
}
