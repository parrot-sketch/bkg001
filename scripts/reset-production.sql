-- =============================================================
-- PRODUCTION DATA RESET
--
-- Keeps: Patients, Staff (including 5 doctors), Inventory,
--        Services/Procedures, Availability, Theaters, Vendors
-- Clears: Appointments, Consultations, Surgical Cases,
--         Queue, Payments, Notifications, Audit Logs
-- =============================================================

BEGIN;

-- ── 1. Clear clinical form responses ─────────────────────────
DELETE FROM "ClinicalFormResponse";

-- ── 2. Clear clinical tasks ──────────────────────────────────
DELETE FROM "ClinicalTask";

-- ── 3. Clear clinical audit events ───────────────────────────
DELETE FROM "ClinicalAuditEvent";

-- ── 4. Clear audit logs ──────────────────────────────────────
DELETE FROM "AuditLog";

-- ── 5. Clear notifications ───────────────────────────────────
DELETE FROM "Notification";

-- ── 6. Clear outbox events ───────────────────────────────────
DELETE FROM "OutboxEvent";

-- ── 7. Clear consultation messages/attachments ───────────────
DELETE FROM "ConsultationMessage";
DELETE FROM "ConsultationAttachment";

-- ── 8. Clear patient queue ───────────────────────────────────
DELETE FROM "PatientQueue";

-- ── 9. Clear care notes ──────────────────────────────────────
DELETE FROM "CareNote";

-- ── 10. Clear clinical notes ─────────────────────────────────
DELETE FROM "ClinicalNote";

-- ── 11. Clear diagnoses ──────────────────────────────────────
DELETE FROM "Diagnosis";

-- ── 12. Clear medical records ────────────────────────────────
DELETE FROM "MedicalRecord";

-- ── 13. Clear vital signs ────────────────────────────────────
DELETE FROM "VitalSign";

-- ── 14. Clear patient images ─────────────────────────────────
DELETE FROM "PatientImage";

-- ── 15. Clear payments ───────────────────────────────────────
DELETE FROM "Payment";

-- ── 16. Clear patient bills ──────────────────────────────────
DELETE FROM "PatientBill";

-- ── 17. Clear lab tests ──────────────────────────────────────
DELETE FROM "LabTest";

-- ── 18. Clear inventory transactions/usage ───────────────────
DELETE FROM "InventoryTransaction";
DELETE FROM "InventoryUsage";
DELETE FROM "StockAdjustment";

-- ── 19. Clear goods receipts ─────────────────────────────────
DELETE FROM "GoodsReceiptItem";
DELETE FROM "GoodsReceipt";

-- ── 20. Clear purchase orders ────────────────────────────────
DELETE FROM "PurchaseOrderItem";
DELETE FROM "PurchaseOrder";

-- ── 21. Clear consent forms ──────────────────────────────────
DELETE FROM "ConsentSigningSession";
DELETE FROM "ConsentFormDocument";
DELETE FROM "ConsentForm";

-- ── 22. Clear consent templates ──────────────────────────────
DELETE FROM "ConsentTemplateAudit";
DELETE FROM "ConsentTemplateRelease";
DELETE FROM "ConsentTemplateVersion";

-- ── 23. Clear case plan planned items ────────────────────────
DELETE FROM "CasePlanPlannedItem";

-- ── 24. Clear surgical case related ──────────────────────────
DELETE FROM "SurgicalMedicationRecord";
DELETE FROM "SurgicalOutcome";
DELETE FROM "SurgicalBillingLineItem";
DELETE FROM "SurgicalBillingEstimate";
DELETE FROM "SurgicalChecklist";
DELETE FROM "SurgicalCaseItem";
DELETE FROM "SurgicalCaseTeamMember";
DELETE FROM "SurgicalStaff";
DELETE FROM "SurgicalProcedureRecord";

-- ── 25. Clear theater bookings ───────────────────────────────
DELETE FROM "TheaterBooking";

-- ── 26. Clear surgical cases ─────────────────────────────────
DELETE FROM "SurgicalCase";

-- ── 27. Clear case plans ─────────────────────────────────────
DELETE FROM "CasePlan";

-- ── 28. Clear consultations ──────────────────────────────────
DELETE FROM "DoctorConsultation";
DELETE FROM "Consultation";

-- ── 29. Clear doctor patient assignments ─────────────────────
DELETE FROM "DoctorPatientAssignment";

-- ── 30. Clear appointments ───────────────────────────────────
DELETE FROM "Appointment";

-- ── 31. Clear nurse assignments ──────────────────────────────
DELETE FROM "NurseAssignment";

-- ── 32. Clear invite tokens and staff invites ─────────────────
DELETE FROM "DoctorInviteToken";
DELETE FROM "StaffInvite";

-- ── 33. Clear ratings ────────────────────────────────────────
DELETE FROM "Rating";

-- ── 34. Clear calendar events ────────────────────────────────
DELETE FROM "CalendarEvent";

-- ── 35. Clear schedule blocks and overrides ──────────────────
DELETE FROM "ScheduleBlock";
DELETE FROM "AvailabilityOverride";

-- ── 36. Clear refresh tokens ─────────────────────────────────
DELETE FROM "RefreshToken";

-- ── 37. Clear intake sessions/submissions ────────────────────
DELETE FROM "intake_submission";
DELETE FROM "intake_session";

-- ── 38. Clear inventory audit events ─────────────────────────
DELETE FROM "InventoryAuditEvent";

-- ── 39. Clean up orphan patient users ────────────────────────
DELETE FROM "User"
WHERE role = 'PATIENT'
AND id NOT IN (SELECT COALESCE(user_id, '') FROM "Patient" WHERE user_id IS NOT NULL);

-- ── 40. Reset doctor onboarding to ACTIVE ────────────────────
UPDATE "Doctor"
SET onboarding_status = 'ACTIVE',
    profile_completed_at = COALESCE(profile_completed_at, NOW());

-- ── 41. Approve all patients ─────────────────────────────────
UPDATE "Patient"
SET approved = true,
    approved_at = COALESCE(approved_at, NOW());

COMMIT;

-- ── Verify counts ────────────────────────────────────────────
SELECT 'Users' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Patients', COUNT(*) FROM "Patient"
UNION ALL
SELECT 'Doctors', COUNT(*) FROM "Doctor"
UNION ALL
SELECT 'Inventory Items', COUNT(*) FROM "InventoryItem"
UNION ALL
SELECT 'Services', COUNT(*) FROM "Service"
UNION ALL
SELECT 'Theaters', COUNT(*) FROM "Theater"
UNION ALL
SELECT 'Appointments', COUNT(*) FROM "Appointment"
UNION ALL
SELECT 'Surgical Cases', COUNT(*) FROM "SurgicalCase"
UNION ALL
SELECT 'Consultations', COUNT(*) FROM "Consultation"
UNION ALL
SELECT 'Clinical Form Responses', COUNT(*) FROM "ClinicalFormResponse"
UNION ALL
SELECT 'Payments', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'Patient Bills', COUNT(*) FROM "PatientBill";
