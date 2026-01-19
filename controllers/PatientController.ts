import { CreatePatientUseCase } from '../application/use-cases/CreatePatientUseCase';
import { CreatePatientDto } from '../application/dtos/CreatePatientDto';
import { PatientResponseDto } from '../application/dtos/PatientResponseDto';
import { ControllerRequest, ControllerResponse } from './types';
import { DomainException } from '../domain/exceptions/DomainException';
import { RbacMiddleware } from './middleware/RbacMiddleware';

/**
 * Controller: PatientController
 * 
 * Handles patient-related HTTP requests.
 * 
 * Responsibilities:
 * - Create patient
 * - Get patient by ID
 * - Input validation
 * - Permission checking via RBAC
 * - Error handling
 * 
 * Clean Architecture Rule: This controller depends on application use cases,
 * not on domain entities directly. It translates HTTP requests to use case calls.
 */
export class PatientController {
  constructor(private readonly createPatientUseCase: CreatePatientUseCase) {}

  /**
   * Handles patient creation request
   * 
   * POST /api/patients
   * 
   * Requires authentication and permission check.
   * 
   * @param req - Controller request with body containing CreatePatientDto and auth context
   * @returns ControllerResponse with PatientResponseDto or error
   */
  async createPatient(req: ControllerRequest): Promise<ControllerResponse> {
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
      RbacMiddleware.requirePermission(req.auth, 'patient', 'create');

      // 3. Validate request body
      const body = req.body as CreatePatientDto;

      if (!body || !body.id || !body.firstName || !body.lastName || !body.email || !body.phone) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Required fields: id, firstName, lastName, email, phone',
          },
        };
      }

      // 4. Execute create patient use case
      const response: PatientResponseDto = await this.createPatientUseCase.execute(body, req.auth.userId);

      // 5. Return success response
      return {
        status: 201,
        body: {
          success: true,
          data: response,
          message: 'Patient created successfully',
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
