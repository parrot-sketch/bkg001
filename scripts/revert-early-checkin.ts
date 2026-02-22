/**
 * Script: Revert Early Check-In
 * 
 * Reverts appointments that were incorrectly checked in before their scheduled date.
 * This script finds appointments with CHECKED_IN status where the appointment date
 * is in the future, and reverts them back to SCHEDULED status.
 * 
 * Usage: tsx scripts/revert-early-checkin.ts [--appointment-id=<id>] [--dry-run]
 */

import { PrismaClient, AppointmentStatus } from '@prisma/client';
import db from '../lib/db';

const prisma = db as PrismaClient;

interface Options {
  appointmentId?: number;
  dryRun?: boolean;
  patientName?: string;
}

async function revertEarlyCheckIns(options: Options = {}) {
  const { appointmentId, dryRun = false, patientName } = options;
  
  console.log('🔍 Searching for appointments checked in before their scheduled date...\n');
  
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Build query
  const where: any = {
    status: AppointmentStatus.CHECKED_IN,
    checked_in_at: { not: null },
  };
  
  if (appointmentId) {
    where.id = appointmentId;
  }
  
  if (patientName) {
    where.patient = {
      OR: [
        { first_name: { contains: patientName, mode: 'insensitive' } },
        { last_name: { contains: patientName, mode: 'insensitive' } },
      ],
    };
  }
  
  // Find appointments
  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          file_number: true,
        },
      },
      doctor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      appointment_date: 'asc',
    },
  });
  
  // Filter to only future appointments
  const futureAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.appointment_date);
    const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
    return aptDateOnly.getTime() > todayOnly.getTime();
  });
  
  if (futureAppointments.length === 0) {
    console.log('✅ No appointments found that were checked in before their scheduled date.');
    return;
  }
  
  console.log(`📋 Found ${futureAppointments.length} appointment(s) to revert:\n`);
  
  for (const apt of futureAppointments) {
    const aptDate = new Date(apt.appointment_date);
    const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
    const daysUntil = Math.ceil((aptDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`  Appointment #${apt.id}:`);
    console.log(`    Patient: ${apt.patient.first_name} ${apt.patient.last_name} (${apt.patient.file_number || 'N/A'})`);
    console.log(`    Doctor: ${apt.doctor.name}`);
    console.log(`    Scheduled: ${aptDate.toLocaleDateString()} at ${apt.time}`);
    console.log(`    Checked in: ${apt.checked_in_at ? new Date(apt.checked_in_at).toLocaleString() : 'N/A'}`);
    console.log(`    Days until appointment: ${daysUntil}`);
    console.log('');
  }
  
  if (dryRun) {
    console.log('🔍 DRY RUN: No changes made. Remove --dry-run to apply changes.\n');
    return;
  }
  
  console.log('🔄 Reverting appointments...\n');
  
  for (const apt of futureAppointments) {
    const existingNote = apt.note || '';
    const revertNote = `[System] Reverted from CHECKED_IN to SCHEDULED - appointment was checked in ${Math.ceil((new Date(apt.checked_in_at!).getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24))} day(s) before scheduled date.`;
    const updatedNote = existingNote ? `${existingNote}\n\n${revertNote}` : revertNote;
    
    await prisma.appointment.update({
      where: { id: apt.id },
      data: {
        status: AppointmentStatus.SCHEDULED,
        checked_in_at: null,
        checked_in_by: null,
        late_arrival: false,
        late_by_minutes: null,
        note: updatedNote,
        status_changed_at: new Date(),
      },
    });
    
    console.log(`  ✅ Reverted appointment #${apt.id} (${apt.patient.first_name} ${apt.patient.last_name})`);
  }
  
  console.log(`\n✅ Successfully reverted ${futureAppointments.length} appointment(s).`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: Options = {};

for (const arg of args) {
  if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg.startsWith('--appointment-id=')) {
    options.appointmentId = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--patient=')) {
    options.patientName = arg.split('=')[1];
  }
}

// Run the script
revertEarlyCheckIns(options)
  .then(() => {
    console.log('\n✨ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error running script:', error);
    process.exit(1);
  });
