import { create } from 'zustand';
import { User, Category, Transaction, Budget } from '../types/index.ts';

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

interface AppState {
  token: string | null;
  user: User | null;
  categories: Category[];
  budgets: Budget[];
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setCategories: (categories: Category[]) => void;
  setBudgets: (budgets: Budget[]) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: localStorage.getItem('token'),
  user: loadFromStorage<User>('user'),
  categories: loadFromStorage<Category[]>('categories') ?? [],
  budgets: loadFromStorage<Budget[]>('budgets') ?? [],
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  setCategories: (categories) => {
    localStorage.setItem('categories', JSON.stringify(categories));
    set({ categories });
  },
  setBudgets: (budgets) => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
    set({ budgets });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('categories');
    localStorage.removeItem('budgets');
    set({ token: null, user: null, categories: [], budgets: [] });
  },
}));

interface TransactionState {
  transactions: Transaction[];
  total: number;
  setTransactions: (transactions: Transaction[], total: number) => void;
  addTransaction: (t: Transaction) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (t: Transaction) => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  total: 0,
  setTransactions: (transactions, total) => set({ transactions, total }),
  addTransaction: (t) =>
    set((s) => ({ transactions: [t, ...s.transactions], total: s.total + 1 })),
  removeTransaction: (id) =>
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id), total: s.total - 1 })),
  updateTransaction: (updated) =>
    set((s) => {
      const filtered = s.transactions.filter((t) => t.id !== updated.id);
      return { transactions: [updated, ...filtered] };
    }),
}));

interface StatsState {
  invalidatedAt: number;
  invalidateStats: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  invalidatedAt: 0,
  invalidateStats: () => set((s) => ({ invalidatedAt: Date.now() })),
}));
