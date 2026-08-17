/**
 * API Route: GET /api/doctor/surgical-cases/surgeons
 * Returns list of surgeons for the dropdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const surgeons = await db.doctor.findMany({
      where: {
        availability_status: {
          not: 'UNAVAILABLE',
        },
        name: {
          not: {
            equals: '',
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const meaningfulSurgeons = surgeons.filter((s) => {
      const trimmed = s.name.trim();
      if (!trimmed) return false;
      if (/^(Dr|Mr|Mrs|Ms|Prof|Sir|Madam)\.?$/i.test(trimmed)) return false;
      return true;
    });

    return NextResponse.json({ success: true, surgeons: meaningfulSurgeons });
  } catch (error: any) {
    console.error('Error fetching surgeons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch surgeons' },
      { status: 500 }
    );
  }
}
