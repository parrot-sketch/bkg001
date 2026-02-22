-- Migration: Add PDF support to ConsentTemplate
-- This migration adds fields to support doctors uploading their existing PDF consent forms

-- Add TemplateFormat enum
CREATE TYPE "TemplateFormat" AS ENUM ('HTML', 'PDF', 'HYBRID');

-- Add PDF support fields to ConsentTemplate
ALTER TABLE "ConsentTemplate" 
  ADD COLUMN "pdf_url" TEXT,
  ADD COLUMN "template_format" "TemplateFormat" NOT NULL DEFAULT 'HTML',
  ADD COLUMN "extracted_content" TEXT;

-- Add index for template format queries
CREATE INDEX "ConsentTemplate_template_format_idx" ON "ConsentTemplate"("template_format");
