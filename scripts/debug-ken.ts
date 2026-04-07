import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public" }
  }
});

async function main() {
  const doctors = await prisma.user.findMany({
    where: { role: 'DOCTOR', status: 'ACTIVE' },
    select: { email: true, first_name: true, last_name: true, password_hash: true },
    take: 5
  });
  console.log("Here are active doctors present in the DB you can use:");
  doctors.forEach(doc => {
    console.log(`Email: ${doc.email} | Name: ${doc.first_name} ${doc.last_name} | Has Password Hash: ${!!doc.password_hash}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
