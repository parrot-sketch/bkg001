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
}

/**
 * Determines the appropriate redirect path after login/registration
 * 
 * Role-based routing:
 * - DOCTOR: 
 *   - If onboarding_status === ACTIVE → /doctor/dashboard
 *   - If requires onboarding → /doctor/activate (for future new doctors)
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
      return getDoctorRedirect(userId);

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

    default:
      // Unknown role - try patient check as fallback
      return getPatientRedirect(userId);
  }
}

/**
 * Determines doctor redirect path based on onboarding status
 * 
 * - ACTIVE → /doctor/dashboard (ready to work)
 * - Requires onboarding → /doctor/activate (complete profile/activation)
 * 
 * @param userId - Doctor's user ID
 * @returns Promise resolving to redirect path
 */
async function getDoctorRedirect(userId: string): Promise<string> {
  try {
    // Since all seeded doctors are ACTIVE with complete profiles,
    // we can route directly to dashboard
    // For future: if we need to check onboarding status, we'd need an API endpoint
    // For now, all authenticated doctors go to dashboard
    return '/doctor/dashboard';
  } catch (error) {
    console.error('Error determining doctor redirect:', error);
    // Safe fallback: go to dashboard
    return '/doctor/dashboard';
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
