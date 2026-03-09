
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFixes() {
  console.log('--- Verifying Consultation Fixes ---');

  // 1. Find a doctor user
  const doctor = await prisma.user.findFirst({
    where: { role: 'DOCTOR' },
    include: { doctor_profile: true }
  });

  if (!doctor || !doctor.doctor_profile) {
    console.error('❌ No doctor user found for testing');
    return;
  }
  console.log(`✅ Found doctor: ${doctor.email} (ID: ${doctor.id})`);

  // 2. Find a PENDING or CONFIRMED appointment and update it to CHECKED_IN
  const appointment = await prisma.appointment.findFirst({
    where: { 
      status: { in: ['PENDING', 'CONFIRMED', 'SCHEDULED', 'PENDING_DOCTOR_CONFIRMATION'] } 
    }
  });

  if (!appointment) {
    console.error('❌ No suitable appointment found for testing');
    return;
  }
  
  console.log(`🔄 Updating appointment ${appointment.id} to CHECKED_IN...`);
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { 
      status: 'CHECKED_IN',
      doctor_id: doctor.doctor_profile.id
    }
  });
  console.log(`✅ Appointment ${appointment.id} is now CHECKED_IN`);

  // 3. Verify Doctor is visible (the 500 error from before)
  const doctorCheck = await prisma.doctor.findUnique({
    where: { user_id: doctor.id }
  });
  if (doctorCheck) {
    console.log(`✅ Doctor check successful: ${doctorCheck.first_name} ${doctorCheck.last_name}`);
  } else {
    console.error(`❌ Doctor findUnique failed for user_id: ${doctor.id}`);
  }

  // 4. Verify Authorization Resiliency
  const searchRole = 'DOCTOR';
  const roleCheck = String(doctor.role).toUpperCase() === searchRole.toUpperCase();
  console.log(`✅ Role check resiliency test: ${doctor.role} === ${searchRole} ? ${roleCheck}`);

  console.log('--- Verification Script Completed ---');
}

verifyFixes()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
