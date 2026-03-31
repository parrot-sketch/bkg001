export interface CreatePatientDto {
  readonly id?: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: Date | string;
  readonly gender: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappPhone?: string;
  readonly address?: string;
  readonly occupation?: string;
  readonly maritalStatus?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactNumber?: string;
  readonly relation?: string;
  readonly privacyConsent?: boolean;
  readonly serviceConsent?: boolean;
  readonly medicalConsent?: boolean;
  readonly bloodGroup?: string;
  readonly allergies?: string;
  readonly medicalConditions?: string;
  readonly medicalHistory?: string;
  readonly insuranceProvider?: string;
  readonly insuranceNumber?: string;
}
