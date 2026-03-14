export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface AuthPayload {
  userId: string;
  telegramId: number;
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

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
