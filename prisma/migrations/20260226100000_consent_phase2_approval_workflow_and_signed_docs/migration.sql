-- CreateEnum
CREATE TYPE "ConsentDocumentType" AS ENUM ('SIGNED_PDF', 'GENERATED_PDF');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockAdjustmentType" AS ENUM ('INCREMENT', 'DECREMENT');

-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('DAMAGED', 'EXPIRED', 'LOST', 'THEFT', 'COUNT_CORRECTION', 'RETURN_TO_VENDOR', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SUBMITTED_FOR_APPROVAL';
ALTER TYPE "AuditAction" ADD VALUE 'APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'PDF_REPLACED';
ALTER TYPE "AuditAction" ADD VALUE 'SIGNED_UPLOADED';

-- AlterEnum
ALTER TYPE "ClinicalFormStatus" ADD VALUE 'AMENDMENT';

-- AlterTable
ALTER TABLE "ConsentForm" ADD COLUMN     "template_id" TEXT;

-- AlterTable
ALTER TABLE "ConsentTemplate" ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_user_id" TEXT,
ADD COLUMN     "checksum_sha256" TEXT,
ADD COLUMN     "latest_pdf_filename" TEXT,
ADD COLUMN     "locked_version_number" INTEGER;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "is_implant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturer" TEXT;

-- CreateTable
CREATE TABLE "InventoryBatch" (
    "id" TEXT NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "batch_number" TEXT NOT NULL,
    "serial_number" TEXT,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "quantity_remaining" INTEGER NOT NULL DEFAULT 1,
    "cost_per_unit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "goods_receipt_id" TEXT,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "payment_terms" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by_user_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "inventory_item_id" INTEGER,
    "item_name" TEXT NOT NULL,
    "quantity_ordered" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "total_price" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "quantity_received" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "received_by_user_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "id" SERIAL NOT NULL,
    "goods_receipt_id" TEXT NOT NULL,
    "po_item_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER,
    "quantity_received" INTEGER NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "batch_number" TEXT,
    "expiry_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" SERIAL NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "adjustment_type" "StockAdjustmentType" NOT NULL,
    "adjustment_reason" "StockAdjustmentReason" NOT NULL,
    "quantity_change" INTEGER NOT NULL,
    "previous_quantity" INTEGER NOT NULL,
    "new_quantity" INTEGER NOT NULL,
    "adjusted_by_user_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentFormDocument" (
    "id" TEXT NOT NULL,
    "consent_form_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "checksum_sha256" TEXT,
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "document_type" "ConsentDocumentType" NOT NULL DEFAULT 'SIGNED_PDF',
    "version" INTEGER NOT NULL DEFAULT 1,
    "file_size" INTEGER,
    "file_name" TEXT,

    CONSTRAINT "ConsentFormDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentTemplateRelease" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "released_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_by_user_id" TEXT NOT NULL,
    "release_notes" TEXT,

    CONSTRAINT "ConsentTemplateRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBatch_goods_receipt_id_key" ON "InventoryBatch"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "InventoryBatch_inventory_item_id_idx" ON "InventoryBatch"("inventory_item_id");

-- CreateIndex
CREATE INDEX "InventoryBatch_batch_number_idx" ON "InventoryBatch"("batch_number");

-- CreateIndex
CREATE INDEX "InventoryBatch_serial_number_idx" ON "InventoryBatch"("serial_number");

-- CreateIndex
CREATE INDEX "InventoryBatch_expiry_date_idx" ON "InventoryBatch"("expiry_date");

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Vendor_is_active_idx" ON "Vendor"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_po_number_key" ON "PurchaseOrder"("po_number");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendor_id_idx" ON "PurchaseOrder"("vendor_id");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_po_number_idx" ON "PurchaseOrder"("po_number");

-- CreateIndex
CREATE INDEX "PurchaseOrder_created_at_idx" ON "PurchaseOrder"("created_at");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchase_order_id_idx" ON "PurchaseOrderItem"("purchase_order_id");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_inventory_item_id_idx" ON "PurchaseOrderItem"("inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_receipt_number_key" ON "GoodsReceipt"("receipt_number");

-- CreateIndex
CREATE INDEX "GoodsReceipt_purchase_order_id_idx" ON "GoodsReceipt"("purchase_order_id");

-- CreateIndex
CREATE INDEX "GoodsReceipt_receipt_number_idx" ON "GoodsReceipt"("receipt_number");

-- CreateIndex
CREATE INDEX "GoodsReceipt_received_at_idx" ON "GoodsReceipt"("received_at");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_goods_receipt_id_idx" ON "GoodsReceiptItem"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_po_item_id_idx" ON "GoodsReceiptItem"("po_item_id");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_inventory_item_id_idx" ON "GoodsReceiptItem"("inventory_item_id");

-- CreateIndex
CREATE INDEX "StockAdjustment_inventory_item_id_idx" ON "StockAdjustment"("inventory_item_id");

-- CreateIndex
CREATE INDEX "StockAdjustment_adjusted_by_user_id_idx" ON "StockAdjustment"("adjusted_by_user_id");

-- CreateIndex
CREATE INDEX "StockAdjustment_created_at_idx" ON "StockAdjustment"("created_at");

-- CreateIndex
CREATE INDEX "StockAdjustment_adjustment_type_idx" ON "StockAdjustment"("adjustment_type");

-- CreateIndex
CREATE INDEX "ConsentFormDocument_consent_form_id_idx" ON "ConsentFormDocument"("consent_form_id");

-- CreateIndex
CREATE INDEX "ConsentFormDocument_uploaded_at_idx" ON "ConsentFormDocument"("uploaded_at");

-- CreateIndex
CREATE INDEX "ConsentFormDocument_document_type_idx" ON "ConsentFormDocument"("document_type");

-- CreateIndex
CREATE INDEX "ConsentTemplateRelease_template_id_idx" ON "ConsentTemplateRelease"("template_id");

-- CreateIndex
CREATE INDEX "ConsentTemplateRelease_released_at_idx" ON "ConsentTemplateRelease"("released_at");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTemplateRelease_template_id_version_number_key" ON "ConsentTemplateRelease"("template_id", "version_number");

-- CreateIndex
CREATE INDEX "ConsentForm_template_id_idx" ON "ConsentForm"("template_id");

-- Special handling for indices that might have been partially created or created with different properties in previous migrations
DROP INDEX IF EXISTS "InventoryUsage_surgical_medication_record_id_key";
DROP INDEX IF EXISTS "SurgicalStaff_procedure_record_id_user_id_role_key";

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUsage_surgical_medication_record_id_key" ON "InventoryUsage"("surgical_medication_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalStaff_procedure_record_id_user_id_role_key" ON "SurgicalStaff"("procedure_record_id", "user_id", "role");

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "GoodsReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_received_by_user_id_fkey" FOREIGN KEY ("received_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_po_item_id_fkey" FOREIGN KEY ("po_item_id") REFERENCES "PurchaseOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_adjusted_by_user_id_fkey" FOREIGN KEY ("adjusted_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_inventory_batch_id_fkey" FOREIGN KEY ("inventory_batch_id") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ConsentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentFormDocument" ADD CONSTRAINT "ConsentFormDocument_consent_form_id_fkey" FOREIGN KEY ("consent_form_id") REFERENCES "ConsentForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentFormDocument" ADD CONSTRAINT "ConsentFormDocument_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateRelease" ADD CONSTRAINT "ConsentTemplateRelease_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ConsentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateRelease" ADD CONSTRAINT "ConsentTemplateRelease_released_by_user_id_fkey" FOREIGN KEY ("released_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

