/**
 * JwtAuthService Unit Tests Template
 * 
 * These tests verify the core authentication logic in isolation.
 * Uses mocked repositories and Prisma client for fast, deterministic tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { Email } from '@/domain/value-objects/Email';
import { Role } from '@/domain/enums/Role';
import { DomainException } from '@/domain/exceptions/DomainException';
import {
  testAuthConfig,
  TestUserFactory,
  MockUserRepository,
  mockPrismaClient,
  setupAuthTests,
  decodeJwt,
  assertValidJwt,
  testCredentials,
} from '../auth-test-utils';

describe('JwtAuthService', () => {
  let authService: JwtAuthService;
  let mockUserRepository: MockUserRepository;
  let cleanup: () => void;

  beforeEach(() => {
    const setup = setupAuthTests();
    mockUserRepository = setup.mockUserRepository;
    cleanup = setup.reset;

    // Reset prisma mocks
    mockPrismaClient.refreshToken.create.mockResolvedValue({
      id: 'token-123',
      user_id: 'user-123',
      token: 'refresh-token',
      expires_at: new Date(),
    });

    authService = new JwtAuthService(
      mockUserRepository,
      mockPrismaClient as any,
      testAuthConfig,
    );
  });

  afterEach(cleanup as any);

  describe('login()', () => {
    it('should return valid JWT tokens on successful login', async () => {
      // Arrange
      const testUser = await TestUserFactory.createDoctorUser({
        email: testCredentials.validDoctor.email,
        password: testCredentials.validDoctor.password,
      });
      mockUserRepository.setUser(testUser);

      // Act
      const result = await authService.login(
        Email.create(testCredentials.validDoctor.email),
        testCredentials.validDoctor.password,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresIn).toBe(15 * 60); // 15 minutes

      // Verify tokens are valid JWTs
      assertValidJwt(result.accessToken);
      assertValidJwt(result.refreshToken);

      // Verify access token payload
      const { payload: accessPayload } = decodeJwt(result.accessToken);
      expect(accessPayload.userId).toBe(testUser.getId());
      expect(accessPayload.email).toBe(testCredentials.validDoctor.email);
      expect(accessPayload.role).toBe(Role.DOCTOR);

      // Verify refresh token created in database
      expect(mockPrismaClient.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: testUser.getId(),
          token: result.refreshToken,
        }),
      });
    });

    it('should throw DomainException if user not found', async () => {
      // Arrange
      mockUserRepository.setUserNotFound();

      // Act & Assert
      await expect(
        authService.login(
          Email.create(testCredentials.invalidEmail),
          testCredentials.validPatient.password,
        )
      ).rejects.toThrow(DomainException);
    });

    it('should throw DomainException if password is incorrect', async () => {
      // Arrange
      const testUser = await TestUserFactory.createPatientUser({
        email: testCredentials.validPatient.email,
        password: testCredentials.validPatient.password,
      });
      mockUserRepository.setUser(testUser);

      // Act & Assert
      await expect(
        authService.login(
          Email.create(testCredentials.validPatient.email),
          testCredentials.invalidPassword,
        )
      ).rejects.toThrow(DomainException);
    });

    it('should throw DomainException if user is inactive', async () => {
      // Arrange
      const testUser = await TestUserFactory.createPatientUser({
        email: testCredentials.validPatient.email,
        password: testCredentials.validPatient.password,
      });
      
      // Set user as inactive (manually set status)
      const inactiveUser = User.create({
        email: testUser.getEmail(),
        firstName: testUser.getFirstName(),
        lastName: testUser.getLastName(),
        passwordHash: testUser.getPasswordHash(),
        role: testUser.getRole(),
        status: 'INACTIVE', // ← Inactive
      });
      
      mockUserRepository.setUser(inactiveUser);

      // Act & Assert
      await expect(
        authService.login(
          Email.create(testCredentials.validPatient.email),
          testCredentials.validPatient.password,
        )
      ).rejects.toThrow('Account is inactive');
    });

    it('should enforce doctor onboarding requirement', async () => {
      // Arrange
      const testUser = await TestUserFactory.createDoctorUser({
        email: 'unboarded-doctor@example.com',
      });
      mockUserRepository.setUser(testUser);

      // Mock doctor not found (not onboarded)
      mockPrismaClient.doctor.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.login(
          Email.create('unboarded-doctor@example.com'),
          'password123',
        )
      ).rejects.toThrow('Doctor profile not found');
    });
  });

  describe('verifyToken()', () => {
    it('should verify valid access token', async () => {
      // Arrange
      const testUser = await TestUserFactory.createDoctorUser();
      const token = authService.generateAccessToken(testUser);

      // Act
      const payload = await authService.verifyToken(token);

      // Assert
      expect(payload.userId).toBe(testUser.getId());
      expect(payload.email).toBe(testUser.getEmail().getValue());
      expect(payload.role).toBe(Role.DOCTOR);
    });

    it('should reject malformed token', async () => {
      // Act & Assert
      await expect(
        authService.verifyToken('not.a.token')
      ).rejects.toThrow();
    });

    it('should reject token with wrong signature', async () => {
      // Arrange
      const testUser = await TestUserFactory.createPatientUser();
      const validToken = authService.generateAccessToken(testUser);
      
      // Tamper with signature
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tampered_signature`;

      // Act & Assert
      await expect(
        authService.verifyToken(tamperedToken)
      ).rejects.toThrow();
    });

    it('should reject expired token', async () => {
      // Arrange
      const testUser = await TestUserFactory.createPatientUser();
      const expiredToken = authService.generateAccessToken(testUser, {
        expiresIn: -100, // Already expired
      });

      // Act & Assert
      await expect(
        authService.verifyToken(expiredToken)
      ).rejects.toThrow();
    });
  });

  describe('refreshToken()', () => {
    it('should generate new tokens from valid refresh token', async () => {
      // Arrange
      const testUser = await TestUserFactory.createDoctorUser();
      mockUserRepository.setUser(testUser);

      const { refreshToken: originalRefreshToken } = await authService.login(
        Email.create(testUser.getEmail().getValue()),
        'password123',
      );

      // Mock refresh token exists in database
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        user_id: testUser.getId(),
        token: originalRefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Act
      const newTokens = await authService.refreshToken(originalRefreshToken);

      // Assert
      expect(newTokens.accessToken).toBeTruthy();
      expect(newTokens.refreshToken).toBeTruthy();
      expect(newTokens.accessToken).not.toBe(originalRefreshToken);

      assertValidJwt(newTokens.accessToken);
      assertValidJwt(newTokens.refreshToken);
    });

    it('should reject expired refresh token', async () => {
      // Arrange
      const testUser = await TestUserFactory.createPatientUser();
      mockUserRepository.setUser(testUser);

      const { refreshToken } = await authService.login(
        Email.create(testUser.getEmail().getValue()),
        'password123',
      );

      // Mock refresh token as expired
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        user_id: testUser.getId(),
        token: refreshToken,
        expires_at: new Date(Date.now() - 1000), // Already expired
      });

      // Act & Assert
      await expect(
        authService.refreshToken(refreshToken)
      ).rejects.toThrow();
    });

    it('should reject revoked refresh token', async () => {
      // Arrange
      const testUser = await TestUserFactory.createPatientUser();
      const fakeRefreshToken = 'eyJhbGc.eyJ1c2VyI.signature';

      // Mock refresh token not found (revoked)
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.refreshToken(fakeRefreshToken)
      ).rejects.toThrow();
    });
  });

  describe('logout()', () => {
    it('should delete all refresh tokens for user', async () => {
      // Arrange
      const userId = 'user-123';

      // Act
      await authService.logout(userId);

      // Assert
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
    });
  });

  describe('generateAccessToken()', () => {
    it('should generate token with correct expiration', async () => {
      // Arrange
      const testUser = await TestUserFactory.createDoctorUser();
      const now = Math.floor(Date.now() / 1000);

      // Act
      const token = authService.generateAccessToken(testUser);

      // Assert
      const { payload } = decodeJwt(token);
      expect(payload.exp - payload.iat).toBe(15 * 60); // 15 minutes

      // Verify token was issued now (within 5 second tolerance)
      expect(Math.abs(payload.iat - now)).toBeLessThan(5);
    });

    it('should include all required claims', async () => {
      // Arrange
      const testUser = await TestUserFactory.createDoctorUser({
        email: 'doctor@clinic.com',
      });

      // Act
      const token = authService.generateAccessToken(testUser);

      // Assert
      const { payload } = decodeJwt(token);
      expect(payload.userId).toBeDefined();
      expect(payload.email).toBe('doctor@clinic.com');
      expect(payload.role).toBe(Role.DOCTOR);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });
  });

  describe('generateRefreshToken()', () => {
    it('should generate token with 7-day expiration', async () => {
      // Arrange
      const testUser = await TestUserFactory.createPatientUser();

      // Act
      const token = authService.generateRefreshToken(testUser);

      // Assert
      const { payload } = decodeJwt(token);
      const expectedExpiration = 7 * 24 * 60 * 60; // 7 days in seconds
      expect(payload.exp - payload.iat).toBe(expectedExpiration);
    });
  });
});
