# SessionService Responsibility Audit

## Purpose

This document audits every responsibility in `ConsultationContext.tsx` and assigns it to exactly one owner after SessionService extraction.

---

## 1. Full Responsibility Inventory

### 1.1 Consultation Initialization (`loadAppointment` — lines 391–531)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Fetch appointment | ConsultationContext (inline) | `doctorApi.getAppointment()` | None | **SessionService** |
| Fetch doctor | ConsultationContext (inline) | `doctorApi.getDoctorByUserId()` | None | **SessionService** |
| Fetch consultation | ConsultationContext (inline) | `consultationApi.getConsultation()` | None | **SessionService** |
| Fetch patient | ConsultationContext (inline) | `doctorApi.getPatient()` | None | **SessionService** |
| Fetch vitals | ConsultationContext (inline) | `apiClient.get()` | None | **SessionService** |
| Hydrate notes from consultation | ConsultationContext (inline) | `parseLegacyNotes()` | `SET_NOTES` dispatch | **SessionService** (coordinator) |
| Hydrate outcome/decision | ConsultationContext (inline) | None | `SET_OUTCOME`, `SET_PATIENT_DECISION` dispatch | **SessionService** (coordinator) |
| Restore localStorage draft | ConsultationContext (inline) | `localStorage` | `SET_NOTES` dispatch | **SessionService** (delegates to DraftService) |
| Determine initial workflow state | ConsultationContext (inline) | `ConsultationWorkflowShim` | `transitionTo()` calls | **SessionService** (via WorkflowCoordinator) |
| Set `showStartDialog` | ConsultationContext (inline) | None | `SHOW_START_DIALOG` dispatch | **SessionProvider** (Presentation) |
| Set `showCompleteDialog` | ConsultationContext (inline) | None | `SHOW_COMPLETE_DIALOG` dispatch | **SessionProvider** (Presentation) |
| Set `isDirty = false` | ConsultationContext (inline) | None | `SET_DIRTY` dispatch | **SessionService** (via coordinator) |
| Error handling + toast | ConsultationContext (inline) | `toast.error()` | Toast display | **Presentation Layer** (caller handles) |

### 1.2 Start Consultation (`startConsultation` — lines 533–581)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Call `doctorApi.startConsultation()` | ConsultationContext (inline) | `doctorApi` | API call | **SessionService** |
| Handle already-in-progress | ConsultationContext (inline) | String matching | Toast info | **SessionService** (returns result, caller shows toast) |
| Refresh consultation record | ConsultationContext (inline) | `consultationApi.getConsultation()` | `SET_CONSULTATION` dispatch | **SessionService** (coordinator) |
| Invalidate React Query | ConsultationContext (inline) | `queryClient.invalidateQueries()` | Cache refresh | **SessionService** (returns invalidation instructions) |
| Transition to ACTIVE | ConsultationContext (inline) | `ConsultationWorkflowShim` | `transitionTo()` | **SessionService** (via WorkflowCoordinator) |
| Toast success | ConsultationContext (inline) | `toast.success()` | Toast display | **Presentation Layer** (caller handles) |

### 1.3 Complete Consultation (`completeConsultation` — lines 710–754)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Clear auto-save timer | ConsultationContext (inline) | `saveTimeoutRef` | Cancel timeout | **SessionService** (returns cleanup instructions) |
| Transition COMPLETING → TRANSITIONING | ConsultationContext (inline) | `ConsultationWorkflowShim` | `transitionTo()` | **SessionService** (via WorkflowCoordinator) |
| Clear localStorage draft | ConsultationContext (inline) | `localStorage.removeItem()` | Storage mutation | **SessionService** (delegates to DraftService) |
| Reset all state | ConsultationContext (inline) | `createInitialState()` | `RESET` dispatch | **SessionProvider** (Presentation re-render) |
| Invalidate React Query (6 queries) | ConsultationContext (inline) | `queryClient.invalidateQueries()` | Cache refresh | **SessionService** (returns invalidation list) |
| Toast success | ConsultationContext (inline) | `toast.success()` | Toast display | **Presentation Layer** |
| Navigate to hub | ConsultationContext (inline) | `router.push()` | Navigation | **Presentation Layer** |
| Error handling + state rollback | ConsultationContext (inline) | `SET_WORKFLOW_STATE` dispatch | State mutation | **SessionService** (returns error result) |

### 1.4 Close Complete Dialog (`closeCompleteDialog` — lines 705–708)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Hide dialog | ConsultationContext (inline) | None | `SHOW_COMPLETE_DIALOG` dispatch | **SessionProvider** (Presentation) |
| Transition COMPLETING → ACTIVE | ConsultationContext (inline) | `ConsultationWorkflowShim` | `transitionTo()` | **SessionService** (via WorkflowCoordinator) |

### 1.5 Patient Switching (`switchToPatient` — lines 756–775)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Clear auto-save timer | ConsultationContext (inline) | `saveTimeoutRef` | Cancel timeout | **SessionService** |
| Save dirty draft before switch | ConsultationContext (inline) | `saveDraft()` | API call + localStorage | **SessionService** (delegates to DraftService) |
| Navigate to new session | ConsultationContext (inline) | `router.push()` | Navigation | **Presentation Layer** |

### 1.6 Queue Advancement (currently in shim / WorkflowCommandHandler)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Check if next patient exists | `WorkflowCommandHandler` | `context.queue` | None | **QueueService** (future) or **SessionService** (interim) |
| Load next patient | `WorkflowCommandHandler` | `context.queue` | State transition | **QueueService** (future) or **SessionService** (interim) |
| Complete session if no next | `WorkflowCommandHandler` | None | Terminal transition | **SessionService** |

### 1.7 Pause/Resume (currently in shim mapping only)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Pause consultation | Shim `stateToAction()` | None | Command mapping | **SessionService** (via WorkflowCoordinator) |
| Resume consultation | Shim `stateToAction()` | None | Command mapping | **SessionService** (via WorkflowCoordinator) |

### 1.8 Heartbeat (lines 814–835)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Send heartbeat POST | ConsultationContext (inline) | `apiClient.post()` | API call | **SessionService** (or TimerProvider) |
| Heartbeat interval (30s) | ConsultationContext (inline) | `setInterval` | Timer | **TimerProvider** (future) or **SessionService** (if TimerProvider not ready) |
| Heartbeat cleanup on unmount | ConsultationContext (inline) | `clearInterval` | None | **TimerProvider** (future) or **SessionService** |

### 1.9 Beforeunload Warning (lines 845–855)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Warn on unsaved changes | ConsultationContext (inline) | `state.workflow.isDirty` | Browser `beforeunload` event | **Presentation Layer** (or SessionProvider) |

### 1.10 Queue Synchronization (lines 337–360)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Lazy-load today's appointments | ConsultationContext (inline) | `useDoctorTodayAppointments` | React Query fetch | **QueueProvider** (future) |
| Filter waiting queue | ConsultationContext (inline) | `AppointmentStatus` enum | Derived computation | **QueueProvider** (future) |
| `refetchQueue` | ConsultationContext (inline) | `useDoctorTodayAppointments` refetch | Cache refresh | **QueueProvider** (future) |

### 1.11 Auto-Save Coordination (lines 785–810)

| Responsibility | Current Owner | Dependencies | Side Effects | Destination |
|----------------|---------------|-------------|--------------|-------------|
| Debounce save (3s) | ConsultationContext (inline) | `setTimeout`, `saveDraft` | Timer + API call | **DocumentationProvider** (future) or **SessionService** (if not yet extracted) |
| Clear timeout on unmount | ConsultationContext (inline) | `clearTimeout` | None | **DocumentationProvider** (future) or **SessionService** (if not yet extracted) |

---

## 2. Responsibility Assignment Matrix

| Responsibility | SessionService | DraftService | WorkflowEngine | QueueProvider | DocumentationProvider | TimerProvider | Presentation |
|----------------|----------------|--------------|----------------|---------------|----------------------|---------------|--------------|
| Session initialization | ✅ Primary | — | ✅ Workflow | — | — | — | ✅ Orchestrate |
| Session start | ✅ Primary | — | ✅ Workflow | — | — | — | ✅ Orchestrate |
| Session resume | ✅ Primary | — | ✅ Workflow | — | — | — | ✅ Orchestrate |
| Session completion | ✅ Primary | — | ✅ Workflow | — | — | — | ✅ Orchestrate |
| Session cancellation | ✅ Primary | — | ✅ Workflow | — | — | — | ✅ Orchestrate |
| Session pause/resume | ✅ Primary | — | ✅ Workflow | — | — | — | ✅ Orchestrate |
| Patient switching | ✅ Primary | ✅ Save draft | ✅ Workflow | — | — | — | ✅ Navigation |
| Queue advancement | ✅ Primary (interim) | — | ✅ Workflow | ✅ Primary (future) | — | — | ✅ Orchestrate |
| Heartbeat send | ✅ Primary (interim) | — | — | — | — | ✅ Primary (future) | — |
| Heartbeat interval | — | — | — | — | — | ✅ Primary (future) | — |
| Draft save/restore | — | ✅ Primary | — | — | — | — | ✅ Trigger |
| Draft cleanup | ✅ Trigger | ✅ Primary | — | — | — | — | — |
| Cache invalidation | ✅ Instructions | — | — | — | — | — | ✅ Execute |
| React Query queries | — | — | — | ✅ Primary (future) | — | — | ✅ Configure |
| Queue filtering | — | — | — | ✅ Primary (future) | — | — | — |
| Notes editing state | — | — | — | — | ✅ Primary (future) | — | — |
| Auto-save debounce | — | — | — | — | ✅ Primary (future) | — | — |
| Toast notifications | — | — | — | — | — | — | ✅ Primary |
| Navigation | — | — | — | — | — | — | ✅ Primary |
| Error display | — | — | — | — | — | — | ✅ Primary |

---

## 3. Responsibility Transfer Checklist

### 3.1 Transfers FROM ConsultationContext TO SessionService

- [ ] `loadAppointment` — entire data loading pipeline (Tier 1 + Tier 2)
- [ ] `startConsultation` — API call, already-in-progress handling, consultation refresh
- [ ] `completeConsultation` — pre/post completion orchestration
- [ ] `closeCompleteDialog` — dialog state + workflow transition
- [ ] `switchToPatient` — dirty save + load orchestration
- [ ] `persistDraftBackup` — localStorage backup (delegates to DraftService)
- [ ] `sendHeartbeat` — periodic keepalive (delegates to infrastructure)
- [ ] `advanceQueue` — queue advancement logic
- [ ] `resumeConsultation` — implicit in `startConsultation` (READY → ACTIVE)
- [ ] Workflow command construction and dispatch (currently via shim)

### 3.2 Transfers FROM ConsultationContext TO Other Providers

| Responsibility | Destination | PR |
|----------------|-------------|-----|
| Notes/outcome/decision state | DocumentationProvider | PR-A05-03+ |
| Queue filtering and display | QueueProvider | PR-A05-04+ |
| Heartbeat interval timer | TimerProvider | PR-A05-05+ |
| Toast notifications | NotificationProvider | PR-A05-06+ |
| Auto-save debounce | DocumentationProvider | PR-A05-03+ |

### 3.3 Remains in Presentation

| Responsibility | Owner |
|----------------|-------|
| Reducer for UI state | SessionProvider |
| Derived values (isActive, canSave, etc.) | SessionProvider |
| Navigation | Page components |
| Toast display | Page components / NotificationProvider |
| Dialog visibility | DocumentationProvider / SessionProvider |
| Provider composition | Page layout |

---

## 4. Complexity Transfer

### 4.1 ConsultationContext Before SessionService

| Category | Count | Lines |
|----------|-------|-------|
| Total lines | — | 926 |
| Session lifecycle methods | 5 | ~380 |
| Workflow transitions | 8 calls | ~40 |
| Data loading | 1 method | ~140 |
| Queue synchronization | 1 method | ~30 |
| Heartbeat | 1 effect | ~25 |
| Auto-save | 1 effect | ~30 |
| Beforeunload | 1 effect | ~15 |
| **Session-related total** | **~17** | **~660** |

### 4.2 ConsultationContext After SessionService

| Category | Count | Lines |
|----------|-------|-------|
| Total lines | — | ~650 |
| Session lifecycle methods | 0 | 0 |
| Workflow transitions | 0 | 0 |
| Data loading | 0 | 0 |
| Queue synchronization | 0 | 0 |
| Heartbeat | 0 | 0 |
| Auto-save | 0 | 0 |
| Beforeunload | 0 | 0 |
| Reducer (all UI) | 1 | ~100 |
| Derived values | 1 | ~20 |
| Effects (delegation) | 3 | ~30 |
| Provider hook | 1 | ~10 |
| **Remaining** | **~6** | **~160** |

### 4.3 SessionService After Extraction

| Category | Count | Lines |
|----------|-------|-------|
| Total lines | — | ~450 |
| Public methods | 10 | ~250 |
| Private helpers | ~8 | ~100 |
| Type definitions | ~10 | ~100 |
| **Total** | **~28** | **~450** |

---

## 5. Invariant Preservation

| Invariant | Pre-Extraction | Post-Extraction | Verification |
|-----------|----------------|-----------------|--------------|
| Auto-save within 3s | ✅ | ✅ | SessionService delegates to DraftService, which debounces at 3s |
| Draft recovery after crash | ✅ | ✅ | SessionService restores draft during initialization |
| Session integrity | ✅ | ✅ | WorkflowGuardEngine validates all transitions |
| Queue integrity | ✅ | ✅ | advanceQueue() uses same priority logic |
| Audit trail | ✅ | ✅ | WorkflowEventBus emits all events |
| No data loss on switch | ✅ | ✅ | SessionService saves dirty state before switching |
| No duplicate logic | ✅ | ✅ | Single ownership per capability |

---

## 6. Open Questions

| Question | Status | Decision Needed |
|----------|--------|-----------------|
| Should SessionService own heartbeat interval or delegate to TimerProvider? | Open | If TimerProvider is ready before SessionService, delegate. Otherwise, SessionService owns heartbeat temporarily. |
| Should `advanceQueue()` own queue advancement or delegate to QueueService? | Open | SessionService owns interim; QueueService owns after extraction. |
| Should SessionService validate appointment status before operations? | Open | Recommended: yes, as first-line defense before WorkflowEngine. |
| Should SessionService expose `loadPatientVitals` separately? | Open | Likely no — vitals are part of session initialization. |
