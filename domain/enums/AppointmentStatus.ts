/**
 * Domain Enum: AppointmentStatus
 * 
 * Represents the status of an appointment in the healthcare system.
 * This is a pure TypeScript enum with no framework dependencies.
 * 
 * === CONSULTATION WORKFLOW ===
 * 
 * PENDING → SCHEDULED → CHECKED_IN → IN_CONSULTATION → COMPLETED
 * 
 * 1. PENDING: Patient booked, waiting for confirmation
 * 2. SCHEDULED: Appointment confirmed (by doctor or system)
 * 3. CHECKED_IN: Patient arrived, frontdesk checked them in (REQUIRED before consultation)
 * 4. IN_CONSULTATION: Doctor is actively seeing the patient
 * 5. COMPLETED: Consultation finished
 * 
 * Key Rule: Patient MUST be checked in before doctor can start consultation.
 * 
 * === SURGERY WORKFLOW (Future) ===
 * 
 * After consultation with PROCEDURE_RECOMMENDED outcome:
 * - CasePlan created → Surgery readiness checks apply there
 * - READY_FOR_CONSULTATION status reserved for surgery prep workflows
 */
export enum AppointmentStatus {
  // Booking phase
  PENDING = 'PENDING',
  PENDING_DOCTOR_CONFIRMATION = 'PENDING_DOCTOR_CONFIRMATION',
  CONFIRMED = 'CONFIRMED', // Deprecated, use SCHEDULED
  SCHEDULED = 'SCHEDULED',

  // Day-of-appointment workflow
  CHECKED_IN = 'CHECKED_IN',                          // Patient arrived and checked in by frontdesk
  READY_FOR_CONSULTATION = 'READY_FOR_CONSULTATION',  // Optional: Nurse prep complete (reserved for surgery workflows)
  IN_CONSULTATION = 'IN_CONSULTATION',                // Doctor actively seeing patient

  // Terminal states
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

/**
 * Type guard to check if a string is a valid AppointmentStatus
 */
export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return Object.values(AppointmentStatus).includes(value as AppointmentStatus);
}

/**
 * Check if an appointment status allows modifications
 */
export function isAppointmentModifiable(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING ||
    status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION ||
    status === AppointmentStatus.SCHEDULED;
}

/**
 * Check if an appointment status is final (cannot be changed)
 */
export function isAppointmentFinal(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.CANCELLED ||
    status === AppointmentStatus.COMPLETED ||
    status === AppointmentStatus.NO_SHOW;
}

/**
 * Check if appointment can be checked in.
 * 
 * IMPORTANT: Only doctor-confirmed appointments are eligible for check-in.
 * The clinical workflow requires the doctor to first confirm/accept the
 * appointment before the frontdesk can check in the patient on arrival.
 * 
 * Valid:   SCHEDULED, CONFIRMED (doctor has confirmed)
 * Invalid: PENDING, PENDING_DOCTOR_CONFIRMATION (doctor hasn't reviewed yet)
 */
export function canCheckIn(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.SCHEDULED ||
    status === AppointmentStatus.CONFIRMED;
}

/**
 * Check if appointment is awaiting action before it can proceed.
 * Used by the UI to show contextual messaging instead of a check-in button.
 */
export function isAwaitingConfirmation(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING ||
    status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
}

/**
 * Check if appointment can start consultation.
 * 
 * IMPORTANT: Patient must be checked in before consultation can start.
 * This enforces the clinical workflow where frontdesk confirms patient arrival.
 * 
 * Valid states: CHECKED_IN, READY_FOR_CONSULTATION (nurse prep complete)
 * Invalid states: SCHEDULED (patient hasn't arrived yet)
 */
export function canStartConsultation(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.CHECKED_IN ||
    status === AppointmentStatus.READY_FOR_CONSULTATION;
}

/**
 * Check if appointment can be marked as no-show
 */
export function canMarkNoShow(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING ||
    status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION ||
    status === AppointmentStatus.SCHEDULED ||
    status === AppointmentStatus.CONFIRMED;
}

/**
 * Check if appointment is awaiting doctor confirmation
 */
export function isPendingDoctorConfirmation(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
}

/**
 * Check if appointment is confirmed/scheduled (not pending)
 */
export function isConfirmed(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.SCHEDULED ||
    status === AppointmentStatus.CONFIRMED;
}
