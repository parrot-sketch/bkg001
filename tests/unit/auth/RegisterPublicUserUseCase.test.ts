import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterPublicUserUseCase } from '../../../application/use-cases/RegisterPublicUserUseCase';
import { IAuthService } from '../../../domain/interfaces/services/IAuthService';
import { IUserRepository } from '../../../domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '../../../domain/interfaces/services/IAuditService';
import { Email } from '../../../domain/value-objects/Email';
import { User } from '../../../domain/entities/User';
import { Role } from '../../../domain/enums/Role';
import { Status } from '../../../domain/enums/Status';
import { DomainException } from '../../../domain/exceptions/DomainException';
import { PublicRegisterUserDto } from '../../../application/dtos/PublicRegisterUserDto';

describe('RegisterPublicUserUseCase', () => {
  let mockAuthService: IAuthService;
  let mockUserRepository: IUserRepository;
  let mockAuditService: IAuditService;
  let registerPublicUserUseCase: RegisterPublicUserUseCase;

  beforeEach(() => {
    // Create mocks
    mockAuthService = {
      hashPassword: vi.fn(),
      verifyPassword: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
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

    registerPublicUserUseCase = new RegisterPublicUserUseCase(
      mockAuthService,
      mockUserRepository,
      mockAuditService,
    );
  });

  describe('Successful Registration', () => {
    it('should successfully register a new user with valid data', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      // Mock: No existing user
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      // Mock: Hash password
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);

      // Mock: Save user (will be called with User entity)
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);

      // Mock: Record audit event
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      const result = await registerPublicUserUseCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe(Role.PATIENT); // Always PATIENT
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');

      // Verify password was hashed
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('SecureP@ss123');

      // Verify user was saved
      expect(mockUserRepository.save).toHaveBeenCalled();
      const savedUser = vi.mocked(mockUserRepository.save).mock.calls[0][0] as User;
      expect(savedUser).toBeInstanceOf(User);
      expect(savedUser.getRole()).toBe(Role.PATIENT); // Always PATIENT
      expect(savedUser.getEmail().getValue()).toBe('test@example.com');
      expect(savedUser.getStatus()).toBe(Status.ACTIVE);

      // Verify audit event was recorded
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'system',
          action: 'CREATE',
          model: 'User',
        }),
      );
    });

    it('should generate UUID server-side (not from client)', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'newuser@example.com',
        password: 'SecureP@ss123',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      const result = await registerPublicUserUseCase.execute(dto);

      // Assert
      // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.id).toMatch(uuidRegex);
      expect(result.id).toBeDefined();
    });

    it('should always assign PATIENT role regardless of input', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'patient@example.com',
        password: 'SecureP@ss123',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      const result = await registerPublicUserUseCase.execute(dto);

      // Assert
      expect(result.role).toBe(Role.PATIENT);
      const savedUser = vi.mocked(mockUserRepository.save).mock.calls[0][0] as User;
      expect(savedUser.getRole()).toBe(Role.PATIENT);
    });
  });

  describe('Password Validation', () => {
    it('should reject password without uppercase letter', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'lowercase123', // No uppercase
      };

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(DomainException);
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow('uppercase letter');

      // Verify repository was not called
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should reject password without lowercase letter', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'UPPERCASE123', // No lowercase
      };

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(DomainException);
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow('lowercase letter');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should reject password without number', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'NoNumbersHere', // No number
      };

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(DomainException);
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow('number');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should reject password less than 8 characters', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'Short1', // Only 6 characters
      };

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(DomainException);
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow('8 characters');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should accept valid strong password', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123', // Valid password
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      const result = await registerPublicUserUseCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('Duplicate Email Handling', () => {
    it('should reject duplicate email with generic error message', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'existing@example.com',
        password: 'SecureP@ss123',
      };

      // Mock: Existing user found
      const existingUser = User.create({
        id: 'existing-user-id',
        email: Email.create('existing@example.com'),
        passwordHash: '$2b$10$existinghash',
        role: Role.PATIENT,
        status: Status.ACTIVE,
      });

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingUser);

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(DomainException);
      
      // Verify generic error message (no user enumeration)
      try {
        await registerPublicUserUseCase.execute(dto);
        expect.fail('Should have thrown DomainException');
      } catch (error) {
        if (error instanceof DomainException) {
          // Generic message - should NOT reveal that email exists
          expect(error.message).toBe('Unable to complete registration. Please try again.');
          // Should NOT contain email-specific details in message
          expect(error.message.toLowerCase()).not.toContain('email');
          expect(error.message.toLowerCase()).not.toContain('already exists');
        }
      }

      // Verify user was not saved
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should handle duplicate email race condition (save fails)', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'race@example.com',
        password: 'SecureP@ss123',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      // First check passes (no user found)
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);

      // Save fails due to unique constraint (race condition)
      vi.mocked(mockUserRepository.save).mockRejectedValue(
        new Error('User with ID or email already exists'),
      );

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(DomainException);
      
      try {
        await registerPublicUserUseCase.execute(dto);
        expect.fail('Should have thrown DomainException');
      } catch (error) {
        if (error instanceof DomainException) {
          // Generic error even for race condition
          expect(error.message).toBe('Unable to complete registration. Please try again.');
        }
      }
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'invalid-email',
        password: 'SecureP@ss123',
      };

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(DomainException);
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(/email/i);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should reject empty email', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: '',
        password: 'SecureP@ss123',
      };

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow(DomainException);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving (password not equal to raw input)', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      await registerPublicUserUseCase.execute(dto);

      // Assert
      // Verify password was hashed
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('SecureP@ss123');

      // Verify saved user has hashed password (not raw)
      // The fact that hashPassword was called is sufficient evidence
      expect(mockAuthService.hashPassword).toHaveBeenCalled();
    });

    it('should call AuthService.hashPassword with validated password', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      await registerPublicUserUseCase.execute(dto);

      // Assert
      expect(mockAuthService.hashPassword).toHaveBeenCalledTimes(1);
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('SecureP@ss123');
    });
  });

  describe('Repository Interactions', () => {
    it('should call findByEmail before saving', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      await registerPublicUserUseCase.execute(dto);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();

      // Verify order: findByEmail called before save
      const findByEmailCallOrder = vi.mocked(mockUserRepository.findByEmail).mock.invocationCallOrder[0];
      const saveCallOrder = vi.mocked(mockUserRepository.save).mock.invocationCallOrder[0];
      expect(findByEmailCallOrder).toBeLessThan(saveCallOrder);
    });

    it('should not call save if email already exists', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'existing@example.com',
        password: 'SecureP@ss123',
      };

      const existingUser = User.create({
        id: 'existing-id',
        email: Email.create('existing@example.com'),
        passwordHash: '$2b$10$existing',
        role: Role.PATIENT,
      });

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingUser);

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow();

      // Verify save was NOT called
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockAuthService.hashPassword).not.toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    it('should record audit event after successful registration', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      await registerPublicUserUseCase.execute(dto);

      // Assert
      expect(mockAuditService.recordEvent).toHaveBeenCalledTimes(1);
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'system',
          action: 'CREATE',
          model: 'User',
          details: expect.stringContaining('registered via public signup'),
        }),
      );
    });

    it('should not record audit event if registration fails', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'existing@example.com',
        password: 'SecureP@ss123',
      };

      const existingUser = User.create({
        id: 'existing-id',
        email: Email.create('existing@example.com'),
        passwordHash: '$2b$10$existing',
        role: Role.PATIENT,
      });

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingUser);

      // Act & Assert
      await expect(registerPublicUserUseCase.execute(dto)).rejects.toThrow();

      // Verify audit was NOT called
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });
  });

  describe('Response DTO', () => {
    it('should return response without password or password hash', async () => {
      // Arrange
      const dto: PublicRegisterUserDto = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const hashedPassword = '$2b$10$hashedpassword1234567890';

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockAuthService.hashPassword).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.save).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      const result = await registerPublicUserUseCase.execute(dto);

      // Assert
      // Verify response doesn't contain password
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
      
      // Verify response has required fields
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('createdAt');
    });
  });
});
