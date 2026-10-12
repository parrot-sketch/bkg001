-- Only appointments that hold the doctor's time may not share a doctor + scheduled_at.
-- Unconfirmed requests, cancellations and no-shows may overlap.
-- Keep the status list in sync with NON_BLOCKING_APPOINTMENT_STATUSES (domain/enums/AppointmentStatus.ts).
-- Prisma 6 cannot express partial indexes, so this index is not declared in schema.prisma.

DROP INDEX IF EXISTS "unique_doctor_scheduled_slot";

CREATE UNIQUE INDEX "unique_doctor_scheduled_slot" ON "Appointment"("doctor_id", "scheduled_at")
WHERE "status" NOT IN ('PENDING', 'PENDING_DOCTOR_CONFIRMATION', 'CANCELLED', 'NO_SHOW');
