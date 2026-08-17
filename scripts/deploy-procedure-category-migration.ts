#!/usr/bin/env node
/**
 * Deploy procedure category migration to production
 *
 * This script applies the ProcedureCategory enum migration to the production database.
 * It maps old enum values to the new 5-category structure:
 *   FACE, FACE_AND_NECK, HAIR_RESTORATION → FACIAL
 *   BODY, BODY_CONTOURING, INTIMATE_AESTHETIC, POST_WEIGHT_LOSS → BODY
 *   BREAST → BREAST
 *   RECONSTRUCTIVE → OTHER
 *   NON_SURGICAL → NON_SURGICAL
 *   OTHER → OTHER
 *
 * Usage:
 *   node scripts/deploy-procedure-category-migration.js            # Apply migration
 *   node scripts/deploy-procedure-category-migration.js --dry-run  # Preview only
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

  // Show current state
  const currentEnum = await getCurrentEnumValues();
  console.log('\nCurrent ProcedureCategory enum values:');
  currentEnum.forEach(val => console.log(`  - ${val}`));

  const procedureCounts = await getProcedureCounts();
  console.log('\nCurrent procedure counts by category:');
  if (procedureCounts.length === 0) {
    console.log('  (no procedures found)');
  } else {
    procedureCounts.forEach(row => console.log(`  ${row.category}: ${row.count}`));
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

  const answer = await new Promise(resolve => {
    rl.question('   Type "yes" to confirm: ', resolve);
  });
  rl.close();

  if (answer !== 'yes') {
    console.log('❌ Migration cancelled.');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('\n🚀 Applying procedure category migration to production...\n');

  try {
    // Step 1: Create new enum type
    await executeStep(
      'Creating new ProcedureCategory_new enum',
      `CREATE TYPE "ProcedureCategory_new" AS ENUM ('FACIAL', 'BODY', 'BREAST', 'SKIN_AND_SCAR', 'NON_SURGICAL', 'OTHER')`
    );

    // Step 2: Alter column to use new type with mapping
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

    // Step 3: Drop old enum type
    await executeStep(
      'Dropping old ProcedureCategory enum',
      'DROP TYPE "ProcedureCategory"'
    );

    // Step 4: Rename new enum type
    await executeStep(
      'Renaming new enum to ProcedureCategory',
      'ALTER TYPE "ProcedureCategory_new" RENAME TO "ProcedureCategory"'
    );

    console.log('\n✅ Migration applied successfully!');

    // Show new state
    const newEnum = await getCurrentEnumValues();
    console.log('\nNew ProcedureCategory enum values:');
    newEnum.forEach(val => console.log(`  - ${val}`));

    const newCounts = await getProcedureCounts();
    console.log('\nProcedure counts after migration:');
    newCounts.forEach(row => console.log(`  ${row.category}: ${row.count}`));

    console.log('\n📊 Summary of changes:');
    console.log('   - ProcedureCategory enum reduced from 11 to 5 values');
    console.log('   - Old values mapped to new categories:');
    console.log('     FACE, FACE_AND_NECK, HAIR_RESTORATION → FACIAL');
    console.log('     BODY, BODY_CONTOURING, INTIMATE_AESTHETIC, POST_WEIGHT_LOSS → BODY');
    console.log('     BREAST → BREAST');
    console.log('     RECONSTRUCTIVE → OTHER');
    console.log('     NON_SURGICAL → NON_SURGICAL');
    console.log('     OTHER → OTHER');
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
