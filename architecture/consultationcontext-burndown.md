# ConsultationContext Burndown Plan

## Current State

**Lines:** 1004
**Responsibilities:** 18
**API calls:** 6 endpoints
**Side effects:** 14 toast calls, 8 cache invalidations, 5 navigation calls, 3 localStorage operations, 1 heartbeat
**Hooks consumed:** 5 (useSaveConsultationDraft, usePatientConsultationHistory, useDoctorTodayAppointments, useAuth, useRouter)
**State fields:** 16

---

## Burndown Schedule

### Week 0: Remediation (Lines: 1004 → 1004)

**Changes:** No lines removed. Shim prototype added alongside existing context.

| Action | Lines Added | Lines Removed |
|--------|-------------|---------------|
| Create ConsultationContext.shim.ts | +200 | 0 |
| Wire shim behind feature flag | +10 | 0 |
| **Net change** | **+210** | **0** |
| **Total** | **1214** | **0** |

**Responsibilities transferred:** 0
**Responsibilities remaining:** 18

---

### Week 1: DraftService + SessionService (Lines: 1214 → 900)

**Changes:** ConsultationContext delegates save and session lifecycle to new services.

| Responsibility | Lines Removed | Target |
|---------------|---------------|--------|
| saveDraft (lines 590-629) | −40 | DraftService |
| saveNotes (lines 631-693) | −63 | DraftService |
| Auto-save useEffect (lines 819-845) | −27 | DraftService |
| loadAppointment (lines 394-534) | −140 | SessionService |
| startConsultation (lines 536-584) | −50 | SessionService |
| Reducer + createInitialState (lines 138-276) | −140 | SessionService |
| Computed properties (lines 379-390) | −12 | SessionService |
| completeConsultation (partial) | −30 | SessionService |
| **Week 1 total** | **−502** | |

**Projected lines after Week 1:** ~712

**Responsibilities remaining:** 10
- Reducer (partial)
- Context value interface
- Provider component
- Heartbeat
- beforeunload
- Queue state
- Patient/history state
- Notes state
- Toast calls
- Navigation calls

---

### Week 2: QueueService + NotificationService (Lines: 712 → 550)

| Responsibility | Lines Removed | Target |
|---------------|---------------|--------|
| Queue lazy-loading (lines 356-377) | −22 | QueueService |
| Queue filtering useMemo (lines 364-370) | −7 | QueueService |
| Toast calls (14 locations) | −20 | NotificationService |
| Cache invalidations (lines 574, 750-756) | −15 | QueueService/SessionService |
| completeConsultation queue routing (lines 760-782) | −23 | QueueService |
| **Week 2 total** | **−87** | |

**Projected lines after Week 2:** ~625

Wait — this doesn't account for the shim additions from Week 1. Let me redo this more carefully.

Actually, the burndown should track the original 1004-line file, not including shim additions. The shim is a separate file.

**Corrected burndown of original ConsultationContext.tsx:**

| Week | Responsibility | Lines Removed | Cumulative Removed | Remaining |
|------|---------------|---------------|-------------------|-----------|
| 0 | (no removal) | 0 | 0 | 1004 |
| 1 | saveDraft, saveNotes, auto-save, loadAppointment, startConsultation, reducer, computed, completeConsultation (partial) | −502 | 502 | 502 |
| 2 | Queue, toasts, cache invalidation | −87 | 589 | 415 |
| 3 | Patient/history loading | −50 | 639 | 365 |
| 4 | DocumentationProvider extraction (notes, outcome, decision) | −200 | 839 | 165 |
| 5 | BillingProvider, SessionProvider (remaining session state) | −100 | 939 | 65 |
| 6 | QueueProvider, NotificationProvider (remaining UI state) | −65 | 1004 | 0 |

---

### Week 3: PatientContextProvider (Lines: 415 → 365)

| Responsibility | Lines Removed | Target |
|---------------|---------------|--------|
| Consultation history effect (lines 338-351) | −14 | PatientContextProvider |
| Patient/vitals loading (lines 418-452) | −35 | PatientContextProvider |
| `patient` state field | — | PatientContextProvider |
| `vitals` state field | — | PatientContextProvider |
| `consultationHistory` state field | — | PatientContextProvider |
| **Week 3 total** | **−50** | |

---

### Week 4: DocumentationProvider (Lines: 365 → 165)

| Responsibility | Lines Removed | Target |
|---------------|---------------|--------|
| Notes state + reducer actions (SET_NOTES, UPDATE_NOTE_FIELD, SET_OUTCOME, SET_PATIENT_DECISION) | −60 | DocumentationProvider |
| `state.notes`, `state.outcomeType`, `state.patientDecision` | — | DocumentationProvider |
| `setOutcome`, `setPatientDecision` callbacks | −15 | DocumentationProvider |
| `updateNotes` callback | −5 | DocumentationProvider |
| Draft restoration in loadAppointment (partial) | −20 | DocumentationProvider |
| Auto-save effect (if not already moved) | −27 | DocumentationProvider |
| saveDraft/saveNotes/closeStartDialog/closeCompleteDialog (remaining) | −73 | DocumentationProvider |
| **Week 4 total** | **−200** | |

---

### Week 5: BillingProvider + SessionProvider (Lines: 165 → 65)

| Responsibility | Lines Removed | Target |
|---------------|---------------|--------|
| Remaining session state (workflow, loading, error) | −40 | SessionProvider |
| Remaining session callbacks (closeStartDialog, openCompleteDialog, closeCompleteDialog, goToSurgeryPlanning) | −35 | SessionProvider |
| SessionProvider extraction from shim | −25 | SessionProvider |
| **Week 5 total** | **−100** | |

---

### Week 6: QueueProvider + NotificationProvider (Lines: 65 → 0)

| Responsibility | Lines Removed | Target |
|---------------|---------------|--------|
| Remaining queue state (waitingQueue, refetchQueue, isQueueRefetching, loadWaitingQueue) | −25 | QueueProvider |
| Remaining UI state (showStartDialog, showCompleteDialog) | −10 | SessionProvider |
| Remaining computed properties (isActive, isReadOnly, canSave, canComplete) | −10 | SessionProvider |
| Context value memoization (lines 894-942) | −20 | Split among providers |
| Provider render (lines 944-948) | −5 | Split among providers |
| useConsultationContext hook (lines 955-961) | −7 | Keep as convenience hook |
| Helpers (generateFullText, parseLegacyNotes, lines 967-1004) | −38 | DraftService |
| **Week 6 total** | **−65** | |

**Final state:** ConsultationContext.tsx reduced to 0 lines (or 7-line convenience hook if preserved).

---

## Technical Debt Reduced

| Debt Item | Week Eliminated | Method |
|-----------|----------------|--------|
| Monolithic reducer (18 actions) | Week 1 | Extracted to SessionService |
| Inline auto-save debouncing | Week 1 | Extracted to DraftService |
| Direct localStorage coupling | Week 1 | Replaced with DraftStorage via DraftService |
| Raw error strings in toast calls | Week 2 | Replaced with NotificationService + ClinicalErrorCode |
| Scattered cache invalidation | Week 2 | Centralized in QueueService/SessionService |
| Patient data loading inline | Week 3 | Extracted to PatientContextProvider |
| Notes/outcome state inline | Week 4 | Extracted to DocumentationProvider |
| Workflow state inline | Week 5 | Extracted to SessionProvider |
| Queue filtering inline | Week 6 | Extracted to QueueProvider |
| DocumentationContext shim | Week 6 | Deleted after full extraction |

---

## Render Cascade Reduction

| Week | Provider Extracted | Components No Longer Re-rendering on Notes Change |
|------|-------------------|-------------------------------------------------|
| 0 | (baseline) | 12+ (all components consuming ConsultationContext) |
| 1 | DraftService | 6 (components only consuming save state) |
| 4 | DocumentationProvider | 3 (only SOAP workspace components) |
| 5 | SessionProvider | 2 (only session shell components) |

**Target:** Notes keystroke causes ≤3 component re-renders after Phase 2.

---

## Bundle Size Impact

| Week | New Code | Removed Code | Net Change |
|------|----------|--------------|------------|
| 0 | +210 (shim) | 0 | +210 |
| 1 | +800 (services, commands) | −502 | +298 |
| 2 | +400 (QueueService, NotificationService) | −87 | +313 |
| 3 | +350 (PatientContextProvider, TimerService) | −50 | +300 |
| 4 | +600 (DocumentationProvider, SOAPNote) | −200 | +400 |
| 5 | +300 (BillingProvider, SessionProvider) | −100 | +200 |
| 6 | +250 (QueueProvider, NotificationProvider) | −65 | +185 |
| **Total** | **+2910** | **−1004** | **+1906** |

**Note:** Net increase is expected. The new code is modular and tree-shakeable. Unused providers/services can be eliminated by code splitting. The bloat is temporary — Phase 8 bundle optimization removes unused code.
