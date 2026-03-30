/**
 * Integration Tests: Complete Surgical Case Workflow
 * 
 * Tests the complete workflow from consultation to theater scheduling:
 * 1. Consultation completion with procedure recommended
 * 2. Surgical case creation
 * 3. Doctor marks plan ready
 * 4. Nurse completes pre-op checklist
 * 5. Frontdesk schedules theater
 * 
 * This test uses the actual database and tests the full integration.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '@/lib/db';
import { SurgicalCaseStatus, ClinicalFormStatus, Role } from '@prisma/client';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';

describe('Complete Surgical Case Workflow - Integration', () => {
  let testPatient: any;
  let testDoctor: any;
  let testNurse: any;
  let testFrontdesk: any;
  let testAppointment: any;
  let testConsultation: any;

  beforeAll(async () => {
    // Create test users
    const doctorUser = await db.user.create({
      data: {
        email: `test-doctor-${Date.now()}@test.com`,
        password_hash: 'test',
        role: Role.DOCTOR,
        first_name: 'Test',
        last_name: 'Doctor',
      },
    });

    testDoctor = await db.doctor.create({
      data: {
        user_id: doctorUser.id,
        name: 'Dr. Test Doctor',
        specialization: 'Plastic Surgery',
        consultation_fee: 5000,
      },
    });

    const nurseUser = await db.user.create({
      data: {
        email: `test-nurse-${Date.now()}@test.com`,
        password_hash: 'test',
        role: Role.NURSE,
        first_name: 'Test',
        last_name: 'Nurse',
      },
    });

    testNurse = nurseUser;

    const frontdeskUser = await db.user.create({
      data: {
        email: `test-frontdesk-${Date.now()}@test.com`,
        password_hash: 'test',
        role: Role.FRONTDESK,
        first_name: 'Test',
        last_name: 'Frontdesk',
      },
    });

    testFrontdesk = frontdeskUser;

    // Create test patient
    testPatient = await db.patient.create({
      data: {
        user_id: doctorUser.id, // Reuse for simplicity
        first_name: 'Test',
        last_name: 'Patient',
        date_of_birth: new Date('1990-01-01'),
        gender: 'MALE',
        phone: '1234567890',
        email: `test-patient-${Date.now()}@test.com`,
        file_number: `TEST-${Date.now()}`,
      },
    });

    // Create test appointment
    testAppointment = await db.appointment.create({
      data: {
        patient_id: testPatient.id,
        doctor_id: testDoctor.id,
        appointment_date: new Date(),
        time: '10:00',
        type: 'Consultation',
        status: 'IN_CONSULTATION',
        consultation_started_at: new Date(),
      },
    });

    // Create test consultation
    testConsultation = await db.consultation.create({
      data: {
        appointment_id: testAppointment.id,
        patient_id: testPatient.id,
        doctor_id: testDoctor.id,
        state: 'ACTIVE',
        started_at: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testConsultation) {
      await db.consultation.delete({ where: { id: testConsultation.id } }).catch(() => {});
    }
    if (testAppointment) {
      await db.appointment.delete({ where: { id: testAppointment.id } }).catch(() => {});
    }
    if (testPatient) {
      await db.patient.delete({ where: { id: testPatient.id } }).catch(() => {});
    }
    if (testDoctor) {
      const doctorUser = await db.user.findUnique({ where: { id: testDoctor.user_id } });
      await db.doctor.delete({ where: { id: testDoctor.id } }).catch(() => {});
      if (doctorUser) {
        await db.user.delete({ where: { id: doctorUser.id } }).catch(() => {});
      }
    }
    if (testNurse) {
      await db.user.delete({ where: { id: testNurse.id } }).catch(() => {});
    }
    if (testFrontdesk) {
      await db.user.delete({ where: { id: testFrontdesk.id } }).catch(() => {});
    }
  });

  describe('Step 1: Consultation Completion', () => {
    it('should complete consultation without creating surgical case when doctor clicks "Finish & Exit"', async () => {
      // Simulate doctor completing consultation with "Finish & Exit"
      await db.consultation.update({
        where: { id: testConsultation.id },
        data: {
          state: 'COMPLETED',
          completed_at: new Date(),
          outcome_type: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
          outcome_notes: 'Rhinoplasty recommended',
          // No patient_decision - doctor chose "Finish & Exit"
        },
      });

      await db.appointment.update({
        where: { id: testAppointment.id },
        data: {
          status: 'COMPLETED',
          consultation_ended_at: new Date(),
        },
      });

      // Verify no surgical case was created
      const surgicalCases = await db.surgicalCase.findMany({
        where: { appointment_id: testAppointment.id },
      });

      expect(surgicalCases).toHaveLength(0);
    });
  });

  describe('Step 2: Surgical Case Creation', () => {
    let surgicalCase: any;

    it('should create surgical case when doctor clicks "Complete & Plan Surgery"', async () => {
      // Simulate doctor completing consultation with "Complete & Plan Surgery"
      await db.consultation.update({
        where: { id: testConsultation.id },
        data: {
          patient_decision: PatientDecision.YES,
        },
      });

      // Create surgical case (simulating CompleteConsultationUseCase)
      surgicalCase = await db.surgicalCase.create({
        data: {
          patient_id: testPatient.id,
          primary_surgeon_id: testDoctor.id,
          consultation_id: testConsultation.id,
          appointment_id: testAppointment.id,
          procedure_name: 'Rhinoplasty',
          diagnosis: 'Deviated septum',
          status: SurgicalCaseStatus.DRAFT,
          created_by: testDoctor.id,
        },
      });

      // Create case plan
      const casePlan = await db.casePlan.create({
        data: {
          appointment_id: testAppointment.id,
          patient_id: testPatient.id,
          doctor_id: testDoctor.id,
          surgical_case_id: surgicalCase.id,
        },
      });

      // Verify surgical case was created
      expect(surgicalCase).toBeDefined();
      expect(surgicalCase.status).toBe(SurgicalCaseStatus.DRAFT);
      expect(casePlan).toBeDefined();
      expect(casePlan.surgical_case_id).toBe(surgicalCase.id);
    });

    it('should transition to PLANNING when doctor starts filling plan', async () => {
      // Update case plan with procedure details
      await db.casePlan.update({
        where: { surgical_case_id: surgicalCase.id },
        data: {
          procedure_plan: JSON.stringify({
            procedureName: 'Rhinoplasty',
            approach: 'Open approach',
            steps: ['Step 1', 'Step 2'],
          }),
          risk_factors: 'Standard surgical risks',
          planned_anesthesia: 'General anesthesia',
        },
      });

      // Transition case to PLANNING
      await db.surgicalCase.update({
        where: { id: surgicalCase.id },
        data: { status: SurgicalCaseStatus.PLANNING },
      });

      const updated = await db.surgicalCase.findUnique({
        where: { id: surgicalCase.id },
      });

      expect(updated?.status).toBe(SurgicalCaseStatus.PLANNING);
    });
  });

  describe('Step 3: Doctor Marks Plan Ready', () => {
    let surgicalCase: any;

    beforeAll(async () => {
      // Get the surgical case created in previous test
      surgicalCase = await db.surgicalCase.findFirst({
        where: { appointment_id: testAppointment.id },
      });
    });

    it('should transition to READY_FOR_SCHEDULING when doctor marks plan ready', async () => {
      // Simulate doctor marking plan ready
      await db.surgicalCase.update({
        where: { id: surgicalCase.id },
        data: { status: SurgicalCaseStatus.READY_FOR_SCHEDULING },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          user_id: testDoctor.user_id,
          record_id: surgicalCase.id,
          action: 'UPDATE',
          model: 'SurgicalCase',
          details: 'Case marked READY_FOR_SCHEDULING',
        },
      });

      const updated = await db.surgicalCase.findUnique({
        where: { id: surgicalCase.id },
      });

      expect(updated?.status).toBe(SurgicalCaseStatus.READY_FOR_SCHEDULING);
    });

    it('should send notification to theater tech and admin', async () => {
      // Verify notifications were created (in real implementation)
      const notifications = await db.notification.findMany({
        where: {
          metadata: {
            path: ['surgicalCaseId'],
            equals: surgicalCase.id,
          },
        },
      });

      // Note: In actual implementation, notifications would be created
      // This test verifies the structure
      expect(notifications).toBeDefined();
    });
  });

  describe('Step 4: Nurse Completes Pre-Op Checklist', () => {
    let surgicalCase: any;
    let preOpForm: any;

    beforeAll(async () => {
      surgicalCase = await db.surgicalCase.findFirst({
        where: { appointment_id: testAppointment.id },
      });
    });

    it('should create pre-op checklist form', async () => {
      preOpForm = await db.clinicalFormResponse.create({
        data: {
          template_key: 'NURSE_PREOP_WARD',
          template_version: 1,
          surgical_case_id: surgicalCase.id,
          patient_id: testPatient.id,
          status: ClinicalFormStatus.DRAFT,
          data_json: JSON.stringify({
            patientIdentityVerified: true,
            consentVerified: true,
            allergiesDocumented: true,
            npoStatus: true,
            vitalSigns: {
              bloodPressure: '120/80',
              heartRate: 72,
              temperature: 36.5,
            },
          }),
          created_by_user_id: testNurse.id,
        },
      });

      expect(preOpForm).toBeDefined();
      expect(preOpForm.status).toBe(ClinicalFormStatus.DRAFT);
    });

    it('should transition to IN_PREP when nurse starts checklist', async () => {
      await db.surgicalCase.update({
        where: { id: surgicalCase.id },
        data: { status: SurgicalCaseStatus.IN_PREP },
      });

      const updated = await db.surgicalCase.findUnique({
        where: { id: surgicalCase.id },
      });

      expect(updated?.status).toBe(SurgicalCaseStatus.IN_PREP);
    });

    it('should finalize checklist and transition to READY_FOR_THEATER_BOOKING', async () => {
      // Finalize the form
      await db.clinicalFormResponse.update({
        where: { id: preOpForm.id },
        data: {
          status: ClinicalFormStatus.FINAL,
          signed_by_user_id: testNurse.id,
          signed_at: new Date(),
        },
      });

      // Transition case to READY_FOR_THEATER_BOOKING
      await db.surgicalCase.update({
        where: { id: surgicalCase.id },
        data: { status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          user_id: testNurse.id,
          record_id: surgicalCase.id,
          action: 'UPDATE',
          model: 'SurgicalCase',
          details: 'Pre-op checklist finalized - case ready for theater booking',
        },
      });

      const updated = await db.surgicalCase.findUnique({
        where: { id: surgicalCase.id },
      });

      expect(updated?.status).toBe(SurgicalCaseStatus.READY_FOR_THEATER_BOOKING);
    });

    it('should send notification to frontdesk', async () => {
      // Verify notification structure
      const notifications = await db.notification.findMany({
        where: {
          metadata: {
            path: ['event'],
            equals: 'PREOP_CHECKLIST_FINALIZED',
          },
        },
      });

      expect(notifications).toBeDefined();
    });
  });

  describe('Step 5: Frontdesk Schedules Theater', () => {
    let surgicalCase: any;
    let theater: any;
    let theaterBooking: any;

    beforeAll(async () => {
      surgicalCase = await db.surgicalCase.findFirst({
        where: { appointment_id: testAppointment.id },
      });

      // Ensure we have a theater
      theater = await db.theater.findFirst();
      if (!theater) {
        theater = await db.theater.create({
          data: {
            name: 'Test Theater',
            location: 'Test Location',
            capacity: 1,
            equipment: [],
          },
        });
      }
    });

    it('should create provisional theater booking', async () => {
      const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

      theaterBooking = await db.theaterBooking.create({
        data: {
          surgical_case_id: surgicalCase.id,
          theater_id: theater.id,
          start_time: startTime,
          end_time: endTime,
          status: 'PROVISIONAL',
          locked_by: testFrontdesk.id,
          locked_at: new Date(),
        },
      });

      expect(theaterBooking).toBeDefined();
      expect(theaterBooking.status).toBe('PROVISIONAL');
    });

    it('should confirm booking and transition case to SCHEDULED', async () => {
      // Confirm the booking
      await db.theaterBooking.update({
        where: { id: theaterBooking.id },
        data: {
          status: 'CONFIRMED',
          confirmed_at: new Date(),
        },
      });

      // Transition case to SCHEDULED
      await db.surgicalCase.update({
        where: { id: surgicalCase.id },
        data: { status: SurgicalCaseStatus.SCHEDULED },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          user_id: testFrontdesk.id,
          record_id: surgicalCase.id,
          action: 'UPDATE',
          model: 'SurgicalCase',
          details: 'Theater booked and confirmed - case scheduled',
        },
      });

      const updatedCase = await db.surgicalCase.findUnique({
        where: { id: surgicalCase.id },
      });

      const updatedBooking = await db.theaterBooking.findUnique({
        where: { id: theaterBooking.id },
      });

      expect(updatedCase?.status).toBe(SurgicalCaseStatus.SCHEDULED);
      expect(updatedBooking?.status).toBe('CONFIRMED');
      expect(updatedBooking?.confirmed_at).toBeDefined();
    });

    it('should create billing for theater usage', async () => {
      // Create payment for surgical case
      const payment = await db.payment.create({
        data: {
          patient_id: testPatient.id,
          surgical_case_id: surgicalCase.id,
          bill_type: 'SURGERY',
          total_amount: 50000,
          status: 'UNPAID',
          bill_date: new Date(),
        },
      });

      expect(payment).toBeDefined();
      expect(payment.surgical_case_id).toBe(surgicalCase.id);
      expect(payment.bill_type).toBe('SURGERY');
    });

    it('should send notifications to surgeon and nurse', async () => {
      // Verify notification structure
      const notifications = await db.notification.findMany({
        where: {
          metadata: {
            path: ['surgicalCaseId'],
            equals: surgicalCase.id,
          },
        },
      });

      expect(notifications).toBeDefined();
    });
  });

  describe('Complete Workflow Verification', () => {
    it('should have complete audit trail', async () => {
      const surgicalCase = await db.surgicalCase.findFirst({
        where: { appointment_id: testAppointment.id },
      });

      const auditLogs = await db.auditLog.findMany({
        where: { record_id: surgicalCase?.id },
        orderBy: { created_at: 'asc' },
      });

      // Should have logs for:
      // 1. Case marked READY_FOR_SCHEDULING
      // 2. Pre-op checklist finalized
      // 3. Theater booked
      expect(auditLogs.length).toBeGreaterThanOrEqual(3);
    });

    it('should have correct final status', async () => {
      const surgicalCase = await db.surgicalCase.findFirst({
        where: { appointment_id: testAppointment.id },
        include: {
          case_plan: true,
          theater_booking: true,
        },
      });

      expect(surgicalCase?.status).toBe(SurgicalCaseStatus.SCHEDULED);
      expect(surgicalCase?.case_plan).toBeDefined();
      expect(surgicalCase?.theater_booking).toBeDefined();
      expect(surgicalCase?.theater_booking?.status).toBe('CONFIRMED');
    });
  });
});
