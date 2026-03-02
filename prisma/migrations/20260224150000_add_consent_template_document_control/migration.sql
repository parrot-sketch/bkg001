-- CreateEnum: TemplateStatus
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum: AuditAction
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'ACTIVATED', 'ARCHIVED', 'DELETED', 'VIEWED', 'DOWNLOADED', 'DUPLICATED', 'RESTORED');

-- AlterTable: Add document control fields to ConsentTemplate
ALTER TABLE "ConsentTemplate" ADD COLUMN IF NOT EXISTS "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "ConsentTemplate" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ConsentTemplate" ADD COLUMN IF NOT EXISTS "usage_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ConsentTemplate" ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3);

-- CreateIndex: Add indexes for new fields
CREATE INDEX IF NOT EXISTS "ConsentTemplate_status_idx" ON "ConsentTemplate"("status");
CREATE INDEX IF NOT EXISTS "ConsentTemplate_created_by_idx" ON "ConsentTemplate"("created_by");

-- CreateTable: ConsentTemplateVersion
CREATE TABLE IF NOT EXISTS "ConsentTemplateVersion" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pdf_url" TEXT,
    "template_format" "TemplateFormat" NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version_notes" TEXT,

    CONSTRAINT "ConsentTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ConsentTemplateVersion
CREATE UNIQUE INDEX IF NOT EXISTS "ConsentTemplateVersion_template_id_version_number_key" ON "ConsentTemplateVersion"("template_id", "version_number");
CREATE INDEX IF NOT EXISTS "ConsentTemplateVersion_template_id_idx" ON "ConsentTemplateVersion"("template_id");
CREATE INDEX IF NOT EXISTS "ConsentTemplateVersion_created_at_idx" ON "ConsentTemplateVersion"("created_at");

-- CreateTable: ConsentTemplateAudit
CREATE TABLE IF NOT EXISTS "ConsentTemplateAudit" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" "Role" NOT NULL,
    "changes_json" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentTemplateAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ConsentTemplateAudit
CREATE INDEX IF NOT EXISTS "ConsentTemplateAudit_template_id_idx" ON "ConsentTemplateAudit"("template_id");
CREATE INDEX IF NOT EXISTS "ConsentTemplateAudit_actor_user_id_idx" ON "ConsentTemplateAudit"("actor_user_id");
CREATE INDEX IF NOT EXISTS "ConsentTemplateAudit_action_idx" ON "ConsentTemplateAudit"("action");
CREATE INDEX IF NOT EXISTS "ConsentTemplateAudit_created_at_idx" ON "ConsentTemplateAudit"("created_at");
CREATE INDEX IF NOT EXISTS "ConsentTemplateAudit_template_id_created_at_idx" ON "ConsentTemplateAudit"("template_id", "created_at");

-- AddForeignKey: ConsentTemplateVersion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConsentTemplateVersion_template_id_fkey'
  ) THEN
    ALTER TABLE "ConsentTemplateVersion" 
    ADD CONSTRAINT "ConsentTemplateVersion_template_id_fkey" 
    FOREIGN KEY ("template_id") 
    REFERENCES "ConsentTemplate"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: ConsentTemplateAudit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConsentTemplateAudit_template_id_fkey'
  ) THEN
    ALTER TABLE "ConsentTemplateAudit" 
    ADD CONSTRAINT "ConsentTemplateAudit_template_id_fkey" 
    FOREIGN KEY ("template_id") 
    REFERENCES "ConsentTemplate"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConsentTemplateAudit_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "ConsentTemplateAudit" 
    ADD CONSTRAINT "ConsentTemplateAudit_actor_user_id_fkey" 
    FOREIGN KEY ("actor_user_id") 
    REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Set default status for existing templates (set ACTIVE if is_active=true, otherwise DRAFT)
UPDATE "ConsentTemplate" 
SET "status" = CASE 
  WHEN "is_active" = true THEN 'ACTIVE'::"TemplateStatus"
  ELSE 'DRAFT'::"TemplateStatus"
END
WHERE "status" IS NULL;
