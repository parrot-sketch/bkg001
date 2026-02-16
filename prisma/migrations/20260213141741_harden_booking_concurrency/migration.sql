-- AlterTable
ALTER TABLE "TheaterBooking" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_by" TEXT,
ADD COLUMN     "lock_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TheaterBooking_theater_id_end_time_idx" ON "TheaterBooking"("theater_id", "end_time");

-- CreateIndex
CREATE INDEX "TheaterBooking_status_lock_expires_at_idx" ON "TheaterBooking"("status", "lock_expires_at");
