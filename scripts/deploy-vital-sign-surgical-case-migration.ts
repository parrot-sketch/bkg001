#!/usr/bin/env node
/**
 * Deploy VitalSign.surgical_case_id migration to production
 *
 * Adds the surgical_case_id column to the VitalSign table, along with
 * an index and foreign key constraint.
 *
 * Usage:
 *   npx tsx scripts/deploy-vital-sign-surgical-case-migration.ts            # Apply migration
 *   npx tsx scripts/deploy-vital-sign-surgical-case-migration.ts --dry-run  # Preview only
 *
 * Requires PROD_DIRECT_URL in .env
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const PROD_DIRECT_URL = process.env.PROD_DIRECT_URL;

if (!PROD_DIRECT_URL) {
  console.error('❌ PROD_DIRECT_URL is not set in .env');
  console.error('   Add it to your .env file with the production database connection string.');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

// Override DATABASE_URL to ensure Prisma connects to production
process.env.DATABASE_URL = PROD_DIRECT_URL;

const prisma = new PrismaClient();

async function getCurrentDatabase() {
  try {
    const result = await prisma.$queryRaw`SELECT current_database() as db_name`;
    return result[0]?.db_name || 'unknown';
  } catch (error) {
    return 'unknown (error: ' + error.message + ')';
  }
}

async function getVitalSignColumnExists() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'VitalSign'
        AND column_name = 'surgical_case_id'
    `;
    return result.length > 0;
  } catch (error) {
    return false;
  }
}

async function executeStep(description: string, sql: string) {
  console.log(`  → ${description}...`);
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`    ✓ ${description} complete`);
  } catch (error) {
    console.error(`    ✗ ${description} failed:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🔍 Checking database connection...\n');

  const dbName = await getCurrentDatabase();
  console.log(`📊 Connected to database: ${dbName}`);

  if (isDryRun) {
    console.log('\n🏃 DRY RUN MODE - No changes will be made\n');
  }

  const vitalSignColumnExists = await getVitalSignColumnExists();
  console.log('\nVitalSign.surgical_case_id column:');
  console.log(`  ${vitalSignColumnExists ? '✅ Already exists' : '❌ Missing - needs migration'}`);

  if (vitalSignColumnExists) {
    console.log('\n✅ Migration already applied. No changes needed.');
    await prisma.$disconnect();
    return;
  }

  if (isDryRun) {
    console.log('\n✅ Dry run complete. Run without --dry-run to apply migration.');
    await prisma.$disconnect();
    return;
  }

  // Confirm this is production
  console.log('\n⚠️  WARNING: This will modify the production database!');
  console.log(`   Database: ${dbName}`);

  // Simple confirmation
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>(resolve => {
    rl.question('   Type "yes" to confirm: ', resolve);
  });
  rl.close();

  if (answer !== 'yes') {
    console.log('❌ Migration cancelled.');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('\n🚀 Applying VitalSign.surgical_case_id migration to production...\n');

  try {
    await executeStep(
      'Adding surgical_case_id column to VitalSign',
      `ALTER TABLE "VitalSign" ADD COLUMN "surgical_case_id" TEXT`
    );

    await executeStep(
      'Creating VitalSign_surgical_case_id_idx index',
      `CREATE INDEX "VitalSign_surgical_case_id_idx" ON "VitalSign"("surgical_case_id")`
    );

    await executeStep(
      'Adding VitalSign foreign key to SurgicalCase',
      `ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE SET NULL ON UPDATE CASCADE`
    );

    console.log('\n✅ Migration applied successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Added surgical_case_id column to VitalSign');
    console.log('   - Created index on surgical_case_id');
    console.log('   - Added foreign key constraint to SurgicalCase');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
