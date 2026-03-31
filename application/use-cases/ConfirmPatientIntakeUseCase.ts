import { Patient } from '@/domain/entities/Patient';
import { IIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { IIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
import { Gender } from '@/domain/enums/Gender';
import {
  SessionNotFoundError,
  IncompleteSubmissionError,
  InvalidSessionStateError,
} from '@/domain/errors/IntakeErrors';
import { v4 as uuidv4 } from 'uuid';

export interface ConfirmIntakeOutput {
  patientId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export class ConfirmPatientIntakeUseCase {
  constructor(
    private readonly submissionRepo: IIntakeSubmissionRepository,
    private readonly sessionRepo: IIntakeSessionRepository,
    private readonly patientRepo: IPatientRepository,
  ) {}

  async execute(sessionId: string): Promise<ConfirmIntakeOutput> {
    // 1. Fetch submission
    const submission = await this.submissionRepo.findBySessionId(sessionId);
    if (!submission) throw new SessionNotFoundError(sessionId);

    if (submission.getStatus() === 'CONFIRMED') {
      throw new InvalidSessionStateError(sessionId, 'CONFIRMED', 'PENDING');
    }

    if (submission.getStatus() === 'REJECTED') {
      throw new InvalidSessionStateError(sessionId, 'REJECTED', 'PENDING');
    }

    // 2. Validate completeness
    if (!submission.isComplete()) {
      throw new IncompleteSubmissionError(submission.getIncompleteness());
    }

    // 3. Generate file number and patient ID
    const fileNumber = await this.patientRepo.generateNextFileNumber();
    const patientId = uuidv4();

    // 4. Convert submission → Patient entity
    const primitive = submission.toPrimitive();
    const patientEntity = Patient.create({
      id: patientId,
      fileNumber,
      firstName: primitive.personalInfo.firstName,
      lastName: primitive.personalInfo.lastName,
      dateOfBirth: new Date(primitive.personalInfo.dateOfBirth),
      gender: primitive.personalInfo.gender as Gender,
      email: primitive.contactInfo.email,
      phone: primitive.contactInfo.phone,
      address: primitive.contactInfo.address,
      maritalStatus: primitive.contactInfo.maritalStatus || '',
      occupation: primitive.contactInfo.occupation,
      whatsappPhone: primitive.contactInfo.whatsappPhone,
      emergencyContactName: primitive.emergencyContact.name || undefined,
      emergencyContactNumber: primitive.emergencyContact.phoneNumber || undefined,
      relation: primitive.emergencyContact.relationship || undefined,
      bloodGroup: primitive.medicalInfo.bloodGroup,
      allergies: primitive.medicalInfo.allergies,
      medicalConditions: primitive.medicalInfo.medicalConditions,
      medicalHistory: primitive.medicalInfo.medicalHistory,
      insuranceProvider: primitive.insuranceInfo.provider,
      insuranceNumber: primitive.insuranceInfo.number,
      privacyConsent: primitive.consent.privacyConsent,
      serviceConsent: primitive.consent.serviceConsent,
      medicalConsent: primitive.consent.medicalConsent,
    });

    // 5. Persist
    await this.patientRepo.save(patientEntity);
    await this.sessionRepo.updateStatus(sessionId, 'CONFIRMED');
    await this.submissionRepo.updateWithPatientId(submission.getSubmissionId(), patientId);

    return {
      patientId,
      fileNumber,
      firstName: primitive.personalInfo.firstName,
      lastName: primitive.personalInfo.lastName,
      email: primitive.contactInfo.email,
      phone: primitive.contactInfo.phone,
    };
  }
}
