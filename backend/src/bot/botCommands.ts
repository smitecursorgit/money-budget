import type TelegramBot from 'node-telegram-bot-api';
import { STAT_COMMAND, STAT_OWNER_TELEGRAM_ID } from './botStats';

const DEFAULT_COMMANDS = [
  { command: 'start', description: 'Открыть приложение' },
  { command: 'help', description: 'Как пользоваться' },
] as const;

/** Команды для конкретного chat_id (личка): /stat у владельца. */
export function buildCommandsForChat(telegramUserId: number): { command: string; description: string }[] {
  const cmds: { command: string; description: string }[] = [...DEFAULT_COMMANDS];
  if (telegramUserId === STAT_OWNER_TELEGRAM_ID) {
    cmds.push(STAT_COMMAND);
  }
  return cmds;
}

/** Вызывать из /start — чтобы меню с /stat появилось без перезапуска сервера. */
export async function ensureOwnerCommandsForPrivateChat(
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

export async function syncBotCommands(bot: TelegramBot): Promise<void> {
  await bot.setMyCommands([...DEFAULT_COMMANDS], { scope: { type: 'default' } });

  try {
    await bot.setMyCommands(buildCommandsForChat(STAT_OWNER_TELEGRAM_ID), {
      scope: { type: 'chat', chat_id: STAT_OWNER_TELEGRAM_ID },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[bot] setMyCommands for stat owner: ${msg}`);
  }

  console.log('[bot] extra commands for /stat owner');
}
