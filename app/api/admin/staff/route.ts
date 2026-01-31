/**
 * API Route: GET /api/admin/staff
 * POST /api/admin/staff
 * 
 * Admin Staff Management endpoint.
 * 
 * GET: Returns all staff members (doctors, nurses, frontdesk) for admin management.
 * POST: Creates a new staff member.
 * 
 * Query params (GET):
 * - role: Filter by role (optional)
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * GET /api/admin/staff
 * 
 * Returns paginated list of staff members
 * 
 * Query params:
 * - role: Filter by role (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
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
    const roleParam = searchParams.get('role');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // 4. Parse and validate pagination parameters
    // REFACTORED: Added pagination to prevent unbounded queries
    // As staff grows, fetching all would cause performance issues
    const MAX_LIMIT = 100; // CRITICAL: Enforce maximum to prevent abuse
    const DEFAULT_LIMIT = 50;
    const DEFAULT_PAGE = 1;

    const page = Math.max(1, parseInt(pageParam || String(DEFAULT_PAGE), 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limitParam || String(DEFAULT_LIMIT), 10)));
    const skip = (page - 1) * limit;

    // 5. Build where clause
    const where: any = {
      role: {
        in: [Role.DOCTOR, Role.NURSE, Role.FRONTDESK],
      },
    };

    if (roleParam && Object.values(Role).includes(roleParam as Role)) {
      where.role = roleParam as Role;
    }

    // 6. Fetch staff with pagination
    // REFACTORED: Added take and skip for pagination
    const [staff, totalCount] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: {
          created_at: 'desc',
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
        take: limit, // REFACTORED: Bounded query
        skip: skip,  // REFACTORED: Pagination offset
      }),
      db.user.count({ where }), // Total count for pagination metadata
    ]);

    // 6. Map to response format
    const staffDtos = staff.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    // 7. Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    // 8. Return paginated staff
    return NextResponse.json(
      {
        success: true,
        data: staffDtos,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/staff GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch staff',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/staff
 * 
 * Creates a new staff member
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const { email, password, firstName, lastName, phone, role } = body;

    // 4. Validate required fields
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid email is required',
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password is required and must be at least 6 characters',
        },
        { status: 400 }
      );
    }

    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid role is required (DOCTOR, NURSE, or FRONTDESK)',
        },
        { status: 400 }
      );
    }

    // 5. Prevent creating admin users
    if (role === 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot create admin users through this endpoint',
        },
        { status: 400 }
      );
    }

    // 6. Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User with this email already exists',
        },
        { status: 409 }
      );
    }

    // 7. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 8. Create user and profile in transaction
    const newUser = await db.$transaction(async (tx) => {
      // Create the User
      const user = await tx.user.create({
        data: {
          email,
          password_hash: passwordHash,
          role: role as Role,
          status: 'ACTIVE',
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
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

      // If role is DOCTOR, create the required Doctor profile
      if (role === 'DOCTOR') {
        const tempLicense = `TEMP-${Date.now().toString().slice(-6)}`;

        await tx.doctor.create({
          data: {
            user_id: user.id,
            email: user.email,
            first_name: user.first_name || 'Doctor',
            last_name: user.last_name || 'User',
            name: `${user.first_name || 'Dr.'} ${user.last_name || 'User'}`,
            phone: user.phone || '0000000000',
            specialization: 'General Practice', // Default
            license_number: tempLicense,
            address: 'Clinic Address', // Default
            onboarding_status: 'ACTIVE', // Critical: Allows immediate login
            availability_status: 'AVAILABLE',
            type: 'FULL',
          },
        });
      }

      // Create audit log within transaction (or outside if preferred, but safe here)
      // Note: We swallow error here to not fail transaction on audit log failure as per original logic, 
      // but inside transaction it's better to be strict. For now keeping it simple.

      return user;
    });

    // 9. Create audit log entry (outside transaction to avoid blocking if audit fails)
    try {
      await db.auditLog.create({
        data: {
          user_id: authResult.user.userId,
          record_id: newUser.id,
          action: 'CREATE',
          model: 'User',
          details: `Staff member created: ${email} (${role})`,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        },
      });
    } catch (auditError) {
      console.error('[API] Failed to create audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    // 10. Return created user
    return NextResponse.json(
      {
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
          createdAt: newUser.created_at,
          updatedAt: newUser.updated_at,
        },
        message: 'Staff member created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] /api/admin/staff POST - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create staff member',
      },
      { status: 500 }
    );
  }
}
