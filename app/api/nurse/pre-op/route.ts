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
import { TEMPLATE_KEY as WARD_CHECKLIST_TEMPLATE_KEY, TEMPLATE_VERSION as WARD_CHECKLIST_TEMPLATE_VERSION } from '@/domain/clinical-forms/NursePreopWardChecklist';
import { getMissingPlanningItems } from '@/domain/helpers/planningReadiness';

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

    // 3. Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const readinessFilter = searchParams.get('readiness');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;

    // 4. Build query filters - SIMPLIFIED: Only show cases ready for ward prep
    // Ward prep shows cases where:
    // - READY_FOR_WARD_PREP: Doctor completed the plan, nurse needs to do pre-op checklist
    // - IN_WARD_PREP: Nurse has started/completed pre-op checklist
    const statusWhere =
      statusFilter && Object.values(SurgicalCaseStatus).includes(statusFilter as SurgicalCaseStatus)
        ? { status: statusFilter as SurgicalCaseStatus }
        : {
            status: {
              in: [
                SurgicalCaseStatus.READY_FOR_WARD_PREP,
                SurgicalCaseStatus.IN_WARD_PREP,
              ],
            },
          };

    // 5. Search filter - procedure name only
    const procedureSearch = search
      ? { procedure_name: { contains: search } }
      : undefined;

    const skip = (page - 1) * limit;

    // 6. Fetch surgical cases pending pre-op with pagination (parallel query)
    const surgicalCases = await db.surgicalCase.findMany({
      where: {
        ...statusWhere,
        ...(procedureSearch ? { procedure_name: procedureSearch.procedure_name } : {}),
      },
      orderBy: [{ created_at: 'asc' }],
      skip,
      take: limit,
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
          select: {
            id: true,
            readiness_status: true,
            ready_for_surgery: true,
            procedure_plan: true,
            pre_op_notes: true,
            risk_factors: true,
            implant_details: true,
            planned_anesthesia: true,
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
        case_procedures: {
          select: {
            id: true,
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

    // 7. Fetch total count for pagination
    const total = await db.surgicalCase.count({
      where: {
        ...statusWhere,
        ...(procedureSearch ? { procedure_name: procedureSearch.procedure_name } : {}),
      },
    });

    // 8. Batch-fetch ward checklist status from clinicalFormResponse
    const caseIds = surgicalCases.map(sc => sc.id);
    const wardChecklistForms = await db.clinicalFormResponse.findMany({
      where: {
        template_key: WARD_CHECKLIST_TEMPLATE_KEY,
        template_version: WARD_CHECKLIST_TEMPLATE_VERSION,
        surgical_case_id: { in: caseIds },
      },
      select: {
        id: true,
        status: true,
        signed_at: true,
        surgical_case_id: true,
      },
    });

    const checklistMap = new Map(
      wardChecklistForms.map(f => [f.surgical_case_id, f])
    );

    // 9. Batch-fetch consent counts per case plan
    const casePlanIds = surgicalCases
      .map(sc => sc.case_plan?.id)
      .filter((id): id is number => id !== undefined && id !== null);

    const signedConsents = await db.consentForm.findMany({
      where: {
        case_plan_id: { in: casePlanIds },
        status: 'SIGNED',
      },
      select: { case_plan_id: true },
    });

    const consentCountMap = new Map<number, number>();
    signedConsents.forEach(c => {
      consentCountMap.set(c.case_plan_id, (consentCountMap.get(c.case_plan_id) || 0) + 1);
    });

    // 10. Calculate readiness information for each case
    const casesWithReadiness = surgicalCases.map((surgicalCase) => {
      const casePlan = surgicalCase.case_plan;
      const cpId = casePlan?.id;
      const signedConsentCount = cpId ? (consentCountMap.get(cpId) || 0) : 0;

      // Use the same readiness logic as the detail page and surgical plan
      const missing = getMissingPlanningItems({
        procedurePlan: casePlan?.procedure_plan ?? null,
        riskFactors: casePlan?.risk_factors ?? null,
        plannedAnesthesia: (casePlan as any)?.planned_anesthesia ?? null,
        signedConsentCount,
        preOpPhotoCount: 0, // TEMPORARILY DISABLED - pending regulatory compliance
      });

      const requiredItems = missing.items.filter(i => i.required);
      const completedRequired = requiredItems.filter(i => i.done).length;
      const readinessPercentage = requiredItems.length > 0
        ? Math.round((completedRequired / requiredItems.length) * 100)
        : 100;

      const missingItems = requiredItems.filter(i => !i.done).map(i => i.label);

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
            photosCount: 0, // Removed from select for performance
            consentsCount: 0, // Removed from select for performance
            signedConsentsCount: 0, // Removed from select for performance
          }
          : null,
        theaterBooking: surgicalCase.theater_booking,
        consultation: surgicalCase.consultation,
        procedures: surgicalCase.case_procedures?.map(cp => ({
          id: cp.procedure.id,
          name: cp.procedure.name,
          category: cp.procedure.category,
        })) ?? [],
        // Ward checklist status from clinicalFormResponse
        wardChecklist: (() => {
          const form = checklistMap.get(surgicalCase.id);
          return {
            status: form?.status ?? null,
            isComplete: form?.status === 'FINAL',
            isStarted: !!form,
            formId: form?.id ?? null,
          };
        })(),
        readiness: {
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
