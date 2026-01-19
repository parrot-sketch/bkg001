/**
 * DTO: CreatePatientDto
 * 
 * Data Transfer Object for creating a new patient.
 * This DTO represents the input data for the CreatePatientUseCase.
 * 
 * All fields are plain types (no domain objects) for easy serialization
 * and validation at the application boundary.
 */
export interface CreatePatientDto {
  /**
   * Patient's unique identifier (usually from authentication system)
   */
  readonly id: string;

  /**
   * Patient's first name
   */
  readonly firstName: string;

  /**
   * Patient's last name
   */
  readonly lastName: string;

  /**
   * Patient's date of birth
   * Can be a Date object or ISO date string (when deserialized from JSON)
   */
  readonly dateOfBirth: Date | string;

  /**
   * Patient's gender (as string - will be validated against Gender enum)
   */
  readonly gender: string;

  /**
   * Patient's email address
   */
  readonly email: string;

  /**
   * Patient's phone number
   */
  readonly phone: string;

  /**
   * Optional: Patient's WhatsApp phone number
   */
  readonly whatsappPhone?: string;

  /**
   * Patient's address
   */
  readonly address: string;

  /**
   * Optional: Patient's occupation
   */
  readonly occupation?: string;

  /**
   * Patient's marital status
   */
  readonly maritalStatus: string;

  /**
   * Emergency contact name
   */
  readonly emergencyContactName: string;

  /**
   * Emergency contact phone number
   */
  readonly emergencyContactNumber: string;

  /**
   * Relationship to emergency contact
   */
  readonly relation: string;

  /**
   * Privacy consent flag
   */
  readonly privacyConsent: boolean;

  /**
   * Service consent flag
   */
  readonly serviceConsent: boolean;

  /**
   * Medical consent flag
   */
  readonly medicalConsent: boolean;

  /**
   * Optional: Patient's blood group
   */
  readonly bloodGroup?: string;

  /**
   * Optional: Known allergies
   */
  readonly allergies?: string;

  /**
   * Optional: Medical conditions
   */
  readonly medicalConditions?: string;

  /**
   * Optional: Medical history
   */
  readonly medicalHistory?: string;

  /**
   * Optional: Insurance provider
   */
  readonly insuranceProvider?: string;

  /**
   * Optional: Insurance policy number
   */
  readonly insuranceNumber?: string;
}
