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
    // Test Doctor with extended hours (6am-11pm) - FOR WORKFLOW TESTING AT ANY TIME
    { name: 'Dr. Test Workflow', email: 'test@nairobisculpt.com', spec: 'General Testing', color: '#9333EA', extendedHours: true },
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

    // Schedule Setup (New Schema)
    // Extended hours doctor: 6am-11pm, 7 days a week (for testing at any time)
    // Regular doctors: Mon-Fri 9-5
    const isExtendedHours = (doc as any).extendedHours === true;
    
    // 1. Create Template
    const template = await prisma.availabilityTemplate.create({
      data: {
        doctor_id: doctorProfile.id,
        name: isExtendedHours ? 'Extended Testing' : 'Standard',
        is_active: true
      }
    });

    // 2. Create Slots
    const daysMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    const slotsData = [];
    
    if (isExtendedHours) {
      // Extended hours: 6am-11pm, ALL days (for workflow testing at any time)
      for (const day of ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
        slotsData.push({
          template_id: template.id,
          day_of_week: daysMap[day],
          start_time: '06:00',
          end_time: '23:00',
          slot_type: 'CLINIC'
        });
      }
    } else {
      // Standard hours: Mon-Fri 9-5
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      slotsData.push({
        template_id: template.id,
        day_of_week: daysMap[day],
        start_time: '09:00',
        end_time: '17:00',
        slot_type: 'CLINIC'
      });
      }
    }

    await prisma.availabilitySlot.createMany({
      data: slotsData
    });

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

  // ============================================================================
  // 6. WORKFLOW TEST DATA - DYNAMIC CURRENT-TIME APPOINTMENTS
  // ============================================================================
  console.log('🧪 Seeding Workflow Test Appointments (Current Time)...');

  // Use the test doctor (extended hours) for workflow testing
  const testDoctor = doctors.find(d => d.email === 'test@nairobisculpt.com') || doctors[0];

  // Helper to get time string in HH:mm format
  const formatTime = (date: Date) => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // --- Patient for Check-in Testing: "Ready Rita" ---
  // This appointment is SCHEDULED for NOW, ready to be checked in
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
  const patientRita = await prisma.patient.create({
    data: {
      user_id: userRita.id, 
      file_number: 'WORKFLOW001', 
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

  // Appointment scheduled for current time (ready for check-in)
  const nowTime = new Date();
  await prisma.appointment.create({
    data: {
      patient_id: patientRita.id, 
      doctor_id: testDoctor.id, 
      appointment_date: new Date(nowTime.setHours(0, 0, 0, 0)), // Today
      time: formatTime(new Date()), // Current time
      status: AppointmentStatus.SCHEDULED, 
      type: 'Consultation', 
      reason: 'Workflow Test - Ready for Check-in',
      status_changed_by: frontdeskUser.id,
    }
  });

  // --- Patient for Consultation Flow: "Consult Carl" ---
  // This appointment is ALREADY CHECKED IN, ready for doctor to start consultation
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
  const patientCarl = await prisma.patient.create({
    data: {
      user_id: userCarl.id, 
      file_number: 'WORKFLOW002', 
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

  // Appointment already checked in (ready for consultation)
  const checkinTime = new Date();
  checkinTime.setMinutes(checkinTime.getMinutes() - 15); // Checked in 15 mins ago
  await prisma.appointment.create({
    data: {
      patient_id: patientCarl.id, 
      doctor_id: testDoctor.id, 
      appointment_date: new Date(new Date().setHours(0, 0, 0, 0)), // Today
      time: formatTime(checkinTime), // 15 mins ago
      status: AppointmentStatus.CHECKED_IN, 
      type: 'Consultation', 
      reason: 'Workflow Test - Ready for Consultation',
      checked_in_at: checkinTime,
      checked_in_by: frontdeskUser.id,
      status_changed_by: frontdeskUser.id,
    }
  });

  // --- Patient for Full Booking Flow: "Fresh Fiona" ---
  // This patient has NO appointment - for testing the full booking → check-in → consultation flow
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
      file_number: 'WORKFLOW003', 
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

  // --- Patient for Upcoming Test: "Upcoming Uma" ---
  // Appointment scheduled for 30 minutes from now
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
  const patientUma = await prisma.patient.create({
    data: {
      user_id: userUma.id, 
      file_number: 'WORKFLOW004', 
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

  const upcomingTime = new Date();
  upcomingTime.setMinutes(upcomingTime.getMinutes() + 30); // 30 mins from now
  await prisma.appointment.create({
    data: {
      patient_id: patientUma.id, 
      doctor_id: testDoctor.id, 
      appointment_date: new Date(new Date().setHours(0, 0, 0, 0)), // Today
      time: formatTime(upcomingTime), // 30 mins from now
      status: AppointmentStatus.SCHEDULED, 
      type: 'Follow-up', 
      reason: 'Workflow Test - Upcoming Appointment',
      status_changed_by: frontdeskUser.id,
    }
  });

  console.log('✅ Workflow Test Appointments Created:');
  console.log('   - Rita CheckIn: SCHEDULED now (ready for check-in)');
  console.log('   - Carl Consult: CHECKED_IN (ready for consultation)');
  console.log('   - Fiona Fresh: No appointment (for full booking flow test)');
  console.log('   - Uma Upcoming: SCHEDULED in 30 mins');
  console.log(`   - Test Doctor: ${testDoctor.name} (6am-11pm, 7 days)`);


  // ============================================================================
  // 7. COMPREHENSIVE WORKFLOW DATA (Enhanced Scenarios)
  // ============================================================================
  console.log('🧪 Seeding Additional Workflow Scenarios...');

  const mainDoctor = doctors[0]; // Dr. Mukami

  // --- Scenario A: Pending Request (New Patient) ---
  const userA = await prisma.user.create({
    data: { id: uuid(), email: 'alice.pending@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Alice', last_name: 'Pending' }
  });
  const patientA = await prisma.patient.create({
    data: {
      user_id: userA.id, file_number: 'TEST003', first_name: 'Alice', last_name: 'Pending', email: 'alice.pending@example.com', phone: '+254711000001',
      date_of_birth: new Date('1995-01-01'), gender: Gender.FEMALE, address: 'Nairobi', emergency_contact_name: 'Mom', emergency_contact_number: '0700000000', relation: 'Mother',
      marital_status: 'Single', // Added required field
    }
  });
  // Pending Appointment
  await prisma.appointment.create({
    data: {
      patient_id: patientA.id, doctor_id: mainDoctor.id, appointment_date: new Date(new Date().setDate(new Date().getDate() + 1)), time: '10:00',
      status: AppointmentStatus.PENDING, type: 'Consultation', reason: 'Consultation Request',
      status_changed_by: userA.id, // Self-booked
    }
  });

  // --- Scenario B: Ready for Consult (Checked In) ---
  const userB = await prisma.user.create({
    data: { id: uuid(), email: 'bob.ready@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Bob', last_name: 'Ready' }
  });
  const patientB = await prisma.patient.create({
    data: {
      user_id: userB.id, file_number: 'TEST004', first_name: 'Bob', last_name: 'Ready', email: 'bob.ready@example.com', phone: '+254711000002',
      date_of_birth: new Date('1980-06-15'), gender: Gender.MALE, address: 'Nairobi', emergency_contact_name: 'Wife', emergency_contact_number: '0700000000', relation: 'Spouse',
      marital_status: 'Married', // Added required field
    }
  });
  // Scheduled & Checked In Today
  await prisma.appointment.create({
    data: {
      patient_id: patientB.id, doctor_id: mainDoctor.id, appointment_date: new Date(), time: '09:00',
      status: AppointmentStatus.SCHEDULED, type: 'Consultation', reason: 'Follow-up Check',
      checked_in_at: new Date(new Date().setHours(8, 55)), checked_in_by: frontdeskUser.id,
      status_changed_by: frontdeskUser.id, // Booked by Frontdesk
    }
  });

  // --- Scenario C: In Progress Consult ---
  const userC = await prisma.user.create({
    data: { id: uuid(), email: 'charlie.inprogress@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Charlie', last_name: 'Progress' }
  });
  const patientC = await prisma.patient.create({
    data: {
      user_id: userC.id, file_number: 'TEST005', first_name: 'Charlie', last_name: 'Progress', email: 'charlie.inprogress@example.com', phone: '+254711000003',
      date_of_birth: new Date('1992-03-10'), gender: Gender.MALE, address: 'Nairobi', emergency_contact_name: 'Dad', emergency_contact_number: '0700000000', relation: 'Father',
      marital_status: 'Single', // Added required field
    }
  });
  // Appointment
  const appC = await prisma.appointment.create({
    data: {
      patient_id: patientC.id, doctor_id: mainDoctor.id, appointment_date: new Date(), time: '09:30',
      status: AppointmentStatus.SCHEDULED, type: 'Consultation', reason: 'Skin Consultation',
      checked_in_at: new Date(new Date().setHours(9, 15)), checked_in_by: frontdeskUser.id,
      status_changed_by: frontdeskUser.id,
    }
  });
  // Active Consultation
  await prisma.consultation.create({
    data: {
      appointment_id: appC.id, doctor_id: mainDoctor.id, user_id: mainDoctor.user_id,
      started_at: new Date(new Date().setHours(9, 35)),
      // No completed_at means it is in progress
    }
  });

  // --- Scenario D: Post-Consult (Needs Case Plan) ---
  const userD = await prisma.user.create({
    data: { id: uuid(), email: 'diana.post@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Diana', last_name: 'Post' }
  });
  const patientD = await prisma.patient.create({
    data: {
      user_id: userD.id, file_number: 'TEST006', first_name: 'Diana', last_name: 'Post', email: 'diana.post@example.com', phone: '+254711000004',
      date_of_birth: new Date('1988-11-22'), gender: Gender.FEMALE, address: 'Nairobi', emergency_contact_name: 'Ex', emergency_contact_number: '0700000000', relation: 'Friend',
      marital_status: 'Divorced', // Added required field
    }
  });
  const appD = await prisma.appointment.create({
    data: {
      patient_id: patientD.id, doctor_id: mainDoctor.id, appointment_date: new Date(new Date().setDate(new Date().getDate() - 1)), time: '14:00', // Yesterday
      status: AppointmentStatus.COMPLETED, type: 'Consultation', reason: 'Rhinoplasty Inquiry',
      checked_in_at: new Date(new Date().setDate(new Date().getDate() - 1)),
      status_changed_by: frontdeskUser.id,
    }
  });
  // Completed Consultation
  await prisma.consultation.create({
    data: {
      appointment_id: appD.id, doctor_id: mainDoctor.id, user_id: mainDoctor.user_id,
      started_at: new Date(new Date().setDate(new Date().getDate() - 1)),
      completed_at: new Date(new Date().setDate(new Date().getDate() - 1)),
      duration_minutes: 45,
      doctor_notes: 'Patient desires aesthetic rhinoplasty. dorsal hump reduction.',
      outcome_type: 'PROCEDURE_RECOMMENDED',
    }
  });

  // --- Scenario E: Complex History (Returning) ---
  const userE = await prisma.user.create({
    data: { id: uuid(), email: 'eve.history@example.com', role: Role.PATIENT, password_hash: await hashPassword('password123'), first_name: 'Eve', last_name: 'History' }
  });
  const patientE = await prisma.patient.create({
    data: {
      user_id: userE.id, file_number: 'TEST007', first_name: 'Eve', last_name: 'History', email: 'eve.history@example.com', phone: '+254711000005',
      date_of_birth: new Date('1975-08-30'), gender: Gender.FEMALE, address: 'Nairobi', emergency_contact_name: 'Son', emergency_contact_number: '0700000000', relation: 'Son',
      allergies: 'Penicillin', medical_conditions: 'Hypertension', medical_history: 'C-Section (2005)',
      marital_status: 'Widowed', // Added required field
    }
  });
  // Past Appointment 1
  const appE1 = await prisma.appointment.create({
    data: {
      patient_id: patientE.id, doctor_id: mainDoctor.id, appointment_date: new Date(new Date().setMonth(new Date().getMonth() - 6)), time: '11:00',
      status: AppointmentStatus.COMPLETED, type: 'Consultation', reason: 'Initial Consultant',
    }
  });

  // Create Medical Record first (Required for Diagnosis)
  const medRecordE1 = await prisma.medicalRecord.create({
    data: {
      patient_id: patientE.id,
      doctor_id: mainDoctor.id,
      appointment_id: appE1.id,
      notes: 'Initial assessment for skin aging.',
    }
  });

  await prisma.diagnosis.create({
    data: {
      patient_id: patientE.id,
      doctor_id: mainDoctor.id,
      medical_record_id: medRecordE1.id,
      diagnosis: 'Photoaging (Dermatoheliosis)',
      symptoms: 'Wrinkles, Loss of Elasticity',
      notes: 'Visible signs of photoaging, Fitzpatrick Type III',
    }
  });
  // Past Appointment 2
  await prisma.appointment.create({
    data: {
      patient_id: patientE.id, doctor_id: mainDoctor.id, appointment_date: new Date(new Date().setMonth(new Date().getMonth() - 3)), time: '11:00',
      status: AppointmentStatus.COMPLETED, type: 'Procedure', reason: 'Botox Treatment',
    }
  });

  console.log('✅ Comprehensive Scenarios Seeded');

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
