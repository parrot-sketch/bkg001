import { PrismaClient } from '@prisma/client';

async function listUsers() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
  });
  console.log('USERS:', users);
  process.exit(0);
}

listUsers();
