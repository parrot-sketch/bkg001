/**
 * GET /api/theater-tech/patients
 * 
 * Returns patients for theater tech to select for surgical planning.
 * Accessible by THEATER_TECHNICIAN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' as const } },
            { last_name: { contains: search, mode: 'insensitive' as const } },
            { file_number: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          file_number: true,
          phone: true,
          date_of_birth: true,
          gender: true,
        },
        orderBy: { first_name: 'asc' },
        take: limit,
        skip,
      }),
      db.patient.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: patients,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch patients' }, { status: 500 });
  }
}