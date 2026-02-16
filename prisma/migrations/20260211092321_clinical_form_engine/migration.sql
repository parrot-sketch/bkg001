-- CreateEnum
CREATE TYPE "ClinicalFormStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateTable
CREATE TABLE "ClinicalFormTemplate" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "role_owner" "Role" NOT NULL,
    "schema_json" TEXT NOT NULL,
    "ui_json" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalFormResponse" (
    "id" TEXT NOT NULL,
    "template_id" INTEGER NOT NULL,
    "template_key" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "surgical_case_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "status" "ClinicalFormStatus" NOT NULL DEFAULT 'DRAFT',
    "data_json" TEXT NOT NULL,
    "signed_by_user_id" TEXT,
    "signed_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalFormTemplate_key_is_active_idx" ON "ClinicalFormTemplate"("key", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalFormTemplate_key_version_key" ON "ClinicalFormTemplate"("key", "version");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_surgical_case_id_idx" ON "ClinicalFormResponse"("surgical_case_id");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_patient_id_idx" ON "ClinicalFormResponse"("patient_id");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_status_idx" ON "ClinicalFormResponse"("status");

-- CreateIndex
CREATE INDEX "ClinicalFormResponse_template_key_idx" ON "ClinicalFormResponse"("template_key");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalFormResponse_template_key_template_version_surgical_key" ON "ClinicalFormResponse"("template_key", "template_version", "surgical_case_id");

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ClinicalFormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_surgical_case_id_fkey" FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_signed_by_user_id_fkey" FOREIGN KEY ("signed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFormResponse" ADD CONSTRAINT "ClinicalFormResponse_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
