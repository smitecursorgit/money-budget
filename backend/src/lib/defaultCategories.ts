/**
 * Дефолтные категории доходов и расходов для каждого профиля.
 * Используются при первом входе (auth) и при создании нового профиля (budgets).
 */

import { prisma } from './prisma';

export const DEFAULT_CATEGORIES = [
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

/**
 * Создаёт дефолтные категории для указанного бюджета (профиля).
 * Вызывается при создании первого профиля (auth) и при создании новых профилей (budgets).
 */
export async function seedCategoriesForBudget(budgetId: string, userId: string): Promise<void> {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      userId,
      budgetId,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      keywords: c.keywords,
      isDefault: true,
    })),
  });
}
