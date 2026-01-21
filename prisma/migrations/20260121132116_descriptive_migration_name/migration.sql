-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "slot_duration" INTEGER,
ADD COLUMN     "slot_start_time" TEXT;

-- CreateTable
CREATE TABLE "AvailabilityOverride" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityBreak" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "working_day_id" INTEGER,
    "day_of_week" TEXT,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotConfiguration" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "default_duration" INTEGER NOT NULL DEFAULT 30,
    "buffer_time" INTEGER NOT NULL DEFAULT 0,
    "slot_interval" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityOverride_doctor_id_idx" ON "AvailabilityOverride"("doctor_id");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_start_date_end_date_idx" ON "AvailabilityOverride"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_doctor_id_start_date_end_date_idx" ON "AvailabilityOverride"("doctor_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "AvailabilityBreak_doctor_id_idx" ON "AvailabilityBreak"("doctor_id");

-- CreateIndex
CREATE INDEX "AvailabilityBreak_working_day_id_idx" ON "AvailabilityBreak"("working_day_id");

-- CreateIndex
CREATE INDEX "AvailabilityBreak_doctor_id_day_of_week_idx" ON "AvailabilityBreak"("doctor_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "SlotConfiguration_doctor_id_key" ON "SlotConfiguration"("doctor_id");

-- CreateIndex
CREATE INDEX "SlotConfiguration_doctor_id_idx" ON "SlotConfiguration"("doctor_id");

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBreak" ADD CONSTRAINT "AvailabilityBreak_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBreak" ADD CONSTRAINT "AvailabilityBreak_working_day_id_fkey" FOREIGN KEY ("working_day_id") REFERENCES "WorkingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotConfiguration" ADD CONSTRAINT "SlotConfiguration_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
