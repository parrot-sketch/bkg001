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

import { PrismaClient, Role, Status, Gender, ConsentType, NotificationType, NotificationStatus } from '@prisma/client';
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

async function main() {
  console.log('🌱 Starting Operational Validation Seed...\n');

  // ============================================================================
  // 1. CLEAN SLATE
  // ============================================================================
  console.log('🧹 Clearing existing data...');
  const tableNames = [
    'Notification', 'AuditLog', 'Rating', 'PatientBill', 'Payment', 'Service',
    'LabTest', 'Diagnosis', 'VitalSign', 'MedicalRecord', 'CareNote', 'NurseAssignment',
    'ClinicalAuditEvent', 'SurgicalChecklist', 'SurgicalStaff', 'SurgicalProcedureRecord',
    'TheaterBooking', 'SurgicalCase', 'ConsentForm', 'PatientImage', 'CasePlan',
    'ConsultationMessage', 'ConsultationAttachment', 'DoctorConsultation',
    'Consultation', 'Appointment', 'AvailabilitySlot', 'AvailabilityTemplate', 'ScheduleSession', 'ScheduleBlock',
    'AvailabilityOverride', 'AvailabilityBreak', 'SlotConfiguration', 'RefreshToken',
    'Patient', 'Doctor', 'User', 'Theater', 'Clinic', 'ConsentTemplate', 'IntakeSubmission', 'IntakeSession'
  ];

  for (const tableName of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
    } catch (e) {
      // Ignore table not found if schema changed significantly
    }
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
      name: 'Theater A (Major)',
      type: 'MAJOR',
      status: 'ACTIVE',
      color_code: '#EF4444', // Red
      notes: 'Equipped for general anesthesia and complex reconstructive surgeries.'
    }
  });

  const theaterMinor = await prisma.theater.create({
    data: {
      name: 'Theater B (Minor)',
      type: 'MINOR',
      status: 'ACTIVE',
      color_code: '#3B82F6', // Blue
      notes: 'Local anesthesia and sedation procedures only.'
    }
  });

  const procedureRoom = await prisma.theater.create({
    data: {
      name: 'Procedure Room 1',
      type: 'PROCEDURE_ROOM',
      status: 'ACTIVE',
      color_code: '#10B981', // Green
      notes: 'Injectables and non-invasive treatments.'
    }
  });

  console.log('✅ Clinic and Theaters configured\n');


  // ============================================================================
  // 3. STAFF & USERS
  // ============================================================================
  console.log('👥 Creating Staff...');

  // --- Admin ---
  const adminPassword = await hashPassword('admin123');
  const adminUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'admin@nairobisculpt.com',
      password_hash: adminPassword,
      role: Role.ADMIN,
      status: Status.ACTIVE,
      first_name: 'System',
      last_name: 'Administrator',
    },
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
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        email: doc.email,
        password_hash: password,
        role: Role.DOCTOR,
        first_name: doc.firstName,
        last_name: doc.lastName,
      }
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
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        email: nurse.email,
        password_hash: password,
        role: Role.NURSE,
        first_name: nurse.name.split(' ')[0],
        last_name: nurse.name.split(' ')[1],
      }
    });
    nurses.push(user);
  }

  // --- Frontdesk ---
  const frontdeskPassword = await hashPassword('frontdesk123');
  const frontdeskUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'reception@nairobisculpt.com',
      password_hash: frontdeskPassword,
      role: Role.FRONTDESK,
      first_name: 'David',
      last_name: 'Omondi',
    }
  });

  // --- Theater Technician ---
  const theaterTechPassword = await hashPassword('theatertech123');
  const theaterTechUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'theater@nairobisculpt.com',
      password_hash: theaterTechPassword,
      role: Role.THEATER_TECHNICIAN,
      first_name: 'Samuel',
      last_name: 'Kiprop',
    }
  });

  console.log('✅ Staff accounts created\n');


  // ============================================================================
  // 4. ADMIN CONFIGURATION (Consent Templates)
  // ============================================================================
  console.log('📜 Creating Consent Templates...');

  await prisma.consentTemplate.createMany({
    data: [
      {
        title: 'General Surgery Consent',
        type: ConsentType.GENERAL_PROCEDURE,
        content: '# Informed Consent for Surgery\n\nI hereby authorize Dr. [Doctor Name] to perform...',
        version: 1,
        created_by: adminUser.id
      },
      {
        title: 'Anesthesia Consent',
        type: ConsentType.ANESTHESIA,
        content: '# Informed Consent for Anesthesia\n\nI understand the risks associated with anesthesia...',
        version: 1,
        created_by: adminUser.id
      },
      {
        title: 'Photography Release',
        type: ConsentType.PHOTOGRAPHY,
        content: '# Medical Photography Release\n\nI consent to photographs being taken for medical records...',
        version: 1,
        created_by: adminUser.id
      }
    ]
  });
  console.log('✅ Consent Templates created\n');


  // ============================================================================
  // 5. PATIENTS & CLINICAL DATA
  // ============================================================================
  console.log('🏥 Creating Patients & Clinical Data...');

  // Patient 1: Millicent (Post-op)
  const p1Password = await hashPassword('patient123');
  const p1User = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'millicent@example.com',
      role: Role.PATIENT,
      password_hash: p1Password,
      first_name: 'Millicent',
      last_name: 'Wanjiku'
    }
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
  const p2User = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'rhoda@example.com',
      role: Role.PATIENT,
      password_hash: p2Password,
      first_name: 'Rhoda',
      last_name: 'Atieno'
    }
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
  const userRita = await prisma.user.create({
    data: { 
      id: uuid(), 
      email: 'rita.checkin@example.com', 
      role: Role.PATIENT, 
      password_hash: await hashPassword('password123'), 
      first_name: 'Rita', 
      last_name: 'CheckIn' 
    }
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
  const userCarl = await prisma.user.create({
    data: { 
      id: uuid(), 
      email: 'carl.consult@example.com', 
      role: Role.PATIENT, 
      password_hash: await hashPassword('password123'), 
      first_name: 'Carl', 
      last_name: 'Consult' 
    }
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
  const userFiona = await prisma.user.create({
    data: { 
      id: uuid(), 
      email: 'fiona.fresh@example.com', 
      role: Role.PATIENT, 
      password_hash: await hashPassword('password123'), 
      first_name: 'Fiona', 
      last_name: 'Fresh' 
    }
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
  const userUma = await prisma.user.create({
    data: { 
      id: uuid(), 
      email: 'uma.upcoming@example.com', 
      role: Role.PATIENT, 
      password_hash: await hashPassword('password123'), 
      first_name: 'Uma', 
      last_name: 'Upcoming' 
    }
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
  const userA = await prisma.user.create({
    data: { id: uuid(), email: 'alice.test@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Alice', last_name: 'Wanjiru' }
  });
  await prisma.patient.create({
    data: {
      user_id: userA.id, file_number: 'TEST005', first_name: 'Alice', last_name: 'Wanjiru', email: 'alice.test@example.com', phone: '+254711000001',
      date_of_birth: new Date('1995-01-01'), gender: Gender.FEMALE, address: 'Nairobi', emergency_contact_name: 'Mom', emergency_contact_number: '0700000000', relation: 'Mother',
      marital_status: 'Single',
    }
  });

  // --- Test Patient: Bob ---
  const userB = await prisma.user.create({
    data: { id: uuid(), email: 'bob.test@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Bob', last_name: 'Ochieng' }
  });
  await prisma.patient.create({
    data: {
      user_id: userB.id, file_number: 'TEST006', first_name: 'Bob', last_name: 'Ochieng', email: 'bob.test@example.com', phone: '+254711000002',
      date_of_birth: new Date('1980-06-15'), gender: Gender.MALE, address: 'Nairobi', emergency_contact_name: 'Wife', emergency_contact_number: '0700000000', relation: 'Spouse',
      marital_status: 'Married',
    }
  });

  // --- Test Patient: Charlie ---
  const userC = await prisma.user.create({
    data: { id: uuid(), email: 'charlie.test@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Charlie', last_name: 'Kamau' }
  });
  await prisma.patient.create({
    data: {
      user_id: userC.id, file_number: 'TEST007', first_name: 'Charlie', last_name: 'Kamau', email: 'charlie.test@example.com', phone: '+254711000003',
      date_of_birth: new Date('1992-03-10'), gender: Gender.MALE, address: 'Nairobi', emergency_contact_name: 'Dad', emergency_contact_number: '0700000000', relation: 'Father',
      marital_status: 'Single',
    }
  });

  // --- Test Patient: Diana ---
  const userD = await prisma.user.create({
    data: { id: uuid(), email: 'diana.test@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Diana', last_name: 'Nyambura' }
  });
  await prisma.patient.create({
    data: {
      user_id: userD.id, file_number: 'TEST008', first_name: 'Diana', last_name: 'Nyambura', email: 'diana.test@example.com', phone: '+254711000004',
      date_of_birth: new Date('1988-11-22'), gender: Gender.FEMALE, address: 'Nairobi', emergency_contact_name: 'Brother', emergency_contact_number: '0700000000', relation: 'Brother',
      marital_status: 'Single',
    }
  });

  // --- Test Patient: Eve (with medical history) ---
  const userE = await prisma.user.create({
    data: { id: uuid(), email: 'eve.test@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Eve', last_name: 'Akinyi' }
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
  console.log('');
  console.log('🧪 Test Patients (11): password123');
  console.log('   Millicent, Rhoda, Rita, Carl, Fiona, Uma,');
  console.log('   Alice, Bob, Charlie, Diana, Eve');
  console.log('');
  console.log('⚠️  NEXT STEPS:');
  console.log('   1. Doctors must set their availability schedules');
  console.log('   2. Appointments can then be booked');
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
