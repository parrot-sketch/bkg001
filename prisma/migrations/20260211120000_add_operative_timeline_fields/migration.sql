-- Add operative timeline timestamp fields to SurgicalProcedureRecord
ALTER TABLE "SurgicalProcedureRecord" ADD COLUMN "wheels_in" TIMESTAMP(3);
ALTER TABLE "SurgicalProcedureRecord" ADD COLUMN "anesthesia_end" TIMESTAMP(3);

-- Composite index for timeline queries
CREATE INDEX "SurgicalProcedureRecord_surgical_case_id_wheels_in_idx" ON "SurgicalProcedureRecord"("surgical_case_id", "wheels_in");
