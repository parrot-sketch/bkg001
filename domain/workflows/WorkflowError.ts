/**
 * Workflow Error Hierarchy
 *
 * Certified error types for workflow transitions.
 * Each error includes code, message, state, command, recoverability, and clinical severity.
 */

export type ClinicalSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type Recoverability = 'recoverable' | 'non_recoverable' | 'requires_user_action';

export abstract class WorkflowError {
  public readonly timestamp: number;
  public readonly recoverability: Recoverability;
  public readonly clinicalSeverity: ClinicalSeverity;

  constructor(
    public readonly code: string,
    public readonly message: string,
    recoverability: Recoverability,
    clinicalSeverity: ClinicalSeverity,
    timestamp?: number
  ) {
    this.timestamp = timestamp ?? Date.now();
    this.recoverability = recoverability;
    this.clinicalSeverity = clinicalSeverity;
  }

  abstract toObject(): Record<string, unknown>;
}

export class GuardFailure extends WorkflowError {
  constructor(
    public readonly guardId: string,
    public readonly reason: string,
    clinicalSeverity: ClinicalSeverity = 'medium',
    timestamp?: number
  ) {
    super(
      'GUARD_FAILED',
      `Guard ${guardId} failed: ${reason}`,
      'requires_user_action',
      clinicalSeverity,
      timestamp
    );
  }

  toObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      guardId: this.guardId,
      reason: this.reason,
      clinicalSeverity: this.clinicalSeverity,
      timestamp: this.timestamp,
    };
  }
}

export class InvalidTransition extends WorkflowError {
  constructor(
    public readonly fromState: string,
    public readonly toState: string | null,
    public readonly action: string,
    timestamp?: number
  ) {
    super(
      'INVALID_TRANSITION',
      `Cannot transition from ${fromState} to ${toState ?? 'null'} via ${action}`,
      'non_recoverable',
      'low',
      timestamp
    );
  }

  toObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      fromState: this.fromState,
      toState: this.toState,
      action: this.action,
      timestamp: this.timestamp,
    };
  }
}

export class WorkflowInvariantViolation extends WorkflowError {
  constructor(
    public readonly detail: string,
    timestamp?: number
  ) {
    super(
      'WORKFLOW_INVARIANT_VIOLATION',
      detail,
      'non_recoverable',
      'critical',
      timestamp
    );
  }

  toObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      detail: this.detail,
      timestamp: this.timestamp,
    };
  }
}

export class WorkflowConflict extends WorkflowError {
  constructor(
    public readonly clientVersion: string,
    public readonly serverVersion: string,
    timestamp?: number
  ) {
    super(
      'WORKFLOW_CONFLICT',
      `Version conflict: client ${clientVersion} vs server ${serverVersion}`,
      'requires_user_action',
      'medium',
      timestamp
    );
  }

  toObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      clientVersion: this.clientVersion,
      serverVersion: this.serverVersion,
      timestamp: this.timestamp,
    };
  }
}

export class UnknownCommand extends WorkflowError {
  constructor(
    public readonly commandType: string,
    timestamp?: number
  ) {
    super(
      'UNKNOWN_COMMAND',
      `Unknown command: ${commandType}`,
      'non_recoverable',
      'low',
      timestamp
    );
  }

  toObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      commandType: this.commandType,
      timestamp: this.timestamp,
    };
  }
}

export class UnknownState extends WorkflowError {
  constructor(
    public readonly state: string,
    timestamp?: number
  ) {
    super(
      'UNKNOWN_STATE',
      `Unknown state: ${state}`,
      'non_recoverable',
      'critical',
      timestamp
    );
  }

  toObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      state: this.state,
      timestamp: this.timestamp,
    };
  }
}

export type WorkflowErrorType =
  | GuardFailure
  | InvalidTransition
  | WorkflowInvariantViolation
  | WorkflowConflict
  | UnknownCommand
  | UnknownState;
