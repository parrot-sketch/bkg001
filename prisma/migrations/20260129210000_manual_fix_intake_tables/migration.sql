-- CreateTable
CREATE TABLE "intake_session" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,

    CONSTRAINT "intake_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_submission" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp_phone" TEXT,
    "address" TEXT NOT NULL,
    "marital_status" TEXT NOT NULL,
    "occupation" TEXT,
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_number" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "blood_group" TEXT,
    "allergies" TEXT,
    "medical_conditions" TEXT,
    "medical_history" TEXT,
    "insurance_provider" TEXT,
    "insurance_number" TEXT,
    "privacy_consent" BOOLEAN NOT NULL,
    "service_consent" BOOLEAN NOT NULL,
    "medical_consent" BOOLEAN NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_patient_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intake_session_session_id_key" ON "intake_session"("session_id");

-- CreateIndex
CREATE INDEX "intake_session_session_id_idx" ON "intake_session"("session_id");

-- CreateIndex
CREATE INDEX "intake_session_expires_at_idx" ON "intake_session"("expires_at");

-- CreateIndex
CREATE INDEX "intake_session_status_idx" ON "intake_session"("status");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submission_submission_id_key" ON "intake_submission"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "intake_submission_session_id_key" ON "intake_submission"("session_id");

-- CreateIndex
CREATE INDEX "intake_submission_session_id_idx" ON "intake_submission"("session_id");

-- CreateIndex
CREATE INDEX "intake_submission_status_idx" ON "intake_submission"("status");

-- CreateIndex
CREATE INDEX "intake_submission_submitted_at_idx" ON "intake_submission"("submitted_at");

-- CreateIndex
CREATE INDEX "intake_submission_created_patient_id_idx" ON "intake_submission"("created_patient_id");

-- AddForeignKey
ALTER TABLE "intake_submission" ADD CONSTRAINT "intake_submission_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intake_session"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
