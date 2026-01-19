/**
 * DTO: PatientResponseDto
 * 
 * Data Transfer Object for patient response data.
 * This DTO represents the output data from patient-related use cases.
 * 
 * Contains only the data needed by the calling layer (interface/UI),
 * not the full domain entity.
 */
export interface PatientResponseDto {
  readonly id: string;
  readonly fileNumber: string; // System-generated: NS001, NS002, etc.
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly dateOfBirth: Date;
  readonly age: number;
  readonly gender: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappPhone?: string;
  readonly address: string;
  readonly occupation?: string;
  readonly maritalStatus: string;
  readonly emergencyContactName: string;
  readonly emergencyContactNumber: string;
  readonly relation: string;
  readonly hasPrivacyConsent: boolean;
  readonly hasServiceConsent: boolean;
  readonly hasMedicalConsent: boolean;
  readonly bloodGroup?: string;
  readonly allergies?: string;
  readonly medicalConditions?: string;
  readonly medicalHistory?: string;
  readonly insuranceProvider?: string;
  readonly insuranceNumber?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
