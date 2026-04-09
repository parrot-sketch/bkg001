/**
 * API Route: GET /api/doctor/surgical-cases/surgeons
 * Returns list of surgeons for the dropdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authResult = await JwtMiddleware.verifyToken(request);
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const surgeons = await db.doctor.findMany({
      where: {
        onboarding_status: 'COMPLETED',
      },
      select: {
        id: true,
        name: true,
        specialization: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ success: true, surgeons });
  } catch (error: any) {
    console.error('Error fetching surgeons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch surgeons' },
      { status: 500 }
    );
  }
}
