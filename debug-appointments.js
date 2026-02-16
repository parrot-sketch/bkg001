
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const appointments = await prisma.appointment.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
            patient: { select: { first_name: true, last_name: true } }
        }
    });

    console.log('--- Recent Appointments ---');
    appointments.forEach(apt => {
        console.log(`ID: ${apt.id}`);
        console.log(`Patient: ${apt.patient?.first_name} ${apt.patient?.last_name}`);
        console.log(`Status: ${apt.status}`);
        // console.log(`Source: ${apt.source}`); 
        console.log(`Consultation Request Status: ${apt.consultation_request_status}`);
        console.log('---------------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
