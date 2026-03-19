-- Add READY_FOR_THEATER_PREP status to SurgicalCaseStatus enum
ALTER TYPE "SurgicalCaseStatus" ADD VALUE 'READY_FOR_THEATER_PREP';

-- Create SurgicalCaseTeamMember table
CREATE TABLE IF NOT EXISTS "SurgicalCaseTeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "surgical_case_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SurgicalCaseTeamMember_surgical_case_id_idx" ON "SurgicalCaseTeamMember"("surgical_case_id");
