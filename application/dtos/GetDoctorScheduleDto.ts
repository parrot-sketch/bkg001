/**
 * DTO: GetDoctorScheduleDto
 * 
 * Data transfer object for querying doctor's schedule.
 * Used by GetDoctorScheduleUseCase.
 */
export interface GetDoctorScheduleDto {
  doctorId: string;
  fromDate: Date;
  toDate: Date;
  includeBreaks?: boolean; // Include schedule blocks/breaks (default: true)
}

/**
 * Response DTO for doctor schedule query
 */
export interface DoctorScheduleItemDto {
  id: number;
  type: 'appointment' | 'break'; // Type of schedule item
  appointmentId?: number;
  patientId?: string;
  startTime: Date;
  endTime: Date;
  status?: string; // Appointment status (SCHEDULED, COMPLETED, etc)
  title?: string; // For breaks: "Break", "Lunch", etc
  notes?: string;
}

export interface DoctorScheduleResponseDto {
  doctorId: string;
  fromDate: Date;
  toDate: Date;
  items: DoctorScheduleItemDto[];
  totalWorkingHours: number;
  totalBookedHours: number;
  utilizationPercentage: number;
}
