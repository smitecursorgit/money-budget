/**
 * Очищает все кеши при смене профиля (бюджета),
 * чтобы экраны подгрузили данные для нового профиля.
 */
const CACHE_KEYS = ['dashboard_cache', 'stats_cache', 'reminders_cache'];

export function clearBudgetCaches(): void {
  try {
    CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
