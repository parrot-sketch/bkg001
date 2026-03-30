-- ============================================================
-- Surgical Plan Team, Billing, Calendar — Minimal Migration
-- Only adds what is missing from the live DB
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE "SurgicalTeamRole" AS ENUM ('PRIMARY_SURGEON','CO_SURGEON','ANAESTHESIOLOGIST','SCRUB_NURSE','CIRCULATING_NURSE','THEATER_TECH','OBSERVER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "BillingEstimateStatus" AS ENUM ('DRAFT','SUBMITTED','FINALIZED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "BillingLineItemCategory" AS ENUM ('CONSUMABLE','IMPLANT','MEDICATION','SERVICE','OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CalendarEventType" AS ENUM ('SURGICAL_CASE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CalendarEventStatus" AS ENUM ('TENTATIVE','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 2. EXTEND SurgicalCaseTeamMember (add 5 new columns)
-- ============================================================

ALTER TABLE "SurgicalCaseTeamMember"
    ADD COLUMN IF NOT EXISTS "is_external"           BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "external_name"         TEXT,
    ADD COLUMN IF NOT EXISTS "external_credentials"  TEXT,
    ADD COLUMN IF NOT EXISTS "assigned_by_doctor_id" TEXT,
    ADD COLUMN IF NOT EXISTS "assigned_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Index on user_id (may already exist, guard with IF NOT EXISTS via DO block)
DO $$ BEGIN
    CREATE INDEX "SurgicalCaseTeamMember_user_id_idx" ON "SurgicalCaseTeamMember"("user_id");
EXCEPTION WHEN duplicate_table THEN null; END $$;

-- FK for assigned_by_doctor_id
DO $$ BEGIN
    ALTER TABLE "SurgicalCaseTeamMember"
        ADD CONSTRAINT "SurgicalCaseTeamMember_assigned_by_doctor_id_fkey"
        FOREIGN KEY ("assigned_by_doctor_id") REFERENCES "Doctor"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 3. EXTEND CasePlan (add 4 new columns)
-- ============================================================

ALTER TABLE "CasePlan"
    ADD COLUMN IF NOT EXISTS "equipment_notes"     TEXT,
    ADD COLUMN IF NOT EXISTS "patient_positioning" TEXT,
    ADD COLUMN IF NOT EXISTS "post_op_instructions" TEXT,
    ADD COLUMN IF NOT EXISTS "surgeon_narrative"   TEXT;

-- ============================================================
-- 4. NEW TABLE: SurgicalBillingEstimate
-- ============================================================

CREATE TABLE IF NOT EXISTS "SurgicalBillingEstimate" (
    "id"                    TEXT NOT NULL,
    "surgical_case_id"      TEXT NOT NULL,
    "surgeon_fee"           DECIMAL(12,2) NOT NULL DEFAULT 0,
    "anaesthesiologist_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "theatre_fee"           DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal"              DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status"                "BillingEstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_doctor_id"  TEXT NOT NULL,
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurgicalBillingEstimate_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "SurgicalBillingEstimate"
        ADD CONSTRAINT "SurgicalBillingEstimate_surgical_case_id_fkey"
        FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "SurgicalBillingEstimate"
        ADD CONSTRAINT "SurgicalBillingEstimate_created_by_doctor_id_fkey"
        FOREIGN KEY ("created_by_doctor_id") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "SurgicalBillingEstimate"
        ADD CONSTRAINT "SurgicalBillingEstimate_surgical_case_id_key" UNIQUE ("surgical_case_id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "SurgicalBillingEstimate_surgical_case_id_idx" ON "SurgicalBillingEstimate"("surgical_case_id");
CREATE INDEX IF NOT EXISTS "SurgicalBillingEstimate_status_idx" ON "SurgicalBillingEstimate"("status");

-- ============================================================
-- 5. NEW TABLE: SurgicalBillingLineItem
-- ============================================================

CREATE TABLE IF NOT EXISTS "SurgicalBillingLineItem" (
    "id"                  TEXT NOT NULL,
    "billing_estimate_id" TEXT NOT NULL,
    "description"         TEXT NOT NULL,
    "category"            "BillingLineItemCategory" NOT NULL DEFAULT 'OTHER',
    "quantity"            INTEGER NOT NULL DEFAULT 1,
    "unit_price"          DECIMAL(12,2) NOT NULL,
    "total_price"         DECIMAL(12,2) NOT NULL,
    "inventory_item_id"   INTEGER,
    "is_from_inventory"   BOOLEAN NOT NULL DEFAULT false,
    "added_by_role"       TEXT NOT NULL,
    "notes"               TEXT,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurgicalBillingLineItem_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "SurgicalBillingLineItem"
        ADD CONSTRAINT "SurgicalBillingLineItem_billing_estimate_id_fkey"
        FOREIGN KEY ("billing_estimate_id") REFERENCES "SurgicalBillingEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "SurgicalBillingLineItem"
        ADD CONSTRAINT "SurgicalBillingLineItem_inventory_item_id_fkey"
        FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "SurgicalBillingLineItem_billing_estimate_id_idx" ON "SurgicalBillingLineItem"("billing_estimate_id");
CREATE INDEX IF NOT EXISTS "SurgicalBillingLineItem_inventory_item_id_idx" ON "SurgicalBillingLineItem"("inventory_item_id");
CREATE INDEX IF NOT EXISTS "SurgicalBillingLineItem_category_idx" ON "SurgicalBillingLineItem"("category");

-- ============================================================
-- 6. NEW TABLE: SurgicalCaseItem
-- ============================================================

CREATE TABLE IF NOT EXISTS "SurgicalCaseItem" (
    "id"                TEXT NOT NULL,
    "surgical_case_id"  TEXT NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "quantity"          INTEGER NOT NULL DEFAULT 1,
    "added_by_user_id"  TEXT,
    "notes"             TEXT,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurgicalCaseItem_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "SurgicalCaseItem"
        ADD CONSTRAINT "SurgicalCaseItem_surgical_case_id_fkey"
        FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "SurgicalCaseItem"
        ADD CONSTRAINT "SurgicalCaseItem_inventory_item_id_fkey"
        FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "SurgicalCaseItem"
        ADD CONSTRAINT "SurgicalCaseItem_surgical_case_id_inventory_item_id_key"
        UNIQUE ("surgical_case_id", "inventory_item_id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "SurgicalCaseItem_surgical_case_id_idx" ON "SurgicalCaseItem"("surgical_case_id");
CREATE INDEX IF NOT EXISTS "SurgicalCaseItem_inventory_item_id_idx" ON "SurgicalCaseItem"("inventory_item_id");

-- ============================================================
-- 7. NEW TABLE: CalendarEvent
-- ============================================================

CREATE TABLE IF NOT EXISTS "CalendarEvent" (
    "id"               TEXT NOT NULL,
    "doctor_id"        TEXT NOT NULL,
    "surgical_case_id" TEXT,
    "type"             "CalendarEventType" NOT NULL DEFAULT 'SURGICAL_CASE',
    "team_member_role" TEXT,
    "title"            TEXT NOT NULL,
    "start_time"       TIMESTAMP(3),
    "end_time"         TIMESTAMP(3),
    "location"         TEXT,
    "status"           "CalendarEventStatus" NOT NULL DEFAULT 'TENTATIVE',
    "notes"            TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "CalendarEvent"
        ADD CONSTRAINT "CalendarEvent_doctor_id_fkey"
        FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CalendarEvent"
        ADD CONSTRAINT "CalendarEvent_surgical_case_id_fkey"
        FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "CalendarEvent"
        ADD CONSTRAINT "CalendarEvent_doctor_id_surgical_case_id_key"
        UNIQUE ("doctor_id", "surgical_case_id");
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "CalendarEvent_doctor_id_idx" ON "CalendarEvent"("doctor_id");
CREATE INDEX IF NOT EXISTS "CalendarEvent_surgical_case_id_idx" ON "CalendarEvent"("surgical_case_id");
CREATE INDEX IF NOT EXISTS "CalendarEvent_status_idx" ON "CalendarEvent"("status");
CREATE INDEX IF NOT EXISTS "CalendarEvent_start_time_idx" ON "CalendarEvent"("start_time");
CREATE INDEX IF NOT EXISTS "CalendarEvent_type_idx" ON "CalendarEvent"("type");
