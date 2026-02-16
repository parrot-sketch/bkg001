-- AlterTable
ALTER TABLE "SurgicalProcedureRecord" ADD COLUMN     "anesthesiologist_snapshot_id" TEXT,
ADD COLUMN     "assistant_surgeon_snapshot_ids" TEXT,
ADD COLUMN     "primary_surgeon_snapshot_id" TEXT;
