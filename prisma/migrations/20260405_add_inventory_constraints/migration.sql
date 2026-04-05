-- AlterTable
ALTER TABLE "InventoryItem" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255);
ALTER TABLE "InventoryItem" ALTER COLUMN "sku" SET DATA TYPE VARCHAR(255);
ALTER TABLE "InventoryItem" ALTER COLUMN "unit_of_measure" SET DATA TYPE VARCHAR(255);
ALTER TABLE "InventoryItem" ALTER COLUMN "unit_cost" SET DATA TYPE DECIMAL(10,2);

-- Add check constraint for unit_cost
ALTER TABLE "InventoryItem" ADD CONSTRAINT "chk_unit_cost_non_negative" CHECK ("unit_cost" >= 0);

-- Add check constraint for InventoryBatch quantity_remaining
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "chk_quantity_remaining_non_negative" CHECK ("quantity_remaining" >= 0);

-- Add check constraint for InventoryTransaction quantity
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "chk_quantity_positive" CHECK ("quantity" > 0);
