-- CreateEnum
CREATE TYPE "ChecklistPhase" AS ENUM ('SIGN_IN', 'TIME_OUT', 'SIGN_OUT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "AppointmentStatus" ADD VALUE 'READY_FOR_CONSULTATION';
ALTER TYPE "AppointmentStatus" ADD VALUE 'IN_CONSULTATION';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'THEATER_TECHNICIAN';

-- CreateTable
CREATE TABLE "SurgicalChecklist" (
    "id" TEXT NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "sign_in_completed_at" TIMESTAMP(3),
    "sign_in_by_user_id" TEXT,
    "sign_in_by_role" TEXT,
    "sign_in_items" TEXT,
    "time_out_completed_at" TIMESTAMP(3),
    "time_out_by_user_id" TEXT,
    "time_out_by_role" TEXT,
    "time_out_items" TEXT,
    "sign_out_completed_at" TIMESTAMP(3),
    "sign_out_by_user_id" TEXT,
    "sign_out_by_role" TEXT,
    "sign_out_items" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAuditEvent" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalChecklist_surgical_case_id_key" ON "SurgicalChecklist"("surgical_case_id");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_surgical_case_id_idx" ON "SurgicalChecklist"("surgical_case_id");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_sign_in_completed_at_idx" ON "SurgicalChecklist"("sign_in_completed_at");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_time_out_completed_at_idx" ON "SurgicalChecklist"("time_out_completed_at");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_sign_out_completed_at_idx" ON "SurgicalChecklist"("sign_out_completed_at");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_actor_user_id_idx" ON "ClinicalAuditEvent"("actor_user_id");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_entity_type_entity_id_idx" ON "ClinicalAuditEvent"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_action_type_idx" ON "ClinicalAuditEvent"("action_type");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_created_at_idx" ON "ClinicalAuditEvent"("created_at");

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_sign_in_by_user_id_fkey" FOREIGN KEY ("sign_in_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_time_out_by_user_id_fkey" FOREIGN KEY ("time_out_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_sign_out_by_user_id_fkey" FOREIGN KEY ("sign_out_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuditEvent" ADD CONSTRAINT "ClinicalAuditEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
