/**
 * API Route: POST /api/admin/patients/:id/reject
 * 
 * Reject Patient endpoint.
 * 
 * Rejects a patient registration.
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';

/**
 * POST /api/admin/patients/:id/reject
 * 
 * Rejects a patient
 */
export async function POST(
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

    const { reason, rejectedBy } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rejection reason is required',
        },
        { status: 400 }
      );
    }

    // 4. Find patient
    const patient = await db.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found',
        },
        { status: 404 }
      );
    }

    // 5. Update patient (mark as rejected - you may want to add a rejected field to schema)
    // For now, we'll just set approved to false and add a note
    await db.patient.update({
      where: { id },
      data: {
        approved: false,
        // Note: If you have a rejection_reason field, add it here
      },
    });

    // 6. Create audit log entry (optional but recommended)
    try {
      await db.auditLog.create({
        data: {
          user_id: rejectedBy || authResult.user.userId,
          record_id: id,
          action: 'REJECT',
          model: 'Patient',
          details: `Patient registration rejected. Reason: ${reason}`,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        },
      });
    } catch (auditError) {
      console.error('[API] Failed to create audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    // 7. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Patient registration rejected',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/patients/[id]/reject - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reject patient',
      },
      { status: 500 }
    );
  }
}
