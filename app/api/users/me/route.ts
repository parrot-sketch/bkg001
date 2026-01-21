/**
 * API Route: GET/PUT /api/users/me
 * 
 * User Profile Management endpoint.
 * 
 * Allows authenticated users to view and update their own profile information.
 * 
 * Security:
 * - Requires authentication
 * - Users can only update their own profile
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { DomainException } from '@/domain/exceptions/DomainException';

/**
 * GET /api/users/me
 * 
 * Returns the current user's profile information.
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

    const userId = authResult.user.userId;

    // 2. Fetch user from database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // 3. Return user profile
    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          status: user.status,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/users/me GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user profile',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/me
 * 
 * Updates the current user's profile information.
 * 
 * Request body:
 * - firstName?: string
 * - lastName?: string
 * - phone?: string
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
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

    const userId = authResult.user.userId;

    // 2. Parse request body
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

    // 3. Validate input (all fields are optional for basic profile)
    const updateData: {
      first_name?: string;
      last_name?: string;
      phone?: string;
    } = {};

    if (body.firstName !== undefined) {
      if (typeof body.firstName !== 'string' || body.firstName.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'First name must be a non-empty string',
          },
          { status: 400 }
        );
      }
      updateData.first_name = body.firstName.trim();
    }

    if (body.lastName !== undefined) {
      if (typeof body.lastName !== 'string' || body.lastName.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Last name must be a non-empty string',
          },
          { status: 400 }
        );
      }
      updateData.last_name = body.lastName.trim();
    }

    if (body.phone !== undefined) {
      if (body.phone !== null && (typeof body.phone !== 'string' || body.phone.trim().length === 0)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Phone must be a non-empty string or null',
          },
          { status: 400 }
        );
      }
      updateData.phone = body.phone ? body.phone.trim() : null;
    }

    // 4. Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // 5. Update user profile
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    // 6. Return updated user profile
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
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
        },
        message: 'Profile updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    console.error('[API] /api/users/me PUT - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user profile',
      },
      { status: 500 }
    );
  }
}
