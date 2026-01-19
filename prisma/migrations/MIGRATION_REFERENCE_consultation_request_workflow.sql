-- Migration Reference: Consultation Request Workflow Fields
-- 
-- This is a REFERENCE migration file showing the SQL changes needed.
-- To apply these changes, run: `npx prisma migrate dev --name add_consultation_request_workflow`
--
-- Date: Current
-- Purpose: Add consultation request workflow status tracking to Appointment model

-- CreateEnum: ConsultationRequestStatus
CREATE TYPE "ConsultationRequestStatus" AS ENUM (
  'SUBMITTED',
  'PENDING_REVIEW',
  'NEEDS_MORE_INFO',
  'APPROVED',
  'SCHEDULED',
  'CONFIRMED'
);

-- AlterTable: Add consultation request workflow fields to Appointment
-- All fields are nullable for backward compatibility with existing appointments
ALTER TABLE "Appointment" 
  ADD COLUMN "consultation_request_status" "ConsultationRequestStatus",
  ADD COLUMN "reviewed_by" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "review_notes" TEXT;

-- CreateIndex: Add indexes for consultation request workflow queries
CREATE INDEX "Appointment_consultation_request_status_idx" ON "Appointment"("consultation_request_status");
CREATE INDEX "Appointment_reviewed_by_idx" ON "Appointment"("reviewed_by");

-- Backfill: Set consultation_request_status = 'APPROVED' for existing appointments
-- This ensures existing appointments are treated as already approved
-- (maintains backward compatibility)
UPDATE "Appointment" 
SET "consultation_request_status" = 'APPROVED'::"ConsultationRequestStatus"
WHERE "consultation_request_status" IS NULL 
  AND "status" IN ('PENDING', 'SCHEDULED');

-- Note: Existing appointments with status = 'COMPLETED' or 'CANCELLED' 
-- will have consultation_request_status = NULL (which is fine - they're final states)
