/**
 * Authentication Factory
 * 
 * Centralizes creation of authentication dependencies to eliminate duplication
 * and ensure consistent configuration across the application.
 * 
 * This factory follows the Dependency Injection pattern and ensures:
 * - Single source of truth for auth configuration
 * - Consistent service initialization
 * - Easy testing through dependency injection
 * - Clean separation of concerns
 */

import { JwtAuthService, AuthConfig } from './JwtAuthService';
import { IAuthService } from '@/domain/interfaces/services/IAuthService';
import { IUserRepository } from '@/domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '@/domain/interfaces/services/IAuditService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { LoginUseCase } from '@/application/use-cases/LoginUseCase';
import { RefreshTokenUseCase } from '@/application/use-cases/RefreshTokenUseCase';
import { LogoutUseCase } from '@/application/use-cases/LogoutUseCase';
import { RegisterPublicUserUseCase } from '@/application/use-cases/RegisterPublicUserUseCase';
import { PrismaClient } from '@prisma/client';

/**
 * Authentication configuration from environment variables
 */
export function getAuthConfig(): AuthConfig {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  const isBuilding = process.env.NEXT_PHASE === 'phase-production-build';

  if (!jwtSecret || jwtSecret.trim().length === 0) {
    if (isBuilding) return { jwtSecret: 'dummy', jwtRefreshSecret: 'dummy', accessTokenExpiresIn: 0, refreshTokenExpiresIn: 0, saltRounds: 0 };
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (!jwtRefreshSecret || jwtRefreshSecret.trim().length === 0) {
    if (isBuilding) return { jwtSecret: 'dummy', jwtRefreshSecret: 'dummy', accessTokenExpiresIn: 0, refreshTokenExpiresIn: 0, saltRounds: 0 };
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }

  return {
    jwtSecret,
    jwtRefreshSecret,
    accessTokenExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '900', 10), // 15 minutes default
    refreshTokenExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10), // 7 days default
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  };
}

/**
 * Creates an authentication service instance
 */
export function createAuthService(
  userRepository: IUserRepository,
  prisma: PrismaClient,
  config?: AuthConfig
): IAuthService {
  const authConfig = config || getAuthConfig();
  return new JwtAuthService(userRepository, prisma, authConfig);
}

/**
 * Creates authentication use cases with all dependencies
 */
export function createAuthUseCases(
  prisma: PrismaClient,
  config?: AuthConfig
): {
  loginUseCase: LoginUseCase;
  refreshTokenUseCase: RefreshTokenUseCase;
  logoutUseCase: LogoutUseCase;
  registerPublicUserUseCase: RegisterPublicUserUseCase;
} {
  const userRepository = new PrismaUserRepository(prisma);
  const auditService = new ConsoleAuditService();
  const authService = createAuthService(userRepository, prisma, config);

  return {
    loginUseCase: new LoginUseCase(authService, userRepository, auditService),
    refreshTokenUseCase: new RefreshTokenUseCase(authService),
    logoutUseCase: new LogoutUseCase(authService, auditService),
    registerPublicUserUseCase: new RegisterPublicUserUseCase(
      authService,
      userRepository,
      auditService
    ),
  };
}

/**
 * Factory for creating authentication dependencies
 * 
 * This is the main entry point for creating all auth-related dependencies.
 * Use this in API routes and other places where auth is needed.
 */
export class AuthFactory {
  /**
   * Creates all authentication dependencies
   * 
   * @param prisma - Prisma client instance
   * @param config - Optional auth config (uses env vars if not provided)
   * @returns Object containing all auth use cases
   */
  static create(prisma: PrismaClient, config?: AuthConfig) {
    return createAuthUseCases(prisma, config);
  }

  /**
   * Creates only the auth service (for testing or special cases)
   */
  static createAuthService(
    userRepository: IUserRepository,
    prisma: PrismaClient,
    config?: AuthConfig
  ): IAuthService {
    return createAuthService(userRepository, prisma, config);
  }
}
