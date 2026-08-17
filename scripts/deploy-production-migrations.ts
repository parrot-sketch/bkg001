#!/usr/bin/env node
/**
 * Deploy pending migrations to production
 *
 * Applies:
 * 1. VitalSign.surgical_case_id column migration
 * 2. ProcedureCategory enum consolidation migration
 *
 * Usage:
 *   npx tsx scripts/deploy-production-migrations.ts            # Apply migrations
 *   npx tsx scripts/deploy-production-migrations.ts --dry-run  # Preview only
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

async function getCurrentEnumValues() {
  try {
    const result = await prisma.$queryRaw`
      SELECT typname, array_agg(enumlabel ORDER BY enumsortorder) as labels
      FROM pg_type 
      JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname = 'ProcedureCategory' 
      GROUP BY typname
    `;
    return result[0]?.labels || [];
  } catch (error) {
    return [];
  }
}

async function getProcedureCounts() {
  try {
    const result = await prisma.$queryRaw`
      SELECT category, COUNT(*) as count
      FROM surgical_procedure_options
      GROUP BY category
      ORDER BY category
    `;
    return result;
  } catch (error) {
    return [];
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

  // Check VitalSign migration status
  const vitalSignColumnExists = await getVitalSignColumnExists();
  console.log('\nVitalSign.surgical_case_id column:');
  console.log(`  ${vitalSignColumnExists ? '✅ Already exists' : '❌ Missing - needs migration'}`);

  // Check ProcedureCategory migration status
  const currentEnum = await getCurrentEnumValues();
  console.log('\nCurrent ProcedureCategory enum values:');
  currentEnum.forEach(val => console.log(`  - ${val}`));

  const needsCategoryMigration = currentEnum.length > 0 && !currentEnum.includes('FACIAL');

  if (needsCategoryMigration) {
    console.log('  ⚠️  Needs consolidation to 5 categories');
  } else if (currentEnum.includes('FACIAL')) {
    console.log('  ✅ Already consolidated');
  }

  const procedureCounts = await getProcedureCounts();
  console.log('\nCurrent procedure counts by category:');
  if (procedureCounts.length === 0) {
    console.log('  (no procedures found)');
  } else {
    procedureCounts.forEach(row => console.log(`  ${row.category}: ${row.count}`));
  }

  if (isDryRun) {
    console.log('\n✅ Dry run complete. Run without --dry-run to apply migrations.');
    await prisma.$disconnect();
    return;
  }

  // Confirm this is production
  console.log('\n⚠️  WARNING: This will modify the production database!');
  console.log(`   Database: ${dbName}`);

  // Build list of pending migrations
  const pendingMigrations: string[] = [];
  if (!vitalSignColumnExists) {
    pendingMigrations.push('VitalSign.surgical_case_id');
  }
  if (needsCategoryMigration) {
    pendingMigrations.push('ProcedureCategory enum consolidation');
  }

  if (pendingMigrations.length === 0) {
    console.log('\n✅ No pending migrations. Database is up to date.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📋 Pending migrations:');
  pendingMigrations.forEach(m => console.log(`   - ${m}`));

  // Simple confirmation
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>(resolve => {
    rl.question('\n   Type "yes" to confirm: ', resolve);
  });
  rl.close();

  if (answer !== 'yes') {
    console.log('❌ Migration cancelled.');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('\n🚀 Applying migrations to production...\n');

  try {
    // Migration 1: Add surgical_case_id to VitalSign
    if (!vitalSignColumnExists) {
      await executeStep(
        'Adding surgical_case_id to VitalSign',
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
    }

    // Migration 2: Consolidate ProcedureCategory enum
    if (needsCategoryMigration) {
      await executeStep(
        'Creating new ProcedureCategory_new enum',
        `CREATE TYPE "ProcedureCategory_new" AS ENUM ('FACIAL', 'BODY', 'BREAST', 'SKIN_AND_SCAR', 'NON_SURGICAL', 'OTHER')`
      );

      await executeStep(
        'Mapping old categories to new categories',
        `ALTER TABLE "surgical_procedure_options" 
         ALTER COLUMN "category" TYPE "ProcedureCategory_new" 
         USING (
           CASE "category"::text
             WHEN 'FACE' THEN 'FACIAL'::"ProcedureCategory_new"
             WHEN 'FACE_AND_NECK' THEN 'FACIAL'::"ProcedureCategory_new"
             WHEN 'BREAST' THEN 'BREAST'::"ProcedureCategory_new"
             WHEN 'BODY' THEN 'BODY'::"ProcedureCategory_new"
             WHEN 'BODY_CONTOURING' THEN 'BODY'::"ProcedureCategory_new"
             WHEN 'RECONSTRUCTIVE' THEN 'OTHER'::"ProcedureCategory_new"
             WHEN 'INTIMATE_AESTHETIC' THEN 'BODY'::"ProcedureCategory_new"
             WHEN 'HAIR_RESTORATION' THEN 'FACIAL'::"ProcedureCategory_new"
             WHEN 'NON_SURGICAL' THEN 'NON_SURGICAL'::"ProcedureCategory_new"
             WHEN 'POST_WEIGHT_LOSS' THEN 'BODY'::"ProcedureCategory_new"
             WHEN 'OTHER' THEN 'OTHER'::"ProcedureCategory_new"
             ELSE 'OTHER'::"ProcedureCategory_new"
           END
         )`
      );

      await executeStep(
        'Dropping old ProcedureCategory enum',
        'DROP TYPE "ProcedureCategory"'
      );

      await executeStep(
        'Renaming new enum to ProcedureCategory',
        'ALTER TYPE "ProcedureCategory_new" RENAME TO "ProcedureCategory"'
      );
    }

    console.log('\n✅ All migrations applied successfully!');

    // Show final state
    const newEnum = await getCurrentEnumValues();
    console.log('\nProcedureCategory enum values:');
    newEnum.forEach(val => console.log(`  - ${val}`));

    const newCounts = await getProcedureCounts();
    console.log('\nProcedure counts:');
    newCounts.forEach(row => console.log(`  ${row.category}: ${row.count}`));

    console.log('\n📊 Summary:');
    if (!vitalSignColumnExists) {
      console.log('   ✅ Added surgical_case_id to VitalSign');
    } else {
      console.log('   ⏭️  VitalSign.surgical_case_id already existed');
    }
    if (needsCategoryMigration) {
      console.log('   ✅ Consolidated ProcedureCategory enum to 5 categories');
    } else {
      console.log('   ⏭️  ProcedureCategory enum already consolidated');
    }
    console.log('\n⚠️  Next step: Run the production seed script:');
    console.log('   npx tsx prisma/seeds/surgical-procedures.prod.seed.ts');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
