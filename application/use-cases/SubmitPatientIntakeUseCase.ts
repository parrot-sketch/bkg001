import { IntakeSubmission } from '@/domain/entities/IntakeSubmission';
import { IIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { IIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
import { Patient } from '@/domain/entities/Patient';
import { Email } from '@/domain/value-objects/Email';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';
import { Gender } from '@/domain/enums/Gender';
import {
  SessionNotFoundError,
  SessionExpiredError,
  SessionAlreadySubmittedError,
  DuplicatePatientError,
} from '@/domain/errors/IntakeErrors';
import { v4 as uuidv4 } from 'uuid';

export interface SubmitIntakeInput {
  sessionId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  email?: string;
  phone?: string;
  address?: string;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | '';
  occupation?: string;
  whatsappPhone?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelation?: 'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'FRIEND' | 'OTHER' | '';
  bloodGroup?: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
  allergies?: string;
  medicalConditions?: string;
  medicalHistory?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SubmitIntakeOutput {
  submissionId: string;
  sessionId: string;
  patientId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  message: string;
}

export class SubmitPatientIntakeUseCase {
  constructor(
    private readonly sessionRepo: IIntakeSessionRepository,
    private readonly submissionRepo: IIntakeSubmissionRepository,
    private readonly patientRepo: IPatientRepository,
  ) {}

  async execute(input: SubmitIntakeInput): Promise<SubmitIntakeOutput> {
    const session = await this.sessionRepo.findBySessionId(input.sessionId);
    if (!session) throw new SessionNotFoundError(input.sessionId);

    if (session.isExpired()) {
      await this.sessionRepo.updateStatus(input.sessionId, 'EXPIRED');
      throw new SessionExpiredError(input.sessionId);
    }

    if (!session.canAcceptSubmission()) {
      throw new SessionAlreadySubmittedError(input.sessionId);
    }

    const existingPatient = input.email
      ? await this.patientRepo.findByEmail(Email.create(input.email))
      : null;
    if (existingPatient) {
      throw new DuplicatePatientError(
        input.email,
        existingPatient.getFileNumber(),
        existingPatient.getId(),
      );
    }

    const submission = IntakeSubmission.create({
      submissionId: uuidv4(),
      ...input,
      privacyConsent: true,
      serviceConsent: true,
      medicalConsent: true,
    });

    await this.submissionRepo.create(submission);

    const fileNumber = await this.patientRepo.generateNextFileNumber();
    const patientId = uuidv4();

    const patientEntity = Patient.create({
      id: patientId,
      fileNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender as Gender,
      email: input.email,
      phone: input.phone,
      address: input.address,
      maritalStatus: input.maritalStatus,
      occupation: input.occupation,
      whatsappPhone: input.whatsappPhone,
      emergencyContactName: input.emergencyContactName,
      emergencyContactNumber: input.emergencyContactNumber,
      relation: input.emergencyContactRelation,
      bloodGroup: input.bloodGroup,
      allergies: input.allergies,
      medicalConditions: input.medicalConditions,
      medicalHistory: input.medicalHistory,
      insuranceProvider: input.insuranceProvider,
      insuranceNumber: input.insuranceNumber,
      privacyConsent: true,
      serviceConsent: true,
      medicalConsent: true,
    });

    await this.patientRepo.save(patientEntity);

    const updatedSession = session.markAsSubmitted();
    await this.sessionRepo.save(updatedSession);

    await this.submissionRepo.updateWithPatientId(submission.getSubmissionId(), patientId);

    return {
      submissionId: submission.getSubmissionId(),
      sessionId: input.sessionId,
      patientId,
      fileNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      message: 'Patient registered successfully',
    };
  }
}
