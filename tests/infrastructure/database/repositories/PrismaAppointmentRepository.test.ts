import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { PrismaAppointmentRepository } from '../../../../infrastructure/database/repositories/PrismaAppointmentRepository';
import { Appointment } from '../../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { Prisma, type PrismaClient } from '@prisma/client';

describe('PrismaAppointmentRepository', () => {
  let mockPrisma: {
    appointment: {
      findUnique: Mock;
      findFirst: Mock;
      findMany: Mock;
      create: Mock;
      update: Mock;
      count: Mock;
    };
  };
  let repository: PrismaAppointmentRepository;

  beforeEach(() => {
    mockPrisma = {
      appointment: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };

    repository = new PrismaAppointmentRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('findById', () => {
    it('should return Appointment entity when appointment is found', async () => {
      const prismaAppointment = {
        id: 1,
        patient_id: 'patient-1',
        doctor_id: 'doctor-1',
        appointment_date: new Date('2025-02-01'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
        note: 'First visit',
        reason: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      mockPrisma.appointment.findUnique.mockResolvedValue(prismaAppointment);

      const result = await repository.findById(1);

      expect(result).toBeInstanceOf(Appointment);
      expect(result?.getId()).toBe(1);
      expect(result?.getPatientId()).toBe('patient-1');
      expect(result?.getDoctorId()).toBe('doctor-1');
      expect(result?.getStatus()).toBe(AppointmentStatus.SCHEDULED);
      expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when appointment is not found', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
      expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it('should throw error when Prisma query fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.appointment.findUnique.mockRejectedValue(error);

      await expect(repository.findById(1)).rejects.toThrow(
        'Failed to find appointment by ID: 1'
      );
    });
  });

  describe('findByPatient', () => {
    it('should return array of Appointment entities for a patient', async () => {
      const prismaAppointments = [
        {
          id: 1,
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          appointment_date: new Date('2025-02-01'),
          time: '10:00 AM',
          status: AppointmentStatus.SCHEDULED,
          type: 'Consultation',
          note: 'First visit',
          reason: null,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
        {
          id: 2,
          patient_id: 'patient-1',
          doctor_id: 'doctor-2',
          appointment_date: new Date('2025-02-15'),
          time: '2:00 PM',
          status: AppointmentStatus.PENDING,
          type: 'Follow-up',
          note: null,
          reason: null,
          created_at: new Date('2024-01-02'),
          updated_at: new Date('2024-01-02'),
        },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(prismaAppointments);

      const result = await repository.findByPatient('patient-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Appointment);
      expect(result[0].getId()).toBe(1);
      expect(result[1].getId()).toBe(2);
      // Verify the query includes date filtering and take limit (refactored impl)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patient_id: 'patient-1',
          }),
          orderBy: { appointment_date: 'desc' },
          take: 100,
        })
      );
    });

    it('should return empty array when no appointments found', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const result = await repository.findByPatient('patient-with-no-appointments');

      expect(result).toEqual([]);
    });
  });

  describe('findByDoctor', () => {
    it('should find appointments by doctor with default date range', async () => {
      const prismaAppointments = [
        {
          id: 1,
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          appointment_date: new Date('2025-02-01'),
          time: '10:00 AM',
          status: AppointmentStatus.SCHEDULED,
          type: 'Consultation',
          note: null,
          reason: null,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(prismaAppointments);

      const result = await repository.findByDoctor('doctor-1');

      expect(result).toHaveLength(1);
      expect(result[0].getDoctorId()).toBe('doctor-1');
      // Verify query includes default date filtering and take limit
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctor_id: 'doctor-1',
          }),
          orderBy: { appointment_date: 'desc' },
          take: 100,
        })
      );
    });

    it('should find appointments by doctor with date range filters (no take limit)', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-03-01');

      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await repository.findByDoctor('doctor-1', { startDate, endDate });

      // When date range is provided, no take limit is applied
      const call = mockPrisma.appointment.findMany.mock.calls[0][0];
      expect(call.where.doctor_id).toBe('doctor-1');
      expect(call.where.appointment_date.gte).toEqual(startDate);
      expect(call.where.appointment_date.lte).toEqual(endDate);
      expect(call.take).toBeUndefined();
    });
  });

  describe('save', () => {
    it('should save a new appointment successfully', async () => {
      const appointment = Appointment.create({
        id: 1, // ID will be generated by DB, but we need it for domain entity
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-02-01'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
      });

      mockPrisma.appointment.create.mockResolvedValue({ id: 1 });

      await repository.save(appointment);

      expect(mockPrisma.appointment.create).toHaveBeenCalled();
      const createCall = mockPrisma.appointment.create.mock.calls[0][0];
      expect(createCall.data.patient.connect.id).toBe('patient-1');
      expect(createCall.data.doctor.connect.id).toBe('doctor-1');
      expect(createCall.data.appointment_date).toEqual(new Date('2025-02-01'));
      expect(createCall.data.time).toBe('10:00 AM');
      expect(createCall.data.status).toBe(AppointmentStatus.PENDING);
      expect(createCall.data.type).toBe('Consultation');
    });

    it('should throw error when foreign key constraint fails', async () => {
      const appointment = Appointment.create({
        id: 1,
        patientId: 'non-existent-patient',
        doctorId: 'non-existent-doctor',
        appointmentDate: new Date('2025-02-01'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
      });

      // Use proper PrismaClientKnownRequestError instance
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '5.0.0' }
      );

      mockPrisma.appointment.create.mockRejectedValue(prismaError);

      await expect(repository.save(appointment)).rejects.toThrow(
        'Invalid patient or doctor ID'
      );
    });

    it('should throw error on double booking constraint violation', async () => {
      const appointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-02-01'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
      });

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['appointment_no_double_booking'] } }
      );

      mockPrisma.appointment.create.mockRejectedValue(prismaError);

      await expect(repository.save(appointment)).rejects.toThrow(
        'Double booking detected'
      );
    });
  });

  describe('hasConflict', () => {
    it('should return true when conflict exists', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 1 });

      const result = await repository.hasConflict(
        'doctor-1',
        new Date('2025-02-01'),
        '10:00',
      );

      expect(result).toBe(true);
    });

    it('should return false when no conflict exists', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const result = await repository.hasConflict(
        'doctor-1',
        new Date('2025-02-01'),
        '10:00',
      );

      expect(result).toBe(false);
    });
  });
});
