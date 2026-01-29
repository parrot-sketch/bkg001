/**
 * DTO: CheckDoubleBookingDto
 * 
 * Data transfer object for checking if a slot is available.
 * Used by CheckDoubleBookingUseCase.
 */
export interface CheckDoubleBookingDto {
  doctorId: string;
  appointmentDate: Date;
  time: string;
  durationMinutes?: number; // Duration in minutes (default: 30)
}

/**
 * Response DTO for double-booking check
 */
export interface DoubleBookingCheckResponseDto {
  isAvailable: boolean; // true if slot is available, false if conflicts exist
  conflicts: ConflictingAppointmentDto[];
  message: string; // Human-readable message
}

export interface ConflictingAppointmentDto {
  appointmentId: number;
  patientId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  duration: number; // In minutes
}
