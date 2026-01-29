import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const doctorCount = await prisma.doctor.count();
    const userCount = await prisma.user.count();
    console.log(JSON.stringify({ doctorCount, userCount }));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
