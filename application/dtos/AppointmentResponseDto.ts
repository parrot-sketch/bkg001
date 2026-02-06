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

  // Audit / Context fields
  readonly bookedBy?: {
    readonly id: string;
    readonly name: string;
    readonly role: string;
  };

  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  // Check-in tracking
  readonly checkedInAt?: Date;
  readonly checkedInBy?: string; // User ID of frontdesk staff who checked in the patient

  // Consultation tracking
  readonly consultationStartedAt?: Date;
  readonly consultationEndedAt?: Date;
  readonly consultationDuration?: number; // Duration in minutes

  // Optional patient information (included in some API responses)
  readonly patient?: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email?: string;
    readonly phone?: string;
    readonly fileNumber?: string;
    readonly img?: string | null;
    readonly dateOfBirth?: string | Date;
    readonly gender?: string;
    readonly allergies?: string;
  };

  // Optional doctor information (included in some API responses)
  readonly doctor?: {
    readonly id: string;
    readonly name: string;
    readonly specialization?: string;
  };
}
