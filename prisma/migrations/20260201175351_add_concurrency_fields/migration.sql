-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "locked_at" TIMESTAMP(3),
ADD COLUMN     "locked_by" TEXT,
ADD COLUMN     "resource_id" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TheaterBooking" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
