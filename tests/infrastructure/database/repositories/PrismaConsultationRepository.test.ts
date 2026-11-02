import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { PrismaConsultationRepository } from '../../../../infrastructure/database/repositories/PrismaConsultationRepository';
import { Consultation } from '../../../../domain/entities/Consultation';
import { ConsultationNotes } from '../../../../domain/value-objects/ConsultationNotes';
import { ConsultationState } from '../../../../domain/enums/ConsultationState';
import { ConsultationOutcomeType } from '../../../../domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '../../../../domain/enums/PatientDecision';
import { Prisma, type PrismaClient } from '@prisma/client';

describe('PrismaConsultationRepository', () => {
  let mockPrisma: {
    consultation: {
      findUnique: Mock;
      findMany: Mock;
      create: Mock;
      update: Mock;
      delete: Mock;
    };
  };
  let repository: PrismaConsultationRepository;

  beforeEach(() => {
    mockPrisma = {
      consultation: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    repository = new PrismaConsultationRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('findById', () => {
    it('should return Consultation entity when consultation is found', async () => {
      const prismaConsultation = {
        id: 1,
        appointment_id: 100,
        doctor_id: 'doctor-1',
        user_id: 'user-1',
        state: ConsultationState.IN_PROGRESS,
        started_at: new Date('2025-01-15T10:00:00Z'),
        completed_at: null,
        duration_minutes: null,
        duration_seconds: null,
        doctor_notes: 'Patient consultation in progress',
        chief_complaint: null,
        examination: null,
        assessment: null,
        plan: null,
        outcome_type: null,
        patient_decision: null,
        follow_up_date: null,
        follow_up_type: null,
        follow_up_notes: null,
        created_at: new Date('2025-01-15T09:00:00Z'),
        updated_at: new Date('2025-01-15T10:00:00Z'),
      };

      mockPrisma.consultation.findUnique.mockResolvedValue(prismaConsultation);

      const result = await repository.findById(1);

      expect(result).toBeInstanceOf(Consultation);
      expect(result?.getId()).toBe(1);
      expect(result?.getAppointmentId()).toBe(100);
      expect(result?.getDoctorId()).toBe('doctor-1');
      expect(result?.getState()).toBe(ConsultationState.IN_PROGRESS);
      expect(mockPrisma.consultation.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when consultation is not found', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('should throw error when Prisma query fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.consultation.findUnique.mockRejectedValue(error);

      await expect(repository.findById(1)).rejects.toThrow(
        'Failed to find consultation by ID: 1'
      );
    });
  });

  describe('findByAppointmentId', () => {
    it('should return Consultation entity when found by appointment ID', async () => {
      const prismaConsultation = {
        id: 1,
        appointment_id: 100,
        doctor_id: 'doctor-1',
        user_id: 'user-1',
        state: ConsultationState.NOT_STARTED,
        started_at: null,
        completed_at: null,
        duration_minutes: null,
        duration_seconds: null,
        doctor_notes: null,
        chief_complaint: null,
        examination: null,
        assessment: null,
        plan: null,
        outcome_type: null,
        patient_decision: null,
        follow_up_date: null,
        follow_up_type: null,
        follow_up_notes: null,
        created_at: new Date('2025-01-15T09:00:00Z'),
        updated_at: new Date('2025-01-15T09:00:00Z'),
      };

      mockPrisma.consultation.findUnique.mockResolvedValue(prismaConsultation);

      const result = await repository.findByAppointmentId(100);

      expect(result).toBeInstanceOf(Consultation);
      expect(result?.getAppointmentId()).toBe(100);
      expect(mockPrisma.consultation.findUnique).toHaveBeenCalledWith({
        where: { appointment_id: 100 },
      });
    });

    it('should return null when consultation not found for appointment', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(null);

      const result = await repository.findByAppointmentId(999);

      expect(result).toBeNull();
    });
  });

  describe('findByDoctorId', () => {
    it('should return array of Consultation entities for a doctor', async () => {
      const prismaConsultations = [
        {
          id: 1,
          appointment_id: 100,
          doctor_id: 'doctor-1',
          user_id: 'user-1',
          state: ConsultationState.COMPLETED,
          started_at: new Date('2025-01-15T10:00:00Z'),
          completed_at: new Date('2025-01-15T10:30:00Z'),
          duration_minutes: 30,
          duration_seconds: 0,
          doctor_notes: 'Consultation completed',
          chief_complaint: 'Patient complaint',
          examination: 'Physical exam',
          assessment: 'Assessment',
          plan: 'Treatment plan',
          outcome_type: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
          patient_decision: PatientDecision.YES,
          follow_up_date: null,
          follow_up_type: null,
          follow_up_notes: null,
          created_at: new Date('2025-01-15T09:00:00Z'),
          updated_at: new Date('2025-01-15T10:30:00Z'),
        },
      ];

      mockPrisma.consultation.findMany.mockResolvedValue(prismaConsultations);

      const result = await repository.findByDoctorId('doctor-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Consultation);
      expect(result[0].getDoctorId()).toBe('doctor-1');
      expect(result[0].getState()).toBe(ConsultationState.COMPLETED);
    });

    it('should apply filters when provided', async () => {
      mockPrisma.consultation.findMany.mockResolvedValue([]);

      await repository.findByDoctorId('doctor-1', {
        state: ConsultationState.IN_PROGRESS,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      // Implementation filters IN_PROGRESS as: started_at not null, completed_at null
      // Date range uses created_at (not started_at) to avoid conflict with state filter
      // Also includes take: 200 safety limit
      expect(mockPrisma.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctor_id: 'doctor-1',
            started_at: { not: null },
            completed_at: null,
            created_at: {
              gte: new Date('2025-01-01'),
              lte: new Date('2025-01-31'),
            },
          }),
          orderBy: { started_at: 'desc' },
          take: 200,
        })
      );
    });
  });

  describe('save', () => {
    it('should save a new consultation successfully', async () => {
      const consultation = Consultation.create({
        id: 0, // Will be generated by DB
        appointmentId: 100,
        doctorId: 'doctor-1',
        userId: 'user-1',
      });

      const createdConsultation = {
        id: 1,
        appointment_id: 100,
        doctor_id: 'doctor-1',
        user_id: 'user-1',
        state: ConsultationState.NOT_STARTED,
        started_at: null,
        completed_at: null,
        duration_minutes: null,
        duration_seconds: null,
        doctor_notes: null,
        chief_complaint: null,
        examination: null,
        assessment: null,
        plan: null,
        outcome_type: null,
        patient_decision: null,
        follow_up_date: null,
        follow_up_type: null,
        follow_up_notes: null,
        created_at: new Date('2025-01-15T09:00:00Z'),
        updated_at: new Date('2025-01-15T09:00:00Z'),
      };

      mockPrisma.consultation.create.mockResolvedValue(createdConsultation);

      const result = await repository.save(consultation);

      expect(result).toBeInstanceOf(Consultation);
      expect(result.getId()).toBe(1);
      expect(mockPrisma.consultation.create).toHaveBeenCalled();
    });

    it('should throw error when unique constraint fails', async () => {
      const consultation = Consultation.create({
        id: 0,
        appointmentId: 100,
        doctorId: 'doctor-1',
      });

      // Use proper PrismaClientKnownRequestError instance
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' }
      );

      mockPrisma.consultation.create.mockRejectedValue(prismaError);

      await expect(repository.save(consultation)).rejects.toThrow(
        'Consultation for appointment 100 already exists'
      );
    });
  });

  describe('update', () => {
    it('should update an existing consultation successfully', async () => {
      const consultation = Consultation.create({
        id: 1,
        appointmentId: 100,
        doctorId: 'doctor-1',
      }).start('user-1', new Date('2025-01-15T10:00:00Z'));

      mockPrisma.consultation.update.mockResolvedValue({});

      await repository.update(consultation);

      // Mapper maps started_at (state is inferred, not stored directly in update)
      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          started_at: new Date('2025-01-15T10:00:00Z'),
        }),
      });
    });

    it('should throw error when consultation not found', async () => {
      const consultation = Consultation.create({
        id: 999,
        appointmentId: 100,
        doctorId: 'doctor-1',
      });

      // Use proper PrismaClientKnownRequestError instance
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );

      mockPrisma.consultation.update.mockRejectedValue(prismaError);

      await expect(repository.update(consultation)).rejects.toThrow(
        'Consultation with ID 999 not found'
      );
    });

    it('updates an open consultation through the transaction client and refuses a closed row', async () => {
      const notes = ConsultationNotes.createStructured({
        chiefComplaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review in two weeks',
      });
      const consultation = Consultation.create({
        id: 1,
        appointmentId: 100,
        doctorId: 'doctor-1',
        userId: 'user-1',
      }).start('user-1', new Date('2026-01-01T09:00:00.000Z')).updateDraft({
        notes,
        outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
        patientDecision: PatientDecision.PENDING,
      }).complete({
        notes,
        outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
        patientDecision: PatientDecision.PENDING,
        completedAt: new Date('2026-01-01T10:00:00.000Z'),
      });
      const tx = {
        consultation: {
          findUnique: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        appointment: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      };

      await repository.update(consultation, tx);

      expect(tx.consultation.updateMany).toHaveBeenCalledWith({
        where: { id: 1, completed_at: null },
        data: expect.objectContaining({
          chief_complaint: 'Headache',
          doctor_notes: notes.toFullText(),
          completed_at: consultation.getCompletedAt(),
          outcome_type: ConsultationOutcomeType.CONSULTATION_ONLY,
          patient_decision: PatientDecision.PENDING,
        }),
      });
      expect(mockPrisma.consultation.update).not.toHaveBeenCalled();

      tx.consultation.updateMany.mockResolvedValue({ count: 0 });
      await expect(repository.update(consultation, tx)).rejects.toThrow(/not open for completion/);
      expect(mockPrisma.consultation.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a consultation successfully', async () => {
      mockPrisma.consultation.delete.mockResolvedValue({});

      await repository.delete(1);

      expect(mockPrisma.consultation.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw error when consultation not found', async () => {
      // Use proper PrismaClientKnownRequestError instance
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );

      mockPrisma.consultation.delete.mockRejectedValue(prismaError);

      await expect(repository.delete(999)).rejects.toThrow(
        'Consultation with ID 999 not found'
      );
    });
  });
});
