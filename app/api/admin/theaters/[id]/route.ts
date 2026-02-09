import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateTheaterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['MAJOR', 'MINOR', 'PROCEDURE_ROOM']).optional(),
  color_code: z.string().optional(),
  notes: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
  operational_hours: z.string().nullable().optional(),
  capabilities: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const theater = await db.theater.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { start_time: 'asc' },
          include: {
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

    if (!theater) {
      return NextResponse.json({ error: 'Theater not found' }, { status: 404 });
    }

    return NextResponse.json(theater);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch theater' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const validated = updateTheaterSchema.parse(body);

    const updated = await db.theater.update({
      where: { id },
      data: validated,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to update theater' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Check for active bookings before deleting
    const activeBookings = await db.theaterBooking.count({
      where: {
        theater_id: id,
        status: { in: ['PROVISIONAL', 'CONFIRMED'] },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: `Cannot delete theater with ${activeBookings} active booking(s). Cancel bookings first.` },
        { status: 409 }
      );
    }

    await db.theater.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete theater' }, { status: 500 });
  }
}
