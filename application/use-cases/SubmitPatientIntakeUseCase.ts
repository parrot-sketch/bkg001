import { IntakeSubmission } from '@/domain/entities/IntakeSubmission';
import { Patient } from '@/domain/entities/Patient';
import { IIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { IIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
import { Email } from '@/domain/value-objects/Email';
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
  email: string;
  phone: string;
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
  privacyConsent: boolean;
  serviceConsent: boolean;
  medicalConsent: boolean;
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
  email: string;
  phone: string;
  message: string;
}

export class SubmitPatientIntakeUseCase {
  constructor(
    private readonly sessionRepo: IIntakeSessionRepository,
    private readonly submissionRepo: IIntakeSubmissionRepository,
    private readonly patientRepo: IPatientRepository,
  ) {}

  async execute(input: SubmitIntakeInput): Promise<SubmitIntakeOutput> {
    // 1. Validate session
    const session = await this.sessionRepo.findBySessionId(input.sessionId);
    if (!session) throw new SessionNotFoundError(input.sessionId);

    if (session.isExpired()) {
      await this.sessionRepo.updateStatus(input.sessionId, 'EXPIRED');
      throw new SessionExpiredError(input.sessionId);
    }

    if (!session.canAcceptSubmission()) {
      throw new SessionAlreadySubmittedError(input.sessionId);
    }

    // 2. Check for duplicate patient by email
    const existingPatient = await this.patientRepo.findByEmail(Email.create(input.email));
    if (existingPatient) {
      throw new DuplicatePatientError(
        input.email,
        existingPatient.getFileNumber(),
        existingPatient.getId(),
      );
    }

    // 3. Create submission entity (validates all fields)
    const submission = IntakeSubmission.create({
      submissionId: uuidv4(),
      ...input,
    });

    // 4. Persist submission and update session status atomically
    await this.submissionRepo.create(submission);

    const updatedSession = session.markAsSubmitted();
    await this.sessionRepo.save(updatedSession);

    // 5. Auto-create patient record immediately
    const primitive = submission.toPrimitive();
    const fileNumber = await this.patientRepo.generateNextFileNumber();
    const patientId = uuidv4();

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
      maritalStatus: primitive.contactInfo.maritalStatus || undefined,
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

    await this.patientRepo.save(patientEntity);
    await this.submissionRepo.updateWithPatientId(submission.getSubmissionId(), patientId);

    return {
      submissionId: submission.getSubmissionId(),
      sessionId: input.sessionId,
      patientId,
      fileNumber,
      firstName: primitive.personalInfo.firstName,
      lastName: primitive.personalInfo.lastName,
      email: primitive.contactInfo.email,
      phone: primitive.contactInfo.phone,
      message: 'Patient registered successfully.',
    };
  }
}
