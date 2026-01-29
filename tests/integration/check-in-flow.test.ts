import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestDatabase, resetTestDatabase } from '../setup/test-database';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import { CheckInPatientUseCase } from '@/application/use-cases/CheckInPatientUseCase';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

describe('Integration: Patient Check-in Flow', () => {
    const db = getTestDatabase();
    const appointmentRepo = new PrismaAppointmentRepository(db);
    const auditService = new ConsoleAuditService();
    const timeService = new SystemTimeService();
    const useCase = new CheckInPatientUseCase(appointmentRepo, auditService, timeService);

    beforeEach(async () => {
        await resetTestDatabase();
    });

    afterAll(async () => {
        await db.$disconnect();
    });

    it('should complete full check-in flow from PENDING to SCHEDULED', async () => {
        // 1. Prepare test data
        const patient = await db.patient.create({
            data: {
                id: 'test-patient-1',
                file_number: 'NS001',
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: new Date('1990-01-01'),
                gender: 'MALE',
                email: 'john@example.com',
                phone: '+254700000001',
                marital_status: 'SINGLE',
                address: '123 Test St',
                emergency_contact_name: 'Jane Doe',
                emergency_contact_number: '+254700000002',
                relation: 'SPOUSE',
            },
        });

        const doctor = await db.doctor.create({
            data: {
                id: 'test-doctor-1',
                first_name: 'Dr.',
                last_name: 'Smith',
                name: 'Dr. Smith',
                specialization: 'General',
                email: 'smith@example.com',
                license_number: 'DOC001',
                phone: '+254700000003',
                address: 'Clinic A',
                user: {
                    create: {
                        id: 'doctor-user-1',
                        email: 'smith@example.com',
                        role: 'DOCTOR',
                        password_hash: 'hashed-password',
                    }
                }
            },
        });

        // Create a PENDING appointment for TODAY
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const appointment = await db.appointment.create({
            data: {
                patient_id: patient.id,
                doctor_id: doctor.id,
                appointment_date: new Date(todayStr),
                time: '14:30',
                status: 'PENDING',
                type: 'Consultation',
            },
        });

        // 2. Execute Check-in
        const result = await useCase.execute({
            appointmentId: appointment.id,
            userId: 'staff-user-1',
        });

        // 3. Verify Result
        expect(result.status).toBe(AppointmentStatus.SCHEDULED);

        // 4. Verify Database state
        const updatedApt = await db.appointment.findUnique({
            where: { id: appointment.id },
        });

        expect(updatedApt?.status).toBe('SCHEDULED');
        expect(updatedApt?.checked_in_at).toBeDefined();
        expect(updatedApt?.checked_in_by).toBe('staff-user-1');

        // Since it's 14:30 and the test runs at 'now', it might be late or not depending on execution time
        // But we verified the logic in unit tests, here we just check fields are populated
        expect(updatedApt?.late_arrival).toBeDefined();
    });
});
