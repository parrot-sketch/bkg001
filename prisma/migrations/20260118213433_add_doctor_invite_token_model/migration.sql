-- CreateTable
CREATE TABLE "DoctorInviteToken" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "invalidated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorInviteToken_doctor_id_key" ON "DoctorInviteToken"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorInviteToken_email_key" ON "DoctorInviteToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorInviteToken_token_key" ON "DoctorInviteToken"("token");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_token_idx" ON "DoctorInviteToken"("token");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_email_idx" ON "DoctorInviteToken"("email");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_doctor_id_idx" ON "DoctorInviteToken"("doctor_id");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_expires_at_idx" ON "DoctorInviteToken"("expires_at");

-- CreateIndex
CREATE INDEX "DoctorInviteToken_invited_by_idx" ON "DoctorInviteToken"("invited_by");
