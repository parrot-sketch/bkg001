/**
 * Integration Tests: Frontdesk Theater Booking Workflow
 *
 * Tests the complete theater booking workflow from pre-op finalization to booking confirmation.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestDatabase, resetTestDatabase } from '../setup/test-database';
import { TheaterService } from '@/application/services/TheaterService';
import { SurgicalCaseStatusTransitionService } from '@/application/services/SurgicalCaseStatusTransitionService';
import { SurgicalCaseStatus, TheaterBookingStatus, ClinicalFormStatus } from '@prisma/client';

describe('Integration: Frontdesk Theater Booking Workflow', () => {
    const db = getTestDatabase();
    const theaterService = new TheaterService(db);
    const statusTransitionService = new SurgicalCaseStatusTransitionService(db);

    beforeEach(async () => {
        await resetTestDatabase();
    });

    afterAll(async () => {
        await db.$disconnect();
    });

    it('should complete full workflow: Pre-op finalized → Ready for booking → Theater booked → Scheduled', async () => {
        // 1. Setup
        const theater = await db.theater.create({
            data: { name: 'Main Theater', type: 'MAJOR', is_active: true },
        });

        const patient = await db.patient.create({
            data: {
                id: 'patient-workflow',
                file_number: 'PWF001',
                first_name: 'Workflow',
                last_name: 'Test',
                date_of_birth: new Date('1990-01-01'),
                gender: 'MALE',
                phone: '+1234567890',
                email: 'workflow@example.com',
                marital_status: 'SINGLE',
                address: '123 Test St',
                emergency_contact_name: 'Emergency Contact',
                emergency_contact_number: '+0987654321',
                relation: 'FRIEND',
            },
        });

        const surgeon = await db.doctor.create({
            data: {
                first_name: 'Dr',
                last_name: 'Workflow',
                name: 'Dr. Workflow',
                email: 'workflow-surgeon@example.com',
                specialization: 'Surgery',
                license_number: 'SURGWF001',
                phone: '+1555555555',
                address: 'Hospital',
                user: {
                    create: {
                        email: 'workflow-surgeon@example.com',
                        password_hash: 'hashed',
                        role: 'DOCTOR',
                    },
                },
            },
        });

        const nurse = await db.user.create({
            data: {
                email: 'nurse@example.com',
                password_hash: 'hashed',
                role: 'NURSE',
                first_name: 'Nurse',
                last_name: 'One',
            },
        });

        // Create case in IN_PREP status (pre-op checklist in progress)
        const surgicalCase = await db.surgicalCase.create({
            data: {
                id: 'case-workflow',
                patient_id: patient.id,
                primary_surgeon_id: surgeon.id,
                status: SurgicalCaseStatus.IN_PREP,
                urgency: 'ELECTIVE',
                procedure_name: 'Test Procedure',
            },
        });

        // Create or get template
        const template = await db.clinicalFormTemplate.upsert({
            where: { key_version: { key: 'nurse_preop_ward_checklist', version: 1 } },
            update: {},
            create: {
                key: 'nurse_preop_ward_checklist',
                version: 1,
                title: 'Pre-op Ward Checklist',
                role_owner: 'NURSE',
                schema_json: '{}',
                ui_json: '{}',
                is_active: true,
            },
        });

        // Create pre-op checklist in FINAL status
        await db.clinicalFormResponse.create({
            data: {
                template_id: template.id,
                template_key: 'nurse_preop_ward_checklist',
                template_version: 1,
                surgical_case_id: surgicalCase.id,
                patient_id: patient.id,
                status: ClinicalFormStatus.FINAL,
                data_json: JSON.stringify({}),
                signed_by_user_id: nurse.id,
                created_by_user_id: nurse.id,
            },
        });

        // 2. Pre-op finalized → Transition to READY_FOR_THEATER_BOOKING
        await statusTransitionService.transitionToReadyForTheater(surgicalCase.id, nurse.id);

        // Verify status
        const caseAfterTransition = await db.surgicalCase.findUnique({
            where: { id: surgicalCase.id },
        });
        expect(caseAfterTransition?.status).toBe(SurgicalCaseStatus.READY_FOR_THEATER_BOOKING);

        // 3. Frontdesk locks theater slot
        const startTime = new Date();
        startTime.setHours(10, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(12, 0, 0, 0);

        const frontdeskUserId = 'frontdesk-user-1';
        const lockedBooking = await theaterService.lockSlot(
            surgicalCase.id,
            theater.id,
            startTime,
            endTime,
            frontdeskUserId
        );

        expect(lockedBooking.status).toBe(TheaterBookingStatus.PROVISIONAL);
        expect(lockedBooking.locked_by).toBe(frontdeskUserId);

        // 4. Frontdesk confirms booking
        const confirmedBooking = await theaterService.confirmBooking(
            lockedBooking.id,
            frontdeskUserId
        );

        expect(confirmedBooking.status).toBe(TheaterBookingStatus.CONFIRMED);

        // 5. Verify case status updated to SCHEDULED
        const finalCase = await db.surgicalCase.findUnique({
            where: { id: surgicalCase.id },
        });
        expect(finalCase?.status).toBe(SurgicalCaseStatus.SCHEDULED);

        // 6. Verify booking is confirmed
        const finalBooking = await db.theaterBooking.findUnique({
            where: { id: lockedBooking.id },
        });
        expect(finalBooking?.status).toBe(TheaterBookingStatus.CONFIRMED);
        expect(finalBooking?.confirmed_by).toBe(frontdeskUserId);
        expect(finalBooking?.confirmed_at).toBeDefined();
    });

    it('should prevent booking if pre-op checklist is not finalized', async () => {
        // Setup
        const theater = await db.theater.create({
            data: { name: 'Test Theater', type: 'MAJOR', is_active: true },
        });

        const patient = await db.patient.create({
            data: {
                id: 'patient-no-finalize',
                file_number: 'PNF001',
                first_name: 'No',
                last_name: 'Finalize',
                date_of_birth: new Date('1990-01-01'),
                gender: 'MALE',
                phone: '+1234567891',
                email: 'nofinalize@example.com',
                marital_status: 'SINGLE',
                address: '123 Test St',
                emergency_contact_name: 'Emergency',
                emergency_contact_number: '+0987654322',
                relation: 'FRIEND',
            },
        });

        const surgeon = await db.doctor.create({
            data: {
                first_name: 'Dr',
                last_name: 'NoFinalize',
                name: 'Dr. NoFinalize',
                email: 'nofinalize-surgeon@example.com',
                specialization: 'Surgery',
                license_number: 'SURGNF001',
                phone: '+1555555556',
                address: 'Hospital',
                user: {
                    create: {
                        email: 'nofinalize-surgeon@example.com',
                        password_hash: 'hashed',
                        role: 'DOCTOR',
                    },
                },
            },
        });

        // Create case in IN_PREP but pre-op checklist is DRAFT (not finalized)
        const surgicalCase = await db.surgicalCase.create({
            data: {
                id: 'case-no-finalize',
                patient_id: patient.id,
                primary_surgeon_id: surgeon.id,
                status: SurgicalCaseStatus.IN_PREP,
                urgency: 'ELECTIVE',
                procedure_name: 'Test Procedure',
            },
        });

        const nurse2 = await db.user.create({
            data: {
                email: 'nurse2@example.com',
                password_hash: 'hashed',
                role: 'NURSE',
                first_name: 'Nurse',
                last_name: 'Two',
            },
        });

        // Create or get template
        const template = await db.clinicalFormTemplate.upsert({
            where: { key_version: { key: 'nurse_preop_ward_checklist', version: 1 } },
            update: {},
            create: {
                key: 'nurse_preop_ward_checklist',
                version: 1,
                title: 'Pre-op Ward Checklist',
                role_owner: 'NURSE',
                schema_json: '{}',
                ui_json: '{}',
                is_active: true,
            },
        });

        await db.clinicalFormResponse.create({
            data: {
                template_id: template.id,
                template_key: 'nurse_preop_ward_checklist',
                template_version: 1,
                surgical_case_id: surgicalCase.id,
                patient_id: patient.id,
                status: ClinicalFormStatus.DRAFT, // Not finalized
                data_json: JSON.stringify({}),
                created_by_user_id: nurse2.id,
            },
        });

        // Try to transition (should not work because checklist is DRAFT)
        await statusTransitionService.transitionToReadyForTheater(surgicalCase.id, 'nurse-1');

        // Case should still be IN_PREP
        const caseAfterTransition = await db.surgicalCase.findUnique({
            where: { id: surgicalCase.id },
        });
        expect(caseAfterTransition?.status).toBe(SurgicalCaseStatus.IN_PREP);

        // Try to book theater (should fail)
        const startTime = new Date();
        startTime.setHours(10, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(12, 0, 0, 0);

        await expect(
            theaterService.lockSlot(
                surgicalCase.id,
                theater.id,
                startTime,
                endTime,
                'frontdesk-1'
            )
        ).rejects.toThrow('READY_FOR_THEATER_BOOKING');
    });

    it('should handle concurrent booking attempts correctly', async () => {
        // Setup
        const theater = await db.theater.create({
            data: { name: 'Test Theater', type: 'MAJOR', is_active: true },
        });

        const patient = await db.patient.create({
            data: {
                id: 'patient-concurrent',
                file_number: 'PC001',
                first_name: 'Concurrent',
                last_name: 'Test',
                date_of_birth: new Date('1990-01-01'),
                gender: 'MALE',
                phone: '+1234567892',
                email: 'concurrent@example.com',
                marital_status: 'SINGLE',
                address: '123 Test St',
                emergency_contact_name: 'Emergency',
                emergency_contact_number: '+0987654323',
                relation: 'FRIEND',
            },
        });

        const surgeon = await db.doctor.create({
            data: {
                first_name: 'Dr',
                last_name: 'Concurrent',
                name: 'Dr. Concurrent',
                email: 'concurrent-surgeon@example.com',
                specialization: 'Surgery',
                license_number: 'SURGPC001',
                phone: '+1555555557',
                address: 'Hospital',
                user: {
                    create: {
                        email: 'concurrent-surgeon@example.com',
                        password_hash: 'hashed',
                        role: 'DOCTOR',
                    },
                },
            },
        });

        const case1 = await db.surgicalCase.create({
            data: {
                id: 'case-concurrent-1',
                patient_id: patient.id,
                primary_surgeon_id: surgeon.id,
                status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING,
                urgency: 'ELECTIVE',
                procedure_name: 'Procedure 1',
            },
        });

        const case2 = await db.surgicalCase.create({
            data: {
                id: 'case-concurrent-2',
                patient_id: patient.id,
                primary_surgeon_id: surgeon.id,
                status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING,
                urgency: 'ELECTIVE',
                procedure_name: 'Procedure 2',
            },
        });

        const startTime = new Date();
        startTime.setHours(10, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(12, 0, 0, 0);

        // Lock slot for case 1
        const booking1 = await theaterService.lockSlot(
            case1.id,
            theater.id,
            startTime,
            endTime,
            'frontdesk-1'
        );

        // Try to lock same slot for case 2 (should fail)
        await expect(
            theaterService.lockSlot(
                case2.id,
                theater.id,
                startTime,
                endTime,
                'frontdesk-2'
            )
        ).rejects.toThrow('already booked or locked');

        // Confirm booking 1
        await theaterService.confirmBooking(booking1.id, 'frontdesk-1');

        // Try again for case 2 (should still fail - slot is confirmed)
        await expect(
            theaterService.lockSlot(
                case2.id,
                theater.id,
                startTime,
                endTime,
                'frontdesk-2'
            )
        ).rejects.toThrow('already booked or locked');
    });
});
