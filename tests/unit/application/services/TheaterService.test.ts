/**
 * Unit Tests: TheaterService
 *
 * Tests for theater booking service methods with READY_FOR_THEATER_BOOKING validation.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestDatabase, resetTestDatabase } from '../../setup/test-database';
import { TheaterService } from '@/application/services/TheaterService';
import { SurgicalCaseStatus, TheaterBookingStatus } from '@prisma/client';

describe('TheaterService - READY_FOR_THEATER_BOOKING Validation', () => {
    const db = getTestDatabase();
    const theaterService = new TheaterService(db);

    beforeEach(async () => {
        await resetTestDatabase();
    });

    afterAll(async () => {
        await db.$disconnect();
    });

    describe('lockSlot', () => {
        it('should reject locking slot if case is not in READY_FOR_THEATER_BOOKING status', async () => {
            // Setup
            const theater = await db.theater.create({
                data: { name: 'Test Theater', type: 'MAJOR', is_active: true },
            });

            const patient = await db.patient.create({
                data: {
                    id: 'patient-1',
                    file_number: 'P001',
                    first_name: 'John',
                    last_name: 'Doe',
                    date_of_birth: new Date('1980-01-01'),
                    gender: 'MALE',
                    phone: '+1234567890',
                    email: 'patient@example.com',
                    marital_status: 'SINGLE',
                    address: '123 Test St',
                    emergency_contact_name: 'Jane Doe',
                    emergency_contact_number: '+0987654321',
                    relation: 'SPOUSE',
                },
            });

            const surgeon = await db.doctor.create({
                data: {
                    first_name: 'Dr',
                    last_name: 'Surgeon',
                    name: 'Dr. Surgeon',
                    email: 'surgeon@example.com',
                    specialization: 'Surgery',
                    license_number: 'SURG001',
                    phone: '+1555555555',
                    address: 'Hospital',
                    user: {
                        create: {
                            email: 'surgeon@example.com',
                            password_hash: 'hashed',
                            role: 'DOCTOR',
                        },
                    },
                },
            });

            // Create case in wrong status
            const caseInWrongStatus = await db.surgicalCase.create({
                data: {
                    id: 'case-wrong-status',
                    patient_id: patient.id,
                    primary_surgeon_id: surgeon.id,
                    status: SurgicalCaseStatus.READY_FOR_SCHEDULING, // Wrong status
                    urgency: 'ELECTIVE',
                    procedure_name: 'Test Procedure',
                },
            });

            const startTime = new Date();
            startTime.setHours(10, 0, 0, 0);
            const endTime = new Date(startTime);
            endTime.setHours(12, 0, 0, 0);

            // Test
            await expect(
                theaterService.lockSlot(
                    caseInWrongStatus.id,
                    theater.id,
                    startTime,
                    endTime,
                    'user-1'
                )
            ).rejects.toThrow('READY_FOR_THEATER_BOOKING');
        });

        it('should allow locking slot if case is in READY_FOR_THEATER_BOOKING status', async () => {
            // Setup
            const theater = await db.theater.create({
                data: { name: 'Test Theater', type: 'MAJOR', is_active: true },
            });

            const patient = await db.patient.create({
                data: {
                    id: 'patient-2',
                    file_number: 'P002',
                    first_name: 'Jane',
                    last_name: 'Doe',
                    date_of_birth: new Date('1985-01-01'),
                    gender: 'FEMALE',
                    phone: '+1234567891',
                    email: 'patient2@example.com',
                    marital_status: 'MARRIED',
                    address: '456 Test Ave',
                    emergency_contact_name: 'John Doe',
                    emergency_contact_number: '+0987654322',
                    relation: 'SPOUSE',
                },
            });

            const surgeon = await db.doctor.create({
                data: {
                    first_name: 'Dr',
                    last_name: 'Surgeon2',
                    name: 'Dr. Surgeon2',
                    email: 'surgeon2@example.com',
                    specialization: 'Surgery',
                    license_number: 'SURG002',
                    phone: '+1555555556',
                    address: 'Hospital',
                    user: {
                        create: {
                            email: 'surgeon2@example.com',
                            password_hash: 'hashed',
                            role: 'DOCTOR',
                        },
                    },
                },
            });

            // Create case in correct status
            const caseReady = await db.surgicalCase.create({
                data: {
                    id: 'case-ready',
                    patient_id: patient.id,
                    primary_surgeon_id: surgeon.id,
                    status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING, // Correct status
                    urgency: 'ELECTIVE',
                    procedure_name: 'Test Procedure',
                },
            });

            const startTime = new Date();
            startTime.setHours(10, 0, 0, 0);
            const endTime = new Date(startTime);
            endTime.setHours(12, 0, 0, 0);

            // Test
            const booking = await theaterService.lockSlot(
                caseReady.id,
                theater.id,
                startTime,
                endTime,
                'user-1'
            );

            expect(booking).toBeDefined();
            expect(booking.status).toBe(TheaterBookingStatus.PROVISIONAL);
            expect(booking.surgical_case_id).toBe(caseReady.id);
            expect(booking.theater_id).toBe(theater.id);
        });
    });

    describe('bookSlot', () => {
        it('should reject booking if case is not in READY_FOR_THEATER_BOOKING status', async () => {
            // Setup
            const theater = await db.theater.create({
                data: { name: 'Test Theater', type: 'MAJOR', is_active: true },
            });

            const patient = await db.patient.create({
                data: {
                    id: 'patient-3',
                    file_number: 'P003',
                    first_name: 'Bob',
                    last_name: 'Smith',
                    date_of_birth: new Date('1990-01-01'),
                    gender: 'MALE',
                    phone: '+1234567892',
                    email: 'patient3@example.com',
                    marital_status: 'SINGLE',
                    address: '789 Test Rd',
                    emergency_contact_name: 'Alice Smith',
                    emergency_contact_number: '+0987654323',
                    relation: 'SPOUSE',
                },
            });

            const surgeon = await db.doctor.create({
                data: {
                    first_name: 'Dr',
                    last_name: 'Surgeon3',
                    name: 'Dr. Surgeon3',
                    email: 'surgeon3@example.com',
                    specialization: 'Surgery',
                    license_number: 'SURG003',
                    phone: '+1555555557',
                    address: 'Hospital',
                    user: {
                        create: {
                            email: 'surgeon3@example.com',
                            password_hash: 'hashed',
                            role: 'DOCTOR',
                        },
                    },
                },
            });

            const caseInWrongStatus = await db.surgicalCase.create({
                data: {
                    id: 'case-wrong-status-2',
                    patient_id: patient.id,
                    primary_surgeon_id: surgeon.id,
                    status: SurgicalCaseStatus.IN_PREP, // Wrong status
                    urgency: 'ELECTIVE',
                    procedure_name: 'Test Procedure',
                },
            });

            const startTime = new Date();
            startTime.setHours(10, 0, 0, 0);
            const endTime = new Date(startTime);
            endTime.setHours(12, 0, 0, 0);

            // Test
            await expect(
                theaterService.bookSlot(
                    caseInWrongStatus.id,
                    theater.id,
                    startTime,
                    endTime,
                    'user-1'
                )
            ).rejects.toThrow('READY_FOR_THEATER_BOOKING');
        });

        it('should allow booking if case is in READY_FOR_THEATER_BOOKING status', async () => {
            // Setup
            const theater = await db.theater.create({
                data: { name: 'Test Theater', type: 'MAJOR', is_active: true },
            });

            const patient = await db.patient.create({
                data: {
                    id: 'patient-4',
                    file_number: 'P004',
                    first_name: 'Alice',
                    last_name: 'Johnson',
                    date_of_birth: new Date('1995-01-01'),
                    gender: 'FEMALE',
                    phone: '+1234567893',
                    email: 'patient4@example.com',
                    marital_status: 'MARRIED',
                    address: '321 Test Blvd',
                    emergency_contact_name: 'Bob Johnson',
                    emergency_contact_number: '+0987654324',
                    relation: 'SPOUSE',
                },
            });

            const surgeon = await db.doctor.create({
                data: {
                    first_name: 'Dr',
                    last_name: 'Surgeon4',
                    name: 'Dr. Surgeon4',
                    email: 'surgeon4@example.com',
                    specialization: 'Surgery',
                    license_number: 'SURG004',
                    phone: '+1555555558',
                    address: 'Hospital',
                    user: {
                        create: {
                            email: 'surgeon4@example.com',
                            password_hash: 'hashed',
                            role: 'DOCTOR',
                        },
                    },
                },
            });

            const caseReady = await db.surgicalCase.create({
                data: {
                    id: 'case-ready-2',
                    patient_id: patient.id,
                    primary_surgeon_id: surgeon.id,
                    status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING, // Correct status
                    urgency: 'ELECTIVE',
                    procedure_name: 'Test Procedure',
                },
            });

            const startTime = new Date();
            startTime.setHours(10, 0, 0, 0);
            const endTime = new Date(startTime);
            endTime.setHours(12, 0, 0, 0);

            // Test
            const booking = await theaterService.bookSlot(
                caseReady.id,
                theater.id,
                startTime,
                endTime,
                'user-1'
            );

            expect(booking).toBeDefined();
            expect(booking.status).toBe(TheaterBookingStatus.CONFIRMED);
            
            // Verify case status updated to SCHEDULED
            const updatedCase = await db.surgicalCase.findUnique({
                where: { id: caseReady.id },
            });
            expect(updatedCase?.status).toBe(SurgicalCaseStatus.SCHEDULED);
        });
    });

    describe('confirmBooking', () => {
        it('should reject confirmation if case is not in READY_FOR_THEATER_BOOKING status', async () => {
            // Setup
            const theater = await db.theater.create({
                data: { name: 'Test Theater', type: 'MAJOR', is_active: true },
            });

            const patient = await db.patient.create({
                data: {
                    id: 'patient-5',
                    file_number: 'P005',
                    first_name: 'Charlie',
                    last_name: 'Brown',
                    date_of_birth: new Date('1988-01-01'),
                    gender: 'MALE',
                    phone: '+1234567894',
                    email: 'patient5@example.com',
                    marital_status: 'SINGLE',
                    address: '654 Test Ln',
                    emergency_contact_name: 'Lucy Brown',
                    emergency_contact_number: '+0987654325',
                    relation: 'SPOUSE',
                },
            });

            const surgeon = await db.doctor.create({
                data: {
                    first_name: 'Dr',
                    last_name: 'Surgeon5',
                    name: 'Dr. Surgeon5',
                    email: 'surgeon5@example.com',
                    specialization: 'Surgery',
                    license_number: 'SURG005',
                    phone: '+1555555559',
                    address: 'Hospital',
                    user: {
                        create: {
                            email: 'surgeon5@example.com',
                            password_hash: 'hashed',
                            role: 'DOCTOR',
                        },
                    },
                },
            });

            const caseInWrongStatus = await db.surgicalCase.create({
                data: {
                    id: 'case-wrong-status-3',
                    patient_id: patient.id,
                    primary_surgeon_id: surgeon.id,
                    status: SurgicalCaseStatus.SCHEDULED, // Wrong status
                    urgency: 'ELECTIVE',
                    procedure_name: 'Test Procedure',
                },
            });

            // Create provisional booking manually (bypassing validation)
            const booking = await db.theaterBooking.create({
                data: {
                    surgical_case_id: caseInWrongStatus.id,
                    theater_id: theater.id,
                    start_time: new Date(),
                    end_time: new Date(),
                    status: TheaterBookingStatus.PROVISIONAL,
                    locked_by: 'user-1',
                    locked_at: new Date(),
                },
            });

            // Test
            await expect(
                theaterService.confirmBooking(booking.id, 'user-1')
            ).rejects.toThrow('READY_FOR_THEATER_BOOKING');
        });
    });
});
