/**
 * API Route: DELETE /api/doctors/me/schedule/block/:id
 * 
 * Delete schedule block for a doctor.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctors can only delete their own blocks
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { RemoveScheduleBlockUseCase } from '@/application/use-cases/RemoveScheduleBlockUseCase';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';

const availabilityRepository = new PrismaAvailabilityRepository(db);
const removeScheduleBlockUseCase = new RemoveScheduleBlockUseCase(availabilityRepository, db);

/**
 * DELETE /api/doctors/me/schedule/block/:id
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;

    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== Role.DOCTOR && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only doctors and admins can delete schedule blocks' },
        { status: 403 }
      );
    }

    // 2. Execute use case (all business logic and authorization in use case)
    await removeScheduleBlockUseCase.execute(
      params.id,
      authResult.user.userId,
      authResult.user.role
    );

    // 3. Return success
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 400 }
      );
    }

    console.error('[API] /api/doctors/me/schedule/block/[id] DELETE - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule block' },
      { status: 500 }
    );
  }
}
