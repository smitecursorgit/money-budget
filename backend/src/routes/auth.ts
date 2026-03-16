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
        console.error('initData hash mismatch. initData preview:', initData.slice(0, 100));
        res.status(401).json({ error: 'Invalid initData' });
        return;
      }

      // Reject initData older than 24 hours (replay attack protection)
      const authDate = parseInt(telegramData['auth_date'] || '0', 10);
      if (!authDate || Date.now() / 1000 - authDate > 86400) {
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
    res.status(500).json({ error: 'Ошибка авторизации. Попробуйте позже.' });
  }
});

async function seedDefaultCategories(userId: string) {
  const defaults = [
    { name: 'Зарплата', type: 'income' as const, icon: '💼', color: '#22c55e', keywords: ['зп', 'зарплата', 'salary', 'оклад', 'аванс', 'получка', 'жалованье'] },
    { name: 'Фриланс', type: 'income' as const, icon: '💻', color: '#3b82f6', keywords: ['фриланс', 'подработка', 'халтура', 'шабашка', 'проект', 'заказ'] },
    { name: 'Чаевые', type: 'income' as const, icon: '🤝', color: '#10b981', keywords: ['чаевые', 'тип', 'tips', 'чай', 'на чай'] },
    { name: 'Продукты', type: 'expense' as const, icon: '🛒', color: '#f59e0b', keywords: ['продукты', 'еда', 'жрачка', 'магазин', 'супермаркет', 'пятёрочка', 'магнит', 'ашан', 'хлеб', 'молоко', 'колбаса', 'мясо'] },
    { name: 'Алкоголь', type: 'expense' as const, icon: '🍺', color: '#b45309', keywords: ['пиво', 'пивко', 'пивас', 'вино', 'водка', 'алкоголь', 'бухло', 'коньяк', 'бутылка', 'банка пива', 'выпить', 'бухнуть'] },
    { name: 'Кофе', type: 'expense' as const, icon: '☕', color: '#92400e', keywords: ['кофе', 'coffee', 'латте', 'капучино', 'американо', 'раф', 'кофейня'] },
    { name: 'Рестораны', type: 'expense' as const, icon: '🍽️', color: '#f97316', keywords: ['ресторан', 'кафе', 'столовая', 'обед', 'ужин', 'завтрак', 'бизнес-ланч', 'шаурма', 'бургер', 'суши', 'пицца', 'роллы', 'макдак', 'kfc'] },
    { name: 'Такси', type: 'expense' as const, icon: '🚕', color: '#eab308', keywords: ['такси', 'яндекс такси', 'убер', 'uber', 'bolt', 'каршеринг'] },
    { name: 'Транспорт', type: 'expense' as const, icon: '🚇', color: '#6366f1', keywords: ['транспорт', 'метро', 'автобус', 'трамвай', 'маршрутка', 'электричка', 'поезд', 'бензин', 'заправка', 'парковка'] },
    { name: 'Аренда', type: 'expense' as const, icon: '🏠', color: '#ef4444', keywords: ['аренда', 'квартира', 'rent', 'съем', 'хата', 'жилье', 'квартплата'] },
    { name: 'Коммуналка', type: 'expense' as const, icon: '💡', color: '#64748b', keywords: ['коммуналка', 'жкх', 'свет', 'газ', 'вода', 'интернет', 'телефон', 'связь', 'мобильная'] },
    { name: 'Одежда', type: 'expense' as const, icon: '👕', color: '#8b5cf6', keywords: ['одежда', 'обувь', 'куртка', 'кроссовки', 'кроссы', 'шмотки', 'барахло', 'шопинг', 'футболка', 'джинсы'] },
    { name: 'Здоровье', type: 'expense' as const, icon: '💊', color: '#10b981', keywords: ['аптека', 'врач', 'здоровье', 'лекарства', 'таблетки', 'доктор', 'больница', 'клиника', 'анализы', 'стоматолог'] },
    { name: 'Табак', type: 'expense' as const, icon: '🚬', color: '#6b7280', keywords: ['сигареты', 'табак', 'покурить', 'кальян', 'вейп', 'айкос'] },
    { name: 'Развлечения', type: 'expense' as const, icon: '🎬', color: '#a855f7', keywords: ['кино', 'театр', 'концерт', 'клуб', 'игры', 'стрим', 'развлечения'] },
    { name: 'Подписки', type: 'expense' as const, icon: '📱', color: '#0ea5e9', keywords: ['подписка', 'netflix', 'spotify', 'youtube', 'кинопоиск', 'яндекс плюс'] },
    { name: 'Прочее', type: 'expense' as const, icon: '📦', color: '#71717a', keywords: ['прочее', 'другое', 'разное'] },
  ];

  await prisma.category.createMany({
    data: defaults.map((c) => ({ ...c, userId, isDefault: true })),
  });
}

export default router;
