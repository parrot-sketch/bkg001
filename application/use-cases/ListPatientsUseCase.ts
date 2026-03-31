import {
  IPatientRepository,
  PatientFilters,
  PatientListResult,
} from '@/domain/interfaces/repositories/IPatientRepository';
import { AuditLogger } from '@/lib/audit/AuditLogger';

export class ListPatientsUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(
    filters: PatientFilters,
    auditContext: { userId: string; ipAddress?: string; userAgent?: string },
  ): Promise<PatientListResult> {
    // HIPAA: Log that a user listed patient records
    await this.auditLogger.logPatientList(
      auditContext,
      `page=${filters.page}&limit=${filters.limit}&q=${filters.search ?? ''}`,
    );

    return this.patientRepo.findWithFilters(filters);
  }
}
