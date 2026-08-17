/**
 * GET /api/nurse/surgical-cases
 *
 * Returns surgical cases for nurse workflow.
 * Nurses can view cases with statuses relevant to nursing care:
 * - READY_FOR_WARD_PREP, IN_WARD_PREP (pre-op)
 * - SCHEDULED, IN_PREP, IN_THEATER (intra-op)
 * - RECOVERY, COMPLETED (post-op)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (authResult.user.role !== Role.NURSE && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = 20;

    const where: any = {};

    const nurseStatuses = [
      'READY_FOR_WARD_PREP',
      'IN_WARD_PREP',
      'READY_FOR_THEATER_BOOKING',
      'SCHEDULED',
      'IN_PREP',
      'IN_THEATER',
      'RECOVERY',
      'COMPLETED',
    ];

    if (status) {
      const statusValues = status.split(',');
      where.status = { in: statusValues };
    } else {
      where.status = { in: nurseStatuses };
    }

    if (search) {
      where.OR = [
        { patient: { first_name: { contains: search, mode: 'insensitive' } } },
        { patient: { last_name: { contains: search, mode: 'insensitive' } } },
        { patient: { file_number: { contains: search, mode: 'insensitive' } } },
        { procedure_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [cases, total] = await Promise.all([
      db.surgicalCase.findMany({
        where,
        include: {
          patient: {
            select: { id: true, first_name: true, last_name: true, file_number: true },
          },
          primary_surgeon: {
            select: { name: true },
          },
          case_procedures: {
            include: { procedure: true },
          },
          theater_booking: true,
        },
        orderBy: { created_at: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.surgicalCase.count({ where }),
    ]);

    const mappedCases = cases.map((c) => ({
      ...c,
      procedure_name: c.case_procedures?.length > 0
        ? c.case_procedures.map((cp) => cp.procedure.name).join(', ')
        : c.procedure_name,
    }));

    return NextResponse.json({
      success: true,
      data: mappedCases,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching nurse surgical cases:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch cases' }, { status: 500 });
  }
}
