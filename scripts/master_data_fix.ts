import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== STARTING MASTER DATA FIX ===');

  // 1. Audit and Cleanup Patient Queue
  console.log('\n--- Cleaning up Patient Queue ---');
  const activeQueue = await prisma.patientQueue.findMany({
    where: {
      status: { in: ['WAITING', 'IN_CONSULTATION'] }
    },
    include: {
      appointment: { select: { id: true, status: true, appointment_date: true } },
      doctor: { select: { name: true } },
      patient: { select: { first_name: true, last_name: true } }
    }
  });

  let queueFixCount = 0;
  for (const entry of activeQueue) {
    const aptStatus = entry.appointment?.status;
    const aptDate = entry.appointment?.appointment_date;
    const isStaleStatus = aptStatus === 'COMPLETED' || aptStatus === 'CANCELLED';
    
    // Also consider it stale if it's from a previous day and still WAITING
    const isPastDate = aptDate && new Date(aptDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
    const isStaleDate = isPastDate && entry.status === 'WAITING';

    if (isStaleStatus || isStaleDate) {
      const newStatus = aptStatus === 'CANCELLED' ? 'REMOVED' : 'COMPLETED';
      await prisma.patientQueue.update({
        where: { id: entry.id },
        data: {
          status: newStatus as any,
          completed_at: newStatus === 'COMPLETED' ? new Date() : undefined,
          removed_at: newStatus === 'REMOVED' ? new Date() : undefined,
          removal_reason: isStaleDate ? 'Auto-cleaned stale entry from past date' : undefined
        }
      });
      console.log(`[Queue] Fixed entry #${entry.id} (${entry.patient.first_name}) for Dr. ${entry.doctor.name}. Status: ${entry.status} -> ${newStatus}`);
      queueFixCount++;
    }
  }
  console.log(`Cleaned up ${queueFixCount} queue entries.`);

  // 2. Backfill DoctorPatientAssignment
  console.log('\n--- Backfilling Doctor-Patient Assignments ---');
  // Get all consultations
  const consultations = await prisma.consultation.findMany({
    select: {
      doctor_id: true,
      completed_at: true,
      appointment: { 
        select: { 
          id: true, 
          patient_id: true,
          appointment_date: true 
        } 
      }
    }
  });

  console.log(`Analyzing ${consultations.length} consultations for assignments...`);

  let assignmentCount = 0;
  const processedPairs = new Set<string>();

  for (const consul of consultations) {
    const patientId = consul.appointment?.patient_id;
    if (!patientId) continue;

    const pairKey = `${consul.doctor_id}-${patientId}`;
    if (processedPairs.has(pairKey)) continue;

    // Check if assignment already exists
    const existing = await prisma.doctorPatientAssignment.findUnique({
      where: {
        doctor_id_patient_id: {
          doctor_id: consul.doctor_id,
          patient_id: patientId
        }
      }
    });

    if (!existing) {
      await prisma.doctorPatientAssignment.create({
        data: {
          doctor_id: consul.doctor_id,
          patient_id: patientId,
          status: 'ACTIVE',
          assigned_at: consul.completed_at || consul.appointment?.appointment_date || new Date(),
          care_notes: 'Automatically assigned based on consultation history'
        }
      });
      console.log(`[Assignment] Created assignment for Doctor ${consul.doctor_id} and Patient ${patientId}`);
      assignmentCount++;
    }
    processedPairs.add(pairKey);
  }
  console.log(`Created ${assignmentCount} new assignments.`);

  console.log('\n=== MASTER DATA FIX COMPLETE ===');
}

main()
  .catch(e => {
    console.error('Error in master data fix:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
