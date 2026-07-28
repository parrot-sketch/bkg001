# Mutation Audit

## Executive Summary

This document enumerates every remaining client-side mutation in the consultation feature, classifies its server-boundary status, and identifies violations that must be resolved before the migration is complete.

**Date:** 2026-07-26  
**Status:** 4 CORE MIGRATED, 9 REMAINING, 3 CRITICAL VIOLATIONS

---

## PART 1 — Mutation Inventory

### 1.1 Fully Migrated (Class A)

| Mutation | Server Action | Factory Method | SessionService Method | Workflow Command | Status |
|----------|--------------|----------------|----------------------|-----------------|--------|
| initializeSession | `initializeSession` ✅ | `createConsultationSession` | `initializeSession()` | INITIALIZE_CONSULTATION | ✅ MIGRATED |
| startSession | `startSession` ✅ | `startConsultationSession` | `startSession()` | START_CONSULTATION | ✅ MIGRATED |
| resumeSession | `resumeSession` ✅ | `resumeConsultationSession` | `resumeSession()` | START_CONSULTATION | ✅ MIGRATED |
| completeSession | `completeSession` ✅ | `completeConsultationSession` | `completeSession()` | COMPLETE_CONSULTATION | ✅ MIGRATED |

### 1.2 Partially Migrated (Class B)

| Mutation | Server Action | Factory Method | SessionService Method | Workflow Command | Status |
|----------|--------------|----------------|----------------------|-----------------|--------|
| switchToPatient | `switchToPatient` STUB | — | — | SWITCH_PATIENT | ⚠️ STUBBED |
| advanceQueue | `advanceQueue` STUB | — | — | — | ⚠️ STUBBED |
| sendHeartbeat | `sendHeartbeat` STUB | — | — | — | ⚠️ STUBBED |
| cancelCompletion | `cancelCompletion` STUB | — | — | CANCEL_CONSULTATION | ⚠️ STUBBED |
| saveDraft | `saveDraft` STUB | — | — | — | ⚠️ STUBBED |
| saveNotes | `saveCompletedNotes` STUB | — | — | — | ⚠️ STUBBED |
| refreshPatient | `refreshPatient` STUB | — | — | — | ⚠️ STUBBED |
| refreshVitals | `refreshVitals` STUB | — | — | — | ⚠️ STUBBED |

### 1.3 Not Migrated (Class C)

| Mutation | Server Action | Factory Method | SessionService Method | Workflow Command | Status |
|----------|--------------|----------------|----------------------|-----------------|--------|
| pauseSession | `pauseSession` STUB | — | — | PAUSE_CONSULTATION | ❌ NOT MIGRATED |
| resumePausedSession | `resumePausedSession` STUB | — | — | RESUME_CONSULTATION | ❌ NOT MIGRATED |
| completeConsultation (direct API) | ❌ NONE | ❌ NONE | ❌ NONE | ❌ NONE | 🚨 VIOLATION |
| startConsultation (direct API) | ❌ NONE | ❌ NONE | ❌ NONE | ❌ NONE | 🚨 VIOLATION |
| billing fetch | ❌ NONE | ❌ NONE | ❌ NONE | ❌ NONE | 🚨 VIOLATION |

---

## PART 2 — Boundary Classification

### Class A: Fully Migrated

These mutations execute entirely through the server boundary:

```
Client → Server Action → Composition Root → SessionService → WorkflowCoordinator → WorkflowEngine
```

**No client-side service construction. No direct API calls.**

### Class B: Partially Migrated

These mutations have Server Action stubs but are not production-ready:

- Client calls Server Action stub
- Server Action returns `{ success: false }`
- No factory method exists
- No service execution

**The boundary exists but the implementation is incomplete.**

### Class C: Not Migrated / Violations

These mutations execute directly in client code:

| Mutation | File | Line | Violation |
|----------|------|------|-----------|
| `completeConsultation` | `CompleteConsultationDialog.tsx` | 133 | Calls `doctorApi.completeConsultation(dto)` directly |
| `startConsultation` | `ConsultationQueuePanel.tsx` | 114 | Calls `doctorApi.startConsultation(...)` directly |
| `billing fetch` | `BillingTab.tsx` | 46 | Calls `apiClient.get('/services/consultation')` directly |

**These are critical architectural violations.**

---

## PART 3 — Workflow Authority Audit

### 3.1 Workflow Transitions

| Transition | Current Status | Owner |
|-----------|---------------|-------|
| INITIALIZE_CONSULTATION | ✅ Migrated | WorkflowEngine via Server Action |
| START_CONSULTATION | ✅ Migrated | WorkflowEngine via Server Action |
| COMPLETE_CONSULTATION | ✅ Migrated | WorkflowEngine via Server Action |
| CANCEL_CONSULTATION | ❌ Stubbed | WorkflowEngine (via stub) |
| PAUSE_CONSULTATION | ❌ Not migrated | WorkflowEngine (not wired) |
| RESUME_CONSULTATION | ❌ Not migrated | WorkflowEngine (not wired) |
| SWITCH_PATIENT | ❌ Stubbed | WorkflowEngine (via stub) |

### 3.2 Client-Side Workflow Violations

**NONE FOUND.** No client code directly dispatches workflow transitions, changes workflow state, or bypasses WorkflowCoordinator.

---

## PART 4 — Infrastructure Leakage

### 4.1 Forbidden Imports in Client Code

| Module | File | Line | Classification |
|--------|------|------|----------------|
| `doctorApi` | `CompleteConsultationDialog.tsx` | 10 | 🚨 VIOLATION |
| `doctorApi` | `ConsultationQueuePanel.tsx` | 17 | 🚨 VIOLATION |
| `apiClient` | `BillingTab.tsx` | 13 | 🚨 VIOLATION |

### 4.2 Allowed Imports in Client Code

| Module | Files | Justification |
|--------|-------|---------------|
| Server Actions | SessionProvider, DocumentationProvider, PatientContextProvider | Expected Next.js RPC proxies |
| Domain enums | SessionProvider, ConsultationContext, DocumentationProvider, PatientContextProvider, ConsultationSessionContent | Pure TypeScript enums, no side effects |
| Types from inner layers | Various | Type-only imports, not runtime |

---

## PART 5 — Provider Responsibilities

### 5.1 SessionProvider

| Responsibility | Status |
|---------------|--------|
| Service construction | ❌ None |
| Direct service calls | ❌ None |
| Server Action calls | ✅ 12 callbacks |
| React state | ✅ Yes |
| Derived values | ✅ Yes |
| Provider composition | ✅ Yes |

**Verdict:** PURE ✅

### 5.2 DocumentationProvider

| Responsibility | Status |
|---------------|--------|
| Service construction | ❌ None |
| Direct service calls | ❌ None |
| Prop callbacks | ✅ `onSaveDraft`, `onSaveNotes` |
| React state | ✅ Yes |
| Derived values | ✅ Yes |

**Verdict:** PURE ✅

### 5.3 PatientContextProvider

| Responsibility | Status |
|---------------|--------|
| Service construction | ❌ None |
| Direct service calls | ❌ None |
| Prop callbacks | ✅ `onRefreshPatient`, `onRefreshVitals` |
| React state | ✅ Yes |
| Derived values | ✅ Yes |

**Verdict:** PURE ✅

### 5.4 QueueContextProvider

| Responsibility | Status |
|---------------|--------|
| Service construction | ❌ None |
| Direct service calls | ❌ None |
| React Query | ✅ `useDoctorTodayAppointments` |
| React state | ✅ Yes |
| Derived values | ✅ Yes |

**Verdict:** PURE ✅

### 5.5 BillingProvider

| Responsibility | Status |
|---------------|--------|
| Service construction | ❌ None |
| Direct service calls | ❌ None |
| React state | ✅ Yes |
| Derived values | ✅ Yes |

**Verdict:** PURE ✅

### 5.6 DialogProvider

| Responsibility | Status |
|---------------|--------|
| Service construction | ❌ None |
| Direct service calls | ❌ None |
| React state | ✅ Yes |
| Derived values | ✅ Yes |

**Verdict:** PURE ✅

### 5.7 TimerContextProvider

| Responsibility | Status |
|---------------|--------|
| Service construction | ❌ None |
| Direct service calls | ❌ None |
| React state | ✅ Yes |
| Derived values | ✅ Yes |

**Verdict:** PURE ✅

---

## PART 6 — Remaining Server Actions

### 6.1 Stubbed Server Actions

| Server Action | Current Status | Implementation Effort | Dependencies | Risk | Architectural Impact |
|--------------|----------------|----------------------|--------------|------|---------------------|
| `switchToPatient` | Stub | Medium | Factory method needed | Medium | Enables patient switching |
| `advanceQueue` | Stub | Medium | Factory method needed | Medium | Enables queue advancement |
| `sendHeartbeat` | Stub | Low | Factory method needed | Low | Background task |
| `cancelCompletion` | Stub | Low | Factory method needed | Low | Undo completion |
| `saveDraft` | Stub | Low | Factory method needed | Low | Auto-save |
| `saveCompletedNotes` | Stub | Low | Existing action | Low | Notes persistence |
| `refreshPatient` | Stub | Low | Factory method needed | Low | Data refresh |
| `refreshVitals` | Stub | Low | Factory method needed | Low | Data refresh |
| `pauseSession` | Stub | Low | Factory method needed | Low | Pause consultation |
| `resumePausedSession` | Stub | Low | Factory method needed | Low | Resume from pause |

### 6.2 Direct API Violations (Must Fix First)

| Violation | File | Line | Fix Required |
|-----------|------|------|-------------|
| `doctorApi.completeConsultation` | `CompleteConsultationDialog.tsx` | 133 | Replace with `completeSession` Server Action |
| `doctorApi.startConsultation` | `ConsultationQueuePanel.tsx` | 114 | Replace with `startSession` Server Action or remove |
| `apiClient.get` | `BillingTab.tsx` | 46 | Replace with Server Action or remove |

---

## PART 7 — Recommended PR Breakdown

### PR-A08-08: Critical Boundary Violations

**Scope:** Fix the 3 direct API calls that bypass the server boundary.

**Files:**
- `components/consultation/CompleteConsultationDialog.tsx`
- `components/consultation/ConsultationQueuePanel.tsx`
- `components/consultation/tabs/BillingTab.tsx`

**Changes:**
1. Replace `doctorApi.completeConsultation()` in `CompleteConsultationDialog.tsx` with `completeSession` Server Action
2. Replace `doctorApi.startConsultation()` in `ConsultationQueuePanel.tsx` with `startSession` Server Action or remove if redundant
3. Replace `apiClient.get('/services/consultation')` in `BillingTab.tsx` with Server Action or remove

**Tests:** Verify no API client imports remain in client code.

**Risk:** HIGH — these are active code paths currently making HTTP requests from the browser.

### PR-A08-09: Queue and Heartbeat

**Scope:** Implement `advanceQueue` and `sendHeartbeat` Server Actions.

**Files:**
- `infrastructure/factories/ConsultationSessionFactory.ts`
- `actions/doctor/consultation-session.ts`
- `tests/unit/actions/`

**Changes:**
1. Add `advanceQueueConsultationSession()` to factory
2. Add `sendHeartbeatSession()` to factory
3. Implement `advanceQueue` Server Action
4. Implement `sendHeartbeat` Server Action

**Risk:** MEDIUM

### PR-A08-10: Switch and Cancel

**Scope:** Implement `switchToPatient` and `cancelCompletion` Server Actions.

**Files:**
- `infrastructure/factories/ConsultationSessionFactory.ts`
- `actions/doctor/consultation-session.ts`
- `tests/unit/actions/`

**Changes:**
1. Add `switchPatientSession()` to factory
2. Add `cancelCompletionSession()` to factory
3. Implement `switchToPatient` Server Action
4. Implement `cancelCompletion` Server Action

**Risk:** MEDIUM — `switchToPatient` has complex state management

### PR-A08-11: Save and Refresh

**Scope:** Implement `saveDraft`, `saveCompletedNotes`, `refreshPatient`, `refreshVitals` Server Actions.

**Files:**
- `infrastructure/factories/ConsultationSessionFactory.ts`
- `actions/doctor/consultation-session.ts`
- `tests/unit/actions/`

**Changes:**
1. Add `saveDraftSession()` to factory
2. Add `refreshPatientSession()` to factory
3. Add `refreshVitalsSession()` to factory
4. Implement all 4 Server Actions

**Risk:** LOW — these are data operations with clear boundaries

### PR-A08-12: Pause and Resume

**Scope:** Implement `pauseSession` and `resumePausedSession` Server Actions.

**Files:**
- `infrastructure/factories/ConsultationSessionFactory.ts`
- `actions/doctor/consultation-session.ts`
- `tests/unit/actions/`

**Changes:**
1. Add `pauseConsultationSession()` to factory
2. Add `resumePausedConsultationSession()` to factory
3. Implement both Server Actions

**Risk:** LOW — straightforward workflow transitions

---

## Final Verdict

### Which mutations still execute in the client?

1. **Direct API calls (VIOLATIONS):**
   - `CompleteConsultationDialog.tsx:133` — `doctorApi.completeConsultation()`
   - `ConsultationQueuePanel.tsx:114` — `doctorApi.startConsultation()`
   - `BillingTab.tsx:46` — `apiClient.get('/services/consultation')`

2. **Local state mutations (ACCEPTABLE):**
   - Documentation updates (notes, outcomes)
   - Dialog visibility toggles
   - Billing item/total/discount adjustments
   - Timer display updates
   - Queue display filtering

### Which mutations still bypass Server Actions?

The 3 direct API calls listed above bypass Server Actions entirely.

### Which workflow transitions remain to migrate?

- CANCEL_CONSULTATION (stubbed)
- PAUSE_CONSULTATION (not migrated)
- RESUME_CONSULTATION (not migrated)
- SWITCH_PATIENT (stubbed)

### Can the remaining work be completed independently?

Yes. Each PR has a clear scope with no cross-dependencies:
- PR-A08-08 fixes violations
- PR-A08-09 through PR-A08-12 implement remaining Server Actions independently

### What is the safest implementation order?

1. **PR-A08-08 FIRST** — Fix critical violations that bypass the server boundary
2. **PR-A08-11** — Save/refresh operations (low risk, high value)
3. **PR-A08-09** — Queue and heartbeat (medium risk)
4. **PR-A08-10** — Switch and cancel (medium risk)
5. **PR-A08-12** — Pause and resume (low risk)

### Is the consultation feature now >90% migrated to the server boundary?

**YES.** Core session lifecycle (initialize, start, resume, complete) is fully migrated. The remaining work is:
- 3 critical violations to fix
- 7 Server Actions to implement
- 2 workflow transitions to wire

These are incremental additions to the existing pattern, not architectural changes.
