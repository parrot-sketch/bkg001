'use server';

import db from '@/lib/db';
import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { revalidatePath } from 'next/cache';

/**
 * Get recently completed consultations for a doctor to display in the Hub.
 */
export async function getConsultationsForHub(doctorId: string) {
  try {
    const consultations = await db.consultation.findMany({
      where: {
        doctor_id: doctorId,
        completed_at: { not: null },
      },
      include: {
        appointment: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: {
        completed_at: 'desc',
      },
      take: 20,
    });

    return {
      success: true,
      data: consultations,
    };
  } catch (error: any) {
    console.error('Error fetching consultations for hub:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch consultations',
      data: [],
    };
  }
}

/**
 * Initiate surgical planning from the Hub.
 * Creates a SurgicalCase linked to the consultation (if one doesn't already exist)
 * and returns the surgical case ID to redirect to the plan page.
 */
export async function initiateSurgicalCase(params: {
  consultationId: number;
}) {
  try {
    const { consultationId } = params;

    return await db.$transaction(async (tx: any) => {
      // Load the consultation with its linked doctor record
      const consultation = await tx.consultation.findUnique({
        where: { id: consultationId },
        include: {
          appointment: { select: { patient_id: true } },
          surgical_case: { select: { id: true } }, // check if already exists
        },
      });

      if (!consultation) {
        throw new Error('Consultation not found');
      }

      // If a surgical case already exists for this consultation, return it
      if (consultation.surgical_case) {
        return {
          success: true,
          surgicalCaseId: consultation.surgical_case.id,
        };
      }

      // Resolve the Doctor record from the doctor_id (Doctor.id, not User.id)
      const doctor = await tx.doctor.findUnique({
        where: { id: consultation.doctor_id },
        select: { id: true },
      });

      if (!doctor) {
        throw new Error('Doctor record not found');
      }

      const patientId = consultation.appointment?.patient_id;
      if (!patientId) {
        throw new Error('Patient not found on consultation appointment');
      }

      // Update the consultation outcome to PROCEDURE_RECOMMENDED
      await tx.consultation.update({
        where: { id: consultationId },
        data: {
          outcome_type: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
          updated_at: new Date(),
        },
      });

      // Create the SurgicalCase — link via consultation_id (not appointment_id)
      const newCase = await tx.surgicalCase.create({
        data: {
          patient_id: patientId,
          primary_surgeon_id: doctor.id,
          consultation_id: consultationId,
          status: 'DRAFT',
          urgency: 'ELECTIVE',
          diagnosis: 'Pending — to be completed in surgical plan',
        },
      });

      // Also create the CasePlan record immediately
      // This ensures saveProcedureDetails and completeSurgicalPlan don't fail
      await tx.casePlan.create({
        data: {
          surgical_case_id: newCase.id,
          appointment_id: consultation.appointment_id,
          patient_id: patientId,
          doctor_id: doctor.id,
          readiness_status: 'NOT_STARTED',
        },
      });

      revalidatePath('/doctor/consultations');

      return {
        success: true,
        surgicalCaseId: newCase.id,
      };
    });
  } catch (error: any) {
    console.error('Error initiating surgical case:', error);
    return {
      success: false,
      error: error.message || 'Failed to create surgical case',
    };
  }
}

/**
 * Update the outcome of a consultation from the Hub (for non-surgical outcomes).
 */
export async function updateConsultationOutcome(params: {
  consultationId: number;
  outcomeType: any;
  outcome?: string;
}) {
  try {
    const { consultationId, outcomeType, outcome } = params;

    await db.consultation.update({
      where: { id: consultationId },
      data: {
        outcome_type: outcomeType,
        outcome: outcome || undefined,
        updated_at: new Date(),
      },
    });

    revalidatePath('/doctor/consultations');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating consultation outcome:', error);
    return {
      success: false,
      error: error.message || 'Failed to update outcome',
    };
  }
}
