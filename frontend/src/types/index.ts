export interface User {
  id: string;
  firstName: string | null;
  username: string | null;
  currency: string;
  timezone: string;
  periodStart: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  keywords: string[];
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string | null;
  category: Category | null;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  amount: number | null;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
  isActive: boolean;
}

export interface ParsedEntry {
  type: 'expense' | 'income' | 'reminder';
  amount?: number;
  category?: string;
  date?: string;
  note?: string;
  reminderRecurrence?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminderTitle?: string;
}

export interface StatsSummary {
  income: number;
  expense: number;
  balance: number;
  period: { from: string; to: string };
}

export interface CategoryStat {
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
}

export interface MonthlyStat {
  month: string;
  income: number;
  expense: number;
}
