import { PrismaClient, CasePlan, CaseReadinessStatus } from '@prisma/client';
import { ICasePlanRepository } from '@/domain/interfaces/repositories/ICasePlanRepository';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';

/**
 * Repository: PrismaCasePlanRepository
 *
 * Prisma-based implementation of ICasePlanRepository.
 * Handles case plan persistence for surgical planning and pre-op readiness tracking.
 */
export class PrismaCasePlanRepository implements ICasePlanRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  async save(dto: CreateCasePlanDto): Promise<CasePlan> {
    return this.prisma.casePlan.upsert({
      where: {
        appointment_id: dto.appointmentId,
      },
      update: {
        procedure_plan: dto.procedurePlan,
        risk_factors: dto.riskFactors,
        pre_op_notes: dto.preOpNotes,
        implant_details: dto.implantDetails,
        planned_anesthesia: dto.anesthesiaPlan,
        special_instructions: dto.specialInstructions,
        readiness_status:
          (dto.readinessStatus as CaseReadinessStatus) || CaseReadinessStatus.NOT_STARTED,
      },
      create: {
        appointment_id: dto.appointmentId,
        patient_id: dto.patientId,
        doctor_id: dto.doctorId,
        procedure_plan: dto.procedurePlan,
        risk_factors: dto.riskFactors,
        pre_op_notes: dto.preOpNotes,
        implant_details: dto.implantDetails,
        planned_anesthesia: dto.anesthesiaPlan,
        special_instructions: dto.specialInstructions,
        readiness_status:
          (dto.readinessStatus as CaseReadinessStatus) || CaseReadinessStatus.NOT_STARTED,
      },
    });
  }

  async findByAppointmentId(appointmentId: number): Promise<CasePlan | null> {
    return this.prisma.casePlan.findUnique({
      where: {
        appointment_id: appointmentId,
      },
      include: {
        patient: true,
        doctor: true,
        surgical_case: {
          include: {
            staff_invites: {
              include: {
                invited_user: {
                  select: {
                    first_name: true,
                    last_name: true,
                    role: true,
                  }
                }
              }
            }
          }
        },
        images: true,
        consents: true,
      },
    });
  }

  async findBySurgicalCaseId(surgicalCaseId: string): Promise<CasePlan | null> {
    return this.prisma.casePlan.findUnique({
      where: {
        surgical_case_id: surgicalCaseId,
      },
      include: {
        patient: true,
        doctor: true,
        surgical_case: {
          include: {
            staff_invites: {
              include: {
                invited_user: {
                  select: {
                    first_name: true,
                    last_name: true,
                    role: true,
                  }
                }
              }
            }
          }
        },
        images: true,
        consents: true,
      },
    });
  }

  async findById(id: number): Promise<CasePlan | null> {
    return this.prisma.casePlan.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        surgical_case: {
          include: {
            staff_invites: {
              include: {
                invited_user: {
                  select: {
                    first_name: true,
                    last_name: true,
                    role: true,
                  }
                }
              }
            }
          }
        },
        images: true,
        consents: true,
      },
    });
  }

  async findByReadinessStatus(status: CaseReadinessStatus): Promise<CasePlan[]> {
    return this.prisma.casePlan.findMany({
      where: {
        readiness_status: status,
      },
      orderBy: { created_at: 'asc' },
      take: 100, // Safety limit for readiness status queries
      include: {
        patient: true,
        doctor: true,
        surgical_case: true,
      },
    });
  }

  async findPendingReadiness(): Promise<CasePlan[]> {
    return this.prisma.casePlan.findMany({
      where: {
        readiness_status: {
          in: [
            CaseReadinessStatus.NOT_STARTED,
            CaseReadinessStatus.IN_PROGRESS,
            CaseReadinessStatus.PENDING_LABS,
            CaseReadinessStatus.PENDING_CONSENT,
            CaseReadinessStatus.PENDING_REVIEW,
          ],
        },
        ready_for_surgery: false,
      },
      orderBy: { created_at: 'asc' },
      take: 100, // Safety limit for pending readiness queue
      include: {
        patient: true,
        doctor: true,
        surgical_case: {
          include: {
            primary_surgeon: true,
            theater_booking: true,
          },
        },
        images: true,
        consents: true,
      },
    });
  }

  async updateReadinessStatus(id: number, status: CaseReadinessStatus): Promise<CasePlan> {
    const isReady = status === CaseReadinessStatus.READY;

    return this.prisma.casePlan.update({
      where: { id },
      data: {
        readiness_status: status,
        ready_for_surgery: isReady,
      },
    });
  }

  async linkToSurgicalCase(casePlanId: number, surgicalCaseId: string): Promise<CasePlan> {
    return this.prisma.casePlan.update({
      where: { id: casePlanId },
      data: {
        surgical_case_id: surgicalCaseId,
      },
      include: {
        surgical_case: true,
      },
    });
  }
}
