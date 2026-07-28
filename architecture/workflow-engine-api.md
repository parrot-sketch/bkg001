# Workflow Engine API

## Purpose

This document defines the contracts for the Workflow Engine APIs: `WorkflowEngine`, `DocumentationEngine`, transition result types, guard types, context types, and the command model. No implementation is provided.

## Design Principles

1. **Interfaces over classes** — consumers depend on contracts, not implementations
2. **Immutable state** — engines never mutate input state; transitions return new state
3. **Explicit errors** — no thrown exceptions for invalid transitions; return typed results
4. **Extensible via events** — new consumers attach without changing engine code
5. **Testability** — engines are pure functions with no React, no HTTP, no localStorage

## TransitionResult

Represents the outcome of a transition attempt.

```typescript
interface TransitionResult<TState = ConsultationWorkflowState> {
  readonly success: boolean;
  readonly previousState: TState;
  readonly nextState: TState | null;
  readonly guardFailures: GuardResult[];
  readonly sideEffects: SideEffect[];
  readonly transitions: WorkflowTransition[];
  readonly error: WorkflowError | null;
}

type SideEffect =
  | { type: 'toast'; message: string; severity: 'info' | 'success' | 'error' | 'warning' }
  | { type: 'invalidatCache'; queryKey: string[] }
  | { type: 'clearStorage'; key: string }
  | { type: 'startHeartbeat'; consultationId: number }
  | { type: 'stopHeartbeat' }
  | { type: 'startAutoSave'; debounceMs: number }
  | { type: 'stopAutoSave' }
  | { type: 'navigation'; path: string }
  | { type: 'event'; eventType: string; payload: unknown };
```

## GuardResult

Represents the outcome of a guard check.

```typescript
type GuardResult =
  | { passed: true }
  | { passed: false; reason: string; clinicalRisk: ClinicalRisk; guardId: string };

type ClinicalRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';
```

## TransitionContext

Carries all data a guard or transition handler needs without requiring external imports.

```typescript
interface TransitionContext {
  readonly appointmentId: number | null;
  readonly patientId: string | null;
  readonly consultationId: number | null;
  readonly doctorId: string | null;
  readonly appointment: AppointmentStateSnapshot | null;
  readonly consultation: ConsultationStateSnapshot | null;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
  readonly isDirty: boolean;
  readonly lastSavedAt: number | null;
  readonly version: string | null;
  readonly consultationWorkflowState: ConsultationWorkflowState;
  readonly documentationWorkflowState: DocumentationWorkflowState;
  readonly queue: QueueSnapshot | null;
  readonly user: UserContextSnapshot;
  readonly retryCount: number;
  readonly metadata: Record<string, unknown>;
}
```

**Snapshot types** (immutable views of mutable domain data):

```typescript
interface AppointmentStateSnapshot {
  readonly id: number;
  readonly patientId: string;
  readonly doctorId: string;
  readonly status: AppointmentStatus;
  readonly slotStartTime: string;
  readonly slotDurationMinutes: number;
}

interface ConsultationStateSnapshot {
  readonly id: number;
  readonly appointmentId: number;
  readonly state: ConsultationStateEnum;
  readonly version: string;
  readonly updatedAt: string;
  readonly notes: NotesSnapshot | null;
}

interface NotesSnapshot {
  readonly fullText: string;
  readonly structured: StructuredNotes;
}

interface QueueSnapshot {
  readonly inConsultation: AppointmentStateSnapshot[];
  readonly waiting: AppointmentStateSnapshot[];
  readonly doctorId: string;
}

interface UserContextSnapshot {
  readonly id: string;
  readonly role: UserRole;
  readonly name: string;
}
```

## WorkflowEngine

The state machine for consultation session lifecycle.

### Interface

```typescript
interface WorkflowEngine {
  readonly currentState: ConsultationWorkflowState;
  readonly context: TransitionContext;

  getValidActions(): readonly ConsultationWorkflowAction[];

  canPerformAction(action: ConsultationWorkflowAction): boolean;

  tryTransition(
    action: ConsultationWorkflowAction,
    metadata?: Record<string, unknown>
  ): TransitionResult<ConsultationWorkflowState>;

  validateTransition(action: ConsultationWorkflowAction): GuardResult[];

  reset(): TransitionResult<ConsultationWorkflowState>;

  getSideEffectsForTransition(
    action: ConsultationWorkflowAction
  ): readonly SideEffect[];
}
```

### Method Contracts

#### `getValidActions()`

- **Input:** none
- **Output:** readonly array of legal `ConsultationWorkflowAction` values for `currentState`
- **Error:** never fails

#### `canPerformAction(action)`

- **Input:** `ConsultationWorkflowAction`
- **Output:** `boolean` — `true` if `action` is in `VALID_TRANSITIONS[currentState]`
- **Error:** never fails
- **Note:** `canPerformAction` checks structural validity only. Guards (`validateTransition`) check business rules. A transition can pass `canPerformAction` and still fail `validateTransition`.

#### `validateTransition(action)`

- **Input:** `ConsultationWorkflowAction`
- **Output:** `GuardResult[]` — empty if all guards pass, populated if any fail
- **Error:** never fails
- **Order:** Returns guard failures in execution order. First failure is the blocking guard.

#### `tryTransition(action, metadata?)`

- **Input:** action, optional metadata overrides
- **Output:** `TransitionResult`
- **Behavior:**
  1. Check `canPerformAction`. If false, return `{ success: false, nextState: null, error: INVALID_ACTION }`.
  2. Run `validateTransition`. If any guard fails, return `{ success: false, nextState: null, guardFailures }`.
  3. Compute `nextState` via `getNextState`.
  4. Run `onEnter` hooks for `nextState`.
  5. Collect side effects.
  6. Return `TransitionResult` with `success: true` and `nextState`.

#### `reset()`

- **Input:** none
- **Output:** `TransitionResult` transitioning to `IDLE`
- **Behavior:** Clears all context data; emits `RESET` side effects.

#### `getSideEffectsForTransition(action)`

- **Input:** `ConsultationWorkflowAction`
- **Output:** readonly array of `SideEffect` objects that should fire on this transition
- **Error:** never fails
- **Note:** This is a query — it does not mutate state. Use `tryTransition` to apply.

## DocumentationEngine

The state machine for clinical notes (draft) lifecycle.

### Interface

```typescript
interface DocumentationEngine {
  readonly currentState: DocumentationWorkflowState;
  readonly context: DocumentationContext;

  getValidActions(): readonly DocumentationAction[];

  canPerformAction(action: DocumentationAction): boolean;

  tryTransition(
    action: DocumentationAction,
    metadata?: Record<string, unknown>
  ): TransitionResult<DocumentationWorkflowState>;

  validateTransition(action: DocumentationAction): GuardResult[];

  getSideEffectsForTransition(
    action: DocumentationAction
  ): readonly SideEffect[];
}
```

### DocumentationContext

```typescript
interface DocumentationContext {
  readonly appointmentId: number | null;
  readonly consultationId: number | null;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
  readonly version: string | null;
  readonly lastSavedAt: number | null;
  readonly dirtyFields: readonly NoteField[];
  readonly hasLocalDraft: boolean;
  readonly localDraftTimestamp: number | null;
}

type NoteField = keyof StructuredNotes | 'outcome' | 'patientDecision';
```

## DocumentaionActions

```typescript
enum DocumentationAction {
  // Lifecycle
  CREATE_DRAFT = 'CREATE_DRAFT',
  EDIT_NOTES = 'EDIT_NOTES',
  SAVE = 'SAVE',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  COMPLETE = 'COMPLETE',

  // Outcomes
  SAVE_SUCCESS = 'SAVE_SUCCESS',
  SAVE_CONFLICT = 'SAVE_CONFLICT',
  SAVE_ERROR = 'SAVE_ERROR',

  // Conflict
  RESOLVE_WITH_SERVER = 'RESOLVE_WITH_SERVER',
  RESOLVE_WITH_LOCAL = 'RESOLVE_WITH_LOCAL',
  DISMISS_CONFLICT = 'DISMISS_CONFLICT',

  // Recovery
  RESTORE_DRAFT = 'RESTORE_DRAFT',
  RESTORE_SUCCESS = 'RESTORE_SUCCESS',
  RESTORE_NOOP = 'RESTORE_NOOP',

  // Retry
  RETRY_SAVE = 'RETRY_SAVE',
}
```

## WorkflowEngineFactory

Creates engines with injected dependencies.

```typescript
interface WorkflowEngineFactory {
  createConsultationEngine(
    initialState: ConsultationWorkflowState,
    context: TransitionContext
  ): WorkflowEngine;

  createDocumentationEngine(
    initialState: DocumentationWorkflowState,
    context: DocumentationContext
  ): DocumentationEngine;
}
```

## WorkflowCoordinator

Orchestrates `WorkflowEngine` and `DocumentationEngine` together.

```typescript
enum CoordinatorCommand {
  LOAD_PATIENT = 'LOAD_PATIENT',
  START_CONSULTATION = 'START_CONSULTATION',
  SAVE_DRAFT = 'SAVE_DRAFT',
  OPEN_COMPLETE_DIALOG = 'OPEN_COMPLETE_DIALOG',
  CANCEL_COMPLETE = 'CANCEL_COMPLETE',
  CONFIRM_COMPLETE = 'CONFIRM_COMPLETE',
  SWITCH_PATIENT = 'SWITCH_PATIENT',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  RETRY = 'RETRY',
  DISMISS_ERROR = 'DISMISS_ERROR',
  COMPLETION_RETRY = 'COMPLETION_RETRY',
}

interface WorkflowCoordinator {
  readonly consultationEngine: WorkflowEngine;
  readonly documentationEngine: DocumentationEngine;

  execute(command: CoordinatorCommand, metadata?: Record<string, unknown>): CoordinatorResult;

  canExecute(command: CoordinatorCommand): GuardResult[];

  getCurrentStates(): {
    consultation: ConsultationWorkflowState;
    documentation: DocumentationWorkflowState;
  };
}

interface CoordinatorResult {
  readonly success: boolean;
  readonly consultationResult: TransitionResult<ConsultationWorkflowState>;
  readonly documentationResult: TransitionResult<DocumentationWorkflowState> | null;
  readonly combinedSideEffects: SideEffect[];
  readonly events: WorkflowEvent[];
}
```

### Coordinator Execution Rules

When `execute` is called:

1. Derive `ConsultationWorkflowAction` and `DocumentationAction` from the command
2. Call `consultationEngine.tryTransition`
3. If consultation transition succeeds and documentation action is implied, call `documentationEngine.tryTransition`
4. Merge side effects from both engines (deduplicate by type)
5. Emit workflow events for successful transitions
6. Return `CoordinatorResult`

**Example: SAVE_DRAFT command**

```
Command: SAVE_DRAFT
    ↓
Consultation: ACTIVE → SAVING (action: SAVE_DRAFT)
Documentation: Dirty → Saving (action: SAVE)
    ↓
SideEffects: [startHeartbeat, stopAutoSave, showToast('Saving...')]
Events: [DocumentationSaving (internal, no event) — actual event emitted on SAVE_SUCCESS]
```

**Example: CONFIRM_COMPLETE command**

```
Command: CONFIRM_COMPLETE
    ↓
Consultation: COMPLETING → TRANSITIONING (action: CONFIRM_COMPLETE)
Documentation: (any) → Document (implicit on completion)
    ↓
SideEffects: [clearStorage, invalidatCache x7, stopHeartbeat, navigation]
Events: [ConsultationCompleted]
```

## Error Model

All engine errors are typed:

```typescript
type WorkflowError =
  | { code: 'INVALID_ACTION'; message: string; action: string; state: string }
  | { code: 'GUARD_FAILED'; message: string; guardId: string; reason: string; clinicalRisk: ClinicalRisk }
  | { code: 'TRANSITION_FAILED'; message: string; from: string; to: string; cause?: unknown }
  | { code: 'ENGINE_CORRUPTED'; message: string; detail: string }
  | { code: 'CONTEXT_MISSING'; message: string; field: string };
```

**Error Codes:**
- `INVALID_ACTION` — action not allowed from current state
- `GUARD_FAILED` — guard rejected transition
- `TRANSITION_FAILED` — transition logic threw
- `ENGINE_CORRUPTED` — invariant violation (e.g., two transitions in the same frame)
- `CONTEXT_MISSING` — required context field is null

## Extensibility Points

### 1. Custom Guards

Consumers register guard functions:

```typescript
interface GuardRegistration {
  action: ConsultationWorkflowAction;
  from: ConsultationWorkflowState;
  guard: (ctx: TransitionContext) => GuardResult;
}

engine.registerGuard(registration);
```

### 2. Side Effect Plugins

Consumers register side effect handlers:

```typescript
interface SideEffectHandler {
  sideEffect: SideEffect;
  handler: (effect: SideEffect) => void | Promise<void>;
}

engine.registerSideEffectHandler(handler);
```

### 3. Event Plugins

The event bus supports subscription without modifying the engine:

```typescript
eventBus.subscribe('ConsultationCompleted', (event) => {
  // Custom consumer logic
});
```

### 4. State Transition Hooks

Consumers register lifecycle hooks:

```typescript
interface TransitionHook {
  onEnter?: (state: ConsultationWorkflowState, ctx: TransitionContext) => void;
  onExit?: (state: ConsultationWorkflowState, ctx: TransitionContext) => void;
}

engine.registerHook(ConsultationWorkflowState.ACTIVE, hook);
```

## Integration Contracts

### React Context Integration

The `ConsultationProvider` consumes the engine:

```typescript
function ConsultationProvider({ children, initialAppointmentId }: Props) {
  const [engine] = useState(() => createConsultationEngine(IDLE, buildContext()));
  const [state, setState] = useState(engine.currentState);

  const dispatch = useCallback((action: ConsultationWorkflowAction) => {
    const result = engine.tryTransition(action);
    if (result.success && result.nextState) {
      setState(result.nextState);
      result.sideEffects.forEach(applySideEffect);
    }
    return result;
  }, [engine]);

  // ...
}
```

### Hook Integration

```typescript
function useWorkflowEngine(): WorkflowEngine {
  return useContext(WorkflowEngineContext);
}

function useDocumentationEngine(): DocumentationEngine {
  return useContext(DocumentationEngineContext);
}
```

### Query Integration

React Query cache invalidation is a side effect, not a direct call:

```typescript
// Engine returns side effect
const result = engine.tryTransition(START_CONSULTATION);
result.sideEffects.forEach(effect => {
  if (effect.type === 'invalidateCache') {
    queryClient.invalidateQueries({ queryKey: effect.queryKey });
  }
});
```
