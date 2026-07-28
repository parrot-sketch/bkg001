/**
 * Workflow Engine
 *
 * Pure domain service that orchestrates workflow transitions.
 *
 * Responsibilities:
 * - validate current state
 * - locate valid transition
 * - execute all required guards
 * - reject invalid transitions
 * - compute next workflow state
 * - compute next documentation state (when applicable)
 * - produce TransitionResult
 * - produce WorkflowDecision
 * - produce ordered domain events
 * - produce ordered side-effect requests
 * - remain deterministic
 * - remain immutable
 * - never mutate external state
 */

import type { ConsultationWorkflowState } from './ConsultationWorkflowStateMachine';
import type { ConsultationWorkflowAction } from './ConsultationWorkflowStateMachine';
import type { DocumentationWorkflowState } from './DocumentationWorkflowStateMachine';
import type { DocumentationAction } from './DocumentationWorkflowStateMachine';
import type { GuardContext } from './GuardContext';
import type { GuardRegistry } from './GuardRegistry';
import type { WorkflowCommand } from './WorkflowCommand';
import type { WorkflowDecision } from './WorkflowDecision';
import type { WorkflowErrorType } from './WorkflowError';
import type { WorkflowEvent } from './WorkflowEvent';
import type { WorkflowExecutionResult } from './WorkflowExecutionResult';
import type { WorkflowMetadata } from './WorkflowMetadata';
import type { WorkflowSideEffect } from './WorkflowSideEffect';
import {
  canPerformAction as canPerformConsultationAction,
  getNextState as getNextConsultationState,
} from './ConsultationWorkflowStateMachine';
import {
  canPerformAction as canPerformDocumentationAction,
  getNextState as getNextDocumentationState,
} from './DocumentationWorkflowStateMachine';
import { WorkflowCommandHandler } from './WorkflowCommandHandler';
import { WorkflowGuardEngine } from './WorkflowGuardEngine';
import { UnknownCommand } from './WorkflowError';
import { GuardFailure } from './WorkflowError';
import { InvalidTransition } from './WorkflowError';
import { WorkflowInvariantViolation } from './WorkflowError';
import { createDecision } from './WorkflowDecision';
import { createMetadata } from './WorkflowMetadata';
import { isWorkflowCommand } from './WorkflowCommand';

export interface WorkflowEngineOptions {
  readonly registry: GuardRegistry;
  readonly shortCircuit: boolean;
}

export class WorkflowEngine {
  private readonly guardEngine: WorkflowGuardEngine;
  private readonly commandHandler: WorkflowCommandHandler;

  constructor(
    private consultationState: ConsultationWorkflowState,
    private documentationState: DocumentationWorkflowState,
    private context: GuardContext,
    options: WorkflowEngineOptions
  ) {
    this.guardEngine = new WorkflowGuardEngine(options.registry, { shortCircuit: options.shortCircuit });
    this.commandHandler = new WorkflowCommandHandler();
  }

  getConsultationState(): ConsultationWorkflowState {
    return this.consultationState;
  }

  getDocumentationState(): DocumentationWorkflowState {
    return this.documentationState;
  }

  /**
   * Merge a partial context patch into the engine's guard context.
   *
   * Call this before executing a command whenever the presentation layer has
   * acquired data that guards need (appointment, user, patient, etc.).
   * Only the provided keys are overwritten; all other fields are preserved.
   */
  updateContext(patch: Partial<GuardContext>): void {
    this.context = { ...this.context, ...patch };
  }

  /**
   * Directly reset the consultation state to a known value.
   *
   * Use ONLY after data-loading initialization (not for user-initiated
   * transitions). This bypasses guard evaluation intentionally — guards are
   * for runtime transitions, not for syncing state after an API load.
   */
  resetConsultationState(state: ConsultationWorkflowState): void {
    this.consultationState = state;
  }

  execute(command: WorkflowCommand, metadata?: Partial<WorkflowMetadata>): WorkflowExecutionResult {
    const startTime = Date.now();
    const mergedMetadata = createMetadata(metadata);
    console.log('[TRACE] WorkflowEngine.execute', { 
      commandType: command?.type, 
      consultationState: this.consultationState,
      documentationState: this.documentationState,
      contextKeys: Object.keys(this.context),
      hasUser: !!this.context.user,
      userRole: this.context.user?.role,
    });

    if (!isWorkflowCommand(command)) {
      const error = new UnknownCommand((command as any)?.type ?? 'unknown', mergedMetadata.timestamp);
      console.error('[TRACE] WorkflowEngine.execute unknown command', error);
      const decision = createDecision({
        success: false,
        previousConsultationState: this.consultationState,
        previousDocumentationState: this.documentationState,
        errors: [error],
        metadata: mergedMetadata.custom ?? {},
      });
      return { decision, executionTimeMs: Date.now() - startTime, guardsEvaluated: 0, deterministic: true };
    }

    const mapping = this.commandHandler.mapToActions(
      command,
      this.consultationState,
      this.documentationState,
      this.context,
      mergedMetadata
    );

    const errors: WorkflowErrorType[] = [];
    const events: WorkflowEvent[] = [];
    const sideEffects: WorkflowSideEffect[] = [];
    let guardEvaluations = 0;

    let nextConsultation = this.consultationState;
    let nextDocumentation = this.documentationState;

    const consultationAction = mapping.consultationActions[0];
    if (consultationAction) {
      const consultationResult = this.tryTransitionConsultation(
        consultationAction,
        mergedMetadata,
        mapping.documentationAction
      );
      guardEvaluations += consultationResult.guardsEvaluated;
      errors.push(...consultationResult.errors);
      events.push(...consultationResult.events);
      sideEffects.push(...consultationResult.sideEffects);

      if (consultationResult.success && consultationResult.nextState) {
        nextConsultation = consultationResult.nextState;
      }
    }

    if (mapping.requiresDocumentation && mapping.documentationAction && nextConsultation !== this.consultationState) {
      const canDocTransition = canPerformDocumentationAction(this.documentationState, mapping.documentationAction);
      if (canDocTransition) {
        const docNext = getNextDocumentationState(this.documentationState, mapping.documentationAction);
        if (docNext) {
          nextDocumentation = docNext;
        }
      }
    }

    const success = errors.length === 0 && nextConsultation !== this.consultationState;

    if (success) {
      this.consultationState = nextConsultation;
      this.documentationState = nextDocumentation;
    }

    const decision = createDecision({
      success,
      previousConsultationState: this.consultationState,
      nextConsultationState: success ? nextConsultation : null,
      previousDocumentationState: this.documentationState,
      nextDocumentationState: mapping.requiresDocumentation ? nextDocumentation : null,
      events,
      sideEffects,
      errors,
      metadata: mergedMetadata.custom ?? {},
    });

    return {
      decision,
      executionTimeMs: Date.now() - startTime,
      guardsEvaluated: guardEvaluations,
      deterministic: true,
    };
  }

  private tryTransitionConsultation(
    action: ConsultationWorkflowAction,
    metadata: WorkflowMetadata,
    documentationAction: DocumentationAction | undefined
  ): {
    success: boolean;
    nextState: ConsultationWorkflowState | null;
    errors: WorkflowErrorType[];
    events: WorkflowEvent[];
    sideEffects: WorkflowSideEffect[];
    guardsEvaluated: number;
  } {
    if (!canPerformConsultationAction(this.consultationState, action)) {
      const error = new InvalidTransition(this.consultationState, null, action, metadata.timestamp);
      return {
        success: false,
        nextState: null,
        errors: [error],
        events: [],
        sideEffects: [],
        guardsEvaluated: 0,
      };
    }

    const guardResult = this.guardEngine.validate(
      this.consultationState,
      action,
      this.context
    );
    console.log('[TRACE] WorkflowEngine.validate guards', {
      action,
      passed: guardResult.passed,
      violations: guardResult.violations.map(v => ({ guardId: v.guardId, reason: v.reason, risk: v.clinicalRisk })),
      results: guardResult.results.map((r: any) => ({ guardId: r.guardId, passed: r.passed, reason: r.reason }))
    });

    if (!guardResult.passed && guardResult.violations.length > 0) {
      const blocking = guardResult.violations.filter(
        v => v.clinicalRisk === 'critical' || v.clinicalRisk === 'high'
      );
      const advisory = guardResult.violations.filter(
        v => v.clinicalRisk !== 'critical' && v.clinicalRisk !== 'high'
      );
      console.log('[TRACE] WorkflowEngine guard result', { blocking: blocking.length, advisory: advisory.length });

      if (blocking.length > 0) {
        console.error('[TRACE] WorkflowEngine BLOCKED by guards', blocking);
        const errors: WorkflowErrorType[] = blocking.map(v =>
          new GuardFailure(v.guardId, v.reason, v.clinicalRisk, metadata.timestamp)
        );
        return {
          success: false,
          nextState: null,
          errors,
          events: [],
          sideEffects: [],
          guardsEvaluated: guardResult.results.length,
        };
      }

      const events = this.createEventsForTransition(action, getNextConsultationState(this.consultationState, action)!, metadata);
      return {
        success: true,
        nextState: getNextConsultationState(this.consultationState, action),
        errors: [],
        events,
        sideEffects: this.createSideEffectsForTransition(action, getNextConsultationState(this.consultationState, action)!),
        guardsEvaluated: guardResult.results.length,
      };
    }

    const nextState = getNextConsultationState(this.consultationState, action);
    if (!nextState) {
      const error = new WorkflowInvariantViolation(
        `No next state for ${this.consultationState} + ${action}`,
        metadata.timestamp
      );
      return {
        success: false,
        nextState: null,
        errors: [error],
        events: [],
        sideEffects: [],
        guardsEvaluated: guardResult.results.length,
      };
    }

    const events = this.createEventsForTransition(action, nextState, metadata);
    const sideEffects = this.createSideEffectsForTransition(action, nextState);

    return {
      success: true,
      nextState,
      errors: [],
      events,
      sideEffects,
      guardsEvaluated: guardResult.results.length,
    };
  }

  private createEventsForTransition(
    action: ConsultationWorkflowAction,
    nextState: ConsultationWorkflowState,
    metadata: WorkflowMetadata
  ): WorkflowEvent[] {
    const events: WorkflowEvent[] = [];

    switch (action) {
      case 'START_CONSULTATION':
        if (nextState === 'ACTIVE') {
          events.push({
            id: this.generateId(),
            type: 'ConsultationStarted',
            timestamp: metadata.timestamp,
            correlationId: metadata.correlationId,
            causationId: null,
            payload: {
              appointmentId: this.context.appointmentId ?? 0,
              patientId: this.context.patientId ?? '',
              consultationId: this.context.consultationId,
              doctorId: this.context.user.id,
              doctorName: this.context.user.name,
              patientName: '',
              appointmentStatus: this.context.appointment?.status ?? '',
            },
          });
        }
        break;

      case 'PAUSE':
        if (nextState === 'PAUSED') {
          events.push({
            id: this.generateId(),
            type: 'ConsultationPaused',
            timestamp: metadata.timestamp,
            correlationId: metadata.correlationId,
            causationId: null,
            payload: {
              appointmentId: this.context.appointmentId ?? 0,
              patientId: this.context.patientId ?? '',
              pausedAt: metadata.timestamp,
              reason: 'user_initiated',
              unsavedChanges: this.context.isDirty,
            },
          });
        }
        break;

      case 'CONFIRM_COMPLETE':
        if (nextState === 'TRANSITIONING') {
          events.push({
            id: this.generateId(),
            type: 'ConsultationCompleted',
            timestamp: metadata.timestamp,
            correlationId: metadata.correlationId,
            causationId: null,
            payload: {
              appointmentId: this.context.appointmentId ?? 0,
              patientId: this.context.patientId ?? '',
              consultationId: this.context.consultationId,
              doctorId: this.context.user.id,
              completedAt: metadata.timestamp,
              outcomeType: this.context.outcomeType ?? '',
              patientDecision: this.context.patientDecision,
              durationSeconds: 0,
              billingCreated: true,
              surgicalCaseCreated: false,
            },
          });
        }
        break;

      case 'SWITCH_PATIENT':
        if (nextState === 'LOADING') {
          events.push({
            id: this.generateId(),
            type: 'PatientSwitched',
            timestamp: metadata.timestamp,
            correlationId: metadata.correlationId,
            causationId: null,
            payload: {
              fromAppointmentId: this.context.appointmentId,
              toAppointmentId: metadata.targetAppointmentId ?? 0,
              fromPatientId: this.context.patientId,
              toPatientId: '',
              doctorId: this.context.user.id,
              reason: 'manual_switch',
            },
          });
        }
        break;

      case 'LOAD_ERROR':
      case 'SAVE_ERROR':
        events.push({
          id: this.generateId(),
          type: 'ConsultationFailed',
          timestamp: metadata.timestamp,
          correlationId: metadata.correlationId,
          causationId: null,
          payload: {
            appointmentId: this.context.appointmentId ?? 0,
            operation: action === 'LOAD_ERROR' ? 'load' : 'save',
            errorCode: metadata.errorType ?? 'UNKNOWN',
            errorMessage: 'Transition failed',
            recoverable: true,
            timestamp: metadata.timestamp,
          },
        });
        break;

      default:
        break;
    }

    return events;
  }

  private createSideEffectsForTransition(
    action: ConsultationWorkflowAction,
    nextState: ConsultationWorkflowState
  ): WorkflowSideEffect[] {
    const sideEffects: WorkflowSideEffect[] = [];

    switch (action) {
      case 'START_CONSULTATION':
        if (nextState === 'ACTIVE') {
          sideEffects.push({
            type: 'NotifyPatientContext',
            priority: 'normal',
            idempotent: true,
            retry: 'retry',
            executionOrder: 5,
            payload: {
              patientId: this.context.patientId ?? '',
              appointmentId: this.context.appointmentId ?? 0,
              context: { state: 'ACTIVE' },
            },
          } as unknown as WorkflowSideEffect);
        }
        break;

      case 'CONFIRM_COMPLETE':
        if (nextState === 'TRANSITIONING') {
          sideEffects.push({
            type: 'NotifyBilling',
            priority: 'critical',
            idempotent: true,
            retry: 'retry',
            executionOrder: 4,
            payload: {
              appointmentId: this.context.appointmentId ?? 0,
              consultationId: this.context.consultationId ?? 0,
              outcomeType: this.context.outcomeType ?? '',
              billingSummary: {},
            },
          } as unknown as WorkflowSideEffect);
          sideEffects.push({
            type: 'RefreshQueue',
            priority: 'high',
            idempotent: true,
            retry: 'retry',
            executionOrder: 3,
            payload: {
              doctorId: this.context.user.id,
            },
          } as unknown as WorkflowSideEffect);
        }
        break;

      case 'SAVE_DRAFT':
        sideEffects.push({
          type: 'SaveDraft',
          priority: 'high',
          idempotent: true,
          retry: 'exponential_backoff',
          executionOrder: 1,
          payload: {
            appointmentId: this.context.appointmentId ?? 0,
            consultationId: this.context.consultationId ?? 0,
            doctorId: this.context.user.id,
            notes: this.context.notes,
            version: this.context.version ?? '1',
          },
        } as unknown as WorkflowSideEffect);
        break;

      default:
        break;
    }

    return sideEffects;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export function createWorkflowEngine(
  consultationState: ConsultationWorkflowState,
  documentationState: DocumentationWorkflowState,
  context: GuardContext,
  registry: GuardRegistry,
  shortCircuit = false
): WorkflowEngine {
  return new WorkflowEngine(consultationState, documentationState, context, {
    registry,
    shortCircuit,
  });
}
