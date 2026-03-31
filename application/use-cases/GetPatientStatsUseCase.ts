import {
  IPatientRepository,
  PatientStats,
} from '@/domain/interfaces/repositories/IPatientRepository';
import { AuditLogger } from '@/lib/audit/AuditLogger';

export class GetPatientStatsUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(
    auditContext: { userId: string; ipAddress?: string; userAgent?: string },
  ): Promise<PatientStats> {
    // HIPAA: Log aggregate stats access
    await this.auditLogger.log({
      action: 'VIEW',
      model: 'PatientStats',
      recordId: '*',
      details: 'Aggregate patient statistics',
      context: auditContext,
    });

    return this.patientRepo.getStats();
  }
}
