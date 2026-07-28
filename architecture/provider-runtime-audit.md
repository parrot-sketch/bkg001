# Provider Runtime Audit

## Audit Scope
All providers in the `SessionProvider` composition tree, plus the `ConsultationContext` compatibility layer.

---

## 1. SessionProvider

### Initialization
- **File:** `providers/session/SessionProvider.tsx:171`
- **Type:** Client component (`'use client'`)
- **Dependencies:** `useRouter`, `useQueryClient`, `useAuth`

### Provider Composition (in render)
```tsx
<SessionContext.Provider value={value}>
  <BillingProvider>
    <DialogProvider>
      <TimerContextProvider {...timerProps}>
        <QueueContextProvider {...queueProps}>
          <PatientContextProvider {...patientProps}>
            <DocumentationProvider {...docsProps}>
              {children}
            </DocumentationProvider>
          </PatientContextProvider>
        </QueueContextProvider>
      </TimerContextProvider>
    </DialogProvider>
  </BillingProvider>
</SessionContext.Provider>
```

### Inputs
| Prop | Source | Type | Nullable |
|------|--------|------|----------|
| `initialAppointmentId` | `page.tsx` | `number` | No |

### Outputs (SessionContext)
| Field | Type | Source | Nullable |
|-------|------|--------|----------|
| `appointment` | `AppointmentResponseDto \| null` | State | Yes |
| `patient` | `PatientResponseDto \| null` | State | Yes |
| `vitals` | `VitalsData \| null` | State | Yes |
| `consultation` | `ConsultationResponseDto \| null` | State | Yes |
| `doctorId` | `string \| null` | State | Yes |
| `notes` | `StructuredNotes` | State | No |
| `outcomeType` | `ConsultationOutcomeType \| null` | State | Yes |
| `patientDecision` | `PatientDecision \| null` | State | Yes |
| `isLoading` | `boolean` | State | No |
| `error` | `string \| null` | State | Yes |
| `workflowState` | `ConsultationWorkflowState` | State | No |
| `isActive` | `boolean` | Derived | No |
| `isReadOnly` | `boolean` | Derived | No |

### Memoization
- `httpPatientApi`, `httpConsultationApi`, `httpDoctorApi`, `localStorageDraftStorage`, `draftService` — `useMemo([], [])` — stable
- `coordinator` — `useMemo([draftService, httpPatientApi])` — stable
- `sessionService` — `useMemo([coordinator, ...])` — stable
- `isActive`, `isReadOnly` — `useMemo` with deep deps
- `docsProps`, `patientProps`, `queueProps`, `timerProps` — `useMemo` with state deps — unstable (by design)
- `value` — `useMemo` with 17 deps — unstable (by design)

### Possible Undefined Values
- `appointment`, `patient`, `vitals`, `consultation`, `doctorId` — all `null` before initialization
- `error` — `null` initially
- `workflowState` — initialized to `createInitialContext(initialAppointmentId).state`
- `notes` — initialized to `{}`

### Provider Ordering
Correct. SessionProvider wraps all child providers in the order:
`Billing → Dialog → Timer → Queue → Patient → Documentation`

### Issues Found
1. **Heavy module graph:** SessionProvider is the PRIMARY source of the client bundle bloat. It directly instantiates `SessionService`, `WorkflowCoordinator`, `WorkflowEngine`, and `DefaultGuardRegistry` on the client.
2. **Stale ref risk:** `workflowEngineRef` is set inside `useMemo([draftService, httpPatientApi])`. If those deps ever change, the ref still points to the OLD engine. Current deps are stable, so no immediate failure.
3. **useEffect([user]) reset:** Resets `initializationAttempted` and `isReady` on every `user` change. `user` from `useAuth()` is stable after initial hydration, so no loop.

---

## 2. DocumentationProvider

### Initialization
- **File:** `providers/documentation/DocumentationProvider.tsx:180`
- **Type:** Client component
- **Dependencies:** `useReducer`, `useRef`, `useEffect`, `useCallback`

### Inputs
| Prop | Source | Type | Nullable |
|------|--------|------|----------|
| `draftService` | SessionProvider | `DraftService` | No |
| `consultationId` | SessionProvider | `number \| null` | Yes |
| `doctorId` | SessionProvider | `string \| null` | Yes |
| `isCompleted` | SessionProvider | `boolean` | No |
| `notes` | SessionProvider | `StructuredNotes` | No |
| `outcomeType` | SessionProvider | `ConsultationOutcomeType \| null` | Yes |
| `patientDecision` | SessionProvider | `PatientDecision \| null` | Yes |

### Outputs (DocumentationContext)
| Field | Type | Source |
|-------|------|--------|
| `notes` | `StructuredNotes` | Reducer state |
| `outcomeType` | `ConsultationOutcomeType \| null` | Reducer state |
| `patientDecision` | `PatientDecision \| null` | Reducer state |
| `isDirty` | `boolean` | Reducer state |
| `isSaving` | `boolean` | Reducer state |
| `autoSaveStatus` | `'idle' \| 'saving' \| 'saved' \| 'error'` | Reducer state |
| `lastSavedAt` | `string \| null` | Reducer state |
| `hasConflict` | `boolean` | Reducer state |

### Memoization
- `canSave` — inline expression
- `updateNotes`, `setOutcome`, `setPatientDecision` — `useCallback([], [])` — stable
- `saveDraft` — `useCallback([state.isDirty, state.notes, state.outcomeType, state.patientDecision, consultationId, doctorId, draftService])` — unstable (by design, depends on mutable state)

### Possible Undefined Values
- `consultationId` — `null` before init
- `doctorId` — `null` before init
- `notes` — `{}` initially
- `outcomeType` — `null` initially

### Key useEffect
```tsx
useEffect(() => {
  if (consultationId && consultationId !== lastSyncedConsultationIdRef.current) {
    lastSyncedConsultationIdRef.current = consultationId;
    // sync notes, outcomeType, patientDecision from props to reducer
  }
}, [consultationId, notes, outcomeType, patientDecision, state.outcomeType, state.patientDecision]);
```

**Issue:** Dep array includes `state.outcomeType` and `state.patientDecision`. Dispatches mutate these, which changes dep values. However, `lastSyncedConsultationIdRef.current` prevents re-entry after first sync for the same consultation. Risk: if `consultationId` bounces (e.g., `null` → `12` → `null` → `12`), effect re-runs and re-dispatches. Not currently observed.

---

## 3. PatientContextProvider

### Initialization
- **File:** `providers/patient/PatientContextProvider.tsx:134`
- **Type:** Client component
- **Dependencies:** `useReducer`, `useEffect`, `useCallback`

### Inputs
| Prop | Source | Type | Nullable |
|------|--------|------|----------|
| `patientApi` | SessionProvider | `PatientApi` | No |
| `patient` | SessionProvider | `PatientResponse \| null` | Yes |
| `appointment` | SessionProvider | `AppointmentResponse \| null` | Yes |
| `vitals` | SessionProvider | `VitalsData \| null` | Yes |
| `isLoading` | SessionProvider | `boolean` | No |
| `error` | SessionProvider | `string \| null` | Yes |
| `consultationId` | SessionProvider | `number \| null` | Yes |

### Outputs (PatientContext)
| Field | Type | Source |
|-------|------|--------|
| `patient` | `PatientResponse \| null` | Reducer state |
| `appointment` | `AppointmentResponse \| null` | Reducer state |
| `vitals` | `VitalsData \| null` | Reducer state |
| `isLoading` | `boolean` | Reducer state |
| `error` | `string \| null` | Reducer state |

### Memoization
- `refreshPatient` — `useCallback([patient?.id, patientApi])`
- `refreshAppointments` — `useCallback([patient?.id, patientApi])`
- `refreshVitals` — `useCallback([patient?.id, consultationId, patientApi])`
- `value` — `useMemo([state, ...])` — unstable (by design)

### Issues Found
1. **Five separate useEffect hooks** for prop-to-state sync. Each dispatches to reducer on prop change. Not a loop because props only change when SessionProvider sets them.
2. **refreshVitals uses `consultationId`** from props. If consultationId changes frequently, `refreshVitals` callback is recreated frequently. Minor.

---

## 4. QueueContextProvider

### Initialization
- **File:** `providers/queue/QueueContextProvider.tsx:81`
- **Type:** Client component
- **Dependencies:** `useReducer`, `useQuery` (TanStack Query)

### Inputs
| Prop | Source | Type | Nullable |
|------|--------|------|----------|
| `doctorId` | SessionProvider | `string \| null` | Yes |
| `currentAppointmentId` | SessionProvider | `number \| null` | Yes |

### Outputs (QueueContext)
| Field | Type | Source |
|-------|------|--------|
| `waitingQueue` | `AppointmentResponseDto[]` | Derived from query |
| `refetchQueue` | `() => Promise<unknown>` | TanStack Query refetch |
| `isQueueRefetching` | `boolean` | TanStack Query |
| `loadWaitingQueue` | `() => void` | Callback |

### Key Behavior
- `useDoctorTodayAppointments(doctorId, state.queueLoaded, false)`
- Query is **disabled** until `state.queueLoaded` becomes `true`
- `loadWaitingQueue()` dispatches `SET_LOADED: true`, which re-enables the query
- `page.tsx` calls `queue.loadWaitingQueue()` in `useEffect([patient.appointment])`

### Issues Found
1. **Deferred loading pattern:** Queue doesn't auto-load. Depends on `page.tsx` effect. Clean.
2. **doctorId starts null:** Query stays disabled until `doctorId` is set by SessionProvider. Clean.

---

## 5. DialogProvider

### Initialization
- **File:** `providers/dialog/DialogProvider.tsx:50`
- **Type:** Client component
- **Dependencies:** `useState`, `useCallback`

### Inputs
None (no props)

### Outputs (DialogContext)
| Field | Type | Source |
|-------|------|--------|
| `isCompleteDialogOpen` | `boolean` | State |
| `isStartDialogOpen` | `boolean` | State |
| `openCompleteDialog` | `() => void` | Callback |
| `closeCompleteDialog` | `() => void` | Callback |
| `openStartDialog` | `() => void` | Callback |
| `closeStartDialog` | `() => void` | Callback |

### Issues Found
None. Pure presentational state. No side effects.

---

## 6. TimerContextProvider

### Initialization
- **File:** `providers/timer/TimerContextProvider.tsx:126`
- **Type:** Client component
- **Dependencies:** `useState`, `useEffect`, `useMemo`

### Inputs
| Prop | Source | Type | Nullable |
|------|--------|------|----------|
| `startedAt` | SessionProvider | `Date \| string \| null` | Yes |
| `slotStartTime` | SessionProvider | `Date \| null` | Yes |
| `slotDurationMinutes` | SessionProvider | `number \| null` | Yes |

### Outputs (TimerContext)
| Field | Type | Source |
|-------|------|--------|
| `elapsed` | `string \| null` | Derived |
| `timeInfo` | `TimeInfo \| null` | Derived |
| `remainingDisplay` | `string \| null` | Derived |
| `now` | `Date` | State (ticks every second) |

### Issues Found
1. **1-second interval when `startedAt` is truthy:** `setInterval(() => setNow(new Date()), 1000)`
2. **Context value changes every second:** `value` memo includes `now`, which changes every second
3. **Effect:** All consumers of `useTimerContext()` re-render every second
4. **Impact:** Adds render pressure but does not crash. Combined with other unstable contexts, contributes to render storm.

---

## 7. BillingProvider

### Initialization
- **File:** `providers/billing/BillingProvider.tsx:78`
- **Type:** Client component
- **Dependencies:** `useState`, `useMemo`

### Inputs
| Prop | Source | Type | Nullable |
|------|--------|------|----------|
| `existingBilling` | None (not passed by SessionProvider) | `BillingSummary \| null` | Yes |

### Outputs (BillingContext)
| Field | Type | Source |
|-------|------|--------|
| `billingItems` | `BillItem[]` | State |
| `billingTotal` | `number` | State |
| `discount` | `number` | State |
| `billingWarnings` | `string[]` | State |
| `hasBilling` | `boolean` | Derived |
| `paymentStatus` | `string \| undefined` | Derived |
| `consultationFee` | `number` | Derived |
| `netAmount` | `number` | Derived |

### Issues Found
1. **Not receiving `existingBilling`:** SessionProvider does not pass `existingBilling` to BillingProvider. Billing state initializes with empty defaults.
2. **No side effects:** Clean provider. No crashes.

---

## 8. ConsultationContext (Compatibility Layer)

### Initialization
- **File:** `contexts/ConsultationContext.tsx:91`
- **Type:** Client component
- **Dependencies:** `useMemo`

### Inputs
| Prop | Source | Type | Nullable |
|------|--------|------|----------|
| `initialAppointmentId` | `page.tsx` | `number` | No |

### Internal Hooks Called
| Hook | Source | Required Context |
|------|--------|-----------------|
| `useSessionContext()` | SessionProvider | SessionProvider |
| `useDialogContext()` | DialogProvider | DialogProvider |
| `useDocumentationContext()` | DocumentationProvider | DocumentationProvider |
| `useQueueContext()` | QueueContextProvider | QueueContextProvider |

### Mapping Table
| Legacy Property | Source | Transformation | Consumer |
|----------------|--------|----------------|----------|
| `state.workflow.state` | `session.workflowState` | Direct mapping | `page.tsx` error check |
| `state.workflow.error` | `session.error` | Direct mapping | `page.tsx` JSON.stringify fallback |
| `state.workflow.isDirty` | `docs.isDirty` | Direct mapping | Workspace footer |
| `state.workflow.appointmentId` | `session.appointment?.id` | Nullish coalescing | Not used in page |
| `state.workflow.patientId` | `session.patient?.id` | Nullish coalescing | Not used in page |
| `state.workflow.consultationId` | `session.consultation?.id` | Nullish coalescing | Not used in page |
| `state.workflow.lastSavedAt` | `docs.lastSavedAt` | `new Date(docs.lastSavedAt)` | Not used in page |
| `state.appointment` | `session.appointment` | Direct mapping | `PatientInfoSidebar` |
| `state.patient` | `session.patient` | Direct mapping | `PatientInfoSidebar` |
| `state.vitals` | `session.vitals` | Direct mapping | `PatientInfoSidebar` |
| `state.consultation` | `session.consultation` | Direct mapping | `page.tsx` dialogs |
| `state.doctorId` | `session.doctorId` | Direct mapping | `page.tsx` dialogs |
| `state.notes` | `docs.notes` | Direct mapping | `ConsultationWorkspaceOptimized` |
| `state.outcomeType` | `docs.outcomeType` | Direct mapping | Workspace tabs |
| `state.patientDecision` | `docs.patientDecision` | Direct mapping | Workspace tabs |
| `state.isLoading` | `session.isLoading` | Direct mapping | `page.tsx` loading check |
| `state.isSaving` | `docs.isSaving` | Direct mapping | Workspace footer |
| `state.showCompleteDialog` | `dialog.isCompleteDialogOpen` | Direct mapping | `CompleteConsultationDialog` |
| `state.showStartDialog` | `dialog.isStartDialogOpen` | Direct mapping | `StartConsultationDialog` |
| `state.autoSaveStatus` | `docs.autoSaveStatus` | Direct mapping | Workspace footer |
| `isActive` | `session.isActive` | Direct mapping | Workspace, header |
| `isReadOnly` | `session.isReadOnly` | Direct mapping | Workspace tabs |
| `canSave` | `docs.isDirty` | Direct mapping | Workspace Save button |
| `canComplete` | `isActive && !docs.isSaving` | Derived | Workspace Complete button |
| `loadAppointment` | `session.initializeSession` | Direct binding | Not used in page |
| `startConsultation` | `session.startConsultation` | Direct binding | `StartConsultationDialog` |
| `completeConsultation` | `session.completeSession` | Direct binding | `CompleteConsultationDialog` |
| `switchToPatient` | `session.switchToPatient` | Direct binding | Queue panel |
| `saveDraft` | `docs.saveDraft` | Direct binding | Header, queue |
| `saveNotes` | `docs.saveNotes` | Direct binding | Workspace footer |
| `updateNotes` | `docs.updateNotes` | Direct binding | Workspace tabs |
| `setOutcome` | `docs.setOutcome` | Direct binding | Workspace tabs |
| `setPatientDecision` | `docs.setPatientDecision` | Direct binding | Workspace tabs |
| `closeStartDialog` | `dialog.closeStartDialog` | Direct binding | Start dialog |
| `openCompleteDialog` | `dialog.openCompleteDialog` | Direct binding | Header |
| `closeCompleteDialog` | `dialog.closeCompleteDialog` | Direct binding | Complete dialog |
| `goToSurgeryPlanning` | `session.goToSurgeryPlanning` | Direct binding | Not surfaced in page |

### Issues Found
1. **`state.workflow.error` type mismatch risk:** `session.error` is `string | null` (enforced by SessionProvider). The compatibility layer types it as `string | null` in `ConsultationWorkflowContext`. `page.tsx` handles both string and non-string with `typeof` + `JSON.stringify`. No crash, but produces `[object Object]` for Error instances.
2. **Redundant `notes` mapping:** `docs.notes` is already available via `useDocumentationContext()`. The compatibility layer duplicates it in `state.notes`. `ConsultationWorkspaceOptimized` reads from `docs` directly, making `state.notes` unused in the workspace. Minor inefficiency.
3. **`waitingQueue` not derived from consultation context:** It passes through `queue.waitingQueue` directly. If queue data is stale, the compatibility layer provides no buffer.

---

## Provider Audit Summary

| Provider | Render-Safe | Side Effects | Memoization | Bundle Risk |
|----------|-------------|--------------|-------------|-------------|
| SessionProvider | ✅ | ✅ (init, heartbeat) | ⚠️ Many unstable memos | **CRITICAL** |
| DocumentationProvider | ✅ | ✅ (notes sync) | ⚠️ Dep loop guarded | Low |
| PatientContextProvider | ✅ | ✅ (5 prop syncs) | ⚠️ Unstable callbacks | Low |
| QueueContextProvider | ✅ | ❌ None | ✅ Stable | Low |
| DialogProvider | ✅ | ❌ None | ✅ Stable | Low |
| TimerContextProvider | ✅ | ✅ (1s interval) | ❌ Context changes every second | Medium |
| BillingProvider | ✅ | ❌ None | ✅ Stable | Low |
| ConsultationContext | ✅ | ❌ None | ❌ 19 dep memo | Low |
