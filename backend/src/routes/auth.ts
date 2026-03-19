import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma, withRetry } from '../lib/prisma';
import { verifyTelegramInitData } from '../middleware/auth';
import { migrateUserToBudgets, getBudgetId } from '../lib/budget';
import { seedCategoriesForBudget } from '../lib/defaultCategories';

const router = Router();

const AuthSchema = z.object({
  initData: z.string().min(1),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = AuthSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'initData required' });
      return;
    }

    const { initData } = parse.data;

    let telegramData: Record<string, string> | null = null;

    if (initData === 'dev' && process.env.NODE_ENV !== 'production') {
      // Dev mode only works in local development — never in production
      telegramData = {
        user: JSON.stringify({ id: 1, first_name: 'Dev', username: 'devuser' }),
      };
    } else {
      try {
        telegramData = verifyTelegramInitData(initData);
      } catch (e) {
        console.error('initData verification error:', e);
        res.status(500).json({ error: 'Bot token not configured on server' });
        return;
      }
      if (!telegramData) {
        res.status(401).json({ error: 'Invalid initData' });
        return;
      }

      // Reject initData older than 1 hour (replay attack protection)
      const authDate = parseInt(telegramData['auth_date'] || '0', 10);
      if (!authDate || Date.now() / 1000 - authDate > 3600) {
        res.status(401).json({ error: 'initData expired. Please reopen the app.' });
        return;
      }
    }

    let tgUser: { id: number; first_name: string; last_name?: string; username?: string };
    try {
      // Extract id with regex first to avoid precision loss with large 64-bit IDs
      const userJson = telegramData['user'] || '{}';
      const idMatch = /"id"\s*:\s*(\d+)/.exec(userJson);
      const parsed = JSON.parse(userJson);
      tgUser = { ...parsed, id: idMatch ? Number(idMatch[1]) : parsed.id };
    } catch {
      res.status(400).json({ error: 'Cannot parse user data' });
      return;
    }

    if (!tgUser.id) {
      res.status(400).json({ error: 'User id missing in initData' });
      return;
    }

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(tgUser.id) },
      update: {
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
      },
      create: {
        telegramId: BigInt(tgUser.id),
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
      },
    });

    const budgetCount = await prisma.budget.count({ where: { userId: user.id } });
    const existingCategories = await prisma.category.count({ where: { userId: user.id } });
    if (budgetCount === 0 && existingCategories === 0) {
      const budget = await prisma.budget.create({
        data: { userId: user.id, name: 'Основной' },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { currentBudgetId: budget.id },
      });
      await seedCategoriesForBudget(budget.id, user.id);
    } else if (budgetCount === 0) {
      await migrateUserToBudgets(user.id);
    }

    const [budgets, currentBudgetId] = await Promise.all([
      prisma.budget.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      getBudgetId(user.id),
    ]);

    const budgetId = currentBudgetId ?? undefined;
    const categoriesWhere = budgetId
      ? { OR: [{ budgetId }, { userId: user.id, budgetId: null }] }
      : { userId: user.id };
    const categories = await prisma.category.findMany({
      where: categoriesWhere,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    const token = jwt.sign(
      { userId: user.id, telegramId: String(tgUser.id) },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        username: user.username,
        currency: user.currency,
        timezone: user.timezone,
        periodStart: user.periodStart,
        currentBudgetId: budgetId,
      },
      budgets,
      categories,
    });
  } catch (err) {
    console.error('Auth route error:', err);
    res.status(500).json({ error: 'Ошибка авторизации. Попробуйте позже.' });
  }
});

export default router;
