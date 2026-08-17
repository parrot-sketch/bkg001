/**
 * JWT Authentication Helper
 * 
 * Utility function to authenticate API requests using JWT.
 * This helper instantiates JwtMiddleware with the required dependencies.
 */

import { NextRequest } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { getAuthConfig } from '@/infrastructure/auth/AuthFactory';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import db from '@/lib/db';

// Initialize auth service using centralized config
const userRepository = new PrismaUserRepository(db);
const authConfig = getAuthConfig();
const authService = new JwtAuthService(userRepository, db, authConfig);
const jwtMiddleware = new JwtMiddleware(authService);

/**
 * Authenticate API request using JWT
 * 
 * Extracts token from Authorization header (preferred) or accessToken cookie (fallback).
 * Cookie fallback is needed because:
 *  - httpOnly cookies are set during login but cannot be read from JS
 *  - The browser always sends them on same-origin requests automatically
 *  - Some contexts (PdfViewer, file downloads) cannot set Authorization headers
 * 
 * @param request - Next.js request object
 * @returns Authentication result with user context or error
 */
export async function authenticateRequest(request: NextRequest) {
  try {
    let authorizationHeader = request.headers.get('authorization') || undefined;

    if (!authorizationHeader) {
      const cookieToken = request.cookies.get('accessToken')?.value;
      if (cookieToken) {
        authorizationHeader = `Bearer ${cookieToken}`;
      }
    }

    if (!authorizationHeader) {
      return {
        success: false,
        error: 'Authorization token required',
        user: null,
      };
    }

    const user = await jwtMiddleware.authenticate(authorizationHeader);

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      user: null,
    };
  }
}
