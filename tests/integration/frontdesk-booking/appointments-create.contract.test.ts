/**
 * Integration Tests: POST /api/appointments
 *
 * Contract tests for appointment creation API route.
 * Validates ApiResponse<T> structure, HTTP status codes, role-based source enforcement,
 * and conflict detection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/appointments/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/application/errors';
import { ApiErrorCode } from '@/lib/http/apiResponse';
import {
  assertSuccess,
  assertError,
  assertErrorCode,
  unwrapApiData,
} from '../../helpers/apiResponseAssertions';

// Mock JWT middleware
vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: {
    authenticate: vi.fn(),
  },
}));

// Mock use case factory
vi.mock('@/lib/use-cases', () => ({
  getScheduleAppointmentUseCase: vi.fn(),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import { getScheduleAppointmentUseCase } from '@/lib/use-cases';

describe('POST /api/appointments', () => {
  let mockScheduleAppointmentUseCase: {
    execute: ReturnType<typeof vi.fn>;
  };

  const validRequest = {
    patientId: '123e4567-e89b-12d3-a456-426614174000',
    doctorId: '123e4567-e89b-12d3-a456-426614174001',
    appointmentDate: new Date('2025-12-31'),
    time: '14:30',
    type: 'Consultation',
  };

  const mockAppointmentResponse = {
    id: 1,
    patientId: validRequest.patientId,
    doctorId: validRequest.doctorId,
    appointmentDate: validRequest.appointmentDate,
    time: validRequest.time,
    status: AppointmentStatus.SCHEDULED,
    type: validRequest.type,
    note: null,
    reason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockScheduleAppointmentUseCase = {
      execute: vi.fn(),
    };

    (getScheduleAppointmentUseCase as ReturnType<typeof vi.fn>).mockReturnValue(
      mockScheduleAppointmentUseCase
    );
  });

  const createMockRequest = (
    body: unknown,
    userRole: Role = Role.FRONTDESK,
    isAuthenticated: boolean = true
  ) => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: isAuthenticated,
      user: isAuthenticated
        ? {
            userId: 'user-1',
            email: 'test@example.com',
            role: userRole,
          }
        : undefined,
    });

    return new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: isAuthenticated ? 'Bearer test-token' : '',
      },
    });
  };

  describe('Success Cases', () => {
    it('should return 201 with SCHEDULED status for FRONTDESK booking', async () => {
      // Arrange
      const request = createMockRequest({
        ...validRequest,
        source: AppointmentSource.FRONTDESK_SCHEDULED,
        bookingChannel: BookingChannel.DASHBOARD,
      });

      mockScheduleAppointmentUseCase.execute.mockResolvedValue(mockAppointmentResponse);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      assertSuccess<{ status: AppointmentStatus; patientId: string; doctorId: string }>(data);
      const result = unwrapApiData(data);
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
      expect(result.patientId).toBe(validRequest.patientId);
      expect(result.doctorId).toBe(validRequest.doctorId);
      expect(mockScheduleAppointmentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          source: AppointmentSource.FRONTDESK_SCHEDULED,
          bookingChannel: BookingChannel.DASHBOARD,
        }),
        'user-1',
        Role.FRONTDESK
      );
    });

    it('should return 201 with PENDING_DOCTOR_CONFIRMATION for PATIENT booking', async () => {
      // Arrange
      const request = createMockRequest(
        {
          ...validRequest,
          source: AppointmentSource.PATIENT_REQUESTED,
        },
        Role.PATIENT
      );

      const patientResponse = {
        ...mockAppointmentResponse,
        status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
      };

      mockScheduleAppointmentUseCase.execute.mockResolvedValue(patientResponse);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      assertSuccess<{ status: AppointmentStatus }>(data);
      const result = unwrapApiData(data);
      expect(result.status).toBe(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 403 if not authenticated', async () => {
      // Arrange
      const request = createMockRequest(validRequest, Role.FRONTDESK, false);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      assertErrorCode(data, ApiErrorCode.FORBIDDEN);
      expect((data as { error: string }).error).toContain('Authentication required');
    });

    it('should return 403 if FRONTDESK tries to create DOCTOR_FOLLOW_UP', async () => {
      // Arrange
      const request = createMockRequest({
        ...validRequest,
        source: AppointmentSource.DOCTOR_FOLLOW_UP,
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      assertErrorCode(data, ApiErrorCode.FORBIDDEN);
      expect((data as { error: string }).error).toContain('Frontdesk cannot create doctor follow-up appointments');
    });

    it('should return 403 if PATIENT tries to create non-PATIENT_REQUESTED', async () => {
      // Arrange
      const request = createMockRequest(
        {
          ...validRequest,
          source: AppointmentSource.FRONTDESK_SCHEDULED,
        },
        Role.PATIENT
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      assertErrorCode(data, ApiErrorCode.FORBIDDEN);
      expect((data as { error: string }).error).toContain('Patients can only create patient-requested appointments');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid request body (missing fields)', async () => {
      // Arrange
      const request = createMockRequest({
        patientId: validRequest.patientId,
        // Missing required fields
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      assertError(data, ApiErrorCode.VALIDATION_ERROR);
    });

    it('should return 400 for invalid UUID', async () => {
      // Arrange
      const request = createMockRequest({
        ...validRequest,
        patientId: 'not-a-uuid',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      assertError(data, ApiErrorCode.VALIDATION_ERROR);
    });

    it('should return 400 for past date', async () => {
      // Arrange
      const request = createMockRequest({
        ...validRequest,
        appointmentDate: new Date('2020-01-01'),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      assertError(data, ApiErrorCode.VALIDATION_ERROR);
    });

    it('should return 400 for invalid time format', async () => {
      // Arrange
      const request = createMockRequest({
        ...validRequest,
        time: '2:30 PM', // Invalid, should be HH:mm
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      assertError(data, ApiErrorCode.VALIDATION_ERROR);
    });
  });

  describe('Conflict Errors', () => {
    it('should return 409 for appointment conflict', async () => {
      // Arrange
      const request = createMockRequest(validRequest);

      mockScheduleAppointmentUseCase.execute.mockRejectedValue(
        new ConflictError('Appointment time is not available: Slot is already booked')
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      assertErrorCode(data, ApiErrorCode.CONFLICT);
      expect((data as { error: string }).error).toContain('Slot is already booked');
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 if patient not found', async () => {
      // Arrange
      const request = createMockRequest(validRequest);

      mockScheduleAppointmentUseCase.execute.mockRejectedValue(
        new NotFoundError('Patient with ID xyz not found', 'Patient', 'xyz')
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      assertErrorCode(data, ApiErrorCode.NOT_FOUND);
      expect((data as { error: string }).error).toContain('Patient with ID xyz not found');
    });
  });

  describe('Source Defaults', () => {
    it('should default to FRONTDESK_SCHEDULED for FRONTDESK when source not provided', async () => {
      // Arrange
      const request = createMockRequest(validRequest); // No source provided

      mockScheduleAppointmentUseCase.execute.mockResolvedValue(mockAppointmentResponse);

      // Act
      await POST(request);

      // Assert
      expect(mockScheduleAppointmentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          source: AppointmentSource.FRONTDESK_SCHEDULED,
        }),
        'user-1',
        Role.FRONTDESK
      );
    });

    it('should default to ADMIN_SCHEDULED for ADMIN when source not provided', async () => {
      // Arrange
      const request = createMockRequest(validRequest, Role.ADMIN);

      mockScheduleAppointmentUseCase.execute.mockResolvedValue(mockAppointmentResponse);

      // Act
      await POST(request);

      // Assert
      expect(mockScheduleAppointmentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          source: AppointmentSource.ADMIN_SCHEDULED,
        }),
        'user-1',
        Role.ADMIN
      );
    });
  });
});
