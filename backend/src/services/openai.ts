import OpenAI from 'openai';
import fs from 'fs';
import { ParsedEntry } from '../types/index';

// Groq uses OpenAI-compatible API — only baseURL and models differ
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function transcribeAudio(filePath: string): Promise<string> {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-large-v3',
    language: 'ru',
  });
  return transcription.text;
}

const SYSTEM_PROMPT = `Ты — AI-ассистент для учёта личных финансов. Твоя задача — разобрать голосовую или текстовую команду пользователя и вернуть ТОЛЬКО JSON-объект без каких-либо пояснений.

Правила парсинга:
- "зп", "зарплата", "salary" → тип income, категория "Зарплата"
- "покурить", "сигареты", "кальян", "вейп" → тип expense, категория "Табак"
- "кофе", "латте", "капучино" → тип expense, категория "Кофе"
- "продукты", "магазин", "супермаркет" → тип expense, категория "Продукты"
- "метро", "такси", "маршрутка", "транспорт" → тип expense, категория "Транспорт"
- "аренда", "квартира" → тип expense, категория "Аренда"
- "ресторан", "кафе", "обед", "ужин" → тип expense, категория "Рестораны"
- числа типа "сотка" = 100, "пятихатка" = 500, "косарь/косой" = 1000, "штука" = 1000, "пятёрка" = 5000, "десятка" = 10000
- если сказано "напомни платить X 5-го" → тип reminder
- если тип не ясен и есть сумма → expense по умолчанию

Формат ответа (только JSON, без markdown):
{
  "type": "expense" | "income" | "reminder",
  "amount": число или null,
  "category": "название категории" или null,
  "date": "YYYY-MM-DD" (если не указана — сегодня) или null для reminder,
  "note": "оригинальная фраза",
  "reminderTitle": "название напоминания" (только для reminder),
  "reminderRecurrence": "once" | "daily" | "weekly" | "monthly" | "yearly" (только для reminder)
}`;

export async function parseFinanceText(
  text: string,
  categories: Array<{ name: string; type: string; keywords: string[] }>,
  today: string
): Promise<ParsedEntry> {
  const categoryList = categories.map((c) => `${c.name} (${c.type}): ${c.keywords.join(', ')}`).join('\n');

  const userPrompt = `Сегодня: ${today}
Категории пользователя:
${categoryList}

Команда: "${text}"`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content?.trim() || '{}';

  try {
    return JSON.parse(content) as ParsedEntry;
  } catch {
    return { type: 'expense', note: text };
  }
}
