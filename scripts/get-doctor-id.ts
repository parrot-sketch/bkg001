
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const doctor = await prisma.doctor.findFirst();
    if (doctor) {
        console.log(doctor.id);
    } else {
        console.error('No doctors found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
