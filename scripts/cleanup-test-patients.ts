import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.production')) dotenv.config({ path: '.env.production', override: true });

import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Connected\n');

  // Find all test records
  const testPatients = await prisma.patient.findMany({
    where: { file_number: { contains: 'test', mode: 'insensitive' } },
    select: { id: true, file_number: true, first_name: true, last_name: true, user_id: true }
  });

  console.log(`Found ${testPatients.length} test records:`);
  testPatients.forEach(p => console.log(`  ${p.file_number} — ${p.first_name} ${p.last_name}`));

  if (testPatients.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  for (const p of testPatients) {
    await prisma.patient.delete({ where: { id: p.id } });
    if (p.user_id) {
      const others = await prisma.patient.count({ where: { user_id: p.user_id } });
      if (others === 0) await prisma.user.delete({ where: { id: p.user_id } }).catch(() => {});
    }
    console.log(`🗑️  Deleted ${p.file_number}`);
  }

  const total = await prisma.patient.count();
  console.log(`\n✅ Done. Patients remaining: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
