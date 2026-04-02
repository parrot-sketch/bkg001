
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const doctors = await prisma.doctor.findMany({
        select: { id: true, name: true, user_id: true }
    });
    console.log('--- Doctors in DB ---');
    console.log(JSON.stringify(doctors, null, 2));
    console.log('---------------------');
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
