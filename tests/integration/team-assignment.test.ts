
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestDatabase, resetTestDatabase } from '../setup/test-database';
import { db } from '@/lib/db';
import { Role, SurgicalRole, Status, SurgicalCaseStatus } from '@prisma/client';
import { InviteStaffUseCase } from '@/application/use-cases/InviteStaffUseCase';
import { PrismaStaffInviteRepository } from '@/infrastructure/database/repositories/PrismaStaffInviteRepository';
import { PrismaSurgicalCaseRepository } from '@/infrastructure/database/repositories/PrismaSurgicalCaseRepository';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { PrismaOutboxRepository } from '@/infrastructure/database/repositories/PrismaOutboxRepository';
import { ALLOWED_ROLES_MAP } from '@/lib/domain/policies/team-eligibility';

describe('Integration: Team Assignment Workflow', () => {
    // const db = getTestDatabase(); // Using global db instance from import for simplicity with repos

    // Dependencies
    const inviteRepo = new PrismaStaffInviteRepository();
    const caseRepo = new PrismaSurgicalCaseRepository(db);
    const userRepo = new PrismaUserRepository(db);
    const outboxRepo = new PrismaOutboxRepository();
    const useCase = new InviteStaffUseCase(inviteRepo, caseRepo, userRepo, outboxRepo);

    beforeEach(async () => {
        await resetTestDatabase();
    });

    afterAll(async () => {
        await db.$disconnect();
    });

    it('should query eligible staff correctly based on domain policy', async () => {
        // 1. Setup: Create users with different roles
        const validHash = '$2b$10$abcdefghijklmnopqrstuv';
        const surgeon = await db.user.create({
            data: {
                email: 'surgeon@test.com',
                password_hash: validHash,
                role: Role.DOCTOR,
                first_name: 'Dr',
                last_name: 'Surgeon',
                status: Status.ACTIVE
            }
        });

        const nurse = await db.user.create({
            data: {
                email: 'nurse@test.com',
                password_hash: validHash,
                role: Role.NURSE,
                first_name: 'Nurse',
                last_name: 'Joy',
                status: Status.ACTIVE
            }
        });

        const inactiveDoctor = await db.user.create({
            data: {
                email: 'inactive@test.com',
                password_hash: validHash,
                role: Role.DOCTOR,
                first_name: 'Dr',
                last_name: 'Retired',
                status: Status.INACTIVE
            }
        });

        // 2. Test Policy: Get eligible users for SURGEON (Should be DOCTOR only)
        const surgeonRoles = ALLOWED_ROLES_MAP[SurgicalRole.SURGEON];
        const eligibleForSurgeon = await db.user.findMany({
            where: {
                role: { in: surgeonRoles },
                status: Status.ACTIVE
            }
        });

        expect(eligibleForSurgeon).toHaveLength(1);
        expect(eligibleForSurgeon[0].id).toBe(surgeon.id);

        // 3. Test Policy: Get eligible users for SCRUB_NURSE (Should be NURSE or THEATER_TECHNICIAN)
        const scrubRoles = ALLOWED_ROLES_MAP[SurgicalRole.SCRUB_NURSE];
        const eligibleForScrub = await db.user.findMany({
            where: {
                role: { in: scrubRoles },
                status: Status.ACTIVE
            }
        });

        expect(eligibleForScrub).toHaveLength(1);
        expect(eligibleForScrub[0].id).toBe(nurse.id);
    });

    it('should strictly enforce eligibility when inviting staff', async () => {
        // 1. Setup: Doctor, Nurse, and a Case
        const validHash = '$2b$10$abcdefghijklmnopqrstuv';
        const doctor = await db.user.create({
            data: { email: 'doc@test.com', password_hash: validHash, role: Role.DOCTOR, first_name: 'Doc', last_name: 'Strange' }
        });
        const doctorProfile = await db.doctor.create({
            data: {
                user_id: doctor.id,
                name: 'Dr Strange',
                specialization: 'Magic',
                license_number: '123',
                email: 'doc@test.com',
                first_name: 'Doc',
                last_name: 'Strange',
                phone: '123',
                address: 'Sanctum'
            }
        });

        const nurse = await db.user.create({
            data: { email: 'nurse@test.com', password_hash: validHash, role: Role.NURSE, first_name: 'Nurse', last_name: 'Joy' }
        });

        const surgicalCase = await db.surgicalCase.create({
            data: {
                // patient_id creates automatically via patient.create
                primary_surgeon: { connect: { id: doctorProfile.id } },
                status: SurgicalCaseStatus.PLANNING,
                procedure_name: 'Test Surgery',
                patient: {
                    create: {
                        id: 'p1', first_name: 'P', last_name: '1', date_of_birth: new Date(),
                        gender: 'MALE', file_number: 'F1', phone: '1', email: 'p@1.com',
                        marital_status: 'SINGLE',
                        address: 'Address 1',
                        emergency_contact_name: 'Contact 1',
                        emergency_contact_number: '0000000000',
                        relation: 'Parent'
                    }
                }
            }
        });

        // 2. Test Success: Invite Nurse as SCRUB_NURSE (Valid)
        await useCase.execute({
            surgicalCaseId: surgicalCase.id,
            invitedUserId: nurse.id,
            invitedRole: SurgicalRole.SCRUB_NURSE,
            invitedByUserId: doctor.id
        });

        const invite = await db.staffInvite.findFirst({
            where: { surgical_case_id: surgicalCase.id, invited_user_id: nurse.id }
        });
        expect(invite).toBeDefined();
        expect(invite?.status).toBe('PENDING');

        // 3. Test Failure: Invite Nurse as SURGEON (Invalid)
        await expect(useCase.execute({
            surgicalCaseId: surgicalCase.id,
            invitedUserId: nurse.id,
            invitedRole: SurgicalRole.SURGEON, // Only DOCTOR allowed
            invitedByUserId: doctor.id
        })).rejects.toThrow(/User with role 'NURSE' is not eligible for surgical role 'SURGEON'/);

    });

    it('should prevent duplicate invites', async () => {
        // Setup
        const validHash = '$2b$10$abcdefghijklmnopqrstuv'; // Dummy valid-looking hash
        const admin = await db.user.create({
            data: { email: 'admin@test.com', password_hash: validHash, role: Role.ADMIN }
        });
        const doctor = await db.user.create({
            data: { email: 'doc@test.com', password_hash: validHash, role: Role.DOCTOR, first_name: 'Doc', last_name: 'Who' }
        });
        const doctorProfile = await db.doctor.create({
            data: {
                user_id: doctor.id,
                name: 'Dr Who',
                specialization: 'Time',
                license_number: '000',
                email: 'doc@test.com',
                first_name: 'Doc',
                last_name: 'Who',
                phone: '123',
                address: 'TARDIS'
            }
        });
        const surgicalCase = await db.surgicalCase.create({
            data: {
                primary_surgeon: { connect: { id: doctorProfile.id } },
                status: SurgicalCaseStatus.PLANNING,
                procedure_name: 'T',
                patient: {
                    create: {
                        id: 'p2', first_name: 'P', last_name: '2', date_of_birth: new Date(), gender: 'FEMALE', file_number: 'F2', phone: '2', email: 'p@2.com',
                        marital_status: 'SINGLE',
                        address: 'Address 2',
                        emergency_contact_name: 'Contact 2',
                        emergency_contact_number: '0000000000',
                        relation: 'Sibling'
                    }
                }
            }
        });

        // 1. Invite Doctor as SURGEON
        await useCase.execute({
            surgicalCaseId: surgicalCase.id,
            invitedUserId: doctor.id,
            invitedRole: SurgicalRole.SURGEON,
            invitedByUserId: admin.id
        });

        // 2. Try to Invite AGAIN (Should fail domain check for existing invite)
        await expect(useCase.execute({
            surgicalCaseId: surgicalCase.id,
            invitedUserId: doctor.id,
            invitedRole: SurgicalRole.SURGEON,
            invitedByUserId: admin.id
        })).rejects.toThrow(/User already has an active invite/);
    });
});
