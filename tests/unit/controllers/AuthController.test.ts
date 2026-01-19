import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../../controllers/AuthController';
import { LoginUseCase } from '../../../application/use-cases/LoginUseCase';
import { RegisterUserUseCase } from '../../../application/use-cases/RegisterUserUseCase';
import { RegisterPublicUserUseCase } from '../../../application/use-cases/RegisterPublicUserUseCase';
import { RefreshTokenUseCase } from '../../../application/use-cases/RefreshTokenUseCase';
import { LogoutUseCase } from '../../../application/use-cases/LogoutUseCase';
import { JwtMiddleware } from '../../../controllers/middleware/JwtMiddleware';
import { ControllerRequest } from '../../../controllers/types';
import { DomainException } from '../../../domain/exceptions/DomainException';
import { Role } from '../../../domain/enums/Role';

describe('AuthController', () => {
  let mockLoginUseCase: LoginUseCase;
  let mockRegisterUserUseCase: RegisterUserUseCase;
  let mockRegisterPublicUserUseCase: RegisterPublicUserUseCase;
  let mockRefreshTokenUseCase: RefreshTokenUseCase;
  let mockLogoutUseCase: LogoutUseCase;
  let mockJwtMiddleware: JwtMiddleware;
  let authController: AuthController;

  beforeEach(() => {
    mockLoginUseCase = {
      execute: vi.fn(),
    } as unknown as LoginUseCase;

    mockRegisterUserUseCase = {
      execute: vi.fn(),
    } as unknown as RegisterUserUseCase;

    mockRegisterPublicUserUseCase = {
      execute: vi.fn(),
    } as unknown as RegisterPublicUserUseCase;

    mockRefreshTokenUseCase = {
      execute: vi.fn(),
    } as unknown as RefreshTokenUseCase;

    mockLogoutUseCase = {
      execute: vi.fn(),
    } as unknown as LogoutUseCase;

    mockJwtMiddleware = {
      authenticate: vi.fn(),
      verifyToken: vi.fn(),
    } as unknown as JwtMiddleware;

    authController = new AuthController(
      mockLoginUseCase,
      mockRegisterUserUseCase,
      mockRegisterPublicUserUseCase,
      mockRefreshTokenUseCase,
      mockLogoutUseCase,
      mockJwtMiddleware,
    );
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const expectedResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.DOCTOR,
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      vi.mocked(mockLoginUseCase.execute).mockResolvedValue(expectedResponse);

      const req: ControllerRequest = {
        body: loginDto,
      };

      // Act
      const response = await authController.login(req);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedResponse);
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith(loginDto);
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'wrong-password' };
      const domainException = new DomainException('Invalid email or password', {});

      vi.mocked(mockLoginUseCase.execute).mockRejectedValue(domainException);

      const req: ControllerRequest = {
        body: loginDto,
      };

      // Act
      const response = await authController.login(req);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 400 for missing email or password', async () => {
      // Arrange
      const req: ControllerRequest = {
        body: { email: 'test@example.com' }, // Missing password
      };

      // Act
      const response = await authController.login(req);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const registerDto = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'password123',
        role: Role.DOCTOR,
        firstName: 'John',
        lastName: 'Doe',
      };
      const expectedResponse = {
        id: 'user-1',
        email: 'test@example.com',
        role: Role.DOCTOR,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
      };

      vi.mocked(mockRegisterUserUseCase.execute).mockResolvedValue(expectedResponse);

      const req: ControllerRequest = {
        body: registerDto,
        auth: {
          userId: 'admin-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
      };

      // Act
      const response = await authController.register(req);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedResponse);
      expect(mockRegisterUserUseCase.execute).toHaveBeenCalledWith(registerDto, 'admin-1');
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      const req: ControllerRequest = {
        body: { email: 'test@example.com' }, // Missing id, password, role
        auth: {
          userId: 'admin-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
      };

      // Act
      const response = await authController.register(req);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ID, email, password, and role are required');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      // Arrange
      const refreshDto = { refreshToken: 'refresh-token' };
      const expectedResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      vi.mocked(mockRefreshTokenUseCase.execute).mockResolvedValue(expectedResponse);

      const req: ControllerRequest = {
        body: refreshDto,
      };

      // Act
      const response = await authController.refreshToken(req);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedResponse);
    });

    it('should return 401 for invalid refresh token', async () => {
      // Arrange
      const refreshDto = { refreshToken: 'invalid-token' };
      const domainException = new DomainException('Refresh token has expired', {});

      vi.mocked(mockRefreshTokenUseCase.execute).mockRejectedValue(domainException);

      const req: ControllerRequest = {
        body: refreshDto,
      };

      // Act
      const response = await authController.refreshToken(req);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Refresh token has expired');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      // Arrange
      vi.mocked(mockLogoutUseCase.execute).mockResolvedValue(undefined);

      const req: ControllerRequest = {
        auth: {
          userId: 'user-1',
          email: 'test@example.com',
          role: Role.DOCTOR,
        },
      };

      // Act
      const response = await authController.logout(req);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith('user-1');
    });

    it('should return 401 if not authenticated', async () => {
      // Arrange
      const req: ControllerRequest = {};

      // Act
      const response = await authController.logout(req);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('registerPublic', () => {
    it('should successfully register a new user via public signup', async () => {
      // Arrange
      const publicRegisterDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
      };
      const expectedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: Role.PATIENT, // Always PATIENT
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
      };

      vi.mocked(mockRegisterPublicUserUseCase.execute).mockResolvedValue(expectedResponse);

      const req: ControllerRequest = {
        body: publicRegisterDto,
        // Note: No auth required for public signup
      };

      // Act
      const response = await authController.registerPublic(req);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedResponse);
      expect(response.body.data.role).toBe(Role.PATIENT); // Always PATIENT
      expect(mockRegisterPublicUserUseCase.execute).toHaveBeenCalledWith(publicRegisterDto);
    });

    it('should return 400 for missing email or password', async () => {
      // Arrange
      const req: ControllerRequest = {
        body: { email: 'test@example.com' }, // Missing password
      };

      // Act
      const response = await authController.registerPublic(req);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should return 400 for domain exceptions (validation errors)', async () => {
      // Arrange
      const publicRegisterDto = {
        email: 'invalid-email',
        password: 'StrongPassword123',
      };

      const domainException = new DomainException('Email address format is invalid', {});
      vi.mocked(mockRegisterPublicUserUseCase.execute).mockRejectedValue(domainException);

      const req: ControllerRequest = {
        body: publicRegisterDto,
      };

      // Act
      const response = await authController.registerPublic(req);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email address format is invalid');
    });

    it('should return generic error for duplicate email (no user enumeration)', async () => {
      // Arrange
      const publicRegisterDto = {
        email: 'existing@example.com',
        password: 'StrongPassword123',
      };

      // Use case returns generic error for duplicate email
      const domainException = new DomainException('Unable to complete registration. Please try again.', {});
      vi.mocked(mockRegisterPublicUserUseCase.execute).mockRejectedValue(domainException);

      const req: ControllerRequest = {
        body: publicRegisterDto,
      };

      // Act
      const response = await authController.registerPublic(req);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      // Verify generic error message (does not reveal email exists)
      expect(response.body.error).toBe('Unable to complete registration. Please try again.');
      expect(response.body.error.toLowerCase()).not.toContain('email');
      expect(response.body.error.toLowerCase()).not.toContain('already exists');
    });

    it('should not require authentication (public endpoint)', async () => {
      // Arrange
      const publicRegisterDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
      };
      const expectedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: Role.PATIENT,
        createdAt: new Date(),
      };

      vi.mocked(mockRegisterPublicUserUseCase.execute).mockResolvedValue(expectedResponse);

      const req: ControllerRequest = {
        body: publicRegisterDto,
        // No auth property - endpoint should work without authentication
      };

      // Act
      const response = await authController.registerPublic(req);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      // Should succeed without auth requirement
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
      const publicRegisterDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
      };

      vi.mocked(mockRegisterPublicUserUseCase.execute).mockRejectedValue(
        new Error('Unexpected database error'),
      );

      const req: ControllerRequest = {
        body: publicRegisterDto,
      };

      // Act
      const response = await authController.registerPublic(req);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});
