/**
 * Clean Data Seed Script
 * 
 * Seeds clean Services and Inventory from Excel data sources:
 * - nairobi_sculpt_clean_catalogue.xlsx (inventory + services)
 * - NS REVENUE.xlsx (procedure services, deduplicated)
 * 
 * Run with: npx tsx prisma/seed-clean-data.ts
 */

import { PrismaClient, InventoryCategory } from '@prisma/client';
const XLSX = require('xlsx');

const prisma = new PrismaClient();

interface ServiceData {
  name: string;
  price: number;
  category: string;
  description?: string;
}

interface InventoryData {
  name: string;
  sku: string | null;
  category: InventoryCategory;
  unit_of_measure: string;
  unit_cost: number;
  is_billable: boolean;
  is_active: boolean;
}

async function loadCatalogueData() {
  const wb = XLSX.readFile('nairobi_sculpt_clean_catalogue.xlsx');
  
  // Load inventory items
  const invSheet = wb.Sheets['Catalogue'];
  const invData = XLSX.utils.sheet_to_json(invSheet, { header: 1 });
  const invRows = invData.slice(1);
  
  const categoryMap: Record<string, InventoryCategory> = {
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
  
  const inventoryItems: InventoryData[] = invRows
    .filter((r: any) => r[0] && r[0] !== 'Category' && r[0] !== 'SERVICES')
    .map((r: any) => ({
      name: r[3],
      sku: r[2] || null,
      category: categoryMap[r[0]] || 'OTHER',
      unit_of_measure: r[5] || 'unit',
      unit_cost: r[6] ? parseFloat(r[6]) : 0,
      is_billable: true,
      is_active: true,
    }))
    .filter((i: any) => i.name && i.name.trim());
  
  // Load services from catalogue
  const catalogueServices: ServiceData[] = invRows
    .filter((r: any) => r[0] === 'SERVICES' && r[3])
    .map((r: any) => ({
      name: r[3],
      price: r[6] ? parseFloat(r[6]) : 0,
      category: 'Service',
    }));
  
  return { inventoryItems, catalogueServices };
}

async function loadRevenueData(): Promise<ServiceData[]> {
  const wb = XLSX.readFile('NS REVENUE.xlsx');
  const sheet = wb.Sheets['Sheet1'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const rows = data.slice(1);
  
  const excludePatterns = [/^TOTAL/i, /^________/, /^DR\.[A-Z]+ TOTAL/i];
  const procedures = new Set<string>();
  
  rows.forEach((r: any) => {
    const proc = r[3];
    if (!proc) return;
    const trimmed = proc.trim();
    if (excludePatterns.some(p => p.test(trimmed))) return;
    procedures.add(trimmed);
  });
  
  return [...procedures].sort().map(name => ({
    name,
    price: 0,
    category: 'Procedure',
  }));
}

async function seedServices(catalogueServices: ServiceData[], procedureServices: ServiceData[]) {
  // Base services that should always exist
  const baseServices: ServiceData[] = [
    { name: 'Consultation - Initial', price: 5000, category: 'Consultation' },
    { name: 'Consultation - Follow up', price: 3000, category: 'Consultation' },
  ];
  
  // Merge all services
  const allServices = [...baseServices, ...catalogueServices, ...procedureServices];
  
  console.log(`Seeding ${allServices.length} services...`);
  
  // Clear and reseed
  await prisma.service.deleteMany({});
  
  await prisma.service.createMany({
    data: allServices.map(s => ({
      service_name: s.name,
      price: s.price,
      category: s.category,
      description: null,
      is_active: true,
      price_type: 'FIXED' as const,
    })),
  });
  
  console.log(`✓ Created ${allServices.length} services`);
}

async function seedInventory(inventoryItems: InventoryData[]) {
  console.log(`Seeding ${inventoryItems.length} inventory items...`);
  
  // Clear and reseed
  await prisma.inventoryItem.deleteMany({});
  
  await prisma.inventoryItem.createMany({
    data: inventoryItems.map(i => ({
      name: i.name,
      sku: i.sku,
      category: i.category,
      unit_of_measure: i.unit_of_measure,
      unit_cost: i.unit_cost,
      is_billable: i.is_billable,
      is_active: i.is_active,
      reorder_point: 0,
      low_stock_threshold: 0,
    })),
  });
  
  console.log(`✓ Created ${inventoryItems.length} inventory items`);
}

async function main() {
  console.log('=== Loading data from Excel sources ===\n');
  
  const { inventoryItems, catalogueServices } = await loadCatalogueData();
  console.log(`Loaded ${catalogueServices.length} catalogue services`);
  console.log(`Loaded ${inventoryItems.length} inventory items`);
  
  const procedureServices = await loadRevenueData();
  console.log(`Loaded ${procedureServices.length} procedure services from revenue`);
  
  console.log('\n=== Seeding Database ===\n');
  
  await seedServices(catalogueServices, procedureServices);
  await seedInventory(inventoryItems);
  
  // Verify
  const serviceCount = await prisma.service.count();
  const inventoryCount = await prisma.inventoryItem.count();
  
  console.log('\n=== Verification ===');
  console.log(`Services: ${serviceCount}`);
  console.log(`Inventory: ${inventoryCount}`);
  
  await prisma.$disconnect();
  console.log('\n✓ Seed complete!');
}

main().catch(console.error);