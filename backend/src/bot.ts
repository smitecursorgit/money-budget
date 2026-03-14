import TelegramBot from 'node-telegram-bot-api';

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
      const webhookUrl = `${backendUrl}/webhook/telegram`;
      bot.setWebHook(webhookUrl)
        .then(() => console.log(`Webhook set: ${webhookUrl}`))
        .catch((err) => console.error('Failed to set webhook:', err.message));
    } else {
      console.warn('BACKEND_URL not set — webhook not registered automatically. Set it in Render env vars.');
    }
  } else {
    // Polling mode for local development
    bot = new TelegramBot(token, { polling: true });
    bot.on('polling_error', (err) => {
      console.error('Bot polling error:', err.message);
    });
  }

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot!.sendMessage(chatId, '👋 Привет! Я — Money Budget.\nВеди учёт доходов и расходов голосом.', {
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

  bot.onText(/\/help/, (msg) => {
    bot!.sendMessage(
      msg.chat.id,
      '🎤 *Как пользоваться:*\n\n' +
      'Нажми кнопку микрофона и скажи:\n' +
      '• "сотка на кофе" — расход 100₽\n' +
      '• "зп 50000" — доход 50 000₽\n' +
      '• "напомни аренда 5-го" — напоминание\n\n' +
      '💡 Понимаю сленг: сотка, пятихатка, косарь, штука',
      { parse_mode: 'Markdown' }
    );
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
