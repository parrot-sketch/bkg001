import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { PrismaConsultationRepository } from '../../../../infrastructure/database/repositories/PrismaConsultationRepository';
import { Consultation } from '../../../../domain/entities/Consultation';
import { ConsultationState } from '../../../../domain/enums/ConsultationState';
import { ConsultationOutcomeType } from '../../../../domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '../../../../domain/enums/PatientDecision';
import type { PrismaClient } from '@prisma/client';

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

      expect(mockPrisma.consultation.findMany).toHaveBeenCalledWith({
        where: {
          doctor_id: 'doctor-1',
          state: ConsultationState.IN_PROGRESS,
          started_at: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-01-31'),
          },
        },
        orderBy: { started_at: 'desc' },
      });
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

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };

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

      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          state: ConsultationState.IN_PROGRESS,
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

      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      mockPrisma.consultation.update.mockRejectedValue(prismaError);

      await expect(repository.update(consultation)).rejects.toThrow(
        'Consultation with ID 999 not found'
      );
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
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      mockPrisma.consultation.delete.mockRejectedValue(prismaError);

      await expect(repository.delete(999)).rejects.toThrow(
        'Consultation with ID 999 not found'
      );
    });
  });
});
