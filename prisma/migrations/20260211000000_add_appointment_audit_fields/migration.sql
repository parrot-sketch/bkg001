-- CreateEnum
CREATE TYPE "BookingChannel" AS ENUM ('DASHBOARD', 'PATIENT_LIST', 'PATIENT_PROFILE');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "created_by_user_id" TEXT,
ADD COLUMN "booking_channel" "BookingChannel";

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
