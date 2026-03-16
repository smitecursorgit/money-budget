-- Enable pgcrypto for gen_random_uuid() if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initial_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- Add column current_budget_id to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_budget_id" TEXT;

-- Add column budget_id to categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "budget_id" TEXT;

-- Add column budget_id to transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "budget_id" TEXT;

-- Add column budget_id to reminders
ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "budget_id" TEXT;

-- CreateIndex
CREATE INDEX "budgets_user_id_idx" ON "budgets"("user_id");

-- CreateIndex
CREATE INDEX "categories_budget_id_idx" ON "categories"("budget_id");

-- CreateIndex
CREATE INDEX "transactions_budget_id_date_idx" ON "transactions"("budget_id", "date");

-- CreateIndex
CREATE INDEX "reminders_budget_id_next_date_idx" ON "reminders"("budget_id", "next_date");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_current_budget_id_fkey" FOREIGN KEY ("current_budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: create default budget for each user and assign
INSERT INTO "budgets" ("id", "user_id", "name", "initial_balance", "created_at", "updated_at")
SELECT 
  gen_random_uuid()::text,
  u.id,
  'Основной',
  0,
  NOW(),
  NOW()
FROM "users" u
WHERE NOT EXISTS (SELECT 1 FROM "budgets" b WHERE b.user_id = u.id);

-- Update categories with budget_id
UPDATE "categories" c
SET "budget_id" = (SELECT b.id FROM "budgets" b WHERE b.user_id = c.user_id LIMIT 1)
WHERE c."budget_id" IS NULL;

-- Update transactions with budget_id
UPDATE "transactions" t
SET "budget_id" = (SELECT b.id FROM "budgets" b WHERE b.user_id = t.user_id LIMIT 1)
WHERE t."budget_id" IS NULL;

-- Update reminders with budget_id
UPDATE "reminders" r
SET "budget_id" = (SELECT b.id FROM "budgets" b WHERE r.user_id = b.user_id LIMIT 1)
WHERE r."budget_id" IS NULL;

-- Set current_budget_id for users
UPDATE "users" u
SET "current_budget_id" = (SELECT b.id FROM "budgets" b WHERE b.user_id = u.id LIMIT 1)
WHERE u."current_budget_id" IS NULL;
