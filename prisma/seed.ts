/**
 * Comprehensive Database Seed Script
 * 
 * Seeds the Nairobi Sculpt Surgical Aesthetic Clinic database with:
 * - Users (Admin, Doctors, Nurses, Frontdesk)
 * - Patients with medical history
 * - Appointments with realistic schedules
 * - Pre/Post-op workflows
 * - Consultations
 * - Audit logs
 * - Notifications
 * 
 * Run with: npm run db:seed
 */

import { PrismaClient, Role, Status, AppointmentStatus, Gender, PaymentMethod, PaymentStatus, CareNoteType, NotificationType, NotificationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper function to generate random color
function generateRandomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Helper function to generate UUID
function uuid(): string {
  return crypto.randomUUID();
}

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Helper function to get random date in range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to get random time slot
function randomTimeSlot(): string {
  const hours = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
  const minutes = Math.random() < 0.5 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (in reverse order of dependencies)
  console.log('🧹 Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.patientBill.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.vitalSign.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.careNote.deleteMany();
  await prisma.nurseAssignment.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.workingDay.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleared existing data\n');

  // ============================================================================
  // 1. CREATE USERS (Admin, Doctors, Nurses, Frontdesk)
  // ============================================================================
  console.log('👥 Creating users...');

  // Admin User
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
      phone: '+254700000001',
    },
  });
  console.log(`  ✓ Created admin: ${adminUser.email}`);

  // Doctors (5 surgeons from Nairobi Sculpt - Official Profiles)
  const doctorData = [
    {
      first_name: 'Mukami',
      last_name: 'Gathariki',
      title: 'Dr.',
      name: 'Dr. Mukami Gathariki',
      email: 'mukami.gathariki@nairobisculpt.com',
      specialization: 'Plastic, Reconstructive & Aesthetic Surgery',
      license: 'KMPDB-2020-001',
      phone: '+254700000010',
      bio: 'Highly accomplished Board Certified Plastic, Reconstructive, and Aesthetic Surgeon at Nairobi Sculpt Aesthetic Centre, known for expertise in cosmetic and reconstructive procedures, patient-centered care, and contributions to medical literature.',
      education: 'Board Certified in Plastic, Reconstructive, and Aesthetic Surgery',
      focus_areas: 'Cosmetic surgery, reconstructive procedures, wound care, patient-centered care',
      professional_affiliations: 'KSPRAS (Kenya Society of Plastic, Reconstructive & Aesthetic Surgeons), Kenya Association Of Women Surgeons, COSECSA, SHARE Programme',
      profile_image: '/images/doctors/dr-mukami-gathariki.jpg',
      clinic_location: 'Nairobi Sculpt Aesthetic Centre, Nairobi, Kenya',
    },
    {
      first_name: 'Ken',
      last_name: 'Aluora',
      title: 'Dr.',
      name: 'Dr. Ken Aluora',
      email: 'ken.aluora@nairobisculpt.com',
      specialization: 'Plastic & Reconstructive Surgery',
      license: 'KMPDB-2020-002',
      phone: '+254700000011',
      bio: 'Experienced plastic and reconstructive surgeon specializing in aesthetic and reconstructive procedures.',
      education: 'Medical degree in Plastic & Reconstructive Surgery',
      focus_areas: 'Aesthetic surgery, reconstructive procedures',
      professional_affiliations: 'KSPRAS',
      profile_image: '/images/doctors/dr-ken-aluora.jpg',
      clinic_location: 'Nairobi Sculpt Aesthetic Centre, Nairobi, Kenya',
    },
    {
      first_name: 'John Paul',
      last_name: 'Ogalo',
      title: 'Dr.',
      name: 'Dr. John Paul Ogalo',
      email: 'johnpaul.ogalo@nairobisculpt.com',
      specialization: 'Plastic & Reconstructive Surgery',
      license: 'KMPDB-2020-003',
      phone: '+254700000012',
      bio: 'Dedicated plastic and reconstructive surgeon with expertise in cosmetic and reconstructive surgery.',
      education: 'Medical degree in Plastic & Reconstructive Surgery',
      focus_areas: 'Cosmetic surgery, reconstructive procedures',
      professional_affiliations: 'KSPRAS',
      profile_image: '/images/doctors/dr-john-paul-ogalo.jpg',
      clinic_location: 'Nairobi Sculpt Aesthetic Centre, Nairobi, Kenya',
    },
    {
      first_name: 'Angela',
      last_name: 'Muoki',
      title: 'Dr.',
      name: 'Dr. Angela Muoki',
      email: 'angela.muoki@nairobisculpt.com',
      specialization: 'Plastic, Reconstructive & Aesthetic Surgery',
      license: 'KMPDB-2020-004',
      phone: '+254700000013',
      bio: 'Consultant Plastic, Reconstructive & Aesthetic Surgeon and Head of Department at Defence Forces Memorial Hospital. Expertise spans breast reduction surgery, pediatric plastic surgery, burn care, scar & wound management, and clitoral restoration.',
      education: 'Medical degree in Plastic, Reconstructive & Aesthetic Surgery. Fellowships: BFIRST and SHARE (2023–2024)',
      focus_areas: 'Breast reduction surgery, pediatric plastic surgery, burn care, scar & wound management, clitoral restoration',
      professional_affiliations: 'BFIRST, SHARE, KSPRAS',
      profile_image: '/images/doctors/dr-angela-muoki.jpg',
      clinic_location: 'Nairobi Sculpt Aesthetic Centre, Nairobi, Kenya',
    },
    {
      first_name: 'Dorsi',
      last_name: 'Jowi',
      title: 'Dr.',
      name: 'Dr. Dorsi Jowi',
      email: 'dorsi.jowi@nairobisculpt.com',
      specialization: 'Plastic Surgery - Hand Surgery Sub-specialization',
      license: 'KMPDB-2020-005',
      phone: '+254700000014',
      bio: 'Consultant Plastic Surgeon with sub-specialization in hand surgery. Based in Nairobi with fellowship training from Ganga Hospital, India. Became a consultant in private practice in October 2019.',
      education: 'Medical degree in Plastic Surgery. Fellowship in Hand Surgery from Ganga Hospital, India',
      focus_areas: 'Hand surgery (trauma, congenital, nerve, wrist, brachial plexus), plastic surgery',
      professional_affiliations: 'KSPRAS',
      profile_image: '/images/doctors/dr-dorsi-jowi.jpg',
      clinic_location: 'Nairobi Sculpt Aesthetic Centre, Nairobi, Kenya',
    },
  ];

  const doctors = [];
  for (const docData of doctorData) {
    const doctorPassword = await hashPassword('doctor123');
    const doctorUser = await prisma.user.create({
      data: {
        id: uuid(),
        email: docData.email,
        password_hash: doctorPassword,
        role: Role.DOCTOR,
        status: Status.ACTIVE,
        first_name: docData.first_name,
        last_name: docData.last_name,
        phone: docData.phone,
      },
    });

    const doctor = await prisma.doctor.create({
      data: {
        id: uuid(),
        user_id: doctorUser.id,
        email: docData.email,
        first_name: docData.first_name,
        last_name: docData.last_name,
        title: docData.title,
        name: docData.name,
        specialization: docData.specialization,
        license_number: docData.license,
        phone: docData.phone,
        address: 'Nairobi, Kenya',
        clinic_location: docData.clinic_location,
        department: 'Surgery',
        profile_image: docData.profile_image,
        availability_status: 'AVAILABLE',
        type: 'FULL',
        bio: docData.bio,
        education: docData.education,
        focus_areas: docData.focus_areas,
        professional_affiliations: docData.professional_affiliations,
        colorCode: generateRandomColor(),
        // Set existing seed doctors to ACTIVE (they're pre-seeded and functional)
        // In production, new doctors will start as INVITED and must complete onboarding
        onboarding_status: 'ACTIVE',
        activated_at: new Date(),
        profile_completed_at: new Date(),
      },
    });

    // Create working days for each doctor (Monday-Friday, 9 AM - 5 PM)
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const day of workingDays) {
      await prisma.workingDay.create({
        data: {
          doctor_id: doctor.id,
          day,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
        },
      });
    }

    doctors.push(doctor);
    console.log(`  ✓ Created doctor: ${doctor.name}`);
  }

  // Nurses (3 nurses)
  const nurseData = [
    { name: 'Jane Wambui', email: 'jane.wambui@nairobisculpt.com', phone: '+254700000020' },
    { name: 'Lucy Akinyi', email: 'lucy.akinyi@nairobisculpt.com', phone: '+254700000021' },
    { name: 'Esther Muthoni', email: 'esther.muthoni@nairobisculpt.com', phone: '+254700000022' },
  ];

  const nurses = [];
  for (const nurseDataItem of nurseData) {
    const nursePassword = await hashPassword('nurse123');
    const nurseUser = await prisma.user.create({
      data: {
        id: uuid(),
        email: nurseDataItem.email,
        password_hash: nursePassword,
        role: Role.NURSE,
        status: Status.ACTIVE,
        first_name: nurseDataItem.name.split(' ')[0],
        last_name: nurseDataItem.name.split(' ')[1] || '',
        phone: nurseDataItem.phone,
      },
    });
    nurses.push(nurseUser);
    console.log(`  ✓ Created nurse: ${nurseUser.first_name} ${nurseUser.last_name}`);
  }

  // Frontdesk Staff (2 staff)
  const frontdeskData = [
    { name: 'David Omondi', email: 'david.omondi@nairobisculpt.com', phone: '+254700000030' },
    { name: 'Susan Chebet', email: 'susan.chebet@nairobisculpt.com', phone: '+254700000031' },
  ];

  const frontdeskStaff = [];
  for (const fdData of frontdeskData) {
    const fdPassword = await hashPassword('frontdesk123');
    const fdUser = await prisma.user.create({
      data: {
        id: uuid(),
        email: fdData.email,
        password_hash: fdPassword,
        role: Role.FRONTDESK,
        status: Status.ACTIVE,
        first_name: fdData.name.split(' ')[0],
        last_name: fdData.name.split(' ')[1] || '',
        phone: fdData.phone,
      },
    });
    frontdeskStaff.push(fdUser);
    console.log(`  ✓ Created frontdesk: ${fdUser.first_name} ${fdUser.last_name}`);
  }

  console.log(`✅ Created ${1 + doctors.length + nurses.length + frontdeskStaff.length} users\n`);

  // ============================================================================
  // 2. CREATE PATIENTS
  // ============================================================================
  console.log('🏥 Creating patients...');

  const patientData = [
    {
      firstName: 'Amina',
      lastName: 'Hassan',
      email: 'amina.hassan@example.com',
      phone: '+254712345678',
      dob: new Date('1990-05-15'),
      gender: Gender.FEMALE,
      address: 'Westlands, Nairobi',
      maritalStatus: 'Married',
      emergencyContact: { name: 'Hassan Ali', number: '+254712345679', relation: 'Husband' },
      medicalHistory: 'Previous rhinoplasty in 2020',
      allergies: 'Penicillin',
      bloodGroup: 'O+',
    },
    {
      firstName: 'Patricia',
      lastName: 'Mwangi',
      email: 'patricia.mwangi@example.com',
      phone: '+254723456789',
      dob: new Date('1985-08-22'),
      gender: Gender.FEMALE,
      address: 'Karen, Nairobi',
      maritalStatus: 'Single',
      emergencyContact: { name: 'John Mwangi', number: '+254723456790', relation: 'Brother' },
      medicalHistory: 'Hypertension, controlled with medication',
      allergies: 'None',
      bloodGroup: 'A+',
    },
    {
      firstName: 'Grace',
      lastName: 'Ochieng',
      email: 'grace.ochieng@example.com',
      phone: '+254734567890',
      dob: new Date('1992-11-10'),
      gender: Gender.FEMALE,
      address: 'Kilimani, Nairobi',
      maritalStatus: 'Married',
      emergencyContact: { name: 'Michael Ochieng', number: '+254734567891', relation: 'Husband' },
      medicalHistory: 'None',
      allergies: 'Latex',
      bloodGroup: 'B+',
    },
    {
      firstName: 'Faith',
      lastName: 'Njoroge',
      email: 'faith.njoroge@example.com',
      phone: '+254745678901',
      dob: new Date('1988-03-25'),
      gender: Gender.FEMALE,
      address: 'Lavington, Nairobi',
      maritalStatus: 'Divorced',
      emergencyContact: { name: 'Sarah Njoroge', number: '+254745678902', relation: 'Sister' },
      medicalHistory: 'Diabetes Type 2, well controlled',
      allergies: 'None',
      bloodGroup: 'AB+',
    },
    {
      firstName: 'Mercy',
      lastName: 'Kipchoge',
      email: 'mercy.kipchoge@example.com',
      phone: '+254756789012',
      dob: new Date('1995-07-18'),
      gender: Gender.FEMALE,
      address: 'Runda, Nairobi',
      maritalStatus: 'Single',
      emergencyContact: { name: 'David Kipchoge', number: '+254756789013', relation: 'Father' },
      medicalHistory: 'None',
      allergies: 'None',
      bloodGroup: 'O-',
    },
  ];

  const patients = [];
  for (const pData of patientData) {
    const patient = await prisma.patient.create({
      data: {
        id: uuid(),
        first_name: pData.firstName,
        last_name: pData.lastName,
        email: pData.email,
        phone: pData.phone,
        date_of_birth: pData.dob,
        gender: pData.gender,
        address: pData.address,
        marital_status: pData.maritalStatus,
        emergency_contact_name: pData.emergencyContact.name,
        emergency_contact_number: pData.emergencyContact.number,
        relation: pData.emergencyContact.relation,
        medical_history: pData.medicalHistory,
        allergies: pData.allergies,
        blood_group: pData.bloodGroup,
        privacy_consent: true,
        service_consent: true,
        medical_consent: true,
        approved: true,
        approved_by: adminUser.id,
        approved_at: new Date(),
        colorCode: generateRandomColor(),
      },
    });
    patients.push(patient);
    console.log(`  ✓ Created patient: ${patient.first_name} ${patient.last_name}`);
  }

  console.log(`✅ Created ${patients.length} patients\n`);

  // ============================================================================
  // 3. CREATE APPOINTMENTS
  // ============================================================================
  console.log('📅 Creating appointments...');

  const appointmentTypes = [
    'Initial Consultation',
    'Follow-up Consultation',
    'Pre-operative Assessment',
    'Post-operative Follow-up',
    'Procedure Consultation',
  ];

  const appointments = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create appointments for the next 30 days
  for (let i = 0; i < 20; i++) {
    const appointmentDate = new Date(today);
    appointmentDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
    const time = randomTimeSlot();
    const patient = patients[Math.floor(Math.random() * patients.length)];
    const doctor = doctors[Math.floor(Math.random() * doctors.length)];
    const status =
      appointmentDate < today
        ? AppointmentStatus.COMPLETED
        : appointmentDate.toDateString() === today.toDateString()
          ? AppointmentStatus.SCHEDULED
          : AppointmentStatus.PENDING;

    const appointment = await prisma.appointment.create({
      data: {
        patient_id: patient.id,
        doctor_id: doctor.id,
        appointment_date: appointmentDate,
        time,
        status,
        type: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
        note: i % 3 === 0 ? 'Patient requested specific time slot' : null,
        checked_in_at: status === AppointmentStatus.SCHEDULED ? new Date() : null,
        checked_in_by: status === AppointmentStatus.SCHEDULED ? frontdeskStaff[0].id : null,
      },
    });
    appointments.push(appointment);
  }

  console.log(`✅ Created ${appointments.length} appointments\n`);

  // ============================================================================
  // 4. CREATE CONSULTATIONS
  // ============================================================================
  console.log('💬 Creating consultations...');

  const completedAppointments = appointments.filter((apt) => apt.status === AppointmentStatus.COMPLETED);
  for (const appointment of completedAppointments.slice(0, 5)) {
    const doctor = doctors.find((d) => d.id === appointment.doctor_id);
    if (!doctor) continue;

    const startedAt = new Date(appointment.appointment_date);
    startedAt.setHours(parseInt(appointment.time.split(':')[0]), parseInt(appointment.time.split(':')[1]), 0, 0);
    const completedAt = new Date(startedAt);
    completedAt.setMinutes(completedAt.getMinutes() + 30 + Math.floor(Math.random() * 30));

    await prisma.consultation.create({
      data: {
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        user_id: doctor.user_id,
        started_at: startedAt,
        completed_at: completedAt,
        doctor_notes: 'Patient consultation completed. Discussed treatment options.',
        outcome: 'Treatment plan discussed. Patient scheduled for procedure.',
        follow_up_date: new Date(appointment.appointment_date.getTime() + 7 * 24 * 60 * 60 * 1000),
        follow_up_type: 'Follow-up Consultation',
        follow_up_notes: 'Monitor recovery progress',
      },
    });
  }

  console.log(`✅ Created ${completedAppointments.slice(0, 5).length} consultations\n`);

  // ============================================================================
  // 5. CREATE PRE/POST-OP WORKFLOWS
  // ============================================================================
  console.log('🏥 Creating pre/post-op workflows...');

  // Assign nurses to patients
  for (let i = 0; i < 3; i++) {
    const patient = patients[i];
    const nurse = nurses[Math.floor(Math.random() * nurses.length)];
    const appointment = appointments[i];

    await prisma.nurseAssignment.create({
      data: {
        patient_id: patient.id,
        nurse_user_id: nurse.id,
        appointment_id: appointment.id,
        assigned_by: adminUser.id,
        notes: 'Pre-operative care assignment',
      },
    });

    // Create pre-op care notes
    await prisma.careNote.create({
      data: {
        patient_id: patient.id,
        nurse_user_id: nurse.id,
        appointment_id: appointment.id,
        note_type: CareNoteType.PRE_OP,
        note: 'Pre-operative assessment completed. Patient prepared for procedure. Vitals stable.',
      },
    });
  }

  // Create post-op care notes for completed appointments
  for (const appointment of completedAppointments.slice(0, 3)) {
    const patient = patients.find((p) => p.id === appointment.patient_id);
    if (!patient) continue;
    const nurse = nurses[Math.floor(Math.random() * nurses.length)];

    await prisma.careNote.create({
      data: {
        patient_id: patient.id,
        nurse_user_id: nurse.id,
        appointment_id: appointment.id,
        note_type: CareNoteType.POST_OP,
        note: 'Post-operative care provided. Patient recovering well. Wound site clean and healing properly.',
      },
    });
  }

  console.log('✅ Created pre/post-op workflows\n');

  // ============================================================================
  // 6. CREATE VITAL SIGNS
  // ============================================================================
  console.log('📊 Creating vital signs records...');

  for (const appointment of appointments.slice(0, 10)) {
    const patient = patients.find((p) => p.id === appointment.patient_id);
    if (!patient) continue;

    await prisma.vitalSign.create({
      data: {
        patient_id: patient.id,
        appointment_id: appointment.id,
        body_temperature: 36.5 + Math.random() * 0.5,
        systolic: 110 + Math.floor(Math.random() * 20),
        diastolic: 70 + Math.floor(Math.random() * 15),
        heart_rate: `${70 + Math.floor(Math.random() * 20)}-${80 + Math.floor(Math.random() * 20)}`,
        respiratory_rate: 16 + Math.floor(Math.random() * 4),
        oxygen_saturation: 96 + Math.floor(Math.random() * 3),
        weight: 55 + Math.random() * 20,
        height: 155 + Math.random() * 15,
        recorded_by: nurses[Math.floor(Math.random() * nurses.length)].id,
      },
    });
  }

  console.log('✅ Created vital signs records\n');

  // ============================================================================
  // 7. CREATE SERVICES
  // ============================================================================
  console.log('💼 Creating services...');

  const services = [
    { service_name: 'Initial Consultation', description: 'First-time patient consultation', price: 5000, category: 'Consultation' },
    { service_name: 'Follow-up Consultation', description: 'Follow-up appointment', price: 3000, category: 'Consultation' },
    { service_name: 'Rhinoplasty', description: 'Nose reshaping procedure', price: 250000, category: 'Procedure' },
    { service_name: 'Breast Augmentation', description: 'Breast enhancement procedure', price: 350000, category: 'Procedure' },
    { service_name: 'Liposuction', description: 'Fat removal procedure', price: 200000, category: 'Procedure' },
    { service_name: 'Botox Injection', description: 'Botox treatment', price: 15000, category: 'Treatment' },
    { service_name: 'Blood Test', description: 'Complete blood count', price: 2000, category: 'Lab Test' },
    { service_name: 'X-Ray', description: 'Diagnostic imaging', price: 5000, category: 'Lab Test' },
  ];

  const createdServices = [];
  for (const serviceData of services) {
    const service = await prisma.service.create({
      data: serviceData,
    });
    createdServices.push(service);
  }

  console.log(`✅ Created ${createdServices.length} services\n`);

  // ============================================================================
  // 8. CREATE AUDIT LOGS
  // ============================================================================
  console.log('📝 Creating audit logs...');

  const auditActions = ['CREATE', 'UPDATE', 'VIEW', 'LOGIN', 'LOGOUT', 'APPROVE', 'ASSIGN'];
  const models = ['Patient', 'Appointment', 'User', 'Consultation', 'Payment'];

  for (let i = 0; i < 50; i++) {
    const user = [adminUser, ...doctors.map((d) => ({ id: d.user_id })), ...nurses, ...frontdeskStaff][
      Math.floor(Math.random() * (1 + doctors.length + nurses.length + frontdeskStaff.length))
    ];

    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        record_id: uuid(),
        action: auditActions[Math.floor(Math.random() * auditActions.length)],
        model: models[Math.floor(Math.random() * models.length)],
        details: `Sample audit log entry ${i + 1}`,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
  }

  console.log('✅ Created audit logs\n');

  // ============================================================================
  // 9. CREATE NOTIFICATIONS
  // ============================================================================
  console.log('🔔 Creating notifications...');

  const notificationMessages = [
    'Your appointment is scheduled for tomorrow at 10:00 AM',
    'Your consultation results are ready',
    'Reminder: Pre-operative assessment due',
    'Your payment has been received',
    'New appointment request requires approval',
  ];

  for (let i = 0; i < 20; i++) {
    const patient = patients[Math.floor(Math.random() * patients.length)];
    const patientUser = await prisma.user.findFirst({
      where: { email: patient.email },
    });

    if (patientUser) {
      await prisma.notification.create({
        data: {
          user_id: patientUser.id,
          sender_id: adminUser.id,
          type: NotificationType.EMAIL,
          status: Math.random() < 0.7 ? NotificationStatus.SENT : NotificationStatus.PENDING,
          subject: 'Appointment Reminder',
          message: notificationMessages[Math.floor(Math.random() * notificationMessages.length)],
          sent_at: Math.random() < 0.7 ? new Date() : null,
        },
      });
    }
  }

  console.log('✅ Created notifications\n');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Users: ${1 + doctors.length + nurses.length + frontdeskStaff.length}`);
  console.log(`  - Doctors: ${doctors.length}`);
  console.log(`  - Nurses: ${nurses.length}`);
  console.log(`  - Frontdesk: ${frontdeskStaff.length}`);
  console.log(`  - Patients: ${patients.length}`);
  console.log(`  - Appointments: ${appointments.length}`);
  console.log(`  - Services: ${createdServices.length}`);
  console.log('\n🔑 Default Passwords:');
  console.log('  - Admin: admin123');
  console.log('  - Doctor: doctor123');
  console.log('  - Nurse: nurse123');
  console.log('  - Frontdesk: frontdesk123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
