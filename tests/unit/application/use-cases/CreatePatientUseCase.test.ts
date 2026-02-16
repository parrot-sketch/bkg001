import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CreatePatientUseCase } from '../../../../application/use-cases/CreatePatientUseCase';
import { CreatePatientDto } from '../../../../application/dtos/CreatePatientDto';
import type { IPatientRepository } from '../../../../domain/interfaces/repositories/IPatientRepository';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import { Patient } from '../../../../domain/entities/Patient';
import { Email } from '../../../../domain/value-objects/Email';
import { PhoneNumber } from '../../../../domain/value-objects/PhoneNumber';
import { Gender } from '../../../../domain/enums/Gender';
import { DomainException } from '../../../../domain/exceptions/DomainException';

describe('CreatePatientUseCase', () => {
  let mockPatientRepository: {
    findById: Mock;
    findByEmail: Mock;
    save: Mock;
    update: Mock;
    findHighestFileNumber: Mock;
  };
  let mockAuditService: {
    recordEvent: Mock;
  };
  let useCase: CreatePatientUseCase;

  const validDto: CreatePatientDto = {
    id: 'patient-1',
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
  };

  beforeEach(() => {
    mockPatientRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      findHighestFileNumber: vi.fn().mockResolvedValue(null), // No existing patients → NS001
    };

    mockAuditService = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new CreatePatientUseCase(
      mockPatientRepository as unknown as IPatientRepository,
      mockAuditService as unknown as IAuditService,
    );
  });

  describe('execute', () => {
    it('should create a new patient successfully', async () => {
      // Arrange
      mockPatientRepository.findByEmail.mockResolvedValue(null); // No existing patient
      mockPatientRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validDto, 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('patient-1');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.age).toBeGreaterThan(30); // Approximate age check

      // Verify repository calls
      expect(mockPatientRepository.findByEmail).toHaveBeenCalledOnce();
      expect(mockPatientRepository.save).toHaveBeenCalledOnce();
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();

      // Verify audit event
      const auditCall = mockAuditService.recordEvent.mock.calls[0][0];
      expect(auditCall.userId).toBe('user-1');
      expect(auditCall.recordId).toBe('patient-1');
      expect(auditCall.action).toBe('CREATE');
      expect(auditCall.model).toBe('Patient');
    });

    it('should throw DomainException if patient with email already exists', async () => {
      // Arrange
      const existingPatient = Patient.create({
        id: 'existing-patient',
        fileNumber: 'NS002',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-01-01'),
        gender: Gender.FEMALE,
        email: 'john.doe@example.com',
        phone: '1111111111',
        address: '456 Other St',
        maritalStatus: 'Married',
        emergencyContactName: 'John Doe',
        emergencyContactNumber: '2222222222',
        relation: 'Spouse',
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
      });

      mockPatientRepository.findByEmail.mockResolvedValue(existingPatient);

      // Act & Assert
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow(
        'already exists',
      );

      // Verify repository was not called to save
      expect(mockPatientRepository.save).not.toHaveBeenCalled();
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });

    it('should throw error if patient validation fails (invalid gender)', async () => {
      // Arrange
      const invalidDto = {
        ...validDto,
        gender: 'INVALID_GENDER',
      };

      mockPatientRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(invalidDto as CreatePatientDto, 'user-1')).rejects.toThrow(
        DomainException,
      );
      await expect(useCase.execute(invalidDto as CreatePatientDto, 'user-1')).rejects.toThrow(
        'Invalid gender',
      );

      // Verify repository was not called to save
      expect(mockPatientRepository.save).not.toHaveBeenCalled();
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });

    it('should throw error if patient validation fails (missing required field)', async () => {
      // Arrange
      const invalidDto = {
        ...validDto,
        firstName: '', // Empty first name
      };

      mockPatientRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(invalidDto as CreatePatientDto, 'user-1')).rejects.toThrow(
        DomainException,
      );

      // Verify repository was not called to save
      expect(mockPatientRepository.save).not.toHaveBeenCalled();
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });

    it('should throw error if repository save fails', async () => {
      // Arrange
      mockPatientRepository.findByEmail.mockResolvedValue(null);
      mockPatientRepository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow('Database error');

      // Verify audit was not called (save failed before audit)
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });

    it('should include optional fields in created patient', async () => {
      // Arrange
      const dtoWithOptional: CreatePatientDto = {
        ...validDto,
        bloodGroup: 'O+',
        allergies: 'Peanuts',
        medicalConditions: 'Hypertension',
        insuranceProvider: 'ABC Insurance',
        insuranceNumber: 'INS-12345',
      };

      mockPatientRepository.findByEmail.mockResolvedValue(null);
      mockPatientRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(dtoWithOptional, 'user-1');

      // Assert
      expect(result.bloodGroup).toBe('O+');
      expect(result.allergies).toBe('Peanuts');
      expect(result.medicalConditions).toBe('Hypertension');
      expect(result.insuranceProvider).toBe('ABC Insurance');
      expect(result.insuranceNumber).toBe('INS-12345');
    });

    it('should accept patient with missing consents (consent enforcement is at intake layer)', async () => {
      // Arrange — consents are stored but not enforced at the domain entity level
      const dtoWithoutConsents: CreatePatientDto = {
        ...validDto,
        privacyConsent: false,
        serviceConsent: true,
        medicalConsent: true,
      };

      mockPatientRepository.findByEmail.mockResolvedValue(null);
      mockPatientRepository.save.mockResolvedValue(undefined);

      // Act — should succeed because Patient entity does not enforce consent validation
      const result = await useCase.execute(dtoWithoutConsents, 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(mockPatientRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('constructor', () => {
    it('should throw error if PatientRepository is not provided', () => {
      expect(() => {
        new CreatePatientUseCase(
          null as unknown as IPatientRepository,
          mockAuditService as unknown as IAuditService,
        );
      }).toThrow('PatientRepository is required');
    });

    it('should throw error if AuditService is not provided', () => {
      expect(() => {
        new CreatePatientUseCase(
          mockPatientRepository as unknown as IPatientRepository,
          null as unknown as IAuditService,
        );
      }).toThrow('AuditService is required');
    });
  });
});
