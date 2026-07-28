# PR-A06-04 — ConsultationSessionHeader: Timer Extraction

## Overview

This PR extracts timer display logic from `ConsultationSessionHeader.tsx` into a dedicated `TimerContextProvider`, and removes the `createNoopTimerService()` helper and `ITimerService` import from `ConsultationContext.tsx`. This is the fourth Provider Extraction after:

- PR-A04 — Workflow Engine
- PR-A05 — SessionService
- PR-A06-01 — DocumentationProvider
- PR-A06-02 — PatientContextProvider
- PR-A06-03 — QueueContextProvider

This PR continues the extraction sequence before tackling the final SessionProvider.

**Status:** COMPLETE

---

## Files Added

| File | Purpose |
|------|---------|
| `providers/timer/TimerContextProvider.tsx` | Presentation Layer provider for consultation timer display |
| `tests/frontend/providers/timer/TimerContextProvider.test.tsx` | 9 frontend tests |

**Total files added:** 2

---

## Files Modified

| File | Change |
|------|--------|
| `components/consultation/ConsultationSessionHeader.tsx` | Uses `TimerContextProvider` + `useTimerContext` instead of `useConsultationTimer` hook |
| `contexts/ConsultationContext.tsx` | Removed `ITimerService` import, `createNoopTimerService()` function; inlined no-op timer service |

**Total files modified:** 2

---

## Implementation Summary

### TimerContextProvider

- **Location:** `providers/timer/TimerContextProvider.tsx`
- **Layer:** Presentation Layer (React Context)
- **Lines:** ~170

**State Owned:**
- `elapsed` — Formatted elapsed time string
- `timeInfo` — Remaining time, percent used, warning/overrun states
- `remainingDisplay` — Formatted remaining time string
- `now` — Current time tick for re-computation

**Props Accepted:**
- `startedAt` — Consultation start timestamp
- `slotStartTime` — Appointment slot start
- `slotDurationMinutes` — Appointment slot duration

**Behavior:**
- Pure computation. No workflow ownership. No DraftService interaction. No patient ownership.
- Updates every second when `startedAt` is present.

### ConsultationContext Changes

- **Removed:** `import type { ITimerService }`
- **Removed:** `createNoopTimerService()` function
- **Replaced:** `timerService: createNoopTimerService()` with inline no-op object
- **Net change:** Lines reduced by 5; no infrastructure exports remaining in Presentation Layer

### Consumer Updates

| Consumer | Change |
|----------|--------|
| `ConsultationSessionHeader` | Wraps content in `TimerContextProvider`; inner component consumes `useTimerContext()` |
| `useConsultationTimer` | No longer used in header; remains available for any future direct consumers |

---

## Behavioral Parity Verification

### Preserved Behaviors

| Behavior | Implementation |
|----------|----------------|
| Elapsed time display | Same computation logic as previous hook |
| Remaining time display | Same `timeInfo` computation |
| Warning/overrun states | Same threshold logic (80% warning, 100% overrun) |
| Auto-refresh every second | Same `setInterval` pattern |

### Public API Changes

| Property | Before | After |
|----------|--------|-------|
| Timer elapsed | Computed in `useConsultationTimer` hook | Exposed via `useTimerContext()` |
| Timer `timeInfo` | Computed in `useConsultationTimer` hook | Exposed via `useTimerContext()` |
| Timer `remainingDisplay` | Computed in `useConsultationTimer` hook | Exposed via `useTimerContext()` |

---

## Validation

### TypeScript

```
tsc --noEmit --skipLibCheck
```

**Result:** PASS (0 errors)

### Unit Tests

```
npx vitest run --config vitest.config.unit.ts
```

**Result:** 1697 passed (same as before PR)

### Frontend Tests

```
npx vitest run --config vitest.config.frontend.ts tests/frontend/providers/timer/TimerContextProvider.test.tsx
```

**Result:** 9 passed

| Test | Description | Status |
|------|-------------|--------|
| returns null elapsed when no startedAt | Null input handling | ✅ |
| computes elapsed time | Elapsed string formatting | ✅ |
| formats hours when elapsed > 1 hour | Hours formatting | ✅ |
| computes timeInfo when slot data provided | Time info computation | ✅ |
| returns null timeInfo when slot data missing | Null slot handling | ✅ |
| computes remaining display when timeInfo available | Display formatting | ✅ |
| updates elapsed time on interval | Timer tick update | ✅ |
| does not update when startedAt is null | No-op without start | ✅ |
| throws error when used outside provider | Hook guard | ✅ |

---

## Dependencies

### Consumed Interfaces

| Interface | Purpose |
|-----------|---------|
| None (pure Presentation Layer computation) | — |

### Not Duplicated

| Concern | Source |
|---------|--------|
| Timer logic in header | `useConsultationTimer` (previous hook) |
| Workflow timer service | `createWorkflowCoordinator` (inline no-op in ConsultationContext) |

---

## Key Decisions

1. **Provider over hook:** The timer display is wrapped in a `TimerContextProvider` rather than remaining a standalone hook. This allows any future component in the subtree to consume timer state without prop drilling.
2. **Inline no-op timer service:** After removing `createNoopTimerService()` from ConsultationContext, the no-op `ITimerService` object is inlined directly in the coordinator dependencies. This removes infrastructure code from the Presentation Layer context file.
3. **Self-wrapping header:** `ConsultationSessionHeader` renders `TimerContextProvider` internally. This keeps the provider boundary at the component level, ensuring the header (and any future children) can consume timer state.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Consumer regression | Very Low | Low | Only ConsultationSessionHeader updated; 1,697 tests pass |
| Timer sync issues | Very Low | Low | Same computation logic, same interval pattern |
| Type mismatch | Very Low | Low | Strict TypeScript validation; 0 errors |

**Maximum Acceptable Risk:** VERY LOW
