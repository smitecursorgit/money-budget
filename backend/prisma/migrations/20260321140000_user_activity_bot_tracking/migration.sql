-- AlterTable
ALTER TABLE "users" ADD COLUMN "first_bot_start_at" TIMESTAMP(3),
ADD COLUMN "last_bot_at" TIMESTAMP(3),
ADD COLUMN "first_app_open_at" TIMESTAMP(3),
ADD COLUMN "last_seen_at" TIMESTAMP(3);

-- Исторические пользователи приложения: первый вход ≈ created_at
UPDATE "users" SET "first_app_open_at" = "created_at" WHERE "first_app_open_at" IS NULL;

UPDATE "users" SET "last_seen_at" = "updated_at" WHERE "last_seen_at" IS NULL;
