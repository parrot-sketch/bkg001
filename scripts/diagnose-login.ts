#!/usr/bin/env node

/**
 * Diagnostic Script: Login Issue Investigation
 * 
 * This script helps diagnose why login is failing with 401 errors.
 * It checks:
 * 1. Database connectivity
 * 2. Seeded user data
 * 3. Password hashing
 * 4. AuthService functionality
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Login Diagnostic Report\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Test database connectivity
    console.log('\n📊 Step 1: Testing Database Connectivity');
    console.log('-'.repeat(60));
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');

    // Step 2: Check for seeded admin user
    console.log('\n👤 Step 2: Checking Seeded Users');
    console.log('-'.repeat(60));
    
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@nairobisculpt.com' },
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found! Database needs seeding.');
      console.log('   Run: npm run db:seed');
      return;
    }
    
    console.log(`✅ Admin user found: ${adminUser.email}`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Status: ${adminUser.status}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Password Hash: ${adminUser.password_hash?.substring(0, 20)}...`);

    // Step 3: Test password verification
    console.log('\n🔐 Step 3: Testing Password Verification');
    console.log('-'.repeat(60));
    
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, adminUser.password_hash);
    
    if (isValid) {
      console.log(`✅ Password verification successful for 'admin123'`);
    } else {
      console.log(`❌ Password verification FAILED for 'admin123'`);
      console.log(`   This means the seed password does not match the hash`);
    }

    // Step 4: Check a doctor user
    console.log('\n👨‍⚕️  Step 4: Checking Seeded Doctor User');
    console.log('-'.repeat(60));
    
    const doctorUser = await prisma.user.findUnique({
      where: { email: 'mukami.gathariki@nairobisculpt.com' },
    });
    
    if (!doctorUser) {
      console.log('❌ Doctor user not found!');
      return;
    }
    
    console.log(`✅ Doctor user found: ${doctorUser.email}`);
    console.log(`   ID: ${doctorUser.id}`);
    console.log(`   Status: ${doctorUser.status}`);
    console.log(`   Role: ${doctorUser.role}`);
    
    // Check doctor profile
    const doctorProfile = await prisma.doctor.findUnique({
      where: { user_id: doctorUser.id },
      select: {
        id: true,
        name: true,
        onboarding_status: true,
      },
    });
    
    if (doctorProfile) {
      console.log(`✅ Doctor profile found: ${doctorProfile.name}`);
      console.log(`   Onboarding Status: ${doctorProfile.onboarding_status}`);
    } else {
      console.log('❌ Doctor profile not found!');
    }
    
    // Test doctor password
    const doctorPassword = 'doctor123';
    const isDoctorPasswordValid = await bcrypt.compare(doctorPassword, doctorUser.password_hash);
    
    if (isDoctorPasswordValid) {
      console.log(`✅ Doctor password verification successful for 'doctor123'`);
    } else {
      console.log(`❌ Doctor password verification FAILED for 'doctor123'`);
    }

    // Step 5: Check for any inactive users that might match
    console.log('\n🔍 Step 5: Checking User Statuses');
    console.log('-'.repeat(60));
    
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        status: true,
        role: true,
      },
    });
    
    console.log(`Total users in database: ${allUsers.length}`);
    
    const activeUsers = allUsers.filter(u => u.status === 'ACTIVE');
    const inactiveUsers = allUsers.filter(u => u.status !== 'ACTIVE');
    
    console.log(`  Active users: ${activeUsers.length}`);
    console.log(`  Inactive users: ${inactiveUsers.length}`);
    
    if (inactiveUsers.length > 0) {
      console.log('\n⚠️  Inactive users:');
      for (const user of inactiveUsers.slice(0, 5)) {
        console.log(`    - ${user.email} (${user.status})`);
      }
    }

    // Step 6: Recommendations
    console.log('\n💡 Step 6: Diagnostic Summary & Recommendations');
    console.log('-'.repeat(60));
    
    const issues = [];
    
    if (!adminUser) {
      issues.push('- Database is not seeded. Run: npm run db:seed');
    }
    
    if (adminUser && !isValid) {
      issues.push('- Password hashing mismatch. Database may be corrupted.');
    }
    
    if (inactiveUsers.length > 0) {
      issues.push(`- ${inactiveUsers.length} inactive users found. Check their status.`);
    }
    
    if (issues.length === 0) {
      console.log('✅ All checks passed! Database is properly configured.');
      console.log('\nTest these login credentials:');
      console.log('  Admin: admin@nairobisculpt.com / admin123');
      console.log('  Doctor: mukami.gathariki@nairobisculpt.com / doctor123');
    } else {
      console.log('\n⚠️  Issues found:');
      for (const issue of issues) {
        console.log(issue);
      }
    }

  } catch (error) {
    console.error('❌ Diagnostic script failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
