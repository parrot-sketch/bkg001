/**
 * DTO: UpdateDoctorAvailabilityDto
 * 
 * Data Transfer Object for updating a doctor's availability (working days/hours).
 */
export interface WorkingDayDto {
  /**
   * Day of week (Monday, Tuesday, etc.)
   */
  readonly day: string;

  /**
   * Start time (HH:mm format)
   */
  readonly startTime: string;

  /**
   * End time (HH:mm format)
   */
  readonly endTime: string;
}

export interface UpdateDoctorAvailabilityDto {
  /**
   * Doctor ID
   */
  readonly doctorId: string;

  /**
   * Array of working days
   */
  readonly workingDays: WorkingDayDto[];
}
