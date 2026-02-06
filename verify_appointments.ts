
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    console.log("Checking appointments for today:", todayStart.toISOString(), "to", todayEnd.toISOString());

    const appointments = await prisma.appointment.findMany({
        where: {
            appointment_date: {
                gte: todayStart,
                lte: todayEnd,
            },
        },
        select: {
            id: true,
            status: true,
            consultation_request_status: true,
            doctor_id: true,
            appointment_date: true,
            time: true
        }
    });

    console.log("Found appointments:", appointments.length);
    appointments.forEach(a => {
        console.log(`ID: ${a.id}, Status: ${a.status}, ReqStatus: ${a.consultation_request_status}, Time: ${a.time}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
