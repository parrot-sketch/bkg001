/**
 * SAFE Production DB sync script (no data loss).
 *
 * This script is intentionally conservative:
 * - No seeding
 * - No truncation
 * - No "baseline all migrations" behavior
 * - Applies only the idempotent patch migrations we explicitly allow-list
 *
 * Usage:
 *   pnpm tsx scripts/baseline-and-sync-production.ts
 *
 * Requirements:
 * - `.env.production` contains DATABASE_URL for Aiven
 * - `psql` is installed on the machine running this script
 */

import path from 'path';
import { loadProductionDatabaseUrlFromEnvFile } from './production/_prodEnv';
import { runPsql, runPsqlFile } from './production/_psql';

const ALLOWLISTED_IDEMPOTENT_MIGRATIONS = [
  path.join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260426000000_link_surgical_case_to_appointment',
    'migration.sql',
  ),
  path.join(
    process.cwd(),
    'scripts',
    'production',
    'patches',
    '20260522_add_schedule_setup_to_doctor_onboarding.sql',
  ),
] as const;

function hasPrismaMigrationsTable(databaseUrl: string): boolean {
  const result = runPsql(
    databaseUrl,
    "select to_regclass('public._prisma_migrations') is not null;",
  ).stdout.trim();
  return result === 't' || result === 'true' || result === '1';
}

function hasSurgicalCaseAppointmentId(databaseUrl: string): boolean {
  const result = runPsql(
    databaseUrl,
    `
      select count(*)::int
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'SurgicalCase'
        and column_name = 'appointment_id';
    `,
  ).stdout.trim();
  return result === '1';
}

async function main(): Promise<void> {
  console.log('🔒 Production DB SAFE sync (no data loss)');
  const databaseUrl = loadProductionDatabaseUrlFromEnvFile('.env.production');

  console.log('🧪 Audit: checking Prisma migration tracking...');
  const hasMigrateTable = hasPrismaMigrationsTable(databaseUrl);
  if (hasMigrateTable) {
    console.log('   ✅ Found public._prisma_migrations');
    console.log('   ℹ️  This script will NOT run prisma migrate deploy automatically.');
  } else {
    console.log('   ⚠️  public._prisma_migrations is missing (expected on current production).');
    console.log('   ✅ Will use allowlisted idempotent SQL patches only.');
  }

  console.log('🧪 Audit: checking SurgicalCase.appointment_id...');
  if (hasSurgicalCaseAppointmentId(databaseUrl)) {
    console.log('   ✅ appointment_id already present. No action needed for this release.');
    return;
  }

  console.log('🧩 Applying allowlisted idempotent patches...');
  for (const filePath of ALLOWLISTED_IDEMPOTENT_MIGRATIONS) {
    console.log(`   ➜ ${path.relative(process.cwd(), filePath)}`);
    runPsqlFile(databaseUrl, filePath);
  }

  console.log('✅ Verifying appointment_id exists...');
  if (!hasSurgicalCaseAppointmentId(databaseUrl)) {
    throw new Error('Verification failed: SurgicalCase.appointment_id is still missing after patch');
  }

  console.log('🎉 Production DB patch applied safely.');
}

main().catch((err) => {
  console.error('❌ SAFE production sync failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
