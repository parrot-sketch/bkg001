-- AlterTable: Add inventory_batch_id column (nullable, no FK constraint yet)
ALTER TABLE "InventoryUsage" ADD COLUMN IF NOT EXISTS "inventory_batch_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryUsage_inventory_batch_id_idx" ON "InventoryUsage"("inventory_batch_id");

-- AddForeignKey: Only add FK if InventoryBatch table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'InventoryBatch'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'InventoryUsage_inventory_batch_id_fkey'
    ) THEN
      ALTER TABLE "InventoryUsage" 
      ADD CONSTRAINT "InventoryUsage_inventory_batch_id_fkey" 
      FOREIGN KEY ("inventory_batch_id") 
      REFERENCES "InventoryBatch"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
