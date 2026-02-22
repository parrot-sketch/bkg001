/**
 * Apply Missing Migrations Script
 * 
 * This script manually applies migrations that may have been missed during baseline.
 * Run this if you get column/table not found errors during seeding.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Applying missing migrations...\n');

  try {
    // Check and apply ConsentTemplate template_format migration
    console.log('📋 Checking ConsentTemplate schema...');
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ConsentTemplate' AND column_name = 'template_format'
    `;

    if (columns.length === 0) {
      console.log('   ⚠️  template_format column missing, applying migration...');
      
      // Apply the migration - execute each statement separately
      try {
        // Create enum type
        await prisma.$executeRawUnsafe(`
          DO $$ BEGIN
              CREATE TYPE "TemplateFormat" AS ENUM ('HTML', 'PDF', 'HYBRID');
          EXCEPTION
              WHEN duplicate_object THEN null;
          END $$;
        `);
        
        // Add columns
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "ConsentTemplate" 
            ADD COLUMN IF NOT EXISTS "pdf_url" TEXT,
            ADD COLUMN IF NOT EXISTS "template_format" "TemplateFormat" NOT NULL DEFAULT 'HTML',
            ADD COLUMN IF NOT EXISTS "extracted_content" TEXT;
        `);
        
        // Add index
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "ConsentTemplate_template_format_idx" ON "ConsentTemplate"("template_format");
        `);
        
        console.log('   ✅ template_format column added\n');
      } catch (error: any) {
        console.log(`   ⚠️  Error applying migration: ${error.message}`);
        console.log('   💡 You may need to apply this migration manually\n');
      }
    } else {
      console.log('   ✅ template_format column exists\n');
    }

    // Check for ConsentSigningSession table
    console.log('📋 Checking ConsentSigningSession table...');
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'ConsentSigningSession'
    `;

    if (tables.length === 0) {
      console.log('   ⚠️  ConsentSigningSession table missing');
      console.log('   💡 This table will be created when the migration is applied\n');
    } else {
      console.log('   ✅ ConsentSigningSession table exists\n');
    }

    console.log('✅ Missing migrations check completed\n');

  } catch (error) {
    console.error('❌ Error applying migrations:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
