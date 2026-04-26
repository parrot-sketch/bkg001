-- Production DB audit (read-only)
-- Safe to run multiple times.

select current_database() as db, current_schema() as schema;

select
  to_regclass('public._prisma_migrations') as has__prisma_migrations,
  to_regclass('public.prisma_migrations') as has_prisma_migrations;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'SurgicalCase'
  and column_name in ('id','patient_id','primary_surgeon_id','consultation_id','appointment_id')
order by column_name;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'SurgicalCase'
  and indexdef ilike '%appointment_id%'
order by indexname;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public."SurgicalCase"'::regclass
  and (conname ilike '%appointment%' or pg_get_constraintdef(oid) ilike '%appointment_id%')
order by conname;

-- Duplicate detection (only if appointment_id exists)
DO $$
DECLARE
  has_col boolean;
  dupes jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'SurgicalCase'
      AND column_name = 'appointment_id'
  ) INTO has_col;

  IF NOT has_col THEN
    RAISE NOTICE 'Skipping duplicate check: SurgicalCase.appointment_id does not exist yet.';
    RETURN;
  END IF;

  EXECUTE $sql$
    select coalesce(
      jsonb_agg(jsonb_build_object('appointment_id', appointment_id, 'count', cnt)),
      '[]'::jsonb
    )
    from (
      select appointment_id, count(*) as cnt
      from "SurgicalCase"
      where appointment_id is not null
      group by appointment_id
      having count(*) > 1
    ) t
  $sql$
  INTO dupes;

  RAISE NOTICE 'Duplicate appointment links (should be []): %', dupes;
END $$;
