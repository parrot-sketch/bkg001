-- Check Dr. Ken's schedule configuration
-- Run with: psql $DATABASE_URL -f scripts/check-ken-schedule.sql

-- Find Dr. Ken
SELECT 
  d.id as doctor_id,
  d.name as doctor_name,
  d.email,
  d.user_id
FROM "Doctor" d
WHERE d.name ILIKE '%ken%' OR d.email ILIKE '%ken%'
LIMIT 1;

-- Get active template and slots
SELECT 
  at.id as template_id,
  at.name as template_name,
  at.is_active,
  avs.day_of_week,
  avs.start_time,
  avs.end_time,
  avs.slot_type,
  avs.id as slot_id
FROM "AvailabilityTemplate" at
JOIN "AvailabilitySlot" avs ON avs.template_id = at.id
WHERE at.doctor_id = (SELECT id FROM "Doctor" WHERE name ILIKE '%ken%' OR email ILIKE '%ken%' LIMIT 1)
  AND at.is_active = true
ORDER BY avs.day_of_week, avs.start_time;

-- Get slot configuration
SELECT 
  sc.default_duration,
  sc.slot_interval,
  sc.buffer_time
FROM "SlotConfiguration" sc
WHERE sc.doctor_id = (SELECT id FROM "Doctor" WHERE name ILIKE '%ken%' OR email ILIKE '%ken%' LIMIT 1);

-- Get today's appointments
SELECT 
  a.id,
  a.appointment_date,
  a.time,
  a.status,
  a.type,
  p.first_name || ' ' || p.last_name as patient_name
FROM "Appointment" a
JOIN "Patient" p ON p.id = a.patient_id
WHERE a.doctor_id = (SELECT id FROM "Doctor" WHERE name ILIKE '%ken%' OR email ILIKE '%ken%' LIMIT 1)
  AND a.appointment_date >= CURRENT_DATE
  AND a.appointment_date < CURRENT_DATE + INTERVAL '1 day'
ORDER BY a.appointment_date, a.time;
