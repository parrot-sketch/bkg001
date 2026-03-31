import { Email } from '@/domain/value-objects/Email';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';
import { DomainException } from '@/domain/exceptions/DomainException';
import { Gender } from '@/domain/enums/Gender';

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | '';
export type Relationship = 'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'FRIEND' | 'OTHER' | '';
export type BloodGroup = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | '';
export type SubmissionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

// ── Value Objects ──

class PersonalInfo {
  constructor(
    readonly firstName: string,
    readonly lastName: string,
    readonly dateOfBirth: Date,
    readonly gender: Gender,
  ) {
    if (!firstName || firstName.trim().length < 2) {
      throw new DomainException('First name must be at least 2 characters');
    }
    if (!lastName || lastName.trim().length < 2) {
      throw new DomainException('Last name must be at least 2 characters');
    }
    if (dateOfBirth > new Date()) {
      throw new DomainException('Date of birth cannot be in the future');
    }
  }

  getAge(): number {
    const today = new Date();
    let age = today.getFullYear() - this.dateOfBirth.getFullYear();
    const m = today.getMonth() - this.dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < this.dateOfBirth.getDate())) age--;
    return age;
  }

  isMinor(): boolean { return this.getAge() < 18; }

  toPrimitive() {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      dateOfBirth: this.dateOfBirth.toISOString(),
      gender: this.gender,
      age: this.getAge(),
    };
  }
}

class ContactInfo {
  constructor(
    readonly email: Email,
    readonly phone: PhoneNumber,
    readonly address?: string,
    readonly maritalStatus?: MaritalStatus,
    readonly occupation?: string,
    readonly whatsappPhone?: PhoneNumber,
  ) {
    if (address && address.trim().length > 500) {
      throw new DomainException('Address must be at most 500 characters');
    }
  }

  toPrimitive() {
    return {
      email: this.email.getValue(),
      phone: this.phone.getValue(),
      address: this.address || '',
      maritalStatus: this.maritalStatus,
      occupation: this.occupation,
      whatsappPhone: this.whatsappPhone?.getValue(),
    };
  }
}

class EmergencyContact {
  constructor(
    readonly name?: string,
    readonly phoneNumber?: PhoneNumber,
    readonly relationship?: Relationship,
  ) {
    if (name && name.trim().length > 0 && name.trim().length < 2) {
      throw new DomainException('Emergency contact name must be at least 2 characters');
    }
  }

  toPrimitive() {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber?.getValue(),
      relationship: this.relationship,
    };
  }
}

class MedicalInfo {
  constructor(
    readonly bloodGroup?: BloodGroup,
    readonly allergies?: string,
    readonly medicalConditions?: string,
    readonly medicalHistory?: string,
  ) {
    if (allergies && allergies.trim().length > 500) {
      throw new DomainException('Allergies must be at most 500 characters');
    }
    if (medicalConditions && medicalConditions.trim().length > 500) {
      throw new DomainException('Medical conditions must be at most 500 characters');
    }
    if (medicalHistory && medicalHistory.trim().length > 1000) {
      throw new DomainException('Medical history must be at most 1000 characters');
    }
  }

  hasBloodGroup(): boolean { return !!this.bloodGroup; }
  hasAllergies(): boolean { return !!this.allergies && this.allergies.trim().length > 0; }
  hasConditions(): boolean { return !!this.medicalConditions && this.medicalConditions.trim().length > 0; }
  hasHistory(): boolean { return !!this.medicalHistory && this.medicalHistory.trim().length > 0; }

  toPrimitive() {
    return {
      bloodGroup: this.bloodGroup,
      allergies: this.allergies,
      medicalConditions: this.medicalConditions,
      medicalHistory: this.medicalHistory,
    };
  }
}

class InsuranceInfo {
  constructor(readonly provider?: string, readonly number?: string) {
    if (provider && provider.trim().length > 100) {
      throw new DomainException('Insurance provider must be at most 100 characters');
    }
    if (number && number.trim().length > 100) {
      throw new DomainException('Insurance number must be at most 100 characters');
    }
  }

  hasInsurance(): boolean { return !!this.provider && !!this.number; }

  toPrimitive() {
    return { provider: this.provider, number: this.number };
  }
}

class ConsentInfo {
  constructor(
    readonly privacyConsent: boolean,
    readonly serviceConsent: boolean,
    readonly medicalConsent: boolean,
  ) {
    if (!privacyConsent || !serviceConsent || !medicalConsent) {
      throw new DomainException('All consents are required');
    }
  }

  toPrimitive() {
    return {
      privacyConsent: this.privacyConsent,
      serviceConsent: this.serviceConsent,
      medicalConsent: this.medicalConsent,
    };
  }
}

// ── Aggregate Root ──

export class IntakeSubmission {
  private constructor(
    private readonly submissionId: string,
    private readonly sessionId: string,
    private readonly personalInfo: PersonalInfo,
    private readonly contactInfo: ContactInfo,
    private readonly emergencyContact: EmergencyContact,
    private readonly medicalInfo: MedicalInfo,
    private readonly insuranceInfo: InsuranceInfo,
    private readonly consent: ConsentInfo,
    private readonly submittedAt: Date,
    private readonly ipAddress: string | undefined,
    private readonly userAgent: string | undefined,
    private readonly status: SubmissionStatus,
  ) {}

  static create(params: {
    submissionId: string;
    sessionId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    email: string;
    phone: string;
    address?: string;
    maritalStatus?: MaritalStatus;
    occupation?: string;
    whatsappPhone?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
    emergencyContactRelation?: Relationship;
    bloodGroup?: BloodGroup;
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
  }): IntakeSubmission {
    return new IntakeSubmission(
      params.submissionId,
      params.sessionId,
      new PersonalInfo(params.firstName, params.lastName, params.dateOfBirth, params.gender as Gender),
      new ContactInfo(
        Email.create(params.email),
        PhoneNumber.create(params.phone),
        params.address,
        params.maritalStatus,
        params.occupation,
        params.whatsappPhone ? PhoneNumber.create(params.whatsappPhone) : undefined,
      ),
      new EmergencyContact(
        params.emergencyContactName,
        params.emergencyContactNumber ? PhoneNumber.create(params.emergencyContactNumber) : undefined,
        params.emergencyContactRelation,
      ),
      new MedicalInfo(params.bloodGroup, params.allergies, params.medicalConditions, params.medicalHistory),
      new InsuranceInfo(params.insuranceProvider, params.insuranceNumber),
      new ConsentInfo(params.privacyConsent, params.serviceConsent, params.medicalConsent),
      new Date(),
      params.ipAddress,
      params.userAgent,
      'PENDING',
    );
  }

  static restore(data: {
    submissionId: string;
    sessionId: string;
    personalInfo: PersonalInfo;
    contactInfo: ContactInfo;
    emergencyContact: EmergencyContact;
    medicalInfo: MedicalInfo;
    insuranceInfo: InsuranceInfo;
    consent: ConsentInfo;
    submittedAt: Date;
    ipAddress?: string;
    userAgent?: string;
    status?: SubmissionStatus;
  }): IntakeSubmission {
    return new IntakeSubmission(
      data.submissionId,
      data.sessionId,
      data.personalInfo,
      data.contactInfo,
      data.emergencyContact,
      data.medicalInfo,
      data.insuranceInfo,
      data.consent,
      data.submittedAt,
      data.ipAddress,
      data.userAgent,
      data.status || 'PENDING',
    );
  }

  // ── State transitions ──

  markAsConfirmed(): IntakeSubmission {
    if (this.status !== 'PENDING') {
      throw new DomainException(`Cannot confirm submission with status ${this.status}`);
    }
    return new IntakeSubmission(
      this.submissionId, this.sessionId,
      this.personalInfo, this.contactInfo, this.emergencyContact,
      this.medicalInfo, this.insuranceInfo, this.consent,
      this.submittedAt, this.ipAddress, this.userAgent,
      'CONFIRMED',
    );
  }

  markAsRejected(): IntakeSubmission {
    if (this.status !== 'PENDING') {
      throw new DomainException(`Cannot reject submission with status ${this.status}`);
    }
    return new IntakeSubmission(
      this.submissionId, this.sessionId,
      this.personalInfo, this.contactInfo, this.emergencyContact,
      this.medicalInfo, this.insuranceInfo, this.consent,
      this.submittedAt, this.ipAddress, this.userAgent,
      'REJECTED',
    );
  }

  // ── Business logic ──

  getIncompleteness(): string[] {
    const missing: string[] = [];
    if (!this.personalInfo.firstName) missing.push('firstName');
    if (!this.personalInfo.lastName) missing.push('lastName');
    if (!this.personalInfo.dateOfBirth) missing.push('dateOfBirth');
    if (!this.contactInfo.email) missing.push('email');
    if (!this.contactInfo.phone) missing.push('phone');
    return missing;
  }

  isComplete(): boolean {
    return this.getIncompleteness().length === 0;
  }

  getCompletenessScore(): number {
    let score = 70;
    if (this.medicalInfo.hasBloodGroup()) score += 5;
    if (this.medicalInfo.hasAllergies()) score += 5;
    if (this.medicalInfo.hasConditions()) score += 5;
    if (this.medicalInfo.hasHistory()) score += 5;
    if (this.insuranceInfo.hasInsurance()) score += 5;
    return Math.min(score, 100);
  }

  // ── Getters ──

  getSubmissionId(): string { return this.submissionId; }
  getSessionId(): string { return this.sessionId; }
  getPersonalInfo(): PersonalInfo { return this.personalInfo; }
  getContactInfo(): ContactInfo { return this.contactInfo; }
  getEmergencyContact(): EmergencyContact { return this.emergencyContact; }
  getMedicalInfo(): MedicalInfo { return this.medicalInfo; }
  getInsuranceInfo(): InsuranceInfo { return this.insuranceInfo; }
  getConsent(): ConsentInfo { return this.consent; }
  getSubmittedAt(): Date { return new Date(this.submittedAt); }
  getIpAddress(): string | undefined { return this.ipAddress; }
  getUserAgent(): string | undefined { return this.userAgent; }
  getStatus(): SubmissionStatus { return this.status; }

  // ── Serialization ──

  toPrimitive() {
    return {
      submissionId: this.submissionId,
      sessionId: this.sessionId,
      personalInfo: this.personalInfo.toPrimitive(),
      contactInfo: this.contactInfo.toPrimitive(),
      emergencyContact: this.emergencyContact.toPrimitive(),
      medicalInfo: this.medicalInfo.toPrimitive(),
      insuranceInfo: this.insuranceInfo.toPrimitive(),
      consent: this.consent.toPrimitive(),
      submittedAt: this.submittedAt.toISOString(),
      status: this.status,
      completenessScore: this.getCompletenessScore(),
      isComplete: this.isComplete(),
    };
  }
}
