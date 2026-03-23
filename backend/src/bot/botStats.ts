import type TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';

/** Единственный Telegram ID с доступом к /stat */
export const STAT_OWNER_TELEGRAM_ID = 5285352183;

export const STAT_COMMAND = {
  command: 'stat',
  description: 'Статистика пользователей',
} as const;

const ACTIVE_DAYS = 7;
const MSG_CHUNK = 4000;

export function isStatOwner(telegramUserId: number | undefined): boolean {
  return telegramUserId === STAT_OWNER_TELEGRAM_ID;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatUserLine(u: {
  telegramId: bigint;
  username: string | null;
  firstName: string | null;
}): string {
  const tg = u.telegramId.toString();
  const name = u.username ? `@${u.username}` : u.firstName || 'без имени';
  return `• ${escapeHtml(name)} — <code>${escapeHtml(tg)}</code>`;
}

function splitLongMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('\n', maxLen);
    if (cut < maxLen / 2) cut = maxLen;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/** Первый /start в боте и последняя активность в чате с ботом */
export async function upsertUserFromBotStart(msg: TelegramBot.Message): Promise<void> {
  const from = msg.from;
  if (!from?.id) return;

  const now = new Date();
  const tgBig = BigInt(from.id);

  const existing = await prisma.user.findUnique({
    where: { telegramId: tgBig },
    select: { id: true, firstBotStartAt: true },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        telegramId: tgBig,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        trialStart: new Date(),
        firstBotStartAt: now,
        lastBotAt: now,
      },
    });
    return;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      firstName: from.first_name,
      lastName: from.last_name,
      username: from.username,
      lastBotAt: now,
      firstBotStartAt: existing.firstBotStartAt ?? now,
    },
  });
}

export async function handleStatCommand(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  if (msg.chat.type !== 'private') return;
  if (!isStatOwner(msg.from?.id)) return;

  const chatId = msg.chat.id;

  try {
    const since = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);

    const [botStarters, appUsers, activeUsers, buyers] = await Promise.all([
      prisma.user.findMany({
        where: { firstBotStartAt: { not: null } },
        select: { telegramId: true, username: true, firstName: true, firstBotStartAt: true },
        orderBy: { firstBotStartAt: 'asc' },
      }),
      prisma.user.findMany({
        where: { firstAppOpenAt: { not: null } },
        select: { telegramId: true, username: true, firstName: true, firstAppOpenAt: true },
        orderBy: { firstAppOpenAt: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          OR: [{ lastSeenAt: { gte: since } }, { lastBotAt: { gte: since } }],
        },
        select: { telegramId: true, username: true, firstName: true },
        orderBy: { telegramId: 'asc' },
      }),
      prisma.user.findMany({
        where: { yookassaProcessedPayments: { some: {} } },
        select: { telegramId: true, username: true, firstName: true },
        orderBy: { telegramId: 'asc' },
      }),
    ]);

    const intro =
      `<b>📊 Статистика Paylo</b>\n\n` +
      `🤖 <b>Запустили бота</b> (/start): <b>${botStarters.length}</b>\n` +
      `📱 <b>Открывали приложение</b>: <b>${appUsers.length}</b>\n` +
      `🔥 <b>Активны за ${ACTIVE_DAYS} дн.</b> (бот или приложение): <b>${activeUsers.length}</b>\n` +
      `💳 <b>Оплатили подписку</b> (ЮKassa): <b>${buyers.length}</b>`;

    const sections = [
      `\n\n🤖 <b>Кто запустил бота</b>\n${botStarters.map(formatUserLine).join('\n') || '—'}`,
      `\n\n📱 <b>Кто открывал приложение</b>\n${appUsers.map(formatUserLine).join('\n') || '—'}`,
      `\n\n🔥 <b>Активные (${ACTIVE_DAYS} дн.)</b>\n${activeUsers.map(formatUserLine).join('\n') || '—'}`,
      `\n\n💳 <b>Оплатили подписку</b>\n${buyers.map(formatUserLine).join('\n') || '—'}`,
    ];

    const fullText = intro + sections.join('');
    const parts = splitLongMessage(fullText, MSG_CHUNK);

    for (const part of parts) {
      await bot.sendMessage(chatId, part, { parse_mode: 'HTML' });
    }
  } catch (e) {
    console.error('[bot /stat]', e);
    await bot.sendMessage(chatId, 'Ошибка при сборе статистики. Попробуйте позже.');
  }
}
