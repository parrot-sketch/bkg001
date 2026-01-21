/**
 * API Route: GET /api/admin/audit-logs
 * 
 * Admin Audit Logs endpoint.
 * 
 * Returns audit logs for system activity tracking.
 * 
 * Query params:
 * - limit: Number of logs to return (default: 50)
 * - offset: Number of logs to skip (default: 0)
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';

/**
 * GET /api/admin/audit-logs
 * 
 * Returns audit logs
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 1000',
        },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid offset parameter. Must be >= 0',
        },
        { status: 400 }
      );
    }

    // 4. Fetch audit logs
    const auditLogs = await db.auditLog.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
      },
    });

    // 5. Map to response format
    const logs = auditLogs.map((log) => ({
      id: log.id,
      userId: log.user_id,
      user: log.user
        ? {
            id: log.user.id,
            email: log.user.email,
            firstName: log.user.first_name,
            lastName: log.user.last_name,
            role: log.user.role,
          }
        : null,
      recordId: log.record_id,
      action: log.action,
      model: log.model,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
    }));

    // 6. Get total count
    const totalCount = await db.auditLog.count();

    // 7. Return audit logs
    return NextResponse.json(
      {
        success: true,
        data: logs,
        meta: {
          total: totalCount,
          limit,
          offset,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/audit-logs - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit logs',
      },
      { status: 500 }
    );
  }
}
