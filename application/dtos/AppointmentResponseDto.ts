/**
 * DTO: AppointmentResponseDto
 * 
 * Data Transfer Object for appointment response data.
 * This DTO represents the output data from appointment-related use cases.
 */
import { ConsultationRequestStatus } from '../../domain/enums/ConsultationRequestStatus';

export interface AppointmentResponseDto {
  readonly id: number;
  readonly patientId: string;
  readonly doctorId: string;
  readonly appointmentDate: Date;
  readonly time: string;
  readonly status: string;
  readonly type: string;
  readonly note?: string;
  readonly reason?: string;
  
  // Consultation Request Workflow fields (optional for backward compatibility)
  readonly consultationRequestStatus?: ConsultationRequestStatus;
  readonly reviewedBy?: string;
  readonly reviewedAt?: Date;
  readonly reviewNotes?: string;
  
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}
