import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (authResult.user.role !== Role.THEATER_TECHNICIAN && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const totalRecords = await db.patient.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = await db.patient.count({
      where: { created_at: { gte: today } },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const newThisMonth = await db.patient.count({
      where: { created_at: { gte: monthStart } },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRecords,
        newToday,
        newThisMonth,
      },
    });
  } catch (error) {
    console.error('Error fetching patient stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch patient stats' }, { status: 500 });
  }
}
