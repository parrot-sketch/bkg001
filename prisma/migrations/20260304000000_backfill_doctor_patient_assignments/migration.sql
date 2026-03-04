-- Backfill DoctorPatientAssignment from existing Appointments
-- This creates assignment records for all unique doctor-patient pairs that have appointments

INSERT INTO "DoctorPatientAssignment" (
  "id",
  "doctor_id", 
  "patient_id",
  "status",
  "assigned_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid() as id,
  a."doctor_id",
  a."patient_id", 
  'ACTIVE'::"DoctorPatientAssignmentStatus" as status,
  MIN(a."appointment_date") as assigned_at,
  NOW() as created_at,
  NOW() as updated_at
FROM "Appointment" a
WHERE a."doctor_id" IS NOT NULL
  AND a."patient_id" IS NOT NULL
GROUP BY a."doctor_id", a."patient_id"
ON CONFLICT ("doctor_id", "patient_id") DO NOTHING;

-- Create index for query performance (query: find all active patients for doctor)
CREATE INDEX IF NOT EXISTS idx_doctor_patient_assignment_active 
ON "DoctorPatientAssignment"("doctor_id", "status") 
WHERE "status" = 'ACTIVE';
