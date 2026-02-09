import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { Role } from '@prisma/client';
import { z } from 'zod';

const createTheaterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['MAJOR', 'MINOR', 'PROCEDURE_ROOM']),
  color_code: z.string().optional(),
  notes: z.string().max(1000).nullable().optional(),
  operational_hours: z.string().nullable().optional(),
  capabilities: z.string().nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return theaters with booking counts and today's schedule summary
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

  return NextResponse.json(theaters);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createTheaterSchema.parse(body);

    const theater = await db.theater.create({
      data: {
        name: validated.name,
        type: validated.type,
        color_code: validated.color_code,
        notes: validated.notes,
        operational_hours: validated.operational_hours,
        capabilities: validated.capabilities,
        status: 'ACTIVE',
        is_active: true,
      },
    });

    return NextResponse.json(theater);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to create theater' }, { status: 500 });
  }
}
