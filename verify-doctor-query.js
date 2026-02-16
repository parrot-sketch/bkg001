
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enum value from the codebase
const PENDING_DOCTOR_CONFIRMATION = 'PENDING_DOCTOR_CONFIRMATION';

async function main() {
    console.log('--- Simulating Doctor Dashboard Pending Query ---');

    // Logic from GetDoctorAppointmentsUseCase
    const status = PENDING_DOCTOR_CONFIRMATION;
    const where = {};

    if (status) {
        where.status = status; // Direct assignment as per UseCase
    }

    console.log('Querying with where:', JSON.stringify(where, null, 2));

    const appointments = await prisma.appointment.findMany({
        where,
        select: {
            id: true,
            status: true,
            patient: { select: { first_name: true, last_name: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 5
    });

    console.log(`Found ${appointments.length} appointments.`);
    appointments.forEach(apt => {
        console.log(`[${apt.id}] ${apt.patient?.first_name} ${apt.patient?.last_name} - ${apt.status}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
