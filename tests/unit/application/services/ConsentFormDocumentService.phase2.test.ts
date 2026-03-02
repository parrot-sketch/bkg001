import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestDatabase, resetTestDatabase } from '../../../setup/test-database';
import { ConsentFormDocumentService, ConsentDocumentType } from '@/application/services/ConsentFormDocumentService';
import { Role, ConsentType, ConsentStatus, Gender, AppointmentStatus } from '@prisma/client';
import { AuditContext } from '@/application/services/ConsentTemplateService';

describe('ConsentFormDocumentService - Phase 2', () => {
    const db = getTestDatabase();
    const service = new ConsentFormDocumentService(db);

    const doctorContext: AuditContext = {
        actorUserId: 'doctor-1',
        actorRole: Role.DOCTOR,
    };

    beforeEach(async () => {
        await resetTestDatabase();

        // Create required users
        await db.user.createMany({
            data: [
                { id: 'doctor-1', email: 'doctor1@example.com', password_hash: 'hash', role: Role.DOCTOR },
            ],
        });

        // Create Doctor record
        await db.doctor.create({
            data: {
                id: 'doctor-record-1',
                user_id: 'doctor-1',
                email: 'doctor1@example.com',
                first_name: 'John',
                last_name: 'Doe',
                name: 'Dr. John Doe',
                specialization: 'Surgery',
                license_number: 'LIC123',
                phone: '123456789',
                address: 'Clinic A',
            }
        });

        // Create Patient
        const patient = await db.patient.create({
            data: {
                id: 'patient-1',
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane@example.com',
                file_number: 'F123',
                date_of_birth: new Date('1990-01-01'),
                gender: Gender.FEMALE,
                phone: '987654321',
                marital_status: 'Single',
                address: 'Home A',
                emergency_contact_name: 'Contact A',
                emergency_contact_number: '111222333',
                relation: 'Friend',
            }
        });

        // Create Appointment with required fields
        const appointment = await db.appointment.create({
            data: {
                patient_id: patient.id,
                doctor_id: 'doctor-record-1',
                appointment_date: new Date(),
                time: '10:00 AM',
                type: 'Surgery',
                status: AppointmentStatus.SCHEDULED,
            }
        });

        // Create CasePlan
        const casePlan = await db.casePlan.create({
            data: {
                appointment_id: appointment.id,
                patient_id: patient.id,
                doctor_id: 'doctor-record-1',
            }
        });

        // Create ConsentForm
        await db.consentForm.create({
            data: {
                id: 'consent-1',
                case_plan_id: casePlan.id,
                title: 'Surgical Consent',
                type: ConsentType.GENERAL_PROCEDURE,
                content_snapshot: '<p>Snapshot</p>',
                status: ConsentStatus.DRAFT,
            }
        });
    });

    afterAll(async () => {
        await db.$disconnect();
    });

    describe('Signed Document Registration', () => {
        it('should allow uploading a signed document and verify its existence', async () => {
            const fakeFileInfo = {
                url: '/api/files/signed-1.pdf',
                filename: 'signed-1.pdf',
                size: 2048,
                buffer: Buffer.from('fake signed pdf content'),
            };

            const result = await service.uploadDocument({
                consentFormId: 'consent-1',
                fileUrl: fakeFileInfo.url,
                fileName: fakeFileInfo.filename,
                fileSize: fakeFileInfo.size,
                uploadedByUserId: doctorContext.actorUserId,
                documentType: ConsentDocumentType.SIGNED_PDF,
                checksum_sha256: service.computeChecksum(fakeFileInfo.buffer),
            });

            expect(result.file_url).toBe(fakeFileInfo.url);
            expect(result.version).toBe(1);
            expect(result.checksum_sha256).toBeDefined();

            const docs = await service.listDocuments('consent-1');
            expect(docs.length).toBe(1);
            expect(docs[0].id).toBe(result.id);
        });

        it('should handle versioning when re-uploading for the same consent', async () => {
            const file1 = {
                url: '/api/files/signed-1.pdf',
                filename: 'signed-1.pdf',
                size: 2048,
                buffer: Buffer.from('content 1'),
            };

            await service.uploadDocument({
                consentFormId: 'consent-1',
                fileUrl: file1.url,
                fileName: file1.filename,
                fileSize: file1.size,
                uploadedByUserId: doctorContext.actorUserId,
                documentType: ConsentDocumentType.SIGNED_PDF,
                checksum_sha256: service.computeChecksum(file1.buffer),
            });

            const file2 = {
                url: '/api/files/signed-2.pdf',
                filename: 'signed-2.pdf',
                size: 2048,
                buffer: Buffer.from('content 2'),
            };

            const result2 = await service.uploadDocument({
                consentFormId: 'consent-1',
                fileUrl: file2.url,
                fileName: file2.filename,
                fileSize: file2.size,
                uploadedByUserId: doctorContext.actorUserId,
                documentType: ConsentDocumentType.SIGNED_PDF,
                checksum_sha256: service.computeChecksum(file2.buffer),
            });
            expect(result2.version).toBe(2);

            const docs = await service.listDocuments('consent-1');
            expect(docs.length).toBe(2);
        });
    });

    describe('Integrity Verification', () => {
        it('should perform a global integrity check', async () => {
            const fileInfo = {
                url: '/api/files/signed-1.pdf',
                filename: 'signed-1.pdf',
                size: 2048,
                buffer: Buffer.from('integrity test'),
            };

            await service.uploadDocument({
                consentFormId: 'consent-1',
                fileUrl: fileInfo.url,
                fileName: fileInfo.filename,
                fileSize: fileInfo.size,
                uploadedByUserId: doctorContext.actorUserId,
                documentType: ConsentDocumentType.SIGNED_PDF,
                checksum_sha256: service.computeChecksum(fileInfo.buffer),
            });

            const report = await service.verifyAllDocuments();
            expect(report.length).toBe(1);
            expect(report[0].status).toBe('VALID');
        });
    });
});
