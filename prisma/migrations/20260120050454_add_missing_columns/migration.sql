-- CreateEnum
CREATE TYPE "ConsultUrgency" AS ENUM ('ROUTINE', 'URGENT', 'INTRA_OP');

-- CreateEnum
CREATE TYPE "ConsultStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ImageTimepoint" AS ENUM ('PRE_OP', 'ONE_WEEK_POST_OP', 'ONE_MONTH_POST_OP', 'THREE_MONTHS_POST_OP', 'SIX_MONTHS_POST_OP', 'ONE_YEAR_POST_OP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ImageAngle" AS ENUM ('FRONT', 'OBLIQUE_LEFT', 'OBLIQUE_RIGHT', 'PROFILE_LEFT', 'PROFILE_RIGHT', 'BACK', 'TOP', 'BOTTOM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CaseReadinessStatus" AS ENUM ('NOT_STARTED', 'PENDING_LABS', 'PENDING_CONSENT', 'PENDING_REVIEW', 'READY', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_REVISION', 'COMPLICATION');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "late_arrival" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "late_by_minutes" INTEGER,
ADD COLUMN     "no_show" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "no_show_at" TIMESTAMP(3),
ADD COLUMN     "no_show_notes" TEXT,
ADD COLUMN     "no_show_reason" TEXT,
ADD COLUMN     "rescheduled_to_appointment_id" INTEGER;

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "duration_minutes" INTEGER,
ADD COLUMN     "outcome_type" TEXT,
ADD COLUMN     "patient_decision" TEXT;

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
CREATE INDEX "CasePlan_appointment_id_idx" ON "CasePlan"("appointment_id");

-- CreateIndex
CREATE INDEX "CasePlan_patient_id_idx" ON "CasePlan"("patient_id");

-- CreateIndex
CREATE INDEX "CasePlan_doctor_id_idx" ON "CasePlan"("doctor_id");

-- CreateIndex
CREATE INDEX "CasePlan_readiness_status_idx" ON "CasePlan"("readiness_status");

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
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
