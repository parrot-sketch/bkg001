/**
 * API Route: PUT /api/admin/staff/:id
 * 
 * Update Staff endpoint.
 * 
 * Updates staff member information.
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { updateStaffDtoSchema } from '@/application/dtos/UpdateStaffDto';
import { Role as PrismaRole } from '@prisma/client';
import { Role as DomainRole } from '@/domain/enums/Role';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

function generateTempLicenseNumber(): string {
  return `TEMP-${randomUUID().split('-')[0].toUpperCase()}`;
}

/**
 * PUT /api/admin/staff/:id
 * 
 * Updates a staff member
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
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

    // 2. Check permissions (only ADMIN)
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Admin access required',
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 3. Parse request body
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

    const parsed = updateStaffDtoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid request',
        },
        { status: 400 }
      );
    }

    // 4. Find user
    const user = await db.user.findUnique({
      where: { id },
      include: {
        doctor_profile: {
          select: {
            specialization: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Staff member not found',
        },
        { status: 404 }
      );
    }

    const { allowAdmin } = parsed.data;

    // 5. Validate role changes involving ADMIN (must be explicit)
    if (parsed.data.role && parsed.data.role !== user.role) {
      if (user.role === PrismaRole.ADMIN || parsed.data.role === DomainRole.ADMIN) {
        if (allowAdmin !== true) {
          return NextResponse.json(
            {
              success: false,
              error: 'Changing ADMIN role requires allowAdmin=true',
            },
            { status: 400 }
          );
        }
      }

    }

    // 6. Enforce email uniqueness on change
    if (parsed.data.email && parsed.data.email !== user.email) {
      const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'User with this email already exists',
          },
          { status: 409 }
        );
      }
    }

    // 7. Build update data
    const updateData: any = {};
    if (parsed.data.firstName !== undefined) updateData.first_name = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) updateData.last_name = parsed.data.lastName;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role as unknown as PrismaRole;

    if (parsed.data.password?.trim()) {
      updateData.password_hash = await bcrypt.hash(parsed.data.password, 10);
    }

    const effectiveRole = (updateData.role ?? user.role) as PrismaRole;

    // 8. Update user (and doctor profile if needed)
    const updatedUser = await db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          role: true,
          status: true,
          mfa_enabled: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (effectiveRole === PrismaRole.DOCTOR) {
        const specialization =
          parsed.data.doctorSpecialization ||
          user.doctor_profile?.specialization ||
          'General Practice';

        await tx.doctor.upsert({
          where: { user_id: u.id },
          create: {
            user_id: u.id,
            email: u.email,
            first_name: u.first_name || 'Doctor',
            last_name: u.last_name || 'User',
            name: `${u.first_name || 'Dr.'} ${u.last_name || 'User'}`,
            phone: u.phone || '0000000000',
            specialization,
            license_number: generateTempLicenseNumber(),
            address: 'Clinic Address',
            // If an existing staff member is promoted to DOCTOR, require schedule setup.
            onboarding_status: 'PROFILE_COMPLETED',
            availability_status: 'AVAILABLE',
            type: 'FULL',
          },
          update: {
            email: u.email,
            first_name: u.first_name || 'Doctor',
            last_name: u.last_name || 'User',
            name: `${u.first_name || 'Dr.'} ${u.last_name || 'User'}`,
            phone: u.phone || '0000000000',
            specialization,
          },
        });
      } else if (parsed.data.email && user.doctor_profile) {
        // Keep doctor profile email in sync when a doctor account is edited but role stays non-doctor.
        // This is rare, but it prevents stale unique email on the Doctor model.
        await tx.doctor.update({
          where: { user_id: u.id },
          data: { email: u.email },
        }).catch(() => undefined);
      }

      const doctor = await tx.doctor.findUnique({
        where: { user_id: u.id },
        select: { specialization: true },
      });

      return { ...u, doctor_profile: doctor };
    });

    // 9. Return updated user
    return NextResponse.json(
      {
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          phone: updatedUser.phone,
          role: updatedUser.role,
          status: updatedUser.status,
          doctorSpecialization: (updatedUser as any).doctor_profile?.specialization ?? undefined,
          mfaEnabled: updatedUser.mfa_enabled,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
        },
        message: 'Staff member updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/staff/[id] - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update staff member',
      },
      { status: 500 }
    );
  }
}
