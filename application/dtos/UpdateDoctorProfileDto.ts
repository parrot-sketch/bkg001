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
}
