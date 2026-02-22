/**
 * Production Database Sync Script
 * 
 * This script:
 * 1. Checks migration status
 * 2. Deploys all pending migrations to production
 * 3. Generates Prisma Client
 * 4. Seeds the database with test data
 * 
 * Run with: npx tsx scripts/sync-production-db.ts
 * 
 * IMPORTANT: Ensure DATABASE_URL in .env points to production before running!
 */

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Production Database Sync...\n');
  console.log('⚠️  WARNING: This will modify the production database!');
  console.log('   Make sure DATABASE_URL in .env points to production.\n');

  try {
    // Step 1: Generate Prisma Client
    console.log('📦 Step 1: Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client generated\n');

    // Step 2: Check migration status
    console.log('📊 Step 2: Checking migration status...');
    try {
      execSync('npx prisma migrate status', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️  Migration status check completed (may show pending migrations)\n');
    }

    // Step 3: Deploy migrations
    console.log('🔄 Step 3: Deploying migrations to production...');
    console.log('   This will apply all pending migrations.\n');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migrations deployed successfully\n');

    // Step 4: Verify database connection
    console.log('🔌 Step 4: Verifying database connection...');
    await prisma.$connect();
    console.log('✅ Database connection verified\n');

    // Step 5: Check current data
    console.log('📋 Step 5: Checking current database state...');
    const userCount = await prisma.user.count();
    const patientCount = await prisma.patient.count();
    const doctorCount = await prisma.doctor.count();
    console.log(`   Current data: ${userCount} users, ${patientCount} patients, ${doctorCount} doctors\n`);

    // Step 6: Seed database
    console.log('🌱 Step 6: Seeding database with test data...');
    console.log('   This will clear existing data and seed fresh test data.\n');
    execSync('npm run db:seed', { stdio: 'inherit' });
    console.log('✅ Database seeded successfully\n');

    // Step 7: Verify seeded data
    console.log('✅ Step 7: Verifying seeded data...');
    const finalUserCount = await prisma.user.count();
    const finalPatientCount = await prisma.patient.count();
    const finalDoctorCount = await prisma.doctor.count();
    const clinicCount = await prisma.clinic.count();
    const theaterCount = await prisma.theater.count();
    
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
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
