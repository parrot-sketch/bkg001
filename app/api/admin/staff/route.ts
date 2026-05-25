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
import { Role as PrismaRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createStaffDtoSchema } from '@/application/dtos/CreateStaffDto';
import { Role as DomainRole } from '@/domain/enums/Role';
import { randomUUID } from 'crypto';

function getStaffRoles(): PrismaRole[] {
  return Object.values(PrismaRole).filter((r) => r !== PrismaRole.PATIENT);
}

function generateTempLicenseNumber(): string {
  return `TEMP-${randomUUID().split('-')[0].toUpperCase()}`;
}

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
        in: getStaffRoles(),
      },
    };

    if (roleParam && Object.values(PrismaRole).includes(roleParam as PrismaRole) && roleParam !== PrismaRole.PATIENT) {
      where.role = roleParam as PrismaRole;
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
          mfa_enabled: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
          doctor_profile: {
            select: {
              specialization: true,
            },
          },
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
      doctorSpecialization: user.doctor_profile?.specialization ?? undefined,
      mfaEnabled: user.mfa_enabled,
      lastLoginAt: user.last_login_at,
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

    const parsed = createStaffDtoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid request',
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phone, role, doctorSpecialization, allowAdmin } = parsed.data;

    // 4. Safety: ADMIN creation must be explicit
    if (role === DomainRole.ADMIN && allowAdmin !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Creating ADMIN accounts requires allowAdmin=true',
        },
        { status: 400 }
      );
    }

    // 5. Check if user already exists
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

    // 6. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const prismaRole = role as unknown as PrismaRole;

    // 7. Create user and profile in transaction
    const newUser = await db.$transaction(async (tx) => {
      // Create the User
      const user = await tx.user.create({
        data: {
          email,
          password_hash: passwordHash,
          role: prismaRole,
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
          mfa_enabled: true,
          created_at: true,
          updated_at: true,
        },
      });

      // If role is DOCTOR, create the required Doctor profile
      if (prismaRole === PrismaRole.DOCTOR) {
        const tempLicense = generateTempLicenseNumber();

        await tx.doctor.create({
          data: {
            user_id: user.id,
            email: user.email,
            first_name: user.first_name || 'Doctor',
            last_name: user.last_name || 'User',
            name: `${user.first_name || 'Dr.'} ${user.last_name || 'User'}`,
            phone: user.phone || '0000000000',
            specialization: doctorSpecialization || 'General Practice',
            license_number: tempLicense,
            address: 'Clinic Address', // Default
            // Admin-created doctors can log in immediately, but must complete schedule setup.
            onboarding_status: 'PROFILE_COMPLETED',
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

    // 8. Create audit log entry (outside transaction to avoid blocking if audit fails)
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

    // 9. Return created user
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
          doctorSpecialization: newUser.role === PrismaRole.DOCTOR ? (doctorSpecialization || 'General Practice') : undefined,
          mfaEnabled: newUser.mfa_enabled,
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
