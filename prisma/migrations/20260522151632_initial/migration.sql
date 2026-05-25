/*
  Warnings:

  - You are about to drop the column `quantity_on_hand` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to alter the column `po_number` on the `PurchaseOrder` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `item_name` on the `PurchaseOrderItem` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `tax_id` on the `Vendor` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - The primary key for the `procedure_category_config` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `procedure_service_link` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `procedure_subcategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `surgical_procedure_options` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[charge_sheet_no]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Made the column `display_order` on table `procedure_category_config` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_active` on table `procedure_category_config` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `procedure_category_config` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_primary` on table `procedure_service_link` required. This step will fail if there are existing NULL values in that column.
  - Made the column `display_order` on table `procedure_subcategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_active` on table `procedure_subcategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `procedure_subcategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_billable` on table `surgical_procedure_options` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `surgical_procedure_options` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ClinicalNoteType" AS ENUM ('GENERAL', 'ASSESSMENT', 'PROGRESS', 'PROCEDURE', 'FOLLOW_UP', 'REFERRAL');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'PATIENT_QUEUED', 'PATIENT_REASSIGNED', 'PATIENT_REMOVED_FROM_QUEUE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "AdmissionType" AS ENUM ('DAYCASE', 'OVERNIGHT');

-- CreateEnum
CREATE TYPE "CasePlanType" AS ENUM ('PRIMARY', 'REVISION');

-- CreateEnum
CREATE TYPE "LipoDevice" AS ENUM ('POWER_ASSISTED', 'LASER_ASSISTED', 'SUCTION_ASSISTED');

-- AlterEnum
ALTER TYPE "InventoryCategory" ADD VALUE 'SPECIMEN_CONTAINER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SurgicalCaseStatus" ADD VALUE 'READY_FOR_WARD_PREP';
ALTER TYPE "SurgicalCaseStatus" ADD VALUE 'IN_WARD_PREP';

-- DropForeignKey
ALTER TABLE "PatientBill" DROP CONSTRAINT "PatientBill_inventory_item_id_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "procedure_service_link" DROP CONSTRAINT "procedure_service_link_procedure_id_fkey";

-- DropForeignKey
ALTER TABLE "procedure_service_link" DROP CONSTRAINT "procedure_service_link_service_id_fkey";

-- DropForeignKey
ALTER TABLE "procedure_subcategory" DROP CONSTRAINT "procedure_subcategory_category_id_fkey";

-- DropIndex
DROP INDEX "InventoryBatch_goods_receipt_id_key";

-- DropIndex
DROP INDEX "InventoryItem_quantity_on_hand_idx";

-- DropIndex
DROP INDEX "SurgicalChecklist_sign_in_completed_at_idx";

-- DropIndex
DROP INDEX "SurgicalChecklist_sign_out_completed_at_idx";

-- DropIndex
DROP INDEX "SurgicalChecklist_time_out_completed_at_idx";

-- DropIndex
DROP INDEX "surgical_procedure_options_category_idx";

-- DropIndex
DROP INDEX "surgical_procedure_options_name_key";

-- AlterTable
ALTER TABLE "CalendarEvent" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "quantity_on_hand";

-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "po_number" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "ordered_by_user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "item_name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "unit_price" DROP DEFAULT,
ALTER COLUMN "line_total" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SurgicalBillingEstimate" ALTER COLUMN "surgeon_fee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "anaesthesiologist_fee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "theatre_fee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SurgicalBillingLineItem" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "total_price" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SurgicalCaseItem" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SurgicalCaseTeamMember" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "tax_id" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "procedure_category_config" DROP CONSTRAINT "procedure_category_config_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "code" SET DATA TYPE TEXT,
ALTER COLUMN "display_order" SET NOT NULL,
ALTER COLUMN "is_active" SET NOT NULL,
ALTER COLUMN "color_code" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ADD CONSTRAINT "procedure_category_config_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "procedure_service_link" DROP CONSTRAINT "procedure_service_link_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "procedure_id" SET DATA TYPE TEXT,
ALTER COLUMN "is_primary" SET NOT NULL,
ADD CONSTRAINT "procedure_service_link_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "procedure_subcategory" DROP CONSTRAINT "procedure_subcategory_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "category_id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "display_order" SET NOT NULL,
ALTER COLUMN "is_active" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ADD CONSTRAINT "procedure_subcategory_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "surgical_procedure_options" DROP CONSTRAINT "surgical_procedure_options_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "subcategory" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "is_billable" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "created_by" SET DATA TYPE TEXT,
ADD CONSTRAINT "surgical_procedure_options_pkey" PRIMARY KEY ("id");

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

-- CreateTable
CREATE TABLE "surgical_case_procedures" (
    "id" TEXT NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "procedure_id" TEXT NOT NULL,

    CONSTRAINT "surgical_case_procedures_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "LoginAttempt_ip_address_attempt_at_idx" ON "LoginAttempt"("ip_address", "attempt_at");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_attempt_at_idx" ON "LoginAttempt"("email", "attempt_at");

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
CREATE UNIQUE INDEX "surgical_case_procedures_surgical_case_id_procedure_id_key" ON "surgical_case_procedures"("surgical_case_id", "procedure_id");

-- CreateIndex
CREATE INDEX "PatientQueue_doctor_id_status_added_at_idx" ON "PatientQueue"("doctor_id", "status", "added_at");

-- CreateIndex
CREATE INDEX "PatientQueue_status_added_at_idx" ON "PatientQueue"("status", "added_at");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_charge_sheet_no_key" ON "Payment"("charge_sheet_no");

-- CreateIndex
CREATE INDEX "PurchaseOrder_created_by_user_id_idx" ON "PurchaseOrder"("ordered_by_user_id");

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
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_created_by_user_id_fkey" FOREIGN KEY ("ordered_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_service_link" ADD CONSTRAINT "procedure_service_link_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "surgical_procedure_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_service_link" ADD CONSTRAINT "procedure_service_link_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_case_procedures" ADD CONSTRAINT "surgical_case_procedures_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "surgical_procedure_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_case_procedures" ADD CONSTRAINT "surgical_case_procedures_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCaseTeamMember" ADD CONSTRAINT "SurgicalCaseTeamMember_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_vendor_kra_pin" RENAME TO "Vendor_kra_pin_idx";
