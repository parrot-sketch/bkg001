/**
 * Unit Tests: LoginUseCase
 * 
 * Tests the login use case in isolation with mocked dependencies.
 * Ensures business logic correctness and proper error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUseCase } from '../../../application/use-cases/LoginUseCase';
import { IAuthService, JWTToken } from '../../../domain/interfaces/services/IAuthService';
import { IUserRepository } from '../../../domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '../../../domain/interfaces/services/IAuditService';
import { Email } from '../../../domain/value-objects/Email';
import { User } from '../../../domain/entities/User';
import { Role } from '../../../domain/enums/Role';
import { Status } from '../../../domain/enums/Status';
import { DomainException } from '../../../domain/exceptions/DomainException';
import { LoginDto } from '../../../application/dtos/LoginDto';

describe('LoginUseCase', () => {
  let mockAuthService: IAuthService;
  let mockUserRepository: IUserRepository;
  let mockAuditService: IAuditService;
  let loginUseCase: LoginUseCase;

  beforeEach(() => {
    // Create mocks
    mockAuthService = {
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      hashPassword: vi.fn(),
      verifyPassword: vi.fn(),
      verifyAccessToken: vi.fn(),
    } as unknown as IAuthService;

    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    } as unknown as IUserRepository;

    mockAuditService = {
      recordEvent: vi.fn(),
    } as unknown as IAuditService;

    loginUseCase = new LoginUseCase(
      mockAuthService,
      mockUserRepository,
      mockAuditService,
    );
  });

  describe('Successful Login', () => {
    it('should successfully authenticate a user with valid credentials', async () => {
      // Arrange
      const email = Email.create('test@example.com');
      const password = 'SecurePassword123!';
      const dto: LoginDto = {
        email: email.getValue(),
        password,
      };

      const mockUser = User.create({
        id: 'user-123',
        email,
        passwordHash: 'hashed-password',
        role: Role.PATIENT,
        status: Status.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockTokens: JWTToken = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      vi.mocked(mockAuthService.login).mockResolvedValue(mockTokens);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      const result = await loginUseCase.execute(dto);

      // Assert
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: Role.PATIENT,
          firstName: undefined,
          lastName: undefined,
        },
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(email, password);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        recordId: 'user-123',
        action: 'LOGIN',
        model: 'User',
        details: 'User test@example.com logged in successfully',
      });
    });

    it('should include user first and last name in response when available', async () => {
      // Arrange
      const email = Email.create('doctor@example.com');
      const dto: LoginDto = {
        email: email.getValue(),
        password: 'Password123!',
      };

      const mockUser = User.create({
        id: 'doctor-123',
        email,
        passwordHash: 'hashed',
        role: Role.DOCTOR,
        status: Status.ACTIVE,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockTokens: JWTToken = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      };

      vi.mocked(mockAuthService.login).mockResolvedValue(mockTokens);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      const result = await loginUseCase.execute(dto);

      // Assert
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
    });
  });

  describe('Authentication Failures', () => {
    it('should throw DomainException when authentication fails', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      vi.mocked(mockAuthService.login).mockRejectedValue(
        new DomainException('Invalid credentials')
      );

      // Act & Assert
      await expect(loginUseCase.execute(dto)).rejects.toThrow(DomainException);
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });

    it('should throw DomainException when user is not found after authentication', async () => {
      // Arrange
      const email = Email.create('test@example.com');
      const dto: LoginDto = {
        email: email.getValue(),
        password: 'password',
      };

      const mockTokens: JWTToken = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      };

      vi.mocked(mockAuthService.login).mockResolvedValue(mockTokens);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      // Act & Assert
      await expect(loginUseCase.execute(dto)).rejects.toThrow(DomainException);
      expect(mockAuthService.login).toHaveBeenCalled();
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'invalid-email',
        password: 'password',
      };

      // Act & Assert
      await expect(loginUseCase.execute(dto)).rejects.toThrow();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    it('should record audit event after successful login', async () => {
      // Arrange
      const email = Email.create('user@example.com');
      const dto: LoginDto = {
        email: email.getValue(),
        password: 'password',
      };

      const mockUser = User.create({
        id: 'user-456',
        email,
        passwordHash: 'hash',
        role: Role.NURSE,
        status: Status.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockTokens: JWTToken = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      };

      vi.mocked(mockAuthService.login).mockResolvedValue(mockTokens);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      await loginUseCase.execute(dto);

      // Assert
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith({
        userId: 'user-456',
        recordId: 'user-456',
        action: 'LOGIN',
        model: 'User',
        details: 'User user@example.com logged in successfully',
      });
    });

    it('should not record audit event when authentication fails', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong',
      };

      vi.mocked(mockAuthService.login).mockRejectedValue(
        new DomainException('Invalid credentials')
      );

      // Act & Assert
      await expect(loginUseCase.execute(dto)).rejects.toThrow();
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });
  });
});
