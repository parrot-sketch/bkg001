-- Migration: Add PDF support to ConsentTemplate
-- This migration adds fields to support doctors uploading their existing PDF consent forms

-- Add TemplateFormat enum (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "TemplateFormat" AS ENUM ('HTML', 'PDF', 'HYBRID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add PDF support fields to ConsentTemplate
ALTER TABLE "ConsentTemplate" 
  ADD COLUMN IF NOT EXISTS "pdf_url" TEXT,
  ADD COLUMN IF NOT EXISTS "template_format" "TemplateFormat" NOT NULL DEFAULT 'HTML',
  ADD COLUMN IF NOT EXISTS "extracted_content" TEXT;

-- Add index for template format queries (if it doesn't exist)
CREATE INDEX IF NOT EXISTS "ConsentTemplate_template_format_idx" ON "ConsentTemplate"("template_format");
