# Application Service Catalog

## Service Inventory

| Service | Type | Responsibilities | Dependencies | Consumers |
|---------|------|-----------------|--------------|-----------|
| `DraftService` | Stateful | Auto-save debouncing, manual save trigger, version conflict detection, localStorage backup, draft restoration, timestamp comparison | `ConsultationApi`, `DraftStorage` | DocumentationProvider, SessionProvider |
| `SessionService` | Stateful | Heartbeat interval (30s), session timeout tracking, dirty state check before navigation, beforeunload warning, workflow state coordination | `ConsultationApi`, `PatientApi` | SessionProvider, TimerProvider |
| `QueueService` | Stateful | Queue filtering (exclude current appointment, by status), next patient routing logic, polling coordination, queue refresh triggers | `QueueApi` | QueueProvider, SessionProvider |
| `AuditService` | Stateless | Event emission for clinical actions, correlation ID generation, event batching | Event bus (future) | All use cases |
| `NotificationService` | Stateless | Toast orchestration, in-app notification dispatch, error message formatting | `NotificationApi` (future) | All providers |
| `BillingService` | Stateless | Billing summary retrieval, billing item validation, completion billing coordination | `BillingApi` (future) | BillingProvider, SessionProvider |
| `TimerService` | Stateful | Session timing, elapsed time computation, slot duration tracking, timer display formatting | `SessionService` | TimerProvider, SessionProvider |

---

## Service Details

### 2.1 DraftService

**File:** `application/services/DraftService.ts`

**Type:** Stateful

**Responsibilities:**
1. Debounced auto-save (3 seconds) — extracted from ConsultationContext lines 820-845
2. Manual save trigger — extracted from ConsultationContext `saveNotes()` and `saveDraft()`
3. Version conflict detection — extracted from `useSaveConsultationDraft.ts` lines 32-35, 82-85
4. localStorage backup via `DraftStorage` — extracted from ConsultationContext lines 611-617, 675-681
5. Draft restoration with timestamp comparison — extracted from ConsultationContext lines 476-497
6. Draft cleanup on completion — extracted from ConsultationContext line 745

**State:**
- `saveTimer`: NodeJS.Timeout | null — debounce timer
- `lastSavedAt`: Date | null — timestamp of last successful save
- `isDirty`: boolean — whether notes have unsaved changes
- `conflictCount`: number — consecutive version conflicts

**Methods:**
```typescript
class DraftService {
  constructor(
    private consultationApi: ConsultationApi,
    private draftStorage: DraftStorage<DraftRecord<StructuredNotes>>,
    private notificationService: NotificationService,
  ) {}

  autoSave(appointmentId: number, notes: StructuredNotes, outcomeType, patientDecision): Promise<void>
  manualSave(appointmentId: number, notes, outcomeType, patientDecision): Promise<void>
  restoreDraft(appointmentId: number, serverUpdatedAt: Date): Promise<DraftRecord<StructuredNotes> | null>
  clearDraft(appointmentId: number): Promise<void>
  hasNewerDraft(appointmentId: number, serverUpdatedAt: Date): Promise<boolean>
  onSaveSuccess(callback: () => void): void
  onSaveError(callback: (error: ClinicalError) => void): void
}
```

**Maps from ConsultationContext:**
- Lines 590-629 (`saveDraft`) → `autoSave` / `manualSave`
- Lines 631-693 (`saveNotes`) → `manualSave`
- Lines 476-497 (draft restoration logic) → `restoreDraft`
- Lines 611-617, 675-681 (localStorage.setItem) → `clearDraft` / backup via `DraftStorage`
- Line 745 (localStorage.removeItem on completion) → `clearDraft`

---

### 2.2 SessionService

**File:** `application/services/SessionService.ts`

**Type:** Stateful

**Responsibilities:**
1. Heartbeat interval (30 seconds) — extracted from ConsultationContext lines 847-870 and `useConsultationHeartbeat.ts`
2. Session timeout tracking
3. Dirty state check before navigation — extracted from ConsultationContext lines 798-810
4. beforeunload warning — extracted from ConsultationContext lines 879-890
5. Workflow state coordination — extracted from ConsultationContext reducer + computed properties lines 379-390

**State:**
- `heartbeatTimer`: NodeJS.Timeout | null
- `sessionStartTime`: Date | null
- `lastActivityTime`: Date | null
- `isDirty`: boolean
- `workflowState`: ConsultationWorkflowState

**Methods:**
```typescript
class SessionService {
  constructor(
    private consultationApi: ConsultationApi,
    private notificationService: NotificationService,
  ) {}

  initialize(appointmentId: number): Promise<SessionInitializationResult>
  start(appointmentId: number, doctorId: string): Promise<SessionStartResult>
  resume(appointmentId: number): Promise<SessionResumeResult>
  complete(appointmentId: number, outcome: CompleteOutcomePayload): Promise<SessionCompleteResult>
  switchTo(appointmentId: number): Promise<void>
  retire(): void
  getDerivedState(): DerivedSessionState
  isDirty(): boolean
  checkBeforeUnload(): boolean
}
```

**Maps from ConsultationContext:**
- Lines 847-870 (heartbeat effect) → `startHeartbeat` / `stopHeartbeat`
- Lines 879-890 (beforeunload) → `checkBeforeUnload`
- Lines 379-390 (computed: `isActive`, `isReadOnly`, `canSave`, `canComplete`) → `getDerivedState`
- Lines 791-810 (`switchToPatient`) → `switchTo`
- Lines 394-534 (`loadAppointment`) → `initialize`
- Lines 536-584 (`startConsultation`) → `start`

---

### 2.3 QueueService

**File:** `application/services/QueueService.ts`

**Type:** Stateful

**Responsibilities:**
1. Queue filtering (exclude current appointment, by status CHECKED_IN / READY_FOR_CONSULTATION) — extracted from ConsultationContext lines 364-370
2. Next patient routing logic — extracted from ConsultationContext lines 760-782
3. Polling coordination — extracted from `useDoctorQueue.ts` (60s refetchInterval)
4. Queue refresh triggers — extracted from ConsultationContext lines 572-574, 750-756

**State:**
- `currentAppointmentId`: number | null
- `queueFilter`: QueueFilter
- `lastRefreshedAt`: Date | null
- `pollingTimer`: NodeJS.Timeout | null

**Methods:**
```typescript
class QueueService {
  constructor(
    private queueApi: QueueApi,
    private consultationApi: ConsultationApi,
    private notificationService: NotificationService,
  ) {}

  getFilteredQueue(clinicianId: string, currentAppointmentId: number): Promise<QueueEntry[]>
  getNextPatient(clinicianId: string, currentAppointmentId: number): Promise<QueueEntry | null>
  refreshQueue(clinicianId: string): Promise<void>
  startPolling(clinicianId: string, intervalMs: number): void
  stopPolling(): void
}
```

**Maps from ConsultationContext:**
- Lines 364-370 (`waitingQueue` useMemo) → `getFilteredQueue`
- Lines 760-782 (next patient routing in `completeConsultation`) → `getNextPatient`
- Lines 372-377 (`loadWaitingQueue`) → `refreshQueue`
- Lines 572-574 (`invalidateQueries` for doctor/appointments) → `refreshQueue` side effects

---

### 2.4 AuditService

**File:** `application/services/AuditService.ts`

**Type:** Stateless

**Responsibilities:**
1. Event emission for clinical actions (consultation started, draft saved, consultation completed, patient switched)
2. Correlation ID generation
3. Event batching (future)

**Methods:**
```typescript
class AuditService {
  emitEvent(event: ClinicalAuditEvent): void
  generateCorrelationId(): string
  batchEvents(events: ClinicalAuditEvent[]): void
}
```

**Events to emit:**
- `CONSULTATION_STARTED` — when `StartConsultation` succeeds
- `DRAFT_SAVED` — when `SaveDraft` succeeds
- `DRAFT_RESTORED` — when `RestoreDraft` recovers a local draft
- `CONSULTATION_COMPLETED` — when `CompleteConsultation` succeeds
- `PATIENT_SWITCHED` — when `SwitchPatient` navigates
- `QUEUE_ADVANCED` — when `AdvanceQueue` moves to next patient

**Maps from ConsultationContext:**
- Line 576 (`toast.success('Consultation started')`) → `emitEvent(CONSULTATION_STARTED)`
- Line 758 (`toast.success('Consultation completed')`) → `emitEvent(CONSULTATION_COMPLETED)`
- Line 777 (`toast.info('Loading next patient')`) → `emitEvent(QUEUE_ADVANCED)`

---

### 2.5 NotificationService

**File:** `application/services/NotificationService.ts`

**Type:** Stateless

**Responsibilities:**
1. Toast orchestration — centralize all `sonner` calls
2. In-app notification dispatch (future)
3. Error message formatting — map `ClinicalError` to user-friendly strings

**Methods:**
```typescript
class NotificationService {
  showSuccess(message: string): void
  showError(message: string): void
  showInfo(message: string): void
  showWarning(message: string): void
  formatClinicalError(error: ClinicalError): string
}
```

**Maps from ConsultationContext:**
- Line 530 (`toast.error(error.message || 'Failed to load appointment')`) → `showError(formatClinicalError(error))`
- Line 576 (`toast.success('Consultation started')`) → `showSuccess('Consultation started')`
- Line 658 (`toast.error(result.error || 'Failed to save notes')`) → `showError(formatClinicalError(result))`
- Line 758 (`toast.success('Consultation completed')`) → `showSuccess('Consultation completed')`
- Line 777 (`toast.info('Loading next patient')`) → `showInfo('Loading next patient')`
- Line 786 (`toast.error(error.message || 'Failed to finalize session')`) → `showError(formatClinicalError(error))`

---

### 2.6 BillingService

**File:** `application/services/BillingService.ts`

**Type:** Stateless

**Responsibilities:**
1. Billing summary retrieval for appointment
2. Billing item validation
3. Completion billing coordination

**Status:** Not implemented in Phase 2. Requires `BillingApi` port.

**Dependencies:** `BillingApi` (future)

---

### 2.7 TimerService

**File:** `application/services/TimerService.ts`

**Type:** Stateful

**Responsibilities:**
1. Session timing — compute elapsed time from session start
2. Slot duration tracking — compare elapsed vs. appointment slot duration
3. Timer display formatting — format seconds into MM:SS or HH:MM:SS

**Methods:**
```typescript
class TimerService {
  start(slotStartTime: Date, slotDurationMinutes: number): void
  stop(): void
  getElapsedSeconds(): number
  getRemainingSeconds(): number
  getFormattedTime(): string
  isOvertime(): boolean
}
```

**Maps from ConsultationContext:**
- The timer logic is not currently in ConsultationContext — it exists in separate hooks (`useConsultationTimer.ts` not found, but timer display is in components). TimerService extracts the timing computation.

**Dependencies:** `SessionService` (for session start time)

---

## Service Dependency Graph

```
SessionService
    ├── ConsultationApi
    ├── PatientApi
    └── NotificationService

DraftService
    ├── ConsultationApi
    ├── DraftStorage
    └── NotificationService

QueueService
    ├── QueueApi
    ├── ConsultationApi
    └── NotificationService

AuditService
    └── (event bus — future)

NotificationService
    └── (NotificationApi — future)

BillingService
    └── BillingApi (future)

TimerService
    └── SessionService
```

**Key insight:** `SessionService`, `DraftService`, and `QueueService` are the three core services required for Phase 2. All others are future enhancements.
