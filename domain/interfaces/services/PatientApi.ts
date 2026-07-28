/**
 * Domain Interface — PatientApi
 *
 * Port (interface) for patient data retrieval used by the Consultation
 * bounded context and adjacent patient services.
 *
 * This interface defines the business operations available from the
 * Patient bounded context's external API surface.
 *
 * Implementations live in the Infrastructure layer (e.g., `HttpPatientApi`).
 * Upper layers (Application, Presentation) must depend on this interface,
 * never on a concrete HTTP adapter.
 *
 * **Dependency direction:**
 * - Allowed: Application → PatientApi
 * - Forbidden: PatientApi → Application/Presentation/Infrastructure
 */

import type {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';

export interface PatientResponse {
  readonly id: string;
  readonly fileNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly dateOfBirth: Date;
  readonly age: number;
  readonly gender: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappPhone?: string;
  readonly address?: string;
  readonly occupation?: string;
  readonly maritalStatus?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactNumber?: string;
  readonly relation?: string;
  readonly hasPrivacyConsent: boolean;
  readonly hasServiceConsent: boolean;
  readonly hasMedicalConsent: boolean;
  readonly bloodGroup?: string;
  readonly allergies?: string;
  readonly medicalConditions?: string;
  readonly medicalHistory?: string;
  readonly insuranceProvider?: string;
  readonly insuranceNumber?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly profileImage?: string;
  readonly colorCode?: string;
  readonly lastVisitDate?: Date;
  readonly assignedAt?: Date | null;
  readonly visitCount?: number;
}

export interface AppointmentResponse {
  readonly id: number;
  readonly patientId: string;
  readonly doctorId: string;
  readonly appointmentDate: Date;
  readonly time: string;
  readonly status: string;
  readonly type: string;
  readonly note?: string;
  readonly reason?: string;
  readonly consultationRequestStatus?: string;
  readonly reviewedBy?: string;
  readonly reviewedAt?: Date;
  readonly reviewNotes?: string;
  readonly bookedBy?: {
    readonly id: string;
    readonly name: string;
    readonly role: string;
  };
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly checkedInAt?: Date;
  readonly checkedInBy?: string;
  readonly consultationStartedAt?: Date;
  readonly consultationEndedAt?: Date;
  readonly consultationDuration?: number;
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
  readonly doctor?: {
    readonly id: string;
    readonly name: string;
    readonly specialization?: string;
  };
  readonly slotAllocation?: {
    readonly autoAllocated: boolean;
    readonly proposedTimeAvailable: boolean;
    readonly alternativeSlots?: Array<{
      readonly date: string;
      readonly time: string;
    }>;
  };
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
export interface PatientSuccess<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * Failed operation result.
 */
export interface PatientFailure {
  readonly success: false;
  readonly error: ClinicalError;
}

/**
 * Discriminated union for all PatientApi outcomes.
 */
export type PatientOutcome<T> = PatientSuccess<T> | PatientFailure;

/**
 * PatientApi — persistence boundary for patient data.
 *
 * Business operations:
 * - Load patient details.
 * - Load patient appointments.
 * - Load upcoming appointments for a patient.
 * - Load patient vitals.
 *
 * Implementations MUST:
 * - Return `PatientFailure` with a `ClinicalError` instead of throwing.
 * - Preserve the request/response contracts of the backend.
 * - Map transport/HTTP failures to `ClinicalErrorCode` values.
 *
 * Implementations MUST NOT:
 * - Expose HTTP details (URLs, status codes, headers) through this interface.
 * - Leak framework types (fetch, Request, Response) to consumers.
 */
export interface PatientApi {
  /**
   * Load patient details by ID.
   */
  loadPatient(patientId: string): Promise<PatientOutcome<PatientResponse>>;

  /**
   * Load all appointments for a patient.
   */
  loadPatientAppointments(patientId: string): Promise<PatientOutcome<AppointmentResponse[]>>;

  /**
   * Load upcoming appointments for a patient.
   */
  loadUpcomingAppointments(patientId: string): Promise<PatientOutcome<AppointmentResponse[]>>;

  /**
   * Load patient vitals for a specific appointment.
   */
  getPatientVitals(patientId: string, appointmentId: number): Promise<PatientOutcome<VitalsResponse[]>>;
}
