-- Migration: Add inventory_item_id to PatientBill table
-- This enables billing for both services and inventory items

BEGIN;

-- Add inventory_item_id column (nullable for backward compatibility)
ALTER TABLE "PatientBill" ADD COLUMN IF NOT EXISTS "inventory_item_id" INTEGER;

-- Add foreign key constraint
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_inventory_item_id_fkey" 
    FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem" (id) ON DELETE CASCADE;

-- Make service_id nullable (allows inventory-only bills)
ALTER TABLE "PatientBill" ALTER COLUMN "service_id" DROP NOT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS "PatientBill_inventory_item_id_idx" ON "PatientBill" ("inventory_item_id");

COMMIT;