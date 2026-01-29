import { SurgicalCase, SurgicalCaseStatus } from '@prisma/client';

export interface ISurgicalCaseRepository {
    findById(id: string): Promise<SurgicalCase | null>;
    findByPatientId(patientId: string): Promise<SurgicalCase[]>;
    create(data: {
        patientId: string;
        primarySurgeonId: string;
        consultationId?: number;
        createdBy?: string;
    }): Promise<SurgicalCase>;
    updateStatus(id: string, status: SurgicalCaseStatus): Promise<SurgicalCase>;
    update(id: string, data: Partial<SurgicalCase>): Promise<SurgicalCase>;
}
