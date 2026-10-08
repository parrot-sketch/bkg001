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
  phone?: string;
  address?: string;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | '';
  occupation?: string;
  referralSource?: string;
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
    const session = await this.sessionRepo.findBySessionId(input.sessionId);
    if (!session) throw new SessionNotFoundError(input.sessionId);

    if (session.getStatus() === 'ACTIVE' && session.isExpired()) {
      await this.sessionRepo.updateStatus(input.sessionId, 'EXPIRED');
      throw new SessionExpiredError(input.sessionId);
    }

    if (!session.canAcceptSubmission()) {
      if (session.getStatus() === 'EXPIRED') throw new SessionExpiredError(input.sessionId);
      throw new SessionAlreadySubmittedError(input.sessionId);
    }

    // Domain validation runs before any state change so a bad payload never burns the session.
    const submission = IntakeSubmission.create({
      submissionId: uuidv4(),
      ...input,
      phone: input.phone || '+254000000000',
    });

    const existingPatient = await this.patientRepo.findByEmail(Email.create(input.email));
    if (existingPatient) {
      throw new DuplicatePatientError(
        input.email,
        existingPatient.getFileNumber(),
        existingPatient.getId(),
      );
    }

    // Conditional update: only one concurrent request can win the session.
    const claimed = await this.sessionRepo.claimForSubmission(input.sessionId);
    if (!claimed) {
      const latest = await this.sessionRepo.findBySessionId(input.sessionId);
      if (latest?.isExpired()) throw new SessionExpiredError(input.sessionId);
      throw new SessionAlreadySubmittedError(input.sessionId);
    }

    const primitive = submission.toPrimitive();
    const patientId = uuidv4();
    let fileNumber: string;

    try {
      fileNumber = await this.patientRepo.generateNextFileNumber();
      const patientEntity = this.buildPatient(primitive, patientId, fileNumber, input.referralSource);
      await this.patientRepo.save(patientEntity);
    } catch (error) {
      await this.sessionRepo.releaseClaim(input.sessionId).catch(() => undefined);
      throw error;
    }

    // The patient is already registered at this point; a failure recording the
    // audit copy must not surface as a failed registration to the patient.
    try {
      await this.submissionRepo.create(submission);
      await this.submissionRepo.updateWithPatientId(submission.getSubmissionId(), patientId);
    } catch (error) {
      console.error('[SubmitPatientIntake] Patient created but submission record failed', {
        sessionId: input.sessionId,
        patientId,
        error,
      });
    }

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

  private buildPatient(
    primitive: ReturnType<IntakeSubmission['toPrimitive']>,
    patientId: string,
    fileNumber: string,
    referralSource?: string,
  ): Patient {
    return Patient.create({
      referralSource,
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
  }
}
