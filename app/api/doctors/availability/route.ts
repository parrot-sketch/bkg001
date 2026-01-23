/**
 * API Route: GET /api/doctors/availability
 * 
 * Front Desk Availability View endpoint.
 * 
 * Returns all doctors' availability for a date range.
 * Used by front desk to view unified availability calendar.
 * 
 * Security:
 * - Requires authentication
 * - Only FRONTDESK and ADMIN can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetAllDoctorsAvailabilityUseCase } from '@/application/use-cases/GetAllDoctorsAvailabilityUseCase';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import db, { withRetry } from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies
const availabilityRepository = new PrismaAvailabilityRepository(db);
const getAllDoctorsAvailabilityUseCase = new GetAllDoctorsAvailabilityUseCase(
  availabilityRepository,
  db
);

/**
 * GET /api/doctors/availability
 * 
 * Query params:
 * - startDate: Start date (YYYY-MM-DD) - required
 * - endDate: End date (YYYY-MM-DD) - required
 * - specialization: Optional specialization filter
 * 
 * Returns all doctors' availability for the date range.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

    const userRole = authResult.user.role;

    // 2. Check permissions (only FRONTDESK and ADMIN can access)
    if (userRole !== Role.FRONTDESK && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only front desk and admin can view all doctors\' availability',
        },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const specializationParam = searchParams.get('specialization');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate and endDate query parameters are required (YYYY-MM-DD format)',
        },
        { status: 400 }
      );
    }

    // 4. Parse dates
    let startDate: Date;
    let endDate: Date;
    try {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format.',
        },
        { status: 400 }
      );
    }

    // 5. Execute get all doctors availability use case with retry logic
    // This handles connection initialization errors and transient connection failures
    const response = await withRetry(async () => {
      return await getAllDoctorsAvailabilityUseCase.execute({
        startDate,
        endDate,
        specialization: specializationParam || undefined,
      });
    });

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Unexpected error - check if it's a connection error
    const isConnectionError = 
      error instanceof Error && (
        error.message?.includes('Can\'t reach database server') ||
        error.message?.includes('Connection closed') ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('Connection refused') ||
        error.name === 'PrismaClientInitializationError'
      );
    
    console.error('[API] /api/doctors/availability GET - Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : undefined,
      isConnectionError,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: isConnectionError
          ? 'Database connection error. Please try again in a moment.'
          : 'Failed to fetch doctors availability',
      },
      { status: isConnectionError ? 503 : 500 } // 503 Service Unavailable for connection errors
    );
  }
}
