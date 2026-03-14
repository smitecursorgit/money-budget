import { ParsedEntry, Category } from '../types/index.ts';
import { transactionsApi, remindersApi } from '../api/client.ts';

export async function saveVoiceEntry(entry: ParsedEntry, categories: Category[]): Promise<void> {
  if (entry.type === 'reminder') {
    await remindersApi.create({
      title: entry.reminderTitle || entry.note || 'Напоминание',
      amount: entry.amount,
      recurrence: entry.reminderRecurrence || 'once',
      nextDate: entry.date || new Date().toISOString().slice(0, 10),
    });
    return;
  }

  const matchedCategory = categories.find(
    (c) =>
      c.name.toLowerCase() === entry.category?.toLowerCase() &&
      c.type === entry.type
  );

  await transactionsApi.create({
    amount: entry.amount || 0,
    type: entry.type,
    categoryId: matchedCategory?.id,
    date: entry.date,
    note: entry.note,
  });
}
