/**
 * DTO: DoctorResponseDto
 * 
 * Data Transfer Object for doctor response data.
 * This DTO represents the output data from doctor-related use cases.
 */
export interface DoctorResponseDto {
  readonly id: string;
  readonly userId?: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly title?: string;
  readonly name: string;
  readonly specialization: string;
  readonly slug?: string;
  readonly licenseNumber: string;
  readonly phone: string;
  readonly address: string;
  readonly clinicLocation?: string;
  readonly department?: string;
  readonly profileImage?: string;
  readonly availabilityStatus?: string;
  readonly bio?: string;
  readonly education?: string;
  readonly focusAreas?: string;
  readonly professionalAffiliations?: string;
  readonly yearsOfExperience?: number;
  readonly consultationFee?: number;
  readonly languages?: string;
  readonly colorCode?: string;
  readonly onboardingStatus?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
