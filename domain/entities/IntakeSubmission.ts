import { Email } from '@/domain/value-objects/Email';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';
import { DomainException } from '@/domain/exceptions/DomainException';
import { Patient } from '@/domain/entities/Patient';
import { Gender } from '@/domain/enums/Gender';

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type Relationship = 'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'FRIEND' | 'OTHER';
export type BloodGroup = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
export type SubmissionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

/**
 * Value Object: PersonalInfo
 * Encapsulates personal information section
 */
class PersonalInfo {
  constructor(
    readonly firstName: string,
    readonly lastName: string,
    readonly dateOfBirth: Date,
    readonly gender: 'MALE' | 'FEMALE',
  ) {
    // Validate
    if (!firstName || firstName.trim().length < 2) {
      throw new DomainException('First name must be at least 2 characters');
    }
    if (!lastName || lastName.trim().length < 2) {
      throw new DomainException('Last name must be at least 2 characters');
    }
    if (dateOfBirth > new Date()) {
      throw new DomainException('Date of birth cannot be in the future');
    }

    // Calculate age
    const age = new Date().getFullYear() - dateOfBirth.getFullYear();
    if (age < 16) {
      throw new DomainException('Patient must be at least 16 years old');
    }
  }

  getAge(): number {
    const today = new Date();
    let age = today.getFullYear() - this.dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())
    ) {
      age--;
    }
    return age;
  }

  isMinor(): boolean {
    return this.getAge() < 18;
  }

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

/**
 * Value Object: ContactInfo
 * Encapsulates contact information section
 */
class ContactInfo {
  constructor(
    readonly email: Email,
    readonly phone: PhoneNumber,
    readonly address: string,
    readonly maritalStatus: MaritalStatus,
    readonly occupation?: string,
    readonly whatsappPhone?: PhoneNumber,
  ) {
    if (!address || address.trim().length < 10) {
      throw new DomainException('Address must be at least 10 characters');
    }
    if (address.trim().length > 500) {
      throw new DomainException('Address must be at most 500 characters');
    }
  }

  toPrimitive() {
    return {
      email: this.email.getValue(),
      phone: this.phone.getValue(),
      address: this.address,
      maritalStatus: this.maritalStatus,
      occupation: this.occupation,
      whatsappPhone: this.whatsappPhone?.getValue(),
    };
  }
}

/**
 * Value Object: EmergencyContact
 * Encapsulates emergency contact information
 */
class EmergencyContact {
  constructor(
    readonly name: string,
    readonly phoneNumber: PhoneNumber,
    readonly relationship: Relationship,
  ) {
    if (!name || name.trim().length < 2) {
      throw new DomainException('Emergency contact name must be at least 2 characters');
    }
  }

  toPrimitive() {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber.getValue(),
      relationship: this.relationship,
    };
  }
}

/**
 * Value Object: MedicalInfo
 * Encapsulates medical information section
 */
class MedicalInfo {
  constructor(
    readonly bloodGroup?: BloodGroup,
    readonly allergies?: string,
    readonly medicalConditions?: string,
    readonly medicalHistory?: string,
  ) {
    // Optional validation - these are all optional fields
    if (allergies && allergies.trim().length > 500) {
      throw new DomainException('Allergies description must be at most 500 characters');
    }
    if (medicalConditions && medicalConditions.trim().length > 500) {
      throw new DomainException('Medical conditions must be at most 500 characters');
    }
    if (medicalHistory && medicalHistory.trim().length > 1000) {
      throw new DomainException('Medical history must be at most 1000 characters');
    }
  }

  hasBloodGroup(): boolean {
    return !!this.bloodGroup;
  }

  hasAllergies(): boolean {
    return !!this.allergies && this.allergies.trim().length > 0;
  }

  hasConditions(): boolean {
    return !!this.medicalConditions && this.medicalConditions.trim().length > 0;
  }

  hasHistory(): boolean {
    return !!this.medicalHistory && this.medicalHistory.trim().length > 0;
  }

  toPrimitive() {
    return {
      bloodGroup: this.bloodGroup,
      allergies: this.allergies,
      medicalConditions: this.medicalConditions,
      medicalHistory: this.medicalHistory,
    };
  }
}

/**
 * Value Object: InsuranceInfo
 * Encapsulates insurance information
 */
class InsuranceInfo {
  constructor(
    readonly provider?: string,
    readonly number?: string,
  ) {
    if (provider && provider.trim().length > 100) {
      throw new DomainException('Insurance provider must be at most 100 characters');
    }
    if (number && number.trim().length > 100) {
      throw new DomainException('Insurance number must be at most 100 characters');
    }
  }

  hasInsurance(): boolean {
    return !!this.provider && !!this.number;
  }

  toPrimitive() {
    return {
      provider: this.provider,
      number: this.number,
    };
  }
}

/**
 * Value Object: ConsentInfo
 * Encapsulates consent flags - REQUIRED for all submissions
 */
class ConsentInfo {
  constructor(
    readonly privacyConsent: boolean,
    readonly serviceConsent: boolean,
    readonly medicalConsent: boolean,
  ) {
    if (!privacyConsent || !serviceConsent || !medicalConsent) {
      throw new DomainException('All consents are required to submit intake form');
    }
  }

  hasAllConsents(): boolean {
    return this.privacyConsent && this.serviceConsent && this.medicalConsent;
  }

  toPrimitive() {
    return {
      privacyConsent: this.privacyConsent,
      serviceConsent: this.serviceConsent,
      medicalConsent: this.medicalConsent,
    };
  }
}

/**
 * Aggregate Root: IntakeSubmission
 *
 * Represents a patient's filled intake form.
 * Contains all personal, medical, contact, and consent information.
 *
 * Business Rules:
 * - All consent flags must be true
 * - Patient must be at least 16 years old
 * - Required fields: personal info, contact info, emergency contact, all consents
 * - Optional fields: medical info, insurance info
 * - Can be converted to Patient entity when confirmed by frontdesk
 */
export class IntakeSubmission {
  private readonly submissionId: string;
  private readonly sessionId: string;
  private readonly personalInfo: PersonalInfo;
  private readonly contactInfo: ContactInfo;
  private readonly emergencyContact: EmergencyContact;
  private readonly medicalInfo: MedicalInfo;
  private readonly insuranceInfo: InsuranceInfo;
  private readonly consent: ConsentInfo;
  private readonly submittedAt: Date;
  private readonly ipAddress?: string;
  private readonly userAgent?: string;
  private readonly status: SubmissionStatus;

  private constructor(
    submissionId: string,
    sessionId: string,
    personalInfo: PersonalInfo,
    contactInfo: ContactInfo,
    emergencyContact: EmergencyContact,
    medicalInfo: MedicalInfo,
    insuranceInfo: InsuranceInfo,
    consent: ConsentInfo,
    submittedAt: Date,
    ipAddress?: string,
    userAgent?: string,
    status: SubmissionStatus = 'PENDING',
  ) {
    this.submissionId = submissionId;
    this.sessionId = sessionId;
    this.personalInfo = personalInfo;
    this.contactInfo = contactInfo;
    this.emergencyContact = emergencyContact;
    this.medicalInfo = medicalInfo;
    this.insuranceInfo = insuranceInfo;
    this.consent = consent;
    this.submittedAt = submittedAt;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.status = status;
  }

  /**
   * Factory method: Create new intake submission
   *
   * @param params All form data from patient
   * @returns New IntakeSubmission instance
   * @throws DomainException if any validation fails
   */
  static create(params: {
    submissionId: string;
    sessionId: string;
    // Personal
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'MALE' | 'FEMALE';
    // Contact
    email: string;
    phone: string;
    address: string;
    maritalStatus: MaritalStatus;
    occupation?: string;
    whatsappPhone?: string;
    // Emergency Contact
    emergencyContactName: string;
    emergencyContactNumber: string;
    emergencyContactRelation: Relationship;
    // Medical (optional)
    bloodGroup?: BloodGroup;
    allergies?: string;
    medicalConditions?: string;
    medicalHistory?: string;
    // Insurance (optional)
    insuranceProvider?: string;
    insuranceNumber?: string;
    // Consent (required)
    privacyConsent: boolean;
    serviceConsent: boolean;
    medicalConsent: boolean;
    // Audit
    ipAddress?: string;
    userAgent?: string;
  }): IntakeSubmission {
    // Create value objects (which perform validation)
    const personalInfo = new PersonalInfo(
      params.firstName,
      params.lastName,
      params.dateOfBirth,
      params.gender,
    );

    const contactInfo = new ContactInfo(
      Email.create(params.email),
      PhoneNumber.create(params.phone),
      params.address,
      params.maritalStatus,
      params.occupation,
      params.whatsappPhone ? PhoneNumber.create(params.whatsappPhone) : undefined,
    );

    const emergencyContact = new EmergencyContact(
      params.emergencyContactName,
      PhoneNumber.create(params.emergencyContactNumber),
      params.emergencyContactRelation,
    );

    const medicalInfo = new MedicalInfo(
      params.bloodGroup,
      params.allergies,
      params.medicalConditions,
      params.medicalHistory,
    );

    const insuranceInfo = new InsuranceInfo(
      params.insuranceProvider,
      params.insuranceNumber,
    );

    const consent = new ConsentInfo(
      params.privacyConsent,
      params.serviceConsent,
      params.medicalConsent,
    );

    return new IntakeSubmission(
      params.submissionId,
      params.sessionId,
      personalInfo,
      contactInfo,
      emergencyContact,
      medicalInfo,
      insuranceInfo,
      consent,
      new Date(),
      params.ipAddress,
      params.userAgent,
      'PENDING',
    );
  }

  /**
   * Restore IntakeSubmission from persistent storage
   */
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

  /**
   * Convert intake submission to Patient entity
   * Called when frontdesk confirms intake
   *
   * @param fileNumber The unique file number to assign
   * @returns Patient entity ready to be saved
   */
  toPatientEntity(fileNumber: string, id: string): Patient {
    return Patient.create({
      id,
      fileNumber,
      firstName: this.personalInfo.firstName,
      lastName: this.personalInfo.lastName,
      dateOfBirth: this.personalInfo.dateOfBirth,
      gender: this.personalInfo.gender as Gender,
      email: this.contactInfo.email.getValue(),
      phone: this.contactInfo.phone.getValue(),
      address: this.contactInfo.address,
      maritalStatus: this.contactInfo.maritalStatus,
      occupation: this.contactInfo.occupation,
      whatsappPhone: this.contactInfo.whatsappPhone?.getValue(),
      emergencyContactName: this.emergencyContact.name,
      emergencyContactNumber: this.emergencyContact.phoneNumber.getValue(),
      relation: this.emergencyContact.relationship,
      bloodGroup: this.medicalInfo.bloodGroup,
      allergies: this.medicalInfo.allergies,
      medicalConditions: this.medicalInfo.medicalConditions,
      medicalHistory: this.medicalInfo.medicalHistory,
      insuranceProvider: this.insuranceInfo.provider,
      insuranceNumber: this.insuranceInfo.number,
      privacyConsent: this.consent.privacyConsent,
      serviceConsent: this.consent.serviceConsent,
      medicalConsent: this.consent.medicalConsent,
    });
  }

  /**
   * Check if submission is complete and ready to be confirmed
   * Returns a list of missing fields if incomplete
   */
  getIncompleteness(): string[] {
    const missing: string[] = [];

    if (!this.personalInfo.firstName) missing.push('firstName');
    if (!this.personalInfo.lastName) missing.push('lastName');
    if (!this.personalInfo.dateOfBirth) missing.push('dateOfBirth');
    if (!this.contactInfo.email) missing.push('email');
    if (!this.contactInfo.phone) missing.push('phone');
    if (!this.contactInfo.address) missing.push('address');
    if (!this.emergencyContact.name) missing.push('emergencyContactName');
    if (!this.emergencyContact.phoneNumber) missing.push('emergencyContactNumber');

    return missing;
  }

  isComplete(): boolean {
    return this.getIncompleteness().length === 0;
  }

  /**
   * Calculate completeness score (0-100)
   * Based on how many optional fields are filled
   */
  getCompletenessScore(): number {
    let score = 70; // Required fields are 70 points

    if (this.medicalInfo.hasBloodGroup()) score += 5;
    if (this.medicalInfo.hasAllergies()) score += 5;
    if (this.medicalInfo.hasConditions()) score += 5;
    if (this.medicalInfo.hasHistory()) score += 5;
    if (this.insuranceInfo.hasInsurance()) score += 5;

    return Math.min(score, 100);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getSubmissionId(): string {
    return this.submissionId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getPersonalInfo(): PersonalInfo {
    return this.personalInfo;
  }

  getContactInfo(): ContactInfo {
    return this.contactInfo;
  }

  getEmergencyContact(): EmergencyContact {
    return this.emergencyContact;
  }

  getMedicalInfo(): MedicalInfo {
    return this.medicalInfo;
  }

  getInsuranceInfo(): InsuranceInfo {
    return this.insuranceInfo;
  }

  getConsent(): ConsentInfo {
    return this.consent;
  }

  getSubmittedAt(): Date {
    return new Date(this.submittedAt);
  }

  getIpAddress(): string | undefined {
    return this.ipAddress;
  }

  getUserAgent(): string | undefined {
    return this.userAgent;
  }

  getStatus(): SubmissionStatus {
    return this.status;
  }

  /**
   * Serialize to plain object for DTO/API responses
   */
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
