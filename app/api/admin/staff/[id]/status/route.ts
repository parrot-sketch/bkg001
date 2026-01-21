/**
 * API Route: PUT /api/admin/staff/:id/status
 * 
 * Update Staff Status endpoint.
 * 
 * Updates staff member status (activate/deactivate).
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Status } from '@prisma/client';

/**
 * PUT /api/admin/staff/:id/status
 * 
 * Updates staff status
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

    const { status, updatedBy } = body;

    if (!status || !Object.values(Status).includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED',
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

    // 5. Prevent deactivating admin users
    if (user.role === 'ADMIN' && status !== 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot deactivate admin users',
        },
        { status: 400 }
      );
    }

    // 6. Update user status
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        status: status as Status,
      },
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

    // 7. Create audit log entry
    try {
      await db.auditLog.create({
        data: {
          user_id: updatedBy || authResult.user.userId,
          record_id: id,
          action: 'UPDATE',
          model: 'User',
          details: `Staff status updated to ${status}`,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        },
      });
    } catch (auditError) {
      console.error('[API] Failed to create audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

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
        message: 'Staff status updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/staff/[id]/status - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update staff status',
      },
      { status: 500 }
    );
  }
}
