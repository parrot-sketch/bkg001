-- Clear test data script
-- Keeps: Patients, Inventory, Doctors, Services, Users
-- Clears: All operational/test data

-- Disable foreign key constraints temporarily
SET CONSTRAINTS ALL DEFERRED;

-- Clear surgical-related data first (in order due to foreign keys)
DELETE FROM "SurgicalCaseProcedure";
DELETE FROM "SurgicalCaseItem";
DELETE FROM "SurgicalMedicationRecord";
DELETE FROM "SurgicalBillingLineItem";
DELETE FROM "SurgicalBillingEstimate";
DELETE FROM "SurgicalCaseTeamMember";
DELETE FROM "SurgicalChecklist";
DELETE FROM "SurgicalProcedureRecord";
DELETE FROM "SurgicalStaff";
DELETE FROM "StaffInvite";
DELETE FROM "TheaterBooking";
DELETE FROM "CalendarEvent";
DELETE FROM "SurgicalCase";

-- Clear case plans
DELETE FROM "CasePlanPlannedItem";
DELETE FROM "CasePlan";

-- Clear consultations
DELETE FROM "ConsultationMessage";
DELETE FROM "ConsultationAttachment";
DELETE FROM "DoctorConsultation";
DELETE FROM "Consultation";

-- Clear patient queue
DELETE FROM "PatientQueue";

-- Clear appointments
DELETE FROM "Appointment";

-- Clear payments and bills
DELETE FROM "PatientBill";
DELETE FROM "Payment";

-- Clear clinical records
DELETE FROM "ClinicalFormResponse";
DELETE FROM "ClinicalNote";
DELETE FROM "ClinicalTask";
DELETE FROM "CareNote";
DELETE FROM "VitalSign";
DELETE FROM "Diagnosis";
DELETE FROM "LabTest";
DELETE FROM "MedicalRecord";
DELETE FROM "NurseAssignment";

-- Clear surgical outcomes
DELETE FROM "SurgicalOutcome";

-- Clear consent forms
DELETE FROM "ConsentFormDocument";
DELETE FROM "ConsentSigningSession";
DELETE FROM "ConsentForm";

-- Clear patient images
DELETE FROM "PatientImage";

-- Clear ratings
DELETE FROM "Rating";

-- Clear notifications
DELETE FROM "Notification";

-- Clear audit logs (optional - keep these for debugging)
-- DELETE FROM "AuditLog";
-- DELETE FROM "ClinicalAuditEvent";
-- DELETE FROM "InventoryAuditEvent";

-- Clear intake sessions (test signups)
DELETE FROM "IntakeSubmission";
DELETE FROM "IntakeSession";

-- Clear outbox events
DELETE FROM "OutboxEvent";

-- Clear doctor invites (unused)
DELETE FROM "DoctorInviteToken";

-- Clear refresh tokens ( logout sessions)
DELETE FROM "RefreshToken";

-- Clear login attempts (optional - keep for security)
-- DELETE FROM "LoginAttempt";

-- Clear doctor patient assignments (keep doctor-patient relationships)
-- DELETE FROM "DoctorPatientAssignment";

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;

-- Verify counts
SELECT 'Patients' as table_name, count(*) as count FROM "Patient"
UNION ALL
SELECT 'InventoryItem', count(*) FROM "InventoryItem"
UNION ALL
SELECT 'Doctor', count(*) FROM "Doctor"
UNION ALL
SELECT 'Service', count(*) FROM "Service"
UNION ALL
SELECT 'User', count(*) FROM "User"
UNION ALL
SELECT 'Appointment', count(*) FROM "Appointment"
UNION ALL
SELECT 'SurgicalCase', count(*) FROM "SurgicalCase"
UNION ALL
SELECT 'Payment', count(*) FROM "Payment"
UNION ALL
SELECT 'Consultation', count(*) FROM "Consultation";