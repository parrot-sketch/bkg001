/*
  Warnings:

  - You are about to drop the `AvailabilityBreak` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScheduleSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkingDay` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AvailabilityBreak" DROP CONSTRAINT "AvailabilityBreak_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "AvailabilityBreak" DROP CONSTRAINT "AvailabilityBreak_working_day_id_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleSession" DROP CONSTRAINT "ScheduleSession_working_day_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkingDay" DROP CONSTRAINT "WorkingDay_doctor_id_fkey";

-- DropTable
DROP TABLE "AvailabilityBreak";

-- DropTable
DROP TABLE "ScheduleSession";

-- DropTable
DROP TABLE "WorkingDay";

-- CreateTable
CREATE TABLE "AvailabilityTemplate" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_type" TEXT DEFAULT 'CLINIC',
    "max_patients" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityTemplate_doctor_id_idx" ON "AvailabilityTemplate"("doctor_id");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_template_id_idx" ON "AvailabilitySlot"("template_id");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_template_id_day_of_week_idx" ON "AvailabilitySlot"("template_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "AvailabilityTemplate" ADD CONSTRAINT "AvailabilityTemplate_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "AvailabilityTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
