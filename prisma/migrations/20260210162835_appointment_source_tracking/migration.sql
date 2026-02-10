-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('PATIENT_REQUESTED', 'FRONTDESK_SCHEDULED', 'DOCTOR_FOLLOW_UP', 'ADMIN_SCHEDULED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "parent_appointment_id" INTEGER,
ADD COLUMN     "parent_consultation_id" INTEGER,
ADD COLUMN     "source" "AppointmentSource" NOT NULL DEFAULT 'PATIENT_REQUESTED';

-- CreateIndex
CREATE INDEX "Appointment_source_idx" ON "Appointment"("source");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_parent_appointment_id_fkey" FOREIGN KEY ("parent_appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_parent_consultation_id_fkey" FOREIGN KEY ("parent_consultation_id") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
