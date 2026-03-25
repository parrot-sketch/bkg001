
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result: any[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  console.log('Tables in database:');
  result.forEach(row => console.log(`- ${row.table_name}`));
}

main().finally(() => prisma.$disconnect());
