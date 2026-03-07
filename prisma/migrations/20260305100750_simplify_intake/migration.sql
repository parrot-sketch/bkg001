-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "marital_status" DROP NOT NULL,
ALTER COLUMN "emergency_contact_name" DROP NOT NULL,
ALTER COLUMN "emergency_contact_number" DROP NOT NULL,
ALTER COLUMN "relation" DROP NOT NULL;

-- AlterTable
ALTER TABLE "intake_submission" ALTER COLUMN "marital_status" DROP NOT NULL,
ALTER COLUMN "emergency_contact_name" DROP NOT NULL,
ALTER COLUMN "emergency_contact_number" DROP NOT NULL,
ALTER COLUMN "relation" DROP NOT NULL;
