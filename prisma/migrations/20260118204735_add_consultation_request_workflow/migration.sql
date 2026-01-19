-- CreateEnum
CREATE TYPE "ConsultationRequestStatus" AS ENUM ('SUBMITTED', 'PENDING_REVIEW', 'NEEDS_MORE_INFO', 'APPROVED', 'SCHEDULED', 'CONFIRMED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "consultation_request_status" "ConsultationRequestStatus",
ADD COLUMN     "review_notes" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_consultation_request_status_idx" ON "Appointment"("consultation_request_status");

-- CreateIndex
CREATE INDEX "Appointment_reviewed_by_idx" ON "Appointment"("reviewed_by");
