import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

/**
 * GET /api/doctors/[id]
 * 
 * Returns a single doctor by ID
 * Public endpoint - no authentication required (for appointment cards)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch doctor from database
    const doctor = await db.doctor.findUnique({
      where: { id },
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
        profile_image: true,
        availability_status: true,
        bio: true,
        education: true,
        focus_areas: true,
        professional_affiliations: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!doctor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor not found',
        },
        { status: 404 }
      );
    }

    // Map to DoctorResponseDto
    const doctorDto: DoctorResponseDto = {
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
      profileImage: doctor.profile_image ?? undefined,
      availabilityStatus: doctor.availability_status ?? undefined,
      bio: doctor.bio ?? undefined,
      education: doctor.education ?? undefined,
      focusAreas: doctor.focus_areas ?? undefined,
      professionalAffiliations: doctor.professional_affiliations ?? undefined,
      createdAt: doctor.created_at,
      updatedAt: doctor.updated_at,
    };

    return NextResponse.json(
      {
        success: true,
        data: doctorDto,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/doctors/[id] - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch doctor',
      },
      { status: 500 }
    );
  }
}
