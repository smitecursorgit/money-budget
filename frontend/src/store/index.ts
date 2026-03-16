import { create } from 'zustand';
import { User, Category, Transaction } from '../types/index.ts';

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
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setCategories: (categories: Category[]) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: localStorage.getItem('token'),
  user: loadFromStorage<User>('user'),
  // Restore categories from localStorage so they're available offline / before API responds
  categories: loadFromStorage<Category[]>('categories') ?? [],
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
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('categories');
    set({ token: null, user: null, categories: [] });
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
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === updated.id ? updated : t)),
    })),
}));
