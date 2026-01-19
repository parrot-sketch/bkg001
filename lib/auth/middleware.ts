/**
 * JWT Middleware
 * 
 * Middleware for verifying JWT access tokens and extracting user context.
 * 
 * Responsibilities:
 * - Extract token from Authorization header
 * - Verify token signature and expiration
 * - Extract user context from token payload
 * - Provide authenticated request context
 */

import { IAuthService, TokenPayload } from '@/domain/interfaces/services/IAuthService';
import { AuthContext } from '@/lib/auth/types';
import { DomainException } from '@/domain/exceptions/DomainException';
import { NextRequest } from 'next/server';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { PrismaClient } from '@prisma/client';

export class JwtMiddleware {
  constructor(private readonly authService: IAuthService) {}
  
  /**
   * Static helper to create auth service instance
   * Used internally by static authenticate method
   */
  private static createAuthService(prisma: PrismaClient): IAuthService {
    const userRepository = new PrismaUserRepository(prisma);
    const authConfig = {
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
      accessTokenExpiresIn: 15 * 60, // 15 minutes
      refreshTokenExpiresIn: 7 * 24 * 60 * 60, // 7 days
      saltRounds: 10,
    };
    return new JwtAuthService(userRepository, prisma, authConfig);
  }
  
  /**
   * Static method to authenticate NextRequest
   * Extracts token from Authorization header and verifies it
   * 
   * @param request - Next.js request object
   * @param prisma - Prisma client instance (optional, will be imported if not provided)
   * @returns Object with success flag and user context
   */
  static async authenticate(
    request: NextRequest,
    prisma?: PrismaClient
  ): Promise<{ success: boolean; user?: AuthContext }> {
    try {
      // Import Prisma client if not provided
      let db: PrismaClient;
      if (prisma) {
        db = prisma;
      } else {
        // Dynamic import to avoid circular dependencies
        const dbModule = await import('../db');
        db = dbModule.default;
      }

      // Extract authorization header
      const authorizationHeader = request.headers.get('authorization') || undefined;
      
      // If no authorization header, return failure
      if (!authorizationHeader) {
        return {
          success: false,
        };
      }
      
      // Create auth service and middleware instance
      const authService = this.createAuthService(db);
      const middleware = new JwtMiddleware(authService);
      
      // Authenticate using instance method
      const user = await middleware.authenticate(authorizationHeader);
      
      return {
        success: true,
        user,
      };
    } catch (error) {
      // Log error for debugging
      if (error instanceof Error) {
        console.error('[JwtMiddleware.authenticate] Error:', error.message);
      }
      // Return failure result instead of throwing
      return {
        success: false,
      };
    }
  }

  /**
   * Extracts JWT token from Authorization header
   * 
   * Expected format: "Bearer <token>"
   * 
   * @param authorizationHeader - Authorization header value
   * @returns JWT token string or null if not found/invalid format
   */
  static extractToken(authorizationHeader?: string): string | null {
    if (!authorizationHeader) {
      return null;
    }

    const parts = authorizationHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Verifies JWT token and returns authenticated user context
   * 
   * @param token - JWT access token
   * @returns AuthContext with user information
   * @throws DomainException if token is invalid or expired
   */
  async verifyToken(token: string): Promise<AuthContext> {
    try {
      const payload: TokenPayload = await this.authService.verifyAccessToken(token);

      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }
      throw new DomainException('Failed to verify access token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Middleware function to authenticate request
   * 
   * @param authorizationHeader - Authorization header value
   * @returns AuthContext with user information
   * @throws DomainException if authentication fails
   */
  async authenticate(authorizationHeader?: string): Promise<AuthContext> {
    const token = JwtMiddleware.extractToken(authorizationHeader);

    if (!token) {
      throw new DomainException('Authorization token required', {
        header: authorizationHeader,
      });
    }

    return await this.verifyToken(token);
  }
}
