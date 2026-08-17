import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';

export interface RecordSurgicalCaseVitalsRequest {
  bodyTemperature?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: string;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

export interface RecordSurgicalCaseVitalsResponse {
  success: boolean;
  message?: string;
  error?: string;
  vitalId?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    if (user.role !== Role.THEATER_TECHNICIAN && user.role !== Role.NURSE && user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Theater tech, nurse, or admin access required' },
        { status: 403 }
      );
    }

    const { caseId } = await params;

    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { id: true, patient_id: true },
    });

    if (!surgicalCase) {
      return NextResponse.json(
        { success: false, error: 'Surgical case not found' },
        { status: 404 }
      );
    }

    const body: RecordSurgicalCaseVitalsRequest = await request.json();

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
        { success: false, error: 'At least one vital sign must be provided' },
        { status: 400 }
      );
    }

    const vital = await db.vitalSign.create({
      data: {
        patient_id: surgicalCase.patient_id,
        surgical_case_id: caseId,
        body_temperature: body.bodyTemperature,
        systolic: body.systolic,
        diastolic: body.diastolic,
        heart_rate: body.heartRate,
        respiratory_rate: body.respiratoryRate,
        oxygen_saturation: body.oxygenSaturation,
        weight: body.weight,
        height: body.height,
        recorded_by: user.userId,
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Vital signs recorded successfully',
        vitalId: vital.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] POST /api/theater-tech/surgical-cases/[caseId]/vitals - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record vital signs' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { caseId } = await params;

    const vitals = await db.vitalSign.findMany({
      where: { surgical_case_id: caseId },
      orderBy: { recorded_at: 'desc' },
      select: {
        id: true,
        body_temperature: true,
        systolic: true,
        diastolic: true,
        heart_rate: true,
        respiratory_rate: true,
        oxygen_saturation: true,
        weight: true,
        height: true,
        recorded_by: true,
        recorded_at: true,
        created_at: true,
      },
    });

    const recordedByIds = [...new Set(vitals.map(v => v.recorded_by).filter(Boolean))];

    let recordedByNames: Record<string, string> = {};
    if (recordedByIds.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: recordedByIds } },
        select: { id: true, first_name: true, last_name: true, email: true },
      });
      recordedByNames = Object.fromEntries(
        users.map(u => [u.id, `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email])
      );
    }

    const data = vitals.map(v => ({
      ...v,
      recorded_by_name: recordedByNames[v.recorded_by] || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[API] GET /api/theater-tech/surgical-cases/[caseId]/vitals - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch vital signs' },
      { status: 500 }
    );
  }
}
