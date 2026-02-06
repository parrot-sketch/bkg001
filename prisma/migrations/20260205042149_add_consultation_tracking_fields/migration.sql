-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "consultation_duration" INTEGER,
ADD COLUMN     "consultation_ended_at" TIMESTAMP(3),
ADD COLUMN     "consultation_started_at" TIMESTAMP(3);
