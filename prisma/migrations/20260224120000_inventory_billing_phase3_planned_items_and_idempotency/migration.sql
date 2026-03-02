-- CreateTable
CREATE TABLE "CasePlanPlannedItem" (
    "id" SERIAL NOT NULL,
    "case_plan_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER,
    "service_id" INTEGER,
    "planned_quantity" DOUBLE PRECISION NOT NULL,
    "planned_unit_price" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "planned_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasePlanPlannedItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "InventoryUsage" ADD COLUMN     "external_ref" TEXT,
ADD COLUMN     "source_form_key" TEXT,
ADD COLUMN     "used_at" TIMESTAMP(3),
ADD COLUMN     "used_by_user_id" TEXT;

-- CreateIndex
CREATE INDEX "CasePlanPlannedItem_case_plan_id_idx" ON "CasePlanPlannedItem"("case_plan_id");

-- CreateIndex
CREATE INDEX "CasePlanPlannedItem_inventory_item_id_idx" ON "CasePlanPlannedItem"("inventory_item_id");

-- CreateIndex
CREATE INDEX "CasePlanPlannedItem_service_id_idx" ON "CasePlanPlannedItem"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "CasePlanPlannedItem_case_plan_id_inventory_item_id_key" ON "CasePlanPlannedItem"("case_plan_id", "inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "CasePlanPlannedItem_case_plan_id_service_id_key" ON "CasePlanPlannedItem"("case_plan_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUsage_external_ref_key" ON "InventoryUsage"("external_ref");

-- CreateIndex
CREATE INDEX "InventoryUsage_surgical_case_id_inventory_item_id_used_at_idx" ON "InventoryUsage"("surgical_case_id", "inventory_item_id", "used_at");

-- CreateIndex
CREATE INDEX "InventoryUsage_source_form_key_used_at_idx" ON "InventoryUsage"("source_form_key", "used_at");

-- CreateIndex
CREATE INDEX "InventoryUsage_used_by_user_id_used_at_idx" ON "InventoryUsage"("used_by_user_id", "used_at");

-- CreateIndex
CREATE INDEX "PatientBill_payment_id_service_id_idx" ON "PatientBill"("payment_id", "service_id");

-- AddForeignKey
ALTER TABLE "CasePlanPlannedItem" ADD CONSTRAINT "CasePlanPlannedItem_case_plan_id_fkey" FOREIGN KEY ("case_plan_id") REFERENCES "CasePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlanPlannedItem" ADD CONSTRAINT "CasePlanPlannedItem_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlanPlannedItem" ADD CONSTRAINT "CasePlanPlannedItem_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
