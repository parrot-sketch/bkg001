-- Add missing User columns for auth/security features
-- These are required by the schema but were skipped in previous migration

ALTER TABLE "User" ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "locked_until" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 1;

-- Add missing Payment columns
ALTER TABLE "Payment" ADD COLUMN "charge_sheet_no" TEXT;
ALTER TABLE "Payment" ADD COLUMN "finalized_at" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "finalized_by" TEXT;
