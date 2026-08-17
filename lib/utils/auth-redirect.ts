/**
 * Authentication Redirect Utilities
 * 
 * Determines the appropriate redirect path after login based on user role and status.
 * Handles role-based routing for all user types (Patient, Doctor, Frontdesk, Admin, etc.)
 */

import { patientApi } from '../api/patient';

/**
 * User roles from the system
 */
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  FRONTDESK = 'FRONTDESK',
  ADMIN = 'ADMIN',
  NURSE = 'NURSE',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  CASHIER = 'CASHIER',
  THEATER_TECHNICIAN = 'THEATER_TECHNICIAN',
  STORES = 'STORES',
}

/**
 * Determines the appropriate redirect path after login/registration
 * 
 * Role-based routing:
 * - DOCTOR → /doctor/dashboard (dashboard handles onboarding checks)
 * - PATIENT:
 *   - If has PatientProfile → /patient/dashboard
 *   - If no PatientProfile → /portal/welcome (onboarding)
 * - FRONTDESK → /frontdesk/dashboard
 * - ADMIN → /admin/dashboard
 * - NURSE → /nurse/dashboard
 * - Others → / (homepage)
 * 
 * @param userId - User ID to check
 * @param userRole - User's role from auth token
 * @returns Promise resolving to redirect path
 */
export async function getPostAuthRedirect(
  userId: string,
  userRole?: string
): Promise<string> {
  // If no role provided, try to infer from user data
  if (!userRole) {
    // Try to get role from stored user (if available)
    try {
      const { tokenStorage } = await import('../auth/token');
      const storedUser = tokenStorage.getUser();
      userRole = storedUser?.role;
    } catch {
      // If we can't get role, fall back to patient check
      return getPatientRedirect(userId);
    }
  }

  // Route based on role
  switch (userRole?.toUpperCase()) {
    case UserRole.DOCTOR:
      return '/doctor/dashboard';

    case UserRole.PATIENT:
      return getPatientRedirect(userId);

    case UserRole.FRONTDESK:
      return '/frontdesk/dashboard';

    case UserRole.ADMIN:
      return '/admin/dashboard';

    case UserRole.NURSE:
      return '/nurse/dashboard';

    case UserRole.LAB_TECHNICIAN:
      return '/nurse/dashboard'; // Lab techs use nurse dashboard

    case UserRole.CASHIER:
      return '/admin/dashboard'; // Cashiers use admin dashboard

    case UserRole.THEATER_TECHNICIAN:
      return '/theater-tech/dashboard';

    case UserRole.STORES:
      return '/admin/inventory';

    default:
      // Unknown role - try patient check as fallback
      return getPatientRedirect(userId);
  }
}

/**
 * Determines patient redirect path based on PatientProfile existence
 * 
 * - Has PatientProfile → /patient/dashboard (clinical portal)
 * - No PatientProfile → /portal/welcome (client onboarding)
 * 
 * @param userId - Patient's user ID
 * @returns Promise resolving to redirect path
 */
async function getPatientRedirect(userId: string): Promise<string> {
  try {
    const response = await patientApi.getPatient(userId);
    return response.success && response.data 
      ? '/patient/dashboard' 
      : '/portal/welcome';
  } catch {
    // If API call fails, default to welcome page (onboarding)
    return '/portal/welcome';
  }
}
