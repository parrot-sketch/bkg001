import { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
import { PatientNotFoundError } from '@/domain/errors/IntakeErrors';
import { AuditLogger } from '@/lib/audit/AuditLogger';
import type { PatientDetailDto } from '@/application/dtos/PatientDetailDto';
import { patientToDetailDto } from '@/application/use-cases/UpdatePatientUseCase';
import db from '@/lib/db';

export class GetPatientDetailUseCase {
  constructor(
    private readonly patientRepo: IPatientRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(
    patientId: string,
    auditContext: { userId: string; ipAddress?: string; userAgent?: string },
  ): Promise<PatientDetailDto> {
    // 1. HIPAA audit: log who viewed this patient's full record
    await this.auditLogger.logPatientAccess(auditContext, patientId, 'VIEW');

    // 2. Fetch patient entity
    const patient = await this.patientRepo.findById(patientId);
    if (!patient) throw new PatientNotFoundError(patientId);

    // 3. Fetch related counts
    const [totalAppointments, lastAppointment] = await Promise.all([
      db.appointment.count({ where: { patient_id: patientId } }),
      db.appointment.findFirst({
        where: { patient_id: patientId, status: 'COMPLETED' },
        orderBy: { appointment_date: 'desc' },
        select: { appointment_date: true },
      }),
    ]);

    // 4. Return DTO
    return patientToDetailDto(
      patient,
      totalAppointments,
      lastAppointment?.appointment_date ?? null,
    );
  }
}
