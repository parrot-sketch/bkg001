import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientController } from '../../../controllers/PatientController';
import { CreatePatientUseCase } from '../../../application/use-cases/CreatePatientUseCase';
import { ControllerRequest } from '../../../controllers/types';
import { DomainException } from '../../../domain/exceptions/DomainException';
import { Role } from '../../../domain/enums/Role';
import { Gender } from '../../../domain/enums/Gender';

describe('PatientController', () => {
  let mockCreatePatientUseCase: CreatePatientUseCase;
  let patientController: PatientController;

  beforeEach(() => {
    mockCreatePatientUseCase = {
      execute: vi.fn(),
    } as unknown as CreatePatientUseCase;

    patientController = new PatientController(mockCreatePatientUseCase);
  });

  describe('createPatient', () => {
    it('should successfully create a patient', async () => {
      // Arrange
      const createPatientDto = {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.MALE,
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        maritalStatus: 'Single',
        emergencyContactName: 'Jane Doe',
        emergencyContactNumber: '+1234567891',
        relation: 'Sister',
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
      };

      const expectedResponse = {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.MALE,
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        maritalStatus: 'Single',
        emergencyContactName: 'Jane Doe',
        emergencyContactNumber: '+1234567891',
        relation: 'Sister',
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        age: 34,
        isMinor: false,
      };

      vi.mocked(mockCreatePatientUseCase.execute).mockResolvedValue(expectedResponse);

      const req: ControllerRequest = {
        body: createPatientDto,
        auth: {
          userId: 'user-1',
          email: 'frontdesk@example.com',
          role: Role.FRONTDESK,
        },
      };

      // Act
      const response = await patientController.createPatient(req);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedResponse);
      expect(mockCreatePatientUseCase.execute).toHaveBeenCalledWith(createPatientDto, 'user-1');
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      const req: ControllerRequest = {
        body: { firstName: 'John' }, // Missing required fields
        auth: {
          userId: 'user-1',
          email: 'frontdesk@example.com',
          role: Role.FRONTDESK,
        },
      };

      // Act
      const response = await patientController.createPatient(req);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Required fields');
    });

    it('should return 401 if not authenticated', async () => {
      // Arrange
      const req: ControllerRequest = {
        body: {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
      };

      // Act
      const response = await patientController.createPatient(req);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 400 for domain exceptions', async () => {
      // Arrange
      const createPatientDto = {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email', // Invalid email
        phone: '+1234567890',
      };

      const domainException = new DomainException('Invalid email format', {});

      vi.mocked(mockCreatePatientUseCase.execute).mockRejectedValue(domainException);

      const req: ControllerRequest = {
        body: createPatientDto,
        auth: {
          userId: 'user-1',
          email: 'frontdesk@example.com',
          role: Role.FRONTDESK,
        },
      };

      // Act
      const response = await patientController.createPatient(req);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email format');
    });
  });
});
