
import { PrismaClient } from '@prisma/client';
import { PrismaAvailabilityRepository } from './infrastructure/database/repositories/PrismaAvailabilityRepository';

// ID of a doctor to test
const DOCTOR_USER_ID = 'test-doctor-id';

async function main() {
    const prisma = new PrismaClient();
    const repo = new PrismaAvailabilityRepository(prisma);

    console.log('--- Testing Availability Repository ---');

    // 1. Get a doctor (or create dummy)
    let doctor = await prisma.doctor.findFirst();
    if (!doctor) {
        console.log('No doctor found, skipping test');
        return;
    }
    console.log(`Testing with Doctor ID: ${doctor.id}`);

    // 2. Mock some data in DB (optional, or just read existing)
    // For safety, let's just READ what is there first
    const availability = await repo.getDoctorAvailability(doctor.id);
    console.log('Current Availability:');
    console.log('Working Days:', availability?.workingDays.length);
    console.log('Sessions:', availability?.sessions.length);

    if (availability?.workingDays.length) {
        availability.workingDays.forEach(wd => {
            console.log(`Day: ${wd.day}, Type: ${wd.type}, Start: ${wd.startTime}, End: ${wd.endTime}`);
        });
    }

    if (availability?.sessions.length) {
        console.log('Sessions details:');
        availability.sessions.forEach(s => {
            console.log(`  - Type: ${s.sessionType}, Time: ${s.startTime}-${s.endTime}`);
        });
    }

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        // await prisma.$disconnect();
    });
