import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { AppointmentStatus } from '@prisma/client';

function parseDateOnlyParam(value: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function endOfDayUtc(date: Date): Date {
  const d = new Date(date.getTime());
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await JwtMiddleware.authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const user = auth.user;
    if (user.role !== Role.THEATER_TECHNICIAN && user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const fromParam = parseDateOnlyParam(url.searchParams.get('from'));
    const toParam = parseDateOnlyParam(url.searchParams.get('to'));

    const todayUtc = parseDateOnlyParam(new Date().toISOString().slice(0, 10)) ?? new Date();
    const from = fromParam ?? todayUtc;
    const to = endOfDayUtc(toParam ?? addDaysUtc(from, 14));

    const takeRaw = Number(url.searchParams.get('take') || '50');
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 50) : 50;

    const appointments = await db.appointment.findMany({
      where: {
        appointment_date: { gte: from, lte: to },
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        type: { equals: 'Procedure', mode: 'insensitive' },
        ...(q.length >= 2
          ? {
              patient: {
                OR: [
                  { file_number: { contains: q, mode: 'insensitive' } },
                  { first_name: { contains: q, mode: 'insensitive' } },
                  { last_name: { contains: q, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      select: {
        id: true,
        appointment_date: true,
        time: true,
        status: true,
        type: true,
        surgical_case: { select: { id: true } },
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
            date_of_birth: true,
            gender: true,
          },
        },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: [{ appointment_date: 'asc' }, { time: 'asc' }],
      take,
    });

    return NextResponse.json({
      success: true,
      data: appointments.map((a) => ({
        appointmentId: a.id,
        appointmentDate: a.appointment_date.toISOString(),
        time: a.time,
        status: a.status,
        surgicalCaseId: a.surgical_case?.id ?? null,
        patient: a.patient,
        surgeon: a.doctor,
      })),
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        take,
        q: q.length >= 2 ? q : '',
      },
    });
  } catch (error) {
    console.error('[API] GET theater-tech upcoming procedures error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load upcoming procedures' }, { status: 500 });
  }
}
