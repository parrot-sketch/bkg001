/**
 * API Route: GET /api/users
 * 
 * Returns all active users, optionally filtered by role.
 * Used for user selection in forms (e.g., selecting receiving nurse).
 * 
 * Query params:
 * - role: Filter by role (e.g., NURSE, DOCTOR)
 * - search: Search by name or email
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const where: any = {
      status: 'ACTIVE',
    };

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        phone: true,
      },
      orderBy: [
        { first_name: 'asc' },
        { last_name: 'asc' },
      ],
      take: 100,
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
      email: user.email,
      role: user.role,
      phone: user.phone,
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error('[API] /api/users - Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users',
    }, { status: 500 });
  }
}
