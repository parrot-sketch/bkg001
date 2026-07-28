# PR-A08-08 Migration Plan

## Executive Summary

This document defines the implementation plan for completing the Server Action migration in the consultation feature. It identifies 4 fully migrated mutations, 10 stubbed Server Actions, 3 critical violations, and 11 acceptable local state mutations. The remaining work is decomposed into 5 independent PRs with clear scope, risk, and rollback strategy.

**Date:** 2026-07-26  
**Status:** PLANNING COMPLETE — READY FOR IMPLEMENTATION

---

## 1. Current State

### 1.1 Migrated (4/4 core mutations)

- initializeSession ✅
- startSession ✅
- resumeSession ✅
- completeSession ✅

### 1.2 Stubbed (10 Server Actions)

- cancelCompletion
- switchToPatient
- advanceQueue
- sendHeartbeat
- saveDraft
- saveCompletedNotes
- refreshPatient
- refreshVitals
- pauseSession
- resumePausedSession

### 1.3 Violations (3 direct API calls)

- `CompleteConsultationDialog.tsx:133` — `doctorApi.completeConsultation()`
- `ConsultationQueuePanel.tsx:114` — `doctorApi.startConsultation()`
- `BillingTab.tsx:46` — `apiClient.get('/services/consultation')`

### 1.4 Acceptable Local State (11 mutations)

Notes updates, outcome selection, dialog toggles, billing UI adjustments, queue display updates — all pure presentation state.

---

## 2. Recommended PR Breakdown

### PR-A08-08: Critical Boundary Violations

**Objective:** Eliminate the 3 direct API calls that bypass the server boundary.

**Risk:** HIGH — These are active code paths currently making HTTP requests from the browser.

**Files:**
- `components/consultation/CompleteConsultationDialog.tsx`
- `components/consultation/ConsultationQueuePanel.tsx`
- `components/consultation/tabs/BillingTab.tsx`

**Changes:**
1. Replace `doctorApi.completeConsultation()` in `CompleteConsultationDialog.tsx` with `completeSession` Server Action
2. Replace `doctorApi.startConsultation()` in `ConsultationQueuePanel.tsx` with `startSession` Server Action or remove if redundant with existing flow
3. Replace `apiClient.get('/services/consultation')` in `BillingTab.tsx` with Server Action or remove if data comes from session

**Tests:**
- Verify `CompleteConsultationDialog.tsx` no longer imports `doctorApi`
- Verify `ConsultationQueuePanel.tsx` no longer imports `doctorApi` for start consultation
- Verify `BillingTab.tsx` no longer imports `apiClient`

**Rollback:** Revert changes to 3 files. No database changes.

---

### PR-A08-09: Queue and Heartbeat

**Objective:** Implement `advanceQueue` and `sendHeartbeat` Server Actions.

**Risk:** MEDIUM — `advanceQueue` affects queue state visible to other users.

**Files:**
- `infrastructure/factories/ConsultationSessionFactory.ts`
- `actions/doctor/consultation-session.ts`
- `tests/unit/actions/`

**Changes:**
1. Add `advanceQueueConsultationSession()` to factory
2. Add `sendHeartbeatSession()` to factory
3. Implement `advanceQueue` Server Action
4. Implement `sendHeartbeat` Server Action

**Tests:**
- Factory method unit tests
- Server Action integration tests
- Error handling tests

**Rollback:** Revert factory and Server Action changes. Client code already calls stubs that return errors.

---

### PR-A08-10: Switch and Cancel

**Objective:** Implement `switchToPatient` and `cancelCompletion` Server Actions.

**Risk:** MEDIUM — `switchToPatient` has complex state management (multiple state transitions).

**Files:**
- `infrastructure/factories/ConsultationSessionFactory.ts`
- `actions/doctor/consultation-session.ts`
- `tests/unit/actions/`

**Changes:**
1. Add `switchPatientSession()` to factory
2. Add `cancelCompletionSession()` to factory
3. Implement `switchToPatient` Server Action
4. Implement `cancelCompletion` Server Action

**Tests:**
- Factory method unit tests
- Server Action integration tests
- Error handling tests

**Rollback:** Revert factory and Server Action changes. Client code already calls stubs that return errors.

---

### PR-A08-11: Save and Refresh

**Objective:** Implement `saveDraft`, `saveCompletedNotes`, `refreshPatient`, `refreshVitals` Server Actions.

**Risk:** LOW — These are data operations with clear boundaries.

**Files:**
- `infrastructure/factories/ConsultationSessionFactory.ts`
- `actions/doctor/consultation-session.ts`
- `tests/unit/actions/`

**Changes:**
1. Add `saveDraftSession()` to factory
2. Add `refreshPatientSession()` to factory
3. Add `refreshVitalsSession()` to factory
4. Implement all 4 Server Actions

**Tests:**
- Factory method unit tests
- Server Action integration tests
- Error handling tests

**Rollback:** Revert factory and Server Action changes. Client code already calls stubs that return errors.

---

### PR-A08-12: Pause and Resume

**Objective:** Implement `pauseSession` and `resumePausedSession` Server Actions.

**Risk:** LOW — Straightforward workflow transitions.

**Files:**
- `infrastructure/factories/ConsultationSessionFactory.ts`
- `actions/doctor/consultation-session.ts`
- `tests/unit/actions/`

**Changes:**
1. Add `pauseConsultationSession()` to factory
2. Add `resumePausedConsultationSession()` to factory
3. Implement both Server Actions

**Tests:**
- Factory method unit tests
- Server Action integration tests
- Error handling tests

**Rollback:** Revert factory and Server Action changes. Client code already calls stubs that return errors.

---

## 3. Implementation Order

### Phase 1: Fix Violations (PR-A08-08)

**Priority:** CRITICAL

**Rationale:** These 3 direct API calls bypass the server boundary entirely. They must be fixed before any other work to restore architectural integrity.

**Dependencies:** None

### Phase 2: Low-Risk Data Operations (PR-A08-11)

**Priority:** HIGH

**Rationale:** Save and refresh operations are well-understood, have clear boundaries, and provide immediate user value.

**Dependencies:** PR-A08-08 (for clean architecture)

### Phase 3: Queue Operations (PR-A08-09)

**Priority:** MEDIUM

**Rationale:** Queue advancement and heartbeat are background operations with moderate complexity.

**Dependencies:** PR-A08-08

### Phase 4: State Transition Operations (PR-A08-10)

**Priority:** MEDIUM

**Rationale:** Switch and cancel have complex state management but are well-defined workflow transitions.

**Dependencies:** PR-A08-08

### Phase 5: Pause and Resume (PR-A08-12)

**Priority:** LOW

**Rationale:** These are straightforward workflow transitions with minimal side effects.

**Dependencies:** PR-A08-08

---

## 4. Risk Assessment

### 4.1 Technical Risk

| PR | Risk Level | Primary Concern |
|----|------------|-----------------|
| PR-A08-08 | HIGH | Active code paths making HTTP requests |
| PR-A08-11 | LOW | Data operations with clear boundaries |
| PR-A08-09 | MEDIUM | Queue state visible to other users |
| PR-A08-10 | MEDIUM | Complex state transitions |
| PR-A08-12 | LOW | Simple workflow transitions |

### 4.2 Regression Risk

| PR | Regression Risk | Mitigation |
|----|----------------|------------|
| PR-A08-08 | HIGH | Full integration testing required |
| PR-A08-11 | LOW | Client already calls stubs |
| PR-A08-09 | LOW | Client already calls stubs |
| PR-A08-10 | LOW | Client already calls stubs |
| PR-A08-12 | LOW | Client already calls stubs |

### 4.3 Rollback Feasibility

All PRs except PR-A08-08 have LOW rollback risk because:
- Client code already calls stubs that return errors
- Reverting the Server Action implementation restores previous behavior
- No database schema changes required

PR-A08-08 has HIGH rollback risk because:
- It changes active code paths
- Reverting requires restoring direct API calls
- Requires integration testing to verify rollback

---

## 5. Certification

| Check | Status |
|-------|--------|
| All violations identified | ✅ 3 critical |
| All stubbed Server Actions identified | ✅ 10 |
| All acceptable local mutations identified | ✅ 11 |
| PR scope defined | ✅ 5 PRs |
| Implementation order defined | ✅ 5 phases |
| Risk assessment complete | ✅ |
| Rollback strategy defined | ✅ All PRs |

**Verdict: PLAN COMPLETE**
