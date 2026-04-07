import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const consultations = await prisma.consultation.count();
  const patients = await prisma.patient.count();
  const drKen = await prisma.user.findFirst({ where: { last_name: { contains: 'Ken', mode: 'insensitive' } } });
  
  const items = await prisma.inventoryItem.count();
  const services = await prisma.service.count();
  
  console.log('--- DB SUMMARY ---');
  console.log('Patients:', patients);
  console.log('Consultations:', consultations);
  console.log('Inventory Items:', items);
  console.log('Services:', services);
  console.log('Dr. Ken User Found:', !!drKen);
  
  if (drKen) {
      const kenConsults = await prisma.consultation.count({ where: { doctor_id: drKen.id } });
      console.log('Dr. Ken Consultations:', kenConsults);
  }
}

check().then(() => prisma.$disconnect());
