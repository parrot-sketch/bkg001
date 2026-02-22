/**
 * Production Database Baseline and Sync Script
 * 
 * This script handles syncing an existing production database:
 * 1. Baselines the database (marks existing migrations as applied)
 * 2. Deploys any new migrations
 * 3. Seeds test data
 * 
 * Run with: npx tsx scripts/baseline-and-sync-production.ts
 */

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Production Database Baseline and Sync...\n');
  console.log('⚠️  WARNING: This will modify the production database!');
  console.log('   Make sure DATABASE_URL in .env points to production.\n');

  try {
    // Step 1: Generate Prisma Client
    console.log('📦 Step 1: Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client generated\n');

    // Step 2: Check if database has schema
    console.log('📊 Step 2: Checking database state...');
    try {
      const tableCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;
      const hasTables = Number(tableCount[0]?.count || 0) > 0;
      
      if (hasTables) {
        console.log('   ⚠️  Database has existing tables');
        console.log('   📋 Checking migration history...\n');
        
        // Check if _prisma_migrations table exists
        try {
          const migrationCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM "_prisma_migrations"
          `;
          const hasMigrations = Number(migrationCount[0]?.count || 0) > 0;
          
          if (hasMigrations) {
            console.log('   ✅ Migration history found');
            console.log('   🔄 Deploying new migrations...\n');
            execSync('npx prisma migrate deploy', { stdio: 'inherit' });
          } else {
            console.log('   ⚠️  No migration history found');
            console.log('   📝 Baselining database (marking all migrations as applied)...\n');
            const firstMigration = execSync('ls -1 prisma/migrations | grep -E "^[0-9]" | sort | head -1', { encoding: 'utf-8' }).trim();
            if (firstMigration) {
              execSync(`npx prisma migrate resolve --applied "${firstMigration}"`, { stdio: 'inherit' });
            }
            console.log('   🔄 Deploying remaining migrations...\n');
            execSync('npx prisma migrate deploy', { stdio: 'inherit' });
          }
        } catch (e) {
          console.log('   ⚠️  Migration table not found, baselining...\n');
          // Create migration baseline - get migration directories
          const migrationsOutput = execSync('ls -1 prisma/migrations | grep -E "^[0-9]" | sort', { encoding: 'utf-8' }).trim();
          const migrations = migrationsOutput ? migrationsOutput.split('\n').filter(m => m.trim()) : [];
          if (migrations.length > 0) {
            console.log(`   📝 Marking ${migrations.length} migrations as applied...\n`);
            for (const migration of migrations) {
              try {
                execSync(`npx prisma migrate resolve --applied "${migration}"`, { stdio: 'pipe' });
              } catch (e) {
                // Ignore if already applied
              }
            }
          }
          execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        }
      } else {
        console.log('   ✅ Database is empty');
        console.log('   🔄 Deploying all migrations...\n');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      }
    } catch (error: any) {
      console.log('   ⚠️  Error checking database, attempting direct deploy...\n');
      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      } catch (deployError) {
        console.log('   ⚠️  Migrations may need manual resolution');
        console.log('   💡 Try: npx prisma migrate resolve --applied <migration-name>\n');
        throw deployError;
      }
    }
    console.log('✅ Migrations synced\n');

    // Step 3: Verify database connection
    console.log('🔌 Step 3: Verifying database connection...');
    await prisma.$connect();
    console.log('✅ Database connection verified\n');

    // Step 4: Check current data
    console.log('📋 Step 4: Checking current database state...');
    const userCount = await prisma.user.count().catch(() => 0);
    const patientCount = await prisma.patient.count().catch(() => 0);
    const doctorCount = await prisma.doctor.count().catch(() => 0);
    console.log(`   Current data: ${userCount} users, ${patientCount} patients, ${doctorCount} doctors\n`);

    // Step 5: Apply any missing migrations manually
    console.log('🔧 Step 5: Checking for missing migrations...');
    try {
      execSync('npx tsx scripts/apply-missing-migrations.ts', { stdio: 'inherit' });
    } catch (e) {
      console.log('   ⚠️  Could not apply missing migrations automatically');
      console.log('   Continuing with seed...\n');
    }

    // Step 6: Seed database
    console.log('🌱 Step 6: Seeding database with test data...');
    console.log('   ⚠️  This will clear existing data and seed fresh test data.\n');
    execSync('npm run db:seed', { stdio: 'inherit' });
    console.log('✅ Database seeded successfully\n');

    // Step 7: Verify seeded data
    console.log('✅ Step 7: Verifying seeded data...');
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
    console.log('\n🎉 Production database sync completed successfully!');
    console.log('   Your database is ready for the demo tomorrow.\n');

  } catch (error) {
    console.error('\n❌ Error during production sync:');
    console.error(error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Verify DATABASE_URL in .env points to production');
    console.error('   2. Check database connectivity');
    console.error('   3. Ensure database user has necessary permissions');
    console.error('   4. Try manual baseline: npx prisma migrate resolve --applied <migration-name>\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
