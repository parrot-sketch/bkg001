/**
 * API Route: POST /api/patients/vitals
 * 
 * Record Vital Signs endpoint for Nurses.
 * 
 * Allows nurses to record comprehensive vital signs for patients.
 * 
 * Security:
 * - Requires authentication
 * - Only NURSE and ADMIN roles can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { DomainException } from '@/domain/exceptions/DomainException';

/**
 * POST /api/patients/vitals
 * 
 * Records vital signs for a patient.
 * 
 * Body:
 * {
 *   patientId: string (required)
 *   appointmentId?: number (optional)
 *   bodyTemperature?: number (Celsius)
 *   systolic?: number (mmHg)
 *   diastolic?: number (mmHg)
 *   heartRate?: string (bpm, can be range)
 *   respiratoryRate?: number (per minute)
 *   oxygenSaturation?: number (percentage)
 *   weight?: number (kg)
 *   height?: number (cm)
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
    if (!body.patientId || !body.recordedBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: patientId, recordedBy',
        },
        { status: 400 }
      );
    }

    // 5. Validate at least one vital sign is provided
    const hasVitalSigns =
      body.bodyTemperature !== undefined ||
      body.systolic !== undefined ||
      body.diastolic !== undefined ||
      body.heartRate !== undefined ||
      body.respiratoryRate !== undefined ||
      body.oxygenSaturation !== undefined ||
      body.weight !== undefined ||
      body.height !== undefined;

    if (!hasVitalSigns) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one vital sign must be provided',
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

    // 9. Create vital signs record
    const vitalSign = await db.vitalSign.create({
      data: {
        patient_id: body.patientId,
        appointment_id: body.appointmentId || null,
        medical_record_id: null, // Can be linked later if needed
        body_temperature: body.bodyTemperature || null,
        systolic: body.systolic || null,
        diastolic: body.diastolic || null,
        heart_rate: body.heartRate || null,
        respiratory_rate: body.respiratoryRate || null,
        oxygen_saturation: body.oxygenSaturation || null,
        weight: body.weight || null,
        height: body.height || null,
        recorded_by: body.recordedBy,
        recorded_at: new Date(),
      },
    });

    // 10. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: vitalSign.id,
          patientId: vitalSign.patient_id,
          appointmentId: vitalSign.appointment_id,
          bodyTemperature: vitalSign.body_temperature,
          systolic: vitalSign.systolic,
          diastolic: vitalSign.diastolic,
          heartRate: vitalSign.heart_rate,
          respiratoryRate: vitalSign.respiratory_rate,
          oxygenSaturation: vitalSign.oxygen_saturation,
          weight: vitalSign.weight,
          height: vitalSign.height,
          recordedBy: vitalSign.recorded_by,
          recordedAt: vitalSign.recorded_at,
        },
        message: 'Vital signs recorded successfully',
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
    console.error('[API] /api/patients/vitals POST - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record vital signs',
      },
      { status: 500 }
    );
  }
}
