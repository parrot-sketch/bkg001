/**
 * API Route: /api/patients/:id/clinical-notes
 *
 * GET  — List clinical notes for a patient (filtered by current doctor)
 * POST — Create a new clinical note
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { Role } from '@/domain/enums/Role';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: patientId } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope'); // 'all' to see every doctor's notes
    const noteType = searchParams.get('type');

    const where: any = { patient_id: patientId };

    // By default, filter to current doctor's notes only
    if (scope !== 'all') {
      where.doctor_user_id = authResult.user.userId;
    }

    if (noteType) {
      where.note_type = noteType;
    }

    const notes = await db.clinicalNote.findMany({
      where,
      orderBy: [
        { is_pinned: 'desc' },
        { created_at: 'desc' },
      ],
      include: {
        doctor_user: {
          select: { id: true, first_name: true, last_name: true },
        },
        appointment: {
          select: { id: true, appointment_date: true, time: true, type: true },
        },
      },
    });

    const data = notes.map(n => ({
      id: n.id,
      noteType: n.note_type,
      title: n.title,
      content: n.content,
      isPinned: n.is_pinned,
      createdAt: n.created_at.toISOString(),
      updatedAt: n.updated_at.toISOString(),
      appointmentId: n.appointment_id,
      appointment: n.appointment
        ? { id: n.appointment.id, date: n.appointment.appointment_date.toISOString(), time: n.appointment.time, type: n.appointment.type }
        : null,
      author: {
        id: n.doctor_user.id,
        name: `${n.doctor_user.first_name || ''} ${n.doctor_user.last_name || ''}`.trim(),
      },
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET clinical-notes:', error);
    const message = error instanceof Error ? error.message : 'Failed to load notes';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json({ success: false, error: 'Only doctors can create clinical notes' }, { status: 403 });
    }

    const { id: patientId } = await params;
    const body = await request.json();

    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ success: false, error: 'Note content is required' }, { status: 400 });
    }

    const note = await db.clinicalNote.create({
      data: {
        patient_id: patientId,
        doctor_user_id: authResult.user.userId,
        note_type: body.noteType || 'GENERAL',
        title: body.title || null,
        content: body.content,
        appointment_id: body.appointmentId || null,
        is_pinned: body.isPinned || false,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: note.id, createdAt: note.created_at.toISOString() },
    }, { status: 201 });
  } catch (error) {
    console.error('[API] POST clinical-notes:', error);
    const message = error instanceof Error ? error.message : 'Failed to create note';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
