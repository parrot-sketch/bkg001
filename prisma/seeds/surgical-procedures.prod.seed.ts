/**
 * Seed Script: Surgical Procedure Options (Production)
 * Seeds all 72 procedure options to production database.
 * Run with: DATABASE_URL="postgres://..." npx tsx prisma/seeds/surgical-procedures.seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const procedures = [
  // BREAST (7)
  { category: 'BREAST', name: 'Breast augmentation' },
  { category: 'BREAST', name: 'Mastopexy (breast lift)' },
  { category: 'BREAST', name: 'Breast reduction' },
  { category: 'BREAST', name: 'Mastopexy with implants (augmentation mastopexy)' },
  { category: 'BREAST', name: 'Implant removal' },
  { category: 'BREAST', name: 'Implant exchange' },
  { category: 'BREAST', name: 'Gynecomastia surgery (male breast reduction)' },

  // BODY_CONTOURING (16)
  { category: 'BODY_CONTOURING', name: 'Liposuction small area' },
  { category: 'BODY_CONTOURING', name: 'Liposuction abdomen' },
  { category: 'BODY_CONTOURING', name: 'Liposuction flanks' },
  { category: 'BODY_CONTOURING', name: '360 liposuction' },
  { category: 'BODY_CONTOURING', name: '180 liposuction' },
  { category: 'BODY_CONTOURING', name: 'Thigh liposuction' },
  { category: 'BODY_CONTOURING', name: 'Arm liposuction' },
  { category: 'BODY_CONTOURING', name: 'BBL' },
  { category: 'BODY_CONTOURING', name: 'Fat transfer to breast' },
  { category: 'BODY_CONTOURING', name: 'Tummy tuck (abdominoplasty)' },
  { category: 'BODY_CONTOURING', name: 'Mini abdominoplasty' },
  { category: 'BODY_CONTOURING', name: 'Extended abdominoplasty' },
  { category: 'BODY_CONTOURING', name: 'Fleur-de-lis abdominoplasty' },
  { category: 'BODY_CONTOURING', name: 'Brachioplasty (arm lift)' },
  { category: 'BODY_CONTOURING', name: 'Thigh lift' },
  { category: 'BODY_CONTOURING', name: 'Back lift / bra roll excision' },
  { category: 'BODY_CONTOURING', name: 'Mons / pubic lift' },

  // FACE_AND_NECK (13)
  { category: 'FACE_AND_NECK', name: 'Facelift' },
  { category: 'FACE_AND_NECK', name: 'Mini facelift' },
  { category: 'FACE_AND_NECK', name: 'Neck lift' },
  { category: 'FACE_AND_NECK', name: 'Upper blepharoplasty' },
  { category: 'FACE_AND_NECK', name: 'Lower blepharoplasty' },
  { category: 'FACE_AND_NECK', name: 'Combined upper and lower blepharoplasty' },
  { category: 'FACE_AND_NECK', name: 'Brow lift' },
  { category: 'FACE_AND_NECK', name: 'Otoplasty (ear pinning)' },
  { category: 'FACE_AND_NECK', name: 'Chin liposuction' },
  { category: 'FACE_AND_NECK', name: 'Buccal fat removal' },
  { category: 'FACE_AND_NECK', name: 'Chin augmentation' },
  { category: 'FACE_AND_NECK', name: 'Rhinoplasty (primary)' },
  { category: 'FACE_AND_NECK', name: 'Revision rhinoplasty' },

  // INTIMATE_AESTHETIC (5)
  { category: 'INTIMATE_AESTHETIC', name: 'Labiaplasty' },
  { category: 'INTIMATE_AESTHETIC', name: 'Vaginal tightening (surgical)' },
  { category: 'INTIMATE_AESTHETIC', name: 'Vaginal rejuvenation (laser/RF)' },
  { category: 'INTIMATE_AESTHETIC', name: 'Mons liposuction' },
  { category: 'INTIMATE_AESTHETIC', name: 'Mons lift' },

  // HAIR_RESTORATION (4)
  { category: 'HAIR_RESTORATION', name: 'FUE hair transplant' },
  { category: 'HAIR_RESTORATION', name: 'Beard transplant' },
  { category: 'HAIR_RESTORATION', name: 'Eyebrow transplant' },
  { category: 'HAIR_RESTORATION', name: 'PRP hair restoration' },

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

  // POST_WEIGHT_LOSS (11)
  { category: 'POST_WEIGHT_LOSS', name: 'Circumferential body lift (belt lipectomy)' },
  { category: 'POST_WEIGHT_LOSS', name: 'Lower body lift' },
  { category: 'POST_WEIGHT_LOSS', name: 'Upper body lift' },
  { category: 'POST_WEIGHT_LOSS', name: 'Fleur-de-lis abdominoplasty' },
  { category: 'POST_WEIGHT_LOSS', name: 'Extended abdominoplasty' },
  { category: 'POST_WEIGHT_LOSS', name: 'Brachioplasty after weight loss' },
  { category: 'POST_WEIGHT_LOSS', name: 'Thigh lift after weight loss' },
  { category: 'POST_WEIGHT_LOSS', name: 'Breast lift after weight loss' },
  { category: 'POST_WEIGHT_LOSS', name: 'Breast reduction after weight loss' },
  { category: 'POST_WEIGHT_LOSS', name: 'Buttock lift' },
  { category: 'POST_WEIGHT_LOSS', name: 'Mons lift after weight loss' },

  // RECONSTRUCTIVE (4)
  { category: 'RECONSTRUCTIVE', name: 'Keloid excision' },
  { category: 'RECONSTRUCTIVE', name: 'Wound dressing' },
  { category: 'RECONSTRUCTIVE', name: 'Debridement + skin grafting' },
  { category: 'RECONSTRUCTIVE', name: 'Change of dressing' },
];

function generateId(category: string, name: string): string {
  return `${category}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;
}

async function main() {
  console.log('🌱 Seeding surgical procedure options to production...');

  let createdCount = 0;

  for (const proc of procedures) {
    const id = generateId(proc.category, proc.name);
    try {
      await prisma.surgicalProcedureOption.create({
        data: {
          id,
          category: proc.category as any,
          name: proc.name,
          is_active: true,
        },
      });
      createdCount++;
    } catch (e: any) {
      // Ignore duplicates
      if (e.code !== 'P2002') {
        console.error(`Error inserting ${proc.name}:`, e.message);
      }
    }
  }

  console.log(`✅ Seeded ${createdCount} procedure options to production`);
}

main()
  .catch((e) => {
    console.error('Error seeding procedures:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
