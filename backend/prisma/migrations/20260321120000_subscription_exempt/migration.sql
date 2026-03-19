-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_exempt" BOOLEAN NOT NULL DEFAULT false;
