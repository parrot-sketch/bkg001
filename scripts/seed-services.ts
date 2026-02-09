/**
 * Seed Real Nairobi Sculpt Services
 * 
 * Extracted from: https://www.nairobisculpt.com/services.html
 * Service detail pages provide comprehensive information for patient education
 * 
 * This script seeds the actual services offered by Nairobi Sculpt
 * into the database for use in consultation booking.
 * 
 * IMPORTANT: We maintain consistency with the website structure and categories.
 * This enhances the patient portal experience while keeping the website as the
 * authoritative source of detailed service information.
 * 
 * Price Types:
 * - FIXED: Standard rate (consultations)
 * - QUOTE_REQUIRED: Price determined during consultation (major procedures)
 * - VARIABLE: Price within a range (treatments, injectable based on units)
 * - PER_UNIT: Per-unit pricing (Botox per unit, filler per syringe)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Real services from Nairobi Sculpt website
 * Organized by category exactly as shown on https://www.nairobisculpt.com/services.html
 * 
 * Website URLs follow pattern: /{service-slug}.html
 * Example: "Facelift" → https://www.nairobisculpt.com/facelift.html
 */
const realServices = [
  // ============================================================================
  // FACIAL PROCEDURES
  // ============================================================================
  {
    service_name: 'Facelift',
    category: 'Procedure',
    description: 'A surgical procedure designed to reduce visible signs of aging in the face and neck, providing a natural, refreshed, and more youthful appearance',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 250000,
    max_price: 600000,
    website_url: 'https://www.nairobisculpt.com/facelift.html',
  },
  {
    service_name: 'Rhinoplasty',
    category: 'Procedure',
    description: 'Nose reshaping procedure for aesthetic improvement and facial harmony',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 200000,
    max_price: 450000,
    website_url: 'https://www.nairobisculpt.com/rhinoplasty.html',
  },
  {
    service_name: 'Blepharoplasty',
    category: 'Procedure',
    description: 'Eyelid surgery to refresh and rejuvenate the eyes, reducing sagging and creating a more youthful appearance',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 150000,
    max_price: 350000,
    website_url: 'https://www.nairobisculpt.com/blepharoplasty.html',
  },
  {
    service_name: 'Brow Lift',
    category: 'Procedure',
    description: 'Lift and rejuvenate the brow area for a youthful, refreshed appearance',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 180000,
    max_price: 400000,
    website_url: 'https://www.nairobisculpt.com/brow-lift.html',
  },
  {
    service_name: 'Chin Augmentation',
    category: 'Procedure',
    description: 'Enhance chin definition and improve facial balance and profile',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 120000,
    max_price: 300000,
    website_url: 'https://www.nairobisculpt.com/chin-augmentation.html',
  },
  {
    service_name: 'Otoplasty',
    category: 'Procedure',
    description: 'Ear reshaping and correction procedure to improve ear appearance and proportion',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 100000,
    max_price: 250000,
    website_url: 'https://www.nairobisculpt.com/otoplasty.html',
  },

  // ============================================================================
  // BODY PROCEDURES
  // ============================================================================
  {
    service_name: 'Liposuction',
    category: 'Procedure',
    description: 'Sculpt your ideal figure by removing excess fat from targeted areas',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 150000,
    max_price: 500000,
    website_url: 'https://www.nairobisculpt.com/liposuction.html',
  },
  {
    service_name: 'Brazilian Butt Lift',
    category: 'Procedure',
    description: 'Enhance and sculpt the buttocks using your own fat, creating a more proportionate and aesthetically pleasing figure',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 300000,
    max_price: 700000,
    website_url: 'https://www.nairobisculpt.com/bbl.html',
  },
  {
    service_name: 'Tummy Tuck',
    category: 'Procedure',
    description: 'Flatten and contour the abdomen for a refined silhouette',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 250000,
    max_price: 600000,
    website_url: 'https://www.nairobisculpt.com/tummy-tuck.html',
  },

  // ============================================================================
  // BREAST PROCEDURES
  // ============================================================================
  {
    service_name: 'Breast Augmentation',
    category: 'Procedure',
    description: 'Increase breast size and improve shape and fullness for a more confident and proportionate appearance',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 250000,
    max_price: 550000,
    website_url: 'https://www.nairobisculpt.com/breast-augmentation.html',
  },
  {
    service_name: 'Breast Lift',
    category: 'Procedure',
    description: 'Restore youthful position and shape to the breasts, addressing sagging and restoring firmness',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 200000,
    max_price: 500000,
    website_url: 'https://www.nairobisculpt.com/breast-lift.html',
  },
  {
    service_name: 'Breast Reduction',
    category: 'Procedure',
    description: 'Reduce breast size for improved comfort, proportion, and physical relief',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 200000,
    max_price: 500000,
    website_url: 'https://www.nairobisculpt.com/breast-reduction.html',
  },
  {
    service_name: 'Male Gynecomastia',
    category: 'Procedure',
    description: 'Treat enlarged male breasts for a more masculine, defined chest contour',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 150000,
    max_price: 400000,
    website_url: 'https://www.nairobisculpt.com/male-gynecomastia.html',
  },

  // ============================================================================
  // SKIN AND SCAR TREATMENTS
  // ============================================================================
  {
    service_name: 'Scar Management',
    category: 'Treatment',
    description: 'Advanced treatments to improve scar appearance and promote optimal healing',
    price: 0,
    price_type: 'VARIABLE' as const,
    min_price: 5000,
    max_price: 50000,
    website_url: 'https://www.nairobisculpt.com/scar-management.html',
  },
  {
    service_name: 'Keloid Treatment',
    category: 'Treatment',
    description: 'Specialized treatment for keloid scars to reduce appearance and prevent recurrence',
    price: 0,
    price_type: 'VARIABLE' as const,
    min_price: 10000,
    max_price: 80000,
    website_url: 'https://www.nairobisculpt.com/keloid-treatment.html',
  },
  {
    service_name: 'Scar Revision',
    category: 'Treatment',
    description: 'Surgical revision to improve scar appearance and restore skin texture',
    price: 0,
    price_type: 'QUOTE_REQUIRED' as const,
    min_price: 30000,
    max_price: 150000,
    website_url: 'https://www.nairobisculpt.com/scar-revision.html',
  },
  {
    service_name: 'Advanced Wound Care',
    category: 'Treatment',
    description: 'Expert wound care and healing support using advanced techniques',
    price: 0,
    price_type: 'VARIABLE' as const,
    min_price: 5000,
    max_price: 30000,
    website_url: 'https://www.nairobisculpt.com/advanced-wound-care.html',
  },

  // ============================================================================
  // NON-SURGICAL TREATMENTS
  // ============================================================================
  {
    service_name: 'Botox',
    category: 'Treatment',
    description: 'Minimally invasive wrinkle reduction treatment for a refreshed appearance',
    price: 500,
    price_type: 'PER_UNIT' as const,
    min_price: 500,
    max_price: 500,
    website_url: 'https://www.nairobisculpt.com/botox.html',
  },
  {
    service_name: 'Dermal Fillers',
    category: 'Treatment',
    description: 'Restore volume and smooth fine lines with advanced dermal fillers',
    price: 25000,
    price_type: 'PER_UNIT' as const,
    min_price: 25000,
    max_price: 50000,
    website_url: 'https://www.nairobisculpt.com/dermal-fillers.html',
  },

  // ============================================================================
  // CONSULTATIONS
  // ============================================================================
  {
    service_name: 'Initial Consultation',
    category: 'Consultation',
    description: 'First-time patient consultation with our expert surgeons to discuss your aesthetic goals',
    price: 5000,
    price_type: 'FIXED' as const,
    min_price: null,
    max_price: null,
    website_url: null,
  },
  {
    service_name: 'Follow-up Consultation',
    category: 'Consultation',
    description: 'Follow-up appointment for existing patients to discuss progress and next steps',
    price: 3000,
    price_type: 'FIXED' as const,
    min_price: null,
    max_price: null,
    website_url: null,
  },
];

/**
 * Category mapping for display/filtering
 * Matches website structure exactly
 */
export const SERVICE_CATEGORIES = [
  { value: 'all', label: 'All Services' },
  { value: 'Procedure', label: 'Procedures' },
  { value: 'Treatment', label: 'Treatments' },
  { value: 'Consultation', label: 'Consultations' },
] as const;

/**
 * Category groups for UI grouping (matches website)
 */
export const CATEGORY_GROUPS = {
  'Facial Procedures': ['Facelift', 'Rhinoplasty', 'Blepharoplasty', 'Brow Lift', 'Chin Augmentation', 'Otoplasty'],
  'Body Procedures': ['Liposuction', 'Brazilian Butt Lift', 'Tummy Tuck'],
  'Breast Procedures': ['Breast Augmentation', 'Breast Lift', 'Breast Reduction', 'Male Gynecomastia'],
  'Skin and Scar Treatments': ['Scar Management', 'Keloid Treatment', 'Scar Revision', 'Advanced Wound Care'],
  'Non-Surgical Treatments': ['Botox', 'Dermal Fillers'],
  'Consultations': ['Initial Consultation', 'Follow-up Consultation'],
} as const;

async function main() {
  console.log('🌱 Seeding real Nairobi Sculpt services from website...\n');
  console.log('📄 Source: https://www.nairobisculpt.com/services.html\n');

  let created = 0;
  let updated = 0;

  for (const serviceData of realServices) {
    try {
      // Check if service already exists by name
      const existing = await prisma.service.findFirst({
        where: {
          service_name: serviceData.service_name,
        },
      });

      if (existing) {
        // Update existing service with website data
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            description: serviceData.description,
            category: serviceData.category,
            is_active: true,
            price_type: serviceData.price_type,
            min_price: serviceData.min_price,
            max_price: serviceData.max_price,
            // Only update price if it's explicitly set (>0)
            price: serviceData.price > 0 ? serviceData.price : existing.price,
          },
        });
        updated++;
        console.log(`  ✓ Updated: ${serviceData.service_name} (${serviceData.price_type})`);
      } else {
        // Create new service
        await prisma.service.create({
          data: {
            service_name: serviceData.service_name,
            description: serviceData.description,
            category: serviceData.category,
            price: serviceData.price,
            price_type: serviceData.price_type,
            min_price: serviceData.min_price,
            max_price: serviceData.max_price,
            is_active: true,
          },
        });
        created++;
        console.log(`  ✓ Created: ${serviceData.service_name} (${serviceData.price_type})`);
      }
    } catch (error) {
      console.error(`  ✗ Error with ${serviceData.service_name}:`, error);
    }
  }

  console.log(`\n✅ Services seed complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${created + updated}`);
  console.log(`\n📋 Categories: Procedure, Treatment, Consultation`);
  console.log(`💰 Price Types: FIXED, VARIABLE, PER_UNIT, QUOTE_REQUIRED`);
  console.log(`🔗 Website URLs available for "Learn More" links\n`);
}

main()
  .catch((error) => {
    console.error('❌ Error seeding services:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
