/**
 * Application Layer — WorkflowCoordinator Dependencies
 *
 * Defines the interface contracts that WorkflowCoordinator depends on.
 * All interfaces are owned by the Application or Domain layers.
 * No concrete implementations are permitted here.
 */

import type { IAuditService } from '@/domain/interfaces/services/IAuditService';
import type { PatientApi, PatientOutcome } from '@/domain/interfaces/services/PatientApi';
import type { QueueApi, QueueOutcome } from '@/domain/interfaces/services/QueueApi';
import type { INotificationService } from '@/domain/interfaces/services/INotificationService';
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
import type { GuardRegistry } from '@/domain/workflows/GuardRegistry';
import type { WorkflowSideEffect, SaveDraftSideEffect } from '@/domain/workflows/WorkflowSideEffect';
import type { WorkflowEventBus } from '@/application/events';

/**
 * Service interface for draft operations.
 */
export interface IDraftService {
  saveDraft(
    appointmentId: number,
    doctorId: string,
    notes: unknown,
    version: string
  ): Promise<{ readonly success: true; readonly version: string } | { readonly success: false; readonly error: unknown }>;

  restoreDraft(
    appointmentId: number,
    doctorId: string
  ): Promise<{ readonly success: true; readonly data: unknown } | { readonly success: false; readonly error: unknown }>;
}

/**
 * Service interface for timer operations.
 */
export interface ITimerService {
  startAutosave(appointmentId: number, debounceMs: number): Promise<void>;
  stopAutosave(appointmentId: number): Promise<void>;
  startSessionTimer(appointmentId: number): Promise<void>;
  stopSessionTimer(appointmentId: number): Promise<void>;
}

/**
 * All dependencies required by WorkflowCoordinator.
 */
export interface WorkflowCoordinatorDependencies {
  readonly draftService: IDraftService;
  readonly patientApi: PatientApi;
  readonly queueApi: QueueApi;
  readonly notificationService: INotificationService;
  readonly auditService: IAuditService;
  readonly timerService: ITimerService;
  readonly workflowEngine: WorkflowEngine;
  readonly eventBus: WorkflowEventBus;
}
