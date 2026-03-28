/** Render / .env may use UPPER_SNAKE_CASE or lowercase for the same key. */
export function getTelegramWebhookSecret(): string | undefined {
  const upper = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (upper) return upper;
  return process.env['telegram_webhook_secret']?.trim();
}
