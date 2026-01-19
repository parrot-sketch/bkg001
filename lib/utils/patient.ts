/**
 * Patient Utilities
 * 
 * Utility functions for checking patient status and lifecycle.
 */

import { patientApi } from '../api/patient';

/**
 * Checks if a user has an associated PatientProfile
 * 
 * @param userId - User ID to check
 * @returns Promise resolving to true if user has PatientProfile, false otherwise
 */
export async function hasPatientProfile(userId: string): Promise<boolean> {
  try {
    const response = await patientApi.getPatient(userId);
    return response.success && !!response.data;
  } catch {
    // If API call fails or returns error, user doesn't have PatientProfile
    return false;
  }
}

/**
 * Determines the appropriate redirect path after login/registration
 * 
 * - If user has PatientProfile → /patient/dashboard (clinical portal)
 * - If user doesn't have PatientProfile → /portal/welcome (client onboarding)
 * 
 * @param userId - User ID to check
 * @returns Promise resolving to redirect path
 */
export async function getPostAuthRedirect(userId: string): Promise<string> {
  const hasProfile = await hasPatientProfile(userId);
  return hasProfile ? '/patient/dashboard' : '/portal/welcome';
}
