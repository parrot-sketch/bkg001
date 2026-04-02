-- =============================================================
-- PRODUCTION DATA RESET — DRY RUN
--
-- Shows what would be deleted without making changes.
-- Matches actual database schema (75 tables).
-- =============================================================

-- ── What would be PRESERVED ──────────────────────────────────
SELECT '=== PRESERVED ===' as section;

SELECT 'Users (staff)' as category, COUNT(*) as count
FROM "User" WHERE role != 'PATIENT'
UNION ALL
SELECT 'Users (patients with Patient records)', COUNT(*)
FROM "User" u
WHERE u.role = 'PATIENT'
AND EXISTS (SELECT 1 FROM "Patient" p WHERE p.user_id = u.id)
UNION ALL
SELECT 'Patient records', COUNT(*) FROM "Patient"
UNION ALL
SELECT 'Doctor profiles', COUNT(*) FROM "Doctor"
UNION ALL
SELECT 'Inventory items', COUNT(*) FROM "InventoryItem"
UNION ALL
SELECT 'Inventory batches', COUNT(*) FROM "InventoryBatch"
UNION ALL
SELECT 'Vendors', COUNT(*) FROM "Vendor"
UNION ALL
SELECT 'Services', COUNT(*) FROM "Service"
UNION ALL
SELECT 'Theaters', COUNT(*) FROM "Theater"
UNION ALL
SELECT 'Clinics', COUNT(*) FROM "Clinic"
UNION ALL
SELECT 'Availability templates', COUNT(*) FROM "AvailabilityTemplate"
UNION ALL
SELECT 'Availability slots', COUNT(*) FROM "AvailabilitySlot"
UNION ALL
SELECT 'Slot configurations', COUNT(*) FROM "SlotConfiguration";

-- ── What would be DELETED ────────────────────────────────────
SELECT '' as section;
SELECT '=== WOULD BE DELETED ===' as section;

SELECT 'ClinicalFormResponse' as table_name, COUNT(*) as count FROM "ClinicalFormResponse"
UNION ALL
SELECT 'AuditLog', COUNT(*) FROM "AuditLog"
UNION ALL
SELECT 'Notification', COUNT(*) FROM "Notification"
UNION ALL
SELECT 'PatientQueue', COUNT(*) FROM "PatientQueue"
UNION ALL
SELECT 'CareNote', COUNT(*) FROM "CareNote"
UNION ALL
SELECT 'ClinicalNote', COUNT(*) FROM "ClinicalNote"
UNION ALL
SELECT 'Diagnosis', COUNT(*) FROM "Diagnosis"
UNION ALL
SELECT 'MedicalRecord', COUNT(*) FROM "MedicalRecord"
UNION ALL
SELECT 'VitalSign', COUNT(*) FROM "VitalSign"
UNION ALL
SELECT 'PatientBill', COUNT(*) FROM "PatientBill"
UNION ALL
SELECT 'Payment', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'LabTest', COUNT(*) FROM "LabTest"
UNION ALL
SELECT 'InventoryTransaction', COUNT(*) FROM "InventoryTransaction"
UNION ALL
SELECT 'InventoryUsage', COUNT(*) FROM "InventoryUsage"
UNION ALL
SELECT 'GoodsReceipt', COUNT(*) FROM "GoodsReceipt"
UNION ALL
SELECT 'GoodsReceiptItem', COUNT(*) FROM "GoodsReceiptItem"
UNION ALL
SELECT 'PurchaseOrder', COUNT(*) FROM "PurchaseOrder"
UNION ALL
SELECT 'PurchaseOrderItem', COUNT(*) FROM "PurchaseOrderItem"
UNION ALL
SELECT 'StockAdjustment', COUNT(*) FROM "StockAdjustment"
UNION ALL
SELECT 'ConsentForm', COUNT(*) FROM "ConsentForm"
UNION ALL
SELECT 'ConsentFormDocument', COUNT(*) FROM "ConsentFormDocument"
UNION ALL
SELECT 'CasePlan', COUNT(*) FROM "CasePlan"
UNION ALL
SELECT 'CasePlanPlannedItem', COUNT(*) FROM "CasePlanPlannedItem"
UNION ALL
SELECT 'SurgicalCaseTeamMember', COUNT(*) FROM "SurgicalCaseTeamMember"
UNION ALL
SELECT 'SurgicalStaff', COUNT(*) FROM "SurgicalStaff"
UNION ALL
SELECT 'SurgicalProcedureRecord', COUNT(*) FROM "SurgicalProcedureRecord"
UNION ALL
SELECT 'SurgicalBillingEstimate', COUNT(*) FROM "SurgicalBillingEstimate"
UNION ALL
SELECT 'SurgicalBillingLineItem', COUNT(*) FROM "SurgicalBillingLineItem"
UNION ALL
SELECT 'SurgicalCaseItem', COUNT(*) FROM "SurgicalCaseItem"
UNION ALL
SELECT 'SurgicalChecklist', COUNT(*) FROM "SurgicalChecklist"
UNION ALL
SELECT 'SurgicalMedicationRecord', COUNT(*) FROM "SurgicalMedicationRecord"
UNION ALL
SELECT 'SurgicalOutcome', COUNT(*) FROM "SurgicalOutcome"
UNION ALL
SELECT 'TheaterBooking', COUNT(*) FROM "TheaterBooking"
UNION ALL
SELECT 'SurgicalCase', COUNT(*) FROM "SurgicalCase"
UNION ALL
SELECT 'Consultation', COUNT(*) FROM "Consultation"
UNION ALL
SELECT 'Appointment', COUNT(*) FROM "Appointment"
UNION ALL
SELECT 'NurseAssignment', COUNT(*) FROM "NurseAssignment"
UNION ALL
SELECT 'DoctorInviteToken', COUNT(*) FROM "DoctorInviteToken"
UNION ALL
SELECT 'StaffInvite', COUNT(*) FROM "StaffInvite"
UNION ALL
SELECT 'Rating', COUNT(*) FROM "Rating"
UNION ALL
SELECT 'CalendarEvent', COUNT(*) FROM "CalendarEvent"
UNION ALL
SELECT 'ScheduleBlock', COUNT(*) FROM "ScheduleBlock"
UNION ALL
SELECT 'AvailabilityOverride', COUNT(*) FROM "AvailabilityOverride"
UNION ALL
SELECT 'RefreshToken', COUNT(*) FROM "RefreshToken"
UNION ALL
SELECT 'ConsultationMessage', COUNT(*) FROM "ConsultationMessage"
UNION ALL
SELECT 'ConsultationAttachment', COUNT(*) FROM "ConsultationAttachment"
UNION ALL
SELECT 'DoctorConsultation', COUNT(*) FROM "DoctorConsultation"
UNION ALL
SELECT 'DoctorPatientAssignment', COUNT(*) FROM "DoctorPatientAssignment"
UNION ALL
SELECT 'PatientImage', COUNT(*) FROM "PatientImage"
UNION ALL
SELECT 'ClinicalTask', COUNT(*) FROM "ClinicalTask"
UNION ALL
SELECT 'ClinicalAuditEvent', COUNT(*) FROM "ClinicalAuditEvent"
UNION ALL
SELECT 'InventoryAuditEvent', COUNT(*) FROM "InventoryAuditEvent"
UNION ALL
SELECT 'ConsentSigningSession', COUNT(*) FROM "ConsentSigningSession"
UNION ALL
SELECT 'ConsentTemplateAudit', COUNT(*) FROM "ConsentTemplateAudit"
UNION ALL
SELECT 'ConsentTemplateRelease', COUNT(*) FROM "ConsentTemplateRelease"
UNION ALL
SELECT 'ConsentTemplateVersion', COUNT(*) FROM "ConsentTemplateVersion"
UNION ALL
SELECT 'OutboxEvent', COUNT(*) FROM "OutboxEvent"
UNION ALL
SELECT 'intake_session', COUNT(*) FROM "intake_session"
UNION ALL
SELECT 'intake_submission', COUNT(*) FROM "intake_submission";

-- ── Staff summary ────────────────────────────────────────────
SELECT '' as section;
SELECT '=== STAFF TO PRESERVE ===' as section;

SELECT
    role,
    COUNT(*) as count,
    STRING_AGG(first_name || ' ' || last_name, ', ' ORDER BY first_name) as names
FROM "User"
WHERE role != 'PATIENT'
GROUP BY role
ORDER BY role;
