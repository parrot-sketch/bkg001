-- CreateEnum
CREATE TYPE "ClinicalNoteType" AS ENUM ('GENERAL', 'ASSESSMENT', 'PROGRESS', 'PROCEDURE', 'FOLLOW_UP', 'REFERRAL');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'PATIENT_QUEUED', 'PATIENT_REASSIGNED', 'PATIENT_REMOVED_FROM_QUEUE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'OPENING_BALANCE');

-- AlterEnum
ALTER TYPE "InventoryCategory" ADD VALUE 'SPECIMEN_CONTAINER';

-- DropForeignKey (commented out - column may not exist in production)
-- ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_created_by_user_id_fkey";

-- DropIndex (commented out - constraint may not exist)
-- DROP INDEX "InventoryBatch_goods_receipt_id_key";

-- DropIndex (commented out - may not exist in production)
-- DROP INDEX "InventoryItem_quantity_on_hand_idx";

-- DropIndex (commented out - indexes may not exist in production)
-- DROP INDEX "SurgicalChecklist_sign_in_completed_at_idx";
-- DROP INDEX "SurgicalChecklist_sign_out_completed_at_idx";
-- DROP INDEX "SurgicalChecklist_time_out_completed_at_idx";

-- AlterTable
ALTER TABLE "CalendarEvent" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
-- InventoryItem.quantity_on_hand may already be removed in production
-- ALTER TABLE "InventoryItem" DROP COLUMN "quantity_on_hand";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "charge_sheet_no" TEXT,
ADD COLUMN     "finalized_at" TIMESTAMP(3),
ADD COLUMN     "finalized_by" TEXT;

-- AlterTable
-- PurchaseOrder already has ordered_by_user_id in production
-- Skip adding created_by_user_id as schema uses ordered_by_user_id
ALTER TABLE "PurchaseOrder" ALTER COLUMN "po_number" SET DATA TYPE VARCHAR(255);

-- AlterTable (commented out - columns may not exist in production)
-- ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "item_name" SET DATA TYPE VARCHAR(255),
-- ALTER COLUMN "unit_price" DROP DEFAULT,
-- ALTER COLUMN "line_total" DROP DEFAULT;

-- AlterTable (commented out - may fail if columns already altered)
-- ALTER TABLE "SurgicalBillingEstimate" ALTER COLUMN "surgeon_fee" SET DATA TYPE DECIMAL(65,30),
-- ALTER COLUMN "anaesthesiologist_fee" SET DATA TYPE DECIMAL(65,30),
-- ALTER COLUMN "theatre_fee" SET DATA TYPE DECIMAL(65,30),
-- ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(65,30),
-- ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable (commented out - may fail if columns already altered)
-- ALTER TABLE "SurgicalBillingLineItem" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(65,30),
-- ALTER COLUMN "total_price" SET DATA TYPE DECIMAL(65,30),
-- ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable (commented out - may fail if column already altered)
-- ALTER TABLE "SurgicalCaseItem" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable (commented out - may fail if column already altered)
-- ALTER TABLE "SurgicalCaseTeamMember" ALTER COLUMN "id" DROP DEFAULT,
-- ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable (commented out - columns may already exist in production)
-- ALTER TABLE "User" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
-- ADD COLUMN     "locked_until" TIMESTAMP(3),
-- ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable (commented out - column may already exist in production)
-- ALTER TABLE "Vendor" ALTER COLUMN "tax_id" SET DATA TYPE VARCHAR(100);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_user_id" TEXT NOT NULL,
    "appointment_id" INTEGER,
    "note_type" "ClinicalNoteType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_email_idx" ON "LoginAttempt"("email");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_address_idx" ON "LoginAttempt"("ip_address");

-- CreateIndex
CREATE INDEX "LoginAttempt_attempt_at_idx" ON "LoginAttempt"("attempt_at");

-- CreateIndex
CREATE INDEX "LoginAttempt_user_id_idx" ON "LoginAttempt"("user_id");

-- CreateIndex
CREATE INDEX "ClinicalNote_patient_id_idx" ON "ClinicalNote"("patient_id");

-- CreateIndex
CREATE INDEX "ClinicalNote_doctor_user_id_idx" ON "ClinicalNote"("doctor_user_id");

-- CreateIndex
CREATE INDEX "ClinicalNote_appointment_id_idx" ON "ClinicalNote"("appointment_id");

-- CreateIndex
CREATE INDEX "ClinicalNote_note_type_idx" ON "ClinicalNote"("note_type");

-- CreateIndex
CREATE INDEX "ClinicalNote_created_at_idx" ON "ClinicalNote"("created_at");

-- CreateIndex
CREATE INDEX "InventoryTransaction_inventory_item_id_idx" ON "InventoryTransaction"("inventory_item_id");

-- CreateIndex
CREATE INDEX "InventoryTransaction_type_idx" ON "InventoryTransaction"("type");

-- CreateIndex
CREATE INDEX "InventoryTransaction_created_at_idx" ON "InventoryTransaction"("created_at");

-- CreateIndex
CREATE INDEX "InventoryTransaction_reference_idx" ON "InventoryTransaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_charge_sheet_no_key" ON "Payment"("charge_sheet_no");

-- Skip: PurchaseOrder already has ordered_by_user_id
-- CREATE INDEX "PurchaseOrder_created_by_user_id_idx" ON "PurchaseOrder"("created_by_user_id");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_created_at_idx" ON "PurchaseOrder"("status", "created_at");

-- CreateIndex
CREATE INDEX "RefreshToken_token_revoked_expires_at_idx" ON "RefreshToken"("token", "revoked", "expires_at");

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_doctor_user_id_fkey" FOREIGN KEY ("doctor_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Skip: PurchaseOrder uses ordered_by_user_id, not created_by_user_id
-- AddForeignKey
-- ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCaseTeamMember" ADD CONSTRAINT "SurgicalCaseTeamMember_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_vendor_kra_pin" RENAME TO "Vendor_kra_pin_idx";

