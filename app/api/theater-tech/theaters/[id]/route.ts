/**
 * API Route: /api/theater-tech/theaters/[id]
 *
 * Theater Management for Theater Technician (and Admin).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['MAJOR', 'MINOR', 'PROCEDURE_ROOM']).optional(),
  color_code: z.string().optional(),
  notes: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
  operational_hours: z.string().nullable().optional(),
  capabilities: z.string().nullable().optional(),
  rate_per_minute: z.number().nonnegative().optional(),
  hourly_rate: z.number().nonnegative().optional(), // legacy/back-compat
});

async function requireTheaterTechOrAdmin(request: NextRequest) {
  const authResult = await JwtMiddleware.authenticate(request);
  if (!authResult.success || !authResult.user) {
    return { ok: false as const, res: NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }) };
  }
  const { role } = authResult.user;
  if (role !== Role.THEATER_TECHNICIAN && role !== Role.ADMIN) {
    return { ok: false as const, res: NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 }) };
  }
  return { ok: true as const };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireTheaterTechOrAdmin(request);
  if (!guard.ok) return guard.res;

  const { id } = await context.params;
  const theater = await db.theater.findUnique({ where: { id } });
  if (!theater) {
    return NextResponse.json({ success: false, error: 'Theater not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: theater });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireTheaterTechOrAdmin(request);
  if (!guard.ok) return guard.res;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const { rate_per_minute, hourly_rate, ...rest } = validated;
    const data: Record<string, unknown> = { ...rest };
    if (typeof rate_per_minute === 'number') {
      data.hourly_rate = Math.round(rate_per_minute * 60);
    } else if (typeof hourly_rate === 'number') {
      data.hourly_rate = Math.round(hourly_rate);
    }

    const updated = await db.theater.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('[API] /api/theater-tech/theaters/[id] PUT - Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update theater' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireTheaterTechOrAdmin(request);
  if (!guard.ok) return guard.res;

  const { id } = await context.params;

  try {
    const activeBookings = await db.theaterBooking.count({
      where: {
        theater_id: id,
        status: { in: ['PROVISIONAL', 'CONFIRMED'] },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete theater with ${activeBookings} active booking(s). Cancel bookings first.`,
        },
        { status: 409 },
      );
    }

    await db.theater.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    console.error('[API] /api/theater-tech/theaters/[id] DELETE - Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete theater' }, { status: 500 });
  }
}

