/**
 * API Route: /api/theater-tech/theaters
 *
 * Theater Management for Theater Technician (and Admin).
 *
 * Pricing model:
 * - UI captures `rate_per_minute` (KES/min)
 * - DB stores `hourly_rate` (KES/hour) for billing computations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['MAJOR', 'MINOR', 'PROCEDURE_ROOM']),
  color_code: z.string().optional(),
  notes: z.string().max(1000).nullable().optional(),
  operational_hours: z.string().nullable().optional(),
  capabilities: z.string().nullable().optional(),
  rate_per_minute: z.number().nonnegative().optional(),
  hourly_rate: z.number().nonnegative().optional(), // legacy/back-compat
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { role } = authResult.user;
    if (role !== Role.THEATER_TECHNICIAN && role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Reuse the same shape as the Admin theaters management screens,
    // since Theater Tech reuses those UI components.
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const theaters = await db.theater.findMany({
      orderBy: { name: 'asc' },
      include: {
        bookings: {
          where: {
            status: { not: 'CANCELLED' },
            start_time: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { start_time: 'asc' },
          select: {
            id: true,
            start_time: true,
            end_time: true,
            status: true,
            surgical_case: {
              select: {
                id: true,
                procedure_name: true,
                status: true,
                urgency: true,
                patient: {
                  select: { first_name: true, last_name: true, file_number: true },
                },
                primary_surgeon: {
                  select: { name: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            bookings: { where: { status: { not: 'CANCELLED' } } },
            surgical_records: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: theaters });
  } catch (error) {
    console.error('[API] /api/theater-tech/theaters GET - Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch theaters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { role } = authResult.user;
    if (role !== Role.THEATER_TECHNICIAN && role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createSchema.parse(body);

    const hourlyRate =
      typeof validated.rate_per_minute === 'number'
        ? Math.round(validated.rate_per_minute * 60)
        : Math.round(validated.hourly_rate ?? 0);

    const created = await db.theater.create({
      data: {
        name: validated.name,
        type: validated.type,
        color_code: validated.color_code,
        notes: validated.notes,
        operational_hours: validated.operational_hours,
        capabilities: validated.capabilities,
        hourly_rate: hourlyRate,
        status: 'ACTIVE',
        is_active: true,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('[API] /api/theater-tech/theaters POST - Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create theater' }, { status: 500 });
  }
}
