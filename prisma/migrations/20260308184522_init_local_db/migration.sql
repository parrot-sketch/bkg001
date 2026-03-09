-- DropIndex
DROP INDEX "Appointment_doctor_id_scheduled_at_scheduled_end_at_idx";

-- DropIndex
DROP INDEX "Appointment_scheduled_end_at_idx";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "duration_minutes" DROP NOT NULL,
ALTER COLUMN "duration_minutes" DROP DEFAULT;
