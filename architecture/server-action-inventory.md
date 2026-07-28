# Server Action Inventory

## Executive Summary

This document provides a complete inventory of all Server Actions in the consultation feature, their current status, and their relationship to the server boundary.

**Date:** 2026-07-26  
**Status:** 4 PRODUCTION, 8 STUBBED, 3 VIOLATIONS

---

## 1. Production Server Actions

| Server Action | Factory Method | SessionService Method | Status |
|---------------|----------------|----------------------|--------|
| `initializeSession` | `createConsultationSession` | `initializeSession()` | ✅ PRODUCTION |
| `startSession` | `startConsultationSession` | `startSession()` | ✅ PRODUCTION |
| `resumeSession` | `resumeConsultationSession` | `resumeSession()` | ✅ PRODUCTION |
| `completeSession` | `completeConsultationSession` | `completeSession()` | ✅ PRODUCTION |

### Execution Path

```
Server Action
  → getCurrentUser()
  → Factory method
    → createSessionServiceContainer()
      → construct services
    → SessionService.method()
      → WorkflowCoordinator
        → WorkflowEngine
      → serialize result
  → return ActionResult
```

---

## 2. Stubbed Server Actions

| Server Action | Factory Method | SessionService Method | Target PR |
|---------------|----------------|----------------------|-----------|
| `cancelCompletion` | ❌ Missing | `cancelCompletion()` | PR-A08-10 |
| `switchToPatient` | ❌ Missing | `switchSession()` | PR-A08-10 |
| `advanceQueue` | ❌ Missing | `advanceQueue()` | PR-A08-09 |
| `sendHeartbeat` | ❌ Missing | `sendHeartbeat()` | PR-A08-09 |
| `saveDraft` | ❌ Missing | `draftService.saveDraft()` | PR-A08-11 |
| `saveCompletedNotes` | ❌ Missing | Via consultation-hub action | PR-A08-11 |
| `refreshPatient` | ❌ Missing | `patientApi.loadPatient()` | PR-A08-11 |
| `refreshVitals` | ❌ Missing | `patientApi.getPatientVitals()` | PR-A08-11 |
| `pauseSession` | ❌ Missing | `pauseSession()` | PR-A08-12 |
| `resumePausedSession` | ❌ Missing | `resumePausedSession()` | PR-A08-12 |

### Current Stub Implementation

```typescript
export async function stubAction(...): Promise<ActionResult<any>> {
  return makeError(ClinicalErrorCode.UNKNOWN, 'Not implemented in Phase 1', ...);
}
```

---

## 3. Violations (No Server Action)

| Operation | Current Implementation | File | Line | Severity |
|-----------|----------------------|------|------|----------|
| Complete consultation | `doctorApi.completeConsultation(dto)` | `CompleteConsultationDialog.tsx` | 133 | CRITICAL |
| Start consultation (queue) | `doctorApi.startConsultation(...)` | `ConsultationQueuePanel.tsx` | 114 | CRITICAL |
| Billing fetch | `apiClient.get('/services/consultation')` | `BillingTab.tsx` | 46 | HIGH |

---

## 4. Server Action Mapping

### 4.1 SessionProvider Callbacks → Server Actions

| Callback | Server Action | Status |
|----------|--------------|--------|
| `initializeSession` | `initializeSession` | ✅ PRODUCTION |
| `startConsultation` | `startSession` | ✅ PRODUCTION |
| `completeSession` | `completeSession` | ✅ PRODUCTION |
| `resumeSession` | `resumeSession` | ✅ PRODUCTION |
| `cancelCompletion` | `cancelCompletion` | ⚠️ STUBBED |
| `switchToPatient` | `switchToPatient` | ⚠️ STUBBED |
| `advanceQueue` | `advanceQueue` | ⚠️ STUBBED |
| `sendHeartbeat` | `sendHeartbeat` | ⚠️ STUBBED |

### 4.2 DocumentationProvider Callbacks → Server Actions

| Callback | Server Action | Status |
|----------|--------------|--------|
| `saveDraft` | `saveDraft` | ⚠️ STUBBED |
| `saveNotes` | `saveCompletedNotes` | ⚠️ STUBBED |

### 4.3 PatientContextProvider Callbacks → Server Actions

| Callback | Server Action | Status |
|----------|--------------|--------|
| `refreshPatient` | `refreshPatient` | ⚠️ STUBBED |
| `refreshVitals` | `refreshVitals` | ⚠️ STUBBED |

---

## 5. Implementation Roadmap

| Phase | Server Actions | Risk | Dependencies |
|-------|---------------|------|--------------|
| 1 (DONE) | initialize, start, resume, complete | Low | Factory methods |
| 2 (URGENT) | Fix 3 direct API violations | HIGH | None |
| 3 | cancel, switch, pause, resumePaused | MEDIUM | Factory methods |
| 4 | advanceQueue, sendHeartbeat | MEDIUM | Factory methods |
| 5 | saveDraft, saveNotes, refreshPatient, refreshVitals | LOW | Factory methods |

---

## 6. Certification

| Check | Status |
|-------|--------|
| All production Server Actions implemented | ✅ 4/4 |
| All stubbed Server Actions identified | ✅ 10/10 |
| All violations identified | ✅ 3/3 |
| Factory methods mapped | ✅ |
| Execution paths documented | ✅ |

**Verdict: INVENTORY COMPLETE**
