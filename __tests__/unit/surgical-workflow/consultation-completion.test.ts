/**
 * Unit Tests: Consultation Completion Workflow
 * 
 * Tests the consultation completion logic including:
 * - Finish & Exit (no surgical case created)
 * - Complete & Plan Surgery (surgical case created)
 * - Patient decision handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompleteConsultationUseCase } from '@/application/use-cases/CompleteConsultationUseCase';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { Appointment } from '@/domain/entities/Appointment';
import { Consultation } from '@/domain/entities/Consultation';
import { ConsultationState } from '@/domain/enums/ConsultationState';

// Mock repositories
const mockAppointmentRepo = {
  findById: vi.fn(),
  update: vi.fn(),
  save: vi.fn(),
  findByPatient: vi.fn(),
};

const mockPatientRepo = {
  findById: vi.fn(),
};

const mockPaymentRepo = {
  findByAppointmentId: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
};

const mockUserRepo = {
  findByRole: vi.fn(),
};

const mockSurgicalCaseRepo = {
  create: vi.fn(),
  findById: vi.fn(),
};

const mockCasePlanRepo = {
  save: vi.fn(),
  findByAppointmentId: vi.fn(),
  linkToSurgicalCase: vi.fn(),
};

const mockConsultationRepo = {
  findByAppointmentId: vi.fn(),
  update: vi.fn(),
};

const mockNotificationService = {
  sendEmail: vi.fn(),
  sendInApp: vi.fn(),
};

const mockAuditService = {
  recordEvent: vi.fn(),
};

describe('Consultation Completion Workflow', () => {
  let useCase: CompleteConsultationUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    
    useCase = new CompleteConsultationUseCase(
      mockAppointmentRepo as any,
      mockPatientRepo as any,
      mockNotificationService as any,
      mockAuditService as any,
      mockPaymentRepo as any,
      mockUserRepo as any,
      mockSurgicalCaseRepo as any,
      mockCasePlanRepo as any,
      mockConsultationRepo as any,
    );
  });

  describe('Finish & Exit (No Surgical Case)', () => {
    it('should complete consultation without creating surgical case when outcome is CONSULTATION_ONLY', async () => {
      // Arrange
      const mockAppointment = {
        getId: () => 1,
        getPatientId: () => 'patient-1',
        getDoctorId: () => 1,
        getStatus: () => AppointmentStatus.IN_CONSULTATION,
        getNote: () => '',
        getAppointmentDate: () => new Date(),
        getCreatedAt: () => new Date(),
      } as any;

      const mockConsultation = {
        getId: () => 1,
        isCompleted: () => false,
        complete: vi.fn().mockReturnValue({
          getId: () => 1,
        }),
      } as any;

      const mockPatient = {
        getId: () => 'patient-1',
        getFullName: () => 'John Doe',
        getEmail: () => 'john@example.com',
      } as any;

      mockAppointmentRepo.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepo.findByAppointmentId.mockResolvedValue(mockConsultation);
      mockPatientRepo.findById.mockResolvedValue(mockPatient);
      mockPaymentRepo.findByAppointmentId.mockResolvedValue(null);
      mockPaymentRepo.create.mockResolvedValue({ id: 1, totalAmount: 5000 });
      mockUserRepo.findByRole.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        appointmentId: 1,
        doctorId: 1,
        outcome: 'Patient consultation completed. No procedure needed.',
        outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
        // No patientDecision - not needed for CONSULTATION_ONLY
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockAppointmentRepo.update).toHaveBeenCalled();
      expect(mockConsultationRepo.update).toHaveBeenCalled();
      expect(mockSurgicalCaseRepo.create).not.toHaveBeenCalled(); // No surgical case
      expect(mockCasePlanRepo.save).not.toHaveBeenCalled(); // No case plan
    });

    it('should complete consultation without creating surgical case when outcome is PROCEDURE_RECOMMENDED but no patient decision', async () => {
      // Arrange
      const mockAppointment = {
        getId: () => 1,
        getPatientId: () => 'patient-1',
        getDoctorId: () => 1,
        getStatus: () => AppointmentStatus.IN_CONSULTATION,
        getNote: () => '',
        getAppointmentDate: () => new Date(),
        getCreatedAt: () => new Date(),
      } as any;

      const mockConsultation = {
        getId: () => 1,
        isCompleted: () => false,
        complete: vi.fn().mockReturnValue({
          getId: () => 1,
        }),
      } as any;

      const mockPatient = {
        getId: () => 'patient-1',
        getFullName: () => 'John Doe',
        getEmail: () => 'john@example.com',
      } as any;

      mockAppointmentRepo.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepo.findByAppointmentId.mockResolvedValue(mockConsultation);
      mockPatientRepo.findById.mockResolvedValue(mockPatient);
      mockPaymentRepo.findByAppointmentId.mockResolvedValue(null);
      mockPaymentRepo.create.mockResolvedValue({ id: 1, totalAmount: 5000 });
      mockUserRepo.findByRole.mockResolvedValue([]);

      // Act - Doctor clicks "Finish & Exit" for procedure recommendation
      const result = await useCase.execute({
        appointmentId: 1,
        doctorId: 1,
        outcome: 'Rhinoplasty recommended. Patient to decide.',
        outcomeType: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
        // No patientDecision - doctor chose "Finish & Exit"
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockAppointmentRepo.update).toHaveBeenCalled();
      expect(mockConsultationRepo.update).toHaveBeenCalled();
      expect(mockSurgicalCaseRepo.create).not.toHaveBeenCalled(); // No surgical case yet
      expect(mockCasePlanRepo.save).not.toHaveBeenCalled(); // No case plan yet
    });
  });

  describe('Complete & Plan Surgery (Create Surgical Case)', () => {
    it('should create surgical case when outcome is PROCEDURE_RECOMMENDED and patient decision is YES', async () => {
      // Arrange
      const mockAppointment = {
        getId: () => 1,
        getPatientId: () => 'patient-1',
        getDoctorId: () => 1,
        getStatus: () => AppointmentStatus.IN_CONSULTATION,
        getNote: () => '',
        getAppointmentDate: () => new Date(),
        getCreatedAt: () => new Date(),
      } as any;

      const mockConsultation = {
        getId: () => 1,
        isCompleted: () => false,
        complete: vi.fn().mockReturnValue({
          getId: () => 1,
        }),
      } as any;

      const mockPatient = {
        getId: () => 'patient-1',
        getFullName: () => 'John Doe',
        getEmail: () => 'john@example.com',
      } as any;

      const mockSurgicalCase = {
        id: 'case-1',
        status: 'DRAFT',
        patient_id: 'patient-1',
      };

      const mockCasePlan = {
        id: 1,
        surgical_case_id: 'case-1',
      };

      mockAppointmentRepo.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepo.findByAppointmentId.mockResolvedValue(mockConsultation);
      mockPatientRepo.findById.mockResolvedValue(mockPatient);
      mockPaymentRepo.findByAppointmentId.mockResolvedValue(null);
      mockPaymentRepo.create.mockResolvedValue({ id: 1, totalAmount: 5000 });
      mockUserRepo.findByRole.mockResolvedValue([
        { getId: () => 'nurse-1' },
      ]);
      mockSurgicalCaseRepo.create.mockResolvedValue(mockSurgicalCase);
      mockCasePlanRepo.save.mockResolvedValue(mockCasePlan);
      mockCasePlanRepo.findByAppointmentId.mockResolvedValue(mockCasePlan);

      // Act - Doctor clicks "Complete & Plan Surgery"
      const result = await useCase.execute({
        appointmentId: 1,
        doctorId: 1,
        outcome: 'Rhinoplasty recommended. Patient accepted.',
        outcomeType: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
        patientDecision: PatientDecision.YES, // Set by UI when "Complete & Plan Surgery" clicked
        procedureRecommended: {
          procedureType: 'Rhinoplasty',
          urgency: 'ELECTIVE',
          notes: 'Standard rhinoplasty procedure',
        },
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockAppointmentRepo.update).toHaveBeenCalled();
      expect(mockConsultationRepo.update).toHaveBeenCalled();
      expect(mockSurgicalCaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          primarySurgeonId: 1,
          procedureName: 'Rhinoplasty',
        })
      );
      expect(mockCasePlanRepo.save).toHaveBeenCalled();
      expect(mockCasePlanRepo.linkToSurgicalCase).toHaveBeenCalledWith(1, 'case-1');
      expect(mockNotificationService.sendInApp).toHaveBeenCalledWith(
        'nurse-1',
        'New Surgical Case - Pre-Op Required',
        expect.stringContaining('Rhinoplasty'),
        'info',
        expect.objectContaining({
          resourceType: 'surgical_case',
          resourceId: 'case-1',
        })
      );
    });

    it('should not create surgical case when patient decision is NO', async () => {
      // Arrange
      const mockAppointment = {
        getId: () => 1,
        getPatientId: () => 'patient-1',
        getDoctorId: () => 1,
        getStatus: () => AppointmentStatus.IN_CONSULTATION,
        getNote: () => '',
        getAppointmentDate: () => new Date(),
        getCreatedAt: () => new Date(),
      } as any;

      const mockConsultation = {
        getId: () => 1,
        isCompleted: () => false,
        complete: vi.fn().mockReturnValue({
          getId: () => 1,
        }),
      } as any;

      const mockPatient = {
        getId: () => 'patient-1',
        getFullName: () => 'John Doe',
        getEmail: () => 'john@example.com',
      } as any;

      mockAppointmentRepo.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepo.findByAppointmentId.mockResolvedValue(mockConsultation);
      mockPatientRepo.findById.mockResolvedValue(mockPatient);
      mockPaymentRepo.findByAppointmentId.mockResolvedValue(null);
      mockPaymentRepo.create.mockResolvedValue({ id: 1, totalAmount: 5000 });
      mockUserRepo.findByRole.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        appointmentId: 1,
        doctorId: 1,
        outcome: 'Rhinoplasty recommended. Patient declined.',
        outcomeType: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
        patientDecision: PatientDecision.NO,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockSurgicalCaseRepo.create).not.toHaveBeenCalled();
      expect(mockCasePlanRepo.save).not.toHaveBeenCalled();
    });

    it('should not create surgical case when patient needs time to decide', async () => {
      // Arrange
      const mockAppointment = {
        getId: () => 1,
        getPatientId: () => 'patient-1',
        getDoctorId: () => 1,
        getStatus: () => AppointmentStatus.IN_CONSULTATION,
        getNote: () => '',
        getAppointmentDate: () => new Date(),
        getCreatedAt: () => new Date(),
      } as any;

      const mockConsultation = {
        getId: () => 1,
        isCompleted: () => false,
        complete: vi.fn().mockReturnValue({
          getId: () => 1,
        }),
      } as any;

      const mockPatient = {
        getId: () => 'patient-1',
        getFullName: () => 'John Doe',
        getEmail: () => 'john@example.com',
      } as any;

      mockAppointmentRepo.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepo.findByAppointmentId.mockResolvedValue(mockConsultation);
      mockPatientRepo.findById.mockResolvedValue(mockPatient);
      mockPaymentRepo.findByAppointmentId.mockResolvedValue(null);
      mockPaymentRepo.create.mockResolvedValue({ id: 1, totalAmount: 5000 });
      mockUserRepo.findByRole.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        appointmentId: 1,
        doctorId: 1,
        outcome: 'Rhinoplasty recommended. Patient needs time to decide.',
        outcomeType: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
        patientDecision: PatientDecision.NEEDS_TIME,
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockSurgicalCaseRepo.create).not.toHaveBeenCalled();
      expect(mockCasePlanRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Billing Creation', () => {
    it('should create payment record when completing consultation', async () => {
      // Arrange
      const mockAppointment = {
        getId: () => 1,
        getPatientId: () => 'patient-1',
        getDoctorId: () => 1,
        getStatus: () => AppointmentStatus.IN_CONSULTATION,
        getNote: () => '',
        getAppointmentDate: () => new Date(),
        getCreatedAt: () => new Date(),
      } as any;

      const mockConsultation = {
        getId: () => 1,
        isCompleted: () => false,
        complete: vi.fn().mockReturnValue({
          getId: () => 1,
        }),
      } as any;

      const mockPatient = {
        getId: () => 'patient-1',
        getFullName: () => 'John Doe',
        getEmail: () => 'john@example.com',
      } as any;

      mockAppointmentRepo.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepo.findByAppointmentId.mockResolvedValue(mockConsultation);
      mockPatientRepo.findById.mockResolvedValue(mockPatient);
      mockPaymentRepo.findByAppointmentId.mockResolvedValue(null);
      mockPaymentRepo.create.mockResolvedValue({ id: 1, totalAmount: 5000 });
      mockPaymentRepo.findById.mockResolvedValue({ id: 1, totalAmount: 5000 });
      mockUserRepo.findByRole.mockResolvedValue([
        { getId: () => 'frontdesk-1' },
      ]);

      // Act
      const result = await useCase.execute({
        appointmentId: 1,
        doctorId: 1,
        outcome: 'Consultation completed',
        outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
      });

      // Assert
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          appointmentId: 1,
        })
      );
      expect(mockNotificationService.sendInApp).toHaveBeenCalledWith(
        'frontdesk-1',
        'Payment Ready for Collection',
        expect.stringContaining('John Doe'),
        'info',
        expect.objectContaining({
          resourceType: 'payment',
          resourceId: 1,
        })
      );
    });
  });

  describe('Audit Trail', () => {
    it('should record audit event when completing consultation', async () => {
      // Arrange
      const mockAppointment = {
        getId: () => 1,
        getPatientId: () => 'patient-1',
        getDoctorId: () => 1,
        getStatus: () => AppointmentStatus.IN_CONSULTATION,
        getNote: () => '',
        getAppointmentDate: () => new Date(),
        getCreatedAt: () => new Date(),
      } as any;

      const mockConsultation = {
        getId: () => 1,
        isCompleted: () => false,
        complete: vi.fn().mockReturnValue({
          getId: () => 1,
        }),
      } as any;

      const mockPatient = {
        getId: () => 'patient-1',
        getFullName: () => 'John Doe',
        getEmail: () => 'john@example.com',
      } as any;

      mockAppointmentRepo.findById.mockResolvedValue(mockAppointment);
      mockConsultationRepo.findByAppointmentId.mockResolvedValue(mockConsultation);
      mockPatientRepo.findById.mockResolvedValue(mockPatient);
      mockPaymentRepo.findByAppointmentId.mockResolvedValue(null);
      mockPaymentRepo.create.mockResolvedValue({ id: 1, totalAmount: 5000 });
      mockUserRepo.findByRole.mockResolvedValue([]);

      // Act
      await useCase.execute({
        appointmentId: 1,
        doctorId: 1,
        outcome: 'Consultation completed',
        outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
      });

      // Assert
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          recordId: '1',
          action: 'UPDATE',
          model: 'Appointment',
          details: expect.stringContaining('Consultation completed'),
        })
      );
    });
  });
});
