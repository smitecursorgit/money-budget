import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;

export function initBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;

  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
    return null;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // In production use webhook mode — no polling conflicts
    bot = new TelegramBot(token, { polling: false });
  } else {
    // In development use polling for convenience
    bot = new TelegramBot(token, { polling: true });
    bot.on('polling_error', (err) => {
      console.error('Bot polling error:', err.message);
    });
  }

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot!.sendMessage(chatId, '👋 Привет! Я помогаю вести учёт финансов.', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '💰 Открыть приложение',
              web_app: { url: miniAppUrl || 'https://example.com' },
            },
          ],
        ],
      },
    });
  });

  console.log(`Telegram bot started (${isProduction ? 'webhook' : 'polling'} mode)`);
  return bot;
}

export async function sendReminderNotification(
  telegramId: number,
  title: string,
  amount?: number
): Promise<void> {
  if (!bot) return;

  const amountStr = amount ? ` — ${amount.toLocaleString('ru')} ₽` : '';
  const message = `🔔 *Напоминание о платеже*\n\n📋 ${title}${amountStr}\n\nНе забудь внести запись!`;

  await bot.sendMessage(telegramId, message, {
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
