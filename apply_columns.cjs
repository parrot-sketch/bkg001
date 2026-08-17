const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  await prisma.$executeRaw`ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "referral_source" TEXT`;
  await prisma.$executeRaw`ALTER TABLE "PatientBill" ADD COLUMN IF NOT EXISTS "custom_description" TEXT`;
  await prisma.$executeRaw`ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "primary_surgeon_name" TEXT`;
  console.log('Columns applied');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
