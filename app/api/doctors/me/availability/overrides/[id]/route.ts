/**
 * API Route: DELETE /api/doctors/me/availability/overrides/:id
 * 
 * Delete availability override for a doctor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import db from '@/lib/db';

const availabilityRepository = new PrismaAvailabilityRepository(db);

/**
 * DELETE /api/doctors/me/availability/overrides/:id
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    
    // Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json(
        { success: false, error: 'Only doctors can manage availability' },
        { status: 403 }
      );
    }

    // Get doctor ID
    const doctor = await db.doctor.findUnique({
      where: { user_id: authResult.user.userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // Verify override belongs to this doctor
    const override = await db.availabilityOverride.findUnique({
      where: { id: params.id },
      select: { doctor_id: true },
    });

    if (!override) {
      return NextResponse.json(
        { success: false, error: 'Override not found' },
        { status: 404 }
      );
    }

    if (override.doctor_id !== doctor.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete override
    await availabilityRepository.deleteOverride(params.id);

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/doctors/me/availability/overrides/[id] DELETE - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete availability override' },
      { status: 500 }
    );
  }
}
