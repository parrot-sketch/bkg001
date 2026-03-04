-- CreateEnum
CREATE TYPE "DoctorPatientAssignmentStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'TRANSFERRED', 'INACTIVE');

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
CREATE UNIQUE INDEX "DoctorPatientAssignment_doctor_id_patient_id_key" ON "DoctorPatientAssignment"("doctor_id", "patient_id");

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

-- AddForeignKey
ALTER TABLE "DoctorPatientAssignment" ADD CONSTRAINT "DoctorPatientAssignment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientAssignment" ADD CONSTRAINT "DoctorPatientAssignment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientAssignment" ADD CONSTRAINT "DoctorPatientAssignment_transferred_to_doctor_id_fkey" FOREIGN KEY ("transferred_to_doctor_id") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
