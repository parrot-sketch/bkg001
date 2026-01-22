-- Migration: Prevent Double Booking with Unique Index
-- 
-- CRITICAL: This migration adds a database-level unique constraint
-- to prevent double booking of appointments.
--
-- The unique index applies only to non-cancelled appointments,
-- allowing cancelled appointments to be rescheduled at the same time.
--
-- This is a hard guarantee: even if application code fails,
-- the database will never allow double booking.
--
-- Index Name: appointment_no_double_booking
-- Constraint: (doctor_id, appointment_date, time) must be unique
-- Condition: Only applies when status != 'CANCELLED'
--
-- Note: Using CONCURRENTLY to avoid locking the table during creation
-- This allows the migration to run in production without downtime.

-- Create unique partial index to prevent double booking
-- This index ensures no two non-cancelled appointments can have the same
-- doctor, date, and time combination
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS appointment_no_double_booking
ON "Appointment" (doctor_id, appointment_date, time)
WHERE status != 'CANCELLED';

-- Add comment for documentation
COMMENT ON INDEX appointment_no_double_booking IS 
'Prevents double booking by ensuring unique (doctor_id, appointment_date, time) for non-cancelled appointments';
