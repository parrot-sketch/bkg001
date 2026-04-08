-- Add missing User security columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 1;

-- Add missing Payment columns
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "charge_sheet_no" TEXT UNIQUE;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "finalized_at" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "finalized_by" TEXT;