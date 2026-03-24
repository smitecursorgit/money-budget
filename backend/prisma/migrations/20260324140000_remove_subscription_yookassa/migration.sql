-- Удаление остатков платёжной подписки и ЮKassa (приложение полностью бесплатное)
DROP TABLE IF EXISTS "yookassa_processed_payments";
ALTER TABLE "users" DROP COLUMN IF EXISTS "subscription_ends_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "subscription_exempt";
