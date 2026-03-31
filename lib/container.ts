import { db } from '@/lib/db';
import { PrismaIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { PrismaIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { PrismaPatientRepository } from '@/infrastructure/repositories/PatientRepository';
import { StartPatientIntakeUseCase } from '@/application/use-cases/StartPatientIntakeUseCase';
import { SubmitPatientIntakeUseCase } from '@/application/use-cases/SubmitPatientIntakeUseCase';
import { ConfirmPatientIntakeUseCase } from '@/application/use-cases/ConfirmPatientIntakeUseCase';
import { GetIntakeSessionStatusUseCase } from '@/application/use-cases/GetIntakeSessionStatusUseCase';
import { ListPatientsUseCase } from '@/application/use-cases/ListPatientsUseCase';
import { GetPatientStatsUseCase } from '@/application/use-cases/GetPatientStatsUseCase';
import { UpdatePatientUseCase } from '@/application/use-cases/UpdatePatientUseCase';
import { GetPatientDetailUseCase } from '@/application/use-cases/GetPatientDetailUseCase';
import { AuditLogger } from '@/lib/audit/AuditLogger';

const sessionRepo = new PrismaIntakeSessionRepository(db);
const submissionRepo = new PrismaIntakeSubmissionRepository(db);
const patientRepo = new PrismaPatientRepository(db);
const auditLogger = new AuditLogger(db);

export const container = {
  // Repositories
  sessionRepo,
  submissionRepo,
  patientRepo,

  // Audit
  auditLogger,

  // Intake use cases
  startIntake: new StartPatientIntakeUseCase(sessionRepo),
  submitIntake: new SubmitPatientIntakeUseCase(sessionRepo, submissionRepo, patientRepo),
  confirmIntake: new ConfirmPatientIntakeUseCase(submissionRepo, sessionRepo, patientRepo),
  getIntakeSessionStatus: new GetIntakeSessionStatusUseCase(sessionRepo, submissionRepo),

  // Patient use cases
  listPatients: new ListPatientsUseCase(patientRepo, auditLogger),
  getPatientStats: new GetPatientStatsUseCase(patientRepo, auditLogger),
  getPatientDetail: new GetPatientDetailUseCase(patientRepo, auditLogger),
  updatePatient: new UpdatePatientUseCase(patientRepo, auditLogger),
} as const;
