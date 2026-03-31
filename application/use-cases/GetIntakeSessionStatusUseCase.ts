import { IIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { IIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { SessionNotFoundError } from '@/domain/errors/IntakeErrors';

export interface IntakeSessionStatusOutput {
  sessionId: string;
  status: 'ACTIVE' | 'SUBMITTED' | 'CONFIRMED' | 'EXPIRED';
  expiresAt: string;
  patientName?: string;
  submittedAt?: string;
}

export class GetIntakeSessionStatusUseCase {
  constructor(
    private readonly sessionRepo: IIntakeSessionRepository,
    private readonly submissionRepo: IIntakeSubmissionRepository,
  ) {}

  async execute(sessionId: string): Promise<IntakeSessionStatusOutput> {
    const session = await this.sessionRepo.findBySessionId(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);

    // Auto-expire if time has elapsed but status hasn't been updated
    let current = session;
    if (current.getStatus() === 'ACTIVE' && current.isExpired()) {
      current = current.markAsExpired();
      await this.sessionRepo.updateStatus(sessionId, 'EXPIRED');
    }

    const status = current.getStatus();

    // Only fetch submission if we need patient name
    if (status === 'SUBMITTED' || status === 'CONFIRMED') {
      const submission = await this.submissionRepo.findBySessionId(sessionId);
      if (submission) {
        const personal = submission.getPersonalInfo();
        return {
          sessionId,
          status,
          expiresAt: current.getExpiresAt().toISOString(),
          patientName: `${personal.firstName} ${personal.lastName}`,
          submittedAt: submission.getSubmittedAt().toISOString(),
        };
      }
    }

    return {
      sessionId,
      status,
      expiresAt: current.getExpiresAt().toISOString(),
    };
  }
}
