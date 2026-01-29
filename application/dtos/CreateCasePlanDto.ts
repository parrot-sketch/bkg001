import { CaseReadinessStatus } from '@/domain/enums/CaseReadinessStatus';

export interface CreateCasePlanDto {
    appointmentId: number;
    patientId: string;
    doctorId: string;
    procedurePlan?: string;
    procedureIds?: number[]; // List of services/procedures selected
    riskFactors?: string;
    preOpNotes?: string;
    implantDetails?: string;
    anesthesiaPlan?: string;
    specialInstructions?: string;
    readinessStatus?: CaseReadinessStatus;
}
