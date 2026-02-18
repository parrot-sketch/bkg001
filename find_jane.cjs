
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { first_name: { contains: 'Jane', mode: 'insensitive' } },
                { last_name: { contains: 'Jane', mode: 'insensitive' } },
                { email: { contains: 'Jane', mode: 'insensitive' } }
            ]
        },
        include: { doctor_profile: true }
    });
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
