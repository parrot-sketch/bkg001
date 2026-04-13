import { readFileSync, existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function seedInventoryFromExcel() {
  const cataloguePath = process.cwd() + '/nairobi_sculpt_clean_catalogue.xlsx';
  const pricePath = process.cwd() + '/NAIROBI SCULPT PRICELIST (1).xlsx';
  
  if (!existsSync(cataloguePath) || !existsSync(pricePath)) {
    console.error('Excel files not found');
    return;
  }
  
  // Read catalogue
  const catBuffer = readFileSync(cataloguePath);
  const catWorkbook = XLSX.read(catBuffer);
  const catSheet = catWorkbook.Sheets['Catalogue'];
  const catData = XLSX.utils.sheet_to_json(catSheet, { header: 1 });
  const catRows = catData.slice(2);
  
  // Read pricelist
  const priceBuffer = readFileSync(pricePath);
  const priceWorkbook = XLSX.read(priceBuffer);
  const priceSheet = priceWorkbook.Sheets['Sheet1'];
  const priceData = XLSX.utils.sheet_to_json(priceSheet, { header: 1 });
  const priceRows = priceData.slice(1);
  
  // Create price lookup
  const priceMap = new Map();
  priceRows.forEach((row: any) => {
    const name = String(row[0] || '').trim();
    const price = parseFloat(row[1]) || 0;
    if (name && price > 0) {
      priceMap.set(name.toLowerCase(), price);
    }
  });
  
  const categoryMap: Record<string, string> = {
    'AESTHETICS & IMPLANTS': 'IMPLANT',
    'AIRWAY MANAGEMENT': 'DISPOSABLE',
    'ANAESTHETIC AGENTS': 'ANESTHETIC',
    'BANDAGES & TAPES': 'DISPOSABLE',
    'CATHETERS & TUBES': 'DISPOSABLE',
    'DIAGNOSTICS & MONITORING': 'DISPOSABLE',
    'DRESSINGS': 'DRESSING',
    'GASES': 'DISPOSABLE',
    'IV ACCESS & SYRINGES': 'DISPOSABLE',
    'IV FLUIDS': 'DISPOSABLE',
    'IV MEDICATIONS': 'MEDICATION',
    'STERILIZATION & CLEANING': 'DISPOSABLE',
    'SUTURES': 'SUTURE',
    'THEATER CONSUMABLES': 'DISPOSABLE',
  };
  
  const seenItems = new Set<string>();
  const inventoryData: any[] = [];
  
  catRows.forEach((row: any) => {
    const category = String(row[0] || '').trim();
    const catCode = String(row[1] || '').trim();
    const itemCode = String(row[2] || '').trim();
    const itemName = String(row[3] || '').trim();
    const type = String(row[4] || '').trim();
    const unit = String(row[5] || '').trim();
    const sellingPrice = parseFloat(row[6]) || 0;
    
    if (!itemName || category === 'Category' || category === 'NAIROBI SCULPT') return;
    
    const sku = itemCode || (catCode + '-' + itemName.substring(0, 3).toUpperCase());
    const key = sku.toLowerCase();
    
    if (seenItems.has(key)) return;
    seenItems.add(key);
    
    // Get price from pricelist
    let price = 0;
    const priceMatch = priceMap.get(itemName.toLowerCase());
    if (priceMatch) {
      price = priceMatch;
    } else if (sellingPrice > 0) {
      price = sellingPrice;
    }
    
    const mappedCategory = categoryMap[category] || 'OTHER';
    
    inventoryData.push({
      name: itemName,
      sku: sku,
      category: mappedCategory,
      unit_of_measure: unit || 'unit',
      unit_cost: price,
      is_billable: price > 0,
      is_active: true,
      reorder_point: 0,
      low_stock_threshold: 0,
    });
  });
  
  console.log(`Processing ${inventoryData.length} inventory items...`);
  
  // Clear and insert
  await prisma.inventoryItem.deleteMany({});
  
  await prisma.inventoryItem.createMany({
    data: inventoryData,
  });
  
  console.log(`Created ${inventoryData.length} inventory items`);
  
  const count = await prisma.inventoryItem.count();
  console.log(`Total inventory items: ${count}`);
  
  await prisma.$disconnect();
}

seedInventoryFromExcel().catch(console.error);