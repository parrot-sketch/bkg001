/**
 * Backfill script: DoctorPatientAssignment
 *
 * Creates a DoctorPatientAssignment record for every (doctor, patient) pair
 * that has at least one COMPLETED appointment. This recovers data that was
 * silently lost due to a foreign-key constraint bug in the previous
 * CompleteConsultationUseCase implementation.
 *
 * Run with:
 *   node scripts/backfill-patient-assignments.cjs
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('Starting DoctorPatientAssignment backfill...\n');

  // Find all unique (doctor_id, patient_id) pairs from COMPLETED appointments
  const completedAppointments = await db.appointment.findMany({
    where: { status: 'COMPLETED' },
    select: { doctor_id: true, patient_id: true },
    distinct: ['doctor_id', 'patient_id'],
  });

  console.log(`Found ${completedAppointments.length} unique doctor-patient pairs from completed appointments.`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const appt of completedAppointments) {
    try {
      await db.doctorPatientAssignment.upsert({
        where: {
          doctor_id_patient_id: {
            doctor_id: appt.doctor_id,
            patient_id: appt.patient_id,
          },
        },
        update: {
          status: 'ACTIVE',
          updated_at: new Date(),
        },
        create: {
          doctor_id: appt.doctor_id,
          patient_id: appt.patient_id,
          status: 'ACTIVE',
          assigned_at: new Date(),
        },
      });
      created++;
    } catch (e) {
      console.error(`  FAILED for doctor=${appt.doctor_id} patient=${appt.patient_id}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nBackfill complete:`);
  console.log(`  - Upserted: ${created}`);
  console.log(`  - Failed:   ${failed}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
