/**
 * API Route: GET /api/authentication/session
 *
 * Lightweight session-validation endpoint used by the SPA to restore auth
 * state on page load / refresh WITHOUT ever exposing a JWT to JavaScript.
 *
 * Security:
 * - Authenticates purely from the httpOnly `accessToken` cookie (set by
 *   /api/authentication/login and /api/authentication/refresh). No Bearer
 *   header, no client token storage.
 * - Returns only non-sensitive identity fields needed for routing/UI.
 * - A missing/expired access token (with no valid refresh) yields 401, which
 *   the client treats as "not authenticated".
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate from the httpOnly accessToken cookie (silent refresh handled
    // inside getCurrentUser when a valid refresh cookie is present).
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    // Resolve display fields from the DB (id-indexed, cheap). This keeps the
    // JWT payload (which only carries userId/email/role) out of the client.
    const user = await db.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 },
    );
  }
}
