# Consultation Module — Provider Strategy

## 1. Current State Problem

The current `ConsultationContext` is a monolith at 976 lines. It owns:

- Appointment, patient, vitals data
- Consultation record and notes
- Workflow state machine
- Auto-save debounce logic
- Heartbeat interval
- Queue filtering logic
- Outcome and patient decision state
- Loading, saving, dialog flags
- LocalStorage draft backup
- React Query cache invalidation

**Cost:** Every component that consumes any part of this state re-renders on every action. The page component re-renders on every keystroke. The queue panel re-renders when notes change (though it doesn't need to). The context is owned by no single team—any feature that touches consultation touches this file.

---

## 2. Target State: Focused Providers

Replace one monolith with **seven focused providers**. Each provider owns a single capability or closely related capability cluster and exposes a minimal, typed interface.

---

## 3. Provider Catalog

### 3.1 SessionProvider

**Responsibility:** Manage the current consultation session lifecycle and workflow state.

**Owns:**
- `appointment` — current appointment record
- `patient` — current patient record
- `consultation` — current consultation record
- `doctorId` — authenticated doctor ID
- `workflowState` — UI workflow state machine
- `loadingState` — tiered loading flags
- `error` — error state with recovery action

**Exposes:**
```typescript
interface SessionProviderValue {
  // State
  appointment: AppointmentResponseDto | null;
  patient: PatientResponseDto | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string | null;
  workflowState: WorkflowState;
  loadingState: LoadingState;
  error: ClinicalError | null;

  // Derived
  isActive: boolean;
  isReadOnly: boolean;
  canStart: boolean;
  canResume: boolean;
  canComplete: boolean;

  // Actions
  initialize(appointmentId: number): Promise<void>;
  start(doctorNotes?: string): Promise<void>;
  resume(): Promise<void>;
  complete(outcome: CompleteOutcomePayload): Promise<void>;
  switchTo(appointmentId: number): Promise<void>;
  retire(): void;
  retry(): void;
}
```

**Consumed By:**
- SessionPage (shell layout, conditional rendering)
- Header (appointment status, patient name)
- QueuePanel (current appointment ID for filtering)
- TimerProvider (needs appointment slot timing)
- BillingProvider (needs appointment for billing context)

**Does NOT Own:**
- Notes (DocumentationProvider owns notes)
- Draft metadata (DocumentationService owns)
- Queue list (QueueProvider owns)
- Timer display (TimerProvider owns)
- Billing items (BillingProvider owns)
- Notifications (NotificationProvider owns)

**Render Impact:** SessionProvider changes infrequently compared to notes typing. Most re-renders come from initialization and status transitions, not per-keystroke.

---

### 3.2 DocumentationProvider

**Responsibility:** Manage clinical note entry, draft persistence, and outcome recording.

**Owns:**
- `notes` — structured SOAP notes (single source of truth)
- `outcomeType` — selected consultation outcome
- `patientDecision` — patient's decision on recommended procedure
- `draftStatus` — save status (idle, saving, saved, error)
- `dirtyFields` — set of modified fields
- `version` — draft version from server
- `activeTab` — current documentation tab
- `hasConflict` — version conflict flag

**Exposes:**
```typescript
interface DocumentationProviderValue {
  // State
  notes: SOAPNote;
  outcomeType: OutcomeType | null;
  patientDecision: PatientDecision | null;
  draftStatus: SaveStatus;
  dirtyFields: Set<NoteField>;
  version: string | null;
  activeTab: NoteTab;
  hasConflict: boolean;

  // Derived
  canSave: boolean;
  requiresCasePlanning: boolean;
  isDirty: boolean;

  // Actions
  updateNote(field: NoteField, value: string): void;
  setOutcome(outcome: OutcomeType): void;
  setPatientDecision(decision: PatientDecision): void;
  saveDraft(): Promise<void>;
  restoreDraft(): Promise<boolean>;
  setActiveTab(tab: NoteTab): void;
  resolveConflict(serverNotes: SOAPNote): void;
  registerExtension(slot: ExtensionSlot): void;
}
```

**Consumed By:**
- SOAPWorkspace (notes rendering, tab switching)
- SubjectiveTab, ObjectiveTab, AssessmentTab, PlanTab (note inputs, outcome selector)
- Header (save button state, dirty indicator)
- CompletionDialog (outcome and decision values)
- Extension slots (AI, voice, templates)

**Render Frequency:** High. Updates on every keystroke. But because this provider is isolated, ONLY documentation-related components re-render, not the entire session.

**Co-Located Services:**
- `DraftService` — auto-save debounce, version tracking, localStorage backup
- `DocumentationWorkflow` — state machine for documentation lifecycle

---

### 3.3 PatientContextProvider

**Responsibility:** Manage patient-specific context data.

**Owns:**
- `patient` — PatientResponseDto
- `vitals` — VitalsSnapshot (current appointment)
- `allergies` — AllergySummary
- `conditions` — ConditionSummary
- `consultationHistory` — ConsultationHistoryDto
- `selectedHistoryId` — selected history item for modal

**Exposes:**
```typescript
interface PatientContextProviderValue {
  // State
  patient: PatientResponseDto | null;
  vitals: VitalsSnapshot | null;
  allergies: AllergySummary | null;
  conditions: ConditionSummary | null;
  consultationHistory: ConsultationHistoryDto | null;
  selectedHistoryId: number | null;

  // Derived
  isLoaded: boolean;
  hasVitals: boolean;
  hasHistory: boolean;
  hasAllergies: boolean;

  // Actions
  load(patientId: string): Promise<void>;
  selectHistoryItem(id: number): void;
  clearHistorySelection(): void;
  refreshVitals(appointmentId: number): Promise<void>;
}
```

**Consumed By:**
- PatientSidebar (all patient panels)
- DocumentationProvider (patient name in notes metadata)
- SessionProvider (patient data for session init)
- CompletionDialog (patient context for billing)
- ConsultationHistoryModal (selected history item details)

**Render Frequency:** Low. Updates only on patient switch or manual refresh.

---

### 3.4 QueueContextProvider

**Responsibility:** Manage patient queue visibility and patient switching.

**Owns:**
- `todayAppointments` — all of doctor's appointments for today
- `waitingQueue` — filtered queue (waiting + in-consultation, excludes current)
- `isCollapsed` — panel collapse state
- `switchingState` — patient switching UX state (idle, confirming, switching)
- `selectedForSwitch` — patient selected for confirmation

**Exposes:**
```typescript
interface QueueContextProviderValue {
  // State
  todayAppointments: AppointmentResponseDto[];
  waitingQueue: AppointmentResponseDto[];
  isCollapsed: boolean;
  switchingState: SwitchingState;
  selectedForSwitch: AppointmentResponseDto | null;

  // Derived
  queueLength: number;
  waitingCount: number;
  inConsultationCount: number;
  nextForRouting: NextPatientRouting | null;

  // Actions
  refresh(): Promise<void>;
  switchToPatient(appointmentId: number): Promise<void>;
  collapse(): void;
  expand(): void;
  confirmSwitch(): void;
  cancelSwitch(): void;
}
```

**Consumed By:**
- QueuePanel (queue rendering, collapse toggle)
- SessionProvider (next patient routing after completion)
- PatientSwitchConfirm (confirmation dialog)

**Render Frequency:** Medium. Updates on polling (every 30s) and manual refresh. Does not update on note changes.

**Isolation Benefit:** Queue panel re-renders on queue changes but NOT on documentation changes. Previously, a keystroke in SOAP notes caused QueuePanel to re-render because `waitingQueue` was derived in the same context value object.

---

### 3.5 TimerProvider

**Responsibility:** Manage session timing and heartbeat.

**Owns:**
- `elapsedSeconds` — seconds since slot start
- `remainingSeconds` — seconds until slot end
- `isOverdue` — whether consultation exceeded slot duration
- `lastHeartbeat` — timestamp of last successful heartbeat
- `heartbeatStatus` — heartbeat connection state

**Exposes:**
```typescript
interface TimerProviderValue {
  // State
  elapsedSeconds: number;
  remainingSeconds: number;
  isOverdue: boolean;
  lastHeartbeat: Timestamp | null;
  heartbeatStatus: 'active' | 'degraded' | 'failed';

  // Actions
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  reset(): void;
  sendHeartbeat(): Promise<void>;
}
```

**Consumed By:**
- Header (timer display, heartbeat indicator)
- SessionProvider (triggers start/stop on session transitions)

**Render Frequency:** High (1-second interval) but lightweight. Only the timer display re-renders.

---

### 3.6 BillingProvider

**Responsibility:** Manage billing data for the completion dialog.

**Owns:**
- `billingSummary` — billing line items and totals
- `paymentStatus` — UNPAID, PAID, WAIVED
- `doctorFee` — default doctor fee amount
- `isLoading` — billing fetch status

**Exposes:**
```typescript
interface BillingProviderValue {
  // State
  billingSummary: BillingSummary | null;
  paymentStatus: PaymentStatus | null;
  doctorFee: number | null;
  isLoading: boolean;

  // Actions
  load(appointmentId: number): Promise<void>;
  refresh(): Promise<void>;
}
```

**Consumed By:**
- CompletionDialog (billing summary display)
- BillingSummary component (billing detail rendering)

**Render Frequency:** Low. Loads once on completion dialog open.

---

### 3.7 NotificationProvider

**Responsibility:** Manage toast notifications and in-app notification queue.

**Owns:**
- `toastQueue` — pending toast notifications
- `inAppNotifications` — in-app notification list
- `lastNotification` — most recent notification for display

**Exposes:**
```typescript
interface NotificationProviderValue {
  // Actions
  success(message: string, options?: ToastOptions): void;
  error(message: string, options?: ToastOptions): void;
  warning(message: string, options?: ToastOptions): void;
  info(message: string, options?: ToastOptions): void;
  dismiss(id: string): void;
  dismissAll(): void;

  // State
  toasts: Toast[];
  notifications: InAppNotification[];
}
```

**Consumed By:**
- Global shell (toast container)
- SessionProvider (completion success toast)
- DocumentationProvider (save error toast)
- QueueProvider (switch confirmation toast)

**Render Frequency:** Low. Updates only on new notifications.

---

## 4. Provider Composition

### 4.1 Session Page Composition

```tsx
// app/doctor/consultations/session/[appointmentId]/page.tsx

function SessionPage({ appointmentId }: { appointmentId: number }) {
  return (
    <AuthProvider>
      <QueryClientProvider>
        <SessionProvider appointmentId={appointmentId}>
          <DocumentationProvider>
            <PatientContextProvider>
              <QueueContextProvider>
                <TimerProvider>
                  <BillingProvider>
                    <NotificationProvider>
                      <SessionShell />
                    </NotificationProvider>
                  </BillingProvider>
                </TimerProvider>
              </QueueContextProvider>
            </PatientContextProvider>
          </DocumentationProvider>
        </SessionProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

### 4.2 Session Shell Composition

```tsx
// components/Shell/SessionShell.tsx

function SessionShell() {
  const { workflowState, isActive, canStart } = useSession();
  const { notes, saveDraft } = useDocumentation();
  const { patient, vitals } = usePatientContext();
  const { queue, switchToPatient } = useQueue();
  const { elapsed, isOverdue } = useTimer();
  const { billingSummary } = useBilling();
  const { success, error } = useNotifications();

  return (
    <ShellLayout>
      <Header
        isActive={isActive}
        workflowState={workflowState}
        onSave={saveDraft}
        onComplete={() => openCompletionDialog()}
      />
      <div className="flex-1 flex overflow-hidden">
        <PatientSidebar patient={patient} vitals={vitals} />
        <SOAPWorkspace notes={notes} />
        <QueuePanel appointments={queue} onSwitch={switchToPatient} />
      </div>
      {isOverdue && <OverdueWarning elapsed={elapsed} />}
    </ShellLayout>
  );
}
```

### 4.3 Extension Slot Composition

```tsx
// features/clinical-documentation/components/SOAPWorkspace.tsx

function SOAPWorkspace({ notes }: { notes: SOAPNote }) {
  const { activeTab, setActiveTab, extensions } = useDocumentation();

  return (
    <div className="flex-1 flex flex-col">
      <TabBar active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 relative">
        {activeTab === 'subjective' && <SubjectiveTab note={notes.subjective} />}
        {activeTab === 'objective' && <ObjectiveTab note={notes.objective} />}
        {activeTab === 'assessment' && <AssessmentTab note={notes.assessment} />}
        {activeTab === 'plan' && <PlanTab note={notes.plan} />}

        {/* Extension slots rendered on top of workspace */}
        {extensions.planBefore.map(ext => (
          <ext.component key={ext.id} placement="before" />
        ))}
        {extensions.planAfter.map(ext => (
          <ext.component key={ext.id} placement="after" />
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Provider Communication

### 5.1 Event Bus (Shared Kernel Events)

Providers communicate through a lightweight event bus defined in the Shared Kernel:

```typescript
// shared-kernel/events.ts

type ConsultationEvent =
  | { type: 'SESSION_STARTED'; payload: { appointmentId: number } }
  | { type: 'SESSION_COMPLETED'; payload: { appointmentId: number } }
  | { type: 'SESSION_SWITCHED'; payload: { from: number; to: number } }
  | { type: 'NOTE_UPDATED'; payload: { field: NoteField } }
  | { type: 'DRAFT_SAVED'; payload: { version: string } }
  | { type: 'DRAFT_SAVE_FAILED'; payload: { error: ClinicalError } }
  | { type: 'OUTCOME_CHANGED'; payload: { outcome: OutcomeType } }
  | { type: 'QUEUE_REFRESHED'; payload: { length: number } }
  | { type: 'PATIENT_SWITCHED'; payload: { patientId: string } }
  | { type: 'PATIENT_LOADED'; payload: { patientId: string } }
  | { type: 'CONFLICT_DETECTED'; payload: { serverVersion: string } };

interface EventBus {
  emit(event: ConsultationEvent): void;
  subscribe(eventType: ConsultationEvent['type'], handler: (payload: any) => void): Unsubscribe;
}
```

**Usage:**
```typescript
// In SessionProvider
useEffect(() => {
  if (workflowState === 'ACTIVE') {
    eventBus.emit({ type: 'SESSION_STARTED', payload: { appointmentId: appointment.id } });
  }
}, [workflowState]);

// In TimerProvider
useEffect(() => {
  const unsubscribe = eventBus.subscribe('SESSION_STARTED', ({ appointmentId }) => {
    start(appointmentId);
  });
  return unsubscribe;
}, []);
```

**Rule:** Events are fire-and-forget. Handlers must not assume synchronous execution. No event should carry mutable state.

### 5.2 React Query as Shared Read Model

Server-derived data is shared through React Query cache, not provider state:

```typescript
// SessionProvider loads appointment and patient
const { data: appointment } = useQuery({
  queryKey: ['appointment', appointmentId],
  queryFn: () => consultationApi.getAppointment(appointmentId),
});

// PatientContextProvider reads from same cache
const { data: patient } = useQuery({
  queryKey: ['appointment', appointmentId], // same key!
  queryFn: () => patientApi.getPatient(appointment.patientId),
  enabled: !!appointment,
});
```

**Rule:** If two providers need the same server data, they share the same React Query cache key. The first provider to fetch "wins"; others read from cache.

---

## 6. Provider Boundary Rules

### 6.1 Direct Import Prohibition

Provider A must not directly import Provider B:

```typescript
// FORBIDDEN
import { usePatientContext } from '../PatientContextProvider';

function SessionProvider({ children }) {
  const patient = usePatientContext(); // Direct import
}
```

**Instead, use:**
```typescript
// ALLOWED
import { usePatientContext } from '../PatientContextProvider';

function SessionPage() {
  // Compose at page level, not inside provider
  return (
    <PatientContextProvider>
      <SessionProvider>
        {/* SessionProvider receives patient via React Query, not direct import */}
      </SessionProvider>
    </PatientContextProvider>
  );
}
```

**Exception:** Providers may import other providers' **types** (interfaces) for composition, as long as they don't instantiate or call hooks from them.

### 6.2 Data Ownership

Each data type has exactly one owner:

| Data Type | Owner | Other providers read via |
|-----------|-------|--------------------------|
| Appointment | SessionProvider | React Query cache |
| Patient | PatientContextProvider | React Query cache |
| Vitals | PatientContextProvider | React Query cache |
| Consultation | SessionProvider | React Query cache |
| Notes | DocumentationProvider | Provider context only |
| Outcome | DocumentationProvider | Provider context only |
| Queue | QueueContextProvider | Provider context only |
| Draft metadata | DocumentationService | Provider context only |
| Timer | TimerProvider | Provider context only |
| Billing | BillingProvider | Provider context only |

### 6.3 Side Effect Ownership

| Side Effect | Owner | Mechanism |
|-------------|-------|-----------|
| Auto-save | DocumentationService (inside DocumentationProvider) | Debounced useEffect |
| Heartbeat | TimerService (inside TimerProvider) | setInterval |
| Session cleanup | SessionService (inside SessionProvider) | useEffect cleanup |
| Queue polling | QueueService (inside QueueProvider) | React Query refetchInterval |
| localStorage backup | DraftStorage adapter | Called by DocumentationService |
| Cache invalidation | SessionService | useQueryClient |
| Toast notifications | NotificationService (inside NotificationProvider) | Event subscription |

---

## 7. Render Cascade Elimination

### 7.1 Current Cascade

```
Doctor types in SOAP note
    ↓
UPDATE_NOTE_FIELD dispatch
    ↓
New state object
    ↓
useMemo recomputes context value (state is in deps)
    ↓
ALL consumers re-render:
  - SessionPage
  - Header
  - PatientSidebar
  - SOAPWorkspace
  - QueuePanel
  - Dialogs
```

### 7.2 Target Cascade

```
Doctor types in SOAP note
    ↓
DocumentationProvider UPDATE_NOTE_FIELD
    ↓
New notes state inside DocumentationProvider
    ↓
DocumentationProvider consumers re-render ONLY:
  - SOAPWorkspace
  - SubjectiveTab
  - Header (save button)
  - CompletionDialog (if open)
```

PatientSidebar, QueuePanel, TimerProvider do NOT re-render.

### 7.3 Measurement Targets

| Scenario | Current Re-renders | Target Re-renders |
|----------|-------------------|-------------------|
| Typing in SOAP note | 6+ components | 3 components |
| Queue polling update | 2 components | 2 components |
| Session start | 6+ components | 4 components |
| Patient switch | Full reload | Full reload (acceptable) |
| Timer tick (1s) | 6+ components | 2 components |

---

## 8. Provider Evolution Strategy

### Phase 1: Extract Without Behavior Change

Extract providers from current `ConsultationContext` while preserving exact behavior:

```typescript
// Step 1: Create DocumentationProvider with same reducer logic
function DocumentationProvider({ children }) {
  const [notes, dispatch] = useReducer(notesReducer, initialNotes);
  // ... same logic as current context
  return <DocumentationContext.Provider value={...}>{children}</DocumentationContext.Provider>;
}

// Step 2: Create PatientContextProvider
// Step 3: Create QueueContextProvider
// Step 4: Create TimerProvider
// Step 5: SessionProvider absorbs remaining state
```

**Validation:** Existing tests (once added) must pass without modification.

### Phase 2: Split State

Move notes from reducer to optimized state container:

```typescript
// DocumentationProvider uses useOptimistic or useReducer with memoized selectors
const notes = useMemoizedReducer(notesReducer, initialNotes, {
  equalityCheck: (a, b) => deepEqual(a, b), // prevent re-renders when sibling state changes
});
```

**Validation:** Render count measurements confirm reduced re-renders.

### Phase 3: Introduce Events

Replace direct provider imports with event subscription:

```typescript
// Before
function SessionProvider() {
  const { collapse } = useQueue(); // Direct import
}

// After
function SessionProvider() {
  useEffect(() => {
    const unsub = eventBus.subscribe('PATIENT_SWITCHED', () => {
      // React to switch without direct dependency
    });
    return unsub;
  }, []);
}
```

**Validation:** Provider coupling metrics show zero direct imports between clinical providers.

---

## 9. Summary

The provider strategy replaces one 976-line monolith with seven focused, single-responsibility providers. This:

- **Eliminates render cascades** — typing in notes no longer re-renders the queue
- **Enables parallel development** — teams own different providers without merge conflicts
- **Improves testability** — each provider can be tested in isolation
- **Supports extension** — new capabilities plug into extension slots without modifying core providers
- **Preserves capability** — all existing functionality is preserved during extraction

The key principle is **state locality**: if a component doesn't need a piece of state, it should not re-render when that state changes. Focused providers enforce this naturally.
