# Workflow Test Specification

## Purpose

This document defines the complete testing strategy for PR-A04. It covers unit tests, transition tests, guard tests, clinical scenario tests, recovery tests, property-based tests, and mutation tests. No implementation is provided.

## Coverage Requirements

- **100% state coverage** — every state is instantiated and tested
- **100% transition coverage** — every valid transition is tested (positive path)
- **100% guard coverage** — every guard is tested with its pass and fail condition
- **100% error path coverage** — every failure/recovery matrix entry is tested
- **100% side effect coverage** — every `SideEffect` type is emitted and consumed in at least one test

## Test Types

| Test Type | Scope | Runs In | Count Target |
|-----------|-------|---------|-------------|
| Unit | State machine logic, guards, context builders | `vitest` unit | ~120 |
| Transition | State machine transitions | `vitest` unit | ~80 |
| Guard | Precondition validation | `vitest` unit | ~80 |
| Clinical Scenario | End-to-end clinical workflows | `vitest` integration | ~30 |
| Recovery | Failure → retry → recovery | `vitest` integration | ~40 |
| Property-based | Invariants under random inputs | `fast-check` | ~20 |
| Mutation | Fault injection to verify guard robustness | `vitest` + custom | ~50 |

**Total estimated tests:** ~420

## 1. Unit Tests

### 1.1 State Machine Unit Tests

**File pattern:** `domain/workflows/ConsultationWorkflowState.test.ts`

#### Test: `getNextState - Valid Transitions`

For every entry in `VALID_TRANSITIONS`, verify `getNextState` returns the correct next state.

```typescript
test.each(Object.entries(VALID_TRANSITIONS))(
  'getNextState(%s, %s) returns correct next state',
  (state, actions) => {
    for (const action of actions) {
      const result = getNextState(state as ConsultationWorkflowState, action as ConsultationWorkflowAction);
      expect(result).not.toBeNull();
      expect(result).toBeDefined();
    }
  }
);
```

#### Test: `getNextState - Invalid Transitions`

For every invalid state/action pair, verify `getNextState` returns `null`.

```typescript
test.each(allStates)('getNextState rejects invalid actions for %s', (state) => {
  const validActions = VALID_TRANSITIONS[state];
  const invalidActions = allActions.filter(a => !validActions!.includes(a));
  for (const action of invalidActions) {
    expect(getNextState(state, action)).toBeNull();
  }
});
```

#### Test: `canPerformAction`

```typescript
test.each(Object.entries(VALID_TRANSITIONS))(
  'canPerformAction(%s, %s) is true',
  (state, actions) => {
    for (const action of actions) {
      expect(canPerformAction(state as ConsultationWorkflowState, action as ConsultationWorkflowAction)).toBe(true);
    }
  }
);
```

#### Test: `createInitialContext`

```typescript
test('createInitialContext without appointmentId starts at IDLE', () => {
  const ctx = createInitialContext();
  expect(ctx.state).toBe(ConsultationWorkflowState.IDLE);
  expect(ctx.appointmentId).toBeNull();
});

test('createInitialContext with appointmentId starts at LOADING', () => {
  const ctx = createInitialContext(42);
  expect(ctx.state).toBe(ConsultationWorkflowState.LOADING);
  expect(ctx.appointmentId).toBe(42);
});
```

### 1.2 DocumentationWorkflow Unit Tests

**File pattern:** `domain/workflows/DocumentationWorkflow.test.ts`

Same structure as ConsultationWorkflowState tests, applied to `DocumentationWorkflow` states, transitions, and guards.

### 1.3 Guard Unit Tests

**File pattern:** `domain/workflows/guards/*.test.ts`

Each guard file contains tests for one transition's guards.

```typescript
describe('startConsultationGuards', () => {
  test('passes when appointment is CHECKED_IN and doctor assigned', () => {
    const result = validateStartConsultation(buildContext({
      appointmentStatus: 'CHECKED_IN',
      doctorId: 'doc-1',
      appointmentDoctorId: 'doc-1',
    }));
    expect(result.passed).toBe(true);
  });

  test('fails when appointment is already COMPLETED', () => {
    const result = validateStartConsultation(buildContext({
      appointmentStatus: 'COMPLETED',
    }));
    expect(result.passed).toBe(false);
    expect(result.clinicalRisk).toBe('high');
  });
});
```

### 1.4 Engine Unit Tests

**File pattern:** `application/workflow/*.test.ts`

```typescript
describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = createConsultationEngine(IDLE, buildEmptyContext());
  });

  test('tryTransition returns success for valid transitions', () => {
    const result = engine.tryTransition(LOAD_PATIENT);
    expect(result.success).toBe(true);
    expect(result.nextState).toBe(LOADING);
  });

  test('tryTransition returns failure for invalid transitions', () => {
    const result = engine.tryTransition(CONFIRM_COMPLETE);
    expect(result.success).toBe(false);
    expect(result.nextState).toBeNull();
    expect(result.guardFailures.length).toBeGreaterThan(0);
  });

  test('tryTransition returns guard failures without state change', () => {
    engine = createConsultationEngine(READY, buildContext({ appointmentStatus: 'COMPLETED' }));
    const result = engine.tryTransition(START_CONSULTATION);
    expect(result.success).toBe(false);
    expect(result.previousState).toBe(READY);
    expect(result.nextState).toBeNull();
  });

  test('getSideEffectsForTransition returns correct effects', () => {
    const effects = engine.getSideEffectsForTransition(START_CONSULTATION);
    expect(effects).toContainEqual({ type: 'invalidateCache', queryKey: ['doctor', 'user-1', 'appointments'] });
  });
});
```

## 2. Transition Tests

### 2.1 Valid Transition Tests

For every valid transition in the transition table:

| Test ID | From | Action | To | Description |
|---------|------|--------|----|-------------|
| T-01 | IDLE | LOAD_PATIENT | LOADING | Load patient by ID |
| T-02 | LOADING | LOAD_SUCCESS | READY | Appointment not active |
| T-03 | LOADING | LOAD_SUCCESS | ACTIVE | Appointment active |
| T-04 | LOADING | LOAD_ERROR | ERROR | Load failure |
| T-05 | READY | START_CONSULTATION | ACTIVE | Valid start |
| T-06 | READY | SWITCH_PATIENT | LOADING | Switch from ready |
| T-07 | ACTIVE | SAVE_DRAFT | SAVING | Auto-save triggered |
| T-08 | ACTIVE | OPEN_COMPLETE_DIALOG | COMPLETING | Open complete dialog |
| T-09 | ACTIVE | SWITCH_PATIENT | LOADING | Switch from active |
| T-10 | ACTIVE | PAUSE | PAUSED | Explicit pause |
| T-11 | ACTIVE | CONFIRM_COMPLETE | TRANSITIONING | Quick complete |
| T-12 | PAUSED | RESUME | ACTIVE | Resume session |
| T-13 | PAUSED | SWITCH_PATIENT | LOADING | Switch from paused |
| T-14 | SAVING | SAVE_SUCCESS | ACTIVE | Save succeeds |
| T-15 | SAVING | SAVE_CONFLICT | CONFLICT | Version conflict |
| T-16 | SAVING | SAVE_ERROR | ERROR | Save fails |
| T-17 | COMPLETING | CANCEL_COMPLETE | ACTIVE | Cancel complete |
| T-18 | COMPLETING | CONFIRM_COMPLETE | TRANSITIONING | Confirm complete |
| T-19 | TRANSITIONING | LOAD_NEXT_PATIENT | LOADING | Next patient exists |
| T-20 | TRANSITIONING | COMPLETE_SESSION | COMPLETED | No queue |
| T-21 | COMPLETED | RESET | IDLE | New session |
| T-22 | CONFLICT | RESOLVE_WITH_SERVER | ACTIVE | Server wins |
| T-23 | CONFLICT | RESOLVE_WITH_LOCAL | SAVING | Local wins |
| T-24 | CONFLICT | DISMISS_CONFLICT | ACTIVE | Dismiss conflict |
| T-25 | ERROR | RETRY | LOADING | Retry load |
| T-26 | ERROR | DISMISS_ERROR | IDLE | Dismiss error |
| T-27 | ERROR | SWITCH_PATIENT | LOADING | Switch from error |
| T-28 | ERROR | COMPLETION_RETRY | ACTIVE | Retry completion |

### 2.2 Invalid Transition Tests

For every forbidden transition in the forbidden matrix:

| Test ID | From | Action | Expected | Reason |
|---------|------|--------|----------|--------|
| TI-01 | IDLE | START_CONSULTATION | Failure | No session loaded |
| TI-02 | LOADING | OPEN_COMPLETE_DIALOG | Failure | Cannot complete before load |
| TI-03 | LOADING | SAVE_DRAFT | Failure | Cannot save before load |
| TI-04 | READY | OPEN_COMPLETE_DIALOG | Failure | No active consultation |
| TI-05 | READY | SAVE_DRAFT | Failure | No draft to save |
| TI-06 | READY | PAUSE | Failure | No active session |
| TI-07 | ACTIVE | TRANSITIONING | Failure | Must complete dialog |
| TI-08 | ACTIVE | READY | Failure | Cannot go back |
| TI-09 | ACTIVE | COMPLETED | Failure | Must confirm first |
| TI-10 | PAUSED | OPEN_COMPLETE_DIALOG | Failure | Must resume first |
| TI-11 | PAUSED | SAVE_DRAFT | Failure | Session paused |
| TI-12 | SAVING | OPEN_COMPLETE_DIALOG | Failure | Save must finish |
| TI-13 | SAVING | PAUSE | Failure | Save must finish |
| TI-14 | COMPLETING | SAVE_DRAFT | Failure | Dialog is open |
| TI-15 | TRANSITIONING | ACTIVE | Failure | Transition cannot reverse |
| TI-16 | TRANSITIONING | COMPLETING | Failure | Completion already done |
| TI-17 | COMPLETED | ACTIVE | Failure | Terminal state |
| TI-18 | CONFLICT | SAVE_DRAFT | Failure | Must resolve first |
| TI-19 | CONFLICT | OPEN_COMPLETE_DIALOG | Failure | Must resolve first |
| TI-20 | CONFLICT | SWITCH_PATIENT | Failure | Must resolve first |
| TI-21 | ERROR | ACTIVE | Failure | Must retry or dismiss |
| TI-22 | ERROR | OPEN_COMPLETE_DIALOG | Failure | Must retry first |
| TI-23 | ERROR | SAVE_DRAFT | Failure | Session in error |
| TI-24 | DOCUMENT | CONFIRM_COMPLETE | Failure | No session |

## 3. Guard Tests

### 3.1 Positive Guard Tests

For every guard, test that it passes when all conditions are met.

| Guard ID | Test Description |
|----------|-----------------|
| G-001 | ValidAppointmentId passes with positive integer |
| G-002 | UserAuthenticated passes with DOCTOR role |
| G-004 | AppointmentLoaded passes with successful response |
| G-005 | PatientLoaded passes with successful response |
| G-007 | PatientIdentityPreserved passes when patientId matches |
| G-008 | ConsultationStateValid passes with IN_PROGRESS |
| G-009 | AppointmentStatusReady passes with CHECKED_IN |
| G-010 | AppointmentStatusActive passes with IN_CONSULTATION |
| G-012 | AppointmentStatusAllowsStart passes with CHECKED_IN |
| G-013 | DoctorAssigned passes when doctorId matches |
| G-014 | AppointmentNotCompleted passes when not COMPLETED |
| G-016 | TargetAppointmentExists passes with different valid ID |
| G-017 | DraftSavedOrUserConfirmed passes when not dirty |
| G-018 | SaveTimeoutCleared passes when ref is null |
| G-021 | ConsultationInProgress passes with IN_PROGRESS |
| G-022 | AppointmentNotCompleted passes |
| G-023 | NotAlreadySaving passes |
| G-027 | ConsultationInProgress passes |
| G-028 | AppointmentNotTerminal passes |
| G-030 | NoActiveSave passes |
| G-031 | NoActiveConflict passes |
| G-033 | SessionActive passes with ACTIVE |
| G-034 | NoActiveSave passes |
| G-035 | NoActiveConflict passes |
| G-036 | NoPendingCompletion passes |
| G-041 | OutcomeSelected passes with non-null outcome |
| G-042 | NoPendingSave passes when Draft or Saved |
| G-044 | ConsultationInProgress passes |
| G-045 | AppointmentNotCompleted passes |
| G-046 | PatientIdentityVerified passes |
| G-047 | VersionCurrent passes when client version <= server |
| G-048 | BillingSummaryPresent passes (non-blocking default) |
| G-049 | QueueOwnershipValid passes |
| G-051 | NextPatientExists passes with queue entry |
| G-052 | NextPatientNotCurrent passes |
| G-053 | DoctorAuthorizedForNext passes |
| G-054 | NoNextPatient passes when queue empty |
| G-055 | AllCachesInvalidated passes |
| G-057 | ServerDataAvailable passes with non-null notes |
| G-059 | LocalNotesPresent passes |
| G-060 | LocalVersionTracked passes |
| G-062 | UserExplicitDismiss passes |
| G-064 | DraftTimestampValid passes with parseable ISO |
| G-065 | DraftTimestampNewer passes when draft > server |
| G-066 | DraftStructureValid passes |
| G-067 | DraftTimestampOlderOrEqual passes |
| G-069 | RetryCountNotExhausted passes with count < 3 |
| G-070 | ErrorIsRetryable passes with network error |
| G-071 | UserInitiatedRetry passes |
| G-072 | UserInitiatedDismiss passes |
| G-073 | NoPendingMutations passes |
| G-074 | PreviousStateWasCompleting passes |
| G-075 | AppointmentStillActive passes |
| G-076 | NoDataCorruption passes |

### 3.2 Negative Guard Tests

For every guard, test that it fails when its precondition is violated.

| Guard ID | Failed Condition | Expected Result |
|----------|------------------|-----------------|
| G-001 | appointmentId = 0 | `clinicalRisk: 'low'` |
| G-002 | user role = NURSE | `clinicalRisk: 'medium'` |
| G-004 | appointmentResponse = null | `clinicalRisk: 'critical'` |
| G-005 | patientResponse = null | `clinicalRisk: 'critical'` |
| G-007 | patientId !== appointment.patientId | `clinicalRisk: 'high'` |
| G-008 | consultation.state = COMPLETED | `clinicalRisk: 'high'` |
| G-009 | appointment.status = CANCELLED | `clinicalRisk: 'high'` |
| G-010 | appointment.status = CHECKED_IN | `clinicalRisk: 'high'` |
| G-012 | appointment.status = COMPLETED | `clinicalRisk: 'high'` |
| G-013 | doctorId mismatch | `clinicalRisk: 'high'` |
| G-014 | appointment.status = COMPLETED | `clinicalRisk: 'high'` |
| G-017 | isDirty = true, no user confirmation | `clinicalRisk: 'medium'` |
| G-021 | consultation.state = NOT_STARTED | `clinicalRisk: 'medium'` |
| G-022 | appointment.status = COMPLETED | `clinicalRisk: 'high'` |
| G-027 | consultation.state = COMPLETED | `clinicalRisk: 'high'` |
| G-028 | appointment.status = CANCELLED | `clinicalRisk: 'high'` |
| G-030 | DocumentationWorkflow = Saving | `clinicalRisk: 'medium'` |
| G-031 | DocumentationWorkflow = Conflict | `clinicalRisk: 'medium'` |
| G-033 | state = ERROR | `clinicalRisk: 'low'` |
| G-034 | DocumentationWorkflow = Saving | `clinicalRisk: 'medium'` |
| G-035 | DocumentationWorkflow = Conflict | `clinicalRisk: 'medium'` |
| G-036 | showCompleteDialog = true | `clinicalRisk: 'low'` |
| G-041 | outcomeType = null | `clinicalRisk: 'medium'` |
| G-042 | DocumentationWorkflow = Dirty, no user override | `clinicalRisk: 'high'` |
| G-044 | consultation.state = COMPLETED | `clinicalRisk: 'high'` |
| G-045 | appointment.status = CANCELLED | `clinicalRisk: 'high'` |
| G-046 | patientId mismatch | `clinicalRisk: 'high'` |
| G-047 | client.version ahead of server | `clinicalRisk: 'medium'` |
| G-049 | doctor not in queue | `clinicalRisk: 'high'` |
| G-051 | queue empty | `clinicalRisk: 'low'` |
| G-052 | nextPatient.id = current | `clinicalRisk: 'high'` |
| G-053 | doctor not authorized | `clinicalRisk: 'high'` |
| G-054 | next patient exists | `clinicalRisk: 'low'` |
| G-057 | refetched notes = null | `clinicalRisk: 'medium'` |
| G-059 | notes = empty/not present | `clinicalRisk: 'medium'` |
| G-062 | no explicit dismiss (programmatic) | `clinicalRisk: 'low'` |
| G-064 | draft.timestamp = invalid | `clinicalRisk: 'low'` |
| G-065 | draft.timestamp <= server | `clinicalRisk: 'low'` |
| G-066 | draft.structured/fullText = missing | `clinicalRisk: 'low'` |
| G-067 | draft.timestamp > server | (path not taken) |
| G-069 | retryCount >= 3 | `clinicalRisk: 'low'` |
| G-070 | error = 400 Bad Request | `clinicalRisk: 'medium'` |
| G-071 | automatic retry (not user-initiated) | `clinicalRisk: 'low'` |
| G-074 | previous state = ACTIVE | `clinicalRisk: 'low'` |
| G-075 | appointment.status = COMPLETED | `clinicalRisk: 'high'` |
| G-076 | client state differs from server | `clinicalRisk: 'medium'` |

## 4. Boundary Tests

### 4.1 Edge Case: Empty Notes

```typescript
test('SAVE_DRAFT passes with empty notes object', () => {
  const engine = createConsultationEngine(ACTIVE, buildContext({ notes: {} }));
  const result = engine.tryTransition(SAVE_DRAFT);
  expect(result.success).toBe(true);
});
```

### 4.2 Edge Case: Load Success When Doctor Not Found

```typescript
test('LOAD_SUCCESS returns READY when doctor fallback to user.id', () => {
  const engine = createConsultationEngine(LOADING, buildContext({
    doctorResponse: null,
    user: { id: 'user-123' },
  }));
  const result = engine.tryTransition(LOAD_SUCCESS);
  expect(result.success).toBe(true);
  expect(result.nextState).toBe(READY);
  expect(result.context.doctorId).toBe('user-123');
});
```

### 4.3 Edge Case: Retry Count Exhaustion

```typescript
test('RETRY fails when retryCount >= 3', () => {
  const engine = createConsultationEngine(ERROR, buildContext({ retryCount: 3 }));
  const result = engine.tryTransition(RETRY);
  expect(result.success).toBe(false);
  expect(result.guardFailures.some(g => g.guardId === 'G-069')).toBe(true);
});
```

### 4.4 Edge Case: Conflict Resolution with Null Server Notes

```typescript
test('RESOLVE_WITH_SERVER fails when server notes are null after refetch', () => {
  const engine = createConsultationEngine(CONFLICT, buildContext({
    refetchedNotes: null,
  }));
  const result = engine.tryTransition(RESOLVE_WITH_SERVER);
  expect(result.success).toBe(false);
  expect(result.guardFailures.some(g => g.guardId === 'G-057')).toBe(true);
});
```

### 4.5 Edge Case: Completion With User-Confirmed Unsaved Changes

```typescript
test('CONFIRM_COMPLETE passes when DocumentationWorkflow = Failed but user confirmed', () => {
  const engine = createCoordinator(COMPLETING, buildContext({
    documentationWorkflow: DocumentationWorkflowState.Failed,
    userConfirmProceed: true,
  }));
  const result = coordinator.execute(CONFIRM_COMPLETE);
  expect(result.success).toBe(true);
  expect(result.consultationResult.nextState).toBe(TRANSITIONING);
});
```

## 5. Failure Tests

### 5.1 Mutation Failure During Save

```typescript
test('SAVE_SUCCESS fails when mutation throws non-conflict error', async () => {
  const engine = createConsultationEngine(ACTIVE, buildContext({ notes: dirtyNotes }));
  const result = await engine.tryTransitionWithMutation(SAVE_DRAFT, mockMutation({
    throws: new Error('Network error'),
    isConflict: false,
  }));
  expect(result.success).toBe(false);
  expect(result.nextState).toBe(ERROR);
});
```

### 5.2 Completion API Failure

```typescript
test('CONFIRM_COMPLETE fails when completion API throws', async () => {
  const coordinator = createCoordinator(COMPLETING, buildContext({
    completionApi: mockApi({ throws: new Error('DB timeout') }),
  }));
  const result = await coordinator.execute(CONFIRM_COMPLETE);
  expect(result.success).toBe(false);
  expect(result.consultationResult.nextState).toBe(ERROR);
});
```

### 5.3 localStorage Quota Exceeded

```typescript
test('SAVE_SUCCESS emits STORAGE_UNAVAILABLE warning when localStorage fails', async () => {
  const engine = createConsultationEngine(ACTIVE, buildContext({
    localStorage: mockLocalStorage({ quotaExceeded: true }),
  }));
  const result = await engine.tryTransitionWithMutation(SAVE_SUCCESS);
  expect(result.success).toBe(true);
  expect(result.sideEffects).toContainEqual({
    type: 'toast',
    severity: 'warning',
    message: expect.stringContaining('localStorage'),
  });
});
```

### 5.4 Network Timeout During Load

```typescript
test('LOAD_ERROR transitions to ERROR on AbortSignal timeout', async () => {
  const engine = createConsultationEngine(LOADING, buildContext({
    abortSignal: mockAbortSignal({ timedOut: true }),
  }));
  const result = await engine.tryTransition(LOAD_ERROR);
  expect(result.success).toBe(true);
  expect(result.nextState).toBe(ERROR);
});
```

## 6. Recovery Tests

### 6.1 Retry Load After Error

```typescript
test('ERROR → RETRY → LOADING allows successful retry', async () => {
  let callCount = 0;
  const engine = createConsultationEngine(ERROR, buildContext({
    fetchAppointment: mockApi((callCount++) % 2 === 0 ? throws : succeeds),
  }));

  const retryResult = engine.tryTransition(RETRY);
  expect(retryResult.success).toBe(true);
  expect(retryResult.nextState).toBe(LOADING);

  // After async load completes
  await act(async () => {
    await engine.completePendingTransition();
  });

  const state = engine.currentState;
  expect(state).toBe(READY);
});
```

### 6.2 Conflict Recovery Paths

```typescript
test.each([
  { resolution: RESOLVE_WITH_SERVER, expected: ACTIVE },
  { resolution: RESOLVE_WITH_LOCAL, expected: SAVING },
  { resolution: DISMISS_CONFLICT, expected: ACTIVE },
])('CONFLICT → $resolution → $expected', async ({ resolution, expected }) => {
  const engine = createConsultationEngine(CONFLICT, buildContext({ notes: dirtyNotes }));
  const result = engine.tryTransition(resolution);
  expect(result.success).toBe(true);
  expect(result.nextState).toBe(expected);
});
```

### 6.3 Completion Recovery

```typescript
test('ERROR → COMPLETION_RETRY → ACTIVE when appointment still active', async () => {
  const engine = createConsultationEngine(ERROR, buildContext({
    previousState: TRANSITIONING,
    appointmentStatus: 'IN_CONSULTATION',
  }));
  const result = engine.tryTransition(COMPLETION_RETRY);
  expect(result.success).toBe(true);
  expect(result.nextState).toBe(ACTIVE);
});
```

## 7. Clinical Scenario Tests

### 7.1 Scenario: Complete Consultation With Unsaved Notes

```typescript
test('CLINICAL: Doctor completes consultation with unsaved notes — prompt and allow proceed', async () => {
  const coordinator = createCoordinator(ACTIVE, buildContext({
    notes: dirtyNotes,
    documentationWorkflow: DocumentationWorkflowState.Dirty,
    outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
    userConfirmProceed: true,
  }));

  const result = await coordinator.execute(CONFIRM_COMPLETE);
  expect(result.success).toBe(true);
  expect(result.consultationResult.nextState).toBe(TRANSITIONING);
});
```

### 7.2 Scenario: Switch Patient With Dirty Notes

```typescript
test('CLINICAL: Doctor switches patient with dirty notes — save succeeds then switch', async () => {
  const coordinator = createCoordinator(ACTIVE, buildContext({
    notes: dirtyNotes,
    targetAppointmentId: 99,
  }));

  const result = await coordinator.execute(SWITCH_PATIENT);
  expect(result.success).toBe(true);
  expect(result.documentationResult?.nextState).toBe(Document);
  expect(result.sideEffects.some(e => e.type === 'navigation')).toBe(true);
});
```

### 7.3 Scenario: Resume Existing Consultation

```typescript
test('CLINICAL: Resume existing IN_CONSULTATION consultation preserves workspace', async () => {
  const engine = createConsultationEngine(LOADING, buildContext({
    appointmentStatus: 'IN_CONSULTATION',
    consultationState: ConsultationState.IN_PROGRESS,
  }));

  const result = engine.tryTransition(LOAD_SUCCESS);
  expect(result.success).toBe(true);
  expect(result.nextState).toBe(ACTIVE);
});
```

### 7.4 Scenario: Version Conflict Blocks Completion

```typescript
test('CLINICAL: Version conflict during completion — guard blocks terminal action', async () => {
  const coordinator = createCoordinator(COMPLETING, buildContext({
    documentationWorkflow: DocumentationWorkflowState.Conflict,
  }));

  const result = await coordinator.execute(CONFIRM_COMPLETE);
  expect(result.success).toBe(false);
  expect(result.guardFailures.some(g => g.guardId === 'G-031')).toBe(true);
});
```

## 8. Property-Based Tests

Using `fast-check`.

### 8.1 Invariant: State Always In ValidTransitions

```typescript
test('state is always in VALID_TRANSITIONS keys', () => {
  fc.assert(fc.property(fc.constantFrom(...allStates), (state) => {
    return state in VALID_TRANSITIONS;
  }));
});
```

### 8.2 Invariant: getNextState Never Returns Non-Terminal From Terminal

```typescript
test('COMPLETED state never transitions to non-terminal via any action', () => {
  fc.assert(fc.property(fc.constantFrom(...allActions), (action) => {
    const result = getNextState(COMPLETED, action);
    expect(result).toBeNull();
  }));
});
```

### 8.3 Invariant: canPerformAction Consistent With getNextState

```typescript
test('canPerformAction returns true iff getNextState returns non-null', () => {
  fc.assert(fc.property(
    fc.constantFrom(...allStates),
    fc.constantFrom(...allActions),
    (state, action) => {
      const can = canPerformAction(state, action);
      const next = getNextState(state, action);
      return can === (next !== null);
    }
  ));
});
```

### 8.4 Invariant: DocumentationEngine State Transitions Match Documentation States

```typescript
test('DocumentationEngine always transitions to a valid DocumentationWorkflowState', () => {
  fc.assert(fc.property(
    fc.constantFrom(...docStates),
    fc.constantFrom(...docActions),
    (state, action) => {
      const engine = createDocEngine(state);
      const result = engine.tryTransition(action);
      if (result.success) {
        return docStates.includes(result.nextState as DocumentationWorkflowState);
      }
      return true;
    }
  ));
});
```

### 8.5 Invariant: Session Correlation Id Persists Across Transitions

```typescript
test('correlationId does not change across transitions', () => {
  const engine = createConsultationEngine(IDLE, buildContext({ correlationId: 'session-1' }));
  let result = engine.tryTransition(LOAD_PATIENT);
  expect(result.correlationId).toBe('session-1');
  // Simulate success and continue
  result = engine.tryTransition(LOAD_SUCCESS);
  expect(result.correlationId).toBe('session-1');
});
```

## 9. Mutation Tests

Using `stryker` or custom fault injection.

### 9.1 Fault: getNextState Returns Non-Terminal From Terminal

**Mutation:** In `ConsultationWorkflowState.ts`, change `COMPLETED → IDLE` to return `COMPLETING` instead.

**Expected:** Test T-21 detects failure.

### 9.2 Fault: Guard Always Passes

**Mutation:** Change `G-042` to always return `{ passed: true }`.

**Expected:** Clinical scenario test 7.1 detects failure — notes allowed to complete without save.

### 9.3 Fault: Side Effect Omission

**Mutation:** Remove `clearStorage` side effect from `COMPLETING → TRANSITIONING`.

**Expected:** Integration test detects stale draft in localStorage after completion.

### 9.4 Fault: canPerformAction Uses Wrong State

**Mutation:** Change `canPerformAction` to check `VALID_TRANSITIONS[IDLE]` instead of current state.

**Expected:** All transition tests fail for non-IDLE states.

## 10. Integration Tests

### 10.1 File: `workflow-integration.test.ts`

```typescript
describe('Workflow Integration', () => {
  test('Full session: IDLE → READY → ACTIVE → COMPLETING → TRANSITIONING → COMPLETED', async () => {
    const coordinator = createSession();
    
    await coordinator.execute(LOAD_PATIENT, { appointmentId: 1 });
    expect(coordinator.consultationEngine.currentState).toBe(READY);

    await coordinator.execute(START_CONSULTATION);
    expect(coordinator.consultationEngine.currentState).toBe(ACTIVE);

    coordinator.consultationEngine.updateNotes('chiefComplaint', 'Headache');
    await waitForAutoSave();
    expect(coordinator.documentationEngine.currentState).toBe(Draft);

    await coordinator.execute(OPEN_COMPLETE_DIALOG);
    expect(coordinator.consultationEngine.currentState).toBe(COMPLETING);

    await coordinator.execute(CONFIRM_COMPLETE);
    expect(coordinator.consultationEngine.currentState).toBe(TRANSITIONING);

    await coordinator.execute(COMPLETE_SESSION);
    expect(coordinator.consultationEngine.currentState).toBe(COMPLETED);
  });
});
```

## 11. Behavioral Parity Tests

These tests prove the new engine behaves identically to the current `ConsultationContext.tsx` reducer.

### 11.1 Baseline Capture

For every production `SET_WORKFLOW_STATE` dispatch in `ConsultationContext.tsx`, record:
- Current state before dispatch
- Action dispatched
- Expected next state

### 11.2 Parity Verification

```typescript
test('workflow engine matches reducer behavior for all production transitions', () => {
  const baseline = loadProductionBaseline(); // from consultant output
  for (const { from, action, to } of baseline) {
    const engine = createConsultationEngine(from, buildContext());
    const result = engine.tryTransition(action);
    expect(result.success).toBe(true);
    expect(result.nextState).toBe(to);
  }
});
```

### 11.3 Side Effect Parity

```typescript
test('workflow engine side effects match current reducer side effects', () => {
  const baseline = loadSideEffectBaseline();
  for (const { from, action, expectedEffects } of baseline) {
    const engine = createConsultationEngine(from, buildContext());
    const effects = engine.getSideEffectsForTransition(action);
    expect(effects).toEqual(expectedEffects);
  }
});
```

## Test Infrastructure

### Mock Factories

```typescript
function buildEmptyContext(): TransitionContext;
function buildContext(overrides: Partial<TransitionContext>): TransitionContext;
function createConsultationEngine(initialState, context): WorkflowEngine;
function createDocumentationEngine(initialState, context): DocumentationEngine;
function createSession(): WorkflowCoordinator;
```

### Test Utilities

```typescript
function advanceAutoSaveTimer(engine, ms: number): Promise<void>;
function mockMutation(options: { throws?, isConflict?, success? }): MutationFn;
function mockApi(options: { success?, data?, throws?, delay? }): ApiFn;
function act(fn: () => Promise<void>): Promise<void>;
```

### Coverage Enforcement

```bash
vitest --coverage --reporter=json > coverage.json
# Then verify:
# - statements >= 95%
# - branches >= 90%
# - functions >= 95%
# - lines >= 95%
```

## Non-Negotiable Test Rules

1. No test may be added without a corresponding production transition or guard
2. No test may assert internal private state — only public contracts
3. No test may mock the engine itself — only its dependencies
4. No behavioral parity test may be modified to match new engine behavior — production behavior is the baseline
5. Every mutation test must fail before the guard is strengthened; if it passes, the mutation is not meaningful
