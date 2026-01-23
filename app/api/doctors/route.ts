import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Route segment config
 * Ensure this route is properly configured for production
 */
export const dynamic = 'force-dynamic'; // Always fetch fresh data
export const revalidate = 0; // No static caching
export const runtime = 'nodejs'; // Use Node.js runtime

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
      take: 100, // Limit results to prevent unbounded queries
    });

    return NextResponse.json(
      {
        success: true,
        data: doctors || [], // Ensure array is never null
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Cache for 1 minute, serve stale for 5 minutes
        },
      }
    );
  } catch (error: any) {
    // Log full error for debugging
    console.error('[API] /api/doctors - Error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });

    // Return proper error response
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'Failed to fetch doctors. Please try again later.'
          : error?.message || 'Failed to fetch doctors',
        data: [], // Always return array to prevent frontend errors
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
