import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { AuthContext } from '@/lib/auth/types';
import { UnauthorizedError, ForbiddenError } from '@/domain/errors/IntakeErrors';

/**
 * Authentication wrapper for API routes.
 *
 * Throws typed errors instead of returning NextResponse,
 * so routes can use a single catch block that maps errors → HTTP responses.
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: string[],
): Promise<AuthContext> {
  const result = await authenticateRequest(request);

  if (!result.success || !result.user) {
    throw new UnauthorizedError();
  }

  const user = result.user;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Role ${user.role} is not permitted. Required: ${allowedRoles.join(', ')}`,
    );
  }

  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
  };
}
