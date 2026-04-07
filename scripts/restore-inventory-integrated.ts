import { PrismaClient, InventoryCategory } from '@prisma/client';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Starting Integrated Inventory Restoration (ESM)...');

  // 1. Load Catalogue
  const catWb = XLSX.readFile('nairobi_sculpt_clean_catalogue.xlsx');
  const catSheet = catWb.Sheets['Catalogue'];
  if (!catSheet) {
    console.error('❌ Catalogue sheet not found!');
    return;
  }
  const catData = XLSX.utils.sheet_to_json(catSheet, { range: 1 });

  // 2. Load Pricelist
  const priceWb = XLSX.readFile('NAIROBI SCULPT PRICELIST (1).xlsx');
  const priceData = XLSX.utils.sheet_to_json(priceWb.Sheets['Sheet1']);

  const priceMap = new Map();
  for (const row of priceData) {
    const name = String(row['PARTICULARS'] || '').trim().toLowerCase();
    const price = parseFloat(String(row['PRICE'] || '0').replace(/[^0-9.]/g, '')) || 0;
    if (name) priceMap.set(name, price);
  }

  console.log(`💰 Loaded ${priceMap.size} prices from pricelist.`);

  let upserted = 0;
  for (const row of catData) {
    const name = String(row['Item Name'] || '').trim();
    if (!name || name.toLowerCase() === 'item name' || name.startsWith('NAIROBI SCULPT')) continue;

    const rawCode = row['Item Code'] ? String(row['Item Code']).trim() : null;
    let sku = rawCode || `SKU-${name.replace(/[^A-Z0-9]/gi, '-').toUpperCase().substring(0, 20)}`;
    
    // Check if we have a price in the pricelist
    const priceFromList = priceMap.get(name.toLowerCase()) || 0;
    const priceFromCat = parseFloat(row['Selling Price (KES)']) || 0;
    const finalPrice = priceFromList || priceFromCat;

    const catStr = String(row['Category'] || '').toUpperCase();
    let category: InventoryCategory = 'OTHER';
    if (catStr.includes('MED')) category = 'MEDICATION';
    else if (catStr.includes('CONSUM') || catStr.includes('DISPOS')) category = 'DISPOSABLE';
    else if (catStr.includes('IMPLANT')) category = 'IMPLANT';

    try {
      await prisma.inventoryItem.upsert({
        where: { sku: sku },
        update: {
          name: name,
          category: category,
          unit_cost: finalPrice,
          unit_of_measure: String(row['Unit'] || 'unit'),
          updated_at: new Date()
        },
        create: {
          name: name,
          sku: sku,
          category: category,
          unit_cost: finalPrice,
          unit_of_measure: String(row['Unit'] || 'unit'),
          is_active: true,
          is_billable: true
        }
      });
      upserted++;
    } catch (e: any) {
      console.error(`❌ Failed to upsert ${name}:`, e.message);
    }
  }

  console.log(`✅ Successfully upserted ${upserted} integrated inventory items.`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
