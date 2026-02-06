/**
 * Surgery Workflow State Machine
 * 
 * Defines the workflow from consultation outcome to surgery completion.
 * This handles the transition when a doctor recommends a procedure.
 * 
 * Workflow:
 * 1. Consultation completed with PROCEDURE_RECOMMENDED outcome
 * 2. Patient decision: YES/NO/PENDING
 * 3. If YES → Create CasePlan → Surgery scheduling
 * 4. Pre-op readiness checks
 * 5. Surgery execution
 * 6. Post-op follow-up
 */

import { ConsultationOutcomeType } from '@/domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '@/domain/enums/PatientDecision';

// ============================================================================
// STATE DEFINITIONS
// ============================================================================

export enum SurgeryWorkflowState {
  // Pre-planning states
  AWAITING_OUTCOME = 'AWAITING_OUTCOME',         // Consultation in progress
  AWAITING_PATIENT_DECISION = 'AWAITING_PATIENT_DECISION', // Procedure recommended, patient deciding
  PATIENT_DECLINED = 'PATIENT_DECLINED',         // Patient said no
  
  // Planning states
  CASE_PLAN_DRAFT = 'CASE_PLAN_DRAFT',          // Creating surgical plan
  CASE_PLAN_REVIEW = 'CASE_PLAN_REVIEW',        // Plan needs review
  
  // Pre-op states
  READINESS_CHECK = 'READINESS_CHECK',          // Checking surgical readiness
  AWAITING_CONSENT = 'AWAITING_CONSENT',        // Waiting for consent forms
  AWAITING_CLEARANCE = 'AWAITING_CLEARANCE',    // Medical clearance pending
  
  // Scheduling states
  READY_TO_SCHEDULE = 'READY_TO_SCHEDULE',      // All checks passed
  SCHEDULED = 'SCHEDULED',                       // Surgery date set
  
  // Execution states
  IN_THEATRE = 'IN_THEATRE',                    // Surgery in progress
  
  // Post-op states
  RECOVERY = 'RECOVERY',                         // Post-op recovery
  FOLLOW_UP = 'FOLLOW_UP',                      // Follow-up phase
  COMPLETED = 'COMPLETED',                       // Case closed
  
  // Terminal states
  CANCELLED = 'CANCELLED',
}

export enum SurgeryWorkflowAction {
  // Outcome actions
  RECOMMEND_PROCEDURE = 'RECOMMEND_PROCEDURE',
  RECOMMEND_FOLLOW_UP = 'RECOMMEND_FOLLOW_UP',
  CONSULTATION_ONLY = 'CONSULTATION_ONLY',
  
  // Patient decision
  PATIENT_ACCEPTS = 'PATIENT_ACCEPTS',
  PATIENT_DECLINES = 'PATIENT_DECLINES',
  PATIENT_PENDING = 'PATIENT_PENDING',
  
  // Planning actions
  CREATE_CASE_PLAN = 'CREATE_CASE_PLAN',
  SUBMIT_FOR_REVIEW = 'SUBMIT_FOR_REVIEW',
  APPROVE_PLAN = 'APPROVE_PLAN',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
  
  // Readiness actions
  START_READINESS_CHECK = 'START_READINESS_CHECK',
  COMPLETE_INTAKE = 'COMPLETE_INTAKE',
  UPLOAD_PHOTOS = 'UPLOAD_PHOTOS',
  COMPLETE_MEDICAL_HISTORY = 'COMPLETE_MEDICAL_HISTORY',
  ACKNOWLEDGE_CONSENT = 'ACKNOWLEDGE_CONSENT',
  RECEIVE_CLEARANCE = 'RECEIVE_CLEARANCE',
  
  // Scheduling
  SCHEDULE_SURGERY = 'SCHEDULE_SURGERY',
  RESCHEDULE = 'RESCHEDULE',
  
  // Execution
  START_SURGERY = 'START_SURGERY',
  COMPLETE_SURGERY = 'COMPLETE_SURGERY',
  
  // Post-op
  DISCHARGE = 'DISCHARGE',
  SCHEDULE_FOLLOW_UP = 'SCHEDULE_FOLLOW_UP',
  COMPLETE_FOLLOW_UP = 'COMPLETE_FOLLOW_UP',
  CLOSE_CASE = 'CLOSE_CASE',
  
  // Terminal
  CANCEL = 'CANCEL',
}

// ============================================================================
// READINESS CRITERIA
// ============================================================================

export interface SurgeryReadiness {
  // Patient file completeness
  intakeFormComplete: boolean;
  medicalHistoryComplete: boolean;
  photosUploaded: boolean;
  
  // Consent and clearance
  consentSigned: boolean;
  medicalClearanceReceived: boolean;
  
  // Lab work
  labWorkComplete: boolean;
  labResultsNormal: boolean;
  
  // Insurance/Financial
  insuranceVerified: boolean;
  paymentArranged: boolean;
  
  // Surgical specifics
  implantOrdered: boolean;
  theatreBooked: boolean;
  anesthesiaConfirmed: boolean;
}

export function isReadyForSurgery(readiness: SurgeryReadiness): boolean {
  return (
    readiness.intakeFormComplete &&
    readiness.medicalHistoryComplete &&
    readiness.photosUploaded &&
    readiness.consentSigned &&
    readiness.medicalClearanceReceived
  );
}

export function getReadinessPercentage(readiness: SurgeryReadiness): number {
  const checks = [
    readiness.intakeFormComplete,
    readiness.medicalHistoryComplete,
    readiness.photosUploaded,
    readiness.consentSigned,
    readiness.medicalClearanceReceived,
    readiness.labWorkComplete,
    readiness.insuranceVerified,
  ];
  
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

export function getMissingReadinessItems(readiness: SurgeryReadiness): string[] {
  const missing: string[] = [];
  
  if (!readiness.intakeFormComplete) missing.push('Intake form');
  if (!readiness.medicalHistoryComplete) missing.push('Medical history');
  if (!readiness.photosUploaded) missing.push('Clinical photos');
  if (!readiness.consentSigned) missing.push('Consent form');
  if (!readiness.medicalClearanceReceived) missing.push('Medical clearance');
  if (!readiness.labWorkComplete) missing.push('Lab work');
  if (!readiness.insuranceVerified) missing.push('Insurance verification');
  
  return missing;
}

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

/**
 * Determine next surgery workflow state based on consultation outcome
 */
export function getPostConsultationState(
  outcomeType: ConsultationOutcomeType,
  patientDecision?: PatientDecision
): SurgeryWorkflowState {
  switch (outcomeType) {
    case ConsultationOutcomeType.PROCEDURE_RECOMMENDED:
      if (patientDecision === PatientDecision.YES) {
        return SurgeryWorkflowState.CASE_PLAN_DRAFT;
      } else if (patientDecision === PatientDecision.NO) {
        return SurgeryWorkflowState.PATIENT_DECLINED;
      }
      return SurgeryWorkflowState.AWAITING_PATIENT_DECISION;
      
    case ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED:
    case ConsultationOutcomeType.CONSULTATION_ONLY:
    case ConsultationOutcomeType.REFERRAL_NEEDED:
    default:
      // No surgery workflow needed
      return SurgeryWorkflowState.COMPLETED;
  }
}

/**
 * Valid state transitions for surgery workflow
 */
const VALID_SURGERY_TRANSITIONS: Record<SurgeryWorkflowState, SurgeryWorkflowAction[]> = {
  [SurgeryWorkflowState.AWAITING_OUTCOME]: [
    SurgeryWorkflowAction.RECOMMEND_PROCEDURE,
    SurgeryWorkflowAction.RECOMMEND_FOLLOW_UP,
    SurgeryWorkflowAction.CONSULTATION_ONLY,
  ],
  [SurgeryWorkflowState.AWAITING_PATIENT_DECISION]: [
    SurgeryWorkflowAction.PATIENT_ACCEPTS,
    SurgeryWorkflowAction.PATIENT_DECLINES,
    SurgeryWorkflowAction.PATIENT_PENDING,
    SurgeryWorkflowAction.CANCEL,
  ],
  [SurgeryWorkflowState.PATIENT_DECLINED]: [
    SurgeryWorkflowAction.PATIENT_ACCEPTS, // Patient changed mind
    SurgeryWorkflowAction.CLOSE_CASE,
  ],
  [SurgeryWorkflowState.CASE_PLAN_DRAFT]: [
    SurgeryWorkflowAction.SUBMIT_FOR_REVIEW,
    SurgeryWorkflowAction.START_READINESS_CHECK,
    SurgeryWorkflowAction.CANCEL,
  ],
  [SurgeryWorkflowState.CASE_PLAN_REVIEW]: [
    SurgeryWorkflowAction.APPROVE_PLAN,
    SurgeryWorkflowAction.REQUEST_CHANGES,
    SurgeryWorkflowAction.CANCEL,
  ],
  [SurgeryWorkflowState.READINESS_CHECK]: [
    SurgeryWorkflowAction.COMPLETE_INTAKE,
    SurgeryWorkflowAction.UPLOAD_PHOTOS,
    SurgeryWorkflowAction.COMPLETE_MEDICAL_HISTORY,
    SurgeryWorkflowAction.ACKNOWLEDGE_CONSENT,
    SurgeryWorkflowAction.RECEIVE_CLEARANCE,
    SurgeryWorkflowAction.CANCEL,
  ],
  [SurgeryWorkflowState.AWAITING_CONSENT]: [
    SurgeryWorkflowAction.ACKNOWLEDGE_CONSENT,
    SurgeryWorkflowAction.CANCEL,
  ],
  [SurgeryWorkflowState.AWAITING_CLEARANCE]: [
    SurgeryWorkflowAction.RECEIVE_CLEARANCE,
    SurgeryWorkflowAction.CANCEL,
  ],
  [SurgeryWorkflowState.READY_TO_SCHEDULE]: [
    SurgeryWorkflowAction.SCHEDULE_SURGERY,
    SurgeryWorkflowAction.CANCEL,
  ],
  [SurgeryWorkflowState.SCHEDULED]: [
    SurgeryWorkflowAction.START_SURGERY,
    SurgeryWorkflowAction.RESCHEDULE,
    SurgeryWorkflowAction.CANCEL,
  ],
  [SurgeryWorkflowState.IN_THEATRE]: [
    SurgeryWorkflowAction.COMPLETE_SURGERY,
  ],
  [SurgeryWorkflowState.RECOVERY]: [
    SurgeryWorkflowAction.DISCHARGE,
    SurgeryWorkflowAction.SCHEDULE_FOLLOW_UP,
  ],
  [SurgeryWorkflowState.FOLLOW_UP]: [
    SurgeryWorkflowAction.COMPLETE_FOLLOW_UP,
    SurgeryWorkflowAction.SCHEDULE_FOLLOW_UP,
  ],
  [SurgeryWorkflowState.COMPLETED]: [],
  [SurgeryWorkflowState.CANCELLED]: [],
};

/**
 * Check if an action is valid for current state
 */
export function canPerformSurgeryAction(
  currentState: SurgeryWorkflowState,
  action: SurgeryWorkflowAction
): boolean {
  return VALID_SURGERY_TRANSITIONS[currentState]?.includes(action) ?? false;
}

/**
 * Get next state for surgery workflow
 */
export function getNextSurgeryState(
  currentState: SurgeryWorkflowState,
  action: SurgeryWorkflowAction,
  readiness?: SurgeryReadiness
): SurgeryWorkflowState | null {
  if (!canPerformSurgeryAction(currentState, action)) {
    return null;
  }
  
  switch (action) {
    case SurgeryWorkflowAction.RECOMMEND_PROCEDURE:
      return SurgeryWorkflowState.AWAITING_PATIENT_DECISION;
      
    case SurgeryWorkflowAction.PATIENT_ACCEPTS:
      return SurgeryWorkflowState.CASE_PLAN_DRAFT;
      
    case SurgeryWorkflowAction.PATIENT_DECLINES:
      return SurgeryWorkflowState.PATIENT_DECLINED;
      
    case SurgeryWorkflowAction.CREATE_CASE_PLAN:
    case SurgeryWorkflowAction.REQUEST_CHANGES:
      return SurgeryWorkflowState.CASE_PLAN_DRAFT;
      
    case SurgeryWorkflowAction.SUBMIT_FOR_REVIEW:
      return SurgeryWorkflowState.CASE_PLAN_REVIEW;
      
    case SurgeryWorkflowAction.APPROVE_PLAN:
    case SurgeryWorkflowAction.START_READINESS_CHECK:
      return SurgeryWorkflowState.READINESS_CHECK;
      
    case SurgeryWorkflowAction.COMPLETE_INTAKE:
    case SurgeryWorkflowAction.UPLOAD_PHOTOS:
    case SurgeryWorkflowAction.COMPLETE_MEDICAL_HISTORY:
    case SurgeryWorkflowAction.ACKNOWLEDGE_CONSENT:
    case SurgeryWorkflowAction.RECEIVE_CLEARANCE:
      // Check if all readiness criteria met
      if (readiness && isReadyForSurgery(readiness)) {
        return SurgeryWorkflowState.READY_TO_SCHEDULE;
      }
      return SurgeryWorkflowState.READINESS_CHECK;
      
    case SurgeryWorkflowAction.SCHEDULE_SURGERY:
      return SurgeryWorkflowState.SCHEDULED;
      
    case SurgeryWorkflowAction.RESCHEDULE:
      return SurgeryWorkflowState.READY_TO_SCHEDULE;
      
    case SurgeryWorkflowAction.START_SURGERY:
      return SurgeryWorkflowState.IN_THEATRE;
      
    case SurgeryWorkflowAction.COMPLETE_SURGERY:
      return SurgeryWorkflowState.RECOVERY;
      
    case SurgeryWorkflowAction.DISCHARGE:
      return SurgeryWorkflowState.FOLLOW_UP;
      
    case SurgeryWorkflowAction.COMPLETE_FOLLOW_UP:
    case SurgeryWorkflowAction.CLOSE_CASE:
      return SurgeryWorkflowState.COMPLETED;
      
    case SurgeryWorkflowAction.CANCEL:
      return SurgeryWorkflowState.CANCELLED;
      
    default:
      return null;
  }
}

// ============================================================================
// WORKFLOW HELPERS
// ============================================================================

/**
 * Get human-readable label for workflow state
 */
export function getSurgeryStateLabel(state: SurgeryWorkflowState): string {
  const labels: Record<SurgeryWorkflowState, string> = {
    [SurgeryWorkflowState.AWAITING_OUTCOME]: 'Consultation In Progress',
    [SurgeryWorkflowState.AWAITING_PATIENT_DECISION]: 'Awaiting Patient Decision',
    [SurgeryWorkflowState.PATIENT_DECLINED]: 'Patient Declined',
    [SurgeryWorkflowState.CASE_PLAN_DRAFT]: 'Planning Surgery',
    [SurgeryWorkflowState.CASE_PLAN_REVIEW]: 'Plan Under Review',
    [SurgeryWorkflowState.READINESS_CHECK]: 'Pre-Op Readiness',
    [SurgeryWorkflowState.AWAITING_CONSENT]: 'Awaiting Consent',
    [SurgeryWorkflowState.AWAITING_CLEARANCE]: 'Awaiting Clearance',
    [SurgeryWorkflowState.READY_TO_SCHEDULE]: 'Ready to Schedule',
    [SurgeryWorkflowState.SCHEDULED]: 'Scheduled',
    [SurgeryWorkflowState.IN_THEATRE]: 'In Surgery',
    [SurgeryWorkflowState.RECOVERY]: 'Recovery',
    [SurgeryWorkflowState.FOLLOW_UP]: 'Follow-Up',
    [SurgeryWorkflowState.COMPLETED]: 'Completed',
    [SurgeryWorkflowState.CANCELLED]: 'Cancelled',
  };
  
  return labels[state] || state;
}

/**
 * Get suggested next actions for current state
 */
export function getSuggestedActions(state: SurgeryWorkflowState): string[] {
  const suggestions: Record<SurgeryWorkflowState, string[]> = {
    [SurgeryWorkflowState.AWAITING_OUTCOME]: ['Complete consultation and document outcome'],
    [SurgeryWorkflowState.AWAITING_PATIENT_DECISION]: ['Follow up with patient about decision'],
    [SurgeryWorkflowState.PATIENT_DECLINED]: ['Close case or discuss alternatives'],
    [SurgeryWorkflowState.CASE_PLAN_DRAFT]: ['Complete surgical plan details'],
    [SurgeryWorkflowState.CASE_PLAN_REVIEW]: ['Review and approve plan'],
    [SurgeryWorkflowState.READINESS_CHECK]: ['Complete missing readiness items'],
    [SurgeryWorkflowState.AWAITING_CONSENT]: ['Obtain patient consent'],
    [SurgeryWorkflowState.AWAITING_CLEARANCE]: ['Obtain medical clearance'],
    [SurgeryWorkflowState.READY_TO_SCHEDULE]: ['Schedule surgery date'],
    [SurgeryWorkflowState.SCHEDULED]: ['Prepare for surgery'],
    [SurgeryWorkflowState.IN_THEATRE]: ['Complete surgical procedure'],
    [SurgeryWorkflowState.RECOVERY]: ['Monitor patient recovery'],
    [SurgeryWorkflowState.FOLLOW_UP]: ['Schedule follow-up appointment'],
    [SurgeryWorkflowState.COMPLETED]: [],
    [SurgeryWorkflowState.CANCELLED]: [],
  };
  
  return suggestions[state] || [];
}
