// Find which file numbers from the Excel are missing from the DB
import { createRequire } from 'module';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.production')) dotenv.config({ path: '.env.production', override: true });

import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
const prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function main() {
  const wb = XLSX.readFile('NS CLIENT FILES - (4).xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

  // Valid records in the Excel (has a file number and a name)
  const excelFileNos = new Set(
    data
      .map(r => r['FILE NO'] ? String(r['FILE NO']).trim() : null)
      .filter(fn => fn && /^NS\d+$/i.test(fn))
  );

  console.log(`Excel has ${excelFileNos.size} valid NS file numbers (NS001–NS875 range)\n`);

  // All DB file numbers
  const dbPatients = await prisma.patient.findMany({ select: { file_number: true } });
  const dbFileNos = new Set(dbPatients.map(p => p.file_number));

  // Missing from DB
  const missing = [...excelFileNos].filter(fn => !dbFileNos.has(fn));
  console.log(`Missing from DB (${missing.length}):`);
  missing.forEach(fn => {
    const row = data.find(r => String(r['FILE NO']).trim() === fn);
    console.log(`  ${fn} — ${row?.['CLIENT NAME'] || '(no name)'}`);
  });

  // In DB but not in Excel (unexpected)
  const extra = [...dbFileNos].filter(fn => /^NS\d+$/i.test(fn) && !excelFileNos.has(fn));
  if (extra.length > 0) {
    console.log(`\nIn DB but NOT in Excel (${extra.length}):`);
    extra.forEach(fn => console.log(`  ${fn}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
