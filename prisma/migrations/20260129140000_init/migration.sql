-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'NURSE', 'DOCTOR', 'LAB_TECHNICIAN', 'PATIENT', 'CASHIER', 'FRONTDESK');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'DORMANT');

-- CreateEnum
CREATE TYPE "JOBTYPE" AS ENUM ('FULL', 'PART');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'PENDING_DOCTOR_CONFIRMATION', 'CONFIRMED', 'SCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ConsultationRequestStatus" AS ENUM ('SUBMITTED', 'PENDING_REVIEW', 'NEEDS_MORE_INFO', 'APPROVED', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PART');

-- CreateEnum
CREATE TYPE "CareNoteType" AS ENUM ('PRE_OP', 'POST_OP', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "DoctorOnboardingStatus" AS ENUM ('INVITED', 'ACTIVATED', 'PROFILE_COMPLETED', 'ACTIVE');

-- CreateEnum
CREATE TYPE "ConsultUrgency" AS ENUM ('ROUTINE', 'URGENT', 'INTRA_OP');

-- CreateEnum
CREATE TYPE "ConsultStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ImageTimepoint" AS ENUM ('PRE_OP', 'ONE_WEEK_POST_OP', 'ONE_MONTH_POST_OP', 'THREE_MONTHS_POST_OP', 'SIX_MONTHS_POST_OP', 'ONE_YEAR_POST_OP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ImageAngle" AS ENUM ('FRONT', 'OBLIQUE_LEFT', 'OBLIQUE_RIGHT', 'PROFILE_LEFT', 'PROFILE_RIGHT', 'BACK', 'TOP', 'BOTTOM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CaseReadinessStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_LABS', 'PENDING_CONSENT', 'PENDING_REVIEW', 'READY', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_REVISION', 'COMPLICATION');

-- CreateEnum
CREATE TYPE "SurgicalUrgency" AS ENUM ('ELECTIVE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AnesthesiaType" AS ENUM ('GENERAL', 'REGIONAL', 'LOCAL', 'SEDATION', 'TIVA', 'MAC');

-- CreateEnum
CREATE TYPE "SurgicalRole" AS ENUM ('SURGEON', 'ASSISTANT_SURGEON', 'ANESTHESIOLOGIST', 'ANESTHETIST_NURSE', 'SCRUB_NURSE', 'CIRCULATING_NURSE', 'THEATER_TECHNICIAN');

-- CreateEnum
CREATE TYPE "WoundClassification" AS ENUM ('CLEAN', 'CLEAN_CONTAMINATED', 'CONTAMINATED', 'DIRTY_INFECTED');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('GENERAL_PROCEDURE', 'ANESTHESIA', 'BLOOD_TRANSFUSION', 'PHOTOGRAPHY', 'SPECIAL_PROCEDURE');

-- CreateEnum
CREATE TYPE "SurgicalCaseStatus" AS ENUM ('DRAFT', 'PLANNING', 'READY_FOR_SCHEDULING', 'SCHEDULED', 'IN_PREP', 'IN_THEATER', 'RECOVERY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TheaterBookingStatus" AS ENUM ('PROVISIONAL', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "file_number" TEXT NOT NULL,
    "user_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'FEMALE',
    "phone" TEXT NOT NULL,
    "whatsapp_phone" TEXT,
    "email" TEXT NOT NULL,
    "marital_status" TEXT NOT NULL,
    "occupation" TEXT,
    "address" TEXT NOT NULL,
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_number" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "blood_group" TEXT,
    "allergies" TEXT,
    "medical_conditions" TEXT,
    "medical_history" TEXT,
    "insurance_provider" TEXT,
    "insurance_number" TEXT,
    "privacy_consent" BOOLEAN NOT NULL DEFAULT false,
    "service_consent" BOOLEAN NOT NULL DEFAULT false,
    "medical_consent" BOOLEAN NOT NULL DEFAULT false,
    "img" TEXT,
    "colorCode" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "assigned_to_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT,
    "name" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "clinic_location" TEXT,
    "department" TEXT,
    "img" TEXT,
    "profile_image" TEXT,
    "colorCode" TEXT,
    "availability_status" TEXT DEFAULT 'AVAILABLE',
    "type" "JOBTYPE" NOT NULL DEFAULT 'FULL',
    "bio" TEXT,
    "education" TEXT,
    "focus_areas" TEXT,
    "professional_affiliations" TEXT,
    "onboarding_status" "DoctorOnboardingStatus" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMP(3),
    "invited_by" TEXT,
    "activated_at" TIMESTAMP(3),
    "profile_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorInviteToken" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "invalidated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingDay" (
    "id" SERIAL NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityOverride" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT true,
    "start_time" TEXT,
    "end_time" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityBreak" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "working_day_id" INTEGER,
    "day_of_week" TEXT,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleSession" (
    "id" TEXT NOT NULL,
    "working_day_id" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "session_type" TEXT,
    "max_patients" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleBlock" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "block_type" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotConfiguration" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "default_duration" INTEGER NOT NULL DEFAULT 30,
    "buffer_time" INTEGER NOT NULL DEFAULT 0,
    "slot_interval" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "checked_in_by" TEXT,
    "late_arrival" BOOLEAN NOT NULL DEFAULT false,
    "late_by_minutes" INTEGER,
    "scheduled_at" TIMESTAMP(3),
    "status_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_changed_by" TEXT,
    "doctor_confirmed_at" TIMESTAMP(3),
    "doctor_confirmed_by" TEXT,
    "doctor_rejection_reason" TEXT,
    "no_show" BOOLEAN NOT NULL DEFAULT false,
    "no_show_at" TIMESTAMP(3),
    "no_show_reason" TEXT,
    "no_show_notes" TEXT,
    "rescheduled_to_appointment_id" INTEGER,
    "marked_no_show_at" TIMESTAMP(3),
    "consultation_request_status" "ConsultationRequestStatus",
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "slot_start_time" TEXT,
    "slot_duration" INTEGER DEFAULT 30,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "user_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "doctor_notes" TEXT,
    "outcome" TEXT,
    "outcome_type" TEXT,
    "patient_decision" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "follow_up_type" TEXT,
    "follow_up_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NurseAssignment" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "nurse_user_id" TEXT NOT NULL,
    "appointment_id" INTEGER,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NurseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareNote" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "nurse_user_id" TEXT NOT NULL,
    "appointment_id" INTEGER,
    "note_type" "CareNoteType" NOT NULL DEFAULT 'GENERAL',
    "note" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalSign" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" INTEGER,
    "medical_record_id" INTEGER,
    "body_temperature" DOUBLE PRECISION,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "heart_rate" TEXT,
    "respiratory_rate" INTEGER,
    "oxygen_saturation" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VitalSign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "treatment_plan" TEXT,
    "prescriptions" TEXT,
    "lab_request" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medical_record_id" INTEGER NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "notes" TEXT,
    "prescribed_medications" TEXT,
    "follow_up_plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" SERIAL NOT NULL,
    "medical_record_id" INTEGER NOT NULL,
    "test_date" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "service_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "bill_date" TIMESTAMP(3) NOT NULL,
    "payment_date" TIMESTAMP(3),
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "receipt_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientBill" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "service_date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "service_name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" SERIAL NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "sender_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorConsultation" (
    "id" TEXT NOT NULL,
    "case_id" INTEGER,
    "patient_id" TEXT,
    "requesting_doctor_id" TEXT NOT NULL,
    "consulting_doctor_id" TEXT NOT NULL,
    "urgency" "ConsultUrgency" NOT NULL DEFAULT 'ROUTINE',
    "status" "ConsultStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "background" TEXT,
    "what_is_needed" TEXT,
    "response" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationAttachment" (
    "id" SERIAL NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT,
    "file_size" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationMessage" (
    "id" SERIAL NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasePlan" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "surgical_case_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "procedure_plan" TEXT,
    "risk_factors" TEXT,
    "pre_op_notes" TEXT,
    "implant_details" TEXT,
    "marking_diagram" TEXT,
    "consent_checklist" TEXT,
    "planned_anesthesia" TEXT,
    "special_instructions" TEXT,
    "readiness_status" "CaseReadinessStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ready_for_surgery" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalProcedureRecord" (
    "id" SERIAL NOT NULL,
    "case_plan_id" INTEGER,
    "surgical_case_id" TEXT,
    "pre_op_diagnosis" TEXT NOT NULL,
    "post_op_diagnosis" TEXT,
    "procedure_performed" TEXT,
    "urgency" "SurgicalUrgency" NOT NULL DEFAULT 'ELECTIVE',
    "theater_id" TEXT,
    "anesthesia_start" TIMESTAMP(3),
    "incision_time" TIMESTAMP(3),
    "closure_time" TIMESTAMP(3),
    "wheels_out" TIMESTAMP(3),
    "shaving_required" BOOLEAN NOT NULL DEFAULT false,
    "shaving_extent" TEXT,
    "skin_prep_agent" TEXT,
    "anesthesia_type" "AnesthesiaType",
    "asa_score" INTEGER,
    "wound_class" "WoundClassification",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalProcedureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalStaff" (
    "id" SERIAL NOT NULL,
    "procedure_record_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "SurgicalRole" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "SurgicalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentForm" (
    "id" TEXT NOT NULL,
    "case_plan_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "content_snapshot" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ConsentStatus" NOT NULL DEFAULT 'DRAFT',
    "patient_signature" TEXT,
    "signed_at" TIMESTAMP(3),
    "signed_by_ip" TEXT,
    "witness_signature" TEXT,
    "witness_name" TEXT,
    "witness_id" TEXT,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientImage" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" INTEGER,
    "case_plan_id" INTEGER,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "angle" "ImageAngle" NOT NULL,
    "timepoint" "ImageTimepoint" NOT NULL,
    "custom_timepoint" TEXT,
    "description" TEXT,
    "consent_for_marketing" BOOLEAN NOT NULL DEFAULT false,
    "taken_by" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNoteTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "template_type" TEXT NOT NULL,
    "template_content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalNoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalTask" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT,
    "appointment_id" INTEGER,
    "assigned_by" TEXT NOT NULL,
    "assigned_to" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completion_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalOutcome" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "procedure_type" TEXT NOT NULL,
    "outcome_status" "OutcomeStatus" NOT NULL,
    "complication_rate" DOUBLE PRECISION,
    "revision_required" BOOLEAN NOT NULL DEFAULT false,
    "revision_date" TIMESTAMP(3),
    "patient_satisfaction" INTEGER,
    "healing_timeline" TEXT,
    "notes" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Nairobi Sculpt Surgical Aesthetic Center',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "primary_color" TEXT DEFAULT '#4F46E5',
    "accent_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theater" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "color_code" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "operational_hours" TEXT,
    "capabilities" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theater_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_session" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,

    CONSTRAINT "intake_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_submission" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp_phone" TEXT,
    "address" TEXT NOT NULL,
    "marital_status" TEXT NOT NULL,
    "occupation" TEXT,
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_number" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "blood_group" TEXT,
    "allergies" TEXT,
    "medical_conditions" TEXT,
    "medical_history" TEXT,
    "insurance_provider" TEXT,
    "insurance_number" TEXT,
    "privacy_consent" BOOLEAN NOT NULL,
    "service_consent" BOOLEAN NOT NULL,
    "medical_consent" BOOLEAN NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_patient_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalCase" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "primary_surgeon_id" TEXT NOT NULL,
    "consultation_id" INTEGER,
    "urgency" "SurgicalUrgency" NOT NULL DEFAULT 'ELECTIVE',
    "status" "SurgicalCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "diagnosis" TEXT,
    "procedure_name" TEXT,
    "side" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "SurgicalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TheaterBooking" (
    "id" TEXT NOT NULL,
    "theater_id" TEXT NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "TheaterBookingStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TheaterBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_expires_at_idx" ON "RefreshToken"("expires_at");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_revoked_idx" ON "RefreshToken"("user_id", "revoked");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_file_number_key" ON "Patient"("file_number");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_user_id_key" ON "Patient"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE INDEX "Patient_email_idx" ON "Patient"("email");

-- CreateIndex
CREATE INDEX "Patient_user_id_idx" ON "Patient"("user_id");

-- CreateIndex
CREATE INDEX "Patient_assigned_to_user_id_idx" ON "Patient"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "Patient_approved_idx" ON "Patient"("approved");

-- CreateIndex
CREATE INDEX "Patient_created_at_idx" ON "Patient"("created_at");

-- CreateIndex
CREATE INDEX "Patient_file_number_idx" ON "Patient"("file_number");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "Patient_last_name_idx" ON "Patient"("last_name");

-- CreateIndex
CREATE INDEX "Patient_first_name_last_name_idx" ON "Patient"("first_name", "last_name");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_user_id_key" ON "Doctor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_license_number_key" ON "Doctor"("license_number");

-- CreateIndex
CREATE INDEX "Doctor_email_idx" ON "Doctor"("email");

-- CreateIndex
CREATE INDEX "Doctor_user_id_idx" ON "Doctor"("user_id");

-- CreateIndex
CREATE INDEX "Doctor_license_number_idx" ON "Doctor"("license_number");

-- CreateIndex
CREATE INDEX "Doctor_specialization_idx" ON "Doctor"("specialization");

-- CreateIndex
CREATE INDEX "Doctor_onboarding_status_idx" ON "Doctor"("onboarding_status");

-- CreateIndex
CREATE INDEX "Doctor_invited_by_idx" ON "Doctor"("invited_by");

-- CreateIndex
CREATE INDEX "Doctor_phone_idx" ON "Doctor"("phone");

-- CreateIndex
CREATE INDEX "Doctor_name_idx" ON "Doctor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorInviteToken_doctor_id_key" ON "DoctorInviteToken"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorInviteToken_email_key" ON "DoctorInviteToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorInviteToken_token_key" ON "DoctorInviteToken"("token");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_token_idx" ON "DoctorInviteToken"("token");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_email_idx" ON "DoctorInviteToken"("email");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_doctor_id_idx" ON "DoctorInviteToken"("doctor_id");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_expires_at_idx" ON "DoctorInviteToken"("expires_at");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_invited_by_idx" ON "DoctorInviteToken"("invited_by");

-- CreateIndex
CREATE INDEX "WorkingDay_doctor_id_idx" ON "WorkingDay"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDay_doctor_id_day_key" ON "WorkingDay"("doctor_id", "day");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_doctor_id_idx" ON "AvailabilityOverride"("doctor_id");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_start_date_end_date_idx" ON "AvailabilityOverride"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_doctor_id_start_date_end_date_idx" ON "AvailabilityOverride"("doctor_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "AvailabilityBreak_doctor_id_idx" ON "AvailabilityBreak"("doctor_id");

-- CreateIndex
CREATE INDEX "AvailabilityBreak_working_day_id_idx" ON "AvailabilityBreak"("working_day_id");

-- CreateIndex
CREATE INDEX "AvailabilityBreak_doctor_id_day_of_week_idx" ON "AvailabilityBreak"("doctor_id", "day_of_week");

-- CreateIndex
CREATE INDEX "ScheduleSession_working_day_id_idx" ON "ScheduleSession"("working_day_id");

-- CreateIndex
CREATE INDEX "ScheduleSession_start_time_end_time_idx" ON "ScheduleSession"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "ScheduleBlock_doctor_id_idx" ON "ScheduleBlock"("doctor_id");

-- CreateIndex
CREATE INDEX "ScheduleBlock_start_date_end_date_idx" ON "ScheduleBlock"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "ScheduleBlock_doctor_id_start_date_end_date_idx" ON "ScheduleBlock"("doctor_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "SlotConfiguration_doctor_id_key" ON "SlotConfiguration"("doctor_id");

-- CreateIndex
CREATE INDEX "SlotConfiguration_doctor_id_idx" ON "SlotConfiguration"("doctor_id");

-- CreateIndex
CREATE INDEX "Appointment_patient_id_idx" ON "Appointment"("patient_id");

-- CreateIndex
CREATE INDEX "Appointment_doctor_id_idx" ON "Appointment"("doctor_id");

-- CreateIndex
CREATE INDEX "Appointment_appointment_date_idx" ON "Appointment"("appointment_date");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_appointment_date_status_idx" ON "Appointment"("appointment_date", "status");

-- CreateIndex
CREATE INDEX "Appointment_doctor_id_appointment_date_time_idx" ON "Appointment"("doctor_id", "appointment_date", "time");

-- CreateIndex
CREATE INDEX "Appointment_consultation_request_status_idx" ON "Appointment"("consultation_request_status");

-- CreateIndex
CREATE INDEX "Appointment_reviewed_by_idx" ON "Appointment"("reviewed_by");

-- CreateIndex
CREATE INDEX "Appointment_created_at_idx" ON "Appointment"("created_at");

-- CreateIndex
CREATE INDEX "Appointment_updated_at_idx" ON "Appointment"("updated_at");

-- CreateIndex
CREATE INDEX "Appointment_doctor_id_scheduled_at_idx" ON "Appointment"("doctor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "Appointment_doctor_id_status_scheduled_at_idx" ON "Appointment"("doctor_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "Appointment_patient_id_scheduled_at_idx" ON "Appointment"("patient_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "Appointment_patient_id_status_scheduled_at_idx" ON "Appointment"("patient_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "Appointment_status_created_at_idx" ON "Appointment"("status", "created_at");

-- CreateIndex
CREATE INDEX "Appointment_status_changed_at_idx" ON "Appointment"("status_changed_at");

-- CreateIndex
CREATE INDEX "Appointment_status_changed_by_idx" ON "Appointment"("status_changed_by");

-- CreateIndex
CREATE UNIQUE INDEX "unique_doctor_scheduled_slot" ON "Appointment"("doctor_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_appointment_id_key" ON "Consultation"("appointment_id");

-- CreateIndex
CREATE INDEX "Consultation_appointment_id_idx" ON "Consultation"("appointment_id");

-- CreateIndex
CREATE INDEX "Consultation_doctor_id_idx" ON "Consultation"("doctor_id");

-- CreateIndex
CREATE INDEX "Consultation_started_at_idx" ON "Consultation"("started_at");

-- CreateIndex
CREATE INDEX "Consultation_completed_at_idx" ON "Consultation"("completed_at");

-- CreateIndex
CREATE INDEX "Consultation_user_id_idx" ON "Consultation"("user_id");

-- CreateIndex
CREATE INDEX "NurseAssignment_patient_id_idx" ON "NurseAssignment"("patient_id");

-- CreateIndex
CREATE INDEX "NurseAssignment_nurse_user_id_idx" ON "NurseAssignment"("nurse_user_id");

-- CreateIndex
CREATE INDEX "NurseAssignment_appointment_id_idx" ON "NurseAssignment"("appointment_id");

-- CreateIndex
CREATE INDEX "CareNote_patient_id_idx" ON "CareNote"("patient_id");

-- CreateIndex
CREATE INDEX "CareNote_nurse_user_id_idx" ON "CareNote"("nurse_user_id");

-- CreateIndex
CREATE INDEX "CareNote_appointment_id_idx" ON "CareNote"("appointment_id");

-- CreateIndex
CREATE INDEX "CareNote_note_type_idx" ON "CareNote"("note_type");

-- CreateIndex
CREATE INDEX "CareNote_recorded_at_idx" ON "CareNote"("recorded_at");

-- CreateIndex
CREATE INDEX "VitalSign_patient_id_idx" ON "VitalSign"("patient_id");

-- CreateIndex
CREATE INDEX "VitalSign_appointment_id_idx" ON "VitalSign"("appointment_id");

-- CreateIndex
CREATE INDEX "VitalSign_recorded_at_idx" ON "VitalSign"("recorded_at");

-- CreateIndex
CREATE INDEX "MedicalRecord_patient_id_idx" ON "MedicalRecord"("patient_id");

-- CreateIndex
CREATE INDEX "MedicalRecord_appointment_id_idx" ON "MedicalRecord"("appointment_id");

-- CreateIndex
CREATE INDEX "MedicalRecord_doctor_id_idx" ON "MedicalRecord"("doctor_id");

-- CreateIndex
CREATE INDEX "MedicalRecord_created_at_idx" ON "MedicalRecord"("created_at");

-- CreateIndex
CREATE INDEX "Diagnosis_patient_id_idx" ON "Diagnosis"("patient_id");

-- CreateIndex
CREATE INDEX "Diagnosis_medical_record_id_idx" ON "Diagnosis"("medical_record_id");

-- CreateIndex
CREATE INDEX "Diagnosis_doctor_id_idx" ON "Diagnosis"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_service_id_key" ON "LabTest"("service_id");

-- CreateIndex
CREATE INDEX "LabTest_medical_record_id_idx" ON "LabTest"("medical_record_id");

-- CreateIndex
CREATE INDEX "LabTest_test_date_idx" ON "LabTest"("test_date");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_appointment_id_key" ON "Payment"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receipt_number_key" ON "Payment"("receipt_number");

-- CreateIndex
CREATE INDEX "Payment_patient_id_idx" ON "Payment"("patient_id");

-- CreateIndex
CREATE INDEX "Payment_appointment_id_idx" ON "Payment"("appointment_id");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_payment_date_idx" ON "Payment"("payment_date");

-- CreateIndex
CREATE INDEX "Payment_bill_date_idx" ON "Payment"("bill_date");

-- CreateIndex
CREATE INDEX "Payment_created_at_idx" ON "Payment"("created_at");

-- CreateIndex
CREATE INDEX "PatientBill_payment_id_idx" ON "PatientBill"("payment_id");

-- CreateIndex
CREATE INDEX "PatientBill_service_id_idx" ON "PatientBill"("service_id");

-- CreateIndex
CREATE INDEX "Service_service_name_idx" ON "Service"("service_name");

-- CreateIndex
CREATE INDEX "Service_category_idx" ON "Service"("category");

-- CreateIndex
CREATE INDEX "Service_is_active_idx" ON "Service"("is_active");

-- CreateIndex
CREATE INDEX "Rating_doctor_id_idx" ON "Rating"("doctor_id");

-- CreateIndex
CREATE INDEX "Rating_patient_id_idx" ON "Rating"("patient_id");

-- CreateIndex
CREATE INDEX "Rating_rating_idx" ON "Rating"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_doctor_id_patient_id_key" ON "Rating"("doctor_id", "patient_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_idx" ON "Notification"("user_id");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_sent_at_idx" ON "Notification"("sent_at");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");

-- CreateIndex
CREATE INDEX "AuditLog_model_idx" ON "AuditLog"("model");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_created_at_idx" ON "AuditLog"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "DoctorConsultation_requesting_doctor_id_idx" ON "DoctorConsultation"("requesting_doctor_id");

-- CreateIndex
CREATE INDEX "DoctorConsultation_consulting_doctor_id_idx" ON "DoctorConsultation"("consulting_doctor_id");

-- CreateIndex
CREATE INDEX "DoctorConsultation_patient_id_idx" ON "DoctorConsultation"("patient_id");

-- CreateIndex
CREATE INDEX "DoctorConsultation_case_id_idx" ON "DoctorConsultation"("case_id");

-- CreateIndex
CREATE INDEX "DoctorConsultation_status_idx" ON "DoctorConsultation"("status");

-- CreateIndex
CREATE INDEX "DoctorConsultation_urgency_idx" ON "DoctorConsultation"("urgency");

-- CreateIndex
CREATE INDEX "DoctorConsultation_created_at_idx" ON "DoctorConsultation"("created_at");

-- CreateIndex
CREATE INDEX "ConsultationAttachment_consultation_id_idx" ON "ConsultationAttachment"("consultation_id");

-- CreateIndex
CREATE INDEX "ConsultationMessage_consultation_id_idx" ON "ConsultationMessage"("consultation_id");

-- CreateIndex
CREATE INDEX "ConsultationMessage_sender_id_idx" ON "ConsultationMessage"("sender_id");

-- CreateIndex
CREATE INDEX "ConsultationMessage_created_at_idx" ON "ConsultationMessage"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "CasePlan_appointment_id_key" ON "CasePlan"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "CasePlan_surgical_case_id_key" ON "CasePlan"("surgical_case_id");

-- CreateIndex
CREATE INDEX "CasePlan_appointment_id_idx" ON "CasePlan"("appointment_id");

-- CreateIndex
CREATE INDEX "CasePlan_patient_id_idx" ON "CasePlan"("patient_id");

-- CreateIndex
CREATE INDEX "CasePlan_doctor_id_idx" ON "CasePlan"("doctor_id");

-- CreateIndex
CREATE INDEX "CasePlan_readiness_status_idx" ON "CasePlan"("readiness_status");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalProcedureRecord_case_plan_id_key" ON "SurgicalProcedureRecord"("case_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalProcedureRecord_surgical_case_id_key" ON "SurgicalProcedureRecord"("surgical_case_id");

-- CreateIndex
CREATE INDEX "SurgicalProcedureRecord_case_plan_id_idx" ON "SurgicalProcedureRecord"("case_plan_id");

-- CreateIndex
CREATE INDEX "SurgicalProcedureRecord_theater_id_idx" ON "SurgicalProcedureRecord"("theater_id");

-- CreateIndex
CREATE INDEX "SurgicalStaff_procedure_record_id_idx" ON "SurgicalStaff"("procedure_record_id");

-- CreateIndex
CREATE INDEX "SurgicalStaff_user_id_idx" ON "SurgicalStaff"("user_id");

-- CreateIndex
CREATE INDEX "ConsentForm_case_plan_id_idx" ON "ConsentForm"("case_plan_id");

-- CreateIndex
CREATE INDEX "ConsentForm_status_idx" ON "ConsentForm"("status");

-- CreateIndex
CREATE INDEX "PatientImage_patient_id_idx" ON "PatientImage"("patient_id");

-- CreateIndex
CREATE INDEX "PatientImage_appointment_id_idx" ON "PatientImage"("appointment_id");

-- CreateIndex
CREATE INDEX "PatientImage_timepoint_idx" ON "PatientImage"("timepoint");

-- CreateIndex
CREATE INDEX "PatientImage_angle_idx" ON "PatientImage"("angle");

-- CreateIndex
CREATE INDEX "PatientImage_taken_at_idx" ON "PatientImage"("taken_at");

-- CreateIndex
CREATE INDEX "ClinicalNoteTemplate_template_type_idx" ON "ClinicalNoteTemplate"("template_type");

-- CreateIndex
CREATE INDEX "ClinicalNoteTemplate_is_active_idx" ON "ClinicalNoteTemplate"("is_active");

-- CreateIndex
CREATE INDEX "ClinicalTask_assigned_to_idx" ON "ClinicalTask"("assigned_to");

-- CreateIndex
CREATE INDEX "ClinicalTask_assigned_by_idx" ON "ClinicalTask"("assigned_by");

-- CreateIndex
CREATE INDEX "ClinicalTask_patient_id_idx" ON "ClinicalTask"("patient_id");

-- CreateIndex
CREATE INDEX "ClinicalTask_appointment_id_idx" ON "ClinicalTask"("appointment_id");

-- CreateIndex
CREATE INDEX "ClinicalTask_status_idx" ON "ClinicalTask"("status");

-- CreateIndex
CREATE INDEX "ClinicalTask_priority_idx" ON "ClinicalTask"("priority");

-- CreateIndex
CREATE INDEX "ClinicalTask_due_date_idx" ON "ClinicalTask"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalOutcome_appointment_id_key" ON "SurgicalOutcome"("appointment_id");

-- CreateIndex
CREATE INDEX "SurgicalOutcome_appointment_id_idx" ON "SurgicalOutcome"("appointment_id");

-- CreateIndex
CREATE INDEX "SurgicalOutcome_patient_id_idx" ON "SurgicalOutcome"("patient_id");

-- CreateIndex
CREATE INDEX "SurgicalOutcome_doctor_id_idx" ON "SurgicalOutcome"("doctor_id");

-- CreateIndex
CREATE INDEX "SurgicalOutcome_procedure_type_idx" ON "SurgicalOutcome"("procedure_type");

-- CreateIndex
CREATE INDEX "SurgicalOutcome_outcome_status_idx" ON "SurgicalOutcome"("outcome_status");

-- CreateIndex
CREATE INDEX "SurgicalOutcome_recorded_at_idx" ON "SurgicalOutcome"("recorded_at");

-- CreateIndex
CREATE INDEX "ConsentTemplate_type_idx" ON "ConsentTemplate"("type");

-- CreateIndex
CREATE INDEX "ConsentTemplate_is_active_idx" ON "ConsentTemplate"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "intake_session_session_id_key" ON "intake_session"("session_id");

-- CreateIndex
CREATE INDEX "intake_session_session_id_idx" ON "intake_session"("session_id");

-- CreateIndex
CREATE INDEX "intake_session_expires_at_idx" ON "intake_session"("expires_at");

-- CreateIndex
CREATE INDEX "intake_session_status_idx" ON "intake_session"("status");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submission_submission_id_key" ON "intake_submission"("submission_id");

-- CreateIndex
CREATE INDEX "intake_submission_session_id_idx" ON "intake_submission"("session_id");

-- CreateIndex
CREATE INDEX "intake_submission_status_idx" ON "intake_submission"("status");

-- CreateIndex
CREATE INDEX "intake_submission_submitted_at_idx" ON "intake_submission"("submitted_at");

-- CreateIndex
CREATE INDEX "intake_submission_created_patient_id_idx" ON "intake_submission"("created_patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submission_session_id_key" ON "intake_submission"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalCase_consultation_id_key" ON "SurgicalCase"("consultation_id");

-- CreateIndex
CREATE INDEX "SurgicalCase_patient_id_idx" ON "SurgicalCase"("patient_id");

-- CreateIndex
CREATE INDEX "SurgicalCase_primary_surgeon_id_idx" ON "SurgicalCase"("primary_surgeon_id");

-- CreateIndex
CREATE INDEX "SurgicalCase_status_idx" ON "SurgicalCase"("status");

-- CreateIndex
CREATE INDEX "SurgicalCase_created_at_idx" ON "SurgicalCase"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "TheaterBooking_surgical_case_id_key" ON "TheaterBooking"("surgical_case_id");

-- CreateIndex
CREATE INDEX "TheaterBooking_theater_id_idx" ON "TheaterBooking"("theater_id");

-- CreateIndex
CREATE INDEX "TheaterBooking_start_time_end_time_idx" ON "TheaterBooking"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "TheaterBooking_status_idx" ON "TheaterBooking"("status");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingDay" ADD CONSTRAINT "WorkingDay_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBreak" ADD CONSTRAINT "AvailabilityBreak_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBreak" ADD CONSTRAINT "AvailabilityBreak_working_day_id_fkey" FOREIGN KEY ("working_day_id") REFERENCES "WorkingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSession" ADD CONSTRAINT "ScheduleSession_working_day_id_fkey" FOREIGN KEY ("working_day_id") REFERENCES "WorkingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotConfiguration" ADD CONSTRAINT "SlotConfiguration_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseAssignment" ADD CONSTRAINT "NurseAssignment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseAssignment" ADD CONSTRAINT "NurseAssignment_nurse_user_id_fkey" FOREIGN KEY ("nurse_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseAssignment" ADD CONSTRAINT "NurseAssignment_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_nurse_user_id_fkey" FOREIGN KEY ("nurse_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConsultation" ADD CONSTRAINT "DoctorConsultation_requesting_doctor_id_fkey" FOREIGN KEY ("requesting_doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConsultation" ADD CONSTRAINT "DoctorConsultation_consulting_doctor_id_fkey" FOREIGN KEY ("consulting_doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConsultation" ADD CONSTRAINT "DoctorConsultation_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConsultation" ADD CONSTRAINT "DoctorConsultation_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationAttachment" ADD CONSTRAINT "ConsultationAttachment_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "DoctorConsultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "DoctorConsultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalProcedureRecord" ADD CONSTRAINT "SurgicalProcedureRecord_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalProcedureRecord" ADD CONSTRAINT "SurgicalProcedureRecord_case_plan_id_fkey" FOREIGN KEY ("case_plan_id") REFERENCES "CasePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalProcedureRecord" ADD CONSTRAINT "SurgicalProcedureRecord_theater_id_fkey" FOREIGN KEY ("theater_id") REFERENCES "Theater"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalStaff" ADD CONSTRAINT "SurgicalStaff_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "SurgicalProcedureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalStaff" ADD CONSTRAINT "SurgicalStaff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_case_plan_id_fkey" FOREIGN KEY ("case_plan_id") REFERENCES "CasePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_witness_id_fkey" FOREIGN KEY ("witness_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImage" ADD CONSTRAINT "PatientImage_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImage" ADD CONSTRAINT "PatientImage_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImage" ADD CONSTRAINT "PatientImage_case_plan_id_fkey" FOREIGN KEY ("case_plan_id") REFERENCES "CasePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalTask" ADD CONSTRAINT "ClinicalTask_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalTask" ADD CONSTRAINT "ClinicalTask_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalOutcome" ADD CONSTRAINT "SurgicalOutcome_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalOutcome" ADD CONSTRAINT "SurgicalOutcome_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalOutcome" ADD CONSTRAINT "SurgicalOutcome_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submission" ADD CONSTRAINT "intake_submission_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intake_session"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_primary_surgeon_id_fkey" FOREIGN KEY ("primary_surgeon_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterBooking" ADD CONSTRAINT "TheaterBooking_theater_id_fkey" FOREIGN KEY ("theater_id") REFERENCES "Theater"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterBooking" ADD CONSTRAINT "TheaterBooking_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

