# Workflow Implementation Sequence

## Purpose

This document breaks the Workflow Engine implementation into PR-sized steps. Each PR compiles, deploys, and rolls back independently. No PR depends on unfinished work from another PR.

## Implementation Order

### PR-A04-01: Domain State Machines

**Concern:** Extract pure state machines into Domain Layer
**Duration:** 1 day
**Risk:** Low
**Rollback:** Git revert

**Tasks:**
1. Create `domain/workflows/ConsultationWorkflowState.ts` with states, actions, VALID_TRANSITIONS, getNextState, canPerformAction, createInitialContext
2. Create `domain/workflows/DocumentationWorkflow.ts` with states, actions, VALID_TRANSITIONS, getNextState, canPerformAction, createInitialContext
3. Write unit tests for both state machines (all valid/invalid transitions)
4. Verify 100% transition coverage for state machines

**Deliverable:** Pure state machines with zero dependencies on React, HTTP, or localStorage

**Acceptance Criteria:**
- `tsc --noEmit` passes
- 100% unit test coverage for state machines
- `npm run test:unit` passes

---

### PR-A04-02: Guard Infrastructure

**Concern:** Implement guard framework and all 73 guards
**Duration:** 1 day
**Risk:** Low
**Rollback:** Git revert

**Tasks:**
1. Create `domain/workflows/guards/` directory
2. Create `GuardResult` type in `shared-kernel/types/workflow.ts`
3. Implement each guard function as pure function:
   - `validateLoadPatient(ctx): GuardResult[]`
   - `validateStartConsultation(ctx): GuardResult[]`
   - `validateSaveDraft(ctx): GuardResult[]`
   - `validateCompleteConsultation(ctx): GuardResult[]`
   - etc.
4. Write unit tests for every guard (positive + negative)
5. Create guard registry map

**Deliverable:** All guards implemented and tested

**Acceptance Criteria:**
- 100% guard test coverage
- All guards are pure functions with no side effects
- `npm run test:unit` passes

---

### PR-A04-03: Side Effect Model

**Concern:** Define side effect types and mapping
**Duration:** 1 day
**Risk:** Low
**Rollback:** Git revert

**Tasks:**
1. Create `shared-kernel/types/workflow-events.ts` with `SideEffect` discriminated union
2. Create `SideEffectHandler` interface
3. Implement `getSideEffectsForTransition()` for both state machines
4. Write unit tests verifying side effect emission for every transition
5. Create `WorkflowEvent` envelope type

**Deliverable:** Side effect catalog complete

**Acceptance Criteria:**
- Every transition has documented side effects
- Side effect types are serializable
- `npm run test:unit` passes

---

### PR-A04-04: WorkflowEngine Implementation

**Concern:** Implement the WorkflowEngine class
**Duration:** 1 day
**Risk:** Medium
**Rollback:** Git revert

**Tasks:**
1. Create `application/workflow/WorkflowEngine.ts`
2. Implement constructor with injected guard registry
3. Implement `canPerformAction()`, `validateTransition()`, `tryTransition()`
4. Implement `getSideEffectsForTransition()`
5. Implement `reset()`
6. Write unit tests for all engine methods
7. Write transition tests (all valid + invalid transitions)

**Deliverable:** Pure WorkflowEngine class

**Acceptance Criteria:**
- Engine is pure TypeScript with no React/HTTP/localStorage dependencies
- All transitions produce correct TransitionResult
- All guard failures are reported
- `npm run test:unit` passes

---

### PR-A04-05: DocumentationEngine Implementation

**Concern:** Implement the DocumentationEngine class
**Duration:** 1 day
**Risk:** Medium
**Rollback:** Git revert

**Tasks:**
1. Create `application/workflow/DocumentationEngine.ts`
2. Implement constructor with injected guard registry
3. Implement all DocumentationWorkflow transitions
4. Implement autosave integration hooks
5. Implement conflict recovery hooks
6. Write unit tests for all DocumentationWorkflow transitions

**Deliverable:** Pure DocumentationEngine class

**Acceptance Criteria:**
- Engine is pure TypeScript
- Dirty → Saving → Saved/Saved/Conflict transitions work
- Draft recovery transitions work
- `npm run test:unit` passes

---

### PR-A04-06: WorkflowCoordinator Implementation

**Concern:** Implement the WorkflowCoordinator that orchestrates both engines
**Duration:** 1 day
**Risk:** Medium
**Rollback:** Git revert

**Tasks:**
1. Create `application/workflow/WorkflowCoordinator.ts`
2. Implement `execute(command, metadata)` method
3. Implement `canExecute(command)` method
4. Implement `getCurrentStates()` method
5. Write unit tests for all coordinator commands
6. Write integration tests for ConsultationWorkflow + DocumentationWorkflow coordination

**Deliverable:** Coordinator that routes commands to both engines

**Acceptance Criteria:**
- Single command can trigger transitions in both engines
- Side effects are merged and deduplicated
- Events are emitted for successful transitions
- `npm run test:unit` passes

---

### PR-A04-07: ConsultationContext Integration

**Concern:** Replace SET_WORKFLOW_STATE with coordinator commands
**Duration:** 1 day
**Risk:** High
**Rollback:** Git revert

**Tasks:**
1. Create `WorkflowCoordinatorProvider` in `contexts/` (temp context for engine)
2. Instantiate coordinator in ConsultationProvider
3. Replace ALL `dispatch({ type: 'SET_WORKFLOW_STATE' })` calls with `coordinator.execute(command)`
4. Replace direct `SET_AUTO_SAVE_STATUS` mutations with DocumentationEngine reads
5. Replace direct `isDirty` mutations with DocumentationEngine reads
6. Keep reducer as thin wrapper around coordinator
7. Write behavioral parity tests comparing old vs new behavior

**Deliverable:** ConsultationContext delegates 100% of workflow transitions to coordinator

**Acceptance Criteria:**
- Zero `SET_WORKFLOW_STATE` dispatches remain
- All workflow state reads come from coordinator
- UI behavior is identical (behavioral parity tests pass)
- `npm run test:unit` passes
- `npm run test:frontend` passes

---

### PR-A04-08: Side Effect Handlers

**Concern:** Implement React-specific side effect handlers
**Duration:** 1 day
**Risk:** Medium
**Rollback:** Git revert

**Tasks:**
1. Implement `toast` side effect handler
2. Implement `invalidateCache` side effect handler (uses React Query)
3. Implement `clearStorage` side effect handler (uses localStorage)
4. Implement `startHeartbeat` / `stopHeartbeat` side effect handlers
5. Implement `startAutoSave` / `stopAutoSave` side effect handlers
6. Implement `navigation` side effect handler (uses Next.js router)
7. Write tests for all side effect handlers

**Deliverable:** All side effects wired to Presentation Layer

**Acceptance Criteria:**
- Side effects execute correctly in test environment
- No side effect handler imports Domain or Application logic directly
- Handlers are registered via plugin interface
- `npm run test:unit` passes

---

### PR-A04-09: Event Bus Integration

**Concern:** Wire workflow events to event bus
**Duration:** 1 day
**Risk:** Low
**Rollback:** Git revert

**Tasks:**
1. Implement `EventBus` interface in Shared Kernel
2. Implement in-memory event bus for tests
3. Wire coordinator to emit events on successful transitions
4. Implement `AuditService` event consumer
5. Implement `NotificationService` event consumer
6. Write tests for event ordering, idempotency, retry

**Deliverable:** Event-driven side effects

**Acceptance Criteria:**
- Events emitted for all documented transitions
- Events are ordered by timestamp
- Consumers can subscribe without modifying engine
- `npm run test:unit` passes

---

### PR-A04-10: Clinical Scenario Tests & Validation

**Concern:** End-to-end clinical workflow validation
**Duration:** 1 day
**Risk:** High
**Rollback:** Git revert

**Tasks:**
1. Write clinical scenario tests (patient arrival, resume, draft restore, autosave, manual save, switch, version conflict, network failure, queue progression, completion)
2. Write property-based tests (random state mutations, invariant checks)
3. Write mutation tests (fault injection in guards)
4. Run behavioral parity tests against current ConsultationContext
5. Run all existing tests (unit + frontend)
6. Fix any regressions

**Deliverable:** Complete test suite with clinical validation

**Acceptance Criteria:**
- ~420 tests pass
- Behavioral parity: old and new produce identical outcomes
- No regressions in existing tests
- All clinical safety guards tested

---

### PR-A04-11: Feature Flag & Gradual Rollout

**Concern:** Deploy behind feature flag
**Duration:** 1 day (deployment)
**Risk:** Medium
**Rollback:** Feature flag disable

**Tasks:**
1. Add `USE_WORKFLOW_ENGINE` feature flag
2. Wire flag into ConsultationProvider: flag ON uses coordinator, flag OFF uses legacy reducer
3. Deploy to staging
4. Validate with one doctor for 1 day
5. Monitor metrics (transition rejections, guard failures, error rates)
6. If successful: cut over to flag ON for all users
7. Remove legacy reducer paths (shim-first replacement)

**Deliverable:** Production deployment with safety net

**Acceptance Criteria:**
- Feature flag defaults to OFF
- Staging validation passes with zero issues
- Production rollout completes with zero regressions
- Legacy reducer code removed after cutover

---

## Dependency Graph

```
PR-A04-01 (State Machines)
    ↓
PR-A04-02 (Guards)
    ↓
PR-A04-03 (Side Effects)
    ↓
PR-A04-04 (WorkflowEngine)
    ↓
PR-A04-05 (DocumentationEngine) — can start in parallel with PR-A04-04 after PR-A04-02
    ↓
PR-A04-06 (Coordinator)
    ↓
PR-A04-07 (ConsultationContext Integration)
    ↓
PR-A04-08 (Side Effect Handlers) — can start in parallel with PR-A04-07
    ↓
PR-A04-09 (Event Bus Integration) — can start in parallel with PR-A04-08
    ↓
PR-A04-10 (Clinical Tests)
    ↓
PR-A04-11 (Feature Flag & Rollout)
```

## Parallel Opportunities

- PR-A04-04 and PR-A04-05 can run in parallel (both depend on guards + state machines)
- PR-A04-08 and PR-A04-09 can run in parallel (both depend on coordinator)
- PR-A04-10 can start after PR-A04-07 (integration tests need coordinator wired)

## Rollback Strategy

Every PR is independently revertible:
- Domain state machines: no runtime impact
- Guards: no runtime impact (not enforced until PR-A04-07)
- Side effects: no runtime impact (not emitted until PR-A04-07)
- WorkflowEngine/DocumentationEngine: no runtime impact (not wired until PR-A04-07)
- Coordinator: no runtime impact (not wired until PR-A04-07)
- ConsultationContext integration: behind feature flag
- Side effect handlers: behind feature flag
- Event bus: behind feature flag
- Clinical tests: no runtime impact
- Feature flag rollout: disable flag to revert
