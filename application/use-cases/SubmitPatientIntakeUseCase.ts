import { IntakeSubmission } from '@/domain/entities/IntakeSubmission';
import { IIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { IIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { IntakeSubmissionMapper } from '@/infrastructure/mappers/IntakeSubmissionMapper';
import { DomainException } from '@/domain/exceptions/DomainException';
import { v4 as uuidv4 } from 'uuid';

/**
 * Use Case: Submit Patient Intake Form
 *
 * Triggered by: Patient submits form from `/patient/intake?sessionId=xyz`
 * Input: Session ID + Form data
 * Output: Confirmation + Created pending intake record
 *
 * Business Flow:
 * 1. Validate session exists and not expired
 * 2. Validate form data (using Zod schema on client, domain entity on server)
 * 3. Create IntakeSubmission entity
 * 4. Store in database
 * 5. Mark session as SUBMITTED
 * 6. Return confirmation
 *
 * Security:
 * - Session-based isolation (one submission per session)
 * - No frontdesk access to submitted data
 * - IP address and user agent logged for audit
 */
export class SubmitPatientIntakeUseCase {
  constructor(
    private readonly intakeSessionRepository: IIntakeSessionRepository,
    private readonly intakeSubmissionRepository: IIntakeSubmissionRepository,
  ) {}

  async execute(
    input: {
      sessionId: string;
      firstName: string;
      lastName: string;
      dateOfBirth: Date;
      gender: 'MALE' | 'FEMALE';
      email: string;
      phone: string;
      address: string;
      maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
      occupation?: string;
      whatsappPhone?: string;
      emergencyContactName: string;
      emergencyContactNumber: string;
      emergencyContactRelation: 'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'FRIEND' | 'OTHER';
      bloodGroup?: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
      allergies?: string;
      medicalConditions?: string;
      medicalHistory?: string;
      insuranceProvider?: string;
      insuranceNumber?: string;
      privacyConsent: boolean;
      serviceConsent: boolean;
      medicalConsent: boolean;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<{
    submissionId: string;
    sessionId: string;
    message: string;
  }> {
    try {
      // 1. Validate session exists and not expired
      const session = await this.intakeSessionRepository.findBySessionId(input.sessionId);

      if (!session) {
        throw new DomainException('Session not found');
      }

      if (session.isExpired()) {
        await this.intakeSessionRepository.markAsExpired(input.sessionId);
        throw new DomainException('Session has expired');
      }

      if (!session.canAcceptSubmission()) {
        throw new DomainException('Session is not accepting submissions at this time');
      }

      // 2. Create IntakeSubmission entity (which validates all form data)
      const submissionId = uuidv4();

      const submission = IntakeSubmission.create({
        submissionId,
        sessionId: input.sessionId,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        email: input.email,
        phone: input.phone,
        address: input.address,
        maritalStatus: input.maritalStatus,
        occupation: input.occupation,
        whatsappPhone: input.whatsappPhone,
        emergencyContactName: input.emergencyContactName,
        emergencyContactNumber: input.emergencyContactNumber,
        emergencyContactRelation: input.emergencyContactRelation,
        bloodGroup: input.bloodGroup,
        allergies: input.allergies,
        medicalConditions: input.medicalConditions,
        medicalHistory: input.medicalHistory,
        insuranceProvider: input.insuranceProvider,
        insuranceNumber: input.insuranceNumber,
        privacyConsent: input.privacyConsent,
        serviceConsent: input.serviceConsent,
        medicalConsent: input.medicalConsent,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      // 3. Store in database
      await this.intakeSubmissionRepository.create(submission);

      // 4. Mark session as SUBMITTED
      await this.intakeSessionRepository.updateStatus(input.sessionId, 'SUBMITTED');

      // 5. Return confirmation
      return {
        submissionId: submission.getSubmissionId(),
        sessionId: input.sessionId,
        message: 'Your intake form has been received successfully. Please return the device to the receptionist.',
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }

      throw new Error(`Failed to submit patient intake: ${(error as Error).message}`);
    }
  }
}
