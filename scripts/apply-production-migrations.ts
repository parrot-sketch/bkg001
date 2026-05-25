#!/usr/bin/env tsx
/**
 * Production Migration Runner (SAFE default)
 *
 * Production currently has **no** `public._prisma_migrations` table, and is known to have schema drift.
 * Running `prisma migrate deploy` directly can attempt to apply the entire migrations history and fail.
 *
 * This runner:
 * - Generates Prisma client (safe)
 * - Audits production DB state (read-only)
 * - Applies only allowlisted idempotent SQL patches needed for the current release
 *
 * Usage:
 *   pnpm tsx scripts/apply-production-migrations.ts
 *
 * Notes:
 * - Requires `psql` installed on the machine running it
 * - Uses `.env.production` for DATABASE_URL
 */

import path from 'path';
import { execSync } from 'child_process';
import { loadProductionDatabaseUrlFromEnvFile } from './production/_prodEnv';
import { runPsql, runPsqlFile } from './production/_psql';

const PATCH_MIGRATIONS = [
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

function hasDoctorOnboardingScheduleSetup(databaseUrl: string): boolean {
  const result = runPsql(
    databaseUrl,
    `
      select count(*)::int
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'DoctorOnboardingStatus'
        and e.enumlabel = 'SCHEDULE_SETUP';
    `,
  ).stdout.trim();
  return result === '1';
}

function ensureNoDuplicateAppointmentLinks(databaseUrl: string): void {
  const dupes = runPsql(
    databaseUrl,
    `
      select appointment_id
      from "SurgicalCase"
      where appointment_id is not null
      group by appointment_id
      having count(*) > 1;
    `,
  ).stdout.trim();

  if (dupes.length > 0) {
    throw new Error(
      `Safety check failed: duplicate SurgicalCase.appointment_id values detected: ${dupes}`,
    );
  }
}

async function main(): Promise<void> {
  const databaseUrl = loadProductionDatabaseUrlFromEnvFile('.env.production');
  console.log('🔗 Production migration runner (safe mode)');

  console.log('📦 Generating Prisma client...');
  execSync('pnpm -s prisma generate', { stdio: 'inherit' });

  const hasMigrateTable = hasPrismaMigrationsTable(databaseUrl);
  if (hasMigrateTable) {
    console.log('✅ public._prisma_migrations exists.');
    console.log('ℹ️  Not running prisma migrate deploy automatically (production drift risk).');
    console.log('   Use the runbook: scripts/production/PRODUCTION_DB_RUNBOOK.md');
  } else {
    console.log('⚠️  public._prisma_migrations is missing (expected on current production).');
  }

  ensureNoDuplicateAppointmentLinks(databaseUrl);

  const needsAppointmentLinkPatch = !hasSurgicalCaseAppointmentId(databaseUrl);
  const needsOnboardingEnumPatch = !hasDoctorOnboardingScheduleSetup(databaseUrl);
  if (!needsAppointmentLinkPatch && !needsOnboardingEnumPatch) {
    console.log('✅ No allowlisted patches required.');
    return;
  }

  console.log('🧩 Applying idempotent patch migrations...');
  for (const filePath of PATCH_MIGRATIONS) {
    // Apply only what is needed for this DB (avoid unnecessary DDL).
    if (filePath.includes('link_surgical_case_to_appointment') && !needsAppointmentLinkPatch) continue;
    if (filePath.includes('add_schedule_setup_to_doctor_onboarding') && !needsOnboardingEnumPatch) continue;
    console.log(`   ➜ ${path.relative(process.cwd(), filePath)}`);
    runPsqlFile(databaseUrl, filePath);
  }

  if (needsAppointmentLinkPatch && !hasSurgicalCaseAppointmentId(databaseUrl)) {
    throw new Error('Patch applied, but SurgicalCase.appointment_id still missing');
  }
  if (needsOnboardingEnumPatch && !hasDoctorOnboardingScheduleSetup(databaseUrl)) {
    throw new Error('Patch applied, but DoctorOnboardingStatus.SCHEDULE_SETUP still missing');
  }

  console.log('✅ Production DB patched successfully (no data loss).');
}

main().catch((error) => {
  console.error('❌ Production migration runner failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
