# Render Cycle Analysis

## Scope
Analysis of React render cycles from initial mount through steady state, with focus on identifying repeated renders, provider recreation, or render storms that could explain memory exhaustion before the compilation OOM.

---

## Phase 1: Initial Mount (T0 → T2)

### React Hydration
1. `ConsultationSessionPageOptimized` mounts
2. `useAuth()` resolves — returns stable context value
3. `ConsultationProvider` renders
4. `SessionProvider` renders
5. All nested providers render: Billing, Dialog, Timer, Queue, Patient, Documentation

### Provider Render Count
Each provider renders exactly **once** during initial mount because:
- All `useMemo` dependencies are stable (empty deps or primitive state)
- No parent state changes between renders
- `AuthContext` value is stable after hydration

### Memoization Effectiveness
| Provider | Memo | Deps | Re-renders on mount |
|----------|------|------|---------------------|
| SessionProvider | 5 useMemos | mixed | 1 |
| DocumentationProvider | 1 useMemo | state | 1 |
| PatientContextProvider | 1 useMemo | state | 1 |
| QueueContextProvider | 1 useMemo | mixed | 1 |
| DialogProvider | 1 useMemo | state | 1 |
| TimerContextProvider | 1 useMemo | mixed | 1 |
| BillingProvider | 1 useMemo | state | 1 |

---

## Phase 2: Initialization (T3 → T10)

### SessionProvider useEffect → initializeSession
1. `useEffect` fires: `initializeSession(5)`
2. State updates: `setIsInitializing(true)`, `setInitializationAttempted(true)`, `setIsLoading(true)`, `setError(null)`
3. React batches these → **1 re-render**

### API Calls (T4 → T8)
- All API calls are async. No renders during awaits.
- TanStack Query (used by QueueContextProvider) is disabled until `queueLoaded` is set.
- No render cycle triggered by API calls.

### Session State Settlement (T10)
1. `setAppointment`, `setPatient`, `setVitals`, `setConsultation`, `setDoctorId`, `setNotes`, `setOutcomeType`, `setPatientDecision`, `setWorkflowState`, `setIsReady(true)`
2. React batches all 10 setters → **1 re-render**

### Child Provider Reactions
| Provider | Trigger | Re-renders |
|----------|---------|------------|
| DocumentationProvider | `consultationId` prop changes | 1 (useEffect sync) + 1 (reducer update) = 2 |
| PatientContextProvider | 5 prop changes | 5 (useEffect syncs) + up to 5 (reducer updates) = up to 10 |
| QueueContextProvider | `doctorId`, `currentAppointmentId` change | 1 (memo recompute) |
| TimerContextProvider | `startedAt` changes | 1 (memo recompute) |
| DialogProvider | No prop changes | 0 |

**Total re-renders in Phase 2:** SessionProvider (1) + DocumentationProvider (2) + PatientContextProvider (up to 10) + QueueContextProvider (1) + TimerContextProvider (1) = **up to 15 additional renders**

This is one batch of work, not a loop. All re-renders complete synchronously before the browser paints.

---

## Phase 3: Compatibility Adapter (T11 → T13)

### ConsultationContext Recompute
1. SessionProvider state change → `CompatibilityAdapter` re-renders
2. `useMemo(workflow)` recomputes — depends on 7 values, all changed
3. `useMemo(state)` recomputes — depends on 11 values, all changed
4. `useMemo(value)` recomputes — depends on 19 values, all changed
5. `ConsultationContext.Provider` gets new value → **1 re-render of ConsultationSessionContent**

### ConsultationSessionContent Render Decision
1. `patient.isLoading` is now `false`, `patient.appointment` is set → skip LoadingState
2. `state.workflow.error` is `null` → skip error screen
3. `patient.appointment` and `patient.patient` are set → render full room
4. Dynamic imports fire for 6 components

**Total renders:** ConsultationSessionContent renders once with the full room.

---

## Phase 4: Steady State (T15+)

### Timer Tick Render Storm
- `TimerContextProvider` starts 1-second interval
- Every second: `setNow(new Date())` → `TimerContext.Provider` value changes
- ALL consumers of `useTimerContext()` re-render every second
- Affected components:
  - `ConsultationSessionHeader` (displays `elapsed` and `remainingDisplay`)
  - Any other component using timer context

**Impact:** 2–3 extra renders per second. Over 60 seconds = 120–180 extra renders. Negligible in isolation.

### Queue Refetch
- `QueueContextProvider` has `refetchInterval: 30_000` (30 seconds)
- Every 30s: TanStack Query refetches appointments
- `waitingQueue` memo recomputes
- `ConsultationQueuePanel` re-renders

**Impact:** 1 extra render per 30 seconds. Negligible.

### Documentation Auto-Save
- Debounced autosave triggers `saveDraft()`
- On save: `isSaving` changes → `DocumentationProvider` re-renders → `CompatibilityAdapter` recomputes → `ConsultationSessionContent` re-renders
- Frequency: user edits + debounce (typically 30–60s)

**Impact:** 1–2 extra renders per save. Negligible.

---

## Repeated Render Audit

| Phase | Trigger | Renders | Loop? |
|-------|---------|---------|-------|
| Mount | Initial render | 7 providers + page | No |
| Init effect | State batch | 1 (SessionProvider) | No |
| API return | 10 state setters | 1 (SessionProvider) | No |
| Docs sync | useEffect + reducer | 2 (DocumentationProvider) | No |
| Patient sync | 5 useEffects | up to 10 (PatientContextProvider) | No |
| Adapter | 3 useMemos | 1 (ConsultationContext) | No |
| Content render | Decision tree | 1 (ConsultationSessionContent) | No |
| Timer tick | 1s interval | 2-3 (timer consumers) | No |
| Queue refetch | 30s interval | 1-2 (queue panel) | No |

**No infinite render loops detected.**

---

## Memory Pressure Sources

1. **TimerContext 1s re-renders:** Minor. 2-3 components re-render per tick.
2. **PatientContextProvider 5-effect sync:** One-time burst of ~10 renders during init. Not repeated.
3. **ConsultationContext 3-layer memo:** Recomputes on every state change. State changes are batched and bounded.
4. **QueueContextProvider query refetching:** Every 30s. Bounded.

**None of these explain the ~4GB heap exhaustion during compilation.** The OOM is in Turbopack's module graph builder, not React's renderer.

---

## Compression Artifacts Analysis

The OOM occurs during `npx next build` or dev server startup, specifically at:
```
○ Compiling /doctor/consultations/session/[appointmentId] ...
[GC logs showing 3.6GB → 3.9GB heap]
FATAL ERROR: Ineffective mark-compacts near heap limit
```

This is triggered by Turbopack parsing, analyzing, and bundling the client entry module graph. The "compilation" step is entirely separate from React rendering. It fails before a single React component mounts.

**Conclusion:** The render cycle analysis shows no pathological render behavior. The consultation room's React render path is bounded and efficient. The OOM is purely a build-time module graph size issue.
