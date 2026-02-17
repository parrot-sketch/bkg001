import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const templates = await prisma.clinicalFormTemplate.findMany({
    where: { key: 'NURSE_INTRAOP_RECORD' }
  });
  console.log('Templates:', JSON.stringify(templates, null, 2));
  process.exit(0);
}
main();
