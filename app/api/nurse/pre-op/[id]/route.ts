/**
 * API Route: GET/PATCH /api/nurse/pre-op/:id
 *
 * Individual surgical case details and updates.
 *
 * Security:
 * - Requires authentication (Nurse must be logged in)
 * - Only NURSE role can access this endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { CaseReadinessStatus, SurgicalCaseStatus } from '@prisma/client';
import { getMissingPlanningItems } from '@/domain/helpers/planningReadiness';

/**
 * GET /api/nurse/pre-op/:id
 *
 * Returns detailed information about a surgical case.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;

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

    // 3. Fetch surgical case with full details
    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: params.id },
      include: {
        patient: true,
        primary_surgeon: true,
        case_plan: {
          include: {
            images: true,
            consents: true,
          },
        },
        consultation: {
          include: {
            appointment: true,
          },
        },
        theater_booking: {
          include: {
            theater: true,
          },
        },
        procedure_record: true,
      },
    });

    if (!surgicalCase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Surgical case not found',
        },
        { status: 404 }
      );
    }

    // 4. Calculate detailed readiness checklist
    const casePlan = surgicalCase.case_plan;
    const readinessChecklist = {
      intakeForm: {
        label: 'Pre-Op Intake Form',
        complete: !!casePlan?.pre_op_notes,
        notes: casePlan?.pre_op_notes?.substring(0, 100),
      },
      medicalHistory: {
        label: 'Medical History Review',
        complete: !!casePlan?.risk_factors,
        notes: casePlan?.risk_factors?.substring(0, 100),
      },
      clinicalPhotos: {
        label: 'Clinical Photos',
        complete: (casePlan?.images?.length ?? 0) > 0,
        count: casePlan?.images?.length ?? 0,
      },
      consentForms: {
        label: 'Consent Forms',
        complete: casePlan?.consents?.some((c) => c.signed_at !== null) ?? false,
        total: casePlan?.consents?.length ?? 0,
        signed: casePlan?.consents?.filter((c) => c.signed_at !== null).length ?? 0,
      },
      procedurePlan: {
        label: 'Procedure Plan',
        complete: !!casePlan?.procedure_plan,
      },
      implantDetails: {
        label: 'Implant Details',
        complete: !!casePlan?.implant_details,
        required: requiresImplant(surgicalCase.procedure_name),
      },
      anesthesia: {
        label: 'Anesthesia Plan',
        complete: !!casePlan?.planned_anesthesia,
      },
      specialInstructions: {
        label: 'Special Instructions',
        complete: !!casePlan?.special_instructions,
      },
    };

    const allRequired = [
      readinessChecklist.intakeForm.complete,
      readinessChecklist.medicalHistory.complete,
      readinessChecklist.clinicalPhotos.complete,
      readinessChecklist.consentForms.complete,
      readinessChecklist.procedurePlan.complete,
      !readinessChecklist.implantDetails.required || readinessChecklist.implantDetails.complete,
    ];

    const completedCount = allRequired.filter(Boolean).length;
    const readinessPercentage = Math.round((completedCount / allRequired.length) * 100);

    // Map response
    const response = {
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
          }
        : null,
      readinessChecklist,
      readinessPercentage,
      isReadyForScheduling: readinessPercentage === 100,
      readiness: {
        intakeFormComplete: readinessChecklist.intakeForm.complete,
        medicalHistoryComplete: readinessChecklist.medicalHistory.complete,
        photosUploaded: readinessChecklist.clinicalPhotos.complete,
        consentSigned: readinessChecklist.consentForms.complete,
        procedurePlanComplete: readinessChecklist.procedurePlan.complete,
        implantDetailsComplete: readinessChecklist.implantDetails.complete,
        percentage: readinessPercentage,
        missingItems: [] as string[],
        isReady: readinessPercentage === 100,
      },
    };

    // Calculate missing items
    if (!readinessChecklist.intakeForm.complete) response.readiness.missingItems.push('Pre-op intake');
    if (!readinessChecklist.medicalHistory.complete) response.readiness.missingItems.push('Medical history');
    if (!readinessChecklist.clinicalPhotos.complete) response.readiness.missingItems.push('Clinical photos');
    if (!readinessChecklist.consentForms.complete) response.readiness.missingItems.push('Consent form');
    if (!readinessChecklist.procedurePlan.complete) response.readiness.missingItems.push('Procedure plan');

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/nurse/pre-op/[id] GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/nurse/pre-op/:id
 *
 * Update surgical case readiness status or case plan.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;

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
    const userId = authResult.user.userId;

    // 2. Check permissions (only NURSE can update)
    if (userRole !== Role.NURSE) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only nurses can update pre-op status',
        },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { readinessStatus, casePlanUpdates, surgicalCaseStatus } = body;

    // 4. Find the surgical case
    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: params.id },
      include: {
        case_plan: true,
      },
    });

    if (!surgicalCase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Surgical case not found',
        },
        { status: 404 }
      );
    }

    // 5. Start transaction for updates
    const result = await db.$transaction(async (tx) => {
      // Update case plan if provided
      if (casePlanUpdates && surgicalCase.case_plan) {
        await tx.casePlan.update({
          where: { id: surgicalCase.case_plan.id },
          data: {
            pre_op_notes: casePlanUpdates.preOpNotes ?? surgicalCase.case_plan.pre_op_notes,
            risk_factors: casePlanUpdates.riskFactors ?? surgicalCase.case_plan.risk_factors,
            procedure_plan: casePlanUpdates.procedurePlan ?? surgicalCase.case_plan.procedure_plan,
            implant_details: casePlanUpdates.implantDetails ?? surgicalCase.case_plan.implant_details,
            planned_anesthesia:
              casePlanUpdates.plannedAnesthesia ?? surgicalCase.case_plan.planned_anesthesia,
            special_instructions:
              casePlanUpdates.specialInstructions ?? surgicalCase.case_plan.special_instructions,
          },
        });
      }

      // Update nurse readiness status if provided
      if (
        readinessStatus &&
        Object.values(CaseReadinessStatus).includes(readinessStatus) &&
        surgicalCase.case_plan
      ) {
        const nurseMarksReady = readinessStatus === CaseReadinessStatus.READY;
        await tx.casePlan.update({
          where: { id: surgicalCase.case_plan.id },
          data: {
            readiness_status: readinessStatus,
            ready_for_surgery: nurseMarksReady,
          },
        });

        // DUAL READINESS: Only transition to READY_FOR_SCHEDULING if BOTH
        // nurse readiness is complete AND doctor planning is complete.
        if (nurseMarksReady) {
          // Fetch full plan with consents + images for doctor readiness check
          const fullPlan = await tx.casePlan.findUnique({
            where: { id: surgicalCase.case_plan.id },
            include: {
              consents: { select: { status: true } },
              images: { select: { timepoint: true } },
            },
          });

          const doctorReadiness = getMissingPlanningItems({
            procedurePlan: fullPlan?.procedure_plan ?? null,
            riskFactors: fullPlan?.risk_factors ?? null,
            plannedAnesthesia: fullPlan?.planned_anesthesia ?? null,
            signedConsentCount: fullPlan?.consents?.filter(c => c.status === 'SIGNED').length ?? 0,
            preOpPhotoCount: fullPlan?.images?.filter(i => i.timepoint === 'PRE_OP').length ?? 0,
          });

          if (doctorReadiness.isComplete) {
            // Both nurse and doctor are ready — transition
            await tx.surgicalCase.update({
              where: { id: params.id },
              data: { status: SurgicalCaseStatus.READY_FOR_SCHEDULING },
            });
          }
          // If doctor plan is incomplete, nurse marks ready but case stays in current status.
          // The doctor must complete planning before the case can advance.
        }
      }

      // Prevent nurses from directly setting surgical case status to bypass readiness
      // (Removed the ability for nurse to set arbitrary surgicalCaseStatus)
      if (
        surgicalCaseStatus &&
        Object.values(SurgicalCaseStatus).includes(surgicalCaseStatus) &&
        surgicalCaseStatus !== SurgicalCaseStatus.READY_FOR_SCHEDULING
      ) {
        // Allow non-readiness status changes (e.g., reverting to PLANNING)
        await tx.surgicalCase.update({
          where: { id: params.id },
          data: { status: surgicalCaseStatus },
        });
      }

      // Log audit event
      await tx.auditLog.create({
        data: {
          user_id: userId,
          record_id: params.id,
          action: 'UPDATE',
          model: 'SurgicalCase',
          details: `Pre-op readiness updated by nurse. ${readinessStatus ? `Status: ${readinessStatus}` : ''} ${casePlanUpdates ? 'Case plan updated.' : ''}`,
        },
      });

      // Return updated surgical case
      return tx.surgicalCase.findUnique({
        where: { id: params.id },
        include: {
          patient: true,
          primary_surgeon: true,
          case_plan: {
            include: {
              images: true,
              consents: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Pre-op status updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/nurse/pre-op/[id] PATCH - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
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
