/**
 * Seed Initial Inventory Items
 * 
 * Seeds common surgical consumables and inventory items
 * for Nairobi Sculpt Surgical Aesthetic Clinic.
 * 
 * Categories:
 * - IMPLANT: Breast implants, chin implants, etc.
 * - SUTURE: Various suture materials
 * - ANESTHETIC: Local and general anesthesia supplies
 * - MEDICATION: Post-op medications, antibiotics
 * - DISPOSABLE: Gloves, drapes, gauze, etc.
 * - DRESSING: Wound dressings, bandages
 * - OTHER: Miscellaneous items
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const inventoryItems = [
  // ============================================================================
  // IMPLANTS
  // ============================================================================
  {
    name: 'Silicone Breast Implant - Round (Moderate Profile)',
    sku: 'IMP-SBR-MOD-001',
    category: 'IMPLANT',
    description: 'Smooth round silicone gel-filled breast implant, moderate profile',
    unit_of_measure: 'unit',
    unit_cost: 85000,
    quantity_on_hand: 8,
    reorder_point: 2,
    supplier: 'Mentor (Johnson & Johnson)',
    is_billable: true,
  },
  {
    name: 'Silicone Breast Implant - Anatomical',
    sku: 'IMP-SBA-001',
    category: 'IMPLANT',
    description: 'Textured anatomical (teardrop) silicone gel-filled breast implant',
    unit_of_measure: 'unit',
    unit_cost: 95000,
    quantity_on_hand: 6,
    reorder_point: 2,
    supplier: 'Mentor (Johnson & Johnson)',
    is_billable: true,
  },
  {
    name: 'Chin Implant - Silicone (Medium)',
    sku: 'IMP-CHIN-MED-001',
    category: 'IMPLANT',
    description: 'Solid silicone chin implant, medium size',
    unit_of_measure: 'unit',
    unit_cost: 25000,
    quantity_on_hand: 4,
    reorder_point: 2,
    supplier: 'Implantech',
    is_billable: true,
  },

  // ============================================================================
  // SUTURES
  // ============================================================================
  {
    name: 'Vicryl 3-0 (Absorbable)',
    sku: 'SUT-VIC-30-001',
    category: 'SUTURE',
    description: 'Polyglactin 910 braided absorbable suture, 3-0 gauge',
    unit_of_measure: 'pack',
    unit_cost: 1200,
    quantity_on_hand: 50,
    reorder_point: 10,
    supplier: 'Ethicon',
    is_billable: true,
  },
  {
    name: 'Prolene 4-0 (Non-Absorbable)',
    sku: 'SUT-PRO-40-001',
    category: 'SUTURE',
    description: 'Polypropylene monofilament non-absorbable suture, 4-0 gauge',
    unit_of_measure: 'pack',
    unit_cost: 1500,
    quantity_on_hand: 40,
    reorder_point: 10,
    supplier: 'Ethicon',
    is_billable: true,
  },
  {
    name: 'Nylon 5-0 (Non-Absorbable, Fine)',
    sku: 'SUT-NYL-50-001',
    category: 'SUTURE',
    description: 'Monofilament nylon suture for fine skin closure, 5-0 gauge',
    unit_of_measure: 'pack',
    unit_cost: 800,
    quantity_on_hand: 60,
    reorder_point: 15,
    supplier: 'Ethicon',
    is_billable: true,
  },

  // ============================================================================
  // ANESTHETICS
  // ============================================================================
  {
    name: 'Lidocaine 1% with Epinephrine',
    sku: 'ANE-LID-1E-001',
    category: 'ANESTHETIC',
    description: 'Local anesthetic with vasoconstrictor, 50ml vial',
    unit_of_measure: 'vial',
    unit_cost: 500,
    quantity_on_hand: 30,
    reorder_point: 10,
    supplier: 'AstraZeneca',
    is_billable: true,
  },
  {
    name: 'Propofol 200mg/20ml',
    sku: 'ANE-PROP-200-001',
    category: 'ANESTHETIC',
    description: 'IV anesthetic for general anesthesia induction',
    unit_of_measure: 'ampoule',
    unit_cost: 800,
    quantity_on_hand: 20,
    reorder_point: 5,
    supplier: 'Fresenius Kabi',
    is_billable: true,
  },

  // ============================================================================
  // MEDICATIONS
  // ============================================================================
  {
    name: 'Ceftriaxone 1g (IV)',
    sku: 'MED-CEFT-1G-001',
    category: 'MEDICATION',
    description: 'Prophylactic antibiotic for surgical procedures',
    unit_of_measure: 'vial',
    unit_cost: 350,
    quantity_on_hand: 40,
    reorder_point: 10,
    supplier: 'Roche',
    is_billable: true,
  },
  {
    name: 'Tramadol 100mg (IV)',
    sku: 'MED-TRAM-100-001',
    category: 'MEDICATION',
    description: 'Post-operative pain management',
    unit_of_measure: 'ampoule',
    unit_cost: 200,
    quantity_on_hand: 50,
    reorder_point: 15,
    supplier: 'Generic',
    is_billable: true,
  },
  {
    name: 'Ondansetron 4mg (Anti-emetic)',
    sku: 'MED-ONDS-4-001',
    category: 'MEDICATION',
    description: 'Anti-nausea medication for post-operative care',
    unit_of_measure: 'ampoule',
    unit_cost: 250,
    quantity_on_hand: 30,
    reorder_point: 10,
    supplier: 'Generic',
    is_billable: true,
  },

  // ============================================================================
  // DISPOSABLES
  // ============================================================================
  {
    name: 'Surgical Gloves (Sterile, Latex-Free)',
    sku: 'DIS-GLV-STR-001',
    category: 'DISPOSABLE',
    description: 'Powder-free sterile surgical gloves, various sizes',
    unit_of_measure: 'pair',
    unit_cost: 150,
    quantity_on_hand: 200,
    reorder_point: 50,
    supplier: 'Ansell',
    is_billable: false, // Overhead cost, not charged to patient
  },
  {
    name: 'Surgical Drape (Full Body)',
    sku: 'DIS-DRP-FUL-001',
    category: 'DISPOSABLE',
    description: 'Disposable sterile surgical drape for full body coverage',
    unit_of_measure: 'unit',
    unit_cost: 800,
    quantity_on_hand: 30,
    reorder_point: 10,
    supplier: 'Medline',
    is_billable: false,
  },
  {
    name: 'Cannula Set (Liposuction)',
    sku: 'DIS-CAN-LIP-001',
    category: 'DISPOSABLE',
    description: 'Disposable liposuction cannula set, multiple sizes',
    unit_of_measure: 'set',
    unit_cost: 5000,
    quantity_on_hand: 15,
    reorder_point: 5,
    supplier: 'Tulip Medical',
    is_billable: true,
  },

  // ============================================================================
  // DRESSINGS
  // ============================================================================
  {
    name: 'Compression Garment (Abdominal)',
    sku: 'DRE-CMP-ABD-001',
    category: 'DRESSING',
    description: 'Post-surgical compression garment for abdominal procedures',
    unit_of_measure: 'unit',
    unit_cost: 3500,
    quantity_on_hand: 20,
    reorder_point: 5,
    supplier: 'Marena',
    is_billable: true,
  },
  {
    name: 'Compression Garment (Breast)',
    sku: 'DRE-CMP-BRS-001',
    category: 'DRESSING',
    description: 'Post-surgical breast support garment',
    unit_of_measure: 'unit',
    unit_cost: 2500,
    quantity_on_hand: 15,
    reorder_point: 5,
    supplier: 'Marena',
    is_billable: true,
  },
  {
    name: 'Steri-Strips (Wound Closure)',
    sku: 'DRE-STP-001',
    category: 'DRESSING',
    description: 'Adhesive wound closure strips',
    unit_of_measure: 'pack',
    unit_cost: 400,
    quantity_on_hand: 40,
    reorder_point: 15,
    supplier: '3M',
    is_billable: false,
  },
  {
    name: 'Silicone Scar Sheet',
    sku: 'DRE-SIL-SCR-001',
    category: 'DRESSING',
    description: 'Medical-grade silicone sheet for scar management',
    unit_of_measure: 'sheet',
    unit_cost: 1500,
    quantity_on_hand: 25,
    reorder_point: 10,
    supplier: 'Mepiform',
    is_billable: true,
  },
];

async function main() {
  console.log('🌱 Seeding inventory items for Nairobi Sculpt...\n');

  let created = 0;
  let updated = 0;

  for (const itemData of inventoryItems) {
    try {
      const existing = await prisma.inventoryItem.findFirst({
        where: { sku: itemData.sku },
      });

      if (existing) {
        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            name: itemData.name,
            category: itemData.category as any,
            description: itemData.description,
            unit_of_measure: itemData.unit_of_measure,
            unit_cost: itemData.unit_cost,
            reorder_point: itemData.reorder_point,
            supplier: itemData.supplier,
            is_billable: itemData.is_billable,
          },
        });
        updated++;
        console.log(`  ✓ Updated: ${itemData.name}`);
      } else {
        await prisma.inventoryItem.create({
          data: itemData as any,
        });
        created++;
        console.log(`  ✓ Created: ${itemData.name}`);
      }
    } catch (error) {
      console.error(`  ✗ Error with ${itemData.name}:`, error);
    }
  }

  console.log(`\n✅ Inventory seed complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${created + updated}`);
  console.log(`\n📦 Categories: IMPLANT, SUTURE, ANESTHETIC, MEDICATION, DISPOSABLE, DRESSING\n`);
}

main()
  .catch((error) => {
    console.error('❌ Error seeding inventory:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
