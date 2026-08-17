const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const cols = await prisma.queryRaw`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_name IN ('Patient','PatientBill','SurgicalCase')
      AND column_name IN ('referral_source','custom_description','primary_surgeon_name')
    ORDER BY table_name, column_name
  `;
  console.log(JSON.stringify(cols, null, 2));
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
