/**
 * Surgical Plan Mappers
 *
 * DTO → ViewModel transformations for surgical plan feature.
 * Keeps domain data separate from UI concerns.
 */

import type { CasePlanDetailDto } from '@/lib/api/case-plan';
import type { TimelineResultDto } from '@/application/dtos/TheaterTechDtos';
import type { SurgicalCasePlanViewModel } from '../../core/types';

function calculateAge(dob: string | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age}y`;
}

/**
 * Map CasePlanDetailDto to SurgicalCasePlanViewModel
 */
export function mapCasePlanDetailDtoToViewModel(
  dto: CasePlanDetailDto,
  timeline: TimelineResultDto | null = null,
): SurgicalCasePlanViewModel {
  const patient = dto.patient;
  const cp = dto.casePlan;

  // Team members from SurgicalCaseTeamMember (planning-phase assignments)
  const teamMembers = (dto as any).teamMembers?.map((tm: any) => ({
    id: tm.id,
    role: tm.role,
    name: tm.name || tm.externalName || 'Unknown',
    userId: tm.userId,
    isExternal: tm.isExternal || false,
    externalName: tm.externalName,
    externalCredentials: tm.externalCredentials,
    assignedAt: tm.assignedAt,
  })) ?? [];

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
    casePlan: cp
      ? {
          id: cp.id,
          procedurePlan: cp.procedurePlan,
          riskFactors: cp.riskFactors,
          preOpNotes: cp.preOpNotes,
          anesthesiaPlan: cp.anesthesiaPlan,
          specialInstructions: cp.specialInstructions,
          estimatedDurationMinutes: cp.estimatedDurationMinutes,
          readinessStatus: cp.readinessStatus,
          readyForSurgery: cp.readyForSurgery,
          consentsCount: cp.consents.length,
          imagesCount: cp.images.length,
          staffCount: cp.procedureRecord?.staff.length ?? 0,
        }
      : null,
    primarySurgeon: dto.primarySurgeon
      ? { id: dto.primarySurgeon.id, name: dto.primarySurgeon.name }
      : null,
    consultation: dto.consultation ?? null,
    theaterBooking: dto.theaterBooking
      ? {
          id: dto.theaterBooking.id,
          startTime: dto.theaterBooking.startTime,
          endTime: dto.theaterBooking.endTime,
          status: dto.theaterBooking.status,
          theaterName: dto.theaterBooking.theaterName,
        }
      : null,
    teamMembers,
    billingEstimate: dto.billingEstimate
      ? {
          id: dto.billingEstimate.id,
          surgeonFee: dto.billingEstimate.surgeonFee,
          anaesthesiologistFee: dto.billingEstimate.anaesthesiologistFee,
          theatreFee: dto.billingEstimate.theatreFee,
          subtotal: dto.billingEstimate.subtotal,
          status: dto.billingEstimate.status,
          lineItems: dto.billingEstimate.lineItems.map(li => ({
            id: li.id,
            description: li.description,
            category: li.category,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            totalPrice: li.totalPrice,
            addedByRole: li.addedByRole,
            notes: li.notes,
          })),
        }
      : null,
    readinessChecklist: dto.readinessChecklist,
    timeline,
  };
}
