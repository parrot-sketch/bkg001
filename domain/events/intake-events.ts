/**
 * Patient Intake & Patient Registry — Event Contracts
 *
 * Canonical event names and payload schemas for the Patient Intake vertical
 * slice. These names are taken verbatim from the AUTHORITATIVE documentation:
 *
 *   - architecture/02-event-catalog/event-catalog.md   (Tier 1 "emit first")
 *   - architecture/02-event-catalog/event-ownership.md (source of truth)
 *   - architecture/05-roadmap/phase-1-event-infrastructure.md (Priority 1 & 2)
 *
 * NAMING RECONCILIATION (see verification report):
 *   Deliverable-6 shorthand  ->  Authoritative event name (implemented here)
 *   ─────────────────────────────────────────────────────────────────────────
 *   intake.session.created   ->  intake.session.created
 *   intake.session.opened    ->  intake.session.opened
 *   intake.started           ->  intake.submission.created   (patient submits)
 *   intake.submitted         ->  intake.session.submitted
 *   intake.confirmed         ->  intake.confirmed
 *   patient.created          ->  patient.record.created
 *
 * The authoritative names are used because "Documentation is authoritative".
 */

import type { DomainEvent } from './DomainEvent';

// ────────────────────────────────────────────────────────────────────────────
// Event type name constants
// ────────────────────────────────────────────────────────────────────────────

export const IntakeEventTypes = {
  SESSION_CREATED: 'intake.session.created',
  SESSION_OPENED: 'intake.session.opened',
  SUBMISSION_CREATED: 'intake.submission.created',
  SESSION_SUBMITTED: 'intake.session.submitted',
  CONFIRMED: 'intake.confirmed',
  SUBMISSION_CONFIRMED: 'intake.submission.confirmed',
} as const;

export const PatientEventTypes = {
  RECORD_CREATED: 'patient.record.created',
} as const;

export const AggregateTypes = {
  INTAKE_SESSION: 'IntakeSession',
  INTAKE_SUBMISSION: 'IntakeSubmission',
  PATIENT: 'Patient',
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Payloads — kept flat (Rule 9: max 2 levels deep) and small (Rule 10)
// ────────────────────────────────────────────────────────────────────────────

export interface IntakeSessionCreatedPayload {
  sessionId: string;
  createdBy?: string;
  expiresAt: string;
  minutesRemaining: number;
}

export interface IntakeSessionOpenedPayload {
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IntakeSubmissionCreatedPayload {
  submissionId: string;
  sessionId: string;
  patientName: string;
  email: string;
  phone: string;
  completenessScore: number;
}

export interface IntakeSessionSubmittedPayload {
  sessionId: string;
  submittedAt: string;
}

export interface IntakeConfirmedPayload {
  sessionId: string;
  patientId: string;
  fileNumber: string;
  confirmedAt: string;
}

export interface IntakeSubmissionConfirmedPayload {
  submissionId: string;
  sessionId: string;
  patientId: string;
  confirmedAt: string;
}

export interface PatientRecordCreatedPayload {
  patientId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Typed event aliases
// ────────────────────────────────────────────────────────────────────────────

export type IntakeSessionCreatedEvent = DomainEvent<IntakeSessionCreatedPayload>;
export type IntakeSessionOpenedEvent = DomainEvent<IntakeSessionOpenedPayload>;
export type IntakeSubmissionCreatedEvent = DomainEvent<IntakeSubmissionCreatedPayload>;
export type IntakeSessionSubmittedEvent = DomainEvent<IntakeSessionSubmittedPayload>;
export type IntakeConfirmedEvent = DomainEvent<IntakeConfirmedPayload>;
export type IntakeSubmissionConfirmedEvent = DomainEvent<IntakeSubmissionConfirmedPayload>;
export type PatientRecordCreatedEvent = DomainEvent<PatientRecordCreatedPayload>;
