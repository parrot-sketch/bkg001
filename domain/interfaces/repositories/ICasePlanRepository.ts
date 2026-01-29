import { CasePlan } from '@prisma/client';
import { CreateCasePlanDto } from '@/application/dtos/CreateCasePlanDto';

export interface ICasePlanRepository {
    save(casePlan: CreateCasePlanDto): Promise<CasePlan>;
    findByAppointmentId(appointmentId: number): Promise<CasePlan | null>;
}
