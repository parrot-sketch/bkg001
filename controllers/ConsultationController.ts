import { StartConsultationUseCase } from '../application/use-cases/StartConsultationUseCase';
import { CompleteConsultationUseCase } from '../application/use-cases/CompleteConsultationUseCase';
import { StartConsultationDto } from '../application/dtos/StartConsultationDto';
import { CompleteConsultationDto } from '../application/dtos/CompleteConsultationDto';
import { AppointmentResponseDto } from '../application/dtos/AppointmentResponseDto';
import { ControllerRequest, ControllerResponse } from '../lib/auth/types';
import { DomainException } from '../domain/exceptions/DomainException';
import { RbacMiddleware } from '../lib/auth/rbac';

/**
 * Controller: ConsultationController
 * 
 * Handles consultation-related HTTP requests.
 * 
 * Responsibilities:
 * - Start consultation
 * - Complete consultation
 * - Input validation
 * - Permission checking via RBAC
 * - Error handling
 * 
 * Clean Architecture Rule: This controller depends on application use cases,
 * not on domain entities directly. It translates HTTP requests to use case calls.
 */
export class ConsultationController {
  constructor(
    private readonly startConsultationUseCase: StartConsultationUseCase,
    private readonly completeConsultationUseCase: CompleteConsultationUseCase,
  ) { }

  /**
   * Handles consultation start request
   * 
   * POST /api/consultations/:id/start
   * 
   * Requires authentication and permission check.
   * 
   * @param req - Controller request with params containing appointmentId, body with notes, and auth context
   * @returns ControllerResponse with AppointmentResponseDto or error
   */
  async startConsultation(req: ControllerRequest): Promise<ControllerResponse> {
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
      RbacMiddleware.requirePermission(req.auth, 'consultation', 'start');

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

      // 4. Extract doctor notes from body
      const body = req.body as { doctorNotes?: string };

      // 5. Execute start consultation use case
      const dto: StartConsultationDto = {
        appointmentId: parseInt(appointmentId, 10),
        doctorId: req.auth.userId,
        userId: req.auth.userId,
        doctorNotes: body?.doctorNotes,
      };

      const response: AppointmentResponseDto = await this.startConsultationUseCase.execute(dto);

      // 6. Return success response
      return {
        status: 200,
        body: {
          success: true,
          data: response,
          message: 'Consultation started successfully',
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
   * Handles consultation completion request
   * 
   * POST /api/consultations/:id/complete
   * 
   * Requires authentication and permission check.
   * 
   * @param req - Controller request with params containing appointmentId, body with outcome, and auth context
   * @returns ControllerResponse with AppointmentResponseDto or error
   */
  async completeConsultation(req: ControllerRequest): Promise<ControllerResponse> {
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
      RbacMiddleware.requirePermission(req.auth, 'consultation', 'complete');

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

      // 4. Validate request body
      const body = req.body as {
        outcome: string;
        outcomeType: string;
        followUpDate?: Date;
        followUpTime?: string;
        followUpType?: string;
      };

      if (!body || !body.outcome) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Outcome is required',
          },
        };
      }

      if (!body.outcomeType) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Outcome type is required',
          },
        };
      }

      // 5. Execute complete consultation use case
      const dto: CompleteConsultationDto = {
        appointmentId: parseInt(appointmentId, 10),
        doctorId: req.auth.userId,
        outcome: body.outcome,
        outcomeType: body.outcomeType as any,
        followUpDate: body.followUpDate,
        followUpTime: body.followUpTime,
        followUpType: body.followUpType,
      };

      const response: AppointmentResponseDto = await this.completeConsultationUseCase.execute(dto);

      // 6. Return success response
      return {
        status: 200,
        body: {
          success: true,
          data: response,
          message: 'Consultation completed successfully',
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
