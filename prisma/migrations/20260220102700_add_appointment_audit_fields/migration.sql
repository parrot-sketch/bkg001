-- CreateEnum (only if it doesn't exist - it was created in 20260211000000_add_appointment_audit_fields)
DO $$ BEGIN
    CREATE TYPE "BookingChannel" AS ENUM ('DASHBOARD', 'PATIENT_LIST', 'PATIENT_PROFILE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable (only add columns if they don't exist)
DO $$ BEGIN
    ALTER TABLE "Appointment" ADD COLUMN "created_by_user_id" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Appointment" ADD COLUMN "booking_channel" "BookingChannel";
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- AddForeignKey (only if it doesn't exist)
DO $$ BEGIN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
