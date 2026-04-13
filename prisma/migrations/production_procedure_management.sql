-- Production Database Migration for Procedure Management
-- Run this against the production database
-- Note: Using gen_random_uuid() instead of cuid()

-- 1. Add new columns to surgical_procedure_options (already done)
-- ALTER TABLE surgical_procedure_options ADD COLUMN IF NOT EXISTS description TEXT;
-- ... (already applied in first run)

-- 2. Create procedure_category_config table
CREATE TABLE IF NOT EXISTS procedure_category_config (
    id VARCHAR(255) NOT NULL DEFAULT gen_random_uuid()::VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    color_code VARCHAR(255),
    created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(3) DEFAULT NOW(),
    CONSTRAINT procedure_category_config_pkey PRIMARY KEY (id)
);

ALTER TABLE procedure_category_config ADD CONSTRAINT procedure_category_config_name_key UNIQUE (name);
ALTER TABLE procedure_category_config ADD CONSTRAINT procedure_category_config_code_key UNIQUE (code);

CREATE INDEX IF NOT EXISTS idx_procedure_category_config_code ON procedure_category_config(code);
CREATE INDEX IF NOT EXISTS idx_procedure_category_config_is_active ON procedure_category_config(is_active);

-- 3. Create procedure_subcategory table
CREATE TABLE IF NOT EXISTS procedure_subcategory (
    id VARCHAR(255) NOT NULL DEFAULT gen_random_uuid()::VARCHAR(255),
    category_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(3) DEFAULT NOW(),
    CONSTRAINT procedure_subcategory_pkey PRIMARY KEY (id)
);

ALTER TABLE procedure_subcategory ADD CONSTRAINT procedure_subcategory_category_id_name_key UNIQUE (category_id, name);

ALTER TABLE procedure_subcategory ADD CONSTRAINT procedure_subcategory_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES procedure_category_config(id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_procedure_subcategory_category_id ON procedure_subcategory(category_id);

-- 4. Create procedure_service_link table
CREATE TABLE IF NOT EXISTS procedure_service_link (
    id VARCHAR(255) NOT NULL DEFAULT gen_random_uuid()::VARCHAR(255),
    procedure_id VARCHAR(255) NOT NULL,
    service_id INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT procedure_service_link_pkey PRIMARY KEY (id)
);

ALTER TABLE procedure_service_link ADD CONSTRAINT procedure_service_link_procedure_id_service_id_key UNIQUE (procedure_id, service_id);

ALTER TABLE procedure_service_link ADD CONSTRAINT procedure_service_link_procedure_id_fkey 
    FOREIGN KEY (procedure_id) REFERENCES surgical_procedure_options(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE procedure_service_link ADD CONSTRAINT procedure_service_link_service_id_fkey 
    FOREIGN KEY (service_id) REFERENCES "Service"(id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_procedure_service_link_procedure_id ON procedure_service_link(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_service_link_service_id ON procedure_service_link(service_id);

\echo 'Migration completed successfully!'