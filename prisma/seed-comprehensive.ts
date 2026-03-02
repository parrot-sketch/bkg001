/**
 * Comprehensive Database Seed Script
 * 
 * This script seeds the database with a complete set of data for end-to-end testing,
 * with a focus on Consent Phase 2 features:
 * - Templates in various statuses (DRAFT, PUBLISHED, ARCHIVED)
 * - Template Releases
 * - Audit Logs
 * - Surgical Cases with linked Consent Forms (Signed & Draft)
 */

import {
    PrismaClient,
    Role,
    Status,
    Gender,
    ConsentType,
    ApprovalStatus,
    SurgicalUrgency,
    SurgicalCaseStatus,
    ConsentDocumentType,
    AuditAction,
    TemplateStatus,
    TemplateFormat,
    ConsentStatus,
    AppointmentStatus,
    CaseReadinessStatus
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper function to generate UUID
function uuid(): string {
    return crypto.randomUUID();
}

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

// Helper function to create or update user
async function createOrUpdateUser(data: {
    email: string;
    password_hash: string;
    role: Role;
    status?: Status;
    first_name?: string;
    last_name?: string;
    phone?: string;
}) {
    return prisma.user.upsert({
        where: { email: data.email },
        update: {
            password_hash: data.password_hash,
            role: data.role,
            status: data.status || Status.ACTIVE,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
        },
        create: {
            id: uuid(),
            email: data.email,
            password_hash: data.password_hash,
            role: data.role,
            status: data.status || Status.ACTIVE,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
        },
    });
}

async function main() {
    console.log('🌱 Starting Comprehensive Seeding...\n');

    // ============================================================================
    // 1. CLEAN SLATE
    // ============================================================================
    console.log('🧹 Clearing existing data...');

    try {
        await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
    } catch (e) { }

    const tableNames = [
        'Notification', 'AuditLog', 'Rating', 'PatientBill', 'Payment', 'Service',
        'LabTest', 'Diagnosis', 'VitalSign', 'MedicalRecord', 'CareNote', 'NurseAssignment',
        'ClinicalAuditEvent', 'SurgicalChecklist', 'SurgicalStaff', 'SurgicalProcedureRecord',
        'TheaterBooking', 'SurgicalCase', 'ConsentForm', 'PatientImage', 'CasePlan',
        'ConsultationMessage', 'ConsultationAttachment', 'DoctorConsultation',
        'Consultation', 'Appointment', 'AvailabilitySlot', 'AvailabilityTemplate', 'ScheduleBlock',
        'AvailabilityOverride', 'AvailabilityBreak', 'SlotConfiguration', 'RefreshToken',
        'ConsentSigningSession', 'InventoryUsage', 'InventoryBatch', 'PurchaseOrderItem', 'PurchaseOrder',
        'GoodsReceiptItem', 'GoodsReceipt', 'StockAdjustment', 'ConsentFormDocument',
        'ConsentTemplateRelease', 'ConsentTemplateAudit',
        'Patient', 'Doctor', 'User', 'Theater', 'Clinic', 'ConsentTemplate', 'IntakeSubmission', 'IntakeSession',
        'InventoryItem', 'Vendor', 'ClinicalFormResponse', 'ClinicalFormTemplate', 'ConsentTemplateVersion'
    ];

    for (const tableName of tableNames) {
        try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
        } catch (e) {
            try {
                await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}";`);
            } catch (deleteError) { }
        }
    }

    try {
        await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (e) { }

    console.log('✅ Cleared all data\n');

    // ============================================================================
    // 2. BASIC INFRASTRUCTURE
    // ============================================================================
    console.log('🏥 Configuring Clinic & Theaters...');

    const clinic = await prisma.clinic.create({
        data: {
            name: 'Nairobi Sculpt Aesthetic Centre',
            address: '4th Avenue Towers, 13th Floor, Fourth Ngong Ave, Nairobi',
            phone: '+254759067388',
            email: 'info@nairobisculpt.co.ke',
            primary_color: '#4F46E5',
        }
    });

    const theaterMajor = await prisma.theater.create({
        data: { name: 'Theater A (Major)', type: 'MAJOR', status: 'ACTIVE', color_code: '#EF4444' }
    });

    // ============================================================================
    // 3. STAFF & USERS
    // ============================================================================
    console.log('👥 Creating Staff...');

    const adminPassword = await hashPassword('admin123');
    const adminUser = await createOrUpdateUser({
        email: 'admin@nairobisculpt.com',
        password_hash: adminPassword,
        role: Role.ADMIN,
        first_name: 'System',
        last_name: 'Administrator',
    });

    const doctorPassword = await hashPassword('doctor123');
    const docAngela = await createOrUpdateUser({
        email: 'angela@nairobisculpt.com',
        password_hash: doctorPassword,
        role: Role.DOCTOR,
        first_name: 'Angela',
        last_name: 'Muoki',
    });

    const drAngelaProfile = await prisma.doctor.create({
        data: {
            user_id: docAngela.id,
            email: 'angela@nairobisculpt.com',
            name: 'Dr. Angela Muoki',
            first_name: 'Angela',
            last_name: 'Muoki',
            specialization: 'Plastic Surgery',
            license_number: 'KMPDB-5892',
            phone: '+254700000001',
            address: 'Nairobi',
            onboarding_status: 'ACTIVE',
        }
    });

    const nursePassword = await hashPassword('nurse123');
    const nurseJane = await createOrUpdateUser({
        email: 'jane@nairobisculpt.com',
        password_hash: nursePassword,
        role: Role.NURSE,
        first_name: 'Jane',
        last_name: 'Wambui',
    });

    console.log('✅ Basic infrastructure and staff created\n');

    // ============================================================================
    // 4. CONSENT PHASE 2 DATA
    // ============================================================================
    console.log('📜 Seeding Consent Phase 2 Data...');

    // A. PUBLISHED Template with History
    const generalConsent = await prisma.consentTemplate.create({
        data: {
            title: 'General Surgery Consent V2',
            type: ConsentType.GENERAL_PROCEDURE,
            content: '# Informed Consent for Surgery\n\nI hereby authorize...',
            version: 2,
            created_by: adminUser.id,
            status: TemplateStatus.ACTIVE,
            approval_status: ApprovalStatus.APPROVED,
            template_format: TemplateFormat.HTML,
        }
    });

    await prisma.consentTemplateAudit.createMany({
        data: [
            {
                template_id: generalConsent.id,
                action: AuditAction.SUBMITTED_FOR_APPROVAL,
                actor_user_id: docAngela.id,
                actor_role: Role.DOCTOR,
                changes_json: JSON.stringify({ note: 'Submitted for final review' }),
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
                template_id: generalConsent.id,
                action: AuditAction.APPROVED,
                actor_user_id: adminUser.id,
                actor_role: Role.ADMIN,
                changes_json: JSON.stringify({ note: 'Approved for clinical use' }),
                created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            }
        ]
    });

    await prisma.consentTemplateRelease.create({
        data: {
            template_id: generalConsent.id,
            version_number: 2,
            release_notes: 'Updated risk documentation and anesthesia section.',
            released_by_user_id: adminUser.id,
            released_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        }
    });

    // B. DRAFT Template (Pending Review)
    const draftTemplate = await prisma.consentTemplate.create({
        data: {
            title: 'New Photography Release (Draft)',
            type: ConsentType.PHOTOGRAPHY,
            content: '# Photography Release\n\nDraft content...',
            version: 1,
            created_by: docAngela.id,
            status: TemplateStatus.DRAFT,
            approval_status: ApprovalStatus.DRAFT,
            template_format: TemplateFormat.HTML,
        }
    });

    // C. Patient & Clinical Data
    console.log('🏥 Creating Clinical Data...');

    const patientAlice = await prisma.user.create({
        data: {
            id: uuid(),
            email: 'alice.comprehensive@example.com',
            password_hash: await hashPassword('password123'),
            role: Role.PATIENT,
            first_name: 'Alice',
            last_name: 'Test',
        }
    });

    const pAlice = await prisma.patient.create({
        data: {
            user_id: patientAlice.id,
            file_number: 'COMP-001',
            first_name: 'Alice',
            last_name: 'Test',
            gender: Gender.FEMALE,
            date_of_birth: new Date('1990-05-20'),
            phone: '+254700000002',
            email: 'alice.comprehensive@example.com',
            marital_status: 'Single',
            address: 'Nairobi',
            emergency_contact_name: 'Bob Test',
            emergency_contact_number: '+254700000003',
            relation: 'Brother',
        }
    });

    // Create Appointment first (required by CasePlan)
    const appointment = await prisma.appointment.create({
        data: {
            patient_id: pAlice.id,
            doctor_id: drAngelaProfile.id,
            appointment_date: new Date(),
            time: '10:00 AM',
            status: AppointmentStatus.CONFIRMED,
            type: 'CONSULTATION',
            slot_start_time: '10:00',
        }
    });

    const casePlan = await prisma.casePlan.create({
        data: {
            appointment_id: appointment.id,
            patient_id: pAlice.id,
            doctor_id: drAngelaProfile.id,
            procedure_plan: 'Rhinoplasty Plan',
            readiness_status: CaseReadinessStatus.NOT_STARTED,
        }
    });

    const surgicalCase = await prisma.surgicalCase.create({
        data: {
            patient_id: pAlice.id,
            primary_surgeon_id: drAngelaProfile.id,
            urgency: SurgicalUrgency.ELECTIVE,
            status: SurgicalCaseStatus.PLANNING,
            procedure_name: 'Rhinoplasty',
            diagnosis: 'Nasal Hump',
            created_by: adminUser.id,
        }
    });

    // Update CasePlan with SurgicalCase ID
    await prisma.casePlan.update({
        where: { id: casePlan.id },
        data: { surgical_case_id: surgicalCase.id }
    });

    const consentForm = await prisma.consentForm.create({
        data: {
            case_plan_id: casePlan.id,
            template_id: generalConsent.id,
            title: generalConsent.title,
            type: generalConsent.type,
            content_snapshot: generalConsent.content,
            status: ConsentStatus.PENDING_SIGNATURE,
        }
    });

    // D. Signed Document
    await prisma.consentFormDocument.create({
        data: {
            consent_form_id: consentForm.id,
            document_type: ConsentDocumentType.SIGNED_PDF,
            file_url: 'uploads/consents/mock-signed-alice.pdf',
            file_name: 'mock-signed-alice.pdf',
            checksum_sha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
            uploaded_by_user_id: nurseJane.id,
        }
    });

    console.log('✅ Consent Phase 2 data seeded successfully!\n');

    console.log('🎉 Comprehensive Seed Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
