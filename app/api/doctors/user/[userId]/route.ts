import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

/**
 * GET /api/doctors/user/[userId]
 * 
 * Returns a doctor by user ID
 * Requires authentication - doctors can view their own profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  let userId: string | undefined;

  try {
    const paramsResult = await params;
    userId = paramsResult.userId;

    console.log('[API] GET /api/doctors/user/[userId] - Request:', {
      userId: userId,
      timestamp: new Date().toISOString(),
    });

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch doctor from database by user_id
    console.log('[API] GET /api/doctors/user/[userId] - Fetching doctor from database...');
    const doctor = await db.doctor.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        email: true,
        first_name: true,
        last_name: true,
        title: true,
        name: true,
        specialization: true,
        license_number: true,
        phone: true,
        address: true,
        clinic_location: true,
        department: true,
        img: true,
        profile_image: true,
        colorCode: true,
        availability_status: true,
        type: true,
        bio: true,
        education: true,
        focus_areas: true,
        professional_affiliations: true,
        created_at: true,
        updated_at: true,
        availability_templates: {
          where: { is_active: true },
          select: {
            slots: {
              select: {
                day_of_week: true,
                start_time: true,
                end_time: true,
              }
            }
          }
        },
      },
    });

    console.log('[API] GET /api/doctors/user/[userId] - Doctor found:', doctor ? { id: doctor.id, name: doctor.name } : 'null');

    if (!doctor) {
      return NextResponse.json(
        {
          success: false,
          error: `Doctor not found for user ID: ${userId}`,
        },
        { status: 404 }
      );
    }

    // Map to DoctorResponseDto with additional fields
    console.log('[API] GET /api/doctors/user/[userId] - Mapping doctor data...');
    const doctorDto: DoctorResponseDto & { img?: string; colorCode?: string; type?: string } = {
      id: doctor.id,
      userId: doctor.user_id,
      email: doctor.email,
      firstName: doctor.first_name,
      lastName: doctor.last_name,
      title: doctor.title ?? undefined,
      name: doctor.name,
      specialization: doctor.specialization,
      licenseNumber: doctor.license_number,
      phone: doctor.phone,
      address: doctor.address,
      clinicLocation: doctor.clinic_location ?? undefined,
      department: doctor.department ?? undefined,
      profileImage: doctor.profile_image ?? doctor.img ?? undefined,
      availabilityStatus: doctor.availability_status ?? undefined,
      bio: doctor.bio ?? undefined,
      education: doctor.education ?? undefined,
      focusAreas: doctor.focus_areas ?? undefined,
      professionalAffiliations: doctor.professional_affiliations ?? undefined,
      createdAt: doctor.created_at,
      updatedAt: doctor.updated_at,
      img: doctor.img ?? undefined,
      colorCode: doctor.colorCode ?? undefined,
      type: doctor.type ?? undefined,
    };

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const activeTemplate = doctor.availability_templates[0];
    const workingDays = activeTemplate?.slots.map(slot => ({
      day: daysOfWeek[slot.day_of_week],
      start_time: slot.start_time,
      end_time: slot.end_time
    })) || [];

    const responseData = {
      ...doctorDto,
      workingDays: workingDays,
    };

    console.log('[API] GET /api/doctors/user/[userId] - Success:', {
      doctorId: responseData.id,
      name: responseData.name,
      workingDaysCount: responseData.workingDays?.length || 0,
    });

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error) {
    // Enhanced error logging for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : typeof error;

    console.error('[API] GET /api/doctors/user/[userId] - Error Details:', {
      message: errorMessage,
      name: errorName,
      stack: errorStack,
      userId: userId,
      error: error,
    });

    // Return detailed error in development, generic in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        success: false,
        error: isDevelopment
          ? `Failed to fetch doctor: ${errorMessage}`
          : 'Failed to fetch doctor',
        ...(isDevelopment && {
          details: {
            message: errorMessage,
            name: errorName,
            stack: errorStack,
            userId: userId,
          },
        }),
      },
      { status: 500 }
    );
  }
}
