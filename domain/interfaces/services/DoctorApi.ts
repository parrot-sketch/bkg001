/**
 * Domain Interface — DoctorApi
 *
 * Port (interface) for doctor and appointment data retrieval used by the
 * Consultation bounded context.
 *
 * This interface defines the business operations available from the
 * Doctor bounded context's external API surface.
 *
 * Implementations live in the Infrastructure layer (e.g., `HttpDoctorApi`).
 * Upper layers (Application, Presentation) must depend on this interface,
 * never on a concrete HTTP adapter.
 *
 * **Dependency direction:**
 * - Allowed: Application → DoctorApi
 * - Forbidden: DoctorApi → Application/Presentation/Infrastructure
 */

import type {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import type { AppointmentResponse, PatientResponse } from '@/domain/interfaces/services/PatientApi';

export interface DoctorResponse {
  readonly id: string;
  readonly userId?: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly name: string;
  readonly specialization: string;
}

export interface VitalsResponse {
  readonly id: number;
  readonly appointmentId: number;
  readonly bodyTemperature?: number;
  readonly systolic?: number;
  readonly diastolic?: number;
  readonly heartRate?: string;
  readonly respiratoryRate?: number;
  readonly oxygenSaturation?: number;
  readonly weight?: number;
  readonly height?: number;
  readonly recordedAt: string;
  readonly recordedBy?: string;
}

/**
 * Successful operation result.
 */
export interface DoctorSuccess<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * Failed operation result.
 */
export interface DoctorFailure {
  readonly success: false;
  readonly error: ClinicalError;
}

/**
 * Discriminated union for all DoctorApi outcomes.
 */
export type DoctorOutcome<T> = DoctorSuccess<T> | DoctorFailure;

export interface StartConsultationParams {
  readonly appointmentId: number;
  readonly doctorId: string;
  readonly userId: string;
}

export interface CompleteConsultationParams {
  readonly appointmentId: number;
  readonly doctorId: string;
}

/**
 * DoctorApi — persistence boundary for doctor and appointment data.
 *
 * Business operations:
 * - Load appointment details.
 * - Load doctor profile.
 * - Load patient details.
 * - Start a consultation.
 * - Complete a consultation.
 * - Load patient vitals.
 *
 * Implementations MUST:
 * - Return `DoctorFailure` with a `ClinicalError` instead of throwing.
 * - Preserve the request/response contracts of the backend.
 * - Map transport/HTTP failures to `ClinicalErrorCode` values.
 *
 * Implementations MUST NOT:
 * - Expose HTTP details (URLs, status codes, headers) through this interface.
 * - Leak framework types (fetch, Request, Response) to consumers.
 */
export interface DoctorApi {
  getAppointment(appointmentId: number): Promise<DoctorOutcome<AppointmentResponse>>;
  getDoctorByUserId(userId: string): Promise<DoctorOutcome<DoctorResponse>>;
  getPatient(patientId: string): Promise<DoctorOutcome<PatientResponse>>;
  getPatientVitals(patientId: string, appointmentId: number): Promise<DoctorOutcome<VitalsResponse[]>>;
  startConsultation(dto: StartConsultationParams): Promise<DoctorOutcome<AppointmentResponse>>;
  completeConsultation(dto: CompleteConsultationParams): Promise<DoctorOutcome<AppointmentResponse>>;
}
