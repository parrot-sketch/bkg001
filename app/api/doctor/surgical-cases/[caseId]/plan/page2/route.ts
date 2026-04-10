/**
 * API Route: PATCH /api/doctor/surgical-cases/[caseId]/plan/page2
 * Saves Operative Details (Page 2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

const VALID_ANESTHESIA_TYPES = ['GENERAL', 'LOCAL', 'REGIONAL', 'SEDATION', 'TIVA', 'MAC'];
const VALID_ADMISSION_TYPES = ['DAYCASE', 'OVERNIGHT'];
const VALID_LIPO_DEVICES = ['POWER_ASSISTED', 'LASER_ASSISTED', 'SUCTION_ASSISTED'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;

  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      anaesthesiaType,
      skinToSkinMinutes,
      totalTheatreMinutes,
      admissionType,
      deviceUsed
    } = body;

    // Validation - anaesthesiaType is required
    if (!anaesthesiaType || !VALID_ANESTHESIA_TYPES.includes(anaesthesiaType)) {
      return NextResponse.json(
        { success: false, error: 'Valid anaesthesia type is required' },
        { status: 400 }
      );
    }

    // Validate device_used: if provided, must have at least one liposuction procedure
    if (deviceUsed) {
      if (!VALID_LIPO_DEVICES.includes(deviceUsed)) {
        return NextResponse.json(
          { success: false, error: 'Invalid device type' },
          { status: 400 }
        );
      }

      const caseProcedures = await db.surgicalCaseProcedure.findMany({
        where: { surgical_case_id: caseId },
        include: {
          procedure: { select: { name: true } },
        },
      });

      const hasLipoProcedure = caseProcedures.some((cp) =>
        cp.procedure.name.toLowerCase().includes('liposuction') ||
        cp.procedure.name.toLowerCase().includes('bbl') ||
        cp.procedure.name.toLowerCase().includes('180 lipo') ||
        cp.procedure.name.toLowerCase().includes('360 lipo')
      );

      if (!hasLipoProcedure) {
        return NextResponse.json(
          { success: false, error: 'Device selection is only available when a liposuction procedure is selected' },
          { status: 400 }
        );
      }
    }

    // Validate admission type if provided
    if (admissionType && !VALID_ADMISSION_TYPES.includes(admissionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid admission type' },
        { status: 400 }
      );
    }

    // Update SurgicalCase - mark as ready for ward prep when plan is complete
    await db.surgicalCase.update({
      where: { id: caseId },
      data: {
        anaesthesia_type: anaesthesiaType,
        skin_to_skin_minutes: skinToSkinMinutes || null,
        total_theatre_minutes: totalTheatreMinutes || null,
        admission_type: admissionType || null,
        device_used: deviceUsed || null,
        status: 'READY_FOR_WARD_PREP', // Plan complete - nurse can now do pre-op checklist
      },
    });

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    revalidatePath('/doctor/surgical-cases');
    revalidatePath('/nurse/ward-prep');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving page 2:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save' },
      { status: 500 }
    );
  }
}
