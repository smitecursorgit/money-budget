import { ParsedEntry, Category } from '../types/index.ts';
import { transactionsApi, remindersApi } from '../api/client.ts';

/**
 * Find the best matching category for a parsed AI entry.
 * Priority: 1) exact name match, 2) partial name match, 3) keyword match.
 */
function findCategory(categories: Category[], aiCategoryName: string | undefined, type: 'income' | 'expense'): Category | undefined {
  if (!aiCategoryName) return undefined;

  const typed = categories.filter((c) => c.type === type);
  const needle = aiCategoryName.toLowerCase().trim();

  // 1. Exact name match (case-insensitive)
  const exact = typed.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact;

  // 2. Partial name match (e.g. AI returns "Алкоголь" but category is "Алкогольные напитки")
  const partial = typed.find(
    (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
  );
  if (partial) return partial;

  // 3. Keyword match — check if AI category name appears in any category's keywords
  const byKeyword = typed.find((c) =>
    c.keywords.some(
      (kw) => kw.toLowerCase() === needle || needle.includes(kw.toLowerCase())
    )
  );
  if (byKeyword) return byKeyword;

  return undefined;
}

export async function saveVoiceEntry(entry: ParsedEntry, categories: Category[]): Promise<unknown | void> {
  if (entry.type === 'reminder') {
    await remindersApi.create({
      title: entry.reminderTitle || entry.note || 'Напоминание',
      amount: entry.amount,
      recurrence: entry.reminderRecurrence || 'once',
      nextDate: entry.date || new Date().toISOString().slice(0, 10),
    });
    return null;
  }

  if (!entry.amount || entry.amount <= 0) {
    throw new Error('Укажите сумму операции');
  }

  const matchedCategory = findCategory(categories, entry.category, entry.type);

  const { data } = await transactionsApi.create({
    amount: entry.amount,
    type: entry.type,
    categoryId: matchedCategory?.id,
    date: entry.date,
    note: entry.note,
  });
  return data as { id: string; amount: number; type: string; categoryId: string | null; category: unknown; date: string; note: string | null; createdAt: string };
}
