/**
 * API Route: GET /api/nurse/pre-op
 *
 * Nurse Pre-Op Dashboard endpoint.
 *
 * Returns surgical cases pending pre-operative preparation.
 *
 * Security:
 * - Requires authentication (Nurse must be logged in)
 * - Only NURSE role can access this endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { SurgicalCaseStatus } from '@prisma/client';

/**
 * GET /api/nurse/pre-op
 *
 * Returns surgical cases that need pre-op readiness work.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

    const userRole = authResult.user.role;

    // 2. Check permissions (only NURSE can access)
    if (userRole !== Role.NURSE) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only nurses can access pre-op dashboard',
        },
        { status: 403 }
      );
    }

    // 3. Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const readinessFilter = searchParams.get('readiness');

    // 4. Build query filters
    const statusWhere =
      statusFilter && Object.values(SurgicalCaseStatus).includes(statusFilter as SurgicalCaseStatus)
        ? { status: statusFilter as SurgicalCaseStatus }
        : {
          status: {
            in: [
              SurgicalCaseStatus.DRAFT,
              SurgicalCaseStatus.PLANNING,
              SurgicalCaseStatus.READY_FOR_SCHEDULING,
              SurgicalCaseStatus.SCHEDULED,
              SurgicalCaseStatus.IN_PREP,
            ],
          },
        };

    // 5. Fetch surgical cases pending pre-op
    const surgicalCases = await db.surgicalCase.findMany({
      where: statusWhere,
      orderBy: [{ created_at: 'asc' }],
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
            phone: true,
            email: true,
            date_of_birth: true,
          },
        },
        primary_surgeon: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
        case_plan: {
          include: {
            images: {
              select: {
                id: true,
                taken_at: true,
              },
            },
            consents: {
              select: {
                id: true,
                signed_at: true,
                status: true,
              },
            },
          },
        },
        consultation: {
          select: {
            id: true,
            outcome_type: true,
            patient_decision: true,
            doctor_notes: true,
            completed_at: true,
          },
        },
        theater_booking: {
          select: {
            id: true,
            start_time: true,
            end_time: true,
            status: true,
          },
        },
      },
    });

    // 6. Calculate readiness information for each case
    const casesWithReadiness = surgicalCases.map((surgicalCase) => {
      const casePlan = surgicalCase.case_plan;

      // Calculate readiness checklist
      const readiness = {
        intakeFormComplete: !!casePlan?.pre_op_notes,
        medicalHistoryComplete: !!casePlan?.risk_factors,
        photosUploaded: (casePlan?.images?.length ?? 0) > 0,
        consentSigned: casePlan?.consents?.some((c) => c.signed_at !== null) ?? false,
        procedurePlanComplete: !!casePlan?.procedure_plan,
        implantDetailsComplete: !!casePlan?.implant_details || !requiresImplant(surgicalCase.procedure_name),
      };

      const readinessItems = Object.values(readiness);
      const completedItems = readinessItems.filter(Boolean).length;
      const readinessPercentage = Math.round((completedItems / readinessItems.length) * 100);

      const missingItems: string[] = [];
      if (!readiness.intakeFormComplete) missingItems.push('Pre-op intake');
      if (!readiness.medicalHistoryComplete) missingItems.push('Medical history / risk factors');
      if (!readiness.photosUploaded) missingItems.push('Clinical photos');
      if (!readiness.consentSigned) missingItems.push('Consent form');
      if (!readiness.procedurePlanComplete) missingItems.push('Procedure plan');
      if (!readiness.implantDetailsComplete) missingItems.push('Implant details');

      return {
        id: surgicalCase.id,
        status: surgicalCase.status,
        urgency: surgicalCase.urgency,
        diagnosis: surgicalCase.diagnosis,
        procedureName: surgicalCase.procedure_name,
        createdAt: surgicalCase.created_at,
        patient: surgicalCase.patient
          ? {
            id: surgicalCase.patient.id,
            fullName: `${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`,
            fileNumber: surgicalCase.patient.file_number,
            phone: surgicalCase.patient.phone,
            email: surgicalCase.patient.email,
            dateOfBirth: surgicalCase.patient.date_of_birth,
          }
          : null,
        primarySurgeon: surgicalCase.primary_surgeon
          ? {
            id: surgicalCase.primary_surgeon.id,
            name: surgicalCase.primary_surgeon.name,
            specialty: surgicalCase.primary_surgeon.specialization,
          }
          : null,
        casePlan: casePlan
          ? {
            id: casePlan.id,
            readinessStatus: casePlan.readiness_status,
            readyForSurgery: casePlan.ready_for_surgery,
            procedurePlan: casePlan.procedure_plan,
            preOpNotes: casePlan.pre_op_notes,
            riskFactors: casePlan.risk_factors,
            implantDetails: casePlan.implant_details,
            photosCount: casePlan.images?.length ?? 0,
            consentsCount: casePlan.consents?.length ?? 0,
            signedConsentsCount: casePlan.consents?.filter((c) => c.signed_at !== null).length ?? 0,
          }
          : null,
        theaterBooking: surgicalCase.theater_booking,
        consultation: surgicalCase.consultation,
        readiness: {
          ...readiness,
          percentage: readinessPercentage,
          missingItems,
          isReady: readinessPercentage === 100,
        },
      };
    });

    // 7. Apply readiness filter if specified
    let filteredCases = casesWithReadiness;
    if (readinessFilter) {
      if (readinessFilter === 'ready') {
        filteredCases = casesWithReadiness.filter((c) => c.readiness.isReady);
      } else if (readinessFilter === 'pending') {
        filteredCases = casesWithReadiness.filter((c) => !c.readiness.isReady);
      }
    }

    // 8. Return response with summary stats
    const summary = {
      total: filteredCases.length,
      ready: filteredCases.filter((c) => c.readiness.isReady).length,
      pending: filteredCases.filter((c) => !c.readiness.isReady).length,
      byStatus: {
        draft: filteredCases.filter((c) => c.status === SurgicalCaseStatus.DRAFT).length,
        planning: filteredCases.filter((c) => c.status === SurgicalCaseStatus.PLANNING).length,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          cases: filteredCases,
          summary,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/nurse/pre-op - Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'development'
            ? `Internal server error: ${errorMessage}`
            : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to determine if a procedure requires implant details
 */
function requiresImplant(procedureName?: string | null): boolean {
  if (!procedureName) return false;
  const implantProcedures = [
    'breast augmentation',
    'breast implant',
    'chin implant',
    'cheek implant',
    'buttock implant',
    'pectoral implant',
    'calf implant',
  ];
  return implantProcedures.some((p) => procedureName.toLowerCase().includes(p));
}
