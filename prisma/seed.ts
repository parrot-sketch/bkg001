/**
 * Comprehensive Database Seed Script (Admin & Operational Validation)
 * 
 * Seeds the Nairobi Sculpt Surgical Aesthetic Clinic database with:
 * - Clinic Configuration & Theaters
 * - Users (Admin, Doctors, Nurses, Frontdesk)
 * - Consent Templates
 * - Patients with medical history
 * - Appointments with realistic schedules
 * 
 * Run with: npm run db:reset
 */

import { PrismaClient, Role, Status, AppointmentStatus, Gender, PaymentMethod, PaymentStatus, CareNoteType, NotificationType, NotificationStatus, CaseReadinessStatus, ConsentType, SurgicalUrgency, AnesthesiaType } from '@prisma/client';
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
    'SurgicalStaff', 'SurgicalProcedureRecord', 'ConsentForm', 'PatientImage', 'CasePlan',
    'ConsultationMessage', 'ConsultationAttachment', 'DoctorConsultation',
    'Consultation', 'Appointment', 'WorkingDay', 'ScheduleSession', 'ScheduleBlock',
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
      name: 'Nairobi Sculpt Surgical Aesthetic Center',
      address: 'General Mathenge Drive, Westlands, Nairobi',
      phone: '+254 700 000 000',
      email: 'info@nairobisculpt.com',
      website: 'www.nairobisculpt.com',
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

  // --- Doctors ---
  const doctorData = [
    { name: 'Dr. Mukami Gathariki', email: 'mukami@nairobisculpt.com', spec: 'Plastic & Reconstructive Surgery', color: '#FF6B6B' },
    { name: 'Dr. Ken Aluora', email: 'ken@nairobisculpt.com', spec: 'Plastic Surgery', color: '#4ECDC4' },
    { name: 'Dr. Angela Muoki', email: 'angela@nairobisculpt.com', spec: 'Pediatric & Aesthetic Surgery', color: '#FFE66D' },
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
        first_name: doc.name.split(' ')[1],
        last_name: doc.name.split(' ')[2] || '',
      }
    });

    const doctorProfile = await prisma.doctor.create({
      data: {
        user_id: user.id,
        email: doc.email,
        name: doc.name,
        first_name: doc.name.split(' ')[1],
        last_name: doc.name.split(' ')[2] || '',
        specialization: doc.spec,
        license_number: `KMPDB-${Math.floor(Math.random() * 10000)}`,
        phone: '+254700000000',
        address: 'Nairobi',
        colorCode: doc.color,
        availability_status: 'AVAILABLE',
        onboarding_status: 'ACTIVE',
      }
    });
    doctors.push(doctorProfile);

    // Default Schedule: Mon-Fri 9-5
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const wd = await prisma.workingDay.create({
        data: {
          doctor_id: doctorProfile.id,
          day,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true
        }
      });
    }

    // Add slots configuration (Once per doctor)
    await prisma.slotConfiguration.create({
      data: {
        doctor_id: doctorProfile.id,
        default_duration: 30,
        buffer_time: 5,
        slot_interval: 15
      }
    });
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

  // Appointment 1: Past Surgery (Completed)
  const app1 = await prisma.appointment.create({
    data: {
      patient_id: p1.id,
      doctor_id: doctors[0].id,
      appointment_date: new Date(new Date().setDate(new Date().getDate() - 14)), // 2 weeks ago
      time: '08:00',
      status: AppointmentStatus.COMPLETED,
      type: 'Surgery',
      reason: 'Breast Augmentation',
    }
  });

  // Case Plan for Surgery
  const case1 = await prisma.casePlan.create({
    data: {
      appointment_id: app1.id,
      patient_id: p1.id,
      doctor_id: doctors[0].id,
      procedure_plan: 'Bilateral Breast Augmentation with 350cc Silicone Implants',
      risk_factors: 'None active',
      readiness_status: CaseReadinessStatus.READY,
      ready_for_surgery: true,
    }
  });

  // Surgical Record linked to Theater A
  await prisma.surgicalProcedureRecord.create({
    data: {
      case_plan_id: case1.id,
      pre_op_diagnosis: 'Hypomastia',
      procedure_performed: 'Bilateral Breast Augmentation',
      urgency: SurgicalUrgency.ELECTIVE,
      theater_id: theaterMajor.id, // Linked to real theater
      anesthesia_type: AnesthesiaType.GENERAL,
      wheels_out: new Date(new Date().setDate(new Date().getDate() - 14)), // 2 weeks ago
    }
  });


  // Patient 2: Rhoda (Pre-op Planning)
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

  // Upcoming Surgery (Scheduled)
  const app2 = await prisma.appointment.create({
    data: {
      patient_id: p2.id,
      doctor_id: doctors[1].id,
      appointment_date: new Date(new Date().setDate(new Date().getDate() + 3)), // In 3 days
      time: '09:00',
      status: AppointmentStatus.SCHEDULED,
      type: 'Surgery',
      reason: 'Liposuction 360',
    }
  });

  // Case Plan (Draft)
  await prisma.casePlan.create({
    data: {
      appointment_id: app2.id,
      patient_id: p2.id,
      doctor_id: doctors[1].id,
      procedure_plan: 'Liposuction 360 (Abdomen, Flanks, Back)',
      risk_factors: 'BMI 28',
      readiness_status: CaseReadinessStatus.PENDING_LABS, // Not ready yet
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

  console.log('✅ Operational Data Seeded Successfully');
  console.log('   - 1 Clinic');
  console.log('   - 3 Theaters');
  console.log('   - 1 Admin, 3 Doctors, 2 Nurses, 1 Frontdesk');
  console.log('   - 3 Consent Templates');
  console.log('   - 2 Patients with Case Plans');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
