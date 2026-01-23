/**
 * Unit Tests: AuthFactory
 * 
 * Tests the authentication factory to ensure proper dependency creation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthFactory, getAuthConfig } from '../../../infrastructure/auth/AuthFactory';
import { PrismaClient } from '@prisma/client';
import { AuthConfig } from '../../../infrastructure/auth/JwtAuthService';

describe('AuthFactory', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {} as PrismaClient;
    // Reset environment variables
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_ACCESS_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
    delete process.env.BCRYPT_SALT_ROUNDS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthConfig', () => {
    it('should throw error when JWT_SECRET is missing', () => {
      process.env.JWT_REFRESH_SECRET = 'refresh-secret';

      expect(() => getAuthConfig()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should throw error when JWT_REFRESH_SECRET is missing', () => {
      process.env.JWT_SECRET = 'secret';

      expect(() => getAuthConfig()).toThrow('JWT_REFRESH_SECRET environment variable is required');
    });

    it('should return config with default values when env vars are set', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

      const config = getAuthConfig();

      expect(config.jwtSecret).toBe('test-secret');
      expect(config.jwtRefreshSecret).toBe('test-refresh-secret');
      expect(config.accessTokenExpiresIn).toBe(900); // 15 minutes default
      expect(config.refreshTokenExpiresIn).toBe(604800); // 7 days default
      expect(config.saltRounds).toBe(10); // default
    });

    it('should use custom values from environment variables', () => {
      process.env.JWT_SECRET = 'custom-secret';
      process.env.JWT_REFRESH_SECRET = 'custom-refresh';
      process.env.JWT_ACCESS_EXPIRES_IN = '1800';
      process.env.JWT_REFRESH_EXPIRES_IN = '1209600';
      process.env.BCRYPT_SALT_ROUNDS = '12';

      const config = getAuthConfig();

      expect(config.accessTokenExpiresIn).toBe(1800);
      expect(config.refreshTokenExpiresIn).toBe(1209600);
      expect(config.saltRounds).toBe(12);
    });
  });

  describe('AuthFactory.create', () => {
    it('should create all authentication use cases', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

      const useCases = AuthFactory.create(mockPrisma);

      expect(useCases.loginUseCase).toBeDefined();
      expect(useCases.refreshTokenUseCase).toBeDefined();
      expect(useCases.logoutUseCase).toBeDefined();
      expect(useCases.registerPublicUserUseCase).toBeDefined();
    });

    it('should accept custom config', () => {
      const customConfig: AuthConfig = {
        jwtSecret: 'custom-secret',
        jwtRefreshSecret: 'custom-refresh',
        accessTokenExpiresIn: 1800,
        refreshTokenExpiresIn: 1209600,
        saltRounds: 12,
      };

      const useCases = AuthFactory.create(mockPrisma, customConfig);

      expect(useCases.loginUseCase).toBeDefined();
      expect(useCases.refreshTokenUseCase).toBeDefined();
      expect(useCases.logoutUseCase).toBeDefined();
      expect(useCases.registerPublicUserUseCase).toBeDefined();
    });
  });

  describe('AuthFactory.createAuthService', () => {
    it('should create auth service with dependencies', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

      const mockUserRepository = {} as any;

      const authService = AuthFactory.createAuthService(
        mockUserRepository,
        mockPrisma
      );

      expect(authService).toBeDefined();
    });
  });
});
