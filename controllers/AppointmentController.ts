import { ScheduleAppointmentUseCase } from '../application/use-cases/ScheduleAppointmentUseCase';
import { CheckInPatientUseCase } from '../application/use-cases/CheckInPatientUseCase';
import { ScheduleAppointmentDto } from '../application/dtos/ScheduleAppointmentDto';
import { CheckInPatientDto } from '../application/dtos/CheckInPatientDto';
import { AppointmentResponseDto } from '../application/dtos/AppointmentResponseDto';
import { ControllerRequest, ControllerResponse } from './types';
import { DomainException } from '../domain/exceptions/DomainException';
import { RbacMiddleware } from './middleware/RbacMiddleware';

/**
 * Controller: AppointmentController
 * 
 * Handles appointment-related HTTP requests.
 * 
 * Responsibilities:
 * - Schedule appointment
 * - Check in patient
 * - Get appointments
 * - Input validation
 * - Permission checking via RBAC
 * - Error handling
 * 
 * Clean Architecture Rule: This controller depends on application use cases,
 * not on domain entities directly. It translates HTTP requests to use case calls.
 */
export class AppointmentController {
  constructor(
    private readonly scheduleAppointmentUseCase: ScheduleAppointmentUseCase,
    private readonly checkInPatientUseCase: CheckInPatientUseCase,
  ) {}

  /**
   * Handles appointment scheduling request
   * 
   * POST /api/appointments
   * 
   * Requires authentication and permission check.
   * 
   * @param req - Controller request with body containing ScheduleAppointmentDto and auth context
   * @returns ControllerResponse with AppointmentResponseDto or error
   */
  async scheduleAppointment(req: ControllerRequest): Promise<ControllerResponse> {
    try {
      // 1. Require authentication
      if (!req.auth) {
        return {
          status: 401,
          body: {
            success: false,
            error: 'Authentication required',
          },
        };
      }

      // 2. Check permissions
      RbacMiddleware.requirePermission(req.auth, 'appointment', 'create');

      // 3. Validate request body
      const body = req.body as ScheduleAppointmentDto;

      if (!body || !body.patientId || !body.doctorId || !body.appointmentDate || !body.time || !body.type) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Required fields: patientId, doctorId, appointmentDate, time, type',
          },
        };
      }

      // 4. Execute schedule appointment use case
      const response: AppointmentResponseDto = await this.scheduleAppointmentUseCase.execute(body, req.auth.userId);

      // 5. Return success response
      return {
        status: 201,
        body: {
          success: true,
          data: response,
          message: 'Appointment scheduled successfully',
        },
      };
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof DomainException) {
        return {
          status: 400,
          body: {
            success: false,
            error: error.message,
          },
        };
      }

      // Handle permission errors
      if (error instanceof Error && error.message.includes('Access denied')) {
        return {
          status: 403,
          body: {
            success: false,
            error: error.message,
          },
        };
      }

      // Handle unexpected errors
      return {
        status: 500,
        body: {
          success: false,
          error: 'Internal server error',
        },
      };
    }
  }

  /**
   * Handles patient check-in request
   * 
   * POST /api/appointments/:id/checkin
   * 
   * Requires authentication and permission check.
   * 
   * @param req - Controller request with params containing appointmentId and auth context
   * @returns ControllerResponse with AppointmentResponseDto or error
   */
  async checkInPatient(req: ControllerRequest): Promise<ControllerResponse> {
    try {
      // 1. Require authentication
      if (!req.auth) {
        return {
          status: 401,
          body: {
            success: false,
            error: 'Authentication required',
          },
        };
      }

      // 2. Check permissions
      RbacMiddleware.requirePermission(req.auth, 'appointment', 'checkin');

      // 3. Extract appointment ID from params
      const appointmentId = req.params?.id;

      if (!appointmentId) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Appointment ID is required',
          },
        };
      }

      // 4. Execute check-in use case
      const dto: CheckInPatientDto = {
        appointmentId: parseInt(appointmentId, 10),
        userId: req.auth.userId,
      };

      const response: AppointmentResponseDto = await this.checkInPatientUseCase.execute(dto);

      // 5. Return success response
      return {
        status: 200,
        body: {
          success: true,
          data: response,
          message: 'Patient checked in successfully',
        },
      };
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof DomainException) {
        return {
          status: 400,
          body: {
            success: false,
            error: error.message,
          },
        };
      }

      // Handle permission errors
      if (error instanceof Error && error.message.includes('Access denied')) {
        return {
          status: 403,
          body: {
            success: false,
            error: error.message,
          },
        };
      }

      // Handle unexpected errors
      return {
        status: 500,
        body: {
          success: false,
          error: 'Internal server error',
        },
      };
    }
  }
}
