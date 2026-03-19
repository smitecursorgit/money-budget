import {
  statsApi,
  transactionsApi,
  remindersApi,
  categoriesApi,
  budgetsApi,
  settingsApi,
  subscriptionApi,
} from '../api/client.ts';
import { useAppStore, useTransactionStore } from '../store/index.ts';
import type { StatsSummary, Reminder, Transaction, User } from '../types/index.ts';

const CACHE_KEY = 'dashboard_cache';

type CachePayload = {
  summary: StatsSummary;
  transactions: Transaction[];
  reminders: Reminder[];
  total?: number;
};

function writeDashboardCache(data: CachePayload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

function readPrevCache(): (CachePayload & { cachedAt: number }) | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachePayload & { cachedAt: number };
  } catch {
    return null;
  }
}

/**
 * Загружает данные для первого экрана (дашборд, стор, кэш) до показа приложения.
 * Использует allSettled — при частичных ошибках подмешивает кэш / прошлые значения.
 */
export async function bootstrapAppData(): Promise<void> {
  const { setUser, user } = useAppStore.getState();
  try {
    const { data: sub } = await subscriptionApi.status();
    if (user) {
      setUser({
        ...user,
        trialStart: sub.trialStart,
        subscriptionEndsAt: sub.subscriptionEndsAt,
        subscriptionExempt: sub.subscriptionExempt,
        hasSubscriptionAccess: sub.hasSubscriptionAccess,
      });
    }
    if (sub.hasSubscriptionAccess === false) {
      return;
    }
  } catch {
    /* сеть / 401 обработает интерсептор */
  }

  const [catRes, budRes, setRes, sumRes, txRes, remRes] = await Promise.allSettled([
    categoriesApi.list(),
    budgetsApi.list(),
    settingsApi.get(),
    statsApi.summary(),
    transactionsApi.list({ limit: 20 }),
    remindersApi.upcoming(30),
  ]);

  const { setCategories, setBudgets, setUser: mergeUser, user: currentUser } = useAppStore.getState();
  const { setTransactions } = useTransactionStore.getState();

  if (catRes.status === 'fulfilled') {
    setCategories(catRes.value.data);
  }
  if (budRes.status === 'fulfilled') {
    setBudgets(budRes.value.data);
  }
  if (setRes.status === 'fulfilled' && currentUser) {
    const s = setRes.value.data as Partial<
      Pick<User, 'currency' | 'timezone' | 'periodStart' | 'firstName' | 'username'>
    >;
    mergeUser({
      ...currentUser,
      currency: s.currency ?? currentUser.currency,
      timezone: s.timezone ?? currentUser.timezone,
      periodStart: s.periodStart ?? currentUser.periodStart,
      firstName: s.firstName ?? currentUser.firstName,
      username: s.username ?? currentUser.username,
      id: currentUser.id,
      currentBudgetId: currentUser.currentBudgetId,
    });
  }

  const prev = readPrevCache();

  let summary: StatsSummary =
    prev?.summary ?? ({ income: 0, expense: 0, balance: 0, period: { from: '', to: '' } } as StatsSummary);
  if (sumRes.status === 'fulfilled') {
    summary = sumRes.value.data;
  }

  let safeTransactions = prev?.transactions ?? [];
  let total = prev?.total ?? 0;
  if (txRes.status === 'fulfilled') {
    const newTx: Transaction[] = txRes.value.data.transactions;
    total = txRes.value.data.total;
    safeTransactions = newTx.length > 0 || total === 0 ? newTx : safeTransactions;
  }

  setTransactions(safeTransactions, total);

  let remindersSlice: Reminder[] = prev?.reminders ?? [];
  if (remRes.status === 'fulfilled') {
    remindersSlice = remRes.value.data.slice(0, 3);
  }

  writeDashboardCache({
    summary,
    transactions: safeTransactions,
    reminders: remindersSlice,
    total,
  });
}
