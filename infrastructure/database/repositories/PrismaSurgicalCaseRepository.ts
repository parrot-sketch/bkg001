import { PrismaClient, SurgicalCase, SurgicalCaseStatus } from '@prisma/client';
import { db } from '@/lib/db';

export class PrismaSurgicalCaseRepository {
    constructor(private prisma: PrismaClient) { }

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
                        theater: true
                    }
                },
                procedure_record: true
            }
        });
    }

    async findByPatientId(patientId: string): Promise<SurgicalCase[]> {
        return this.prisma.surgicalCase.findMany({
            where: { patient_id: patientId },
            orderBy: { created_at: 'desc' },
            include: {
                primary_surgeon: true,
                theater_booking: true
            }
        });
    }

    async create(data: {
        patientId: string;
        primarySurgeonId: string;
        consultationId?: number;
        createdBy?: string;
    }): Promise<SurgicalCase> {
        return this.prisma.surgicalCase.create({
            data: {
                patient_id: data.patientId,
                primary_surgeon_id: data.primarySurgeonId,
                consultation_id: data.consultationId,
                created_by: data.createdBy,
                status: SurgicalCaseStatus.DRAFT,
            }
        });
    }

    async updateStatus(id: string, status: SurgicalCaseStatus): Promise<SurgicalCase> {
        return this.prisma.surgicalCase.update({
            where: { id },
            data: { status }
        });
    }

    async update(id: string, data: Partial<SurgicalCase>): Promise<SurgicalCase> {
        return this.prisma.surgicalCase.update({
            where: { id },
            data
        });
    }
}
