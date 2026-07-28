# Workflow Code Review Checklist

## Purpose

This checklist must be used for every PR in the PR-A04 series. Reviewers must verify all items before approving.

---

## Architecture Compliance

- [ ] **Q1:** Single architectural concern addressed (state machine, guards, side effects, engine, coordinator, integration, tests, or rollout)
- [ ] **Q2:** ADR-001, ADR-003, ADR-004 referenced
- [ ] **Q3:** Provider named (if applicable: SessionProvider, DocumentationProvider)
- [ ] **Q4:** Use case named (if applicable: any of the 11 consultation use cases)
- [ ] **Q5:** Capability mapped (from consultation-capability-map.md)
- [ ] **Q6:** Rollback documented (git revert or feature flag disable)
- [ ] **Q7:** Tests specified (unit, transition, guard, scenario)
- [ ] **Q8:** Migration step identified (PR-A04-01 through PR-A04-11)

---

## Layer Boundaries

- [ ] **G-001:** No React imports in `domain/workflows/` or `application/workflow/`
- [ ] **G-002:** No direct Infrastructure imports in `contexts/` (except via ports)
- [ ] **G-003:** No Domain imports of upper layers in state machine files
- [ ] **G-004:** Shared Kernel types are leaf (no imports from other layers)
- [ ] **G-005:** Ports (state machine interfaces) do not import adapters

---

## State Machine Correctness

- [ ] Every state is documented with purpose, allowed actions, transitions, entry/exit conditions
- [ ] Every transition in VALID_TRANSITIONS has a corresponding test
- [ ] Every forbidden transition is tested (returns null / failure)
- [ ] `getNextState()` returns correct next state for all valid transitions
- [ ] `canPerformAction()` returns true for valid, false for invalid
- [ ] `createInitialContext()` returns correct initial state
- [ ] No unreachable states (all states reachable from initial state)
- [ ] No dead transitions (all transitions lead to another state or terminal)
- [ ] State machine is deterministic (same input always produces same output)

---

## Guard Enforcement

- [ ] Every documented guard is implemented as a pure function
- [ ] Every guard has positive test (passes when conditions met)
- [ ] Every guard has negative test (fails when condition violated)
- [ ] Guards execute in correct order: structural → permission → clinical → business
- [ ] Guard failures include `clinicalRisk` rating
- [ ] Guard failures include human-readable `reason`
- [ ] Guards have no side effects (pure functions only)
- [ ] Clinical safety guards (G-042, G-017, G-008, G-047, G-049) have extra scrutiny

---

## DocumentationWorkflow Integration

- [ ] DocumentationWorkflow states are defined and tested
- [ ] DocumentationWorkflow transitions are defined and tested
- [ ] Autosave integration is documented and tested
- [ ] Manual save integration is documented and tested
- [ ] Conflict recovery flow is documented and tested
- [ ] Draft recovery flow is documented and tested
- [ ] Completion locking is documented and tested
- [ ] ConsultationWorkflow ↔ DocumentationWorkflow synchronization rules are implemented
- [ ] PAUSED state freezes DocumentationWorkflow correctly

---

## Transition Correctness

- [ ] Every production `SET_WORKFLOW_STATE` dispatch is mapped to a state machine action
- [ ] No direct state assignment outside the engine
- [ ] Side effects are emitted for every transition (not hardcoded in reducer)
- [ ] Side effects are applied in correct order
- [ ] Events are emitted after successful transitions only
- [ ] Failed transitions emit no events and apply no side effects
- [ ] `RESET` transition clears all state correctly

---

## Side Effect Handlers

- [ ] Toast handler is tested (correct message, severity)
- [ ] Cache invalidation handler is tested (correct query keys)
- [ ] Storage handler is tested (correct keys, correct values)
- [ ] Heartbeat handler is tested (start/stop)
- [ ] Auto-save handler is tested (start/stop/debounce)
- [ ] Navigation handler is tested (correct path)
- [ ] Handlers are registered via plugin interface (not hardcoded)
- [ ] Handler failures are logged but do not revert workflow state

---

## Event Bus

- [ ] Events are emitted with correct envelope (id, type, timestamp, correlationId, causationId)
- [ ] Events are ordered by timestamp within a session
- [ ] Idempotency keys are correct
- [ ] Audit events are emitted for all clinical transitions
- [ ] No clinical data (notes content) in event payloads
- [ ] Event consumers can subscribe without modifying engine

---

## Testing Requirements

- [ ] **Unit tests:** Every state, transition, guard has unit test
- [ ] **Transition tests:** All valid transitions tested (positive path)
- [ ] **Guard tests:** All guards tested with pass and fail conditions
- [ ] **Invalid transition tests:** All forbidden transitions tested
- [ ] **Boundary tests:** Edge cases covered (empty notes, null values, max retries)
- [ ] **Failure tests:** Error paths tested (network failure, timeout, conflict)
- [ ] **Recovery tests:** Retry, switch, resume tested
- [ ] **Clinical scenario tests:** End-to-end workflows tested
- [ ] **Property-based tests:** Invariants under random inputs tested
- [ ] **Mutation tests:** Guard robustness tested
- [ ] **Behavioral parity tests:** Old vs new behavior identical
- [ ] **Coverage:** ≥80% line, ≥90% branch for critical paths

---

## Behavioral Parity

- [ ] Load consultation produces identical state
- [ ] Start consultation produces identical state
- [ ] Resume consultation produces identical state
- [ ] Auto-save triggers at same time
- [ ] Manual save produces identical result
- [ ] Draft restoration produces identical result
- [ ] Switch patient produces identical result
- [ ] Complete consultation produces identical result
- [ ] Queue progression produces identical result
- [ ] Error recovery produces identical result
- [ ] Version conflict recovery produces identical result

---

## Performance Validation

- [ ] Engine transition completes in <1ms
- [ ] Guard evaluation completes in <0.5ms
- [ ] Side effect emission adds <0.1ms overhead
- [ ] No additional React re-renders introduced
- [ ] No memory leaks (engine instances disposed on unmount)
- [ ] Timer intervals are cleaned up on state transitions

---

## Clinical Safety Validation

- [ ] Completion with unsaved notes is blocked (G-042)
- [ ] Switch with dirty notes requires confirmation (G-017)
- [ ] Resume of completed consultation is blocked (G-008)
- [ ] Version conflict requires explicit resolution (CONFLICT state)
- [ ] Unauthorized completion is blocked (G-049)
- [ ] Stale data overwrite is blocked (G-047)
- [ ] Patient identity preserved across all transitions
- [ ] Audit events emitted for all clinical actions
- [ ] Billing integrity maintained (completion creates billing)

---

## Rollback Validation

- [ ] Feature flag `USE_WORKFLOW_ENGINE` defaults to `false`
- [ ] Feature flag disable reverts to old reducer instantly
- [ ] Git revert restores previous state
- [ ] No data migration required for rollback
- [ ] No manual intervention required for rollback
- [ ] Rollback tested in staging

---

## Documentation

- [ ] Architecture documents updated (workflow-design, guard-spec, event-catalog, engine-api)
- [ ] Code comments explain non-obvious guard logic
- [ ] Clinical safety guards have inline rationale
- [ ] Migration guide written for future developers
- [ ] Known limitations documented

---

## Pre-Merge Checklist

```
Architecture Compliance:   [ ] All 8 questions answered
Layer Boundaries:          [ ] G-001 through G-005 pass
State Machine:             [ ] All states, transitions, guards correct
DocumentationWorkflow:     [ ] Integration verified
Side Effects:              [ ] All handlers tested
Event Bus:                 [ ] Events emitted correctly
Testing:                   [ ] ~420 tests pass
Behavioral Parity:         [ ] Old vs new identical
Performance:               [ ] <1ms transition time
Clinical Safety:           [ ] All guards enforce safety
Rollback:                  [ ] Feature flag tested
Documentation:             [ ] All docs updated
```

**All checkboxes must be checked. If any are unchecked, the PR must be revised.**
