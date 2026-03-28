import { prisma } from '../lib/prisma';
import { getBudgetId } from '../lib/budget';
import { getCurrentPeriod } from '../lib/timezonePeriod';

function fmtAmount(n: number, currency: string): string {
  return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

const MAX_CONTEXT_CHARS = 12000;

/**
 * Сводка по текущему периоду и последним операциям — для системного промпта чата помощника.
 */
export async function buildAssistantFinanceContext(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, timezone: true, periodStart: true },
  });
  if (!user) return '';

  const budgetId = await getBudgetId(userId);
  const budget = budgetId ? await prisma.budget.findUnique({ where: { id: budgetId } }) : null;

  const tz = user.timezone || 'Europe/Moscow';
  const periodStart = user.periodStart || 1;
  const { dateFrom, dateTo } = getCurrentPeriod(tz, periodStart);
  const currency = user.currency || 'RUB';

  const txWherePeriod = budgetId
    ? {
        OR: [{ budgetId }, { userId, budgetId: null }],
        date: { gte: dateFrom, lt: dateTo },
      }
    : { userId, date: { gte: dateFrom, lt: dateTo } };

  const baseWhere = budgetId ? { OR: [{ budgetId }, { userId, budgetId: null }] } : { userId };

  const [incomeAgg, expenseAgg, grouped, recent] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...txWherePeriod, type: 'income' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...txWherePeriod, type: 'expense' },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: txWherePeriod,
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: baseWhere,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 25,
      include: { category: true },
    }),
  ]);

  const initialBalance = budget ? Number(budget.initialBalance) : 0;
  const income = Number(incomeAgg._sum.amount ?? 0);
  const expense = Number(expenseAgg._sum.amount ?? 0);
  const balance = initialBalance + income - expense;

  const categoryIds = [...new Set(grouped.map((g) => g.categoryId).filter(Boolean))] as string[];
  const categories = categoryIds.length
    ? await prisma.category.findMany({ where: { id: { in: categoryIds } } })
    : [];
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const expenseByCat: { name: string; sum: number }[] = [];
  const incomeByCat: { name: string; sum: number }[] = [];
  for (const g of grouped) {
    const amt = Number(g._sum.amount ?? 0);
    const name = g.categoryId ? catMap.get(g.categoryId)?.name ?? 'Без категории' : 'Без категории';
    if (g.type === 'expense') expenseByCat.push({ name, sum: amt });
    else incomeByCat.push({ name, sum: amt });
  }
  expenseByCat.sort((a, b) => b.sum - a.sum);
  incomeByCat.sort((a, b) => b.sum - a.sum);

  const periodEndDay = new Date(dateTo.getTime() - 86400000);
  const lines: string[] = [];
  lines.push(`Валюта: ${currency}`);
  lines.push(
    `Текущий бюджетный период: ${dateFrom.toISOString().slice(0, 10)} — ${periodEndDay.toISOString().slice(0, 10)} (границы по настройке периода в приложении)`
  );
  lines.push(`Начальный баланс бюджета: ${fmtAmount(initialBalance, currency)}`);
  lines.push(`Доходы за период: ${fmtAmount(income, currency)}`);
  lines.push(`Расходы за период: ${fmtAmount(expense, currency)}`);
  lines.push(`Баланс (начальный + доходы − расходы): ${fmtAmount(balance, currency)}`);

  lines.push('Расходы по категориям (за период):');
  if (expenseByCat.length === 0) lines.push('  (нет)');
  else for (const row of expenseByCat.slice(0, 12)) lines.push(`  — ${row.name}: ${fmtAmount(row.sum, currency)}`);

  lines.push('Доходы по категориям (за период):');
  if (incomeByCat.length === 0) lines.push('  (нет)');
  else for (const row of incomeByCat.slice(0, 10)) lines.push(`  — ${row.name}: ${fmtAmount(row.sum, currency)}`);

  lines.push('Последние операции (до 25, сначала новые):');
  if (recent.length === 0) lines.push('  (нет операций)');
  else {
    for (const t of recent) {
      const cat = t.category?.name ?? 'Без категории';
      const d = t.date.toISOString().slice(0, 10);
      const typeRu = t.type === 'income' ? 'доход' : 'расход';
      const note = t.note ? ` — ${t.note.replace(/\s+/g, ' ').trim().slice(0, 100)}` : '';
      lines.push(`  ${d} · ${typeRu} · ${fmtAmount(Number(t.amount), currency)} · ${cat}${note}`);
    }
  }

  let text = lines.join('\n');
  if (text.length > MAX_CONTEXT_CHARS) {
    text = `${text.slice(0, MAX_CONTEXT_CHARS)}\n… (данные обрезаны по длине)`;
  }
  return text;
}
