import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const appointmentId = 10;
  
  // Check appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true, doctor_id: true, patient_id: true }
  });
  console.log('Appointment:', JSON.stringify(appointment, null, 2));
  
  // Check if consultation exists
  const consultation = await prisma.consultation.findFirst({
    where: { appointment_id: appointmentId },
    select: { id: true, started_at: true, completed_at: true, doctor_id: true, user_id: true }
  });
  console.log('Consultation:', JSON.stringify(consultation, null, 2));
  
  // Check doctor
  const doctor = await prisma.doctor.findUnique({
    where: { id: appointment?.doctor_id },
    select: { id: true, user_id: true, first_name: true, last_name: true }
  });
  console.log('Doctor:', JSON.stringify(doctor, null, 2));
  
  // Check user
  const user = await prisma.user.findUnique({
    where: { id: doctor?.user_id },
    select: { id: true, email: true, role: true }
  });
  console.log('User:', JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
