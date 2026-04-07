import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function main() {
  console.log('💊 Starting Integrated Service Restoration (ESM)...');

  const wb = XLSX.readFile('NS REVENUE.xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

  const procedures = new Map<string, number>();
  for (const row of data) {
    const name = row['PROCEDURE'] ? String(row['PROCEDURE']).trim() : null;
    if (!name || name.toLowerCase() === 'procedure') continue;
    const amt = parseFloat(String(row['AMOUNT'] || '0').replace(/[^0-9.]/g, '')) || 0;
    if (!procedures.has(name) || procedures.get(name)! < amt) procedures.set(name, amt);
  }

  console.log(`🧪 Parsed ${procedures.size} unique procedures.`);

  let upserted = 0;
  for (const [name, price] of procedures.entries()) {
    try {
      const existing = await prisma.service.findFirst({
        where: { service_name: name }
      });

      if (existing) {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            price: price,
            updated_at: new Date()
          }
        });
      } else {
        await prisma.service.create({
          data: {
            service_name: name,
            price: price,
            category: 'Procedure',
            is_active: true
          }
        });
      }
      upserted++;
    } catch (e: any) {
      console.error(`❌ Failed to process ${name}:`, e.message);
    }
  }

  console.log(`✅ Successfully upserted ${upserted} services.`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
