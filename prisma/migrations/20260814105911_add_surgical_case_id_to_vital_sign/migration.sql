-- AlterTable
ALTER TABLE "VitalSign" ADD COLUMN     "surgical_case_id" TEXT;

-- CreateIndex
CREATE INDEX "VitalSign_surgical_case_id_idx" ON "VitalSign"("surgical_case_id");

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
