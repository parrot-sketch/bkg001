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

    // 4. Find user
    const user = await db.user.findUnique({
      where: { id },
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

    // 5. Validate role (can't change to/from ADMIN)
    if (body.role && body.role !== user.role) {
      if (user.role === 'ADMIN' || body.role === 'ADMIN') {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot change admin role',
          },
          { status: 400 }
        );
      }
    }

    // 6. Build update data
    const updateData: any = {};
    if (body.firstName !== undefined) updateData.first_name = body.firstName;
    if (body.lastName !== undefined) updateData.last_name = body.lastName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.role !== undefined && body.role !== 'ADMIN') updateData.role = body.role;

    // 7. Update user
    const updatedUser = await db.user.update({
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
        created_at: true,
        updated_at: true,
      },
    });

    // 8. Return updated user
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
