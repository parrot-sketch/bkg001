# Client Mutation Map

## Executive Summary

This document maps every client-side mutation in the consultation feature to its execution location, dependencies, and boundary status.

**Date:** 2026-07-26  
**Status:** 4 SERVER, 8 STUBBED, 3 VIOLATIONS, 6 LOCAL

---

## 1. Complete Mutation Map

### Session Lifecycle Mutations

| Mutation | Initiating Component | Initiating Hook | Provider | Server Action | SessionService Method | Execution Location | Status |
|----------|---------------------|-----------------|----------|---------------|----------------------|-------------------|--------|
| initializeSession | ConsultationSessionPageOptimized | Server Component | — | `initializeSession` ✅ | `initializeSession()` | Server | ✅ MIGRATED |
| startSession | StartConsultationDialog | onClick | SessionProvider | `startSession` ✅ | `startSession()` | Server | ✅ MIGRATED |
| resumeSession | ConsultationSessionContent | onClick | SessionProvider | `resumeSession` ✅ | `resumeSession()` | Server | ✅ MIGRATED |
| completeSession | CompleteConsultationDialog | onClick | SessionProvider | `completeSession` ✅ | `completeSession()` | Server | ✅ MIGRATED |
| cancelCompletion | — | — | SessionProvider | `cancelCompletion` STUB | — | — | ⚠️ STUBBED |
| switchToPatient | ConsultationQueuePatientCard | onClick | SessionProvider | `switchToPatient` STUB | `switchSession()` | — | ⚠️ STUBBED |
| advanceQueue | ConsultationQueuePanel | onClick | SessionProvider | `advanceQueue` STUB | `advanceQueue()` | — | ⚠️ STUBBED |
| sendHeartbeat | SessionProvider | useEffect | SessionProvider | `sendHeartbeat` STUB | `sendHeartbeat()` | — | ⚠️ STUBBED |
| pauseSession | — | — | SessionProvider | `pauseSession` STUB | `pauseSession()` | — | ❌ NOT WIRED |
| resumePausedSession | — | — | SessionProvider | `resumePausedSession` STUB | `resumePausedSession()` | — | ❌ NOT WIRED |

### Documentation Mutations

| Mutation | Initiating Component | Initiating Hook | Provider | Server Action | Execution Location | Status |
|----------|---------------------|-----------------|----------|---------------|-------------------|--------|
| updateNotes | RichTextEditor | onChange | DocumentationProvider | — | — | ✅ LOCAL |
| setOutcome | CompleteConsultationDialog | onChange | DocumentationProvider | — | — | ✅ LOCAL |
| setPatientDecision | CompleteConsultationDialog | onChange | DocumentationProvider | — | — | ✅ LOCAL |
| saveDraft | ConsultationSessionHeader | onClick | DocumentationProvider | `saveDraft` STUB | — | ⚠️ STUBBED |
| saveNotes | ConsultationWorkspaceOptimized | onClick | DocumentationProvider | `saveCompletedNotes` STUB | — | ⚠️ STUBBED |

### Data Refresh Mutations

| Mutation | Initiating Component | Initiating Hook | Provider | Server Action | Execution Location | Status |
|----------|---------------------|-----------------|----------|---------------|-------------------|--------|
| refreshPatient | PatientInfoSidebar | onClick | PatientContextProvider | `refreshPatient` STUB | — | ⚠️ STUBBED |
| refreshVitals | PatientInfoSidebar | onClick | PatientContextProvider | `refreshVitals` STUB | — | ⚠️ STUBBED |
| loadWaitingQueue | ConsultationSessionContent | useEffect | QueueContextProvider | — | — | ✅ LOCAL (React Query) |
| refetchQueue | ConsultationQueuePanel | onClick | QueueContextProvider | — | — | ✅ LOCAL (React Query) |

### Direct API Violations

| Mutation | Initiating Component | Initiating Hook | Server Action | Execution Location | Status |
|----------|---------------------|-----------------|---------------|-------------------|--------|
| completeConsultation | CompleteConsultationDialog | onClick | ❌ NONE | Client → API | 🚨 VIOLATION |
| startConsultation | ConsultationQueuePanel | onClick | ❌ NONE | Client → API | 🚨 VIOLATION |
| billingFetch | BillingTab | useEffect | ❌ NONE | Client → API | 🚨 VIOLATION |

### UI State Mutations

| Mutation | Provider | Execution Location | Status |
|----------|----------|-------------------|--------|
| openStartDialog | DialogProvider | Client | ✅ LOCAL |
| closeStartDialog | DialogProvider | Client | ✅ LOCAL |
| openCompleteDialog | DialogProvider | Client | ✅ LOCAL |
| closeCompleteDialog | DialogProvider | Client | ✅ LOCAL |
| setBillingItems | BillingProvider | Client | ✅ LOCAL |
| setBillingTotal | BillingProvider | Client | ✅ LOCAL |
| setDiscount | BillingProvider | Client | ✅ LOCAL |
| clearBillingWarnings | BillingProvider | Client | ✅ LOCAL |
| collapseSidebar | ConsultationSessionContent | Client | ✅ LOCAL |

---

## 2. Execution Location Summary

| Location | Count | Mutations |
|----------|-------|-----------|
| Server (production) | 4 | initialize, start, resume, complete |
| Server (stubbed) | 10 | cancel, switch, advance, heartbeat, pause, resumePaused, saveDraft, saveNotes, refreshPatient, refreshVitals |
| Client (direct API) | 3 | completeConsultation, startConsultation, billingFetch |
| Client (local state) | 11 | notes, outcomes, dialogs, billing UI, queue display |

---

## 3. Critical Paths

### 3.1 Start Consultation Path

```
StartConsultationDialog onClick
  → SessionProvider.startConsultation()
    → Server Action: startSession ✅
      → Factory: startConsultationSession()
        → SessionService.startSession()
          → WorkflowCoordinator
            → WorkflowEngine
```

**Status:** MIGRATED ✅

### 3.2 Complete Consultation Path (VIOLATION)

```
CompleteConsultationDialog onClick
  → doctorApi.completeConsultation(dto) 🚨
    → HTTP POST to /api/consultations/[id]/complete
```

**Status:** VIOLATION 🚨 — Bypasses Server Action boundary

### 3.3 Queue Start Path (VIOLATION)

```
ConsultationQueuePanel onClick
  → doctorApi.startConsultation({...}) 🚨
    → HTTP POST to /api/consultations/[id]/start
```

**Status:** VIOLATION 🚨 — Bypasses Server Action boundary

### 3.4 Save Draft Path

```
ConsultationSessionHeader onClick
  → docs.saveDraft()
    → onSaveDraft callback
      → Server Action: saveDraft STUB
        → Returns { success: false }
```

**Status:** STUBBED ⚠️ — Boundary exists but no production implementation

---

## 4. Certification

| Check | Status |
|-------|--------|
| All mutations mapped | ✅ |
| Server Actions identified | ✅ |
| Violations identified | ✅ 3 critical |
| Local state mutations identified | ✅ 11 |
| Execution locations documented | ✅ |

**Verdict: MAPPING COMPLETE**

3 critical violations must be fixed before migration is complete.
