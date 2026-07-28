# Workflow Certification

## Purpose

This document certifies whether the `ConsultationWorkflowState` state machine is complete, deterministic, and ready for activation in PR-A04.

---

## 1. Certification Criteria

| Criterion | Requirement | Status |
|-----------|-------------|--------|
| All states defined | Every clinical state has a state machine representation | ❌ FAIL |
| All transitions defined | Every production transition is in the state machine | ❌ FAIL |
| All transitions enforced | Production code uses `getNextState()` for all transitions | ❌ FAIL |
| All guard conditions implemented | Pre-conditions validated before each transition | ❌ FAIL |
| All side effects mapped | Side effects tied to state transitions | ❌ FAIL |
| All error paths represented | Every error state has a recovery transition | ⚠️ PARTIAL |
| All terminal states represented | Completion leads to terminal state, not RESET bypass | ❌ FAIL |
| DocumentationWorkflow exists | Save lifecycle states per ADR-004 | ❌ FAIL |
| Unit tests exist | All transitions tested | ❌ FAIL |
| Clinical safety preserved | No data loss across transitions | ⚠️ PARTIAL |

---

## 2. Violations Found

### CRITICAL: State Machine Not Enforced

**Finding:** Every `SET_WORKFLOW_STATE` dispatch in `ConsultationContext.tsx` bypasses `getNextState()`.

**Lines:** 391, 478, 482, 487, 490, 563, 685, 690, 703, 717, 735, 748

**Impact:** The state machine is dead code. Any transition can happen at any time.

### HIGH: Missing Terminal State

**Finding:** No `COMPLETED` state exists. Production uses `dispatch(RESET)` which calls `createInitialState()`, bypassing the state machine entirely.

**Impact:** Cannot represent "session completed" in the state machine. Prevents proper session lifecycle tracking.

### HIGH: Missing DocumentationWorkflow

**Finding:** ADR-004 specifies `DocumentationWorkflow` with states `[IDLE, EDITING, SAVING, SAVED, ERROR, CONFLICT]`, but this workflow does not exist.

**Impact:** Draft save lifecycle is invisible to the state machine. Cannot enforce save-before-complete guards.

### HIGH: Missing Guard Conditions

**Finding:** No pre-transition validation exists in `getNextState()` or `canPerformAction()`.

**Impact:**
- Completion can happen with unsaved notes
- Save can happen when consultation is not active
- Switch can happen without saving dirty notes

### MEDIUM: Missing Transitions

**Finding:** The following production transitions are not in the state machine:

| Missing Transition | Production Bypass |
|-------------------|-------------------|
| `LOADING → ACTIVE` (resume existing) | Direct `SET_WORKFLOW_STATE` at line 482 |
| `READY → LOADING` (switch patient from ready) | Direct `SET_WORKFLOW_STATE` via loadAppointment |
| `ERROR → ACTIVE` (completion error revert) | Direct `SET_WORKFLOW_STATE` at line 735 |
| `TRANSITIONING → READY` (queue advance) | `RESET` bypass |
| `TRANSITIONING → IDLE` (hub navigation) | `RESET` bypass |

### MEDIUM: No Unit Tests

**Finding:** Zero tests exist for `ConsultationWorkflowState`.

**Impact:** Cannot prove transitions are correct. No regression safety net.

### LOW: Unreachable States

**Finding:** `GO_TO_SURGERY` action maps to `TRANSITIONING → TRANSITIONING` (self-loop), which is unreachable because `GO_TO_SURGERY` is never dispatched in production.

**Impact:** Dead code in transition table.

---

## 3. Clinical Safety Assessment

| Safety Property | Status | Risk |
|-----------------|--------|------|
| Patient identity preserved | ✅ PASS | None |
| Consultation integrity | ⚠️ WEAK | Completion without save guard missing |
| Draft integrity | ⚠️ WEAK | Conflict recovery not in state machine |
| Queue integrity | ✅ PASS | None |
| Audit integrity | ✅ PASS | None |
| Billing integrity | ✅ PASS | None |

**Overall clinical safety: ⚠️ WEAK — Two medium-risk gaps identified**

---

## 4. Verdict

**NOT CERTIFIED**

The `ConsultationWorkflowState` state machine is architecturally sound but **not ready for activation**. It is currently bypassed in every production transition, lacks terminal states, lacks guard conditions, and has zero test coverage.

### Blockers for Activation

1. **State machine must be enforced** — all `SET_WORKFLOW_STATE` dispatches must route through `getNextState()`
2. **Terminal state must be added** — `COMPLETED` state must exist
3. **DocumentationWorkflow must be implemented** — per ADR-004
4. **Guard conditions must be added** — especially "notes saved before completion"
5. **Unit tests must be written** — all valid and invalid transitions

### Recommendation

**PR-A04 (Workflow Engine Activation) may begin design work, but implementation must NOT activate the workflow engine until:**

1. The missing states and transitions are added to `ConsultationWorkflowState.ts`
2. All production bypasses are replaced with state machine actions
3. Guard conditions are implemented
4. Unit tests achieve 100% transition coverage
5. Behavioral parity tests prove identical runtime behavior

**Estimated effort:** 3-4 days of implementation + 1 day of testing per the remediation plan.

---

## 5. Next Steps

1. **Design** the missing states (`COMPLETED`, `CONFLICT`, `SAVING`, `SAVED`) and transitions
2. **Implement** guard conditions for all clinical safety constraints
3. **Write** unit tests for all state machine transitions
4. **Replace** all `SET_WORKFLOW_STATE` dispatches with state machine actions
5. **Implement** `DocumentationWorkflow` per ADR-004
6. **Re-audit** after implementation to certify

---

*This certification is based on the current implementation as of the audit date. Re-certification is required after PR-A04 implementation.*
