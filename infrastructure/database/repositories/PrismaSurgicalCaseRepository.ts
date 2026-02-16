import { PrismaClient, SurgicalCase, SurgicalCaseStatus, SurgicalUrgency, SurgicalRole } from '@prisma/client';
import { ISurgicalCaseRepository } from '@/domain/interfaces/repositories/ISurgicalCaseRepository';

/**
 * Repository: PrismaSurgicalCaseRepository
 *
 * Prisma-based implementation of ISurgicalCaseRepository.
 * Handles surgical case persistence for the surgery workflow.
 */
export class PrismaSurgicalCaseRepository implements ISurgicalCaseRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  async findById(id: string): Promise<SurgicalCase | null> {
    return this.prisma.surgicalCase.findUnique({
      where: { id },
      include: {
        patient: true,
        primary_surgeon: true,
        consultation: true,
        case_plan: true,
        theater_booking: {
          include: {
            theater: true,
          },
        },
        procedure_record: true,
      },
    });
  }

  async findByPatientId(patientId: string): Promise<SurgicalCase[]> {
    return this.prisma.surgicalCase.findMany({
      where: { patient_id: patientId },
      orderBy: { created_at: 'desc' },
      take: 50, // Safety limit — patient won't realistically have 50+ surgical cases
      include: {
        patient: true,
        primary_surgeon: true,
        case_plan: true,
        theater_booking: true,
      },
    });
  }

  async findByConsultationId(consultationId: number): Promise<SurgicalCase | null> {
    return this.prisma.surgicalCase.findUnique({
      where: { consultation_id: consultationId },
      include: {
        patient: true,
        primary_surgeon: true,
        case_plan: true,
      },
    });
  }

  async findByStatus(status: SurgicalCaseStatus): Promise<SurgicalCase[]> {
    return this.prisma.surgicalCase.findMany({
      where: { status },
      orderBy: { created_at: 'desc' },
      take: 100, // Safety limit for status-based queries
      include: {
        patient: true,
        primary_surgeon: true,
        case_plan: true,
        theater_booking: true,
      },
    });
  }

  async findBySurgeonId(surgeonId: string): Promise<SurgicalCase[]> {
    return this.prisma.surgicalCase.findMany({
      where: { primary_surgeon_id: surgeonId },
      orderBy: { created_at: 'desc' },
      take: 100, // Safety limit — surgeon's active case list
      include: {
        patient: true,
        primary_surgeon: true,
        case_plan: {
          include: {
            consents: true,
            images: true,
          },
        },
        theater_booking: {
          include: {
            theater: true,
          },
        },
        consultation: {
          include: {
            appointment: true,
          },
        },
      },
    });
  }

  async findReadyForScheduling(): Promise<SurgicalCase[]> {
    return this.prisma.surgicalCase.findMany({
      where: {
        status: SurgicalCaseStatus.READY_FOR_SCHEDULING,
      },
      orderBy: { created_at: 'asc' },
      take: 100, // Safety limit for scheduling queue
      include: {
        patient: true,
        primary_surgeon: true,
        case_plan: {
          include: {
            consents: true,
            images: true,
          },
        },
        consultation: {
          include: {
            appointment: true,
          },
        },
      },
    });
  }

  async findPendingPreOp(): Promise<SurgicalCase[]> {
    return this.prisma.surgicalCase.findMany({
      where: {
        status: {
          in: [SurgicalCaseStatus.DRAFT, SurgicalCaseStatus.PLANNING],
        },
      },
      orderBy: { created_at: 'asc' },
      take: 100, // Safety limit for pre-op queue
      include: {
        patient: true,
        primary_surgeon: true,
        case_plan: {
          include: {
            consents: true,
            images: true,
          },
        },
        consultation: {
          include: {
            appointment: true,
          },
        },
      },
    });
  }

  async create(data: {
    patientId: string;
    primarySurgeonId: string;
    consultationId?: number;
    appointmentId?: number;
    urgency?: SurgicalUrgency;
    diagnosis?: string;
    procedureName?: string;
    createdBy?: string;
  }): Promise<SurgicalCase> {
    return this.prisma.surgicalCase.create({
      data: {
        patient_id: data.patientId,
        primary_surgeon_id: data.primarySurgeonId,
        consultation_id: data.consultationId,
        urgency: data.urgency ?? SurgicalUrgency.ELECTIVE,
        diagnosis: data.diagnosis,
        procedure_name: data.procedureName,
        created_by: data.createdBy,
        status: SurgicalCaseStatus.DRAFT,
      },
      include: {
        patient: true,
        primary_surgeon: true,
      },
    });
  }

  async updateStatus(id: string, status: SurgicalCaseStatus): Promise<SurgicalCase> {
    return this.prisma.surgicalCase.update({
      where: { id },
      data: { status },
    });
  }

  async update(id: string, data: Partial<SurgicalCase>): Promise<SurgicalCase> {
    return this.prisma.surgicalCase.update({
      where: { id },
      data,
    });
  }

  async addStaff(data: {
    procedureRecordId: number;
    userId: string;
    role: SurgicalRole;
  }): Promise<void> {
    // Check if user is already assigned to this role in this record
    const existing = await this.prisma.surgicalStaff.findFirst({
      where: {
        procedure_record_id: data.procedureRecordId,
        user_id: data.userId,
        role: data.role,
      },
    });

    if (existing) return;

    await this.prisma.surgicalStaff.create({
      data: {
        procedure_record_id: data.procedureRecordId,
        user_id: data.userId,
        role: data.role,
      },
    });
  }
}
