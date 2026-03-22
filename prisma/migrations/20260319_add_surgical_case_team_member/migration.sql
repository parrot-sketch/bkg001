-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum (idempotent - skip if already exists)
DO $$ BEGIN
    CREATE TYPE "ConsentDocumentType" AS ENUM ('SIGNED_PDF', 'GENERATED_PDF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VerificationMethod" AS ENUM ('NAME_DOB_ONLY', 'NAME_DOB_OTP', 'STAFF_VERIFIED', 'EMERGENCY_OVERRIDE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SigningStatus" AS ENUM ('PENDING', 'VERIFYING', 'VERIFIED', 'SIGNING', 'SIGNED', 'VERIFICATION_FAILED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'NURSE', 'DOCTOR', 'LAB_TECHNICIAN', 'PATIENT', 'CASHIER', 'FRONTDESK', 'THEATER_TECHNICIAN', 'STORES');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'DORMANT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "JOBTYPE" AS ENUM ('FULL', 'PART');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'PENDING_DOCTOR_CONFIRMATION', 'CONFIRMED', 'SCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'CHECKED_IN', 'READY_FOR_CONSULTATION', 'IN_CONSULTATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppointmentSource" AS ENUM ('PATIENT_REQUESTED', 'FRONTDESK_SCHEDULED', 'DOCTOR_FOLLOW_UP', 'ADMIN_SCHEDULED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BookingChannel" AS ENUM ('DASHBOARD', 'PATIENT_LIST', 'PATIENT_PROFILE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConsultationRequestStatus" AS ENUM ('SUBMITTED', 'PENDING_REVIEW', 'NEEDS_MORE_INFO', 'APPROVED', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PART');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BillType" AS ENUM ('CONSULTATION', 'SURGERY', 'LAB_TEST', 'FOLLOW_UP', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PriceType" AS ENUM ('FIXED', 'VARIABLE', 'PER_UNIT', 'QUOTE_REQUIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InventoryCategory" AS ENUM ('IMPLANT', 'SUTURE', 'ANESTHETIC', 'MEDICATION', 'DISPOSABLE', 'INSTRUMENT', 'DRESSING', 'SPECIMEN_CONTAINER', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CareNoteType" AS ENUM ('PRE_OP', 'POST_OP', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DoctorOnboardingStatus" AS ENUM ('INVITED', 'ACTIVATED', 'PROFILE_COMPLETED', 'ACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConsultUrgency" AS ENUM ('ROUTINE', 'URGENT', 'INTRA_OP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConsultStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ImageTimepoint" AS ENUM ('PRE_OP', 'ONE_WEEK_POST_OP', 'ONE_MONTH_POST_OP', 'THREE_MONTHS_POST_OP', 'SIX_MONTHS_POST_OP', 'ONE_YEAR_POST_OP', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ImageAngle" AS ENUM ('FRONT', 'OBLIQUE_LEFT', 'OBLIQUE_RIGHT', 'PROFILE_LEFT', 'PROFILE_RIGHT', 'BACK', 'TOP', 'BOTTOM', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CaseReadinessStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_LABS', 'PENDING_CONSENT', 'PENDING_REVIEW', 'READY', 'ON_HOLD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OutcomeStatus" AS ENUM ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_REVISION', 'COMPLICATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SurgicalUrgency" AS ENUM ('ELECTIVE', 'URGENT', 'EMERGENCY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AnesthesiaType" AS ENUM ('GENERAL', 'REGIONAL', 'LOCAL', 'SEDATION', 'TIVA', 'MAC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SurgicalRole" AS ENUM ('SURGEON', 'ASSISTANT_SURGEON', 'ANESTHESIOLOGIST', 'ANESTHETIST_NURSE', 'SCRUB_NURSE', 'CIRCULATING_NURSE', 'THEATER_TECHNICIAN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WoundClassification" AS ENUM ('CLEAN', 'CLEAN_CONTAMINATED', 'CONTAMINATED', 'DIRTY_INFECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConsentStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'REVOKED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConsentType" AS ENUM ('GENERAL_PROCEDURE', 'ANESTHESIA', 'BLOOD_TRANSFUSION', 'PHOTOGRAPHY', 'SPECIAL_PROCEDURE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TemplateFormat" AS ENUM ('HTML', 'PDF', 'HYBRID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'PENDING_APPROVAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'ACTIVATED', 'ARCHIVED', 'DELETED', 'VIEWED', 'DOWNLOADED', 'DUPLICATED', 'RESTORED', 'SUBMITTED_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'PDF_REPLACED', 'SIGNED_UPLOADED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'IN_CONSULTATION', 'COMPLETED', 'REMOVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationEventType" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'PATIENT_QUEUED', 'PATIENT_REASSIGNED', 'PATIENT_REMOVED_FROM_QUEUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SurgicalCaseStatus" AS ENUM ('DRAFT', 'PLANNING', 'READY_FOR_SCHEDULING', 'SCHEDULED', 'IN_PREP', 'IN_THEATER', 'RECOVERY', 'COMPLETED', 'CANCELLED', 'READY_FOR_THEATER_BOOKING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TheaterBookingStatus" AS ENUM ('PROVISIONAL', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ChecklistPhase" AS ENUM ('SIGN_IN', 'TIME_OUT', 'SIGN_OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalFormStatus" AS ENUM ('DRAFT', 'FINAL', 'AMENDMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'CLOSED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StockAdjustmentType" AS ENUM ('INCREMENT', 'DECREMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StockAdjustmentReason" AS ENUM ('DAMAGED', 'EXPIRED', 'LOST', 'THEFT', 'COUNT_CORRECTION', 'RETURN_TO_VENDOR', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DoctorPatientAssignmentStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'TRANSFERRED', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StockMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'OPENING_BALANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
CREATE TYPE "DoctorPatientAssignmentStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'TRANSFERRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'OPENING_BALANCE');

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
    "marital_status" TEXT,
    "occupation" TEXT,
    "address" TEXT NOT NULL,
    "emergency_contact_name" TEXT,
    "emergency_contact_number" TEXT,
    "relation" TEXT,
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
    "consultation_fee" DOUBLE PRECISION DEFAULT 0.0,
    "languages" TEXT,
    "years_of_experience" INTEGER DEFAULT 0,
    "slug" TEXT,

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
CREATE TABLE "AvailabilityTemplate" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_type" TEXT DEFAULT 'CLINIC',
    "max_patients" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
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
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "resource_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "consultation_duration" INTEGER,
    "consultation_ended_at" TIMESTAMP(3),
    "consultation_started_at" TIMESTAMP(3),
    "parent_appointment_id" INTEGER,
    "parent_consultation_id" INTEGER,
    "source" "AppointmentSource" NOT NULL DEFAULT 'PATIENT_REQUESTED',
    "created_by_user_id" TEXT,
    "booking_channel" "BookingChannel",
    "scheduled_end_at" TIMESTAMP(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientQueue" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "appointment_id" INTEGER,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "called_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "position" INTEGER,
    "removed_at" TIMESTAMP(3),
    "removed_by" TEXT,
    "removal_reason" TEXT,

    CONSTRAINT "PatientQueue_pkey" PRIMARY KEY ("id")
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
    "assessment" TEXT,
    "chief_complaint" TEXT,
    "examination" TEXT,
    "plan" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "appointment_id" INTEGER,
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
    "surgical_case_id" TEXT,
    "bill_type" "BillType" NOT NULL DEFAULT 'CONSULTATION',
    "notes" TEXT,

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
    "surgical_medication_record_id" TEXT,

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
    "price_type" "PriceType" NOT NULL DEFAULT 'FIXED',
    "min_price" DOUBLE PRECISION,
    "max_price" DOUBLE PRECISION,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" "InventoryCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'unit',
    "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorder_point" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_billable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_implant" BOOLEAN NOT NULL DEFAULT false,
    "manufacturer" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBatch" (
    "id" TEXT NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "batch_number" TEXT NOT NULL,
    "serial_number" TEXT,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "quantity_remaining" INTEGER NOT NULL DEFAULT 1,
    "cost_per_unit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "goods_receipt_id" TEXT,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "payment_terms" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by_user_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "inventory_item_id" INTEGER,
    "item_name" TEXT NOT NULL,
    "quantity_ordered" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "total_price" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "quantity_received" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "received_by_user_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "id" SERIAL NOT NULL,
    "goods_receipt_id" TEXT NOT NULL,
    "po_item_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER,
    "quantity_received" INTEGER NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "batch_number" TEXT,
    "expiry_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" SERIAL NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "adjustment_type" "StockAdjustmentType" NOT NULL,
    "adjustment_reason" "StockAdjustmentReason" NOT NULL,
    "quantity_change" INTEGER NOT NULL,
    "previous_quantity" INTEGER NOT NULL,
    "new_quantity" INTEGER NOT NULL,
    "adjusted_by_user_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryUsage" (
    "id" SERIAL NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "surgical_case_id" TEXT,
    "appointment_id" INTEGER,
    "quantity_used" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit_cost_at_time" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "notes" TEXT,
    "bill_item_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "external_ref" TEXT,
    "source_form_key" TEXT,
    "used_at" TIMESTAMP(3),
    "used_by_user_id" TEXT,
    "inventory_batch_id" TEXT,
    "surgical_medication_record_id" TEXT,

    CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAuditEvent" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "external_ref" TEXT,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAuditEvent_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
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
    "estimated_duration_minutes" INTEGER,

    CONSTRAINT "CasePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasePlanPlannedItem" (
    "id" SERIAL NOT NULL,
    "case_plan_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER,
    "service_id" INTEGER,
    "planned_quantity" DOUBLE PRECISION NOT NULL,
    "planned_unit_price" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "planned_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasePlanPlannedItem_pkey" PRIMARY KEY ("id")
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
    "wheels_in" TIMESTAMP(3),
    "anesthesia_end" TIMESTAMP(3),
    "anesthesiologist_snapshot_id" TEXT,
    "assistant_surgeon_snapshot_ids" TEXT,
    "primary_surgeon_snapshot_id" TEXT,
    "estimated_blood_loss" INTEGER,
    "urine_output" INTEGER,

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
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "procedure_record_id" INTEGER,
    "invited_user_id" TEXT NOT NULL,
    "invited_role" "SurgicalRole" NOT NULL,
    "invited_by_user_id" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "acknowledged_at" TIMESTAMP(3),
    "declined_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
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
    "template_id" TEXT,

    CONSTRAINT "ConsentForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentFormDocument" (
    "id" TEXT NOT NULL,
    "consent_form_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "checksum_sha256" TEXT,
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "document_type" "ConsentDocumentType" NOT NULL DEFAULT 'SIGNED_PDF',
    "version" INTEGER NOT NULL DEFAULT 1,
    "file_size" INTEGER,
    "file_name" TEXT,

    CONSTRAINT "ConsentFormDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentSigningSession" (
    "id" TEXT NOT NULL,
    "consent_form_id" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verification_method" "VerificationMethod" NOT NULL,
    "patient_name_entered" TEXT,
    "patient_dob_entered" TIMESTAMP(3),
    "patient_file_number" TEXT,
    "phone_number_used" TEXT,
    "otp_sent" BOOLEAN NOT NULL DEFAULT false,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "requires_staff_verify" BOOLEAN NOT NULL DEFAULT false,
    "verified_by_staff_id" TEXT,
    "verified_by_staff_at" TIMESTAMP(3),
    "staff_verification_note" TEXT,
    "signed_at" TIMESTAMP(3),
    "signed_by_ip" TEXT,
    "signed_by_user_agent" TEXT,
    "patient_signature" TEXT,
    "witness_name" TEXT,
    "witness_signature" TEXT,
    "witness_id" TEXT,
    "status" "SigningStatus" NOT NULL DEFAULT 'PENDING',
    "identity_match_score" DOUBLE PRECISION,
    "verification_attempts" INTEGER NOT NULL DEFAULT 0,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentSigningSession_pkey" PRIMARY KEY ("id")
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
    "hourly_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
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
    "pdf_url" TEXT,
    "template_format" "TemplateFormat" NOT NULL DEFAULT 'HTML',
    "extracted_content" TEXT,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "checksum_sha256" TEXT,
    "latest_pdf_filename" TEXT,
    "locked_version_number" INTEGER,

    CONSTRAINT "ConsentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentTemplateVersion" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pdf_url" TEXT,
    "template_format" "TemplateFormat" NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version_notes" TEXT,

    CONSTRAINT "ConsentTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentTemplateAudit" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" "Role" NOT NULL,
    "changes_json" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentTemplateAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentTemplateRelease" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "released_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_by_user_id" TEXT NOT NULL,
    "release_notes" TEXT,

    CONSTRAINT "ConsentTemplateRelease_pkey" PRIMARY KEY ("id")
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
    "marital_status" TEXT,
    "occupation" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_number" TEXT,
    "relation" TEXT,
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
    "version" INTEGER NOT NULL DEFAULT 1,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "lock_expires_at" TIMESTAMP(3),

    CONSTRAINT "TheaterBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalChecklist" (
    "id" TEXT NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "sign_in_completed_at" TIMESTAMP(3),
    "sign_in_by_user_id" TEXT,
    "sign_in_by_role" TEXT,
    "sign_in_items" TEXT,
    "time_out_completed_at" TIMESTAMP(3),
    "time_out_by_user_id" TEXT,
    "time_out_by_role" TEXT,
    "time_out_items" TEXT,
    "sign_out_completed_at" TIMESTAMP(3),
    "sign_out_by_user_id" TEXT,
    "sign_out_by_role" TEXT,
    "sign_out_items" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalCaseTeamMember" (
    "id" TEXT NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalCaseTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAuditEvent" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalFormTemplate" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "role_owner" "Role" NOT NULL,
    "schema_json" TEXT NOT NULL,
    "ui_json" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalFormResponse" (
    "id" TEXT NOT NULL,
    "template_id" INTEGER NOT NULL,
    "template_key" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "status" "ClinicalFormStatus" NOT NULL DEFAULT 'DRAFT',
    "data_json" TEXT NOT NULL,
    "signed_by_user_id" TEXT,
    "signed_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalMedicationRecord" (
    "id" TEXT NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "form_response_id" TEXT,
    "inventory_item_id" INTEGER,
    "name" TEXT NOT NULL,
    "dose_value" DOUBLE PRECISION NOT NULL,
    "dose_unit" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "administered_at" TIMESTAMP(3),
    "administered_by" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by" TEXT,
    "void_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalMedicationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorPatientAssignment" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "status" "DoctorPatientAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discharged_at" TIMESTAMP(3),
    "transferred_at" TIMESTAMP(3),
    "transferred_to_doctor_id" TEXT,
    "transfer_reason" TEXT,
    "care_notes" TEXT,
    "discharge_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorPatientAssignment_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "idx_patient_firstname_search" ON "Patient"("first_name");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_user_id_key" ON "Doctor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_license_number_key" ON "Doctor"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_slug_key" ON "Doctor"("slug");

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
CREATE INDEX "AvailabilityOverride_doctor_id_idx" ON "AvailabilityOverride"("doctor_id");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_start_date_end_date_idx" ON "AvailabilityOverride"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_doctor_id_start_date_end_date_idx" ON "AvailabilityOverride"("doctor_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "AvailabilityTemplate_doctor_id_idx" ON "AvailabilityTemplate"("doctor_id");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_template_id_idx" ON "AvailabilitySlot"("template_id");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_template_id_day_of_week_idx" ON "AvailabilitySlot"("template_id", "day_of_week");

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
CREATE INDEX "Appointment_source_idx" ON "Appointment"("source");

-- CreateIndex
CREATE INDEX "Appointment_appointment_date_status_idx" ON "Appointment"("appointment_date", "status");

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
CREATE INDEX "Appointment_doctor_id_appointment_date_time_idx" ON "Appointment"("doctor_id", "appointment_date", "time");

-- CreateIndex
CREATE UNIQUE INDEX "unique_doctor_scheduled_slot" ON "Appointment"("doctor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "PatientQueue_patient_id_idx" ON "PatientQueue"("patient_id");

-- CreateIndex
CREATE INDEX "PatientQueue_doctor_id_idx" ON "PatientQueue"("doctor_id");

-- CreateIndex
CREATE INDEX "PatientQueue_appointment_id_idx" ON "PatientQueue"("appointment_id");

-- CreateIndex
CREATE INDEX "PatientQueue_status_idx" ON "PatientQueue"("status");

-- CreateIndex
CREATE INDEX "PatientQueue_added_at_idx" ON "PatientQueue"("added_at");

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
CREATE INDEX "Consultation_id_completed_at_idx" ON "Consultation"("id", "completed_at");

-- CreateIndex
CREATE INDEX "Consultation_last_activity_at_completed_at_idx" ON "Consultation"("last_activity_at", "completed_at");

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
CREATE UNIQUE INDEX "Payment_surgical_case_id_key" ON "Payment"("surgical_case_id");

-- CreateIndex
CREATE INDEX "Payment_patient_id_idx" ON "Payment"("patient_id");

-- CreateIndex
CREATE INDEX "Payment_appointment_id_idx" ON "Payment"("appointment_id");

-- CreateIndex
CREATE INDEX "Payment_surgical_case_id_idx" ON "Payment"("surgical_case_id");

-- CreateIndex
CREATE INDEX "Payment_bill_type_idx" ON "Payment"("bill_type");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_payment_date_idx" ON "Payment"("payment_date");

-- CreateIndex
CREATE INDEX "Payment_bill_date_idx" ON "Payment"("bill_date");

-- CreateIndex
CREATE INDEX "Payment_created_at_idx" ON "Payment"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "PatientBill_surgical_medication_record_id_key" ON "PatientBill"("surgical_medication_record_id");

-- CreateIndex
CREATE INDEX "PatientBill_payment_id_idx" ON "PatientBill"("payment_id");

-- CreateIndex
CREATE INDEX "PatientBill_service_id_idx" ON "PatientBill"("service_id");

-- CreateIndex
CREATE INDEX "PatientBill_surgical_medication_record_id_idx" ON "PatientBill"("surgical_medication_record_id");

-- CreateIndex
CREATE INDEX "PatientBill_payment_id_service_id_idx" ON "PatientBill"("payment_id", "service_id");

-- CreateIndex
CREATE INDEX "Service_service_name_idx" ON "Service"("service_name");

-- CreateIndex
CREATE INDEX "Service_category_idx" ON "Service"("category");

-- CreateIndex
CREATE INDEX "Service_is_active_idx" ON "Service"("is_active");

-- CreateIndex
CREATE INDEX "Service_price_type_idx" ON "Service"("price_type");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

-- CreateIndex
CREATE INDEX "InventoryItem_sku_idx" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "InventoryItem_is_active_idx" ON "InventoryItem"("is_active");

-- CreateIndex
CREATE INDEX "InventoryTransaction_inventory_item_id_idx" ON "InventoryTransaction"("inventory_item_id");

-- CreateIndex
CREATE INDEX "InventoryTransaction_type_idx" ON "InventoryTransaction"("type");

-- CreateIndex
CREATE INDEX "InventoryTransaction_created_at_idx" ON "InventoryTransaction"("created_at");

-- CreateIndex
CREATE INDEX "InventoryTransaction_reference_idx" ON "InventoryTransaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBatch_goods_receipt_id_key" ON "InventoryBatch"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "InventoryBatch_inventory_item_id_idx" ON "InventoryBatch"("inventory_item_id");

-- CreateIndex
CREATE INDEX "InventoryBatch_batch_number_idx" ON "InventoryBatch"("batch_number");

-- CreateIndex
CREATE INDEX "InventoryBatch_serial_number_idx" ON "InventoryBatch"("serial_number");

-- CreateIndex
CREATE INDEX "InventoryBatch_expiry_date_idx" ON "InventoryBatch"("expiry_date");

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Vendor_is_active_idx" ON "Vendor"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_po_number_key" ON "PurchaseOrder"("po_number");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendor_id_idx" ON "PurchaseOrder"("vendor_id");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_po_number_idx" ON "PurchaseOrder"("po_number");

-- CreateIndex
CREATE INDEX "PurchaseOrder_created_at_idx" ON "PurchaseOrder"("created_at");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchase_order_id_idx" ON "PurchaseOrderItem"("purchase_order_id");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_inventory_item_id_idx" ON "PurchaseOrderItem"("inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_receipt_number_key" ON "GoodsReceipt"("receipt_number");

-- CreateIndex
CREATE INDEX "GoodsReceipt_purchase_order_id_idx" ON "GoodsReceipt"("purchase_order_id");

-- CreateIndex
CREATE INDEX "GoodsReceipt_receipt_number_idx" ON "GoodsReceipt"("receipt_number");

-- CreateIndex
CREATE INDEX "GoodsReceipt_received_at_idx" ON "GoodsReceipt"("received_at");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_goods_receipt_id_idx" ON "GoodsReceiptItem"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_po_item_id_idx" ON "GoodsReceiptItem"("po_item_id");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_inventory_item_id_idx" ON "GoodsReceiptItem"("inventory_item_id");

-- CreateIndex
CREATE INDEX "StockAdjustment_inventory_item_id_idx" ON "StockAdjustment"("inventory_item_id");

-- CreateIndex
CREATE INDEX "StockAdjustment_adjusted_by_user_id_idx" ON "StockAdjustment"("adjusted_by_user_id");

-- CreateIndex
CREATE INDEX "StockAdjustment_created_at_idx" ON "StockAdjustment"("created_at");

-- CreateIndex
CREATE INDEX "StockAdjustment_adjustment_type_idx" ON "StockAdjustment"("adjustment_type");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUsage_bill_item_id_key" ON "InventoryUsage"("bill_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUsage_external_ref_key" ON "InventoryUsage"("external_ref");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUsage_surgical_medication_record_id_key" ON "InventoryUsage"("surgical_medication_record_id");

-- CreateIndex
CREATE INDEX "InventoryUsage_inventory_item_id_idx" ON "InventoryUsage"("inventory_item_id");

-- CreateIndex
CREATE INDEX "InventoryUsage_inventory_batch_id_idx" ON "InventoryUsage"("inventory_batch_id");

-- CreateIndex
CREATE INDEX "InventoryUsage_surgical_case_id_idx" ON "InventoryUsage"("surgical_case_id");

-- CreateIndex
CREATE INDEX "InventoryUsage_appointment_id_idx" ON "InventoryUsage"("appointment_id");

-- CreateIndex
CREATE INDEX "InventoryUsage_recorded_by_idx" ON "InventoryUsage"("recorded_by");

-- CreateIndex
CREATE INDEX "InventoryUsage_created_at_idx" ON "InventoryUsage"("created_at");

-- CreateIndex
CREATE INDEX "InventoryUsage_surgical_case_id_inventory_item_id_used_at_idx" ON "InventoryUsage"("surgical_case_id", "inventory_item_id", "used_at");

-- CreateIndex
CREATE INDEX "InventoryUsage_source_form_key_used_at_idx" ON "InventoryUsage"("source_form_key", "used_at");

-- CreateIndex
CREATE INDEX "InventoryUsage_used_by_user_id_used_at_idx" ON "InventoryUsage"("used_by_user_id", "used_at");

-- CreateIndex
CREATE INDEX "InventoryAuditEvent_actor_user_id_created_at_idx" ON "InventoryAuditEvent"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "InventoryAuditEvent_entity_type_entity_id_idx" ON "InventoryAuditEvent"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "InventoryAuditEvent_event_type_created_at_idx" ON "InventoryAuditEvent"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "InventoryAuditEvent_external_ref_idx" ON "InventoryAuditEvent"("external_ref");

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
CREATE UNIQUE INDEX "OutboxEvent_idempotency_key_key" ON "OutboxEvent"("idempotency_key");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_created_at_idx" ON "OutboxEvent"("status", "created_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_type_idx" ON "OutboxEvent"("type");

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
CREATE INDEX "CasePlanPlannedItem_case_plan_id_idx" ON "CasePlanPlannedItem"("case_plan_id");

-- CreateIndex
CREATE INDEX "CasePlanPlannedItem_inventory_item_id_idx" ON "CasePlanPlannedItem"("inventory_item_id");

-- CreateIndex
CREATE INDEX "CasePlanPlannedItem_service_id_idx" ON "CasePlanPlannedItem"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "CasePlanPlannedItem_case_plan_id_inventory_item_id_key" ON "CasePlanPlannedItem"("case_plan_id", "inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "CasePlanPlannedItem_case_plan_id_service_id_key" ON "CasePlanPlannedItem"("case_plan_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalProcedureRecord_case_plan_id_key" ON "SurgicalProcedureRecord"("case_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalProcedureRecord_surgical_case_id_key" ON "SurgicalProcedureRecord"("surgical_case_id");

-- CreateIndex
CREATE INDEX "SurgicalProcedureRecord_case_plan_id_idx" ON "SurgicalProcedureRecord"("case_plan_id");

-- CreateIndex
CREATE INDEX "SurgicalProcedureRecord_theater_id_idx" ON "SurgicalProcedureRecord"("theater_id");

-- CreateIndex
CREATE INDEX "SurgicalProcedureRecord_surgical_case_id_wheels_in_idx" ON "SurgicalProcedureRecord"("surgical_case_id", "wheels_in");

-- CreateIndex
CREATE INDEX "SurgicalStaff_procedure_record_id_idx" ON "SurgicalStaff"("procedure_record_id");

-- CreateIndex
CREATE INDEX "SurgicalStaff_user_id_idx" ON "SurgicalStaff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalStaff_procedure_record_id_user_id_role_key" ON "SurgicalStaff"("procedure_record_id", "user_id", "role");

-- CreateIndex
CREATE INDEX "StaffInvite_invited_user_id_status_idx" ON "StaffInvite"("invited_user_id", "status");

-- CreateIndex
CREATE INDEX "StaffInvite_surgical_case_id_idx" ON "StaffInvite"("surgical_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_active_invite" ON "StaffInvite"("surgical_case_id", "invited_user_id", "invited_role");

-- CreateIndex
CREATE INDEX "ConsentForm_case_plan_id_idx" ON "ConsentForm"("case_plan_id");

-- CreateIndex
CREATE INDEX "ConsentForm_status_idx" ON "ConsentForm"("status");

-- CreateIndex
CREATE INDEX "ConsentForm_template_id_idx" ON "ConsentForm"("template_id");

-- CreateIndex
CREATE INDEX "ConsentFormDocument_consent_form_id_idx" ON "ConsentFormDocument"("consent_form_id");

-- CreateIndex
CREATE INDEX "ConsentFormDocument_uploaded_at_idx" ON "ConsentFormDocument"("uploaded_at");

-- CreateIndex
CREATE INDEX "ConsentFormDocument_document_type_idx" ON "ConsentFormDocument"("document_type");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentSigningSession_consent_form_id_key" ON "ConsentSigningSession"("consent_form_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentSigningSession_qr_code_key" ON "ConsentSigningSession"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentSigningSession_token_key" ON "ConsentSigningSession"("token");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_qr_code_idx" ON "ConsentSigningSession"("qr_code");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_token_idx" ON "ConsentSigningSession"("token");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_expires_at_idx" ON "ConsentSigningSession"("expires_at");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_status_idx" ON "ConsentSigningSession"("status");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_requires_staff_verify_idx" ON "ConsentSigningSession"("requires_staff_verify");

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
CREATE INDEX "ConsentTemplate_template_format_idx" ON "ConsentTemplate"("template_format");

-- CreateIndex
CREATE INDEX "ConsentTemplate_status_idx" ON "ConsentTemplate"("status");

-- CreateIndex
CREATE INDEX "ConsentTemplate_created_by_idx" ON "ConsentTemplate"("created_by");

-- CreateIndex
CREATE INDEX "ConsentTemplateVersion_template_id_idx" ON "ConsentTemplateVersion"("template_id");

-- CreateIndex
CREATE INDEX "ConsentTemplateVersion_created_at_idx" ON "ConsentTemplateVersion"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTemplateVersion_template_id_version_number_key" ON "ConsentTemplateVersion"("template_id", "version_number");

-- CreateIndex
CREATE INDEX "ConsentTemplateAudit_template_id_idx" ON "ConsentTemplateAudit"("template_id");

-- CreateIndex
CREATE INDEX "ConsentTemplateAudit_actor_user_id_idx" ON "ConsentTemplateAudit"("actor_user_id");

-- CreateIndex
CREATE INDEX "ConsentTemplateAudit_action_idx" ON "ConsentTemplateAudit"("action");

-- CreateIndex
CREATE INDEX "ConsentTemplateAudit_created_at_idx" ON "ConsentTemplateAudit"("created_at");

-- CreateIndex
CREATE INDEX "ConsentTemplateAudit_template_id_created_at_idx" ON "ConsentTemplateAudit"("template_id", "created_at");

-- CreateIndex
CREATE INDEX "ConsentTemplateRelease_template_id_idx" ON "ConsentTemplateRelease"("template_id");

-- CreateIndex
CREATE INDEX "ConsentTemplateRelease_released_at_idx" ON "ConsentTemplateRelease"("released_at");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTemplateRelease_template_id_version_number_key" ON "ConsentTemplateRelease"("template_id", "version_number");

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
CREATE UNIQUE INDEX "intake_submission_session_id_key" ON "intake_submission"("session_id");

-- CreateIndex
CREATE INDEX "intake_submission_session_id_idx" ON "intake_submission"("session_id");

-- CreateIndex
CREATE INDEX "intake_submission_status_idx" ON "intake_submission"("status");

-- CreateIndex
CREATE INDEX "intake_submission_submitted_at_idx" ON "intake_submission"("submitted_at");

-- CreateIndex
CREATE INDEX "intake_submission_created_patient_id_idx" ON "intake_submission"("created_patient_id");

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
CREATE INDEX "SurgicalCase_primary_surgeon_id_status_updated_at_idx" ON "SurgicalCase"("primary_surgeon_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "TheaterBooking_surgical_case_id_key" ON "TheaterBooking"("surgical_case_id");

-- CreateIndex
CREATE INDEX "TheaterBooking_theater_id_idx" ON "TheaterBooking"("theater_id");

-- CreateIndex
CREATE INDEX "TheaterBooking_start_time_end_time_idx" ON "TheaterBooking"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "TheaterBooking_start_time_status_idx" ON "TheaterBooking"("start_time", "status");

-- CreateIndex
CREATE INDEX "TheaterBooking_theater_id_start_time_idx" ON "TheaterBooking"("theater_id", "start_time");

-- CreateIndex
CREATE INDEX "TheaterBooking_theater_id_end_time_idx" ON "TheaterBooking"("theater_id", "end_time");

-- CreateIndex
CREATE INDEX "TheaterBooking_status_idx" ON "TheaterBooking"("status");

-- CreateIndex
CREATE INDEX "TheaterBooking_status_lock_expires_at_idx" ON "TheaterBooking"("status", "lock_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalChecklist_surgical_case_id_key" ON "SurgicalChecklist"("surgical_case_id");

-- CreateIndex
CREATE INDEX "SurgicalChecklist_surgical_case_id_idx" ON "SurgicalChecklist"("surgical_case_id");

-- CreateIndex
CREATE INDEX "SurgicalCaseTeamMember_surgical_case_id_idx" ON "SurgicalCaseTeamMember"("surgical_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "SurgicalCaseTeamMember_surgical_case_id_role_key" ON "SurgicalCaseTeamMember"("surgical_case_id", "role");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_actor_user_id_idx" ON "ClinicalAuditEvent"("actor_user_id");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_entity_type_entity_id_idx" ON "ClinicalAuditEvent"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_action_type_idx" ON "ClinicalAuditEvent"("action_type");

-- CreateIndex
CREATE INDEX "ClinicalAuditEvent_created_at_idx" ON "ClinicalAuditEvent"("created_at");

-- CreateIndex
CREATE INDEX "ClinicalFormTemplate_key_is_active_idx" ON "ClinicalFormTemplate"("key", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalFormTemplate_key_version_key" ON "ClinicalFormTemplate"("key", "version");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_surgical_case_id_idx" ON "ClinicalFormResponse"("surgical_case_id");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_surgical_case_id_template_key_status_idx" ON "ClinicalFormResponse"("surgical_case_id", "template_key", "status");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_template_key_status_idx" ON "ClinicalFormResponse"("template_key", "status");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_patient_id_idx" ON "ClinicalFormResponse"("patient_id");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_status_idx" ON "ClinicalFormResponse"("status");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_template_key_idx" ON "ClinicalFormResponse"("template_key");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalFormResponse_template_key_template_version_surgical_key" ON "ClinicalFormResponse"("template_key", "template_version", "surgical_case_id");

-- CreateIndex
CREATE INDEX "SurgicalMedicationRecord_surgical_case_id_idx" ON "SurgicalMedicationRecord"("surgical_case_id");

-- CreateIndex
CREATE INDEX "SurgicalMedicationRecord_form_response_id_idx" ON "SurgicalMedicationRecord"("form_response_id");

-- CreateIndex
CREATE INDEX "SurgicalMedicationRecord_status_idx" ON "SurgicalMedicationRecord"("status");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_doctor_id_idx" ON "DoctorPatientAssignment"("doctor_id");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_patient_id_idx" ON "DoctorPatientAssignment"("patient_id");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_status_idx" ON "DoctorPatientAssignment"("status");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_assigned_at_idx" ON "DoctorPatientAssignment"("assigned_at");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_doctor_id_status_idx" ON "DoctorPatientAssignment"("doctor_id", "status");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_patient_id_status_idx" ON "DoctorPatientAssignment"("patient_id", "status");

-- CreateIndex
CREATE INDEX "DoctorPatientAssignment_transferred_to_doctor_id_idx" ON "DoctorPatientAssignment"("transferred_to_doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorPatientAssignment_doctor_id_patient_id_key" ON "DoctorPatientAssignment"("doctor_id", "patient_id");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityTemplate" ADD CONSTRAINT "AvailabilityTemplate_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "AvailabilityTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotConfiguration" ADD CONSTRAINT "SlotConfiguration_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_parent_appointment_id_fkey" FOREIGN KEY ("parent_appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_parent_consultation_id_fkey" FOREIGN KEY ("parent_consultation_id") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientQueue" ADD CONSTRAINT "PatientQueue_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientQueue" ADD CONSTRAINT "PatientQueue_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientQueue" ADD CONSTRAINT "PatientQueue_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseAssignment" ADD CONSTRAINT "NurseAssignment_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseAssignment" ADD CONSTRAINT "NurseAssignment_nurse_user_id_fkey" FOREIGN KEY ("nurse_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseAssignment" ADD CONSTRAINT "NurseAssignment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_nurse_user_id_fkey" FOREIGN KEY ("nurse_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_surgical_medication_record_id_fkey" FOREIGN KEY ("surgical_medication_record_id") REFERENCES "SurgicalMedicationRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "GoodsReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_received_by_user_id_fkey" FOREIGN KEY ("received_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_po_item_id_fkey" FOREIGN KEY ("po_item_id") REFERENCES "PurchaseOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_adjusted_by_user_id_fkey" FOREIGN KEY ("adjusted_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_bill_item_id_fkey" FOREIGN KEY ("bill_item_id") REFERENCES "PatientBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_inventory_batch_id_fkey" FOREIGN KEY ("inventory_batch_id") REFERENCES "InventoryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_surgical_medication_record_id_fkey" FOREIGN KEY ("surgical_medication_record_id") REFERENCES "SurgicalMedicationRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditEvent" ADD CONSTRAINT "InventoryAuditEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConsultation" ADD CONSTRAINT "DoctorConsultation_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConsultation" ADD CONSTRAINT "DoctorConsultation_consulting_doctor_id_fkey" FOREIGN KEY ("consulting_doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConsultation" ADD CONSTRAINT "DoctorConsultation_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorConsultation" ADD CONSTRAINT "DoctorConsultation_requesting_doctor_id_fkey" FOREIGN KEY ("requesting_doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationAttachment" ADD CONSTRAINT "ConsultationAttachment_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "DoctorConsultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "DoctorConsultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlanPlannedItem" ADD CONSTRAINT "CasePlanPlannedItem_case_plan_id_fkey" FOREIGN KEY ("case_plan_id") REFERENCES "CasePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlanPlannedItem" ADD CONSTRAINT "CasePlanPlannedItem_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlanPlannedItem" ADD CONSTRAINT "CasePlanPlannedItem_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalProcedureRecord" ADD CONSTRAINT "SurgicalProcedureRecord_case_plan_id_fkey" FOREIGN KEY ("case_plan_id") REFERENCES "CasePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalProcedureRecord" ADD CONSTRAINT "SurgicalProcedureRecord_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalProcedureRecord" ADD CONSTRAINT "SurgicalProcedureRecord_theater_id_fkey" FOREIGN KEY ("theater_id") REFERENCES "Theater"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalStaff" ADD CONSTRAINT "SurgicalStaff_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "SurgicalProcedureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalStaff" ADD CONSTRAINT "SurgicalStaff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_procedure_record_id_fkey" FOREIGN KEY ("procedure_record_id") REFERENCES "SurgicalProcedureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_case_plan_id_fkey" FOREIGN KEY ("case_plan_id") REFERENCES "CasePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ConsentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentForm" ADD CONSTRAINT "ConsentForm_witness_id_fkey" FOREIGN KEY ("witness_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentFormDocument" ADD CONSTRAINT "ConsentFormDocument_consent_form_id_fkey" FOREIGN KEY ("consent_form_id") REFERENCES "ConsentForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentFormDocument" ADD CONSTRAINT "ConsentFormDocument_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentSigningSession" ADD CONSTRAINT "ConsentSigningSession_consent_form_id_fkey" FOREIGN KEY ("consent_form_id") REFERENCES "ConsentForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentSigningSession" ADD CONSTRAINT "ConsentSigningSession_verified_by_staff_id_fkey" FOREIGN KEY ("verified_by_staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentSigningSession" ADD CONSTRAINT "ConsentSigningSession_witness_id_fkey" FOREIGN KEY ("witness_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImage" ADD CONSTRAINT "PatientImage_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImage" ADD CONSTRAINT "PatientImage_case_plan_id_fkey" FOREIGN KEY ("case_plan_id") REFERENCES "CasePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientImage" ADD CONSTRAINT "PatientImage_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalTask" ADD CONSTRAINT "ClinicalTask_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalTask" ADD CONSTRAINT "ClinicalTask_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalOutcome" ADD CONSTRAINT "SurgicalOutcome_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalOutcome" ADD CONSTRAINT "SurgicalOutcome_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalOutcome" ADD CONSTRAINT "SurgicalOutcome_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateVersion" ADD CONSTRAINT "ConsentTemplateVersion_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ConsentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateAudit" ADD CONSTRAINT "ConsentTemplateAudit_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateAudit" ADD CONSTRAINT "ConsentTemplateAudit_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ConsentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateRelease" ADD CONSTRAINT "ConsentTemplateRelease_released_by_user_id_fkey" FOREIGN KEY ("released_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTemplateRelease" ADD CONSTRAINT "ConsentTemplateRelease_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ConsentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submission" ADD CONSTRAINT "intake_submission_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intake_session"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCase" ADD CONSTRAINT "SurgicalCase_primary_surgeon_id_fkey" FOREIGN KEY ("primary_surgeon_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterBooking" ADD CONSTRAINT "TheaterBooking_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterBooking" ADD CONSTRAINT "TheaterBooking_theater_id_fkey" FOREIGN KEY ("theater_id") REFERENCES "Theater"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_sign_in_by_user_id_fkey" FOREIGN KEY ("sign_in_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_sign_out_by_user_id_fkey" FOREIGN KEY ("sign_out_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalChecklist" ADD CONSTRAINT "SurgicalChecklist_time_out_by_user_id_fkey" FOREIGN KEY ("time_out_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalCaseTeamMember" ADD CONSTRAINT "SurgicalCaseTeamMember_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAuditEvent" ADD CONSTRAINT "ClinicalAuditEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_signed_by_user_id_fkey" FOREIGN KEY ("signed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ClinicalFormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalMedicationRecord" ADD CONSTRAINT "SurgicalMedicationRecord_form_response_id_fkey" FOREIGN KEY ("form_response_id") REFERENCES "ClinicalFormResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalMedicationRecord" ADD CONSTRAINT "SurgicalMedicationRecord_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalMedicationRecord" ADD CONSTRAINT "SurgicalMedicationRecord_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientAssignment" ADD CONSTRAINT "DoctorPatientAssignment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientAssignment" ADD CONSTRAINT "DoctorPatientAssignment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientAssignment" ADD CONSTRAINT "DoctorPatientAssignment_transferred_to_doctor_id_fkey" FOREIGN KEY ("transferred_to_doctor_id") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

