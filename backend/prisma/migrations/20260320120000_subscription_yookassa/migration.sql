-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_start" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "subscription_ends_at" TIMESTAMP(3);

UPDATE "users" SET "trial_start" = "created_at" WHERE "trial_start" IS NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "yookassa_processed_payments" (
    "payment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yookassa_processed_payments_pkey" PRIMARY KEY ("payment_id")
);

CREATE INDEX IF NOT EXISTS "yookassa_processed_payments_user_id_idx" ON "yookassa_processed_payments"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'yookassa_processed_payments_user_id_fkey'
  ) THEN
    ALTER TABLE "yookassa_processed_payments" ADD CONSTRAINT "yookassa_processed_payments_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
