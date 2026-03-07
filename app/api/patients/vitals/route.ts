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
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { DomainException } from '@/domain/exceptions/DomainException';
import { getRecordVitalSignsUseCase } from '@/lib/use-cases';
import { RecordVitalSignsDto } from '@/domain/interfaces/repositories/IVitalSignRepository';

/**
 * POST /api/patients/vitals
 * 
 * Records vital signs for a patient.
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

    // 3. Parse and validate request body
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

    if (!body.patientId || !body.recordedBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: patientId, recordedBy',
        },
        { status: 400 }
      );
    }

    const dto: RecordVitalSignsDto = {
      patientId: body.patientId,
      appointmentId: body.appointmentId ? parseInt(body.appointmentId.toString(), 10) : undefined,
      bodyTemperature: body.bodyTemperature ? parseFloat(body.bodyTemperature.toString()) : undefined,
      systolic: body.systolic ? parseInt(body.systolic.toString(), 10) : undefined,
      diastolic: body.diastolic ? parseInt(body.diastolic.toString(), 10) : undefined,
      heartRate: body.heartRate?.toString(),
      respiratoryRate: body.respiratoryRate ? parseInt(body.respiratoryRate.toString(), 10) : undefined,
      oxygenSaturation: body.oxygenSaturation ? parseInt(body.oxygenSaturation.toString(), 10) : undefined,
      weight: body.weight ? parseFloat(body.weight.toString()) : undefined,
      height: body.height ? parseFloat(body.height.toString()) : undefined,
      recordedBy: body.recordedBy,
    };

    // 4. Validate at least one vital sign is provided
    const hasVitalSigns =
      dto.bodyTemperature !== undefined ||
      dto.systolic !== undefined ||
      dto.diastolic !== undefined ||
      dto.heartRate !== undefined ||
      dto.respiratoryRate !== undefined ||
      dto.oxygenSaturation !== undefined ||
      dto.weight !== undefined ||
      dto.height !== undefined;

    if (!hasVitalSigns) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one vital sign must be provided',
        },
        { status: 400 }
      );
    }

    // 5. Execute use case
    const recordVitalSignsUseCase = getRecordVitalSignsUseCase();
    await recordVitalSignsUseCase.execute(dto);

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
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
        error: error instanceof Error ? error.message : 'Failed to record vital signs',
      },
      { status: 500 }
    );
  }
}
