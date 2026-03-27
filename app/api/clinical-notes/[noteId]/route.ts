/**
 * API Route: /api/clinical-notes/:noteId
 *
 * PUT    — Update a clinical note
 * DELETE — Delete a clinical note
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { Role } from '@/domain/enums/Role';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json({ success: false, error: 'Only doctors can edit clinical notes' }, { status: 403 });
    }

    const { noteId } = await params;
    const id = parseInt(noteId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid note ID' }, { status: 400 });
    }

    // Ensure the note belongs to this doctor
    const existing = await db.clinicalNote.findUnique({
      where: { id },
      select: { doctor_user_id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    if (existing.doctor_user_id !== authResult.user.userId) {
      return NextResponse.json({ success: false, error: 'You can only edit your own notes' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.content !== undefined) updateData.content = body.content;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.noteType !== undefined) updateData.note_type = body.noteType;
    if (body.isPinned !== undefined) updateData.is_pinned = body.isPinned;

    const note = await db.clinicalNote.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { id: note.id, updatedAt: note.updated_at.toISOString() },
    });
  } catch (error) {
    console.error('[API] PUT clinical-notes:', error);
    return NextResponse.json({ success: false, error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json({ success: false, error: 'Only doctors can delete clinical notes' }, { status: 403 });
    }

    const { noteId } = await params;
    const id = parseInt(noteId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid note ID' }, { status: 400 });
    }

    // Ensure the note belongs to this doctor
    const existing = await db.clinicalNote.findUnique({
      where: { id },
      select: { doctor_user_id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    if (existing.doctor_user_id !== authResult.user.userId) {
      return NextResponse.json({ success: false, error: 'You can only delete your own notes' }, { status: 403 });
    }

    await db.clinicalNote.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE clinical-notes:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete note' }, { status: 500 });
  }
}
