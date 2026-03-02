/**
 * Surgical Plan Mappers
 * 
 * DTO → ViewModel transformations for surgical plan feature.
 * Keeps domain data separate from UI concerns.
 */

import type { CasePlanDetailDto } from '@/lib/api/case-plan';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';
import type { SurgicalCasePlanViewModel } from '../../core/types';

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: string | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return `${age}y`;
}

/**
 * Map CasePlanDetailDto to SurgicalCasePlanViewModel
 * 
 * Creates a stable view model for the shell and tabs.
 * No UI strings mixed into domain data.
 */
export function mapCasePlanDetailDtoToViewModel(
  dto: CasePlanDetailDto,
  timeline: TimelineResultDto | null = null
): SurgicalCasePlanViewModel {
  const patient = dto.patient;
  const casePlan = dto.casePlan;

  return {
    caseId: dto.id,
    patient: patient
      ? {
          id: patient.id,
          fullName: `${patient.firstName} ${patient.lastName}`,
          fileNumber: patient.fileNumber,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          age: calculateAge(patient.dateOfBirth),
          allergies: patient.allergies,
        }
      : null,
    case: {
      id: dto.id,
      status: dto.status,
      urgency: dto.urgency,
      procedureName: dto.procedureName,
      side: dto.side,
      diagnosis: dto.diagnosis,
      createdAt: dto.createdAt,
    },
    casePlan: casePlan
      ? {
          id: casePlan.id,
          procedurePlan: casePlan.procedurePlan,
          riskFactors: casePlan.riskFactors,
          preOpNotes: casePlan.preOpNotes,
          anesthesiaPlan: casePlan.anesthesiaPlan,
          specialInstructions: casePlan.specialInstructions,
          estimatedDurationMinutes: casePlan.estimatedDurationMinutes,
          readinessStatus: casePlan.readinessStatus,
          readyForSurgery: casePlan.readyForSurgery,
          consentsCount: casePlan.consents.length,
          imagesCount: casePlan.images.length,
          staffCount: casePlan.procedureRecord?.staff.length ?? 0,
        }
      : null,
    primarySurgeon: dto.primarySurgeon
      ? {
          id: dto.primarySurgeon.id,
          name: dto.primarySurgeon.name,
        }
      : null,
    theaterBooking: dto.theaterBooking
      ? {
          id: dto.theaterBooking.id,
          startTime: dto.theaterBooking.startTime,
          endTime: dto.theaterBooking.endTime,
          status: dto.theaterBooking.status,
          theaterName: dto.theaterBooking.theaterName,
        }
      : null,
    readinessChecklist: dto.readinessChecklist,
    timeline,
  };
}
