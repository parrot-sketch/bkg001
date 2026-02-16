import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestDatabase, resetTestDatabase } from '../setup/test-database';
import { TheaterService } from '@/application/services/TheaterService';
import { TheaterBookingStatus } from '@prisma/client';

describe('Integration: Booking Concurrency (Slot Locking)', () => {
    const db = getTestDatabase();
    const theaterService = new TheaterService(db);

    beforeEach(async () => {
        await resetTestDatabase();
    });

    afterAll(async () => {
        await db.$disconnect();
    });

    it('should prevent double booking using slot locking mechanism', async () => {
        // 1. Setup Data
        // Create Theater
        const theater = await db.theater.create({
            data: {
                name: 'Main Theater',
                type: 'MAJOR',
                is_active: true
            }
        });

        // Create Patient
        const patient = await db.patient.create({
            data: {
                id: 'patient-1',
                file_number: 'P001',
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: new Date('1980-01-01'),
                gender: 'MALE',
                // gender: 'MALE', - existing
                phone: '+1234567890',
                email: 'patient1@example.com',
                marital_status: 'SINGLE',
                address: '123 Test St',
                emergency_contact_name: 'Jane Doe',
                emergency_contact_number: '+0987654321',
                relation: 'SPOUSE'
            }
        });

        // Create Surgeon
        const surgeon = await db.doctor.create({
            data: {
                // id: 'surgeon-1', // let it autogenerate or specify if consistent
                first_name: 'Surgeon',
                last_name: 'One',
                name: 'Dr. Surgeon',
                email: 'surgeon@example.com',
                specialization: 'Surgery',
                license_number: 'SURG001',
                phone: '+1555555555',
                address: 'Hospital Content',
                user: {
                    create: {
                        email: 'surgeon@example.com',
                        password_hash: 'hashed',
                        role: 'DOCTOR'
                    }
                }
            }
        });

        // Create Two Cases
        const caseA = await db.surgicalCase.create({
            data: {
                id: 'case-a',
                patient_id: patient.id,
                primary_surgeon_id: surgeon.id,
                status: 'READY_FOR_SCHEDULING',
                urgency: 'ELECTIVE',
                diagnosis: 'Diagnosis A',
                procedure_name: 'Procedure A'
            }
        });

        const caseB = await db.surgicalCase.create({
            data: {
                id: 'case-b',
                patient_id: patient.id, // Same patient for simplicity
                primary_surgeon_id: surgeon.id,
                status: 'READY_FOR_SCHEDULING',
                urgency: 'ELECTIVE',
                diagnosis: 'Diagnosis B',
                procedure_name: 'Procedure B'
            }
        });

        const startTime = new Date();
        startTime.setHours(10, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(12, 0, 0, 0);

        const userId = 'admin-user-1';

        // 2. Action: Lock Slot for Case A
        const bookingA = await theaterService.lockSlot(
            caseA.id,
            theater.id,
            startTime,
            endTime,
            userId
        );

        // Assert: Booking A is PROVISIONAL
        expect(bookingA.status).toBe('PROVISIONAL');
        expect(bookingA.locked_by).toBe(userId);
        expect(bookingA.locked_at).toBeDefined();

        // 3. Action: Try to Lock same slot for Case B
        // Expect: Error
        await expect(
            theaterService.lockSlot(
                caseB.id,
                theater.id,
                startTime,
                endTime,
                userId
            )
        ).rejects.toThrow('Theater is already booked or locked');

        // 4. Action: Confirm Booking A
        const confirmedA = await theaterService.confirmBooking(bookingA.id, userId);

        // Assert: Status is CONFIRMED
        expect(confirmedA.status).toBe('CONFIRMED');

        // Verify Case Status
        const updatedCaseA = await db.surgicalCase.findUnique({ where: { id: caseA.id } });
        expect(updatedCaseA?.status).toBe('SCHEDULED');

        // 5. Action: Try to lock again for Case B (now that A is CONFIRMED)
        await expect(
            theaterService.lockSlot(
                caseB.id,
                theater.id,
                startTime,
                endTime,
                userId
            )
        ).rejects.toThrow('Theater is already booked or locked');
    });

    it('should allow locking if previous provisional lock expired', async () => {
        // ... (keep existing test logic) ...
        // I will just copy the existing test body here to ensure it's preserved, then add new tests below.
        // Actually, replacing proper chunk.

        // 1. Setup Theater & Cases (Simplified)
        const theater = await db.theater.create({ data: { name: 'Theater 2', type: 'MINOR', is_active: true } });

        const patient = await db.patient.create({
            data: {
                id: 'p2',
                first_name: 'Jane',
                last_name: 'Doe',
                date_of_birth: new Date(),
                gender: 'FEMALE',
                file_number: 'P002',
                phone: '+1987654321',
                email: 'patient2@example.com',
                marital_status: 'MARRIED',
                address: '456 Test Ave',
                emergency_contact_name: 'John Doe',
                emergency_contact_number: '+1123456789',
                relation: 'BROTHER'
            }
        });

        const surgeon = await db.doctor.create({
            data: {
                first_name: 'Dr',
                last_name: 'Two',
                name: 'Dr. Two',
                email: 's2@example.com',
                specialization: 'Gen',
                license_number: 'SURG002',
                phone: '+1444444444',
                address: 'Clinic B',
                user: {
                    create: {
                        email: 's2@example.com',
                        password_hash: 'hashed',
                        role: 'DOCTOR'
                    }
                }
            }
        });

        const caseA = await db.surgicalCase.create({
            data: { id: 'case-expired', patient_id: patient.id, primary_surgeon_id: surgeon.id, status: 'READY_FOR_SCHEDULING', urgency: 'ELECTIVE', procedure_name: 'Proc Expired' }
        });

        const caseB = await db.surgicalCase.create({
            data: { id: 'case-new', patient_id: patient.id, primary_surgeon_id: surgeon.id, status: 'READY_FOR_SCHEDULING', urgency: 'ELECTIVE', procedure_name: 'Proc New' }
        });

        const userId = 'user-1';
        const startTime = new Date();
        startTime.setFullYear(startTime.getFullYear() + 1); // Future
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        // 2. Create an EXPIRED provisional booking manually
        const expiredTime = new Date(new Date().getTime() - 10 * 60 * 1000); // 10 mins ago (limit is 5)

        await db.theaterBooking.create({
            data: {
                surgical_case_id: caseA.id,
                theater_id: theater.id,
                start_time: startTime,
                end_time: endTime,
                status: 'PROVISIONAL',
                locked_by: 'other-user',
                locked_at: expiredTime,
                // No lock_expires_at set, simulating legacy or reliance on calc
            }
        });

        // 3. Action: Lock slot for Case B
        const bookingB = await theaterService.lockSlot(
            caseB.id,
            theater.id,
            startTime,
            endTime,
            userId
        );

        expect(bookingB).toBeDefined();
        expect(bookingB.surgical_case_id).toBe(caseB.id);
    });

    it('should enforce maximum of 3 active locks per user', async () => {
        const theater = await db.theater.create({ data: { name: 'Theater Max', type: 'MAJOR', is_active: true } });
        const patient = await db.patient.create({ data: { id: 'p3', first_name: 'Max', last_name: 'Lock', date_of_birth: new Date(), gender: 'MALE', file_number: 'P003', phone: '000', email: 'max@ex.com', address: 'addr', emergency_contact_name: 'em', emergency_contact_number: '000', relation: 'x', marital_status: 'SINGLE' } });
        const surgeon = await db.doctor.create({ data: { first_name: 'S', last_name: '3', name: 'S3', email: 's3@ex.com', specialization: 'S', license_number: 'L3', phone: '0', address: 'a', user: { create: { email: 's3@ex.com', password_hash: 'x', role: 'DOCTOR' } } } });

        const userId = 'heavy-user';
        const baseTime = new Date();
        baseTime.setFullYear(2030, 0, 1);

        // Create 3 active locks
        for (let i = 1; i <= 3; i++) {
            const c = await db.surgicalCase.create({ data: { id: `case-max-${i}`, patient_id: patient.id, primary_surgeon_id: surgeon.id, status: 'READY_FOR_SCHEDULING' } });
            const start = new Date(baseTime.getTime() + i * 3600 * 1000);
            const end = new Date(start.getTime() + 3600 * 1000);
            await theaterService.lockSlot(c.id, theater.id, start, end, userId);
        }

        // Try 4th
        const c4 = await db.surgicalCase.create({ data: { id: `case-max-4`, patient_id: patient.id, primary_surgeon_id: surgeon.id, status: 'READY_FOR_SCHEDULING' } });
        const start4 = new Date(baseTime.getTime() + 4 * 3600 * 1000);
        const end4 = new Date(start4.getTime() + 3600 * 1000);

        await expect(theaterService.lockSlot(c4.id, theater.id, start4, end4, userId))
            .rejects.toThrow('maximum number of active locks');
    });

    it('should prevent confirmation by different user unless Admin', async () => {
        const theater = await db.theater.create({ data: { name: 'Theater Auth', type: 'MAJOR', is_active: true } });
        const patient = await db.patient.create({ data: { id: 'p4', first_name: 'Auth', last_name: 'T', date_of_birth: new Date(), gender: 'MALE', file_number: 'P004', phone: '000', email: 'auth@ex.com', address: 'addr', emergency_contact_name: 'em', emergency_contact_number: '000', relation: 'x', marital_status: 'SINGLE' } });
        const surgeon = await db.doctor.create({ data: { first_name: 'S', last_name: '4', name: 'S4', email: 's4@ex.com', specialization: 'S', license_number: 'L4', phone: '0', address: 'a', user: { create: { email: 's4@ex.com', password_hash: 'x', role: 'DOCTOR' } } } });

        const c = await db.surgicalCase.create({ data: { id: 'case-auth', patient_id: patient.id, primary_surgeon_id: surgeon.id, status: 'READY_FOR_SCHEDULING' } });
        const start = new Date(); start.setFullYear(2031, 0, 1);
        const end = new Date(start.getTime() + 3600 * 1000);

        const lockerId = 'locker-1';
        const otherId = 'intruder-1';
        const booking = await theaterService.lockSlot(c.id, theater.id, start, end, lockerId);

        // Intruder fails
        await expect(theaterService.confirmBooking(booking.id, otherId))
            .rejects.toThrow('locked by another user');

        // Admin succeeds
        // Intentionally passing userRole 'ADMIN'
        const confirmed = await theaterService.confirmBooking(booking.id, otherId, 'ADMIN');
        expect(confirmed.status).toBe('CONFIRMED');
        expect(confirmed.confirmed_by).toBe(otherId);
    });

    it('should reject confirmation if lock expired', async () => {
        const theater = await db.theater.create({ data: { name: 'Theater Exp', type: 'MAJOR', is_active: true } });
        const patient = await db.patient.create({ data: { id: 'p5', first_name: 'Exp', last_name: 'T', date_of_birth: new Date(), gender: 'MALE', file_number: 'P005', phone: '000', email: 'exp@ex.com', address: 'addr', emergency_contact_name: 'em', emergency_contact_number: '000', relation: 'x', marital_status: 'SINGLE' } });
        const surgeon = await db.doctor.create({ data: { first_name: 'S', last_name: '5', name: 'S5', email: 's5@ex.com', specialization: 'S', license_number: 'L5', phone: '0', address: 'a', user: { create: { email: 's5@ex.com', password_hash: 'x', role: 'DOCTOR' } } } });

        const c = await db.surgicalCase.create({ data: { id: 'case-exp', patient_id: patient.id, primary_surgeon_id: surgeon.id, status: 'READY_FOR_SCHEDULING' } });
        const start = new Date(); start.setFullYear(2032, 0, 1);
        const end = new Date(start.getTime() + 3600 * 1000);
        const userId = 'slow-user';

        const booking = await theaterService.lockSlot(c.id, theater.id, start, end, userId);

        // Manually expire it in DB
        const expiredDate = new Date(new Date().getTime() - 10 * 60 * 1000);
        await db.theaterBooking.update({
            where: { id: booking.id },
            data: {
                locked_at: expiredDate,
                lock_expires_at: expiredDate
            }
        });

        await expect(theaterService.confirmBooking(booking.id, userId))
            .rejects.toThrow('lock has expired');
    });
});
