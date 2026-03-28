import TelegramBot from 'node-telegram-bot-api';
import { getTelegramWebhookSecret } from './lib/env';
import { syncBotCommands, ensureOwnerCommandsForPrivateChat } from './bot/botCommands';
import { upsertUserFromBotStart, handleStatCommand } from './bot/botStats';

let bot: TelegramBot | null = null;

export function getBot(): TelegramBot | null {
  return bot;
}

export function initBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;

  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
    return null;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Webhook mode — Telegram pushes updates to /webhook/telegram
    bot = new TelegramBot(token, { polling: false });
    // Register webhook URL automatically
    const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;
    if (backendUrl) {
      const webhookUrl = `${backendUrl.replace(/\/$/, '')}/webhook/telegram`;
      const secret = getTelegramWebhookSecret();
      const hookOpts = secret ? { secret_token: secret } : {};
      bot
        .setWebHook(webhookUrl, hookOpts)
        .then(() => console.log(`Webhook set: ${webhookUrl}`))
        .catch((err) => console.error('Failed to set webhook:', err.message));
    } else {
      console.warn('BACKEND_URL not set — webhook not registered automatically. Set it in Render env vars.');
    }
  } else {
    // Polling mode for local development
    bot = new TelegramBot(token, { polling: true });
  }

  // Catch all Telegram API / network errors — prevents unhandled rejection crashes
  bot.on('error', (err) => {
    console.error('Telegram bot error:', err.message);
  });

  bot.on('polling_error', (err) => {
    console.error('Telegram polling error:', err.message);
  });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from?.id;
    void upsertUserFromBotStart(msg);
    if (fromId != null) {
      void ensureOwnerCommandsForPrivateChat(bot!, fromId);
    }
    bot!
      .sendMessage(chatId, '👋 Привет! Я — Paylo.\nВеди учёт доходов и расходов голосом.', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💰 Открыть приложение',
                web_app: { url: miniAppUrl || 'https://t.me' },
              },
            ],
          ],
        },
      })
      .catch((err) => console.error('Failed to send /start reply:', err.message));
  });

  bot.onText(/\/help/, (msg) => {
    bot!
      .sendMessage(
        msg.chat.id,
        '🎤 *Как пользоваться:*\n\n' +
          'Нажми кнопку микрофона и скажи:\n' +
          '• "сотка на кофе" — расход 100₽\n' +
          '• "зп 50000" — доход 50 000₽\n' +
          '• "напомни аренда 5-го" — напоминание\n\n' +
          '💡 Понимаю сленг: сотка, пятихатка, косарь, штука',
        { parse_mode: 'Markdown' }
      )
      .catch((err) => console.error('Failed to send /help reply:', err.message));
  });

  bot.onText(/^\/stat(?:@\w+)?(\s|$)/i, (msg) => {
    void handleStatCommand(bot!, msg);
  });

  void syncBotCommands(bot).catch((err) =>
    console.error('Failed to sync bot commands:', err instanceof Error ? err.message : err)
  );

  console.log(`Telegram bot started (${isProduction ? 'webhook' : 'polling'} mode)`);
  return bot;
}

export async function sendReminderNotification(
  telegramId: bigint | number,
  title: string,
  amount?: number
): Promise<void> {
  if (!bot) return;

  const amountStr = amount ? ` — ${amount.toLocaleString('ru')} ₽` : '';
  const message = `🔔 *Напоминание о платеже*\n\n📋 ${title}${amountStr}\n\nНе забудь внести запись!`;

  const chatId = typeof telegramId === 'bigint' ? telegramId.toString() : String(telegramId);

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '✅ Открыть приложение',
            web_app: { url: process.env.MINI_APP_URL || 'https://example.com' },
          },
        ],
      ],
    },
  });
}
