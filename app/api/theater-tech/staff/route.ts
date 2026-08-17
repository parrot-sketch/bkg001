import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Role, Status } from '@prisma/client';

/**
 * GET /api/theater-tech/staff
 *
 * Lightweight staff lookup for theater-tech workflows (team selection).
 *
 * Query params:
 * - role: Role (e.g. NURSE, DOCTOR) (required)
 * - q: optional search (first/last/email)
 *
 * Security:
 * - Requires authentication
 * - Allows THEATER_TECHNICIAN or ADMIN
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const allowedRoles: Role[] = [Role.THEATER_TECHNICIAN, Role.ADMIN];
    if (!allowedRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');
    const q = (searchParams.get('q') || '').trim();

    if (!roleParam || !Object.values(Role).includes(roleParam as Role)) {
      return NextResponse.json({ success: false, error: 'Valid role query param is required' }, { status: 400 });
    }

    const where: any = {
      role: roleParam as Role,
      status: Status.ACTIVE,
    };

    if (q) {
      where.OR = [
        { first_name: { contains: q, mode: 'insensitive' } },
        { last_name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: { id: true, first_name: true, last_name: true, email: true, role: true },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
      take: 200,
    });

    const meaningfulUsers = users
      .map((u) => ({
        id: u.id,
        fullName: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        email: u.email,
        role: u.role,
      }))
      .filter((u) => {
        const trimmed = u.fullName.trim();
        if (!trimmed) return false;
        if (/^(Dr|Mr|Mrs|Ms|Prof|Sir|Madam)\.?$/i.test(trimmed)) return false;
        return true;
      });

    return NextResponse.json({
      success: true,
      data: meaningfulUsers,
    });
  } catch (error) {
    console.error('[API] GET /api/theater-tech/staff - Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

