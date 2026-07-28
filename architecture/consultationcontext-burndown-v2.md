# ConsultationContext Burndown v2

## Purpose

This document defines the measurable, phased reduction of `ConsultationContext.tsx` from its current state as a God Object (1019 lines) to its final state as a thin orchestration shim or deleted entirely.

The burndown is grounded in the Shim-First Replacement pattern. Every extraction must result in a net decrease in ConsultationContext lines.

---

## Current State

**File:** `contexts/ConsultationContext.tsx`
**Lines:** 1019
**Responsibilities:** 26
**Feature flags:** 1 (`USE_DRAFT_SERVICE`) with 4 scattered checks
**Dual paths:** 4 (saveDraft, saveNotes, restoreDraft, discardDraft)

### Responsibility Inventory

| # | Responsibility | Lines | Target | Priority |
|---|---------------|-------|--------|----------|
| 1 | `VitalsData` interface | 74-85 | PatientContextProvider | LOW |
| 2 | `StructuredNotes` interface | 87-92 | DocumentationProvider / Shared Kernel | LOW |
| 3 | `ConsultationProviderState` interface | 94-117 | Split among providers | MEDIUM |
| 4 | `ConsultationAction` union type | 119-136 | Split among providers | MEDIUM |
| 5 | `consultationReducer` | 142-260 | SessionService / SessionProvider | HIGH |
| 6 | `createInitialState` | 262-280 | SessionService | MEDIUM |
| 7 | `ConsultationContextValue` interface | 286-315 | Split among providers | MEDIUM |
| 8 | `ConsultationProvider` component | 328-1010 | SessionProvider / shim | HIGH |
| 9 | `loadAppointment` | 401-552 | SessionService | HIGH |
| 10 | `startConsultation` | 554-602 | SessionService | HIGH |
| 11 | `saveDraft` (dual path) | 608-668 | DraftService | HIGH |
| 12 | `saveNotes` (triple path) | 670-751 | DraftService / DocumentationProvider | HIGH |
| 13 | `updateNotes` | 753-755 | DocumentationProvider | LOW |
| 14 | `setOutcome` | 757-767 | DocumentationProvider | LOW |
| 15 | `setPatientDecision` | 769-771 | DocumentationProvider | LOW |
| 16 | `completeConsultation` | 783-851 | SessionService | HIGH |
| 17 | `switchToPatient` | 853-872 | SessionService | HIGH |
| 18 | `goToSurgeryPlanning` | 874-877 | SessionProvider | LOW |
| 19 | Auto-save useEffect | 881-907 | DraftService / DocumentationProvider | MEDIUM |
| 20 | Heartbeat useEffect | 909-932 | SessionService | MEDIUM |
| 21 | Initial load useEffect | 934-939 | SessionProvider | LOW |
| 22 | beforeunload useEffect | 941-952 | SessionService | LOW |
| 23 | Context value memoization | 957-1004 | Split among providers | MEDIUM |
| 24 | `useConsultationContext` hook | 1013-1019 | Convenience hook or delete | LOW |
| 25 | `generateFullText` helper | 1028-1045 | DraftService / Shared Kernel | LOW |
| 26 | `parseLegacyNotes` helper | 1051-1065 | DraftService / Shared Kernel | LOW |

---

## Burndown Schedule

### Baseline Measurement

| Metric | Value |
|--------|-------|
| Total lines | 1019 |
| Business logic lines | ~850 |
| Boilerplate lines | ~169 |
| Responsibilities | 26 |
| Feature flags | 1 |
| Dual paths | 4 |
| Cyclomatic complexity | ~55 |

---

### Week 0: DraftService Cutover (Current State)

**Status:** DraftService extracted with flawed dual-path strategy.

**What needs to happen:**
1. Create `LegacyDraftOperations` with old logic
2. Create `DraftOperationsShim` routing to legacy or service
3. Replace 4 scattered flag checks with shim calls
4. Remove old inline logic from ConsultationContext
5. Delete legacy, shim, and flag after validation

| Metric | Before | After |
|--------|--------|-------|
| Lines | 1019 | ~810 |
| Responsibilities | 26 | 24 |
| Feature flags | 1 | 0 |
| Dual paths | 4 | 0 |

**Lines removed:** ~209 (saveDraft, saveNotes, draft restoration, draft cleanup, helpers)

---

### Week 1: QueueService + NotificationService

**Pattern:** Shim-First Replacement

| What Moves | From Lines | To | Lines Removed |
|-----------|-----------|-----|---------------|
| Queue lazy-loading + filtering | 364-377 | QueueService | 22 |
| Toast calls (14 locations) | scattered | NotificationService | 20 |
| Cache invalidations (session start/complete) | 574, 750-756 | Respective services | 15 |
| Queue routing in completeConsultation | 760-782 | QueueService | 23 |
| `useSaveConsultationDraft` hook import | 45, 339 | Superseded | 2 |
| `useDoctorTodayAppointments` hook | 337, 364-377 | QueueProvider | 5 |

| Metric | Before | After |
|--------|--------|-------|
| Lines | ~810 | ~713 |
| Responsibilities | 24 | 20 |
| Feature flags | 0 | 0 |
| Dual paths | 0 | 0 |

**Lines removed:** ~97

---

### Week 2: PatientContextProvider

**Pattern:** Migrate-Then-Remove

| What Moves | From Lines | To | Lines Removed |
|-----------|-----------|-----|---------------|
| Consultation history effect | 338-351 | PatientContextProvider | 14 |
| Patient/vitals loading | 418-452 | PatientContextProvider | 35 |
| `usePatientConsultationHistory` import | 46, 343-355 | Superseded | 5 |
| `VitalsData` interface | 74-85 | Shared Kernel / Patient DTOs | 12 |

| Metric | Before | After |
|--------|--------|-------|
| Lines | ~713 | ~647 |
| Responsibilities | 20 | 17 |
| Feature flags | 0 | 0 |
| Dual paths | 0 | 0 |

**Lines removed:** ~66

---

### Week 3: DocumentationProvider

**Pattern:** Migrate-Then-Remove (shadow mode)

| What Moves | From Lines | To | Lines Removed |
|-----------|-----------|-----|---------------|
| Notes state + reducer actions | 186-201, 107 | DocumentationProvider | 15 |
| Outcome/decision state + actions | 203-221 | DocumentationProvider | 20 |
| Auto-save effect | 881-907 | DocumentationProvider | 30 |
| `updateNotes`, `setOutcome`, `setPatientDecision` | 753-771 | DocumentationProvider | 20 |
| Old draft path (Week 0 mistake correction) | 608-668 | Delete entirely | 100 |
| `StructuredNotes` interface | 87-92 | Shared Kernel / SOAPNote VO | 6 |

**Critical:** This extraction must remove the old draft path that was incorrectly preserved in Week 0.

| Metric | Before | After |
|--------|--------|-------|
| Lines | ~647 | ~456 |
| Responsibilities | 17 | 12 |
| Feature flags | 0 | 0 |
| Dual paths | 0 | 0 |

**Lines removed:** ~191

---

### Week 4: SessionService + SessionProvider

**Pattern:** Shim-First Replacement for SessionService, Migrate-Then-Remove for SessionProvider

| What Moves | From Lines | To | Lines Removed |
|-----------|-----------|-----|---------------|
| Reducer + 16 action types | 138-260 | SessionService | 140 |
| `loadAppointment` | 401-552 | SessionService | 150 |
| `startConsultation` | 554-602 | SessionService | 50 |
| `completeConsultation` | 783-851 | SessionService | 70 |
| `switchToPatient` | 853-872 | SessionService | 20 |
| Heartbeat useEffect | 909-932 | SessionService | 25 |
| beforeunload useEffect | 941-952 | SessionService | 12 |
| Computed properties | 390-397 | SessionProvider | 15 |
| `ConsultationProviderState` interface | 94-117 | SessionProvider | 25 |

| Metric | Before | After |
|--------|--------|-------|
| Lines | ~456 | ~149 |
| Responsibilities | 12 | 6 |
| Feature flags | 0 | 0 |
| Dual paths | 0 | 0 |

**Lines removed:** ~307

---

### Week 5: Remaining Orchestration

**Pattern:** Migrate-Then-Remove

| What Moves | From Lines | To | Lines Removed |
|-----------|-----------|-----|---------------|
| Context value memoization | 957-1004 | Split among providers | 50 |
| Provider render JSX | 1006-1010 | Split among providers | 5 |
| `goToSurgeryPlanning` | 874-877 | SessionProvider | 4 |
| `openCompleteDialog` / `closeCompleteDialog` | 773-781 | SessionProvider | 10 |

| Metric | Before | After |
|--------|--------|-------|
| Lines | ~149 | ~80 |
| Responsibilities | 6 | 3 |
| Feature flags | 0 | 0 |
| Dual paths | 0 | 0 |

**Lines removed:** ~69

---

### Week 6: Final Cleanup

**Actions:**
1. Delete `useConsultationContext` hook (or keep as convenience)
2. Delete remaining boilerplate
3. Delete ConsultationContext.tsx entirely, or reduce to ≤60 line shim

| Metric | Before | After |
|--------|--------|-------|
| Lines | ~80 | ≤60 or 0 |
| Responsibilities | 3 | 0 or ≤2 |
| Feature flags | 0 | 0 |
| Dual paths | 0 | 0 |

---

## Cumulative Burndown

| Week | Lines Removed | Cumulative Removed | Remaining Lines | Cumulative Responsibility Reduction |
|------|---------------|-------------------|-----------------|-----------------------------------|
| 0 | 209 | 209 | 810 | 26 → 24 |
| 1 | 97 | 306 | 713 | 24 → 20 |
| 2 | 66 | 372 | 647 | 20 → 17 |
| 3 | 191 | 563 | 456 | 17 → 12 |
| 4 | 307 | 870 | 149 | 12 → 6 |
| 5 | 69 | 939 | 80 | 6 → 3 |
| 6 | 20-80 | 959-1039 | 0-60 | 3 → 0 |

---

## Complexity Metrics

| Week | Lines | Responsibilities | Cyclomatic Complexity | Feature Flags | Dual Paths |
|------|-------|-----------------|----------------------|---------------|------------|
| Current | 1019 | 26 | ~55 | 1 | 4 |
| After DraftService cutover | ~810 | 24 | ~45 | 0 | 0 |
| After QueueService | ~713 | 20 | ~38 | 0 | 0 |
| After PatientContextProvider | ~647 | 17 | ~32 | 0 | 0 |
| After DocumentationProvider | ~456 | 12 | ~22 | 0 | 0 |
| After SessionService | ~149 | 6 | ~10 | 0 | 0 |
| After remaining | ≤60 | ≤3 | ≤5 | 0 | 0 |

---

## Verification Checkpoints

After each extraction week, verify:

| Checkpoint | Method | Target |
|------------|--------|--------|
| ConsultationContext lines decreased | `wc -l` | ✅ Yes |
| Feature flag checks in context | `grep isFeatureEnabled` | 0 |
| localStorage calls in context | `grep localStorage` | 0 |
| toast calls in context | `grep toast.` | 0 |
| Direct API calls in context | `grep doctorApi\|consultationApi\|apiClient` | 0 |
| Reducer actions remaining | Count action types | Decreasing |
| State fields remaining | Count state properties | Decreasing |
| Cyclomatic complexity | Manual count | Decreasing |
| All unit tests pass | `vitest run` | 100% pass |
| All frontend tests pass | `vitest run --frontend` | 100% pass |
| TypeScript compiles | `tsc --noEmit` | 0 errors |
| No circular dependencies | Import graph check | None |
| No `as unknown as` casts | `grep as unknown as` | 0 |

---

## Rollback Line Count Targets

If rollback is needed at any checkpoint, the target line count for the restored ConsultationContext is:

| Rollback Point | Target Lines |
|----------------|-------------|
| After DraftService cutover | ~810 |
| After QueueService | ~713 |
| After PatientContextProvider | ~647 |
| After DocumentationProvider | ~456 |
| After SessionService | ~149 |
| Final state | ≤60 or 0 |

---

## Final State: Deleted or ≤60 Lines

After all extractions, ConsultationContext.tsx has two possible final states:

### Option A: Deleted

All functionality migrated to providers and services. `ConsultationContext.tsx` is deleted. Consumers use `useSession()`, `useDocumentation()`, etc. directly.

### Option B: ≤60 Line Shim

A thin convenience wrapper that composes all providers:

```typescript
// contexts/ConsultationContext.tsx — final state, ≤60 lines

'use client';

import { SessionProvider } from './session/SessionProvider';
import { DocumentationProvider } from './documentation/DocumentationProvider';
import { PatientContextProvider } from './patients/PatientContextProvider';
import { QueueProvider } from './queue/QueueProvider';

export function ConsultationProvider({ children, initialAppointmentId }: Props) {
  return (
    <SessionProvider initialAppointmentId={initialAppointmentId}>
      <DocumentationProvider>
        <PatientContextProvider>
          <QueueProvider>
            {children}
          </QueueProvider>
        </PatientContextProvider>
      </DocumentationProvider>
    </SessionProvider>
  );
}

export const useConsultationContext = () => {
  // Backward-compatible convenience hook
  // Delegates to individual provider hooks
};
```

**Recommendation:** Option A (delete) if all consumers have migrated. Option B (60-line shim) if backward compatibility is required for external consumers.

---

## Summary

The burndown v2 replaces the optimistic "extract and preserve" approach with a disciplined "extract, cut over, remove" approach. Every extraction must shrink ConsultationContext. The total expected reduction is ~959-1039 lines, from 1019 to ≤60 or 0.

The key difference from the original burndown plan: **old code is removed, not preserved.** The target is not "ConsultationContext delegates to services" but "ConsultationContext is gone."
