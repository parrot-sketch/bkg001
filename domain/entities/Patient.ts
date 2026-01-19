import { Email } from '../value-objects/Email';
import { PhoneNumber } from '../value-objects/PhoneNumber';
import { Gender } from '../enums/Gender';
import { DomainException } from '../exceptions/DomainException';

/**
 * Entity: Patient
 * 
 * Represents a patient in the healthcare system.
 * This is a rich domain entity with business logic encapsulated.
 * 
 * Business Rules:
 * - Patient must have a valid ID (immutable once set)
 * - Patient must have first name and last name
 * - Patient must have a valid date of birth
 * - Patient must have valid contact information (email, phone)
 * - Patient age can be calculated from date of birth
 * 
 * Note: This entity does not depend on Prisma or any framework.
 * It represents the pure domain concept of a Patient.
 */
export class Patient {
  private constructor(
    private readonly id: string,
    private readonly fileNumber: string, // System-generated: NS001, NS002, etc.
    private readonly firstName: string,
    private readonly lastName: string,
    private readonly dateOfBirth: Date,
    private readonly gender: Gender,
    private readonly email: Email,
    private readonly phone: PhoneNumber,
    private readonly address: string,
    private readonly maritalStatus: string,
    private readonly emergencyContactName: string,
    private readonly emergencyContactNumber: PhoneNumber,
    private readonly relation: string,
    private readonly privacyConsent: boolean,
    private readonly serviceConsent: boolean,
    private readonly medicalConsent: boolean,
    // Optional fields
    private readonly whatsappPhone?: string, // Optional WhatsApp contact
    private readonly occupation?: string, // Optional occupation
    private readonly bloodGroup?: string,
    private readonly allergies?: string,
    private readonly medicalConditions?: string,
    private readonly medicalHistory?: string,
    private readonly insuranceProvider?: string,
    private readonly insuranceNumber?: string,
    private readonly img?: string,
    private readonly colorCode?: string,
    // Timestamps (set by infrastructure)
    private readonly createdAt?: Date,
    private readonly updatedAt?: Date,
  ) {
    // Validation happens in factory method
  }

  /**
   * Creates a new Patient entity
   * 
   * @param params - Patient creation parameters
   * @returns Patient entity
   * @throws DomainException if validation fails
   */
  static create(params: {
    id: string;
    fileNumber: string; // System-generated: NS001, NS002, etc.
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: Gender;
    email: string | Email;
    phone: string | PhoneNumber;
    whatsappPhone?: string;
    address: string;
    occupation?: string;
    maritalStatus: string;
    emergencyContactName: string;
    emergencyContactNumber: string | PhoneNumber;
    relation: string;
    privacyConsent: boolean;
    serviceConsent: boolean;
    medicalConsent: boolean;
    bloodGroup?: string;
    allergies?: string;
    medicalConditions?: string;
    medicalHistory?: string;
    insuranceProvider?: string;
    insuranceNumber?: string;
    img?: string;
    colorCode?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Patient {
    // Validate required fields
    if (!params.id || typeof params.id !== 'string' || params.id.trim().length === 0) {
      throw new DomainException('Patient ID cannot be empty', {
        providedValue: params.id,
      });
    }

    // Validate file number format (NS001, NS002, etc.)
    if (!params.fileNumber || typeof params.fileNumber !== 'string' || params.fileNumber.trim().length === 0) {
      throw new DomainException('Patient file number cannot be empty', {
        providedValue: params.fileNumber,
      });
    }

    // Validate file number format: NS followed by digits
    const fileNumberPattern = /^NS\d+$/;
    if (!fileNumberPattern.test(params.fileNumber)) {
      throw new DomainException(`Invalid file number format: ${params.fileNumber}. Expected format: NS001, NS002, etc.`, {
        providedValue: params.fileNumber,
      });
    }

    if (!params.firstName || typeof params.firstName !== 'string' || params.firstName.trim().length === 0) {
      throw new DomainException('Patient first name cannot be empty', {
        providedValue: params.firstName,
      });
    }

    if (!params.lastName || typeof params.lastName !== 'string' || params.lastName.trim().length === 0) {
      throw new DomainException('Patient last name cannot be empty', {
        providedValue: params.lastName,
      });
    }

    if (!params.dateOfBirth || !(params.dateOfBirth instanceof Date)) {
      throw new DomainException('Patient date of birth must be a valid Date', {
        providedValue: params.dateOfBirth,
      });
    }

    // Validate date of birth is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dob = new Date(params.dateOfBirth);
    dob.setHours(0, 0, 0, 0);

    if (dob > today) {
      throw new DomainException('Patient date of birth cannot be in the future', {
        providedValue: params.dateOfBirth,
      });
    }

    // Validate date of birth is reasonable (not more than 150 years ago)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    if (dob < minDate) {
      throw new DomainException('Patient date of birth is too far in the past', {
        providedValue: params.dateOfBirth,
      });
    }

    if (!params.address || typeof params.address !== 'string' || params.address.trim().length === 0) {
      throw new DomainException('Patient address cannot be empty', {
        providedValue: params.address,
      });
    }

    if (!params.maritalStatus || typeof params.maritalStatus !== 'string' || params.maritalStatus.trim().length === 0) {
      throw new DomainException('Patient marital status cannot be empty', {
        providedValue: params.maritalStatus,
      });
    }

    if (!params.emergencyContactName || typeof params.emergencyContactName !== 'string' || params.emergencyContactName.trim().length === 0) {
      throw new DomainException('Emergency contact name cannot be empty', {
        providedValue: params.emergencyContactName,
      });
    }

    if (!params.relation || typeof params.relation !== 'string' || params.relation.trim().length === 0) {
      throw new DomainException('Emergency contact relation cannot be empty', {
        providedValue: params.relation,
      });
    }

    // Convert string values to value objects if needed
    const email = params.email instanceof Email ? params.email : Email.create(params.email);
    const phone = params.phone instanceof PhoneNumber ? params.phone : PhoneNumber.create(params.phone);
    const emergencyContactNumber =
      params.emergencyContactNumber instanceof PhoneNumber
        ? params.emergencyContactNumber
        : PhoneNumber.create(params.emergencyContactNumber);

    return new Patient(
      params.id.trim(),
      params.fileNumber.trim(), // System-generated: NS001, NS002, etc.
      params.firstName.trim(),
      params.lastName.trim(),
      dob,
      params.gender,
      email,
      phone,
      params.address.trim(),
      params.maritalStatus.trim(),
      params.emergencyContactName.trim(),
      emergencyContactNumber,
      params.relation.trim(),
      params.privacyConsent,
      params.serviceConsent,
      params.medicalConsent,
      params.whatsappPhone?.trim(),
      params.occupation?.trim(),
      params.bloodGroup?.trim(),
      params.allergies?.trim(),
      params.medicalConditions?.trim(),
      params.medicalHistory?.trim(),
      params.insuranceProvider?.trim(),
      params.insuranceNumber?.trim(),
      params.img?.trim(),
      params.colorCode?.trim(),
      params.createdAt,
      params.updatedAt,
    );
  }

  // Getters

  getId(): string {
    return this.id;
  }

  getFileNumber(): string {
    return this.fileNumber;
  }

  getFirstName(): string {
    return this.firstName;
  }

  getLastName(): string {
    return this.lastName;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  getDateOfBirth(): Date {
    return new Date(this.dateOfBirth); // Return a copy to maintain immutability
  }

  getGender(): Gender {
    return this.gender;
  }

  getEmail(): Email {
    return this.email;
  }

  getPhone(): PhoneNumber {
    return this.phone;
  }

  getWhatsappPhone(): string | undefined {
    return this.whatsappPhone;
  }

  getAddress(): string {
    return this.address;
  }

  getOccupation(): string | undefined {
    return this.occupation;
  }

  getMaritalStatus(): string {
    return this.maritalStatus;
  }

  getEmergencyContactName(): string {
    return this.emergencyContactName;
  }

  getEmergencyContactNumber(): PhoneNumber {
    return this.emergencyContactNumber;
  }

  getRelation(): string {
    return this.relation;
  }

  hasPrivacyConsent(): boolean {
    return this.privacyConsent;
  }

  hasServiceConsent(): boolean {
    return this.serviceConsent;
  }

  hasMedicalConsent(): boolean {
    return this.medicalConsent;
  }

  getBloodGroup(): string | undefined {
    return this.bloodGroup;
  }

  getAllergies(): string | undefined {
    return this.allergies;
  }

  getMedicalConditions(): string | undefined {
    return this.medicalConditions;
  }

  getMedicalHistory(): string | undefined {
    return this.medicalHistory;
  }

  getInsuranceProvider(): string | undefined {
    return this.insuranceProvider;
  }

  getInsuranceNumber(): string | undefined {
    return this.insuranceNumber;
  }

  getImg(): string | undefined {
    return this.img;
  }

  getColorCode(): string | undefined {
    return this.colorCode;
  }

  getCreatedAt(): Date | undefined {
    return this.createdAt ? new Date(this.createdAt) : undefined;
  }

  getUpdatedAt(): Date | undefined {
    return this.updatedAt ? new Date(this.updatedAt) : undefined;
  }

  // Business logic methods

  /**
   * Calculates the patient's age in years
   * 
   * @returns Age in years
   */
  getAge(): number {
    const today = new Date();
    let age = today.getFullYear() - this.dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Calculates the patient's age in months (useful for infants)
   * 
   * @returns Age in months
   */
  getAgeInMonths(): number {
    const today = new Date();
    const yearDiff = today.getFullYear() - this.dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
    const dayDiff = today.getDate() - this.dateOfBirth.getDate();

    let totalMonths = yearDiff * 12 + monthDiff;

    // If birthday hasn't occurred this month, subtract one month
    if (dayDiff < 0) {
      totalMonths--;
    }

    return totalMonths;
  }

  /**
   * Checks if the patient is a minor (under 18 years old)
   * 
   * @returns true if patient is a minor
   */
  isMinor(): boolean {
    return this.getAge() < 18;
  }

  /**
   * Checks if the patient has provided all required consents
   * 
   * @returns true if all consents are provided
   */
  hasAllConsents(): boolean {
    return this.privacyConsent && this.serviceConsent && this.medicalConsent;
  }

  /**
   * Checks if the patient has insurance information
   * 
   * @returns true if insurance provider and number are present
   */
  hasInsurance(): boolean {
    return !!(this.insuranceProvider && this.insuranceNumber);
  }

  /**
   * Checks equality with another Patient entity
   * 
   * @param other - Another Patient entity
   * @returns true if patients have the same ID
   */
  equals(other: Patient | null | undefined): boolean {
    if (!other) {
      return false;
    }
    // Entities are equal if they have the same ID
    return this.id === other.id;
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    return `Patient(id=${this.id}, name=${this.getFullName()}, email=${this.email.getValue()})`;
  }
}
