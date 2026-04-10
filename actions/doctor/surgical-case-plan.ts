'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import db from '@/lib/db';

const Page1Schema = z.object({
  caseId: z.string(),
  procedureDate: z.coerce.date(),
  surgeonId: z.string(),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  procedureCategory: z.enum(['FACE', 'BREAST', 'BODY', 'RECONSTRUCTIVE']),
  primaryOrRevision: z.enum(['PRIMARY', 'REVISION']),
  procedureIds: z.array(z.string()).min(1, 'Select at least one procedure'),
});

const Page2Schema = z.object({
  caseId: z.string(),
  anaesthesiaType: z.enum(['GENERAL', 'LOCAL', 'REGIONAL', 'SEDATION', 'TIVA', 'MAC']).optional(),
  skinToSkinMinutes: z.number().int().positive().optional(),
  totalTheatreMinutes: z.number().int().positive().optional(),
  admissionType: z.enum(['DAYCASE', 'OVERNIGHT']).optional(),
  deviceUsed: z.enum(['POWER_ASSISTED', 'LASER_ASSISTED', 'SUCTION_ASSISTED']).optional(),
});

export interface SurgicalCasePlanData {
  id: string;
  procedureDate: Date | null;
  diagnosis: string | null;
  procedureCategory: string | null;
  primaryOrRevision: string | null;
  anaesthesiaType: string | null;
  skinToSkinMinutes: number | null;
  totalTheatreMinutes: number | null;
  admissionType: string | null;
  deviceUsed: string | null;
  patient: {
    id: string;
    fileNumber: string;
    firstName: string;
    lastName: string;
  } | null;
  primarySurgeon: {
    id: string;
    name: string;
  } | null;
  caseProcedures: Array<{
    id: string;
    procedure: {
      id: string;
      name: string;
      category: string;
    };
  }>;
}

export async function getSurgicalCasePlanData(caseId: string): Promise<SurgicalCasePlanData | null> {
  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: {
        select: {
          id: true,
          file_number: true,
          first_name: true,
          last_name: true,
        },
      },
      primary_surgeon: {
        select: {
          id: true,
          name: true,
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
    return null;
  }

  return {
    id: surgicalCase.id,
    procedureDate: surgicalCase.procedure_date,
    diagnosis: surgicalCase.diagnosis,
    procedureCategory: surgicalCase.procedure_category,
    primaryOrRevision: surgicalCase.primary_or_revision,
    anaesthesiaType: surgicalCase.anaesthesia_type,
    skinToSkinMinutes: surgicalCase.skin_to_skin_minutes,
    totalTheatreMinutes: surgicalCase.total_theatre_minutes,
    admissionType: surgicalCase.admission_type,
    deviceUsed: surgicalCase.device_used,
    patient: surgicalCase.patient
      ? {
          id: surgicalCase.patient.id,
          fileNumber: surgicalCase.patient.file_number,
          firstName: surgicalCase.patient.first_name,
          lastName: surgicalCase.patient.last_name,
        }
      : null,
    primarySurgeon: surgicalCase.primary_surgeon
      ? {
          id: surgicalCase.primary_surgeon.id,
          name: surgicalCase.primary_surgeon.name,
        }
      : null,
    caseProcedures: surgicalCase.case_procedures.map((cp) => ({
      id: cp.id,
      procedure: {
        id: cp.procedure.id,
        name: cp.procedure.name,
        category: cp.procedure.category,
      },
    })),
  };
}

// Mapping from Form's 4 categories to the 8 enum categories to query
const FORM_CATEGORY_TO_ENUM_CATEGORIES: Record<string, string[]> = {
  FACE: ['FACE_AND_NECK', 'NON_SURGICAL', 'HAIR_RESTORATION'],
  BREAST: ['BREAST', 'POST_WEIGHT_LOSS'],
  BODY: ['BODY_CONTOURING', 'POST_WEIGHT_LOSS', 'INTIMATE_AESTHETIC'],
  RECONSTRUCTIVE: ['RECONSTRUCTIVE', 'INTIMATE_AESTHETIC'],
};

export async function getSurgicalProcedureOptions(category: string) {
  // Map form category to enum categories
  const enumCategories = FORM_CATEGORY_TO_ENUM_CATEGORIES[category] || [category];

  const procedures = await db.surgicalProcedureOption.findMany({
    where: {
      category: { in: enumCategories as any[] },
      is_active: true,
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      category: true,
    },
  });

  return procedures;
}

export async function updateSurgicalCasePlanPage1(input: z.infer<typeof Page1Schema>) {
  const parsed = Page1Schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message || 'Validation failed',
    };
  }

  const { caseId, procedureDate, surgeonId, diagnosis, procedureCategory, primaryOrRevision, procedureIds } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      // Update SurgicalCase scalar fields
      await tx.surgicalCase.update({
        where: { id: caseId },
        data: {
          procedure_date: procedureDate,
          primary_surgeon_id: surgeonId,
          diagnosis,
          procedure_category: procedureCategory,
          primary_or_revision: primaryOrRevision,
        },
      });

      // Delete existing procedures
      await tx.surgicalCaseProcedure.deleteMany({
        where: { surgical_case_id: caseId },
      });

      // Create new procedure links
      if (procedureIds.length > 0) {
        await tx.surgicalCaseProcedure.createMany({
          data: procedureIds.map((procedureId) => ({
            surgical_case_id: caseId,
            procedure_id: procedureId,
          })),
        });
      }
    });

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);

    return {
      success: true as const,
    };
  } catch (error: any) {
    console.error('Error updating surgical case plan page 1:', error);
    return {
      success: false as const,
      error: error.message || 'Failed to update surgical case plan',
    };
  }
}

export async function updateSurgicalCasePlanPage2(input: z.infer<typeof Page2Schema>) {
  const parsed = Page2Schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message || 'Validation failed',
    };
  }

  const { caseId, anaesthesiaType, skinToSkinMinutes, totalTheatreMinutes, admissionType, deviceUsed } = parsed.data;

  // Validate device_used: if provided, must have at least one liposuction procedure
  if (deviceUsed) {
    const caseProcedures = await db.surgicalCaseProcedure.findMany({
      where: { surgical_case_id: caseId },
      include: {
        procedure: {
          select: { name: true },
        },
      },
    });

    const hasLipoProcedure = caseProcedures.some((cp) =>
      cp.procedure.name.toLowerCase().includes('liposuction') ||
      cp.procedure.name.toLowerCase().includes('bbl') ||
      cp.procedure.name.toLowerCase().includes('180 lipo') ||
      cp.procedure.name.toLowerCase().includes('360 lipo')
    );

    if (!hasLipoProcedure) {
      return {
        success: false as const,
        error: 'Device selection is only available when a liposuction procedure is selected',
      };
    }
  }

  try {
    await db.surgicalCase.update({
      where: { id: caseId },
      data: {
        anaesthesia_type: anaesthesiaType,
        skin_to_skin_minutes: skinToSkinMinutes,
        total_theatre_minutes: totalTheatreMinutes,
        admission_type: admissionType,
        device_used: deviceUsed,
      },
    });

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);

    return {
      success: true as const,
    };
  } catch (error: any) {
    console.error('Error updating surgical case plan page 2:', error);
    return {
      success: false as const,
      error: error.message || 'Failed to update surgical case plan',
    };
  }
}

export async function getSurgeons() {
  const doctors = await db.doctor.findMany({
    where: {
      availability_status: {
        not: 'UNAVAILABLE',
      },
    },
    select: {
      id: true,
      name: true,
      specialization: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return doctors;
}

export interface SurgicalCasePlanStatus {
  isComplete: boolean;
  hasSurgicalCase: boolean;
  caseId?: string;
}

export async function getSurgicalCaseStatus(consultationId: number): Promise<SurgicalCasePlanStatus> {
  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    select: {
      surgical_case: {
        select: {
          id: true,
          procedure_date: true,
          diagnosis: true,
          procedure_category: true,
          primary_or_revision: true,
          anaesthesia_type: true,
          case_procedures: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!consultation?.surgical_case) {
    return {
      isComplete: false,
      hasSurgicalCase: false,
    };
  }

  const sc = consultation.surgical_case;
  const isComplete =
    !!sc.procedure_date &&
    !!sc.diagnosis &&
    !!sc.procedure_category &&
    !!sc.primary_or_revision &&
    !!sc.anaesthesia_type &&
    sc.case_procedures.length > 0;

  return {
    isComplete,
    hasSurgicalCase: true,
    caseId: sc.id,
  };
}
