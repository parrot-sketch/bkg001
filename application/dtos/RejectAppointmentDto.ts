/**
 * DTO: RejectAppointmentDto
 * 
 * Data transfer object for rejecting an appointment.
 * Used by RejectAppointmentUseCase.
 */
export interface RejectAppointmentDto {
  appointmentId: number;
  reason: string; // Reason for rejection
  reasonCategory?: 'DOCTOR_UNAVAILABLE' | 'SCHEDULING_CONFLICT' | 'PATIENT_UNSUITABLE' | 'MEDICAL_REASON' | 'ADMINISTRATIVE_REASON' | 'OTHER';
  notes?: string; // Additional notes
}
