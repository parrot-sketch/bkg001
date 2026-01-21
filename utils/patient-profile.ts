/**
 * Patient Profile Utilities
 * 
 * Utilities for checking patient profile completeness and validation.
 */

import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

/**
 * Check if a patient profile is complete enough to book consultations
 * 
 * Required fields for booking:
 * - Basic info: firstName, lastName, email, phone, dateOfBirth, gender
 * - Contact: address
 * - Emergency: emergencyContactName, emergencyContactNumber, relation
 * - Legal: privacyConsent, serviceConsent, medicalConsent
 * 
 * @param patient - Patient profile data (null if profile doesn't exist)
 * @returns Object with isComplete flag and missing fields list
 */
export function checkProfileCompletenessForBooking(
  patient: PatientResponseDto | null
): {
  isComplete: boolean;
  missingFields: string[];
  missingConsents: string[];
} {
  const missingFields: string[] = [];
  const missingConsents: string[] = [];

  // If no patient profile exists, all fields are missing
  if (!patient) {
    return {
      isComplete: false,
      missingFields: [
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Date of Birth',
        'Gender',
        'Address',
        'Marital Status',
        'Emergency Contact Name',
        'Emergency Contact Phone',
        'Emergency Contact Relationship',
      ],
      missingConsents: ['Privacy Consent', 'Service Consent', 'Medical Consent'],
    };
  }

  // Check basic information
  if (!patient.firstName?.trim()) missingFields.push('First Name');
  if (!patient.lastName?.trim()) missingFields.push('Last Name');
  if (!patient.email?.trim()) missingFields.push('Email');
  if (!patient.phone?.trim()) missingFields.push('Phone');
  if (!patient.dateOfBirth) missingFields.push('Date of Birth');
  if (!patient.gender?.trim()) missingFields.push('Gender');
  if (!patient.address?.trim()) missingFields.push('Address');
  if (!patient.maritalStatus?.trim()) missingFields.push('Marital Status');

  // Check emergency contact
  if (!patient.emergencyContactName?.trim()) missingFields.push('Emergency Contact Name');
  if (!patient.emergencyContactNumber?.trim()) missingFields.push('Emergency Contact Phone');
  if (!patient.relation?.trim()) missingFields.push('Emergency Contact Relationship');

  // Check consents
  if (!patient.hasPrivacyConsent) missingConsents.push('Privacy Consent');
  if (!patient.hasServiceConsent) missingConsents.push('Service Consent');
  if (!patient.hasMedicalConsent) missingConsents.push('Medical Consent');

  const isComplete = missingFields.length === 0 && missingConsents.length === 0;

  return {
    isComplete,
    missingFields,
    missingConsents,
  };
}

/**
 * Get a user-friendly message explaining what's missing from the profile
 */
export function getProfileIncompleteMessage(
  missingFields: string[],
  missingConsents: string[]
): string {
  const allMissing = [...missingFields, ...missingConsents];
  
  if (allMissing.length === 0) {
    return 'Your profile is complete.';
  }

  if (allMissing.length === 1) {
    return `Please complete your profile: ${allMissing[0]} is required to book consultations.`;
  }

  if (allMissing.length <= 3) {
    return `Please complete your profile: ${allMissing.slice(0, -1).join(', ')} and ${allMissing[allMissing.length - 1]} are required to book consultations.`;
  }

  return `Please complete your profile. ${allMissing.length} required fields are missing.`;
}

/**
 * Calculate profile completion percentage
 * 
 * @param patient - Patient profile data (null if profile doesn't exist)
 * @returns Completion percentage (0-100) and missing fields
 */
export function calculateProfileCompletion(
  patient: PatientResponseDto | null
): {
  percentage: number;
  missingFields: string[];
  missingConsents: string[];
  isComplete: boolean;
} {
  const { isComplete, missingFields, missingConsents } = checkProfileCompletenessForBooking(patient);
  
  // Total required fields: 11 fields + 3 consents = 14 total
  const totalRequired = 14;
  const completed = totalRequired - missingFields.length - missingConsents.length;
  const percentage = Math.round((completed / totalRequired) * 100);
  
  return {
    percentage,
    missingFields,
    missingConsents,
    isComplete,
  };
}
