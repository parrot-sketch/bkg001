import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { PrismaPatientRepository } from '../../../../infrastructure/database/repositories/PrismaPatientRepository';
import { Patient } from '../../../../domain/entities/Patient';
import { Email } from '../../../../domain/value-objects/Email';
import { PhoneNumber } from '../../../../domain/value-objects/PhoneNumber';
import { Gender } from '../../../../domain/enums/Gender';
import { Prisma, type PrismaClient } from '@prisma/client';

describe('PrismaPatientRepository', () => {
  let mockPrisma: {
    patient: {
      findUnique: Mock;
      create: Mock;
      update: Mock;
    };
  };
  let repository: PrismaPatientRepository;

  beforeEach(() => {
    mockPrisma = {
      patient: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    repository = new PrismaPatientRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('findById', () => {
    it('should return Patient entity when patient is found', async () => {
      const prismaPatient = {
        id: 'patient-1',
        file_number: 'NS001',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: new Date('1990-01-01'),
        gender: Gender.MALE,
        email: 'john.doe@example.com',
        phone: '1234567890',
        address: '123 Main St',
        marital_status: 'Single',
        emergency_contact_name: 'Jane Doe',
        emergency_contact_number: '0987654321',
        relation: 'Spouse',
        privacy_consent: true,
        service_consent: true,
        medical_consent: true,
        blood_group: null,
        allergies: null,
        medical_conditions: null,
        medical_history: null,
        insurance_provider: null,
        insurance_number: null,
        img: null,
        colorCode: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      mockPrisma.patient.findUnique.mockResolvedValue(prismaPatient);

      const result = await repository.findById('patient-1');

      expect(result).toBeInstanceOf(Patient);
      expect(result?.getId()).toBe('patient-1');
      expect(result?.getFirstName()).toBe('John');
      expect(result?.getLastName()).toBe('Doe');
      expect(result?.getEmail().getValue()).toBe('john.doe@example.com');
      expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: 'patient-1' },
      });
    });

    it('should return null when patient is not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
      expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
    });

    it('should throw error when Prisma query fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.patient.findUnique.mockRejectedValue(error);

      await expect(repository.findById('patient-1')).rejects.toThrow(
        'Failed to find patient by ID: patient-1'
      );
    });
  });

  describe('findByEmail', () => {
    it('should return Patient entity when patient is found by email', async () => {
      const email = Email.create('john.doe@example.com');
      const prismaPatient = {
        id: 'patient-1',
        file_number: 'NS001',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: new Date('1990-01-01'),
        gender: Gender.MALE,
        email: 'john.doe@example.com',
        phone: '1234567890',
        address: '123 Main St',
        marital_status: 'Single',
        emergency_contact_name: 'Jane Doe',
        emergency_contact_number: '0987654321',
        relation: 'Spouse',
        privacy_consent: true,
        service_consent: true,
        medical_consent: true,
        blood_group: null,
        allergies: null,
        medical_conditions: null,
        medical_history: null,
        insurance_provider: null,
        insurance_number: null,
        img: null,
        colorCode: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      mockPrisma.patient.findUnique.mockResolvedValue(prismaPatient);

      const result = await repository.findByEmail(email);

      expect(result).toBeInstanceOf(Patient);
      expect(result?.getEmail().equals(email)).toBe(true);
      expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
        where: { email: 'john.doe@example.com' },
      });
    });

    it('should return null when patient is not found by email', async () => {
      const email = Email.create('notfound@example.com');
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should save a new patient successfully', async () => {
      const patient = Patient.create({
        id: 'patient-1',
        fileNumber: 'NS001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.MALE,
        email: 'john.doe@example.com',
        phone: '1234567890',
        address: '123 Main St',
        maritalStatus: 'Single',
        emergencyContactName: 'Jane Doe',
        emergencyContactNumber: '0987654321',
        relation: 'Spouse',
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
      });

      mockPrisma.patient.create.mockResolvedValue({});

      await repository.save(patient);

      expect(mockPrisma.patient.create).toHaveBeenCalled();
      const createCall = mockPrisma.patient.create.mock.calls[0][0];
      expect(createCall.data.id).toBe('patient-1');
      expect(createCall.data.first_name).toBe('John');
      expect(createCall.data.email).toBe('john.doe@example.com');
    });

    it('should throw error when patient with same ID already exists', async () => {
      const patient = Patient.create({
        id: 'patient-1',
        fileNumber: 'NS001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.MALE,
        email: 'john.doe@example.com',
        phone: '1234567890',
        address: '123 Main St',
        maritalStatus: 'Single',
        emergencyContactName: 'Jane Doe',
        emergencyContactNumber: '0987654321',
        relation: 'Spouse',
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
      });

      // Use proper PrismaClientKnownRequestError instance
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' }
      );

      mockPrisma.patient.create.mockRejectedValue(prismaError);

      await expect(repository.save(patient)).rejects.toThrow(
        'already exists'
      );
    });
  });

  describe('update', () => {
    it('should update an existing patient successfully', async () => {
      const patient = Patient.create({
        id: 'patient-1',
        fileNumber: 'NS001',
        firstName: 'John',
        lastName: 'Updated',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.MALE,
        email: 'john.updated@example.com',
        phone: '1234567890',
        address: '123 Main St',
        maritalStatus: 'Single',
        emergencyContactName: 'Jane Doe',
        emergencyContactNumber: '0987654321',
        relation: 'Spouse',
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
      });

      mockPrisma.patient.update.mockResolvedValue({});

      await repository.update(patient);

      expect(mockPrisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-1' },
        data: expect.objectContaining({
          last_name: 'Updated',
          email: 'john.updated@example.com',
        }),
      });
    });

    it('should throw error when patient does not exist', async () => {
      const patient = Patient.create({
        id: 'non-existent',
        fileNumber: 'NS999',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.MALE,
        email: 'john.doe@example.com',
        phone: '1234567890',
        address: '123 Main St',
        maritalStatus: 'Single',
        emergencyContactName: 'Jane Doe',
        emergencyContactNumber: '0987654321',
        relation: 'Spouse',
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
      });

      // Use proper PrismaClientKnownRequestError instance
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' }
      );

      mockPrisma.patient.update.mockRejectedValue(prismaError);

      await expect(repository.update(patient)).rejects.toThrow(
        'not found'
      );
    });
  });
});
