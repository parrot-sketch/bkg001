import { NextRequest, NextResponse } from 'next/server';
import db, { withRetry } from '@/lib/db';

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
 * 
 * IMPORTANT: This endpoint must not be cached to prevent "Connection closed" errors
 * in production when responses are served from disk cache.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Fetch all doctors from database with retry logic for connection errors
    const doctors = await withRetry(async () => {
      return await db.doctor.findMany({
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
          // REFACTORED: Removed sensitive fields (email, phone) from public API
          // These should only be available to authenticated staff
          // email: true,
          // phone: true,
        },
        take: 100, // Limit results to prevent unbounded queries
      });
    });

    // Ensure we always return a valid array
    const doctorsArray = Array.isArray(doctors) ? doctors : [];

    // Create response with explicit headers to prevent caching
    const response = NextResponse.json(
      {
        success: true,
        data: doctorsArray,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, private',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff',
          // Prevent Vercel edge caching
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );

    return response;
  } catch (error: any) {
    // Log full error for debugging (but don't expose details in production)
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.VERCEL_ENV === 'production';
    
    // Check if it's a connection error
    const isConnectionError = 
      error?.message?.includes('Connection closed') ||
      error?.message?.includes('Connection terminated') ||
      error?.message?.includes('Connection refused') ||
      error?.code === 'P1001' || // Prisma connection error
      error?.code === 'P1008' || // Prisma operation timeout
      error?.code === 'P1017';   // Prisma server closed connection
    
    console.error('[API] /api/doctors - Error:', {
      message: error?.message,
      code: error?.code,
      isConnectionError,
      stack: isProduction ? undefined : error?.stack, // Don't log stack in production
      name: error?.name,
    });

    // Return proper error response with no-cache headers
    return NextResponse.json(
      {
        success: false,
        error: isProduction
          ? 'Failed to fetch doctors. Please try again later.'
          : error?.message || 'Failed to fetch doctors',
        data: [], // Always return array to prevent frontend errors
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
