/**
 * API Route: GET /api/doctors/me/schedule/blocks
 * 
 * Get schedule blocks for a doctor within a date range.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctors can only view their own blocks
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';

const availabilityRepository = new PrismaAvailabilityRepository(db);

/**
 * GET /api/doctors/me/schedule/blocks
 * 
 * Query params:
 * - startDate: Date (YYYY-MM-DD) - optional
 * - endDate: Date (YYYY-MM-DD) - optional
 * 
 * Returns schedule blocks for the doctor.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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
        { success: false, error: 'Only doctors can view their schedule blocks' },
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      try {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
    } else {
      // Default: last month to 3 months ahead
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
    }

    // 4. Get blocks via repository
    const blocks = await availabilityRepository.getBlocks(doctor.id, startDate, endDate);

    // 5. Map to response format
    const blocksResponse = blocks.map(block => ({
      id: block.id,
      doctorId: block.doctorId,
      startDate: block.startDate,
      endDate: block.endDate,
      startTime: block.startTime,
      endTime: block.endTime,
      blockType: block.blockType,
      reason: block.reason,
      createdBy: block.createdBy,
    }));

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        data: blocksResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('[API] /api/doctors/me/schedule/blocks GET - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule blocks' },
      { status: 500 }
    );
  }
}
