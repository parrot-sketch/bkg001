/**
 * Seed Script: Surgical Procedure Options
 * Seeds procedure options with the 5-category structure.
 * Run with: npx tsx prisma/seeds/surgical-procedures.seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const procedures = [
  // FACIAL (19)
  { category: 'FACIAL', name: 'Facelift' },
  { category: 'FACIAL', name: 'Mini facelift' },
  { category: 'FACIAL', name: 'Neck lift' },
  { category: 'FACIAL', name: 'Upper blepharoplasty' },
  { category: 'FACIAL', name: 'Lower blepharoplasty' },
  { category: 'FACIAL', name: 'Combined upper and lower blepharoplasty' },
  { category: 'FACIAL', name: 'Brow lift' },
  { category: 'FACIAL', name: 'Otoplasty (ear pinning)' },
  { category: 'FACIAL', name: 'Chin liposuction' },
  { category: 'FACIAL', name: 'Buccal fat removal' },
  { category: 'FACIAL', name: 'Chin augmentation' },
  { category: 'FACIAL', name: 'Rhinoplasty (primary)' },
  { category: 'FACIAL', name: 'Revision rhinoplasty' },
  { category: 'FACIAL', name: 'FUE hair transplant' },
  { category: 'FACIAL', name: 'Beard transplant' },
  { category: 'FACIAL', name: 'Eyebrow transplant' },
  { category: 'FACIAL', name: 'PRP hair restoration' },
  { category: 'FACIAL', name: 'Scar Management' },
  { category: 'FACIAL', name: 'Keloid Treatment' },

  // BODY (31)
  { category: 'BODY', name: 'Liposuction small area' },
  { category: 'BODY', name: 'Liposuction abdomen' },
  { category: 'BODY', name: 'Liposuction flanks' },
  { category: 'BODY', name: '360 liposuction' },
  { category: 'BODY', name: '180 liposuction' },
  { category: 'BODY', name: 'Thigh liposuction' },
  { category: 'BODY', name: 'Arm liposuction' },
  { category: 'BODY', name: 'BBL' },
  { category: 'BODY', name: 'Fat transfer to breast' },
  { category: 'BODY', name: 'Tummy tuck (abdominoplasty)' },
  { category: 'BODY', name: 'Mini abdominoplasty' },
  { category: 'BODY', name: 'Extended abdominoplasty' },
  { category: 'BODY', name: 'Fleur-de-lis abdominoplasty' },
  { category: 'BODY', name: 'Brachioplasty (arm lift)' },
  { category: 'BODY', name: 'Thigh lift' },
  { category: 'BODY', name: 'Back lift / bra roll excision' },
  { category: 'BODY', name: 'Mons / pubic lift' },
  { category: 'BODY', name: 'Labiaplasty' },
  { category: 'BODY', name: 'Vaginal tightening (surgical)' },
  { category: 'BODY', name: 'Vaginal rejuvenation (laser/RF)' },
  { category: 'BODY', name: 'Mons liposuction' },
  { category: 'BODY', name: 'Mons lift' },
  { category: 'BODY', name: 'Circumferential body lift (belt lipectomy)' },
  { category: 'BODY', name: 'Lower body lift' },
  { category: 'BODY', name: 'Upper body lift' },
  { category: 'BODY', name: 'Brachioplasty after weight loss' },
  { category: 'BODY', name: 'Thigh lift after weight loss' },
  { category: 'BODY', name: 'Breast lift after weight loss' },
  { category: 'BODY', name: 'Breast reduction after weight loss' },
  { category: 'BODY', name: 'Buttock lift' },
  { category: 'BODY', name: 'Mons lift after weight loss' },

  // BREAST (7)
  { category: 'BREAST', name: 'Breast augmentation' },
  { category: 'BREAST', name: 'Mastopexy (breast lift)' },
  { category: 'BREAST', name: 'Breast reduction' },
  { category: 'BREAST', name: 'Mastopexy with implants (augmentation mastopexy)' },
  { category: 'BREAST', name: 'Implant removal' },
  { category: 'BREAST', name: 'Implant exchange' },
  { category: 'BREAST', name: 'Gynecomastia surgery (male breast reduction)' },

  // SKIN_AND_SCAR (4)
  { category: 'SKIN_AND_SCAR', name: 'Keloid excision' },
  { category: 'SKIN_AND_SCAR', name: 'Wound dressing' },
  { category: 'SKIN_AND_SCAR', name: 'Debridement + skin grafting' },
  { category: 'SKIN_AND_SCAR', name: 'Change of dressing' },
  { category: 'SKIN_AND_SCAR', name: 'Scar Revision' },
  { category: 'SKIN_AND_SCAR', name: 'Advanced Wound Care' },

  // NON_SURGICAL (12)
  { category: 'NON_SURGICAL', name: 'Botulinum toxin (Botox)' },
  { category: 'NON_SURGICAL', name: 'Dermal fillers' },
  { category: 'NON_SURGICAL', name: 'Thread lift' },
  { category: 'NON_SURGICAL', name: 'PRP facial rejuvenation' },
  { category: 'NON_SURGICAL', name: 'Growth factor concentrate (GFC) therapy' },
  { category: 'NON_SURGICAL', name: 'PRP/GFC for hair restoration' },
  { category: 'NON_SURGICAL', name: 'Microneedling' },
  { category: 'NON_SURGICAL', name: 'Microneedling with PRP' },
  { category: 'NON_SURGICAL', name: 'Hydrafacial' },
  { category: 'NON_SURGICAL', name: 'Chemical peels' },
  { category: 'NON_SURGICAL', name: 'Laser skin rejuvenation' },
  { category: 'NON_SURGICAL', name: 'Fractional laser resurfacing' },
];

function generateId(category: string, name: string): string {
  return `${category}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;
}

async function main() {
  console.log('🌱 Seeding surgical procedure options...');

  await prisma.surgicalCaseProcedure.deleteMany({});
  await prisma.surgicalProcedureOption.deleteMany({});
  console.log('🗑️ Cleared existing procedure data');

  let createdCount = 0;

  for (const proc of procedures) {
    const id = generateId(proc.category, proc.name);
    await prisma.surgicalProcedureOption.create({
      data: {
        id,
        category: proc.category as any,
        name: proc.name,
        is_active: true,
      },
    });
    createdCount++;
  }

  console.log(`✅ Seeded ${createdCount} procedure options`);
}

main()
  .catch((e) => {
    console.error('Error seeding procedures:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
