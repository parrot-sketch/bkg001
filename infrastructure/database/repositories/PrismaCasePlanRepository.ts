import { PrismaClient, CasePlan, CaseReadinessStatus } from '@prisma/client';
import { ICasePlanRepository } from '@/domain/interfaces/repositories/ICasePlanRepository';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';

export class PrismaCasePlanRepository implements ICasePlanRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(dto: CreateCasePlanDto): Promise<CasePlan> {
        const { appointmentId, ...rest } = dto;

        return this.prisma.casePlan.upsert({
            where: {
                appointment_id: appointmentId,
            },
            update: {
                procedure_plan: dto.procedurePlan,
                risk_factors: dto.riskFactors,
                pre_op_notes: dto.preOpNotes,
                implant_details: dto.implantDetails,
                planned_anesthesia: dto.anesthesiaPlan,
                special_instructions: dto.specialInstructions,
                readiness_status: (dto.readinessStatus as CaseReadinessStatus) || CaseReadinessStatus.NOT_STARTED,
            },
            create: {
                appointment_id: appointmentId,
                patient_id: dto.patientId,
                doctor_id: dto.doctorId,
                procedure_plan: dto.procedurePlan,
                risk_factors: dto.riskFactors,
                pre_op_notes: dto.preOpNotes,
                implant_details: dto.implantDetails,
                planned_anesthesia: dto.anesthesiaPlan,
                special_instructions: dto.specialInstructions,
                readiness_status: (dto.readinessStatus as CaseReadinessStatus) || CaseReadinessStatus.NOT_STARTED,
            },
        });
    }

    async findByAppointmentId(appointmentId: number): Promise<CasePlan | null> {
        return this.prisma.casePlan.findUnique({
            where: {
                appointment_id: appointmentId,
            },
        });
    }
}
