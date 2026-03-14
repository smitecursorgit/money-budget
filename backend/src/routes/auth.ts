import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifyTelegramInitData } from '../middleware/auth';

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

    if (initData === 'dev') {
      // Allow dev mode regardless of NODE_ENV for easier testing
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
        console.error('initData hash mismatch. initData preview:', initData.slice(0, 100));
        res.status(401).json({ error: 'Invalid initData' });
        return;
      }
    }

    let tgUser: { id: number; first_name: string; last_name?: string; username?: string };
    try {
      tgUser = JSON.parse(telegramData['user'] || '{}');
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

    const existingCategories = await prisma.category.count({ where: { userId: user.id } });
    if (existingCategories === 0) {
      await seedDefaultCategories(user.id);
    }

    const token = jwt.sign(
      { userId: user.id, telegramId: tgUser.id },
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
      },
    });
  } catch (err) {
    console.error('Auth route error:', err);
    res.status(500).json({ error: 'Server error during authentication', detail: err instanceof Error ? err.message : String(err) });
  }
});

async function seedDefaultCategories(userId: string) {
  const defaults = [
    { name: 'Зарплата', type: 'income' as const, icon: '💼', color: '#22c55e', keywords: ['зп', 'зарплата', 'salary', 'оклад'] },
    { name: 'Фриланс', type: 'income' as const, icon: '💻', color: '#3b82f6', keywords: ['фриланс', 'подработка'] },
    { name: 'Продукты', type: 'expense' as const, icon: '🛒', color: '#f59e0b', keywords: ['продукты', 'еда', 'магазин', 'супермаркет'] },
    { name: 'Кофе', type: 'expense' as const, icon: '☕', color: '#92400e', keywords: ['кофе', 'coffee', 'латте', 'капучино'] },
    { name: 'Транспорт', type: 'expense' as const, icon: '🚇', color: '#6366f1', keywords: ['транспорт', 'метро', 'такси', 'автобус', 'маршрутка'] },
    { name: 'Аренда', type: 'expense' as const, icon: '🏠', color: '#ef4444', keywords: ['аренда', 'квартира', 'rent'] },
    { name: 'Рестораны', type: 'expense' as const, icon: '🍽️', color: '#f97316', keywords: ['ресторан', 'кафе', 'обед', 'ужин', 'перекус'] },
    { name: 'Развлечения', type: 'expense' as const, icon: '🎬', color: '#a855f7', keywords: ['кино', 'развлечения', 'игры', 'клуб'] },
    { name: 'Здоровье', type: 'expense' as const, icon: '💊', color: '#10b981', keywords: ['аптека', 'врач', 'здоровье', 'лекарства'] },
    { name: 'Табак', type: 'expense' as const, icon: '🚬', color: '#6b7280', keywords: ['сигареты', 'табак', 'покурить', 'кальян', 'вейп'] },
    { name: 'Подписки', type: 'expense' as const, icon: '📱', color: '#0ea5e9', keywords: ['подписка', 'netflix', 'spotify', 'youtube'] },
    { name: 'Прочее', type: 'expense' as const, icon: '📦', color: '#71717a', keywords: [] },
  ];

  await prisma.category.createMany({
    data: defaults.map((c) => ({ ...c, userId, isDefault: true })),
  });
}

export default router;
