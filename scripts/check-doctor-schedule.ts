/**
 * Script to check Dr. Ken's schedule configuration
 * 
 * Run with: npx tsx scripts/check-doctor-schedule.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDoctorSchedule() {
  try {
    // Find Dr. Ken
    const doctor = await prisma.doctor.findFirst({
      where: {
        OR: [
          { first_name: { contains: 'Ken', mode: 'insensitive' } },
          { name: { contains: 'Ken', mode: 'insensitive' } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!doctor) {
      console.log('❌ Dr. Ken not found');
      return;
    }

    console.log('\n=== DOCTOR INFO ===');
    console.log(`ID: ${doctor.id}`);
    console.log(`Name: ${doctor.name}`);
    console.log(`Email: ${doctor.email}`);
    console.log(`User ID: ${doctor.user_id}`);

    // Get active availability template
    const template = await prisma.availabilityTemplate.findFirst({
      where: {
        doctor_id: doctor.id,
        is_active: true,
      },
      include: {
        slots: {
          orderBy: [
            { day_of_week: 'asc' },
            { start_time: 'asc' },
          ],
        },
      },
    });

    console.log('\n=== AVAILABILITY TEMPLATE ===');
    if (!template) {
      console.log('❌ No active template found');
    } else {
      console.log(`Template ID: ${template.id}`);
      console.log(`Template Name: ${template.name}`);
      console.log(`Is Active: ${template.is_active}`);
      console.log(`Total Slots: ${template.slots.length}`);
      
      console.log('\n=== AVAILABILITY SLOTS ===');
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      template.slots.forEach((slot) => {
        console.log(`\nDay: ${dayNames[slot.day_of_week]} (${slot.day_of_week})`);
        console.log(`  Start: ${slot.start_time}`);
        console.log(`  End: ${slot.end_time}`);
        console.log(`  Type: ${slot.slot_type || 'CLINIC'}`);
        console.log(`  ID: ${slot.id}`);
      });
    }

    // Get slot configuration
    const slotConfig = await prisma.slotConfiguration.findUnique({
      where: {
        doctor_id: doctor.id,
      },
    });

    console.log('\n=== SLOT CONFIGURATION ===');
    if (!slotConfig) {
      console.log('❌ No slot configuration found (using defaults)');
    } else {
      console.log(`Default Duration: ${slotConfig.default_duration} minutes`);
      console.log(`Slot Interval: ${slotConfig.slot_interval} minutes`);
      console.log(`Buffer Time: ${slotConfig.buffer_time} minutes`);
    }

    // Get appointments for today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctor_id: doctor.id,
        appointment_date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: {
        appointment_date: 'asc',
      },
    });

    console.log('\n=== APPOINTMENTS (Today) ===');
    console.log(`Total: ${appointments.length}`);
    appointments.forEach((apt) => {
      console.log(`\n  ID: ${apt.id}`);
      console.log(`  Date: ${apt.appointment_date}`);
      console.log(`  Time: ${apt.time}`);
      console.log(`  Status: ${apt.status}`);
      console.log(`  Type: ${apt.type}`);
      console.log(`  Patient: ${apt.patient.first_name} ${apt.patient.last_name}`);
    });

    // Check for any blocks or overrides
    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        doctor_id: doctor.id,
        start_date: { lte: tomorrow },
        end_date: { gte: today },
      },
    });

    console.log('\n=== SCHEDULE BLOCKS (Today/Tomorrow) ===');
    console.log(`Total: ${blocks.length}`);
    blocks.forEach((block) => {
      console.log(`\n  ID: ${block.id}`);
      console.log(`  Start: ${block.start_date}`);
      console.log(`  End: ${block.end_date}`);
      console.log(`  Type: ${block.block_type}`);
      console.log(`  Reason: ${block.reason || 'N/A'}`);
    });

    const overrides = await prisma.availabilityOverride.findMany({
      where: {
        doctor_id: doctor.id,
        start_date: { lte: tomorrow },
        end_date: { gte: today },
      },
    });

    console.log('\n=== AVAILABILITY OVERRIDES (Today/Tomorrow) ===');
    console.log(`Total: ${overrides.length}`);
    overrides.forEach((override) => {
      console.log(`\n  ID: ${override.id}`);
      console.log(`  Start: ${override.start_date}`);
      console.log(`  End: ${override.end_date}`);
      console.log(`  Is Blocked: ${override.is_blocked}`);
      console.log(`  Start Time: ${override.start_time || 'N/A'}`);
      console.log(`  End Time: ${override.end_time || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDoctorSchedule();
