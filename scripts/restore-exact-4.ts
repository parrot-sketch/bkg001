import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { createRequire } from 'module';

if (fs.existsSync('.env.production')) dotenv.config({ path: '.env.production', override: true });

import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

function parseExcelDate(val: any): Date | null {
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string' && val.includes('/')) {
    const [d, m, y2] = val.split('/').map(Number);
    const y = y2 < 100 ? (y2 < 30 ? 2000 + y2 : 1900 + y2) : y2;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function normalizePhone(phone: any): string | null {
  if (!phone || phone === '___' || phone === '____' || phone === 0) return null;
  let s = String(phone).replace(/[\s\-\(\)]/g, '');
  if (s.startsWith('0')) s = '254' + s.substring(1);
  if (s.length === 9) s = '254' + s;
  if (!s.startsWith('+')) s = '+' + s;
  return s.length >= 10 ? s : null;
}

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Connected\n');

  const sharedHash = await bcrypt.hash('NairobiSculpt@2024', 10);
  const wb = XLSX.readFile('NS CLIENT FILES - (4).xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

  // Get the real rows for the 4 missing patients
  const targets = ['NS810', 'NS811', 'NS812', 'NS813'];
  let restored = 0;

  for (const row of data) {
    const fn = String(row['FILE NO'] || '').trim();
    if (!targets.includes(fn)) continue;
    if (!row['CLIENT NAME'] || String(row['CLIENT NAME']).trim() === '') continue; // Skip the blank dupes

    const nameParts = String(row['CLIENT NAME']).trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Patient';
    const phone = normalizePhone(row['TEL']);
    const email = row['EMAIL'] ? String(row['EMAIL']).trim() : `${firstName.toLowerCase()}.${fn.toLowerCase()}@patient.nairobisculpt.com`;

    try {
      // Direct prisma operations since it's just 4 records
      const user = await prisma.user.upsert({
        where: { email },
        update: { first_name: firstName, last_name: lastName, phone },
        create: { email, password_hash: sharedHash, role: 'PATIENT', status: 'ACTIVE', first_name: firstName, last_name: lastName, phone }
      });

      await prisma.patient.upsert({
        where: { file_number: fn },
        update: { first_name: firstName, last_name: lastName, email, phone: phone || '+254000000000' },
        create: {
          file_number: fn, user_id: user.id, first_name: firstName, last_name: lastName, email,
          phone: phone || '+254000000000', date_of_birth: parseExcelDate(row['D.O.B']) || new Date(1990, 0, 1),
          gender: 'FEMALE', address: row['RESIDENCE'] ? String(row['RESIDENCE']) : 'Nairobi',
          occupation: row['OCCUPATION'] !== 'N/A' ? (row['OCCUPATION'] || null) : null,
          allergies: row['DRUG ALLERGIES'] !== 'N/A' ? (row['DRUG ALLERGIES'] || null) : null,
          emergency_contact_name: row['NEXT OF KIN'] || 'Not Provided',
          emergency_contact_number: normalizePhone(row['TEL_1']) || phone || '+254000000000',
          relation: row['RELATIONSHIP'] || 'Other',
          approved: true, approved_at: new Date()
        }
      });
      console.log(`✅ Restored ${fn} — ${firstName} ${lastName}`);
      restored++;
    } catch (e: any) {
      console.error(`❌ Failed on ${fn}: ${e.message?.split('\n')[0]}`);
    }
  }

  const count = await prisma.patient.count();
  console.log(`\n🎉 Done. Target reached? ${count === 874 ? 'YES' : 'NO'} (${count})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
