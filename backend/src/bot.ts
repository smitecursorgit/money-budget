import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;

export function initBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;

  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

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

  bot.on('polling_error', (err) => {
    console.error('Bot polling error:', err.message);
  });

  console.log('Telegram bot started');
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
