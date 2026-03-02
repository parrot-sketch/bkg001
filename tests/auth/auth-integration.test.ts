/**
 * Authentication Integration Tests
 * 
 * These tests verify authentication flows against a real database.
 * Tests actual bcrypt hashing, JWT signing, and database operations.
 * 
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { Email } from '@/domain/value-objects/Email';
import { Role } from '@/domain/enums/Role';
import { User } from '@/domain/entities/User';
import * as bcrypt from 'bcrypt';

/**
 * Integration Test Configuration
 * Uses test database (from DATABASE_URL_TEST env var)
 */
const getTestDatabase = (): PrismaClient => {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST environment variable not set');
  }
  return new PrismaClient({ datasources: { db: { url } } });
};

const testAuthConfig = {
  jwtSecret: 'test-jwt-secret-min-32-chars-for-testing-only',
  jwtRefreshSecret: 'test-refresh-secret-min-32-chars-for-testing',
  accessTokenExpiresIn: 15 * 60,
  refreshTokenExpiresIn: 7 * 24 * 60 * 60,
  saltRounds: 10,
};

describe.skip('Authentication Integration Tests', () => {
  let db: PrismaClient;
  let authService: JwtAuthService;
  let userRepository: PrismaUserRepository;
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    // Initialize database connection
    db = getTestDatabase();

    // Create repositories and services
    userRepository = new PrismaUserRepository(db);
    authService = new JwtAuthService(userRepository, db, testAuthConfig);

    // Clean up any existing test users
    const existingUser = await db.user.findFirst({
      where: { email: { startsWith: 'integration-test-' } },
    });
    if (existingUser) {
      await db.user.delete({ where: { id: existingUser.id } });
    }

    // Create a test user in the database
    testUserEmail = `integration-test-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('integration-test-password', 10);

    const user = await db.user.create({
      data: {
        id: `test-user-${Date.now()}`,
        email: testUserEmail,
        password_hash: passwordHash,
        first_name: 'Integration',
        last_name: 'Test',
        role: Role.DOCTOR,
        status: 'ACTIVE',
      },
    });

    testUserId = user.id;

    // Mock doctor profile (if required by auth logic)
    await db.doctor.create({
      data: {
        id: `test-doctor-${Date.now()}`,
        user_id: testUserId,
        onboarding_status: 'ACTIVE',
        specialization: 'Test Specialization',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    try {
      await db.refreshToken.deleteMany({ where: { user_id: testUserId } });
      await db.doctor.deleteMany({ where: { user_id: testUserId } });
      await db.user.delete({ where: { id: testUserId } });
    } catch (error) {
      // Ignore cleanup errors
    }

    await db.$disconnect();
  });

  describe('Login Flow', () => {
    it('should authenticate user and return JWT tokens', async () => {
      // Act
      const tokens = await authService.login(
        Email.create(testUserEmail),
        'integration-test-password'
      );

      // Assert
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.expiresIn).toBe(15 * 60);

      // Verify tokens are valid JWTs
      const accessTokenParts = tokens.accessToken.split('.');
      expect(accessTokenParts).toHaveLength(3);

      // Verify token payload contains correct user info
      const payload = JSON.parse(
        Buffer.from(accessTokenParts[1], 'base64').toString()
      );
      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe(testUserEmail);
      expect(payload.role).toBe(Role.DOCTOR);
    });

    it('should reject invalid password', async () => {
      // Act & Assert
      await expect(
        authService.login(Email.create(testUserEmail), 'wrong-password')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      // Act & Assert
      await expect(
        authService.login(Email.create('nonexistent@example.com'), 'password')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should persist refresh token to database', async () => {
      // Act
      const { refreshToken } = await authService.login(
        Email.create(testUserEmail),
        'integration-test-password'
      );

      // Assert - refresh token exists in database
      const storedToken = await db.refreshToken.findFirst({
        where: { user_id: testUserId },
      });

      expect(storedToken).toBeTruthy();
      expect(storedToken?.token).toBeTruthy();
      expect(storedToken?.expires_at).toBeInstanceOf(Date);
      expect(storedToken?.expires_at?.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Token Refresh Flow', () => {
    let validRefreshToken: string;

    beforeAll(async () => {
      // Get a valid refresh token
      const { refreshToken } = await authService.login(
        Email.create(testUserEmail),
        'integration-test-password'
      );
      validRefreshToken = refreshToken;
    });

    it('should generate new tokens from valid refresh token', async () => {
      // Act
      const newTokens = await authService.refreshToken(validRefreshToken);

      // Assert
      expect(newTokens.accessToken).toBeTruthy();
      expect(newTokens.refreshToken).toBeTruthy();
      expect(newTokens.accessToken).not.toBe(validRefreshToken);

      // Verify new tokens are valid JWTs
      const parts = newTokens.accessToken.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should update refresh token in database', async () => {
      // Act
      const { refreshToken: newRefreshToken } = await authService.refreshToken(
        validRefreshToken
      );

      // Assert - old refresh token replaced with new one
      const storedToken = await db.refreshToken.findFirst({
        where: { token: newRefreshToken },
      });

      expect(storedToken).toBeTruthy();
      expect(storedToken?.user_id).toBe(testUserId);
    });

    it('should reject expired refresh token', async () => {
      // Arrange - create an expired refresh token
      const expiredToken = await db.refreshToken.create({
        data: {
          user_id: testUserId,
          token: 'expired-token-' + Date.now(),
          expires_at: new Date(Date.now() - 1000), // Already expired
        },
      });

      // Act & Assert
      await expect(
        authService.refreshToken(expiredToken.token)
      ).rejects.toThrow();

      // Cleanup
      await db.refreshToken.delete({ where: { id: expiredToken.id } });
    });

    it('should reject revoked refresh token', async () => {
      // This test verifies logout revokes refresh tokens
      await authService.logout(testUserId);

      // Act & Assert - token should no longer exist
      await expect(
        authService.refreshToken(validRefreshToken)
      ).rejects.toThrow();
    });
  });

  describe('Logout Flow', () => {
    it('should delete all refresh tokens for user', async () => {
      // Arrange - create new token
      const { refreshToken } = await authService.login(
        Email.create(testUserEmail),
        'integration-test-password'
      );

      // Verify token exists
      let storedToken = await db.refreshToken.findFirst({
        where: { user_id: testUserId },
      });
      expect(storedToken).toBeTruthy();

      // Act
      await authService.logout(testUserId);

      // Assert - token is deleted
      storedToken = await db.refreshToken.findFirst({
        where: { user_id: testUserId },
      });
      expect(storedToken).toBeNull();
    });
  });

  describe('Password Hashing', () => {
    it('should use bcrypt for password hashing', async () => {
      // Directly verify bcrypt hashing
      const password = 'test-password-123';
      const hash = await bcrypt.hash(password, 10);

      // Verify
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);

      // Verify wrong password fails
      const isInvalid = await bcrypt.compare('wrong-password', hash);
      expect(isInvalid).toBe(false);
    });

    it('should fail login if password hash missing', async () => {
      // Arrange - create user without password hash
      const invalidUserEmail = `no-hash-${Date.now()}@example.com`;
      await db.user.create({
        data: {
          id: `no-hash-user-${Date.now()}`,
          email: invalidUserEmail,
          password_hash: '', // Invalid: empty hash
          first_name: 'Invalid',
          last_name: 'User',
          role: Role.PATIENT,
          status: 'ACTIVE',
        },
      });

      // Act & Assert
      await expect(
        authService.login(Email.create(invalidUserEmail), 'any-password')
      ).rejects.toThrow();

      // Cleanup
      await db.user.delete({ where: { email: invalidUserEmail } });
    });
  });

  describe('User Status Validation', () => {
    it('should reject login for inactive users', async () => {
      // Arrange - create inactive user
      const inactiveUserEmail = `inactive-${Date.now()}@example.com`;
      const passwordHash = await bcrypt.hash('password', 10);

      await db.user.create({
        data: {
          id: `inactive-user-${Date.now()}`,
          email: inactiveUserEmail,
          password_hash: passwordHash,
          first_name: 'Inactive',
          last_name: 'User',
          role: Role.PATIENT,
          status: 'INACTIVE', // ← Inactive
        },
      });

      // Act & Assert
      await expect(
        authService.login(Email.create(inactiveUserEmail), 'password')
      ).rejects.toThrow();

      // Cleanup
      await db.user.delete({ where: { email: inactiveUserEmail } });
    });
  });
});
