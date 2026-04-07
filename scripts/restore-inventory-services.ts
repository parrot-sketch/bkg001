/**
 * Inventory + Services only — targeted re-run after the batch fix.
 * Patients are already restored (888 records). This script handles
 * the inventory and service upserts using the correct enum cast syntax.
 */

import { createRequire } from 'module';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.production')) {
  dotenv.config({ path: '.env.production', override: true });
}

import { PrismaClient, InventoryCategory, PriceType } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function restoreInventory() {
  console.log('📦 Restoring Inventory...');
  const wb = XLSX.readFile('nairobi_sculpt_clean_catalogue.xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 1 }) as any[];

  const seenSkus = new Set<string>();
  let done = 0;

  for (const row of data) {
    const itemName = row['Item Name'] ? String(row['Item Name']).trim() : null;
    if (!itemName || itemName.toLowerCase() === 'item name') continue;

    const rawCode = row['Item Code'] ? String(row['Item Code']).trim() : null;
    let sku = rawCode || `SKU-${itemName.replace(/[^A-Z0-9]/gi, '-').toUpperCase().substring(0, 20)}`;
    if (seenSkus.has(sku)) sku = `${sku}-${done}`;
    seenSkus.add(sku);

    const cat = String(row['Category'] || '').toUpperCase();
    let category: InventoryCategory = InventoryCategory.OTHER;
    if (cat.includes('MED')) category = InventoryCategory.MEDICATION;
    else if (cat.includes('CONSUM') || cat.includes('DISPOS')) category = InventoryCategory.DISPOSABLE;
    else if (cat.includes('IMPLANT')) category = InventoryCategory.IMPLANT;

    try {
      await prisma.inventoryItem.upsert({
        where: { sku },
        update: { name: itemName, category, unit_of_measure: row['Unit'] ? String(row['Unit']) : 'unit', unit_cost: parseFloat(row['Selling Price (KES)']) || 0 },
        create: { name: itemName, sku, category, unit_of_measure: row['Unit'] ? String(row['Unit']) : 'unit', unit_cost: parseFloat(row['Selling Price (KES)']) || 0, is_active: true, is_billable: true }
      });
      done++;
    } catch (e: any) {
      console.error(`  ❌ ${itemName}: ${e.message?.split('\n')[0]}`);
    }
  }
  console.log(`✅ Inventory: ${done} items.`);
}

async function restoreServices() {
  console.log('\n💊 Restoring Services...');
  const wb = XLSX.readFile('NS REVENUE.xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

  const procedures = new Map<string, number>();
  for (const row of data) {
    const name = row['PROCEDURE'] ? String(row['PROCEDURE']).trim() : null;
    if (!name) continue;
    const amt = parseFloat(row['AMOUNT']) || 0;
    if (!procedures.has(name) || procedures.get(name)! < amt) procedures.set(name, amt);
  }

  let done = 0;
  for (const [name, price] of procedures.entries()) {
    try {
      const existing = await prisma.service.findFirst({ where: { service_name: name } });
      if (existing) {
        await prisma.service.update({ where: { id: existing.id }, data: { price } });
      } else {
        await prisma.service.create({ data: { service_name: name, price, category: 'Procedure', price_type: PriceType.FIXED, is_active: true } });
      }
      done++;
    } catch (e: any) {
      console.error(`  ❌ ${name}: ${e.message?.split('\n')[0]}`);
    }
  }
  console.log(`✅ Services: ${done} procedures.`);
}

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected\n');
    await restoreInventory();
    await restoreServices();

    const [patients, items, services, consultations] = await Promise.all([
      prisma.patient.count(), prisma.inventoryItem.count(),
      prisma.service.count(), prisma.consultation.count(),
    ]);

    console.log('\n🎉 DONE!');
    console.log(`   Patients:      ${patients}`);
    console.log(`   Inventory:     ${items}`);
    console.log(`   Services:      ${services}`);
    console.log(`   Consultations: ${consultations} ✅ preserved`);
  } catch (err) { console.error('Fatal:', err); }
  finally { await prisma.$disconnect(); }
}

main();
