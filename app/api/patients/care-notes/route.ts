/**
 * API Route: POST /api/patients/care-notes
 * 
 * Create Care Note endpoint for Nurses.
 * 
 * Allows nurses to record care notes (PRE_OP, POST_OP, GENERAL) for patients.
 * 
 * Security:
 * - Requires authentication
 * - Only NURSE and ADMIN roles can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { CareNoteType } from '@prisma/client';
import { Role } from '@/domain/enums/Role';
import { DomainException } from '@/domain/exceptions/DomainException';

/**
 * POST /api/patients/care-notes
 * 
 * Creates a new care note for a patient.
 * 
 * Body:
 * {
 *   patientId: string (required)
 *   appointmentId?: number (optional)
 *   note: string (required)
 *   noteType: 'PRE_OP' | 'POST_OP' | 'GENERAL' (required)
 *   recordedBy: string (required - nurse user ID)
 * }
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

    // 2. Check permissions (NURSE and ADMIN can access)
    if (authResult.user.role !== Role.NURSE && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Nurse or Admin access required',
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

    // 4. Validate required fields
    if (!body.patientId || !body.note || !body.noteType || !body.recordedBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: patientId, note, noteType, recordedBy',
        },
        { status: 400 }
      );
    }

    // 5. Validate note type
    const validNoteTypes = ['PRE_OP', 'POST_OP', 'GENERAL'];
    if (!validNoteTypes.includes(body.noteType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid noteType. Must be one of: ${validNoteTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 6. Verify patient exists
    const patient = await db.patient.findUnique({
      where: { id: body.patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found',
        },
        { status: 404 }
      );
    }

    // 7. Verify appointment exists (if provided)
    if (body.appointmentId) {
      const appointment = await db.appointment.findUnique({
        where: { id: body.appointmentId },
        select: { id: true },
      });

      if (!appointment) {
        return NextResponse.json(
          {
            success: false,
            error: 'Appointment not found',
          },
          { status: 404 }
        );
      }
    }

    // 8. Verify nurse user exists
    const nurse = await db.user.findUnique({
      where: { id: body.recordedBy },
      select: { id: true, role: true },
    });

    if (!nurse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nurse user not found',
        },
        { status: 404 }
      );
    }

    if (nurse.role !== Role.NURSE && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'recordedBy must be a nurse user',
        },
        { status: 400 }
      );
    }

    // 9. Create care note
    const careNote = await db.careNote.create({
      data: {
        patient_id: body.patientId,
        nurse_user_id: body.recordedBy,
        appointment_id: body.appointmentId || null,
        note_type: body.noteType as CareNoteType,
        note: body.note.trim(),
        recorded_at: new Date(),
      },
    });

    // 10. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: careNote.id,
          patientId: careNote.patient_id,
          nurseUserId: careNote.nurse_user_id,
          appointmentId: careNote.appointment_id,
          noteType: careNote.note_type,
          note: careNote.note,
          recordedAt: careNote.recorded_at,
        },
        message: 'Care note added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Unexpected error
    console.error('[API] /api/patients/care-notes POST - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create care note',
      },
      { status: 500 }
    );
  }
}
