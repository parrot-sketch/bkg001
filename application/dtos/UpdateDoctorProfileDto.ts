/**
 * DTO: UpdateDoctorProfileDto
 * 
 * Data Transfer Object for updating a doctor's profile.
 */
export interface UpdateDoctorProfileDto {
  /**
   * Doctor ID
   */
  readonly doctorId: string;

  /**
   * Optional specialization
   */
  readonly specialization?: string;

  /**
   * Optional title (Dr., Prof., etc.)
   */
  readonly title?: string;

  /**
   * Optional bio
   */
  readonly bio?: string;

  /**
   * Optional education background
   */
  readonly education?: string;

  /**
   * Optional focus areas
   */
  readonly focusAreas?: string;

  /**
   * Optional professional affiliations
   */
  readonly professionalAffiliations?: string;

  /**
   * Optional profile image URL
   */
  readonly profileImage?: string;

  /**
   * Optional clinic location
   */
  readonly clinicLocation?: string;

  /**
   * Optional years of experience
   */
  readonly yearsOfExperience?: number;

  /**
   * Optional consultation fee
   */
  readonly consultationFee?: number;

  /**
   * Optional languages spoken
   */
  readonly languages?: string;
}
