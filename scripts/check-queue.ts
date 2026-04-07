import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load production env
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

const prisma = new PrismaClient();

async function main() {
  const queue = await prisma.patientQueue.findMany({
    where: {
      status: { in: ['WAITING', 'IN_CONSULTATION'] },
    },
    include: {
      patient: true
    }
  });
  
  console.log(`Found ${queue.length} active queue entries in PRODUCTION.`);
  for (const q of queue) {
    console.log(`- ${q.patient.first_name} ${q.patient.last_name}: Added At = ${q.added_at}, Status = ${q.status}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
