/**
 * Apply Template Format Migration Manually
 * 
 * This script manually applies the template_format migration
 * when it's been marked as applied but the column doesn't exist.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Applying template_format migration manually...\n');

  try {
    // Check if column exists
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'ConsentTemplate' 
        AND column_name = 'template_format'
    `;

    if (columns.length > 0) {
      console.log('✅ template_format column already exists\n');
      return;
    }

    console.log('📋 Column missing, applying migration...\n');

    // Step 1: Create enum type
    console.log('   1. Creating TemplateFormat enum...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
            CREATE TYPE "TemplateFormat" AS ENUM ('HTML', 'PDF', 'HYBRID');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('   ✅ Enum created\n');
    } catch (error: any) {
      console.log(`   ⚠️  Enum creation: ${error.message}\n`);
    }

    // Step 2: Add columns
    console.log('   2. Adding columns to ConsentTemplate...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ConsentTemplate" 
          ADD COLUMN IF NOT EXISTS "pdf_url" TEXT,
          ADD COLUMN IF NOT EXISTS "template_format" "TemplateFormat" NOT NULL DEFAULT 'HTML',
          ADD COLUMN IF NOT EXISTS "extracted_content" TEXT;
      `);
      console.log('   ✅ Columns added\n');
    } catch (error: any) {
      console.log(`   ❌ Error adding columns: ${error.message}\n`);
      throw error;
    }

    // Step 3: Add index
    console.log('   3. Creating index...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ConsentTemplate_template_format_idx" ON "ConsentTemplate"("template_format");
      `);
      console.log('   ✅ Index created\n');
    } catch (error: any) {
      console.log(`   ⚠️  Index creation: ${error.message}\n`);
    }

    // Verify
    const verify = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'ConsentTemplate' 
        AND column_name = 'template_format'
    `;

    if (verify.length > 0) {
      console.log('✅ Migration applied successfully!\n');
    } else {
      console.log('❌ Migration failed - column still missing\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error applying migration:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
