-- Add Procedure Management Tables
-- Tables: ProcedureCategoryConfig, ProcedureSubcategory, ProcedureServiceLink
-- Updated: SurgicalProcedureOption (new columns)

-- Ensure UUID generator exists for shadow DBs (avoid non-standard cuid()).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 0. Ensure ProcedureCategory enum exists (shadow DB compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProcedureCategory') THEN
        CREATE TYPE "ProcedureCategory" AS ENUM (
            'FACE',
            'BREAST',
            'BODY',
            'RECONSTRUCTIVE',
            'FACE_AND_NECK',
            'BODY_CONTOURING',
            'INTIMATE_AESTHETIC',
            'HAIR_RESTORATION',
            'NON_SURGICAL',
            'POST_WEIGHT_LOSS',
            'OTHER'
        );
    END IF;
END $$;

-- 0b. Ensure surgical_procedure_options exists (shadow DB compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'surgical_procedure_options') THEN
        CREATE TABLE "surgical_procedure_options" (
            "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid()::text,
            "category" "ProcedureCategory" NOT NULL DEFAULT 'BODY',
            "subcategory" VARCHAR(255),
            "name" VARCHAR(255) NOT NULL,
            "description" TEXT,
            "is_active" BOOLEAN NOT NULL DEFAULT true,
            "is_billable" BOOLEAN DEFAULT true,
            "estimated_duration_minutes" INTEGER,
            "default_price" DOUBLE PRECISION,
            "min_price" DOUBLE PRECISION,
            "max_price" DOUBLE PRECISION,
            "preparation_notes" TEXT,
            "post_op_notes" TEXT,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMP(3) DEFAULT NOW(),
            "created_by" VARCHAR(255),
            CONSTRAINT "surgical_procedure_options_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX IF NOT EXISTS "surgical_procedure_options_category_idx" ON "surgical_procedure_options"("category");
        CREATE UNIQUE INDEX IF NOT EXISTS "surgical_procedure_options_name_key" ON "surgical_procedure_options"("name");
    END IF;
END $$;

-- 1. Add new columns to surgical_procedure_options (safe if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'surgical_procedure_options') THEN
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "description" TEXT;
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "is_billable" BOOLEAN DEFAULT true;
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "estimated_duration_minutes" INTEGER;
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "default_price" DOUBLE PRECISION;
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "min_price" DOUBLE PRECISION;
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "max_price" DOUBLE PRECISION;
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "preparation_notes" TEXT;
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "post_op_notes" TEXT;
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT NOW();
        ALTER TABLE "surgical_procedure_options" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
    END IF;
END $$;

-- 2. Create procedure_category_config table
CREATE TABLE IF NOT EXISTS "procedure_category_config" (
    "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid()::text,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "color_code" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP(3) DEFAULT NOW(),
    CONSTRAINT "procedure_category_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "procedure_category_config_name_key" ON "procedure_category_config"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "procedure_category_config_code_key" ON "procedure_category_config"("code");
CREATE INDEX IF NOT EXISTS "procedure_category_config_code_idx" ON "procedure_category_config"("code");
CREATE INDEX IF NOT EXISTS "procedure_category_config_is_active_idx" ON "procedure_category_config"("is_active");

-- 3. Create procedure_subcategory table
CREATE TABLE IF NOT EXISTS "procedure_subcategory" (
    "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid()::text,
    "category_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "display_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP(3) DEFAULT NOW(),
    CONSTRAINT "procedure_subcategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "procedure_subcategory_category_id_name_key" ON "procedure_subcategory"("category_id", "name");
CREATE INDEX IF NOT EXISTS "procedure_subcategory_category_id_idx" ON "procedure_subcategory"("category_id");

-- 4. Create procedure_service_link table
CREATE TABLE IF NOT EXISTS "procedure_service_link" (
    "id" VARCHAR(255) NOT NULL DEFAULT gen_random_uuid()::text,
    "procedure_id" VARCHAR(255) NOT NULL,
    "service_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "procedure_service_link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "procedure_service_link_procedure_id_service_id_key" ON "procedure_service_link"("procedure_id", "service_id");
CREATE INDEX IF NOT EXISTS "procedure_service_link_procedure_id_idx" ON "procedure_service_link"("procedure_id");
CREATE INDEX IF NOT EXISTS "procedure_service_link_service_id_idx" ON "procedure_service_link"("service_id");

-- Add foreign key for procedure_service_link
ALTER TABLE "procedure_service_link" 
    ADD CONSTRAINT "procedure_service_link_procedure_id_fkey" 
    FOREIGN KEY ("procedure_id") REFERENCES "surgical_procedure_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procedure_service_link" 
    ADD CONSTRAINT "procedure_service_link_service_id_fkey" 
    FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Add foreign key for procedure_subcategory
ALTER TABLE "procedure_subcategory" 
    ADD CONSTRAINT "procedure_subcategory_category_id_fkey" 
    FOREIGN KEY ("category_id") REFERENCES "procedure_category_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Add "OTHER" to ProcedureCategory enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OTHER' AND enumtypid = '"ProcedureCategory"'::regtype) THEN
        ALTER TYPE "ProcedureCategory" ADD VALUE 'OTHER';
    END IF;
END $$;

-- 6. Create ProcedureStatus enum and table if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProcedureStatus') THEN
        CREATE TYPE "ProcedureStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');
    END IF;
END $$;
