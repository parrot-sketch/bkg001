-- Update Theater pricing to match operational rates (KES per minute).
-- The system stores Theater.hourly_rate as KES/hour.
--
-- Main Theater:  100 KES/min -> 6,000 KES/hour
-- Minor Theater:  50 KES/min -> 3,000 KES/hour

UPDATE "Theater"
SET "hourly_rate" = 6000
WHERE "name" ILIKE '%main%' OR ("type" = 'MAJOR' AND "name" ILIKE '%theater%');

UPDATE "Theater"
SET "hourly_rate" = 3000
WHERE "name" ILIKE '%minor%' OR ("type" = 'MINOR' AND "name" ILIKE '%theater%');

