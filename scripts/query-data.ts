import { PrismaClient } from '@prisma/client';

async function queryData() {
  const prisma = new PrismaClient();
  const userCount = await prisma.user.count();
  const appointmentCount = await prisma.appointment.count();
  const doctorCount = await prisma.doctor.count();
  console.log(`Users: ${userCount}, Appointments: ${appointmentCount}, Doctors: ${doctorCount}`);
  
  const appointments = await prisma.appointment.findMany({
    take: 5,
    select: { id: true, status: true, doctor_id: true }
  });
  console.log('Sample Appointments:', JSON.stringify(appointments, null, 2));
  
  process.exit(0);
}

queryData();
