-- Billing & Inventory Schema Enhancement
-- This migration:
-- 1. Adds BillType, PriceType, InventoryCategory enums
-- 2. Decouples Payment from Appointment (nullable appointment_id, adds surgical_case_id)
-- 3. Enhances Service model with price_type, min_price, max_price
-- 4. Creates InventoryItem and InventoryUsage models
-- 5. Adds inventory_usage relation to PatientBill

-- ============================================================================
-- STEP 1: Create new enums
-- ============================================================================

CREATE TYPE "BillType" AS ENUM ('CONSULTATION', 'SURGERY', 'LAB_TEST', 'FOLLOW_UP', 'OTHER');
CREATE TYPE "PriceType" AS ENUM ('FIXED', 'VARIABLE', 'PER_UNIT', 'QUOTE_REQUIRED');
CREATE TYPE "InventoryCategory" AS ENUM ('IMPLANT', 'SUTURE', 'ANESTHETIC', 'MEDICATION', 'DISPOSABLE', 'INSTRUMENT', 'DRESSING', 'OTHER');

-- ============================================================================
-- STEP 2: Modify Payment table
-- ============================================================================

-- Make appointment_id nullable (existing data keeps its values, new surgery payments can omit it)
ALTER TABLE "Payment" ALTER COLUMN "appointment_id" DROP NOT NULL;

-- Add new columns
ALTER TABLE "Payment" ADD COLUMN "surgical_case_id" TEXT;
ALTER TABLE "Payment" ADD COLUMN "bill_type" "BillType" NOT NULL DEFAULT 'CONSULTATION';
ALTER TABLE "Payment" ADD COLUMN "notes" TEXT;

-- Add unique constraint for surgical_case_id (allows multiple NULLs in PostgreSQL)
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_surgical_case_id_key" UNIQUE ("surgical_case_id");

-- Add foreign key to SurgicalCase
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_surgical_case_id_fkey"
  FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "Payment_surgical_case_id_idx" ON "Payment"("surgical_case_id");
CREATE INDEX "Payment_bill_type_idx" ON "Payment"("bill_type");

-- ============================================================================
-- STEP 3: Enhance Service table
-- ============================================================================

ALTER TABLE "Service" ADD COLUMN "price_type" "PriceType" NOT NULL DEFAULT 'FIXED';
ALTER TABLE "Service" ADD COLUMN "min_price" DOUBLE PRECISION;
ALTER TABLE "Service" ADD COLUMN "max_price" DOUBLE PRECISION;

CREATE INDEX "Service_price_type_idx" ON "Service"("price_type");

-- ============================================================================
-- STEP 4: Create InventoryItem table
-- ============================================================================

CREATE TABLE "InventoryItem" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "category" "InventoryCategory" NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "unit_of_measure" TEXT NOT NULL DEFAULT 'unit',
  "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
  "reorder_point" INTEGER NOT NULL DEFAULT 0,
  "supplier" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_billable" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- Unique constraint for SKU
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_sku_key" UNIQUE ("sku");

-- Indexes
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");
CREATE INDEX "InventoryItem_sku_idx" ON "InventoryItem"("sku");
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");
CREATE INDEX "InventoryItem_is_active_idx" ON "InventoryItem"("is_active");
CREATE INDEX "InventoryItem_quantity_on_hand_idx" ON "InventoryItem"("quantity_on_hand");

-- ============================================================================
-- STEP 5: Create InventoryUsage table
-- ============================================================================

CREATE TABLE "InventoryUsage" (
  "id" SERIAL NOT NULL,
  "inventory_item_id" INTEGER NOT NULL,
  "surgical_case_id" TEXT,
  "appointment_id" INTEGER,
  "quantity_used" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unit_cost_at_time" DOUBLE PRECISION NOT NULL,
  "total_cost" DOUBLE PRECISION NOT NULL,
  "recorded_by" TEXT NOT NULL,
  "notes" TEXT,
  "bill_item_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
);

-- Unique constraint for bill_item_id
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_bill_item_id_key" UNIQUE ("bill_item_id");

-- Foreign keys
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_surgical_case_id_fkey"
  FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_bill_item_id_fkey"
  FOREIGN KEY ("bill_item_id") REFERENCES "PatientBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "InventoryUsage_inventory_item_id_idx" ON "InventoryUsage"("inventory_item_id");
CREATE INDEX "InventoryUsage_surgical_case_id_idx" ON "InventoryUsage"("surgical_case_id");
CREATE INDEX "InventoryUsage_appointment_id_idx" ON "InventoryUsage"("appointment_id");
CREATE INDEX "InventoryUsage_recorded_by_idx" ON "InventoryUsage"("recorded_by");
CREATE INDEX "InventoryUsage_created_at_idx" ON "InventoryUsage"("created_at");
