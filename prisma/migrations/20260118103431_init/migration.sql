/*
  Warnings:

  - You are about to drop the column `medical_id` on the `Diagnosis` table. All the data in the column will be lost.
  - You are about to drop the column `record_id` on the `LabTest` table. All the data in the column will be lost.
  - You are about to drop the column `bill_id` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `staff_id` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the `MedicalRecords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PatientBills` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Staff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VitalSigns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkingDays` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `Doctor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[license_number]` on the table `Doctor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[receipt_number]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doctor_id,patient_id]` on the table `Rating` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `medical_record_id` to the `Diagnosis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medical_record_id` to the `LabTest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doctor_id` to the `Rating` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CareNoteType" AS ENUM ('PRE_OP', 'POST_OP', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'MOBILE_MONEY';
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'FRONTDESK';

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "Diagnosis" DROP CONSTRAINT "Diagnosis_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "Diagnosis" DROP CONSTRAINT "Diagnosis_medical_id_fkey";

-- DropForeignKey
ALTER TABLE "LabTest" DROP CONSTRAINT "LabTest_record_id_fkey";

-- DropForeignKey
ALTER TABLE "LabTest" DROP CONSTRAINT "LabTest_service_id_fkey";

-- DropForeignKey
ALTER TABLE "MedicalRecords" DROP CONSTRAINT "MedicalRecords_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "MedicalRecords" DROP CONSTRAINT "MedicalRecords_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "PatientBills" DROP CONSTRAINT "PatientBills_bill_id_fkey";

-- DropForeignKey
ALTER TABLE "PatientBills" DROP CONSTRAINT "PatientBills_service_id_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "VitalSigns" DROP CONSTRAINT "VitalSigns_medical_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkingDays" DROP CONSTRAINT "WorkingDays_doctor_id_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "checked_in_at" TIMESTAMP(3),
ADD COLUMN     "checked_in_by" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Diagnosis" DROP COLUMN "medical_id",
ADD COLUMN     "medical_record_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "availability_status" SET DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "LabTest" DROP COLUMN "record_id",
ADD COLUMN     "medical_record_id" INTEGER NOT NULL,
ALTER COLUMN "service_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "assigned_to_user_id" TEXT,
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "gender" SET DEFAULT 'FEMALE',
ALTER COLUMN "medical_consent" SET DEFAULT false,
ALTER COLUMN "privacy_consent" SET DEFAULT false,
ALTER COLUMN "service_consent" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "bill_id",
ALTER COLUMN "payment_date" DROP NOT NULL,
ALTER COLUMN "discount" SET DEFAULT 0,
ALTER COLUMN "amount_paid" SET DEFAULT 0,
ALTER COLUMN "receipt_number" DROP NOT NULL,
ALTER COLUMN "receipt_number" DROP DEFAULT,
ALTER COLUMN "receipt_number" SET DATA TYPE TEXT;
DROP SEQUENCE "Payment_receipt_number_seq";

-- AlterTable
ALTER TABLE "Rating" DROP COLUMN "staff_id",
ADD COLUMN     "doctor_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "MedicalRecords";

-- DropTable
DROP TABLE "PatientBills";

-- DropTable
DROP TABLE "Services";

-- DropTable
DROP TABLE "Staff";

-- DropTable
DROP TABLE "VitalSigns";

-- DropTable
DROP TABLE "WorkingDays";

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
CREATE TABLE "Consultation" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "user_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "doctor_notes" TEXT,
    "outcome" TEXT,
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
CREATE INDEX "WorkingDay_doctor_id_idx" ON "WorkingDay"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDay_doctor_id_day_key" ON "WorkingDay"("doctor_id", "day");

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
CREATE INDEX "Notification_user_id_idx" ON "Notification"("user_id");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_sent_at_idx" ON "Notification"("sent_at");

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
CREATE INDEX "Diagnosis_patient_id_idx" ON "Diagnosis"("patient_id");

-- CreateIndex
CREATE INDEX "Diagnosis_medical_record_id_idx" ON "Diagnosis"("medical_record_id");

-- CreateIndex
CREATE INDEX "Diagnosis_doctor_id_idx" ON "Diagnosis"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_user_id_key" ON "Doctor"("user_id");

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
CREATE INDEX "LabTest_medical_record_id_idx" ON "LabTest"("medical_record_id");

-- CreateIndex
CREATE INDEX "LabTest_test_date_idx" ON "LabTest"("test_date");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_user_id_key" ON "Patient"("user_id");

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
CREATE INDEX "Rating_doctor_id_idx" ON "Rating"("doctor_id");

-- CreateIndex
CREATE INDEX "Rating_patient_id_idx" ON "Rating"("patient_id");

-- CreateIndex
CREATE INDEX "Rating_rating_idx" ON "Rating"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_doctor_id_patient_id_key" ON "Rating"("doctor_id", "patient_id");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingDay" ADD CONSTRAINT "WorkingDay_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
