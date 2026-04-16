/**
 * API Route: GET /api/doctor/surgical-cases/[caseId]
 * Returns surgical case data for view page
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(
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

    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
          },
        },
        primary_surgeon: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
        case_procedures: {
          include: {
            procedure: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!surgicalCase) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    const caseData = {
      procedureDate: surgicalCase.procedure_date?.toISOString() || null,
      patientFileNumber: surgicalCase.patient.file_number || '',
      patientName: `${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`,
      surgeon: surgicalCase.primary_surgeon ? {
        id: surgicalCase.primary_surgeon.id,
        name: surgicalCase.primary_surgeon.name,
        specialization: surgicalCase.primary_surgeon.specialization,
      } : null,
      diagnosis: surgicalCase.diagnosis || '',
      procedureCategory: surgicalCase.procedure_category || '',
      primaryOrRevision: surgicalCase.primary_or_revision || '',
      procedures: surgicalCase.case_procedures.map(cp => ({
        id: cp.procedure.id,
        name: cp.procedure.name,
        category: cp.procedure.category,
      })),
      // Page 2
      anaesthesiaType: surgicalCase.anaesthesia_type || '',
      skinToSkinMinutes: surgicalCase.skin_to_skin_minutes,
      totalTheatreMinutes: surgicalCase.total_theatre_minutes,
      admissionType: surgicalCase.admission_type || '',
    };

    return NextResponse.json({ success: true, case: caseData });
  } catch (error: any) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch case' },
      { status: 500 }
    );
  }
}
