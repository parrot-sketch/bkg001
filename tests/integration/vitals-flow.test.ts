import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestDatabase, resetTestDatabase } from '../setup/test-database';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { getRecordVitalSignsUseCase } from '@/lib/use-cases';

describe('Integration: Clinical Triage (Vitals Flow)', () => {
    const db = getTestDatabase();

    beforeEach(async () => {
        await resetTestDatabase();
    });

    afterAll(async () => {
        await db.$disconnect();
    });

    it('should record vitals and transition appointment status correctly', async () => {
        // 1. Setup Patient
        const patient = await db.patient.create({
            data: {
                id: 'patient-triage-1',
                file_number: 'NS555',
                first_name: 'Triage',
                last_name: 'Patient',
                date_of_birth: new Date('1985-05-05'),
                gender: 'FEMALE',
                email: 'triage@example.com',
                phone: '+254711111111',
                address: 'Vitals Lane 1',
            },
        });

        // 2. Setup Doctor
        const doctor = await db.doctor.create({
            data: {
                id: 'doc-triage-1',
                first_name: 'Dr',
                last_name: 'Triage',
                name: 'Dr. Triage',
                specialization: 'Internal Medicine',
                email: 'dr.triage@example.com',
                license_number: 'TRI-001',
                phone: '+254722222222',
                address: 'Clinic T',
                user: {
                    create: {
                        id: 'doc-user-triage',
                        email: 'dr.triage@example.com',
                        role: 'DOCTOR',
                        password_hash: 'hash',
                    }
                }
            },
        });

        // 3. Create CHECKED_IN appointment
        const appointment = await db.appointment.create({
            data: {
                patient_id: patient.id,
                doctor_id: doctor.id,
                appointment_date: new Date(),
                time: '09:00',
                status: 'CHECKED_IN',
                type: 'Consultation',
            },
        });

        // 4. Verify initial state (Doctor cannot start yet in UI, but here we check status)
        expect(appointment.status).toBe('CHECKED_IN');

        // 5. Execute Triage (Record Vitals)
        const useCase = getRecordVitalSignsUseCase();
        await useCase.execute({
            patientId: patient.id,
            appointmentId: appointment.id,
            bodyTemperature: 37.2,
            systolic: 118,
            diastolic: 76,
            heartRate: '72',
            weight: 65,
            height: 170,
            recordedBy: 'nurse-user-id',
        });

        // 6. Verify Database Changes
        // Check Vitals record
        const vitals = await db.vitalSign.findMany({
            where: { patient_id: patient.id }
        });
        expect(vitals).toHaveLength(1);
        expect(vitals[0].body_temperature).toBe(37.2);
        expect(vitals[0].appointment_id).toBe(appointment.id);

        // Check Appointment status transition
        const updatedApt = await db.appointment.findUnique({
            where: { id: appointment.id }
        });
        expect(updatedApt?.status).toBe('READY_FOR_CONSULTATION');
    });
});
