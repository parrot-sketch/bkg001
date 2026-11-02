import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import db from '@/lib/db';
import type { ApiResponse } from '@/lib/api/client';
import type { StoredUser } from '@/lib/auth/token';

type SessionResponse = ApiResponse<{ user: StoredUser }>;

export async function GET(request: NextRequest): Promise<NextResponse<SessionResponse>> {
  const auth = await authenticateRequest(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const user = await db.user.findUnique({
    where: { id: auth.user.userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      first_name: true,
      last_name: true,
      phone: true,
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    const response = NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    return response;
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name ?? undefined,
          lastName: user.last_name ?? undefined,
          phone: user.phone ?? undefined,
        },
      },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
