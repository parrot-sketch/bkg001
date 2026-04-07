import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.production')) dotenv.config({ path: '.env.production', override: true });
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;

async function main() {
  // Find patients whose file_number doesn't follow the NS### pattern
  const all = await prisma.patient.findMany({ select: { id: true, file_number: true, first_name: true, last_name: true, user_id: true } });
  
  const nonStandard = all.filter(p => !/^NS\d+$/i.test(p.file_number.trim()));
  console.log(`Non-standard file numbers (${nonStandard.length}):`);
  nonStandard.forEach(p => console.log(`  "${p.file_number}" — ${p.first_name} ${p.last_name}`));

  console.log(`\nTotal patients: ${all.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
