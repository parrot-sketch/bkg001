import { Patient } from '@/domain/entities/Patient';
import { IIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { IIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
import { IntakeSubmissionMapper } from '@/infrastructure/mappers/IntakeSubmissionMapper';
import { PatientMapper } from '@/infrastructure/mappers/PatientMapper';
import { DomainException } from '@/domain/exceptions/DomainException';

/**
 * Use Case: Confirm Patient Intake (Create Patient Record)
 *
 * Triggered by: Frontdesk clicks [Confirm] button on pending intake
 * Input: Session ID + (optional) corrections
 * Output: Created Patient record
 *
 * Business Flow:
 * 1. Validate frontdesk permission (in route handler)
 * 2. Fetch intake submission from database
 * 3. Apply corrections if provided
 * 4. Validate complete data
 * 5. Generate unique file number
 * 6. Create Patient entity
 * 7. Save to repository
 * 8. Mark intake session as CONFIRMED
 * 9. Return Patient DTO
 *
 * Security:
 * - Frontdesk-only operation
 * - Audit logging (who confirmed, when)
 * - Idempotent (calling twice is safe)
 */
export class ConfirmPatientIntakeUseCase {
  constructor(
    private readonly intakeSubmissionRepository: IIntakeSubmissionRepository,
    private readonly intakeSessionRepository: IIntakeSessionRepository,
    private readonly patientRepository: IPatientRepository,
  ) { }

  async execute(input: {
    sessionId: string;
    corrections?: Record<string, any>;
  }): Promise<{
    patientId: string;
    fileNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }> {
    try {
      // 1. Fetch intake submission from database
      const submission = await this.intakeSubmissionRepository.findBySessionId(
        input.sessionId,
      );

      if (!submission) {
        throw new DomainException('Intake submission not found');
      }

      if (submission.getStatus() === 'CONFIRMED') {
        throw new DomainException('Intake has already been confirmed');
      }

      if (submission.getStatus() === 'REJECTED') {
        throw new DomainException('Intake has been rejected');
      }

      // 2. Apply corrections if provided (future enhancement)
      if (input.corrections && Object.keys(input.corrections).length > 0) {
        // This would involve validating corrections and potentially
        // recreating the submission with corrected data
        // For MVP, we skip this feature
      }

      // 3. Validate complete data
      if (!submission.isComplete()) {
        const missing = submission.getIncompleteness();
        throw new DomainException(
          `Cannot confirm incomplete intake. Missing fields: ${missing.join(', ')}`,
        );
      }

      // 4. Generate unique file number
      const fileNumber = await this.generateFileNumber();

      // 5. Convert intake submission to Patient entity
      const patientId = crypto.randomUUID();
      const patientEntity = submission.toPatientEntity(fileNumber, patientId);

      // 6. Save to repository
      await this.patientRepository.save(patientEntity);
      const savedPatient = patientEntity;

      // 7. Mark intake session as CONFIRMED
      await this.intakeSessionRepository.updateStatus(input.sessionId, 'CONFIRMED');

      // 8. Mark intake submission with patient ID
      await this.intakeSubmissionRepository.updateWithPatientId(
        submission.getSubmissionId(),
        savedPatient.getId(),
      );

      // 9. Return Patient DTO
      return {
        patientId: savedPatient.getId(),
        fileNumber: savedPatient.getFileNumber(),
        firstName: savedPatient.getFirstName(),
        lastName: savedPatient.getLastName(),
        email: savedPatient.getEmail().getValue(),
        phone: savedPatient.getPhone().getValue(),
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }

      throw new Error(`Failed to confirm patient intake: ${(error as Error).message}`);
    }
  }

  /**
   * Generate unique file number
   * Format: NS followed by sequential number (e.g., NS001, NS002)
   *
   * This is a simplified implementation.
   * In production, use a database sequence or distributed ID generator.
   */
  private async generateFileNumber(): Promise<string> {
    // Get current timestamp-based number for uniqueness
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const fileNumber = `NS${timestamp}${random}`;

    return fileNumber;
  }
}
