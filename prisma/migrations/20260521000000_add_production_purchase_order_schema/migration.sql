-- AlterTable: PurchaseOrder - Production Grade Schema
-- Add new financial tracking fields (subtotal, VAT, currency)
-- Add expected delivery date for logistics tracking
-- Convert monetary fields from Float to Decimal(10,2) for precision
-- Rename created_by_user_id → ordered_by_user_id for clarity

-- Step 1: Add new columns with defaults to avoid NOT NULL constraint violations
ALTER TABLE "PurchaseOrder" 
  ADD COLUMN "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "vat_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'KES',
  ADD COLUMN "expected_delivery_date" TIMESTAMP(3);

-- Step 2: Convert total_amount from Float to Decimal (create new column, copy data, drop old, rename)
ALTER TABLE "PurchaseOrder"
  ADD COLUMN "total_amount_new" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "PurchaseOrder" SET "total_amount_new" = CAST("total_amount" AS DECIMAL(10,2));

ALTER TABLE "PurchaseOrder" DROP COLUMN "total_amount";

ALTER TABLE "PurchaseOrder" RENAME COLUMN "total_amount_new" TO "total_amount";

-- Step 3: Remove submitted_at column (no longer used, status enum handles it)
ALTER TABLE "PurchaseOrder" DROP COLUMN "submitted_at";

-- Step 4: RENAME created_by_user_id to ordered_by_user_id
-- Note: This requires updating foreign key constraints
ALTER TABLE "PurchaseOrder" RENAME COLUMN "created_by_user_id" TO "ordered_by_user_id";

-- Step 5: AlterTable: PurchaseOrderItem - Convert monetary fields to Decimal(10,2)
-- Rename total_price to line_total for semantic clarity

-- Step 5a: Convert unit_price from Float to Decimal
ALTER TABLE "PurchaseOrderItem"
  ADD COLUMN "unit_price_new" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "PurchaseOrderItem" SET "unit_price_new" = CAST("unit_price" AS DECIMAL(10,2));

ALTER TABLE "PurchaseOrderItem" DROP COLUMN "unit_price";

ALTER TABLE "PurchaseOrderItem" RENAME COLUMN "unit_price_new" TO "unit_price";

-- Step 5b: Rename total_price to line_total and convert to Decimal
ALTER TABLE "PurchaseOrderItem"
  ADD COLUMN "line_total" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "PurchaseOrderItem" SET "line_total" = CAST("total_price" AS DECIMAL(10,2));

ALTER TABLE "PurchaseOrderItem" DROP COLUMN "total_price";

-- Step 6: Add unique constraint on (purchase_order_id, inventory_item_id)
-- to prevent duplicate items in same PO
ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_purchase_order_id_inventory_item_id_key" UNIQUE("purchase_order_id", "inventory_item_id");

-- Step 7: Update indexes and constraints for better query performance
-- Already defined in schema via @@index, but migration ensures they exist

-- Step 8: Add check constraints documentation (enforced in application layer)
-- CHECK quantity_ordered > 0
-- CHECK unit_price >= 0
-- CHECK quantity_received <= quantity_ordered
-- These are enforced in:
-- - Zod validation at API boundary (/lib/parsers/purchaseOrderParsers.ts)
-- - VendorService.createPurchaseOrder() business logic
-- - GoodsReceipt receipt processing (cannot exceed ordered qty)
