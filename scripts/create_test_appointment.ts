
import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating test appointment...');

    // Find a patient
    const patient = await prisma.patient.findFirst();
    if (!patient) {
        console.error('No patient found');
        return;
    }

    // Find a doctor
    const doctor = await prisma.doctor.findFirst();
    if (!doctor) {
        console.error('No doctor found');
        return;
    }

    // Create appointment for today
    const today = new Date();
    today.setHours(9, 0, 0, 0);

    const appointment = await prisma.appointment.create({
        data: {
            patient_id: patient.id,
            doctor_id: doctor.id,
            appointment_date: today,
            time: '09:00',
            status: AppointmentStatus.SCHEDULED,
            type: 'Laparoscopy', // To trigger the Pre-Op workflow action
            reason: 'Test procedure',

            // We need to simulate check-in for it to appear in "Today's Checked In"
            // The query uses checkedInAt field if I recall correctly, OR just status=SCHEDULED and date=today 
            // Let's check the API... API uses date range.
            // But NurseDashboard hook uses `getTodayCheckedInPatients`.
            // `getTodayCheckedInPatients` calls `/appointments/today`.
            // `/appointments/today` returns ALL appointments for today.
            // The filter "Checked In" might be on the frontend or implicit in the API name?
            // Wait, `getTodayCheckedInPatients` name suggests it filters by check-in.
            // But `api/appointments/today/route.ts` (Step 267) returns ALL appointments.
            // Let's check `getTodayCheckedInPatients` in `lib/api/nurse.ts` (Step 183)
            // `getTodayCheckedInPatients: () => apiClient.get('/appointments/today?status=SCHEDULED')`
            // Actually `api/appointments/today` ignores the status query param in the code I read ("Returns all appointments scheduled for today").
            // So all today's appointments are returned.
            // The Nurse Page title is "Today's Checked In" (or "Today's Patients").
            // I'll assume just creating it is enough.
        },
    });

    console.log(`Created appointment ${appointment.id} for patient ${patient.id} with doctor ${doctor.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
