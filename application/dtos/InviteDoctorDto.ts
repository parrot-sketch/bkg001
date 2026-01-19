/**
 * DTO: InviteDoctorDto
 * 
 * Data Transfer Object for inviting a doctor to the system.
 * Used when an admin/frontdesk invites a doctor (non-self-registration).
 */

export interface InviteDoctorDto {
  email: string;
  firstName: string;
  lastName: string;
  specialization: string;
  licenseNumber: string;
  phone: string;
  // Optional fields
  title?: string; // Dr., Prof., etc.
  address?: string;
  clinicLocation?: string;
  department?: string;
}

/**
 * DTO: InviteDoctorResponseDto
 * 
 * Response DTO after successfully creating a doctor invite.
 */
export interface InviteDoctorResponseDto {
  inviteTokenId: string;
  email: string;
  inviteToken: string; // Secure token for activation link
  expiresAt: Date;
  invitationUrl: string; // Full activation URL (for email)
}

/**
 * DTO: ActivateDoctorInviteDto
 * 
 * Data Transfer Object for activating a doctor invitation via token.
 */
export interface ActivateDoctorInviteDto {
  token: string;
  password: string; // Doctor sets their password during activation
  firstName?: string; // Optional: Can update name during activation
  lastName?: string;
}

/**
 * DTO: ActivateDoctorInviteResponseDto
 * 
 * Response DTO after successfully activating a doctor invite.
 */
export interface ActivateDoctorInviteResponseDto {
  userId: string;
  doctorId: string;
  email: string;
  onboardingStatus: string; // Should be "ACTIVATED" after activation
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
