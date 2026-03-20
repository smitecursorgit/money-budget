import type TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../lib/prisma';
import { STAT_COMMAND, STAT_OWNER_TELEGRAM_ID } from './botStats';

const DEFAULT_COMMANDS = [
  { command: 'start', description: 'Открыть приложение' },
  { command: 'help', description: 'Как пользоваться' },
] as const;

/** Команды для конкретного chat_id (личка): /stat у владельца, /admins у админов. */
export function buildCommandsForChat(telegramUserId: number): { command: string; description: string }[] {
  const cmds: { command: string; description: string }[] = [...DEFAULT_COMMANDS];
  if (telegramUserId === STAT_OWNER_TELEGRAM_ID) {
    cmds.push(STAT_COMMAND);
  }
  if (isTelegramAdmin(telegramUserId)) {
    cmds.push({ command: 'admins', description: 'Выдать/забрать доступ по @username' });
  }
  return cmds;
}

/** Вызывать из /start — чтобы меню с /admins появилось без перезапуска сервера. */
export async function ensureAdminCommandsForPrivateChat(
  bot: TelegramBot,
  telegramUserId: number
): Promise<void> {
  const cmds = buildCommandsForChat(telegramUserId);
  if (cmds.length === DEFAULT_COMMANDS.length) return;
  try {
    await bot.setMyCommands(cmds, {
      scope: { type: 'chat', chat_id: telegramUserId },
    });
  } catch {
    /* ignore */
  }
}

export function getAdminTelegramIds(): number[] {
  const raw = process.env.ADMIN_TELEGRAM_IDS || '';
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function isTelegramAdmin(telegramUserId: number | undefined): boolean {
  if (telegramUserId == null) return false;
  return getAdminTelegramIds().includes(telegramUserId);
}

/** Команда /admins видна только в личке у перечисленных в ADMIN_TELEGRAM_IDS. */
export async function syncAdminBotCommands(bot: TelegramBot): Promise<void> {
  const adminIds = getAdminTelegramIds();

  await bot.setMyCommands([...DEFAULT_COMMANDS], { scope: { type: 'default' } });

  const chatIdsWithExtra = new Set<number>([...adminIds, STAT_OWNER_TELEGRAM_ID]);
  for (const chatId of chatIdsWithExtra) {
    try {
      await bot.setMyCommands(buildCommandsForChat(chatId), {
        scope: { type: 'chat', chat_id: chatId },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[bot] setMyCommands for chat ${chatId}: ${msg}`);
    }
  }

  if (chatIdsWithExtra.size > 0) {
    console.log(
      `[bot] extra commands for ${chatIdsWithExtra.size} chat(s) (/stat owner, /admins for admins)`
    );
  }
}

function parseAdminsCommand(text: string): { action: 'grant' | 'revoke'; username: string } | null {
  const rest = text.trim().replace(/^\/admins(?:@\w+)?\s*/i, '').trim();
  if (!rest) return null;
  const parts = rest.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const verb = parts[0].toLowerCase();
  const rawUser = parts[1].replace(/^@/, '').trim();
  if (!rawUser) return null;

  const grant = ['give', 'выдать', 'grant', '+', 'add'].includes(verb);
  const revoke = ['take', 'забрать', 'revoke', '-', 'remove'].includes(verb);
  if (grant) return { action: 'grant', username: rawUser };
  if (revoke) return { action: 'revoke', username: rawUser };
  return null;
}

export async function handleAdminsSubscriptionCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;
  const fromId = msg.from?.id;

  if (msg.chat.type !== 'private') {
    return;
  }
  if (!isTelegramAdmin(fromId)) {
    return;
  }

  const text = msg.text || '';
  const parsed = parseAdminsCommand(text);

  if (!parsed) {
    await bot.sendMessage(
      chatId,
      [
        '🛠 Доступ без подписки',
        '',
        'Выдать бессрочный доступ:',
        '/admins give @username',
        '/admins выдать username',
        '',
        'Забрать:',
        '/admins take @username',
        '/admins забрать username',
        '',
        'Пользователь должен хотя бы раз открыть Mini App (есть в базе).',
      ].join('\n')
    );
    return;
  }

  const { action, username } = parsed;
  const exempt = action === 'grant';

  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, firstName: true, username: true, subscriptionExempt: true },
    });

    if (!user) {
      await bot.sendMessage(
        chatId,
        `Не найден пользователь с @${username} в базе. Пусть сначала зайдёт в приложение через Telegram.`
      );
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionExempt: exempt },
    });

    const label = user.username ? `@${user.username}` : user.firstName || user.id;
    if (exempt) {
      await bot.sendMessage(chatId, `✅ Бессрочный доступ выдан: ${label}`);
    } else {
      await bot.sendMessage(chatId, `✅ Доступ по подписке снова по правилам приложения: ${label}`);
    }
  } catch (e) {
    console.error('[bot /admins]', e);
    await bot.sendMessage(chatId, 'Ошибка базы данных. Попробуйте позже.');
  }
}
