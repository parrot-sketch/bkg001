import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.production')) dotenv.config({ path: '.env.production', override: true });
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;

// NSO## → NS0## (letter O → digit 0)
const TYPO_MAP: Record<string, string> = {
  'NSO27': 'NS027',
  'NSO38': 'NS038',
  'NSO76': 'NS076',
  'NSO79': 'NS079',
  'NSO85': 'NS085',
  'NSO89': 'NS089',
};

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Connected\n');

  // Fix typo file numbers
  for (const [badNo, correctNo] of Object.entries(TYPO_MAP)) {
    const patient = await prisma.patient.findFirst({ where: { file_number: badNo } });
    if (!patient) { console.log(`⚠️  ${badNo} not found`); continue; }

    // Check if correct file number already exists (duplicate) — if so, delete the typo one
    const existing = await prisma.patient.findFirst({ where: { file_number: correctNo } });
    if (existing) {
      await prisma.patient.delete({ where: { id: patient.id } });
      if (patient.user_id) {
        const others = await prisma.patient.count({ where: { user_id: patient.user_id } });
        if (others === 0) await prisma.user.delete({ where: { id: patient.user_id } }).catch(() => {});
      }
      console.log(`🗑️  ${badNo} was duplicate of ${correctNo} — deleted`);
    } else {
      await prisma.patient.update({ where: { id: patient.id }, data: { file_number: correctNo } });
      console.log(`✏️  ${badNo} → ${correctNo} (${patient.first_name} ${patient.last_name})`);
    }
  }

  const total = await prisma.patient.count();
  console.log(`\n✅ Done. Patients: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
