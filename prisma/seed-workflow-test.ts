/**
 * Workflow Test Seed Script
 * 
 * Seeds specific data for testing the following workflows:
 * 1. Frontdesk Check-In (pending appointments)
 * 2. Doctor Confirm/Reschedule/Cancel Appointment
 * 3. Consultation and Queue
 * 4. Complete Appointment with Billing
 * 5. Follow-up Consultation
 * 6. Pre-Operative Care Phase 1
 * 
 * Run with: npx tsx prisma/seed-workflow-test.ts
 */

import { PrismaClient, Role, Status, AppointmentStatus, Gender, PaymentStatus, CaseReadinessStatus, SurgicalCaseStatus, SurgicalUrgency, ConsentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function uuid(): string {
  return crypto.randomUUID();
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🧪 Starting Workflow Test Seed...\n');

  // Get existing staff
  const doctor = await prisma.doctor.findFirst({ where: { email: 'mukami@nairobisculpt.com' } });
  const doctor2 = await prisma.doctor.findFirst({ where: { email: 'ken@nairobisculpt.com' } });
  const frontdesk = await prisma.user.findFirst({ where: { role: Role.FRONTDESK } });
  const nurse = await prisma.user.findFirst({ where: { role: Role.NURSE } });

  if (!doctor || !doctor2 || !frontdesk || !nurse) {
    console.error('❌ Required staff not found. Run main seed first: npm run db:seed');
    return;
  }

  console.log(`Found staff: Dr. ${doctor.name}, Dr. ${doctor2.name}, Frontdesk, Nurse`);

  // Get today and tomorrow dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // ============================================================================
  // 1. FRONTDESK CHECK-IN WORKFLOW - Pending & Scheduled Appointments
  // ============================================================================
  console.log('\n📋 Creating Check-In Workflow Test Data...');

  // Patient for check-in test (SCHEDULED - ready to check in)
  const checkInUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'checkin.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'CheckIn',
      last_name: 'Test',
    }
  });
  const checkInPatient = await prisma.patient.create({
    data: {
      user_id: checkInUser.id,
      file_number: 'WF-CHECKIN-001',
      first_name: 'Sarah',
      last_name: 'Mwangi',
      email: 'checkin.test@example.com',
      phone: '+254700111001',
      date_of_birth: new Date('1992-03-15'),
      gender: Gender.FEMALE,
      address: 'Kilimani, Nairobi',
      marital_status: 'Single',
      emergency_contact_name: 'John Mwangi',
      emergency_contact_number: '+254700111002',
      relation: 'Brother',
    }
  });

  // Appointment 1: SCHEDULED today - ready for check-in
  await prisma.appointment.create({
    data: {
      patient_id: checkInPatient.id,
      doctor_id: doctor.id,
      appointment_date: today,
      time: '10:00',
      status: AppointmentStatus.SCHEDULED,
      type: 'Consultation',
      reason: 'Initial consultation for facial rejuvenation',
      note: 'New patient - first visit',
    }
  });

  // Appointment 2: SCHEDULED today - different time
  const checkInUser2 = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'checkin2.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'CheckIn2',
      last_name: 'Test',
    }
  });
  const checkInPatient2 = await prisma.patient.create({
    data: {
      user_id: checkInUser2.id,
      file_number: 'WF-CHECKIN-002',
      first_name: 'James',
      last_name: 'Odhiambo',
      email: 'checkin2.test@example.com',
      phone: '+254700111003',
      date_of_birth: new Date('1985-07-22'),
      gender: Gender.MALE,
      address: 'Westlands, Nairobi',
      marital_status: 'Married',
      emergency_contact_name: 'Grace Odhiambo',
      emergency_contact_number: '+254700111004',
      relation: 'Wife',
    }
  });

  await prisma.appointment.create({
    data: {
      patient_id: checkInPatient2.id,
      doctor_id: doctor.id,
      appointment_date: today,
      time: '11:00',
      status: AppointmentStatus.SCHEDULED,
      type: 'Consultation',
      reason: 'Follow-up consultation',
    }
  });

  console.log('✅ Created 2 SCHEDULED appointments for check-in testing');

  // ============================================================================
  // 2. DOCTOR CONFIRM/RESCHEDULE/CANCEL - Pending Confirmation
  // ============================================================================
  console.log('\n👨‍⚕️ Creating Doctor Confirmation Workflow Test Data...');

  // Patient needing doctor confirmation
  const confirmUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'confirm.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'Confirm',
      last_name: 'Test',
    }
  });
  const confirmPatient = await prisma.patient.create({
    data: {
      user_id: confirmUser.id,
      file_number: 'WF-CONFIRM-001',
      first_name: 'Angela',
      last_name: 'Wambui',
      email: 'confirm.test@example.com',
      phone: '+254700222001',
      date_of_birth: new Date('1988-11-05'),
      gender: Gender.FEMALE,
      address: 'Karen, Nairobi',
      marital_status: 'Married',
      emergency_contact_name: 'Peter Wambui',
      emergency_contact_number: '+254700222002',
      relation: 'Husband',
    }
  });

  // Appointment needing doctor confirmation (PENDING)
  await prisma.appointment.create({
    data: {
      patient_id: confirmPatient.id,
      doctor_id: doctor.id,
      appointment_date: tomorrow,
      time: '09:00',
      status: AppointmentStatus.PENDING,
      type: 'Consultation',
      reason: 'Breast augmentation consultation',
      note: 'Patient requested specific date',
    }
  });

  // Second patient for reschedule test
  const rescheduleUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'reschedule.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'Reschedule',
      last_name: 'Test',
    }
  });
  const reschedulePatient = await prisma.patient.create({
    data: {
      user_id: rescheduleUser.id,
      file_number: 'WF-RESCHEDULE-001',
      first_name: 'Michael',
      last_name: 'Kamau',
      email: 'reschedule.test@example.com',
      phone: '+254700222003',
      date_of_birth: new Date('1990-02-14'),
      gender: Gender.MALE,
      address: 'Lavington, Nairobi',
      marital_status: 'Single',
      emergency_contact_name: 'Mary Kamau',
      emergency_contact_number: '+254700222004',
      relation: 'Mother',
    }
  });

  // Appointment for reschedule test (PENDING)
  await prisma.appointment.create({
    data: {
      patient_id: reschedulePatient.id,
      doctor_id: doctor.id,
      appointment_date: tomorrow,
      time: '14:00',
      status: AppointmentStatus.PENDING,
      type: 'Consultation',
      reason: 'Rhinoplasty inquiry',
    }
  });

  // Third patient for cancel test
  const cancelUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'cancel.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'Cancel',
      last_name: 'Test',
    }
  });
  const cancelPatient = await prisma.patient.create({
    data: {
      user_id: cancelUser.id,
      file_number: 'WF-CANCEL-001',
      first_name: 'Lucy',
      last_name: 'Njeri',
      email: 'cancel.test@example.com',
      phone: '+254700222005',
      date_of_birth: new Date('1995-06-30'),
      gender: Gender.FEMALE,
      address: 'South B, Nairobi',
      marital_status: 'Single',
      emergency_contact_name: 'Susan Njeri',
      emergency_contact_number: '+254700222006',
      relation: 'Sister',
    }
  });

  await prisma.appointment.create({
    data: {
      patient_id: cancelPatient.id,
      doctor_id: doctor.id,
      appointment_date: dayAfterTomorrow,
      time: '10:00',
      status: AppointmentStatus.PENDING,
      type: 'Consultation',
      reason: 'Liposuction consultation',
    }
  });

  console.log('✅ Created 3 PENDING appointments for confirm/reschedule/cancel testing');

  // ============================================================================
  // 3. CONSULTATION QUEUE - Checked-in patients ready for consultation
  // ============================================================================
  console.log('\n🏥 Creating Consultation Queue Test Data...');

  // Patient 1: CHECKED_IN - waiting for consultation
  const queueUser1 = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'queue1.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'Queue1',
      last_name: 'Test',
    }
  });
  const queuePatient1 = await prisma.patient.create({
    data: {
      user_id: queueUser1.id,
      file_number: 'WF-QUEUE-001',
      first_name: 'Peter',
      last_name: 'Otieno',
      email: 'queue1.test@example.com',
      phone: '+254700333001',
      date_of_birth: new Date('1978-09-12'),
      gender: Gender.MALE,
      address: 'Parklands, Nairobi',
      marital_status: 'Married',
      emergency_contact_name: 'Jane Otieno',
      emergency_contact_number: '+254700333002',
      relation: 'Wife',
    }
  });

  await prisma.appointment.create({
    data: {
      patient_id: queuePatient1.id,
      doctor_id: doctor.id,
      appointment_date: today,
      time: '09:30',
      status: AppointmentStatus.CHECKED_IN,
      type: 'Consultation',
      reason: 'Hair transplant consultation',
      checked_in_at: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 15 * 60 * 1000), // 9:15 AM
      checked_in_by: frontdesk.id,
    }
  });

  // Patient 2: CHECKED_IN - second in queue
  const queueUser2 = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'queue2.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'Queue2',
      last_name: 'Test',
    }
  });
  const queuePatient2 = await prisma.patient.create({
    data: {
      user_id: queueUser2.id,
      file_number: 'WF-QUEUE-002',
      first_name: 'Grace',
      last_name: 'Wanjiku',
      email: 'queue2.test@example.com',
      phone: '+254700333003',
      date_of_birth: new Date('1982-04-25'),
      gender: Gender.FEMALE,
      address: 'Runda, Nairobi',
      marital_status: 'Divorced',
      emergency_contact_name: 'Tom Wanjiku',
      emergency_contact_number: '+254700333004',
      relation: 'Brother',
    }
  });

  await prisma.appointment.create({
    data: {
      patient_id: queuePatient2.id,
      doctor_id: doctor.id,
      appointment_date: today,
      time: '10:30',
      status: AppointmentStatus.CHECKED_IN,
      type: 'Consultation',
      reason: 'Tummy tuck consultation',
      checked_in_at: new Date(today.getTime() + 10 * 60 * 60 * 1000 + 20 * 60 * 1000), // 10:20 AM
      checked_in_by: frontdesk.id,
    }
  });

  // Patient 3: IN_CONSULTATION - currently being seen (for testing queue advancement)
  const queueUser3 = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'queue3.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'Queue3',
      last_name: 'Test',
    }
  });
  const queuePatient3 = await prisma.patient.create({
    data: {
      user_id: queueUser3.id,
      file_number: 'WF-QUEUE-003',
      first_name: 'David',
      last_name: 'Maina',
      email: 'queue3.test@example.com',
      phone: '+254700333005',
      date_of_birth: new Date('1975-12-01'),
      gender: Gender.MALE,
      address: 'Muthaiga, Nairobi',
      marital_status: 'Married',
      emergency_contact_name: 'Esther Maina',
      emergency_contact_number: '+254700333006',
      relation: 'Wife',
    }
  });

  const inConsultAppt = await prisma.appointment.create({
    data: {
      patient_id: queuePatient3.id,
      doctor_id: doctor.id,
      appointment_date: today,
      time: '09:00',
      status: AppointmentStatus.IN_CONSULTATION,
      type: 'Consultation',
      reason: 'Facelift consultation',
      checked_in_at: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 45 * 60 * 1000), // 8:45 AM
      checked_in_by: frontdesk.id,
      consultation_started_at: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 5 * 60 * 1000), // 9:05 AM
    }
  });

  // Create consultation record for the in-progress appointment
  await prisma.consultation.create({
    data: {
      appointment_id: inConsultAppt.id,
      doctor_id: doctor.id,
      user_id: doctor.user_id!,
      started_at: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 5 * 60 * 1000), // 9:05 AM
    }
  });

  console.log('✅ Created 3 appointments for consultation queue testing (2 CHECKED_IN, 1 IN_CONSULTATION)');

  // ============================================================================
  // 4. COMPLETE APPOINTMENT WITH BILLING - Ready for completion
  // ============================================================================
  console.log('\n💰 Creating Billing Workflow Test Data...');

  const billingUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'billing.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'Billing',
      last_name: 'Test',
    }
  });
  const billingPatient = await prisma.patient.create({
    data: {
      user_id: billingUser.id,
      file_number: 'WF-BILLING-001',
      first_name: 'Florence',
      last_name: 'Achieng',
      email: 'billing.test@example.com',
      phone: '+254700444001',
      date_of_birth: new Date('1987-08-18'),
      gender: Gender.FEMALE,
      address: 'Kileleshwa, Nairobi',
      marital_status: 'Single',
      emergency_contact_name: 'Mark Achieng',
      emergency_contact_number: '+254700444002',
      relation: 'Father',
    }
  });

  // Appointment IN_CONSULTATION ready for completion
  const billingAppt = await prisma.appointment.create({
    data: {
      patient_id: billingPatient.id,
      doctor_id: doctor.id,
      appointment_date: today,
      time: '08:30',
      status: AppointmentStatus.IN_CONSULTATION,
      type: 'Consultation',
      reason: 'BBL consultation - initial assessment',
      checked_in_at: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 15 * 60 * 1000),
      checked_in_by: frontdesk.id,
      consultation_started_at: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 35 * 60 * 1000),
    }
  });

  await prisma.consultation.create({
    data: {
      appointment_id: billingAppt.id,
      doctor_id: doctor.id,
      user_id: doctor.user_id!,
      started_at: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 35 * 60 * 1000),
      doctor_notes: 'Patient interested in BBL procedure. Good candidate. Discussed options and pricing.',
    }
  });

  console.log('✅ Created 1 IN_CONSULTATION appointment for billing/completion testing');

  // ============================================================================
  // 5. FOLLOW-UP CONSULTATION - Completed appointment needing follow-up
  // ============================================================================
  console.log('\n📅 Creating Follow-up Workflow Test Data...');

  const followUpUser = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'followup.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'FollowUp',
      last_name: 'Test',
    }
  });
  const followUpPatient = await prisma.patient.create({
    data: {
      user_id: followUpUser.id,
      file_number: 'WF-FOLLOWUP-001',
      first_name: 'Catherine',
      last_name: 'Wairimu',
      email: 'followup.test@example.com',
      phone: '+254700555001',
      date_of_birth: new Date('1983-01-20'),
      gender: Gender.FEMALE,
      address: 'Gigiri, Nairobi',
      marital_status: 'Married',
      emergency_contact_name: 'John Wairimu',
      emergency_contact_number: '+254700555002',
      relation: 'Husband',
    }
  });

  // Appointment that should result in follow-up scheduling
  const followUpAppt = await prisma.appointment.create({
    data: {
      patient_id: followUpPatient.id,
      doctor_id: doctor.id,
      appointment_date: today,
      time: '11:30',
      status: AppointmentStatus.IN_CONSULTATION,
      type: 'Consultation',
      reason: 'Breast reduction assessment',
      checked_in_at: new Date(today.getTime() + 11 * 60 * 60 * 1000 + 15 * 60 * 1000),
      checked_in_by: frontdesk.id,
      consultation_started_at: new Date(today.getTime() + 11 * 60 * 60 * 1000 + 35 * 60 * 1000),
    }
  });

  await prisma.consultation.create({
    data: {
      appointment_id: followUpAppt.id,
      doctor_id: doctor.id,
      user_id: doctor.user_id!,
      started_at: new Date(today.getTime() + 11 * 60 * 60 * 1000 + 35 * 60 * 1000),
      doctor_notes: 'Need additional lab work before proceeding. Schedule follow-up in 2 weeks.',
    }
  });

  console.log('✅ Created 1 IN_CONSULTATION appointment for follow-up testing');

  // ============================================================================
  // 6. PRE-OPERATIVE CARE PHASE 1 - Procedure recommended with patient YES
  // ============================================================================
  console.log('\n🏥 Creating Pre-Op Workflow Test Data...');

  // Patient 1: Completed consultation with PROCEDURE_RECOMMENDED and YES decision
  const preOpUser1 = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'preop1.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'PreOp1',
      last_name: 'Test',
    }
  });
  const preOpPatient1 = await prisma.patient.create({
    data: {
      user_id: preOpUser1.id,
      file_number: 'WF-PREOP-001',
      first_name: 'Joyce',
      last_name: 'Nyambura',
      email: 'preop1.test@example.com',
      phone: '+254700666001',
      date_of_birth: new Date('1986-05-10'),
      gender: Gender.FEMALE,
      address: 'Riverside, Nairobi',
      marital_status: 'Married',
      emergency_contact_name: 'Brian Nyambura',
      emergency_contact_number: '+254700666002',
      relation: 'Husband',
      allergies: 'None known',
      medical_conditions: 'None',
    }
  });

  // Yesterday's completed appointment that triggered surgery workflow
  const preOpAppt1 = await prisma.appointment.create({
    data: {
      patient_id: preOpPatient1.id,
      doctor_id: doctor.id,
      appointment_date: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Yesterday
      time: '14:00',
      status: AppointmentStatus.COMPLETED,
      type: 'Consultation',
      reason: 'Breast augmentation consultation',
      checked_in_at: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000 + 45 * 60 * 1000),
      checked_in_by: frontdesk.id,
      consultation_started_at: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      consultation_ended_at: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000 + 45 * 60 * 1000),
    }
  });

  const preOpConsult1 = await prisma.consultation.create({
    data: {
      appointment_id: preOpAppt1.id,
      doctor_id: doctor.id,
      user_id: doctor.user_id!,
      started_at: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      completed_at: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000 + 45 * 60 * 1000),
      duration_minutes: 45,
      outcome_type: 'PROCEDURE_RECOMMENDED',
      patient_decision: 'YES',
      doctor_notes: 'Patient is excellent candidate for breast augmentation. 350cc silicone implants recommended. Patient agreed to proceed.',
    }
  });

  // Create SurgicalCase for pre-op workflow
  const surgicalCase1 = await prisma.surgicalCase.create({
    data: {
      patient_id: preOpPatient1.id,
      primary_surgeon_id: doctor.id,
      consultation_id: preOpConsult1.id,
      urgency: SurgicalUrgency.ELECTIVE,
      status: SurgicalCaseStatus.DRAFT,
      diagnosis: 'Hypomastia - patient desires breast augmentation',
      procedure_name: 'Bilateral Breast Augmentation',
      created_by: doctor.user_id,
    }
  });

  // Create CasePlan linked to surgical case (NOT_STARTED - needs nurse attention)
  await prisma.casePlan.create({
    data: {
      appointment_id: preOpAppt1.id,
      surgical_case_id: surgicalCase1.id,
      patient_id: preOpPatient1.id,
      doctor_id: doctor.id,
      procedure_plan: 'Bilateral breast augmentation with 350cc round silicone implants, dual plane placement',
      readiness_status: CaseReadinessStatus.NOT_STARTED,
      ready_for_surgery: false,
    }
  });

  // Patient 2: Another surgical case - IN_PROGRESS readiness
  const preOpUser2 = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'preop2.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'PreOp2',
      last_name: 'Test',
    }
  });
  const preOpPatient2 = await prisma.patient.create({
    data: {
      user_id: preOpUser2.id,
      file_number: 'WF-PREOP-002',
      first_name: 'Margaret',
      last_name: 'Ochieng',
      email: 'preop2.test@example.com',
      phone: '+254700666003',
      date_of_birth: new Date('1979-11-28'),
      gender: Gender.FEMALE,
      address: 'Spring Valley, Nairobi',
      marital_status: 'Divorced',
      emergency_contact_name: 'Daniel Ochieng',
      emergency_contact_number: '+254700666004',
      relation: 'Son',
      allergies: 'Penicillin',
      medical_conditions: 'Mild hypertension - controlled with medication',
    }
  });

  const preOpAppt2 = await prisma.appointment.create({
    data: {
      patient_id: preOpPatient2.id,
      doctor_id: doctor.id,
      appointment_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      time: '10:00',
      status: AppointmentStatus.COMPLETED,
      type: 'Consultation',
      reason: 'Liposuction consultation',
    }
  });

  const preOpConsult2 = await prisma.consultation.create({
    data: {
      appointment_id: preOpAppt2.id,
      doctor_id: doctor.id,
      user_id: doctor.user_id!,
      started_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      completed_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 40 * 60 * 1000),
      duration_minutes: 40,
      outcome_type: 'PROCEDURE_RECOMMENDED',
      patient_decision: 'YES',
      doctor_notes: 'Liposuction 360 recommended. Patient has mild hypertension but well controlled. Medical clearance needed.',
    }
  });

  const surgicalCase2 = await prisma.surgicalCase.create({
    data: {
      patient_id: preOpPatient2.id,
      primary_surgeon_id: doctor.id,
      consultation_id: preOpConsult2.id,
      urgency: SurgicalUrgency.ELECTIVE,
      status: SurgicalCaseStatus.PLANNING,
      diagnosis: 'Localized adiposity - abdomen, flanks, back',
      procedure_name: 'Liposuction 360',
      created_by: doctor.user_id,
    }
  });

  // CasePlan with some progress
  const casePlan2 = await prisma.casePlan.create({
    data: {
      appointment_id: preOpAppt2.id,
      surgical_case_id: surgicalCase2.id,
      patient_id: preOpPatient2.id,
      doctor_id: doctor.id,
      procedure_plan: 'Liposuction 360 - abdomen, flanks, lower back. Tumescent technique.',
      risk_factors: 'Hypertension (controlled), Penicillin allergy',
      pre_op_notes: 'Patient completed intake form. Needs medical clearance from cardiologist.',
      readiness_status: CaseReadinessStatus.PENDING_LABS,
      ready_for_surgery: false,
    }
  });

  // Add some images to case plan
  await prisma.patientImage.create({
    data: {
      patient_id: preOpPatient2.id,
      case_plan_id: casePlan2.id,
      image_url: 'https://example.com/images/preop2-front.jpg',
      timepoint: 'PRE_OP',
      angle: 'FRONT',
      description: 'Abdomen - Front',
      taken_by: nurse.id,
    }
  });

  // Patient 3: Surgical case needing consent
  const preOpUser3 = await prisma.user.create({
    data: {
      id: uuid(),
      email: 'preop3.test@example.com',
      role: Role.PATIENT,
      password_hash: await hashPassword('test123'),
      first_name: 'PreOp3',
      last_name: 'Test',
    }
  });
  const preOpPatient3 = await prisma.patient.create({
    data: {
      user_id: preOpUser3.id,
      file_number: 'WF-PREOP-003',
      first_name: 'Elizabeth',
      last_name: 'Njoki',
      email: 'preop3.test@example.com',
      phone: '+254700666005',
      date_of_birth: new Date('1991-07-15'),
      gender: Gender.FEMALE,
      address: 'Loresho, Nairobi',
      marital_status: 'Single',
      emergency_contact_name: 'Samuel Njoki',
      emergency_contact_number: '+254700666006',
      relation: 'Father',
    }
  });

  const preOpAppt3 = await prisma.appointment.create({
    data: {
      patient_id: preOpPatient3.id,
      doctor_id: doctor2.id, // Different doctor
      appointment_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      time: '15:00',
      status: AppointmentStatus.COMPLETED,
      type: 'Consultation',
      reason: 'Rhinoplasty consultation',
    }
  });

  const preOpConsult3 = await prisma.consultation.create({
    data: {
      appointment_id: preOpAppt3.id,
      doctor_id: doctor2.id,
      user_id: doctor2.user_id!,
      started_at: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
      completed_at: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000 + 50 * 60 * 1000),
      duration_minutes: 50,
      outcome_type: 'PROCEDURE_RECOMMENDED',
      patient_decision: 'YES',
      doctor_notes: 'Rhinoplasty for dorsal hump reduction. Patient desires refined nasal tip. Good candidate.',
    }
  });

  const surgicalCase3 = await prisma.surgicalCase.create({
    data: {
      patient_id: preOpPatient3.id,
      primary_surgeon_id: doctor2.id,
      consultation_id: preOpConsult3.id,
      urgency: SurgicalUrgency.ELECTIVE,
      status: SurgicalCaseStatus.PLANNING,
      diagnosis: 'Aesthetic concern - dorsal hump, bulbous tip',
      procedure_name: 'Rhinoplasty',
      created_by: doctor2.user_id,
    }
  });

  const casePlan3 = await prisma.casePlan.create({
    data: {
      appointment_id: preOpAppt3.id,
      surgical_case_id: surgicalCase3.id,
      patient_id: preOpPatient3.id,
      doctor_id: doctor2.id,
      procedure_plan: 'Open rhinoplasty - dorsal hump reduction, tip refinement',
      risk_factors: 'None',
      pre_op_notes: 'All pre-op assessments complete. Photos taken. Awaiting consent signature.',
      readiness_status: CaseReadinessStatus.PENDING_CONSENT,
      ready_for_surgery: false,
    }
  });

  // Get consent template
  const consentTemplate = await prisma.consentTemplate.findFirst({
    where: { type: ConsentType.GENERAL_PROCEDURE }
  });

  if (consentTemplate) {
    await prisma.consentForm.create({
      data: {
        case_plan_id: casePlan3.id,
        title: consentTemplate.title,
        type: ConsentType.GENERAL_PROCEDURE,
        content_snapshot: consentTemplate.content,
        status: 'PENDING_SIGNATURE',
        // Not signed yet
      }
    });
  }

  // Add photos to case plan 3
  await prisma.patientImage.createMany({
    data: [
      {
        patient_id: preOpPatient3.id,
        case_plan_id: casePlan3.id,
        image_url: 'https://example.com/images/preop3-front.jpg',
        timepoint: 'PRE_OP',
        angle: 'FRONT',
        description: 'Face - Front',
        taken_by: nurse.id,
      },
      {
        patient_id: preOpPatient3.id,
        case_plan_id: casePlan3.id,
        image_url: 'https://example.com/images/preop3-profile.jpg',
        timepoint: 'PRE_OP',
        angle: 'PROFILE_LEFT',
        description: 'Face - Profile',
        taken_by: nurse.id,
      },
    ]
  });

  console.log('✅ Created 3 surgical cases for pre-op workflow testing');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Workflow Test Data Seeded Successfully!');
  console.log('='.repeat(60));
  console.log('\n📊 Test Data Summary:');
  console.log('   Check-In Workflow:');
  console.log('     - 2 SCHEDULED appointments for today (ready for check-in)');
  console.log('\n   Doctor Confirm/Reschedule/Cancel:');
  console.log('     - 3 PENDING appointments needing doctor action');
  console.log('\n   Consultation Queue:');
  console.log('     - 2 CHECKED_IN patients waiting');
  console.log('     - 1 IN_CONSULTATION patient (current)');
  console.log('\n   Billing Workflow:');
  console.log('     - 1 IN_CONSULTATION ready for completion + billing');
  console.log('\n   Follow-up Workflow:');
  console.log('     - 1 IN_CONSULTATION ready for follow-up scheduling');
  console.log('\n   Pre-Op Workflow (Phase 1):');
  console.log('     - 3 surgical cases with varying readiness:');
  console.log('       * WF-PREOP-001: NOT_STARTED (Joyce Nyambura)');
  console.log('       * WF-PREOP-002: PENDING_LABS (Margaret Ochieng)');
  console.log('       * WF-PREOP-003: PENDING_CONSENT (Elizabeth Njoki)');

  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin@nairobisculpt.com / admin123');
  console.log('   Doctor: mukami@nairobisculpt.com / doctor123');
  console.log('   Doctor 2: ken@nairobisculpt.com / doctor123');
  console.log('   Nurse: jane@nairobisculpt.com / nurse123');
  console.log('   Frontdesk: reception@nairobisculpt.com / frontdesk123');
  console.log('   Test Patients: [name].test@example.com / test123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
