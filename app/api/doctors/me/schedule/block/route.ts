/**
 * API Route: POST /api/doctors/me/schedule/block
 * 
 * Create schedule block for a doctor.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctors can only create blocks for themselves
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { AddScheduleBlockUseCase } from '@/application/use-cases/AddScheduleBlockUseCase';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';
import type { CreateScheduleBlockDto } from '@/application/dtos/ScheduleBlockDto';

const availabilityRepository = new PrismaAvailabilityRepository(db);
const addScheduleBlockUseCase = new AddScheduleBlockUseCase(availabilityRepository, db);

/**
 * POST /api/doctors/me/schedule/block
 * 
 * Body:
 * - startDate: Date (ISO string)
 * - endDate: Date (ISO string)
 * - startTime?: string (HH:mm) - optional, for partial day blocks
 * - endTime?: string (HH:mm) - optional, for partial day blocks
 * - blockType: string (LEAVE, SURGERY, ADMIN, etc.)
 * - reason?: string
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json(
        { success: false, error: 'Only doctors can manage schedule blocks' },
        { status: 403 }
      );
    }

    // 2. Get doctor ID
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

    // 3. Parse and validate request body
    const body = await request.json();
    const { startDate, endDate, startTime, endTime, blockType, reason } = body;

    if (!startDate || !endDate || !blockType) {
      return NextResponse.json(
        { success: false, error: 'startDate, endDate, and blockType are required' },
        { status: 400 }
      );
    }

    // 4. Create DTO
    const dto: CreateScheduleBlockDto = {
      doctorId: doctor.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      blockType,
      reason: reason || undefined,
      createdBy: authResult.user.userId,
    };

    // 5. Execute use case (all business logic in use case)
    const block = await addScheduleBlockUseCase.execute(dto);

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        data: block,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('[API] /api/doctors/me/schedule/block POST - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create schedule block' },
      { status: 500 }
    );
  }
}
