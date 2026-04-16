/**
 * Production Database Seed Script - Nairobi Sculpt Aesthetic Centre
 * 
 * Seeds the production database with:
 * - Clinic Configuration & Theaters
 * - Real Doctor Profiles (from nairobisculpt.com)
 * - Staff Users (Admin, Frontdesk, Nurses)
 * - Consent Templates
 * - Test Patients (no appointments - doctors set availability first)
 * - Service Price List
 * 
 * Run with: npx tsx prisma/seed.ts
 */

import { PrismaClient, Role, Status, Gender, ConsentType, NotificationType, NotificationStatus, SurgicalCaseStatus } from '@prisma/client';
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

// Helper function to get random item from array
function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Helper function to create or update user (handles existing users)
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
  console.log('🌱 Starting Operational Validation Seed...\n');

  // ============================================================================
  // 1. CLEAN SLATE
  // ============================================================================
  console.log('🧹 Clearing existing data...');

  // Disable foreign key checks temporarily for clean truncate
  try {
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
  } catch (e) {
    // Ignore if not supported
  }

  // Order matters: delete child tables first, then parent tables
  const tableNames = [
    // Child tables first (depend on other tables)
    'Notification', 'AuditLog', 'Rating', 'PatientBill', 'Payment', 'Service',
    'LabTest', 'Diagnosis', 'VitalSign', 'MedicalRecord', 'CareNote', 'NurseAssignment',
    'ClinicalAuditEvent', 'SurgicalChecklist', 'SurgicalStaff', 'SurgicalProcedureRecord',
    'TheaterBooking', 'SurgicalCase', 'ConsentForm', 'PatientImage', 'CasePlan',
    'ConsultationMessage', 'ConsultationAttachment', 'DoctorConsultation',
    'Consultation', 'Appointment', 'AvailabilitySlot', 'AvailabilityTemplate', 'ScheduleBlock',
    'AvailabilityOverride', 'SlotConfiguration', 'RefreshToken',
    'ConsentSigningSession',
    'InventoryUsage', 'InventoryBatch', 'PurchaseOrderItem', 'PurchaseOrder',
    'GoodsReceiptItem', 'GoodsReceipt', 'StockAdjustment', 'ConsentFormDocument',
    'ConsentTemplateRelease',
    // Parent tables (referenced by others)
    'Patient', 'Doctor', 'User', 'Theater', 'Clinic', 'ConsentTemplate', 'IntakeSubmission', 'IntakeSession',
    'InventoryItem', 'Vendor'
  ];

  for (const tableName of tableNames) {
    try {
      // Use TRUNCATE with RESTART IDENTITY CASCADE to handle foreign keys
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
    } catch (e: any) {
      // If TRUNCATE fails, try DELETE
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}";`);
      } catch (deleteError) {
        // Ignore table not found if schema changed significantly
        console.log(`   ⚠️  Could not clear ${tableName}: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
      }
    }
  }

  // Re-enable foreign key checks
  try {
    await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
  } catch (e) {
    // Ignore if not supported
  }

  console.log('✅ Cleared all data\n');


  // ============================================================================
  // 2. CLINIC & THEATER SETUP (Admin Scope)
  // ============================================================================
  console.log('🏥 Configuring Clinic & Theaters...');

  const clinic = await prisma.clinic.create({
    data: {
      name: 'Nairobi Sculpt Aesthetic Centre',
      address: '4th Avenue Towers, 13th Floor, Fourth Ngong Ave, Nairobi',
      phone: '+254759067388',
      email: 'info@nairobisculpt.co.ke',
      website: 'https://nairobisculpt.com',
      primary_color: '#4F46E5', // Indigo
    }
  });

  const theaterMajor = await prisma.theater.create({
    data: {
      name: 'Main Theater',
      type: 'MAJOR',
      status: 'ACTIVE',
      color_code: '#EF4444', // Red
      notes: 'Equipped for general anesthesia and complex reconstructive surgeries.',
      // Pricing in this system is stored as KES/hour, but operationally we set it using KES/min.
      // Main Theater: 100 KES/min -> 6,000 KES/hour
      hourly_rate: 100 * 60,
    }
  });

  const theaterMinor = await prisma.theater.create({
    data: {
      name: 'Minor Theater',
      type: 'MINOR',
      status: 'ACTIVE',
      color_code: '#3B82F6', // Blue
      notes: 'Local anesthesia and sedation procedures only.',
      // Minor Theater: 50 KES/min -> 3,000 KES/hour
      hourly_rate: 50 * 60,
    }
  });

  const procedureRoom = await prisma.theater.create({
    data: {
      name: 'Procedure Room 1',
      type: 'PROCEDURE_ROOM',
      status: 'ACTIVE',
      color_code: '#10B981', // Green
      notes: 'Injectables and non-invasive treatments.',
      hourly_rate: 20000, // KES per hour
    }
  });

  console.log('✅ Clinic and Theaters configured\n');


  // ============================================================================
  // 3. STAFF & USERS
  // ============================================================================
  console.log('👥 Creating Staff...');

  // --- Admin ---
  const adminPassword = await hashPassword('admin123');
  const adminUser = await createOrUpdateUser({
    email: 'admin@nairobisculpt.com',
    password_hash: adminPassword,
    role: Role.ADMIN,
    status: Status.ACTIVE,
    first_name: 'System',
    last_name: 'Administrator',
  });

  // --- Doctors (Real Nairobi Sculpt Surgeons) ---
  // Source: https://nairobisculpt.com/
  const doctorData = [
    {
      // https://nairobisculpt.com/dr-angela-muoki.html
      title: 'Dr.',
      firstName: 'Angela',
      lastName: 'Muoki',
      name: 'Dr. Angela Muoki',
      email: 'angela@nairobisculpt.com',
      phone: '+254759067388',
      spec: 'Plastic, Reconstructive & Aesthetic Surgery',
      color: '#4F46E5', // Indigo - Head of Dept prominence
      slug: 'dr-angela-muoki',
      yearsOfExperience: 12,
      bio: 'Dr. Angela Muoki is a Board Certified Specialist Plastic, Reconstructive and Aesthetic Surgeon with over 12 years of extensive knowledge and experience. She was the third graduate of the Master of Medicine program in Plastic Reconstructive and Aesthetic Surgery at the University of Nairobi/Kenyatta National Hospital.',
      education: 'MMed Plastic Reconstructive and Aesthetic Surgery (UoN/KNH), Fellow COSECSA, BFIRST/BAPRAS Fellowship (Liverpool & Manchester, UK), ASPS SHARE Programme Graduate 2023-2024',
      focusAreas: 'Cosmetic Surgery, Reconstructive Surgery, Orthoplastic Surgery, Breast Reconstruction',
      affiliations: 'Head of Department - Defence Forces Memorial Hospital, Senior Lecturer - UoN, Vice Chairperson - Wound Care Society of Kenya, Kenya Association of Plastic Surgeons, BAPRAS, ASPS',
      licenseNumber: 'KMPDB-5892',
      address: '4th Avenue Towers, 13th Floor, Fourth Ngong Ave, Nairobi',
      clinicLocation: '4th Avenue Towers, 13th Floor',
    },
    {
      // https://nairobisculpt.com/mukami.html
      title: 'Dr.',
      firstName: 'Mukami',
      lastName: 'Gathariki',
      name: 'Dr. Mukami Gathariki',
      email: 'mukami@nairobisculpt.com',
      phone: '+254759067388',
      spec: 'Plastic, Reconstructive & Aesthetic Surgery',
      color: '#EC4899', // Pink - distinctive
      slug: 'dr-mukami-gathariki',
      yearsOfExperience: 8,
      bio: 'Dr. Mukami Gathariki is a highly focused and accomplished Board Certified Plastic, Reconstructive and Aesthetic Surgeon with over eight years of progressive experience. She ensures optimal attainment of the best quality of life for her patients through dedicated patient-centered care.',
      education: 'Masters of Medicine in Plastic Reconstructive and Aesthetic Surgery, Fellow COSECSA, ASPS SHARE Programme Fellow',
      focusAreas: 'Cosmetic Surgery, Reconstructive Surgery, Patient Communication Excellence',
      affiliations: 'Executive Member - Kenya Society of Plastic Reconstructive and Aesthetic Surgeons (KSPRAS), Kenya Association of Women Surgeons',
      licenseNumber: 'KMPDB-6734',
      address: '4th Avenue Towers, 13th Floor, Fourth Ngong Ave, Nairobi',
      clinicLocation: '4th Avenue Towers, 13th Floor',
    },
    {
      // https://nairobisculpt.com/dr-dorsi.html
      title: 'Dr.',
      firstName: 'Dorsi',
      lastName: 'Jowi',
      name: 'Dr. Dorsi Jowi',
      email: 'dorsi@nairobisculpt.com',
      phone: '+254759067388',
      spec: 'Plastic Surgery & Hand Surgery',
      color: '#06B6D4', // Cyan - Hand surgery precision
      slug: 'dr-dorsi-jowi',
      yearsOfExperience: 6,
      bio: 'Dr. Dorsi Jowi is a Consultant Plastic Surgeon in private practice since October 2019, with a sub-specialization in hand surgery. She was selected as one of 24 worldwide hand surgeons for the 2025 IFSSH International Travelling Fellowship.',
      education: 'MMed Plastic, Reconstructive, and Aesthetic Surgery (UoN 2014-2019), MBChB (UoN 2006-2011), Fellowship in Hand Surgery, Microsurgery & Trauma Reconstructive Surgery (Ganga Hospital, India)',
      focusAreas: 'Hand Surgery, Microsurgery, Brachial Plexus Surgery, Peripheral Nerve Surgery, Wrist Surgery, Congenital Hand Differences',
      affiliations: 'Former Treasurer KSPRAS (2018-2023), Kenya Association of Women Surgeons, International Member - American Association of Hand Surgeons, 2025 IFSSH International Travelling Fellow',
      licenseNumber: 'KMPDB-7128',
      address: 'Nairobi, Kenya',
      clinicLocation: 'Nairobi Private Practice',
    },
    {
      // https://nairobisculpt.com/dr-ken.html
      title: 'Dr.',
      firstName: 'Ken',
      lastName: 'Aluora',
      name: 'Dr. Ken Aluora',
      email: 'ken@nairobisculpt.com',
      phone: '+254701254254',
      spec: 'Plastic Surgery & Wound Care',
      color: '#10B981', // Emerald - Healing/wound care
      slug: 'dr-ken-aluora',
      yearsOfExperience: 10,
      bio: 'Dr. Ken Aluora is a Consultant Plastic Surgeon based in Nairobi and Kapsabet, Kenya. Renowned for his expertise in non-surgical treatments, aesthetic surgery, reconstructive surgery, and wound care, he combines advanced techniques with a compassionate approach to deliver outstanding results.',
      education: 'Master of Medicine and Surgery in Plastic, Reconstructive, and Aesthetic Surgery (University of Nairobi)',
      focusAreas: 'Non-Surgical Treatments (Botox, Fillers, Weight Management), Aesthetic Surgery (BBL, Tummy Tuck, Breast Surgery), Reconstructive Surgery (Trauma, Cleft Lip/Palate, Skin Cancers), Wound Care',
      affiliations: 'Secretary General - Kenya Society of Plastic, Reconstructive and Aesthetic Surgeons (KSPRAS), Member - American Society of Plastic Surgeons (ASPS), KMPDC Licensed',
      licenseNumber: 'KMPDB-6891',
      address: 'Nairobi & Kapsabet, Kenya',
      clinicLocation: 'Nairobi & Kapsabet',
    },
    {
      // https://nairobisculpt.com/dr-john-paul-ogalo.html
      title: 'Dr.',
      firstName: 'John Paul',
      lastName: 'Ogalo',
      name: 'Dr. John Paul Ogalo',
      email: 'ogalo@nairobisculpt.com',
      phone: '+254759067388',
      spec: 'Plastic, Reconstructive & Aesthetic Surgery',
      color: '#F59E0B', // Amber - Senior surgeon distinction
      slug: 'dr-john-paul-ogalo',
      yearsOfExperience: 15,
      bio: 'Dr. John Paul Ogalo is a distinguished plastic, reconstructive, and aesthetic surgeon with over a decade of expertise. As Consultant Plastic Surgeon at Nairobi Hospital and Head of Plastic Surgery since July 2021, he excels in body contouring, facial aesthetics, and reconstructive procedures. Renowned for pioneering Kenya\'s first Pygopagus separation surgery, he has enhanced over 1,000 lives with his gentle techniques and innovative technologies.',
      education: 'Specialist in Plastic, Reconstructive and Aesthetic Surgery, Senior Fellow (since July 2020)',
      focusAreas: 'Body Contouring (Liposuction, Abdominoplasty, BBL), Facial Aesthetics (Rhinoplasty, Facelifts, Blepharoplasty), Reconstructive Surgery (Post-Traumatic, Oncology, Breast Reconstruction), Cosmetic Injectables (Botox, Dermal Fillers)',
      affiliations: 'Head of Plastic Surgery - Nairobi Hospital, Consultant Plastic Surgeon - Nairobi Hospital, Senior Fellow, Published in Science Publishing Group, Journal of Foot and Ankle Surgery, Journal of Plastic Reconstructive & Aesthetic Surgery, Trauma Case Reports',
      licenseNumber: 'KMPDB-5201',
      address: '4th Avenue Towers, 13th Floor, Fourth Ngong Ave, Nairobi',
      clinicLocation: '4th Avenue Towers, 13th Floor',
    },
  ];

  const doctors = [];

  for (const doc of doctorData) {
    const password = await hashPassword('doctor123');
    const user = await createOrUpdateUser({
      email: doc.email,
      password_hash: password,
      role: Role.DOCTOR,
      first_name: doc.firstName,
      last_name: doc.lastName,
    });

    const doctorProfile = await prisma.doctor.create({
      data: {
        user_id: user.id,
        email: doc.email,
        title: doc.title,
        name: doc.name,
        first_name: doc.firstName,
        last_name: doc.lastName,
        specialization: doc.spec,
        slug: doc.slug,
        license_number: doc.licenseNumber,
        phone: doc.phone,
        address: doc.address,
        clinic_location: doc.clinicLocation,
        colorCode: doc.color,
        bio: doc.bio,
        education: doc.education,
        focus_areas: doc.focusAreas,
        professional_affiliations: doc.affiliations,
        years_of_experience: doc.yearsOfExperience,
        availability_status: 'AVAILABLE',
        onboarding_status: 'ACTIVE',
      }
    });
    doctors.push(doctorProfile);
    // Note: Doctors will configure their own schedules/availability through the system
  }

  // --- Nurses ---
  const nurseData = [
    { name: 'Jane Wambui', email: 'jane@nairobisculpt.com' },
    { name: 'Lucy Akinyi', email: 'lucy@nairobisculpt.com' },
  ];
  const nurses = [];
  for (const nurse of nurseData) {
    const password = await hashPassword('nurse123');
    const user = await createOrUpdateUser({
      email: nurse.email,
      password_hash: password,
      role: Role.NURSE,
      first_name: nurse.name.split(' ')[0],
      last_name: nurse.name.split(' ')[1],
    });
    nurses.push(user);
  }

  // --- Frontdesk ---
  const frontdeskPassword = await hashPassword('frontdesk123');
  const frontdeskUser = await createOrUpdateUser({
    email: 'reception@nairobisculpt.com',
    password_hash: frontdeskPassword,
    role: Role.FRONTDESK,
    first_name: 'David',
    last_name: 'Omondi',
  });

  // --- Theater Technician ---
  const theaterTechPassword = await hashPassword('theatertech123');
  const theaterTechUser = await createOrUpdateUser({
    email: 'theater@nairobisculpt.com',
    password_hash: theaterTechPassword,
    role: Role.THEATER_TECHNICIAN,
    first_name: 'Samuel',
    last_name: 'Kiprop',
  });

  console.log('✅ Staff accounts created\n');


  // ============================================================================
  // 4. ADMIN CONFIGURATION (Consent Templates)
  // ============================================================================
  console.log('📜 Creating Consent Templates...');

  // Check if template_format column exists (for backward compatibility)
  let hasTemplateFormat = false;
  try {
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'ConsentTemplate' 
        AND column_name = 'template_format'
    `;
    hasTemplateFormat = Array.isArray(result) && result.length > 0;
    if (!hasTemplateFormat) {
      console.log('   ⚠️  template_format column not found, creating templates without it');
    }
  } catch (e: any) {
    // Column doesn't exist, will create without it
    console.log(`   ⚠️  template_format column not found (${e.message}), creating templates without it`);
    hasTemplateFormat = false;
  }

  const baseTemplateData = [
    {
      title: 'General Surgery Consent',
      type: ConsentType.GENERAL_PROCEDURE,
      content: '# Informed Consent for Surgery\n\nI hereby authorize Dr. [Doctor Name] to perform...',
      version: 1,
      created_by: adminUser.id,
    },
    {
      title: 'Anesthesia Consent',
      type: ConsentType.ANESTHESIA,
      content: '# Informed Consent for Anesthesia\n\nI understand the risks associated with anesthesia...',
      version: 1,
      created_by: adminUser.id,
    },
    {
      title: 'Photography Release',
      type: ConsentType.PHOTOGRAPHY,
      content: '# Medical Photography Release\n\nI consent to photographs being taken for medical records...',
      version: 1,
      created_by: adminUser.id,
    }
  ];

  // Only add template_format if column actually exists
  const templateData = hasTemplateFormat
    ? baseTemplateData.map(t => ({ ...t, template_format: 'HTML' as const }))
    : baseTemplateData;

  // Use individual creates to avoid type issues
  for (const template of templateData) {
    try {
      await prisma.consentTemplate.create({
        data: template as any
      });
    } catch (error: any) {
      // If it fails due to template_format, try without it
      if (error.message?.includes('template_format')) {
        const { template_format, ...templateWithoutFormat } = template as any;
        await prisma.consentTemplate.create({
          data: templateWithoutFormat
        });
      } else {
        throw error;
      }
    }
  }
  console.log('✅ Consent Templates created\n');


  // ============================================================================
  // 4b. CLINICAL FORM TEMPLATES (Nurse/Doctor Forms)
  // ============================================================================
  console.log('📋 Creating Clinical Form Templates...');

  await prisma.clinicalFormTemplate.upsert({
    where: { key_version: { key: 'NURSE_PREOP_WARD_CHECKLIST', version: 1 } },
    update: {},
    create: {
      key: 'NURSE_PREOP_WARD_CHECKLIST',
      version: 1,
      title: 'Pre-Operative Ward Checklist',
      role_owner: Role.NURSE,
      schema_json: '{}', // Schema defined in code (Zod)
      ui_json: '{}',     // UI defined in React components
      is_active: true,
    }
  });

  await prisma.clinicalFormTemplate.upsert({
    where: { key_version: { key: 'NURSE_INTRAOP_RECORD', version: 1 } },
    update: {},
    create: {
      key: 'NURSE_INTRAOP_RECORD',
      version: 1,
      title: 'Intra-Operative Nurse Record',
      role_owner: Role.NURSE,
      schema_json: '{}',
      ui_json: '{}',
      is_active: false, // Retired version 1
    }
  });

  await prisma.clinicalFormTemplate.upsert({
    where: { key_version: { key: 'NURSE_INTRAOP_RECORD', version: 2 } },
    update: {},
    create: {
      key: 'NURSE_INTRAOP_RECORD',
      version: 2,
      title: 'Intra-Operative Nurse Record (V2 Redesign)',
      role_owner: Role.NURSE,
      schema_json: '{}',
      ui_json: '{}',
      is_active: true,
    }
  });

  await prisma.clinicalFormTemplate.upsert({
    where: { key_version: { key: 'NURSE_RECOVERY_RECORD', version: 1 } },
    update: {},
    create: {
      key: 'NURSE_RECOVERY_RECORD',
      version: 1,
      title: 'Immediate Recovery Care Record (PACU)',
      role_owner: Role.NURSE,
      schema_json: '{}',
      ui_json: '{}',
      is_active: true,
    }
  });

  await prisma.clinicalFormTemplate.upsert({
    where: { key_version: { key: 'SURGEON_OPERATIVE_NOTE', version: 1 } },
    update: {},
    create: {
      key: 'SURGEON_OPERATIVE_NOTE',
      version: 1,
      title: 'Surgeon Operative Note',
      role_owner: Role.DOCTOR,
      schema_json: '{}',
      ui_json: '{}',
      is_active: true,
    }
  });

  console.log('✅ Clinical Form Templates created\n');


  // ============================================================================
  // 5. PATIENTS & CLINICAL DATA
  // ============================================================================
  console.log('🏥 Creating Patients & Clinical Data...');

  // Patient 1: Millicent (Post-op)
  const p1Password = await hashPassword('patient123');
  const p1User = await createOrUpdateUser({
    email: 'millicent@example.com',
    password_hash: p1Password,
    role: Role.PATIENT,
    first_name: 'Millicent',
    last_name: 'Wanjiku'
  });

  const p1 = await prisma.patient.create({
    data: {
      user_id: p1User.id,
      file_number: 'NS001',
      first_name: 'Millicent',
      last_name: 'Wanjiku',
      email: 'millicent@example.com',
      phone: '+254700000001',
      date_of_birth: new Date('1990-01-01'),
      gender: Gender.FEMALE,
      address: 'Nairobi',
      marital_status: 'Single',
      emergency_contact_name: 'Sister',
      emergency_contact_number: '+254...',
      relation: 'Sister',
      assigned_to_user_id: doctors[0].user_id, // Dr. Mukami
    }
  });

  // Patient 2: Rhoda
  const p2Password = await hashPassword('patient123');
  const p2User = await createOrUpdateUser({
    email: 'rhoda@example.com',
    password_hash: p2Password,
    role: Role.PATIENT,
    first_name: 'Rhoda',
    last_name: 'Atieno'
  });

  const p2 = await prisma.patient.create({
    data: {
      user_id: p2User.id,
      file_number: 'NS002',
      first_name: 'Rhoda',
      last_name: 'Atieno',
      email: 'rhoda@example.com',
      phone: '+254700000002',
      date_of_birth: new Date('1985-05-15'),
      gender: Gender.FEMALE,
      address: 'South B',
      marital_status: 'Married',
      emergency_contact_name: 'Husband',
      emergency_contact_number: '+254...',
      relation: 'Spouse',
      assigned_to_user_id: doctors[1].user_id, // Dr. Ken
    }
  });

  // Create Service List for Billing
  await prisma.service.createMany({
    data: [
      { service_name: 'Consultation - Initial', price: 5000, category: 'Consultation' },
      { service_name: 'Consultation - Follow up', price: 3000, category: 'Consultation' },
      { service_name: 'Breast Augmentation', price: 450000, category: 'Procedure' },
      { service_name: 'Liposuction 360', price: 350000, category: 'Procedure' },
      { service_name: 'Botox (Per Unit)', price: 1000, category: 'Injectable' },
    ]
  });

  // ============================================================================
  // 6. TEST PATIENTS (No appointments - doctors will set availability first)
  // ============================================================================
  console.log('👥 Seeding Test Patients...');

  // --- Test Patient: "Rita CheckIn" ---
  const userRita = await createOrUpdateUser({
    email: 'rita.checkin@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Rita',
    last_name: 'CheckIn'
  });
  await prisma.patient.create({
    data: {
      user_id: userRita.id,
      file_number: 'TEST001',
      first_name: 'Rita',
      last_name: 'CheckIn',
      email: 'rita.checkin@example.com',
      phone: '+254722000001',
      date_of_birth: new Date('1992-03-15'),
      gender: Gender.FEMALE,
      address: 'Westlands, Nairobi',
      emergency_contact_name: 'John CheckIn',
      emergency_contact_number: '0700111222',
      relation: 'Brother',
      marital_status: 'Single',
    }
  });

  // --- Test Patient: "Carl Consult" ---
  const userCarl = await createOrUpdateUser({
    email: 'carl.consult@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Carl',
    last_name: 'Consult'
  });
  await prisma.patient.create({
    data: {
      user_id: userCarl.id,
      file_number: 'TEST002',
      first_name: 'Carl',
      last_name: 'Consult',
      email: 'carl.consult@example.com',
      phone: '+254722000002',
      date_of_birth: new Date('1988-07-20'),
      gender: Gender.MALE,
      address: 'Kilimani, Nairobi',
      emergency_contact_name: 'Mary Consult',
      emergency_contact_number: '0700333444',
      relation: 'Wife',
      marital_status: 'Married',
    }
  });

  // --- Test Patient: "Fiona Fresh" ---
  const userFiona = await createOrUpdateUser({
    email: 'fiona.fresh@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Fiona',
    last_name: 'Fresh'
  });
  await prisma.patient.create({
    data: {
      user_id: userFiona.id,
      file_number: 'TEST003',
      first_name: 'Fiona',
      last_name: 'Fresh',
      email: 'fiona.fresh@example.com',
      phone: '+254722000003',
      date_of_birth: new Date('1995-11-10'),
      gender: Gender.FEMALE,
      address: 'Karen, Nairobi',
      emergency_contact_name: 'Tom Fresh',
      emergency_contact_number: '0700555666',
      relation: 'Father',
      marital_status: 'Single',
    }
  });

  // --- Test Patient: "Uma Upcoming" ---
  const userUma = await createOrUpdateUser({
    email: 'uma.upcoming@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Uma',
    last_name: 'Upcoming'
  });
  await prisma.patient.create({
    data: {
      user_id: userUma.id,
      file_number: 'TEST004',
      first_name: 'Uma',
      last_name: 'Upcoming',
      email: 'uma.upcoming@example.com',
      phone: '+254722000004',
      date_of_birth: new Date('1990-01-25'),
      gender: Gender.FEMALE,
      address: 'Lavington, Nairobi',
      emergency_contact_name: 'Dan Upcoming',
      emergency_contact_number: '0700777888',
      relation: 'Husband',
      marital_status: 'Married',
    }
  });

  console.log('✅ Test Patients Created (Rita, Carl, Fiona, Uma)');


  // ============================================================================
  // 7. ADDITIONAL TEST PATIENTS
  // ============================================================================
  console.log('👥 Seeding Additional Test Patients...');

  // --- Test Patient: Alice ---
  const userA = await createOrUpdateUser({
    email: 'alice.test@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Alice',
    last_name: 'Wanjiru'
  });
  await prisma.patient.create({
    data: {
      user_id: userA.id, file_number: 'TEST005', first_name: 'Alice', last_name: 'Wanjiru', email: 'alice.test@example.com', phone: '+254711000001',
      date_of_birth: new Date('1995-01-01'), gender: Gender.FEMALE, address: 'Nairobi', emergency_contact_name: 'Mom', emergency_contact_number: '0700000000', relation: 'Mother',
      marital_status: 'Single',
    }
  });

  // --- Test Patient: Bob ---
  const userB = await createOrUpdateUser({
    email: 'bob.test@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Bob',
    last_name: 'Ochieng'
  });
  await prisma.patient.create({
    data: {
      user_id: userB.id, file_number: 'TEST006', first_name: 'Bob', last_name: 'Ochieng', email: 'bob.test@example.com', phone: '+254711000002',
      date_of_birth: new Date('1980-06-15'), gender: Gender.MALE, address: 'Nairobi', emergency_contact_name: 'Wife', emergency_contact_number: '0700000000', relation: 'Spouse',
      marital_status: 'Married',
    }
  });

  // --- Test Patient: Charlie ---
  const userC = await createOrUpdateUser({
    email: 'charlie.test@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Charlie',
    last_name: 'Kamau'
  });
  await prisma.patient.create({
    data: {
      user_id: userC.id, file_number: 'TEST007', first_name: 'Charlie', last_name: 'Kamau', email: 'charlie.test@example.com', phone: '+254711000003',
      date_of_birth: new Date('1992-03-10'), gender: Gender.MALE, address: 'Nairobi', emergency_contact_name: 'Dad', emergency_contact_number: '0700000000', relation: 'Father',
      marital_status: 'Single',
    }
  });

  // --- Test Patient: Diana ---
  const userD = await createOrUpdateUser({
    email: 'diana.test@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Diana',
    last_name: 'Nyambura'
  });
  await prisma.patient.create({
    data: {
      user_id: userD.id, file_number: 'TEST008', first_name: 'Diana', last_name: 'Nyambura', email: 'diana.test@example.com', phone: '+254711000004',
      date_of_birth: new Date('1988-11-22'), gender: Gender.FEMALE, address: 'Nairobi', emergency_contact_name: 'Brother', emergency_contact_number: '0700000000', relation: 'Brother',
      marital_status: 'Single',
    }
  });

  // --- Test Patient: Eve (with medical history) ---
  const userE = await createOrUpdateUser({
    email: 'eve.test@example.com',
    password_hash: await hashPassword('password123'),
    role: Role.PATIENT,
    first_name: 'Eve',
    last_name: 'Akinyi'
  });
  await prisma.patient.create({
    data: {
      user_id: userE.id, file_number: 'TEST009', first_name: 'Eve', last_name: 'Akinyi', email: 'eve.test@example.com', phone: '+254711000005',
      date_of_birth: new Date('1975-08-30'), gender: Gender.FEMALE, address: 'Nairobi', emergency_contact_name: 'Son', emergency_contact_number: '0700000000', relation: 'Son',
      allergies: 'Penicillin', medical_conditions: 'Hypertension', medical_history: 'C-Section (2005)',
      marital_status: 'Widowed',
    }
  });

  console.log('✅ Additional Test Patients Created (Alice, Bob, Charlie, Diana, Eve)');


  // ============================================================================
  // 8. APPOINTMENTS & CONSULTATIONS (Complete Workflow)
  // ============================================================================
  console.log('📅 Creating Appointments & Consultations...');

  // Appointment 1: Millicent → Dr. Mukami (Completed consultation → Surgical case)
  const appointment1 = await prisma.appointment.create({
    data: {
      patient_id: p1.id,
      doctor_id: doctors[1].id, // Dr. Mukami
      appointment_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      time: '10:00',
      status: 'COMPLETED',
      type: 'CONSULTATION',
      reason: 'Initial consultation for breast augmentation',
    }
  });

  // Consultation 1: Linked to Appointment 1
  const consultation1 = await prisma.consultation.create({
    data: {
      appointment_id: appointment1.id,
      doctor_id: doctors[1].id,
      user_id: doctors[1].user_id,
      started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 min later
      duration_minutes: 30,
      chief_complaint: 'Desire for breast augmentation',
      examination: 'Bilateral mammary hypoplasia, good skin quality',
      assessment: 'Good candidate for breast augmentation',
      plan: 'Proceed with bilateral breast augmentation using silicone implants',
      outcome: 'SURGERY_PLANNED',
      outcome_type: 'SURGERY',
      patient_decision: 'PROCEED',
    }
  });

  // Appointment 2: Rhoda → Dr. Ken (Completed consultation → Surgical case)
  const appointment2 = await prisma.appointment.create({
    data: {
      patient_id: p2.id,
      doctor_id: doctors[3].id, // Dr. Ken
      appointment_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      time: '14:00',
      status: 'COMPLETED',
      type: 'CONSULTATION',
      reason: 'Consultation for body contouring',
    }
  });

  // Consultation 2: Linked to Appointment 2
  const consultation2 = await prisma.consultation.create({
    data: {
      appointment_id: appointment2.id,
      doctor_id: doctors[3].id,
      user_id: doctors[3].user_id,
      started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      duration_minutes: 45,
      chief_complaint: 'Desire for body contouring',
      examination: 'Localized fat deposits, good skin elasticity',
      assessment: 'Candidate for liposuction 360 + BBL',
      plan: 'Proceed with liposuction 360 and Brazilian butt lift',
      outcome: 'SURGERY_PLANNED',
      outcome_type: 'SURGERY',
      patient_decision: 'PROCEED',
    }
  });

  // Appointment 3: Alice → Dr. Angela (Completed consultation → Surgical case in theater)
  const alicePatient = await prisma.patient.findFirst({ where: { file_number: 'TEST005' } });
  if (!alicePatient) {
    throw new Error('Alice patient not found');
  }

  const appointment3 = await prisma.appointment.create({
    data: {
      patient_id: alicePatient.id,
      doctor_id: doctors[0].id, // Dr. Angela
      appointment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      time: '09:00',
      status: 'COMPLETED',
      type: 'CONSULTATION',
      reason: 'Rhinoplasty consultation',
    }
  });

  // Consultation 3: Linked to Appointment 3
  const consultation3 = await prisma.consultation.create({
    data: {
      appointment_id: appointment3.id,
      doctor_id: doctors[0].id,
      user_id: doctors[0].user_id,
      started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000),
      duration_minutes: 40,
      chief_complaint: 'Nasal deformity and breathing issues',
      examination: 'Deviated septum, nasal hump, wide nasal tip',
      assessment: 'Good candidate for open rhinoplasty',
      plan: 'Open rhinoplasty with septoplasty',
      outcome: 'SURGERY_PLANNED',
      outcome_type: 'SURGERY',
      patient_decision: 'PROCEED',
    }
  });

  console.log('✅ Appointments & Consultations Created');

  // ============================================================================
  // 9. SURGICAL CASES (Complete with Links)
  // ============================================================================
  console.log('😷 Creating Complete Surgical Cases...');

  // Case 1: Millicent (Post-op / Recovery)
  // Dr. Mukami performing Breast Augmentation
  const case1 = await prisma.surgicalCase.create({
    data: {
      patient_id: p1.id,
      primary_surgeon_id: doctors[1].id, // Dr. Mukami
      consultation_id: consultation1.id, // ✅ Linked to consultation
      urgency: 'ELECTIVE',
      status: 'RECOVERY', // In recovery
      procedure_name: 'Breast Augmentation (Bilateral)',
      diagnosis: 'Mammary Hypoplasia',
      side: 'Bilateral',
      created_by: adminUser.id,
    }
  });

  // Case Plan 1: Linked to Appointment 1 and Surgical Case 1
  await prisma.casePlan.create({
    data: {
      appointment_id: appointment1.id,
      surgical_case_id: case1.id,
      patient_id: p1.id,
      doctor_id: doctors[1].id,
      procedure_plan: `<h3><strong>Surgical Technique: Bilateral Breast Augmentation</strong></h3>
<p><strong>Approach:</strong> Inframammary fold incision</p>
<p><strong>Implant Placement:</strong> Submuscular (dual plane)</p>
<p><strong>Step-by-Step Plan:</strong></p>
<ol>
  <li>Marking: Inframammary fold at 6 o'clock position, 4cm incision length</li>
  <li>Incision: Sharp dissection through skin and subcutaneous tissue</li>
  <li>Pocket Creation: Submuscular dissection using electrocautery</li>
  <li>Hemostasis: Meticulous hemostasis with bipolar cautery</li>
  <li>Implant Insertion: 350cc silicone implants, moderate profile</li>
  <li>Closure: Layered closure with absorbable sutures</li>
  <li>Dressing: Sterile dressings and compression bra</li>
</ol>`,
      risk_factors: `<p><strong>Patient Risk Assessment:</strong></p>
<ul>
  <li>BMI: 22.5 (Normal range)</li>
  <li>No known allergies</li>
  <li>No previous breast surgery</li>
  <li>Non-smoker</li>
  <li>No significant comorbidities</li>
</ul>
<p><strong>Anesthetic Risk:</strong> ASA I (Healthy patient)</p>`,
      pre_op_notes: `<p><strong>Chief Complaint:</strong></p>
<p>Patient desires breast augmentation for improved breast volume and symmetry.</p>

<p><strong>Examination:</strong></p>
<p>Bilateral mammary hypoplasia. Good skin quality and elasticity. Symmetrical chest wall. No ptosis. Nipple-areola complex in good position.</p>

<p><strong>Assessment:</strong></p>
<p>Good candidate for breast augmentation. Patient has realistic expectations and understands the procedure, risks, and recovery.</p>

<p><strong>Pre-operative Instructions:</strong></p>
<ul>
  <li>Fasting from midnight (NPO after 12:00 AM)</li>
  <li>No aspirin or NSAIDs 7 days prior</li>
  <li>Shower with antibacterial soap night before and morning of surgery</li>
  <li>Wear loose-fitting clothing</li>
  <li>Arrive at clinic by 7:00 AM</li>
</ul>`,
      implant_details: JSON.stringify({
        items: [
          {
            id: crypto.randomUUID(),
            name: 'Mentor MemoryGel Silicone Implant',
            manufacturer: 'Mentor Worldwide LLC',
            lotNumber: 'MG-2025-001234',
            serialNumber: 'SN-350-MP-001',
            size: '350cc Moderate Plus Profile',
            expiryDate: '2027-12-31',
            notes: 'Bilateral - same size and profile'
          }
        ],
        freeTextNotes: ''
      }),
      planned_anesthesia: 'GENERAL',
      special_instructions: `<p><strong>Positioning:</strong></p>
<p>Supine position with arms abducted at 90 degrees on arm boards.</p>

<p><strong>Special Considerations:</strong></p>
<ul>
  <li>Patient to avoid lifting arms above shoulder level for 2 weeks</li>
  <li>No heavy lifting (>5kg) for 6 weeks</li>
  <li>Compression bra to be worn continuously for 4 weeks</li>
  <li>Follow-up appointment scheduled for 1 week post-op</li>
</ul>

<p><strong>Post-operative Care:</strong></p>
<p>Standard post-op pain management. Patient education on implant care and signs of complications.</p>`,
      readiness_status: 'READY',
      ready_for_surgery: true,
      estimated_duration_minutes: 120,
    }
  });

  // Create Recovery Record for Case 1
  await prisma.clinicalFormResponse.create({
    data: {
      template_key: 'NURSE_RECOVERY_RECORD',
      template_version: 1,
      surgical_case_id: case1.id,
      patient_id: p1.id,
      status: 'DRAFT',
      data_json: JSON.stringify({
        arrivalBaseline: {
          timeOfArrival: "10:30",
          airwayStatus: "Patent / Spontaneous",
          consciousness: "Drowsy / Arousable",
          o2Saturation: 98,
          o2Administration: "Nasal Cannula",
          painScore: 2,
          nauseaVomiting: "None"
        },
        vitalsMonitoring: {
          observations: [
            { time: "10:35", bpSystolic: 110, bpDiastolic: 70, pulse: 80, rr: 16, spo2: 99, temperature: 36.8, consciousness: "Awake" }
          ]
        }
      }),
      created_by_user_id: nurses[0].id, // Jane
      template_id: (await prisma.clinicalFormTemplate.findUnique({ where: { key_version: { key: 'NURSE_RECOVERY_RECORD', version: 1 } } }))!.id
    }
  });

  // Case 2: Rhoda (Pre-op / Ward Prep)
  // Dr. Ken performing Liposuction
  const case2 = await prisma.surgicalCase.create({
    data: {
      patient_id: p2.id,
      primary_surgeon_id: doctors[3].id, // Dr. Ken
      consultation_id: consultation2.id, // ✅ Linked to consultation
      urgency: 'ELECTIVE',
      status: SurgicalCaseStatus.READY_FOR_WARD_PREP,
      procedure_name: 'Liposuction 360 + BBL',
      diagnosis: 'Lipodystrophy',
      created_by: adminUser.id,
    }
  });

  // Case Plan 2: Linked to Appointment 2 and Surgical Case 2
  await prisma.casePlan.create({
    data: {
      appointment_id: appointment2.id,
      surgical_case_id: case2.id,
      patient_id: p2.id,
      doctor_id: doctors[3].id,
      procedure_plan: `<h3><strong>Surgical Technique: Liposuction 360 + Brazilian Butt Lift</strong></h3>
<p><strong>Phase 1: Liposuction 360</strong></p>
<p>Harvest fat from:</p>
<ul>
  <li>Abdomen (upper and lower)</li>
  <li>Flanks (love handles)</li>
  <li>Back (bra line area)</li>
  <li>Inner and outer thighs</li>
</ul>
<p><strong>Technique:</strong> Tumescent liposuction using power-assisted liposuction (PAL) device</p>
<p><strong>Cannula Size:</strong> 3-4mm for fat harvest, 2-3mm for contouring</p>

<p><strong>Phase 2: Fat Processing</strong></p>
<p>Harvested fat to be processed via centrifugation. Target: 1000-1200cc processed fat.</p>

<p><strong>Phase 3: Brazilian Butt Lift</strong></p>
<p>Fat transfer to buttocks:</p>
<ul>
  <li>Approximately 500cc per side</li>
  <li>Multi-layer injection technique</li>
  <li>Focus on upper pole and lateral projection</li>
</ul>`,
      risk_factors: `<p><strong>Patient Risk Assessment:</strong></p>
<ul>
  <li>BMI: 28.5 (Overweight - acceptable for BBL)</li>
  <li>No known allergies</li>
  <li>Previous C-section scar (lower abdomen)</li>
  <li>Non-smoker</li>
  <li>Well-controlled hypertension (on medication)</li>
</ul>
<p><strong>Anesthetic Risk:</strong> ASA II (Mild systemic disease)</p>
<p><strong>Special Considerations:</strong> Monitor blood pressure intra-operatively</p>`,
      pre_op_notes: `<p><strong>Chief Complaint:</strong></p>
<p>Patient desires body contouring with emphasis on waist reduction and buttock enhancement.</p>

<p><strong>Examination:</strong></p>
<p>Localized fat deposits in abdomen, flanks, and back. Good skin elasticity. Adequate donor fat available for BBL. Buttock shape suitable for enhancement.</p>

<p><strong>Assessment:</strong></p>
<p>Good candidate for combined liposuction 360 and BBL. Patient has adequate donor fat and realistic expectations.</p>

<p><strong>Pre-operative Instructions:</strong></p>
<ul>
  <li>Fasting from midnight (NPO after 12:00 AM)</li>
  <li>Continue blood pressure medication with small sip of water</li>
  <li>No aspirin or NSAIDs 10 days prior</li>
  <li>Shower with antibacterial soap night before and morning of surgery</li>
  <li>Compression garments ready (sizes: M for abdomen, L for buttocks)</li>
  <li>Arrive at clinic by 8:00 AM</li>
</ul>`,
      implant_details: JSON.stringify({
        items: [],
        freeTextNotes: 'Fat transfer procedure - no implants. Approximately 1000cc processed fat harvested from liposuction sites, 500cc per side injected into buttocks.'
      }),
      planned_anesthesia: 'GENERAL',
      special_instructions: `<p><strong>Positioning:</strong></p>
<p>Prone position for liposuction and BBL. Patient will be repositioned as needed.</p>

<p><strong>Special Considerations:</strong></p>
<ul>
  <li>Patient must NOT sit directly on buttocks for 2 weeks post-op</li>
  <li>Use BBL pillow for sitting (provided)</li>
  <li>Compression garments to be worn 24/7 for 6 weeks</li>
  <li>No sitting, lying on back, or strenuous activity for 2 weeks</li>
  <li>Sleep on stomach or side only</li>
</ul>

<p><strong>Post-operative Care:</strong></p>
<p>Monitor for fat embolism symptoms. Standard pain management. Lymphatic drainage massage recommended starting 1 week post-op.</p>`,
      readiness_status: 'IN_PROGRESS',
      ready_for_surgery: false,
      estimated_duration_minutes: 180,
    }
  });

  // Create Ward Checklist for Case 2 (partially filled)
  await prisma.clinicalFormResponse.create({
    data: {
      template_key: 'NURSE_PREOP_WARD_CHECKLIST',
      template_version: 1,
      surgical_case_id: case2.id,
      patient_id: p2.id,
      status: 'DRAFT',
      data_json: JSON.stringify({
        documentation: { documentationComplete: true, correctConsent: true },
        vitals: { bpSystolic: 120, bpDiastolic: 80, pulse: 72, temperature: 36.5 }
      }),
      created_by_user_id: nurses[0].id,
      template_id: (await prisma.clinicalFormTemplate.findUnique({ where: { key_version: { key: 'NURSE_PREOP_WARD_CHECKLIST', version: 1 } } }))!.id
    }
  });

  // Case 3: Alice (Intra-op)
  // Dr. Angela performing Rhinoplasty
  const case3 = await prisma.surgicalCase.create({
    data: {
      patient_id: alicePatient.id, // Alice
      primary_surgeon_id: doctors[0].id, // Dr. Angela
      consultation_id: consultation3.id, // ✅ Linked to consultation
      urgency: 'ELECTIVE',
      status: 'IN_THEATER',
      procedure_name: 'Open Rhinoplasty',
      diagnosis: 'Nasal Deformity',
      created_by: adminUser.id,
    }
  });

  // Case Plan 3: Linked to Appointment 3 and Surgical Case 3
  await prisma.casePlan.create({
    data: {
      appointment_id: appointment3.id,
      surgical_case_id: case3.id,
      patient_id: alicePatient.id,
      doctor_id: doctors[0].id,
      procedure_plan: `<h3><strong>Surgical Technique: Open Rhinoplasty with Septoplasty</strong></h3>
<p><strong>Approach:</strong> Open rhinoplasty via transcolumellar and marginal incisions</p>

<p><strong>Step-by-Step Plan:</strong></p>
<ol>
  <li><strong>Incision:</strong> Inverted-V transcolumellar incision + bilateral marginal incisions</li>
  <li><strong>Elevation:</strong> Elevate skin-soft tissue envelope</li>
  <li><strong>Dorsal Hump Reduction:</strong> 
    <ul>
      <li>Osteotome for bony hump removal</li>
      <li>Scissors for cartilaginous hump reduction</li>
      <li>Rasp for final contouring</li>
    </ul>
  </li>
  <li><strong>Septoplasty:</strong> 
    <ul>
      <li>Harvest deviated septum cartilage</li>
      <li>Preserve L-strut (1cm caudal and dorsal)</li>
      <li>Use harvested cartilage for tip grafting</li>
    </ul>
  </li>
  <li><strong>Tip Refinement:</strong>
    <ul>
      <li>Lower lateral cartilage modification</li>
      <li>Columellar strut placement</li>
      <li>Tip graft using autologous cartilage</li>
    </ul>
  </li>
  <li><strong>Osteotomies:</strong> Lateral and medial osteotomies for nasal width reduction</li>
  <li><strong>Closure:</strong> Layered closure with 6-0 PDS sutures</li>
  <li><strong>Dressing:</strong> External nasal splint, internal nasal packing</li>
</ol>`,
      risk_factors: `<p><strong>Patient Risk Assessment:</strong></p>
<ul>
  <li>BMI: 21.8 (Normal range)</li>
  <li>No known allergies</li>
  <li>No previous nasal surgery</li>
  <li>Non-smoker</li>
  <li>No significant comorbidities</li>
  <li>Deviated septum causing breathing difficulties</li>
</ul>
<p><strong>Anesthetic Risk:</strong> ASA I (Healthy patient)</p>
<p><strong>Special Considerations:</strong> Patient has functional breathing issues requiring septoplasty</p>`,
      pre_op_notes: `<p><strong>Chief Complaint:</strong></p>
<p>Nasal deformity with dorsal hump and wide nasal tip. Difficulty breathing through right nostril.</p>

<p><strong>Examination:</strong></p>
<p>External: Dorsal hump present, wide nasal tip, slight deviation to right. Internal: Deviated septum to right, right inferior turbinate hypertrophy. Nasal valve function adequate.</p>

<p><strong>Assessment:</strong></p>
<p>Good candidate for open rhinoplasty with functional septoplasty. Patient has realistic expectations and understands the procedure, risks, and recovery timeline.</p>

<p><strong>Pre-operative Instructions:</strong></p>
<ul>
  <li>Fasting from midnight (NPO after 12:00 AM)</li>
  <li>No aspirin or NSAIDs 10 days prior</li>
  <li>No herbal supplements 2 weeks prior</li>
  <li>Shower with antibacterial soap night before and morning of surgery</li>
  <li>No makeup or jewelry</li>
  <li>Arrive at clinic by 7:30 AM</li>
</ul>`,
      implant_details: JSON.stringify({
        items: [],
        freeTextNotes: 'No implants required. Procedure uses autologous cartilage harvested from deviated septum for tip grafting and structural support.'
      }),
      planned_anesthesia: 'GENERAL',
      special_instructions: `<p><strong>Positioning:</strong></p>
<p>Supine position with head elevated 15-20 degrees. Head ring for stability.</p>

<p><strong>Special Considerations:</strong></p>
<ul>
  <li>Nasal packing to remain for 24-48 hours</li>
  <li>External splint to remain for 7-10 days</li>
  <li>Patient must avoid nose blowing for 2 weeks</li>
  <li>Sleep with head elevated for 1 week</li>
  <li>Avoid glasses resting on nose bridge for 6 weeks</li>
  <li>No strenuous activity or bending over for 2 weeks</li>
</ul>

<p><strong>Post-operative Care:</strong></p>
<p>Standard post-op pain management. Nasal saline irrigation starting 48 hours post-op. Follow-up appointments at 1 week (splint removal), 1 month, 3 months, and 6 months.</p>

<p><strong>Warning Signs:</strong></p>
<p>Patient to report immediately: excessive bleeding, difficulty breathing, signs of infection, or severe pain.</p>`,
      readiness_status: 'READY',
      ready_for_surgery: true,
      estimated_duration_minutes: 150,
    }
  });

  // Create Intra-Op Record for Case 3
  await prisma.clinicalFormResponse.create({
    data: {
      template_key: 'NURSE_INTRAOP_RECORD',
      template_version: 1,
      surgical_case_id: case3.id,
      patient_id: case3.patient_id,
      status: 'DRAFT',
      data_json: JSON.stringify({
        theatreSetup: { theatreClean: true, equipmentChecked: true },
        counts: { initialSwabCount: 20, initialSharpCount: 10, initialInstrumentCount: 40 }
      }),
      created_by_user_id: nurses[1].id, // Lucy
      template_id: (await prisma.clinicalFormTemplate.findUnique({ where: { key_version: { key: 'NURSE_INTRAOP_RECORD', version: 1 } } }))!.id
    }
  });

  // Theater Bookings for surgical cases
  const theaters = await prisma.theater.findMany();
  if (theaters.length > 0) {
    // Case 1: Already completed (no booking needed)

    // Case 2: Ready for scheduling - create provisional booking
    if (theaters.length > 1) {
      await prisma.theaterBooking.create({
        data: {
          theater_id: theaters[1].id, // Minor theater
          surgical_case_id: case2.id,
          start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
          status: 'PROVISIONAL',
        }
      });
    }

    // Case 3: In theater - create confirmed booking for today
    if (theaters.length > 0) {
      const today = new Date();
      today.setHours(9, 0, 0, 0); // 9 AM today
      await prisma.theaterBooking.create({
        data: {
          theater_id: theaters[0].id, // Major theater
          surgical_case_id: case3.id,
          start_time: today,
          end_time: new Date(today.getTime() + 2.5 * 60 * 60 * 1000), // 2.5 hours later
          status: 'CONFIRMED',
        }
      });
    }
  }

  console.log('✅ Complete Surgical Cases Created with Full Workflow Links');
  console.log('   - Case 1: Recovery (linked to Appointment + Consultation + CasePlan)');
  console.log('   - Case 2: Ready for Scheduling (linked to Appointment + Consultation + CasePlan + Theater Booking)');
  console.log('   - Case 3: In Theater (linked to Appointment + Consultation + CasePlan + Theater Booking)');


  // ============================================================================
  // 9. DOCTOR AVAILABILITY SLOTS (Critical for Booking Workflow)
  // ============================================================================
  console.log('📅 Creating Doctor Availability Slots...');

  // Configure slots for all doctors
  for (const doctor of doctors) {
    // Create slot configuration (15-minute intervals, 30-minute default duration)
    await prisma.slotConfiguration.upsert({
      where: { doctor_id: doctor.id },
      update: {},
      create: {
        doctor_id: doctor.id,
        default_duration: 30,
        buffer_time: 5,
        slot_interval: 15, // 15-minute slots
      }
    });

    // Create availability template
    const template = await prisma.availabilityTemplate.create({
      data: {
        doctor_id: doctor.id,
        name: 'Default Weekly Schedule',
        is_active: true,
        slots: {
          create: [
            // Monday: 9 AM - 5 PM
            { day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_type: 'CLINIC', max_patients: 1 },
            // Tuesday: 9 AM - 5 PM
            { day_of_week: 2, start_time: '09:00', end_time: '17:00', slot_type: 'CLINIC', max_patients: 1 },
            // Wednesday: 9 AM - 5 PM
            { day_of_week: 3, start_time: '09:00', end_time: '17:00', slot_type: 'CLINIC', max_patients: 1 },
            // Thursday: 9 AM - 5 PM
            { day_of_week: 4, start_time: '09:00', end_time: '17:00', slot_type: 'CLINIC', max_patients: 1 },
            // Friday: 9 AM - 3 PM
            { day_of_week: 5, start_time: '09:00', end_time: '15:00', slot_type: 'CLINIC', max_patients: 1 },
          ]
        }
      }
    });
  }

  console.log('✅ Doctor Availability Slots Created (15-min intervals, Mon-Fri)');


  // ============================================================================
  // 10. APPOINTMENTS IN VARIOUS STATES (For Queue & Booking Testing)
  // ============================================================================
  console.log('📅 Creating Appointments in Various States...');

  const allPatients = await prisma.patient.findMany();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get patients for queue testing
  const ritaPatient = await prisma.patient.findFirst({ where: { file_number: 'TEST001' } });
  const carlPatient = await prisma.patient.findFirst({ where: { file_number: 'TEST002' } });
  const fionaPatient = await prisma.patient.findFirst({ where: { file_number: 'TEST003' } });
  const umaPatient = await prisma.patient.findFirst({ where: { file_number: 'TEST004' } });

  if (ritaPatient && carlPatient && fionaPatient && umaPatient && doctors.length >= 2) {
    // Appointment 1: PENDING (not yet confirmed by doctor)
    const apptPending = await prisma.appointment.create({
      data: {
        patient_id: ritaPatient.id,
        doctor_id: doctors[0].id, // Dr. Angela
        appointment_date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        time: '10:00',
        status: 'PENDING',
        type: 'CONSULTATION',
        reason: 'Initial consultation',
        created_by_user_id: frontdeskUser.id,
      }
    });

    // Appointment 2: CONFIRMED (doctor confirmed, not checked in)
    const apptConfirmed = await prisma.appointment.create({
      data: {
        patient_id: carlPatient.id,
        doctor_id: doctors[0].id, // Dr. Angela
        appointment_date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        time: '10:15',
        status: 'CONFIRMED',
        type: 'CONSULTATION',
        reason: 'Follow-up consultation',
        doctor_confirmed_at: new Date(),
        doctor_confirmed_by: doctors[0].user_id,
        created_by_user_id: frontdeskUser.id,
      }
    });

    // Appointment 3: SCHEDULED (checked in, waiting in queue)
    const apptScheduled1 = await prisma.appointment.create({
      data: {
        patient_id: fionaPatient.id,
        doctor_id: doctors[0].id, // Dr. Angela
        appointment_date: today, // Today
        time: '09:00',
        status: 'SCHEDULED',
        type: 'CONSULTATION',
        reason: 'Routine check-up',
        doctor_confirmed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        doctor_confirmed_by: doctors[0].user_id,
        checked_in_at: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        checked_in_by: frontdeskUser.id,
        created_by_user_id: frontdeskUser.id,
      }
    });

    // Appointment 4: SCHEDULED (checked in, waiting in queue - second patient)
    const apptScheduled2 = await prisma.appointment.create({
      data: {
        patient_id: umaPatient.id,
        doctor_id: doctors[0].id, // Dr. Angela
        appointment_date: today, // Today
        time: '09:15',
        status: 'SCHEDULED',
        type: 'CONSULTATION',
        reason: 'Follow-up',
        doctor_confirmed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        doctor_confirmed_by: doctors[0].user_id,
        checked_in_at: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
        checked_in_by: frontdeskUser.id,
        created_by_user_id: frontdeskUser.id,
      }
    });

    // Appointment 5: IN_CONSULTATION (currently active)
    const apptInConsult = await prisma.appointment.create({
      data: {
        patient_id: ritaPatient.id,
        doctor_id: doctors[1].id, // Dr. Mukami
        appointment_date: today,
        time: '08:30',
        status: 'IN_CONSULTATION',
        type: 'CONSULTATION',
        reason: 'Initial consultation',
        doctor_confirmed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        doctor_confirmed_by: doctors[1].user_id,
        checked_in_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        checked_in_by: frontdeskUser.id,
        consultation_started_at: new Date(Date.now() - 20 * 60 * 1000), // Started 20 min ago
        created_by_user_id: frontdeskUser.id,
      }
    });

    // Create active consultation for appointment 5
    await prisma.consultation.create({
      data: {
        appointment_id: apptInConsult.id,
        doctor_id: doctors[1].id,
        user_id: doctors[1].user_id,
        started_at: new Date(Date.now() - 20 * 60 * 1000),
      }
    });

    console.log('✅ Appointments Created:');
    console.log('   - 1 PENDING (not confirmed)');
    console.log('   - 1 CONFIRMED (not checked in)');
    console.log('   - 2 SCHEDULED (checked in, in queue)');
    console.log('   - 1 IN_CONSULTATION (active consultation)');
  }


  // ============================================================================
  // 11. INVENTORY ITEMS, VENDORS, PURCHASE ORDERS
  // ============================================================================
  console.log('📦 Creating Inventory Items, Vendors & Purchase Orders...');

  // Check if Vendor table exists
  let vendorTableExists = false;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "Vendor" LIMIT 1`;
    vendorTableExists = true;
  } catch (e: any) {
    if (e.code === 'P2021' || e.message?.includes('does not exist')) {
      vendorTableExists = false;
    } else {
      throw e;
    }
  }

  if (!vendorTableExists) {
    console.log('   ⚠️  Vendor/PurchaseOrder tables not found in database.');
    console.log('   ⚠️  Skipping inventory seeding. Please run migrations first.');
    console.log('   ⚠️  Run: npx prisma migrate deploy');
  } else {
    // Create STORES user if not exists
    const storesPassword = await hashPassword('stores123');
    const storesUser = await createOrUpdateUser({
      email: 'stores@nairobisculpt.com',
      password_hash: storesPassword,
      role: Role.STORES,
      first_name: 'Inventory',
      last_name: 'Manager',
    });

    // Create vendors
    const vendor1 = await prisma.vendor.create({
      data: {
        name: 'MedSupply Kenya Ltd',
        contact_person: 'John Kamau',
        email: 'orders@medsupply.co.ke',
        phone: '+254722111111',
        address: 'Industrial Area, Nairobi',
        tax_id: 'P051234567K',
        payment_terms: 'Net 30',
        is_active: true,
      }
    });

    const vendor2 = await prisma.vendor.create({
      data: {
        name: 'Surgical Equipment Africa',
        contact_person: 'Mary Wanjiku',
        email: 'sales@surgicalequip.africa',
        phone: '+254733222222',
        address: 'Westlands, Nairobi',
        tax_id: 'P052345678K',
        payment_terms: 'Net 15',
        is_active: true,
      }
    });

    // Create inventory items
    const inventoryItems = await Promise.all([
      // Medications
      prisma.inventoryItem.create({
        data: {
          name: 'Sodium Chloride 0.9% IV Fluid 500ml',
          sku: 'IV-SAL-500',
          category: 'MEDICATION',
          description: 'Normal saline for IV administration',
          unit_of_measure: 'bottle',
          unit_cost: 250,
          reorder_point: 20,
          supplier: vendor1.name,
          is_active: true,
          is_billable: true,
        }
      }),
      prisma.inventoryItem.create({
        data: {
          name: 'Paracetamol 500mg Tablets',
          sku: 'MED-PARA-500',
          category: 'MEDICATION',
          description: 'Pain relief medication',
          unit_of_measure: 'tablet',
          unit_cost: 5,
          reorder_point: 200,
          supplier: vendor1.name,
          is_active: true,
          is_billable: true,
        }
      }),
      // Consumables
      prisma.inventoryItem.create({
        data: {
          name: 'Surgical Gloves (Latex Free)',
          sku: 'CONS-GLOVE-LF',
          category: 'DISPOSABLE',
          description: 'Sterile surgical gloves, latex-free, size medium',
          unit_of_measure: 'pair',
          unit_cost: 15,
          reorder_point: 100,
          supplier: vendor1.name,
          is_active: true,
          is_billable: true,
        }
      }),
      prisma.inventoryItem.create({
        data: {
          name: 'Surgical Masks (Disposable)',
          sku: 'CONS-MASK-DIS',
          category: 'DISPOSABLE',
          description: '3-ply disposable surgical masks',
          unit_of_measure: 'piece',
          unit_cost: 10,
          reorder_point: 150,
          supplier: vendor1.name,
          is_active: true,
          is_billable: false, // Not billable to patient
        }
      }),
      // Implants
      prisma.inventoryItem.create({
        data: {
          name: 'Silicone Breast Implant 300cc',
          sku: 'IMPL-BREAST-300',
          category: 'IMPLANT',
          description: 'Round silicone breast implant, 300cc',
          unit_of_measure: 'unit',
          reorder_point: 2,
          supplier: vendor2.name,
          manufacturer: 'Allergan',
          is_active: true,
          is_billable: true,
          is_implant: true,
        }
      }),
      prisma.inventoryItem.create({
        data: {
          name: 'Surgical Suture 3-0 Vicryl',
          sku: 'CONS-SUTURE-3-0',
          category: 'DISPOSABLE',
          description: 'Absorbable surgical suture, 3-0 Vicryl',
          unit_of_measure: 'pack',
          unit_cost: 500,
          reorder_point: 10,
          supplier: vendor1.name,
          is_active: true,
          is_billable: true,
        }
      }),
    ]);

    // Create purchase order
    const po = await prisma.purchaseOrder.create({
      data: {
        vendor_id: vendor1.id,
        po_number: `PO-${new Date().getFullYear()}-001`,
        status: 'APPROVED',
        subtotal: 15000,
        total_amount: 15000,
        ordered_by_user_id: storesUser.id,
        approved_by_user_id: adminUser.id,
        approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        notes: 'Monthly restocking order',
        items: {
          create: [
            {
              inventory_item_id: inventoryItems[0].id, // IV Fluid
              item_name: inventoryItems[0].name,
              quantity_ordered: 30,
              unit_price: 250,
              line_total: 7500,
            },
            {
              inventory_item_id: inventoryItems[2].id, // Gloves
              item_name: inventoryItems[2].name,
              quantity_ordered: 100,
              unit_price: 15,
              line_total: 1500,
            },
            {
              inventory_item_id: inventoryItems[3].id, // Masks
              item_name: inventoryItems[3].name,
              quantity_ordered: 200,
              unit_price: 10,
              line_total: 2000,
            },
          ]
        }
      }
    });

    // Create goods receipt
    const gr = await prisma.goodsReceipt.create({
      data: {
        purchase_order_id: po.id,
        receipt_number: `GRN-${new Date().getFullYear()}-001`,
        received_by_user_id: storesUser.id,
        received_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        notes: 'Received in good condition',
        receipt_items: {
          create: [
            {
              po_item_id: (await prisma.purchaseOrderItem.findFirst({ where: { purchase_order_id: po.id, inventory_item_id: inventoryItems[0].id } }))!.id,
              inventory_item_id: inventoryItems[0].id,
              quantity_received: 30,
              unit_cost: 250,
              batch_number: 'BATCH-001',
              expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            },
            {
              po_item_id: (await prisma.purchaseOrderItem.findFirst({ where: { purchase_order_id: po.id, inventory_item_id: inventoryItems[2].id } }))!.id,
              inventory_item_id: inventoryItems[2].id,
              quantity_received: 100,
              unit_cost: 15,
              batch_number: 'BATCH-002',
            },
          ]
        }
      }
    });

    // Update inventory quantities (goods receipt should have done this, but ensure it's correct)
    // NOTE: quantity_on_hand has been removed from the schema.
    // Stock is now dynamically calculated from batches and transactions.

    console.log('✅ Inventory System Seeded:');
    console.log(`   - 2 Vendors`);
    console.log(`   - ${inventoryItems.length} Inventory Items (Medications, Consumables, Implants)`);
    console.log(`   - 1 Purchase Order (APPROVED)`);
    console.log(`   - 1 Goods Receipt`);
  }


  // ============================================================================
  // 12. PRE-OP WARD CHECKLIST DATA (For Surgical Cases)
  // ============================================================================
  console.log('📋 Creating Pre-Op Ward Checklist Data...');

  // Get surgical case that's ready for pre-op (use valid status)
  const caseForPreOp = await prisma.surgicalCase.findFirst({
    where: { status: SurgicalCaseStatus.READY_FOR_WARD_PREP },
    include: { patient: true }
  });

  if (caseForPreOp && nurses.length > 0) {
    const preOpTemplate = await prisma.clinicalFormTemplate.findUnique({
      where: { key_version: { key: 'NURSE_PREOP_WARD_CHECKLIST', version: 1 } }
    });

    if (preOpTemplate) {
      // Check if inventory items exist for medication section
      let medicationData: any[] = [];
      try {
        const inventoryItems = await prisma.inventoryItem.findMany({ take: 2 });
        if (inventoryItems.length > 0) {
          medicationData = [
            {
              inventoryItemId: inventoryItems[0].id,
              name: inventoryItems[0].name,
              quantity: 2,
              unit: inventoryItems[0].unit_of_measure,
              notes: 'Pre-op hydration',
            },
            ...(inventoryItems.length > 1 ? [{
              inventoryItemId: inventoryItems[1].id,
              name: inventoryItems[1].name,
              quantity: 2,
              unit: inventoryItems[1].unit_of_measure,
              notes: 'Pre-op pain management',
            }] : [])
          ];
        }
      } catch (e) {
        // Inventory items not available, skip medication section
        console.log('   ⚠️  Inventory items not available, creating checklist without medication');
      }

      // Check if pre-op checklist already exists
      const existingChecklist = await prisma.clinicalFormResponse.findFirst({
        where: {
          template_key: 'NURSE_PREOP_WARD_CHECKLIST',
          template_version: 1,
          surgical_case_id: caseForPreOp.id,
        }
      });

      if (!existingChecklist) {
        await prisma.clinicalFormResponse.create({
          data: {
            template_key: 'NURSE_PREOP_WARD_CHECKLIST',
            template_version: 1,
            surgical_case_id: caseForPreOp.id,
            patient_id: caseForPreOp.patient_id,
            status: 'DRAFT',
            data_json: JSON.stringify({
              patientVerification: {
                nameConfirmed: true,
                dobConfirmed: true,
                allergiesNoted: true,
                consentSigned: true,
              },
              medication: medicationData,
              vitalSigns: {
                bloodPressure: '120/80',
                heartRate: 72,
                temperature: 36.5,
                oxygenSaturation: 98,
              },
              fastingStatus: {
                lastMeal: '2024-02-23T20:00:00Z',
                lastLiquid: '2024-02-23T22:00:00Z',
                fastingConfirmed: true,
              },
              preparation: {
                skinPrep: true,
                jewelryRemoved: true,
                makeupRemoved: true,
                voided: true,
              }
            }),
            created_by_user_id: nurses[0].id,
            template_id: preOpTemplate.id,
          }
        });
        console.log('✅ Pre-Op Ward Checklist Created for Surgical Case');
      } else {
        console.log('   ℹ️  Pre-Op Ward Checklist already exists for this case, skipping');
      }

      console.log('✅ Pre-Op Ward Checklist Created for Surgical Case');
    }
  }


  // ============================================================================
  // SEED COMPLETE
  // ============================================================================
  console.log('\n🎉 Production Database Seeded Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 Clinic: Nairobi Sculpt Aesthetic Centre');
  console.log('   4th Avenue Towers, 13th Floor, Nairobi');
  console.log('');
  console.log('🏥 Infrastructure:');
  console.log('   - 3 Theaters (Major, Minor, Procedure Room)');
  console.log('   - 3 Consent Templates');
  console.log('   - 5 Service Types');
  console.log('');
  console.log('👨‍⚕️ Doctors (5):');
  console.log('   - Dr. Angela Muoki (angela@nairobisculpt.com)');
  console.log('   - Dr. Mukami Gathariki (mukami@nairobisculpt.com)');
  console.log('   - Dr. Dorsi Jowi (dorsi@nairobisculpt.com)');
  console.log('   - Dr. Ken Aluora (ken@nairobisculpt.com)');
  console.log('   - Dr. John Paul Ogalo (ogalo@nairobisculpt.com)');
  console.log('   Password: doctor123');
  console.log('');
  console.log('👥 Staff:');
  console.log('   - Admin: admin@nairobisculpt.com (admin123)');
  console.log('   - Frontdesk: reception@nairobisculpt.com (frontdesk123)');
  console.log('   - Nurses: jane@nairobisculpt.com, lucy@nairobisculpt.com (nurse123)');
  console.log('   - Theater Tech: theater@nairobisculpt.com (theatertech123)');
  console.log('   - Stores: stores@nairobisculpt.com (stores123)');
  console.log('');
  console.log('🧪 Test Patients (11): password123');
  console.log('   Millicent, Rhoda, Rita, Carl, Fiona, Uma,');
  console.log('   Alice, Bob, Charlie, Diana, Eve');
  console.log('');
  console.log('📅 Booking & Queue System:');
  console.log('   - All doctors have availability slots configured (15-min intervals)');
  console.log('   - 5 appointments in various states:');
  console.log('     • 1 PENDING (not confirmed)');
  console.log('     • 1 CONFIRMED (not checked in)');
  console.log('     • 2 SCHEDULED (checked in, in queue)');
  console.log('     • 1 IN_CONSULTATION (active)');
  console.log('');
  console.log('📦 Inventory System:');
  console.log('   - 2 Vendors (MedSupply Kenya, Surgical Equipment Africa)');
  console.log('   - 6 Inventory Items (Medications, Consumables, Implants)');
  console.log('   - 1 Purchase Order (APPROVED)');
  console.log('   - 1 Goods Receipt');
  console.log('');
  console.log('✅ READY FOR TESTING:');
  console.log('   ✓ Frontdesk can book appointments (doctors have slots)');
  console.log('   ✓ Queue management (multiple patients checked in)');
  console.log('   ✓ Consultation room (active consultation with timer)');
  console.log('   ✓ Surgical planning (cases with plans ready)');
  console.log('   ✓ Inventory management (items, vendors, POs)');
  console.log('   ✓ Pre-op ward checklist (integrated with inventory)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
