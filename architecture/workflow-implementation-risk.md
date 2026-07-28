# Workflow Implementation Risk

## Purpose

This document evaluates every implementation step in PR-A04 for technical, clinical, and operational risk. Every identified risk has a mitigation strategy.

## Risk Matrix

| Step | Technical Risk | Clinical Risk | Rollback Complexity | Testing Complexity | Integration Complexity | Performance Impact | Overall Risk |
|------|---------------|---------------|---------------------|-------------------|------------------------|-------------------|--------------|
| PR-A04-01: State Machines | Low | None | Low | Low | None | None | **LOW** |
| PR-A04-02: Guards | Low | Medium | Low | Medium | None | None | **LOW** |
| PR-A04-03: Side Effects | Low | None | Low | Low | None | None | **LOW** |
| PR-A04-04: WorkflowEngine | Medium | Medium | Medium | Medium | Low | Low | **MEDIUM** |
| PR-A04-05: DocumentationEngine | Medium | Medium | Medium | Medium | Low | Low | **MEDIUM** |
| PR-A04-06: Coordinator | Medium | High | Medium | High | Medium | Low | **MEDIUM** |
| PR-A04-07: ConsultationContext Integration | High | High | High | High | High | Medium | **HIGH** |
| PR-A04-08: Side Effect Handlers | Low | Low | Low | Low | Medium | Low | **LOW** |
| PR-A04-09: Event Bus | Low | Low | Low | Low | Low | Low | **LOW** |
| PR-A04-10: Clinical Tests | Low | Low | N/A | High | Low | None | **LOW** |
| PR-A04-11: Feature Flag | Medium | High | Low | Medium | High | Low | **MEDIUM** |

---

## Detailed Risk Analysis

### PR-A04-01: Domain State Machines

**Technical Risk:** LOW
- Pure TypeScript enums and functions
- Zero external dependencies
- Well-understood pattern

**Mitigation:** None needed. Standard domain modeling.

---

### PR-A04-02: Guard Infrastructure

**Technical Risk:** LOW
- Pure functions with no side effects
- Easy to test in isolation

**Clinical Risk:** MEDIUM
- Guards enforce clinical safety rules
- Incorrect guard logic could block valid transitions or allow invalid ones

**Mitigation:**
- Every guard has positive and negative unit tests
- Clinical SME reviews all guard logic before merge
- Guard logic is pure and inspectable

---

### PR-A04-03: Side Effect Model

**Technical Risk:** LOW
- Type definitions only
- No runtime behavior

**Mitigation:** None needed.

---

### PR-A04-04: WorkflowEngine

**Technical Risk:** MEDIUM
- Engine must correctly orchestrate guards, transitions, and side effects
- Complex state machine with 28 transitions
- Thread safety not a concern (single-threaded JS), but concurrent transitions within same event loop tick must be handled

**Clinical Risk:** MEDIUM
- Engine is the single authority for workflow state
- Incorrect transitions could allow invalid clinical actions

**Mitigation:**
- Engine is pure function: input state + action → output result
- No mutation of input state
- Concurrent transition detection via engine-level lock
- Full transition test coverage (28 positive + 24 negative tests)

---

### PR-A04-05: DocumentationEngine

**Technical Risk:** MEDIUM
- Must coordinate with DraftService (async)
- Must handle autosave debounce integration
- Must handle conflict recovery correctly

**Clinical Risk:** MEDIUM
- Draft save failures could lose clinical notes
- Conflict resolution logic must preserve data integrity

**Mitigation:**
- Engine emits side effects; actual mutation happens in DraftService
- Engine never mutates notes directly
- Conflict recovery follows documented resolution flow
- Behavioral parity tests against current DraftService

---

### PR-A04-06: WorkflowCoordinator

**Technical Risk:** MEDIUM
- Must correctly route commands to both engines
- Must merge side effects from both engines without duplicates
- Must emit events at correct points in transition flow

**Clinical Risk:** HIGH
- Coordinator is the single entry point for all workflow mutations
- Incorrect routing could desynchronize ConsultationWorkflow and DocumentationWorkflow

**Mitigation:**
- Coordinator has exhaustive command-to-transition mapping tests
- Side effect deduplication is deterministic (by type + payload hash)
- Event emission happens AFTER both engines succeed
- If either engine fails, no events emitted and no side effects applied

---

### PR-A04-07: ConsultationContext Integration (HIGHEST RISK)

**Technical Risk:** HIGH
- Must replace 12 `SET_WORKFLOW_STATE` dispatches
- Must maintain dual state during feature-flagged rollout
- Must preserve exact UI behavior (behavioral parity)

**Clinical Risk:** HIGH
- Integration bugs could block valid clinical actions
- State desync between engine and reducer could cause confusing UI

**Mitigation:**
- Feature flag defaults to OFF
- Dual-runner pattern: engine runs, but UI reads from reducer until flag ON
- Behavioral parity tests compare old vs new for every production path
- Gradual rollout: 1 doctor → 5 doctors → 25% → 100%
- Rollback: disable flag, instant revert to old reducer

**Rollback Strategy:**
- Feature flag `USE_WORKFLOW_ENGINE = false` reverts to old reducer immediately
- Zero data migration required
- Zero manual intervention required

---

### PR-A04-08: Side Effect Handlers

**Technical Risk:** LOW
- Each handler is a small, pure function
- Handlers are independently testable

**Clinical Risk:** LOW
- Handlers only perform UI/integration side effects
- No clinical logic in handlers

**Mitigation:**
- Handlers are registered via plugin interface
- Handlers cannot modify engine state
- Handler failures are logged but do not revert workflow state

---

### PR-A04-09: Event Bus Integration

**Technical Risk:** LOW
- In-memory event bus for now
- Future WebSocket emission is additive

**Clinical Risk:** LOW
- Events are notifications only
- No clinical logic in event emission

**Mitigation:**
- Events are fire-and-forget
- Consumer failures do not affect workflow state
- Events can be replayed from state if needed

---

### PR-A04-10: Clinical Tests

**Technical Risk:** LOW
- Test code only

**Testing Complexity:** HIGH
- ~420 tests required
- Must cover every state, transition, guard, and clinical scenario
- Property-based tests require `fast-check` dependency

**Mitigation:**
- Test templates provided in `workflow-test-specification.md`
- CI enforces minimum coverage thresholds
- Property-based tests catch edge cases manual tests miss

---

### PR-A04-11: Feature Flag & Gradual Rollout

**Technical Risk:** MEDIUM
- Feature flag must correctly route all workflow actions
- Gradual rollout requires monitoring

**Clinical Risk:** HIGH
- Production rollout affects live clinical workflows
- Any bug blocks doctor consultations

**Mitigation:**
- Staging validation with 1 doctor for 1 day
- Monitor metrics: transition rejections, guard failures, error rates
- Instant rollback via flag disable
- Progressive rollout: 1% → 5% → 25% → 100%
- Clinical SME on-call during rollout

---

## Cross-Cutting Risks

### C-001: State Desynchronization

**Risk:** Engine state and ConsultationContext reducer state diverge during feature-flagged rollout.

**Impact:** HIGH — UI reads from reducer, engine reads from engine state. If they diverge, UI shows incorrect state.

**Mitigation:**
- On every coordinator.execute(), update BOTH engine state AND reducer state
- On every state change, emit a `StateSynchronized` event
- Add monitor that compares engine state vs reducer state every 5s
- Alert if divergence detected

### C-002: Side Effect Ordering

**Risk:** Side effects fire in wrong order (e.g., navigation before cache invalidation).

**Impact:** MEDIUM — user navigates away before completion finishes.

**Mitigation:**
- Side effects have explicit ordering in engine
- Navigation side effect is LAST in every transition that emits it
- Side effects are applied synchronously in order

### C-003: Guard Logic Drift

**Risk:** Guard logic in engine diverges from UI validation logic.

**Impact:** MEDIUM — UI allows action that engine blocks (or vice versa).

**Mitigation:**
- All UI validation is removed after engine activation
- Guards are the single source of truth
- Guard logic is unit tested; UI validation is removed

### C-004: Memory Leaks

**Risk:** Engine instances accumulate in React Context across patient switches.

**Impact:** LOW — memory leak over long sessions.

**Mitigation:**
- Engine is created once per ConsultationProvider mount
- Engine is disposed on unmount (clear intervals, clear timers)
- `useEffect` cleanup calls `engine.reset()`

### C-005: Performance

**Risk:** Engine adds overhead to every workflow action.

**Impact:** LOW — engine is pure function (<1ms per transition).

**Mitigation:**
- Benchmark engine transitions: target <1ms
- Side effects are async and do not block transition
- No React re-renders triggered by engine state changes (only coordinator notifies UI)

---

## Rollback Complexity Summary

| Step | Rollback Method | Time to Rollback | Data Loss Risk |
|------|-----------------|------------------|----------------|
| PR-A04-01 | Git revert | Instant | None |
| PR-A04-02 | Git revert | Instant | None |
| PR-A04-03 | Git revert | Instant | None |
| PR-A04-04 | Git revert | Instant | None |
| PR-A04-05 | Git revert | Instant | None |
| PR-A04-06 | Git revert | Instant | None |
| PR-A04-07 | Feature flag disable | <1s | None |
| PR-A04-08 | Git revert | Instant | None |
| PR-A04-09 | Git revert | Instant | None |
| PR-A04-10 | N/A | N/A | None |
| PR-A04-11 | Feature flag disable | <1s | None |

**No data loss risk in any rollback scenario.**

---

## Clinical Risk Mitigation Summary

| Clinical Risk | Mitigation |
|---------------|------------|
| Completion with unsaved notes | Guard G-042 blocks; UI override requires explicit confirmation |
| Switch with dirty notes | Guard G-017 blocks until save or user confirmation |
| Resume completed consultation | Guard G-008 blocks; routes to READY instead |
| Version conflict data loss | CONFLICT state forces explicit resolution |
| Unauthorized completion | Guard G-049 validates queue ownership |
| Stale data overwrite | Guard G-047 validates version currency |

---

## Recommendation

**Proceed with implementation.** All risks are identifiable and mitigable. The highest risk (PR-A04-07) is mitigated by the feature flag, which provides instant rollback with zero data loss.
