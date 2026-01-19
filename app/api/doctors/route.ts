import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * GET /api/doctors
 * 
 * Returns all doctors for consultation booking
 * Public endpoint - no authentication required
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Fetch all doctors from database
    const doctors = await db.doctor.findMany({
      where: {
        availability_status: {
          not: 'UNAVAILABLE',
        },
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        title: true,
        specialization: true,
        profile_image: true,
        bio: true,
        education: true,
        focus_areas: true,
        professional_affiliations: true,
        clinic_location: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: doctors,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/doctors - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch doctors',
      },
      { status: 500 }
    );
  }
}
