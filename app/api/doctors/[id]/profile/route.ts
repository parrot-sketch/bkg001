/**
 * API Route: GET /api/doctors/:id/profile
 * GET /api/doctors/:id/profile (PUT for update)
 * 
 * Doctor Profile Management endpoints.
 * 
 * Allows doctors to view and update their profile information.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can update their own profile (or ADMIN)
 * - Public read access for profile viewing
 */

import { NextRequest, NextResponse } from 'next/server';
import { UpdateDoctorProfileUseCase } from '@/application/use-cases/UpdateDoctorProfileUseCase';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { UpdateDoctorProfileDto } from '@/application/dtos/UpdateDoctorProfileDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

import { PrismaDoctorRepository } from '@/infrastructure/database/repositories/PrismaDoctorRepository';

// Initialize dependencies (singleton pattern)
const auditService = new ConsoleAuditService();
const doctorRepository = new PrismaDoctorRepository(db);

// Initialize use case
const updateDoctorProfileUseCase = new UpdateDoctorProfileUseCase(
  doctorRepository,
  auditService,
);

/**
 * GET /api/doctors/:id/profile
 * 
 * Returns doctor profile information.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const doctorId = params.id;

    if (!doctorId) {
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
      where: { id: doctorId },
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
        onboarding_status: true,
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
    console.error('[API] /api/doctors/[id]/profile GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch doctor profile',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/doctors/:id/profile
 * 
 * Updates doctor profile information.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;

    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;

    // 2. Extract doctor ID from params
    const doctorId = params.id;
    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID is required',
        },
        { status: 400 }
      );
    }

    // 3. Check permissions (only DOCTOR can update their own profile, or ADMIN)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can update their profile',
        },
        { status: 403 }
      );
    }

    // 4. Verify doctor can only update their own profile (unless admin)
    if (userRole === Role.DOCTOR) {
      // Need to check if userId matches doctor's user_id
      const doctor = await db.doctor.findUnique({
        where: { id: doctorId },
        select: { user_id: true },
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

      if (doctor.user_id !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Doctors can only update their own profile',
          },
          { status: 403 }
        );
      }
    }

    // 5. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // 6. Build DTO
    const dto: UpdateDoctorProfileDto = {
      doctorId,
      bio: body.bio,
      education: body.education,
      focusAreas: body.focusAreas,
      professionalAffiliations: body.professionalAffiliations,
      profileImage: body.profileImage,
      clinicLocation: body.clinicLocation,
    };

    // 7. Execute update doctor profile use case
    const response = await updateDoctorProfileUseCase.execute(dto);

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Doctor profile updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., validation errors)
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] /api/doctors/[id]/profile PUT - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
