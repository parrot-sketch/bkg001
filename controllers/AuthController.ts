import { LoginUseCase } from '../application/use-cases/LoginUseCase';
import { RegisterUserUseCase } from '../application/use-cases/RegisterUserUseCase';
import { RegisterPublicUserUseCase } from '../application/use-cases/RegisterPublicUserUseCase';
import { RefreshTokenUseCase } from '../application/use-cases/RefreshTokenUseCase';
import { LogoutUseCase } from '../application/use-cases/LogoutUseCase';
import { LoginDto, LoginResponseDto } from '../application/dtos/LoginDto';
import { RegisterUserDto, RegisterUserResponseDto } from '../application/dtos/RegisterUserDto';
import { PublicRegisterUserDto, PublicRegisterUserResponseDto } from '../application/dtos/PublicRegisterUserDto';
import { RefreshTokenDto, RefreshTokenResponseDto } from '../application/dtos/RefreshTokenDto';
import { ControllerRequest, ControllerResponse, ApiResponse } from './types';
import { DomainException } from '../domain/exceptions/DomainException';
import { JwtMiddleware } from './middleware/JwtMiddleware';
import { RbacMiddleware } from './middleware/RbacMiddleware';
import { Role } from '../domain/enums/Role';

/**
 * Controller: AuthController
 * 
 * Handles authentication-related HTTP requests.
 * 
 * Responsibilities:
 * - User login
 * - User registration
 * - Token refresh
 * - User logout
 * - Input validation
 * - Error handling
 * 
 * Clean Architecture Rule: This controller depends on application use cases,
 * not on domain entities directly. It translates HTTP requests to use case calls.
 */
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly registerPublicUserUseCase: RegisterPublicUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly jwtMiddleware: JwtMiddleware,
  ) {}

  /**
   * Handles user login request
   * 
   * POST /api/auth/login
   * 
   * @param req - Controller request with body containing LoginDto
   * @returns ControllerResponse with LoginResponseDto or error
   */
  async login(req: ControllerRequest): Promise<ControllerResponse> {
    try {
      // 1. Validate request body
      const body = req.body as LoginDto;

      if (!body || !body.email || !body.password) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Email and password are required',
          },
        };
      }

      // 2. Execute login use case
      const response: LoginResponseDto = await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
      });

      // 3. Return success response
      return {
        status: 200,
        body: {
          success: true,
          data: response,
        },
      };
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof DomainException) {
        return {
          status: 401,
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
   * Handles user registration request
   * 
   * POST /api/auth/register
   * 
   * @param req - Controller request with body containing RegisterUserDto
   * @returns ControllerResponse with RegisterUserResponseDto or error
   */
  async register(req: ControllerRequest): Promise<ControllerResponse> {
    try {
      // 1. Validate request body
      const body = req.body as RegisterUserDto;

      if (!body || !body.id || !body.email || !body.password || !body.role) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'ID, email, password, and role are required',
          },
        };
      }

      // 2. Check permissions (only ADMIN can register new users)
      if (req.auth) {
        RbacMiddleware.requirePermission(req.auth, 'user', 'create', [
          { resource: 'user', action: 'create', allowedRoles: [Role.ADMIN] },
        ]);
      }

      // 3. Execute registration use case (registeredByUserId defaults to system/admin)
      const registeredByUserId = req.auth?.userId ?? 'system';

      const response: RegisterUserResponseDto = await this.registerUserUseCase.execute(body, registeredByUserId);

      // 4. Return success response
      return {
        status: 201,
        body: {
          success: true,
          data: response,
          message: 'User registered successfully',
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
   * Handles public user registration request (self-registration)
   * 
   * POST /api/auth/register/public
   * 
   * This endpoint is UNAUTHENTICATED - anyone can self-register.
   * Security:
   * - Role is always PATIENT (cannot be overridden)
   * - UUID is generated server-side
   * - Password strength is enforced
   * - Generic error messages (no user enumeration)
   * 
   * @param req - Controller request with body containing PublicRegisterUserDto
   * @returns ControllerResponse with PublicRegisterUserResponseDto or error
   */
  async registerPublic(req: ControllerRequest): Promise<ControllerResponse> {
    try {
      // 1. Validate request body
      const body = req.body as PublicRegisterUserDto;

      if (!body || !body.email || !body.password) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Email and password are required',
          },
        };
      }

      // 2. Execute public registration use case
      // Note: No authentication required - this is public signup
      // Role is automatically set to PATIENT in use case
      const response: PublicRegisterUserResponseDto = await this.registerPublicUserUseCase.execute(body);

      // 3. Return success response
      return {
        status: 201,
        body: {
          success: true,
          data: response,
          message: 'Registration successful',
        },
      };
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof DomainException) {
        // Return generic error message (prevents user enumeration)
        // The use case already ensures generic messages for security-sensitive errors
        return {
          status: 400,
          body: {
            success: false,
            error: error.message, // Use case ensures this is generic
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
   * Handles token refresh request
   * 
   * POST /api/auth/refresh
   * 
   * @param req - Controller request with body containing RefreshTokenDto
   * @returns ControllerResponse with RefreshTokenResponseDto or error
   */
  async refreshToken(req: ControllerRequest): Promise<ControllerResponse> {
    try {
      // 1. Validate request body
      const body = req.body as RefreshTokenDto;

      if (!body || !body.refreshToken) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Refresh token is required',
          },
        };
      }

      // 2. Execute refresh token use case
      const response: RefreshTokenResponseDto = await this.refreshTokenUseCase.execute({
        refreshToken: body.refreshToken,
      });

      // 3. Return success response
      return {
        status: 200,
        body: {
          success: true,
          data: response,
        },
      };
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof DomainException) {
        return {
          status: 401,
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
   * Handles user logout request
   * 
   * POST /api/auth/logout
   * 
   * Requires authentication via JWT middleware.
   * 
   * @param req - Controller request with authenticated user context
   * @returns ControllerResponse with success or error
   */
  async logout(req: ControllerRequest): Promise<ControllerResponse> {
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

      // 2. Execute logout use case
      await this.logoutUseCase.execute(req.auth.userId);

      // 3. Return success response
      return {
        status: 200,
        body: {
          success: true,
          message: 'Logged out successfully',
        },
      };
    } catch (error) {
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
