-- CreateTable
CREATE TABLE "InventoryAuditEvent" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "external_ref" TEXT,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryAuditEvent_actor_user_id_created_at_idx" ON "InventoryAuditEvent"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "InventoryAuditEvent_entity_type_entity_id_idx" ON "InventoryAuditEvent"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "InventoryAuditEvent_event_type_created_at_idx" ON "InventoryAuditEvent"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "InventoryAuditEvent_external_ref_idx" ON "InventoryAuditEvent"("external_ref");

-- AddForeignKey
ALTER TABLE "InventoryAuditEvent" ADD CONSTRAINT "InventoryAuditEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
