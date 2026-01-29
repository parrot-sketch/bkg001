import { AppointmentStatus } from '../../domain/enums/AppointmentStatus';

/**
 * DTO: GetPendingAppointmentsDto
 * 
 * Data transfer object for querying pending appointments.
 * Used by GetPendingAppointmentsUseCase.
 */
export interface GetPendingAppointmentsDto {
  doctorId?: string; // Filter by doctor ID (optional)
  patientId?: string; // Filter by patient ID (optional)
  status?: AppointmentStatus; // Filter by specific status (optional)
  fromDate?: Date; // Filter from date (optional)
  toDate?: Date; // Filter to date (optional)
}

/**
 * Response DTO for pending appointments query
 */
export interface PendingAppointmentsResponseDto {
  appointmentId: number;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  time: string;
  status: AppointmentStatus;
  type: string;
  reason?: string;
  durationMinutes?: number;
  createdAt?: Date;
  statusChangedAt?: Date;
  doctorConfirmedAt?: Date;
}
