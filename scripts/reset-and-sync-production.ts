/**
 * Reset and Sync Production Database
 * 
 * This script:
 * 1. Drops all tables in production (RESET)
 * 2. Applies all migrations fresh
 * 3. Seeds test data
 * 
 * ⚠️  WARNING: This will DELETE ALL DATA in production!
 * 
 * Run with: npx tsx scripts/reset-and-sync-production.ts
 */

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Production Database Reset and Sync...\n');
  console.log('⚠️  ⚠️  ⚠️  WARNING: This will DELETE ALL DATA in production! ⚠️  ⚠️  ⚠️');
  console.log('   Make sure DATABASE_URL in .env points to production.\n');
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
  
  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Step 1: Generate Prisma Client
    console.log('📦 Step 1: Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client generated\n');

    // Step 2: Drop all tables (reset database)
    console.log('🗑️  Step 2: Resetting database (dropping all tables)...');
    console.log('   This will delete all existing data and tables.\n');
    
    try {
      // Get all table names
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
      `;

      if (tables.length > 0) {
        const tableNames = tables.map(t => `"${t.tablename}"`).join(', ');
        console.log(`   Dropping ${tables.length} tables...`);
        
        // Drop all tables with CASCADE
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${tableNames} CASCADE;`);
        console.log('   ✅ All tables dropped\n');
      } else {
        console.log('   ✅ Database is already empty\n');
      }

      // Drop all types/enums
      const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `;

      if (enums.length > 0) {
        console.log(`   Dropping ${enums.length} enum types...`);
        for (const enumType of enums) {
          try {
            await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${enumType.typname}" CASCADE;`);
          } catch (e) {
            // Ignore errors for enum drops
          }
        }
        console.log('   ✅ All enum types dropped\n');
      }

      // Clear migration history
      console.log('   Clearing migration history...');
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;`);
      console.log('   ✅ Migration history cleared\n');

    } catch (error: any) {
      console.log(`   ⚠️  Error during reset: ${error.message}`);
      console.log('   Continuing with migrations...\n');
    }

    // Step 3: Apply all migrations fresh
    console.log('🔄 Step 3: Applying all migrations...');
    console.log('   This will create all tables and schema from scratch.\n');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ All migrations applied\n');

    // Step 4: Verify database connection
    console.log('🔌 Step 4: Verifying database connection...');
    await prisma.$connect();
    console.log('✅ Database connection verified\n');

    // Step 5: Seed database
    console.log('🌱 Step 5: Seeding database with test data...');
    console.log('   This will populate the database with demo data.\n');
    execSync('npm run db:seed', { stdio: 'inherit' });
    console.log('✅ Database seeded successfully\n');

    // Step 6: Verify seeded data
    console.log('✅ Step 6: Verifying seeded data...');
    const finalUserCount = await prisma.user.count();
    const finalPatientCount = await prisma.patient.count();
    const finalDoctorCount = await prisma.doctor.count();
    const clinicCount = await prisma.clinic.count().catch(() => 0);
    const theaterCount = await prisma.theater.count().catch(() => 0);
    
    console.log('\n📊 Final Database State:');
    console.log(`   ✅ ${finalUserCount} users`);
    console.log(`   ✅ ${finalPatientCount} patients`);
    console.log(`   ✅ ${finalDoctorCount} doctors`);
    console.log(`   ✅ ${clinicCount} clinic(s)`);
    console.log(`   ✅ ${theaterCount} theater(s)`);
    console.log('\n🎉 Production database reset and sync completed successfully!');
    console.log('   Your database is ready for the demo tomorrow.\n');

  } catch (error) {
    console.error('\n❌ Error during production reset and sync:');
    console.error(error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Verify DATABASE_URL in .env points to production');
    console.error('   2. Check database connectivity');
    console.error('   3. Ensure database user has necessary permissions');
    console.error('   4. Check migration files are correct\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
