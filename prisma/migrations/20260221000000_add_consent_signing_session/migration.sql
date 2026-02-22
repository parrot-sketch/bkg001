-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('NAME_DOB_ONLY', 'NAME_DOB_OTP', 'STAFF_VERIFIED', 'EMERGENCY_OVERRIDE');

-- CreateEnum
CREATE TYPE "SigningStatus" AS ENUM ('PENDING', 'VERIFYING', 'VERIFIED', 'SIGNING', 'SIGNED', 'VERIFICATION_FAILED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ConsentSigningSession" (
    "id" TEXT NOT NULL,
    "consent_form_id" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verification_method" "VerificationMethod" NOT NULL,
    "patient_name_entered" TEXT,
    "patient_dob_entered" TIMESTAMP(3),
    "patient_file_number" TEXT,
    "phone_number_used" TEXT,
    "otp_sent" BOOLEAN NOT NULL DEFAULT false,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "requires_staff_verify" BOOLEAN NOT NULL DEFAULT false,
    "verified_by_staff_id" TEXT,
    "verified_by_staff_at" TIMESTAMP(3),
    "staff_verification_note" TEXT,
    "signed_at" TIMESTAMP(3),
    "signed_by_ip" TEXT,
    "signed_by_user_agent" TEXT,
    "patient_signature" TEXT,
    "witness_name" TEXT,
    "witness_signature" TEXT,
    "witness_id" TEXT,
    "status" "SigningStatus" NOT NULL DEFAULT 'PENDING',
    "identity_match_score" DOUBLE PRECISION,
    "verification_attempts" INTEGER NOT NULL DEFAULT 0,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentSigningSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentSigningSession_consent_form_id_key" ON "ConsentSigningSession"("consent_form_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentSigningSession_qr_code_key" ON "ConsentSigningSession"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentSigningSession_token_key" ON "ConsentSigningSession"("token");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_qr_code_idx" ON "ConsentSigningSession"("qr_code");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_token_idx" ON "ConsentSigningSession"("token");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_expires_at_idx" ON "ConsentSigningSession"("expires_at");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_status_idx" ON "ConsentSigningSession"("status");

-- CreateIndex
CREATE INDEX "ConsentSigningSession_requires_staff_verify_idx" ON "ConsentSigningSession"("requires_staff_verify");

-- AddForeignKey
ALTER TABLE "ConsentSigningSession" ADD CONSTRAINT "ConsentSigningSession_consent_form_id_fkey" FOREIGN KEY ("consent_form_id") REFERENCES "ConsentForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentSigningSession" ADD CONSTRAINT "ConsentSigningSession_verified_by_staff_id_fkey" FOREIGN KEY ("verified_by_staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentSigningSession" ADD CONSTRAINT "ConsentSigningSession_witness_id_fkey" FOREIGN KEY ("witness_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
