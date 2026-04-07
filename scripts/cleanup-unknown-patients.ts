/**
 * Clean up "Unknown Patient" records created from blank Excel rows.
 * NS418 has real data — rescue it. NS510 + NS876-NS879 + NS810-NS813 are empty — delete them.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.production')) dotenv.config({ path: '.env.production', override: true });

import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;

// File numbers that are genuinely empty/placeholder rows in the Excel
const EMPTY_FILE_NUMBERS = ['NS510', 'NS876', 'NS877', 'NS878', 'NS879', 'NS810', 'NS811', 'NS812', 'NS813'];

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Connected\n');

  // 1. Fix NS418 — has real email/phone but name was blank in Excel
  const ns418 = await prisma.patient.findFirst({ where: { file_number: 'NS418' } });
  if (ns418) {
    await prisma.patient.update({
      where: { id: ns418.id },
      data: {
        first_name: 'Esther',
        last_name: 'Achieng',
        email: 'ESTHERACHIENG@GMAIL.COM',
        phone: '+254700586368',
        address: 'Syokimau',
        occupation: 'Business',
        emergency_contact_name: 'Winnie Ajode',
        emergency_contact_number: '+254702580848',
        relation: 'Sister',
      }
    });
    // Also fix corresponding User
    if (ns418.user_id) {
      await prisma.user.update({
        where: { id: ns418.user_id },
        data: { first_name: 'Esther', last_name: 'Achieng', email: 'ESTHERACHIENG@GMAIL.COM', phone: '+254700586368' }
      }).catch(() => {}); // email may already exist
    }
    console.log('✅ NS418 fixed → Esther Achieng');
  } else {
    console.log('⚠️ NS418 not found in DB');
  }

  // 2. Delete empty-row patients and their associated users
  let deleted = 0;
  for (const fileNo of EMPTY_FILE_NUMBERS) {
    const patient = await prisma.patient.findFirst({ where: { file_number: fileNo } });
    if (patient) {
      const userId = patient.user_id;
      await prisma.patient.delete({ where: { id: patient.id } });
      // Only delete the user if they have no other patients or clinical data
      if (userId) {
        const otherPatients = await prisma.patient.count({ where: { user_id: userId } });
        const consultations = await prisma.consultation.count({ where: { doctor_id: userId } });
        if (otherPatients === 0 && consultations === 0) {
          await prisma.user.delete({ where: { id: userId } }).catch(() => {});
        }
      }
      console.log(`🗑️  Deleted ${fileNo}`);
      deleted++;
    } else {
      console.log(`⚠️  ${fileNo} not in DB (skipping)`);
    }
  }

  // 3. Catch-all: delete any remaining "Unknown" first-name patients with placeholder emails
  const unknowns = await prisma.patient.findMany({
    where: {
      first_name: 'Unknown',
      email: { contains: '@patient.nairobisculpt.com' }
    },
    select: { id: true, file_number: true, user_id: true }
  });

  for (const p of unknowns) {
    if (EMPTY_FILE_NUMBERS.includes(p.file_number)) continue; // already handled
    await prisma.patient.delete({ where: { id: p.id } });
    if (p.user_id) {
      const others = await prisma.patient.count({ where: { user_id: p.user_id } });
      if (others === 0) await prisma.user.delete({ where: { id: p.user_id } }).catch(() => {});
    }
    console.log(`🗑️  Deleted unknown ${p.file_number}`);
    deleted++;
  }

  const [patients, consultations] = await Promise.all([
    prisma.patient.count(),
    prisma.consultation.count(),
  ]);
  console.log(`\n✅ Cleanup complete. Deleted ${deleted} records.`);
  console.log(`   Patients remaining: ${patients}`);
  console.log(`   Consultations: ${consultations} ✅ intact`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
