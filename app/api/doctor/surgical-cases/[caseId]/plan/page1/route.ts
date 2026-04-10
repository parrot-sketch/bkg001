/**
 * API Route: PATCH /api/doctor/surgical-cases/[caseId]/plan/page1
 * Saves Case Identification data (Page 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

const VALID_PROCEDURE_CATEGORIES = ['FACE', 'BREAST', 'BODY', 'RECONSTRUCTIVE'];
const VALID_CASE_PLAN_TYPES = ['PRIMARY', 'REVISION'];

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
      procedureDate,
      surgeonIds,
      diagnosis,
      procedureCategory,
      primaryOrRevision,
      procedureIds
    } = body;

    // Validation - now require surgeonIds (array) instead of single surgeonId
    if (!procedureDate || !surgeonIds || surgeonIds.length === 0 || !diagnosis || !procedureCategory || !primaryOrRevision) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be filled including at least one surgeon' },
        { status: 400 }
      );
    }

    if (!VALID_PROCEDURE_CATEGORIES.includes(procedureCategory)) {
      return NextResponse.json(
        { success: false, error: 'Invalid procedure category' },
        { status: 400 }
      );
    }

    if (!VALID_CASE_PLAN_TYPES.includes(primaryOrRevision)) {
      return NextResponse.json(
        { success: false, error: 'Invalid primary/revision value' },
        { status: 400 }
      );
    }

    if (!procedureIds || procedureIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Select at least one procedure' },
        { status: 400 }
      );
    }

    // Transaction: update case and procedures
    await db.$transaction(async (tx) => {
      // Update SurgicalCase - store all selected surgeons in surgeon_ids and set first as primary
      await tx.surgicalCase.update({
        where: { id: caseId },
        data: {
          procedure_date: new Date(procedureDate),
          primary_surgeon_id: surgeonIds[0], // First surgeon as primary for backward compatibility
          surgeon_ids: JSON.stringify(surgeonIds), // Store all selected surgeons
          diagnosis,
          procedure_category: procedureCategory,
          primary_or_revision: primaryOrRevision,
          status: 'PLANNING', // Case identification complete - ready for planning
        },
      });

      // Delete existing procedures
      await tx.surgicalCaseProcedure.deleteMany({
        where: { surgical_case_id: caseId },
      });

      // Create new procedure links
      if (procedureIds.length > 0) {
        await tx.surgicalCaseProcedure.createMany({
          data: procedureIds.map((procedureId: string) => ({
            surgical_case_id: caseId,
            procedure_id: procedureId,
          })),
        });
      }
    });

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    revalidatePath('/doctor/surgical-cases');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving page 1:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save' },
      { status: 500 }
    );
  }
}
