# Consultation Module — State Management Analysis

## 1. React Context: ConsultationContext

### Overview

`ConsultationContext` is the **single source of truth** for the entire consultation session. It is a React Context backed by a `useReducer` that manages all data, workflow state, and UI flags for the active consultation.

### State Container

**Location:** `contexts/ConsultationContext.tsx`  
**Pattern:** `useReducer` with discriminated union actions  
**Initial State Factory:** `createInitialState(appointmentId?)`

### State Shape

```typescript
interface ConsultationProviderState {
  workflow: ConsultationWorkflowContext;
  appointment: AppointmentResponseDto | null;
  patient: PatientResponseDto | null;
  vitals: VitalsData | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string | null;
  consultationHistory: PatientConsultationHistoryItemDto[];
  notes: StructuredNotes;
  outcomeType: ConsultationOutcomeType | null;
  patientDecision: PatientDecision | null;
  isLoading: boolean;
  isSaving: boolean;
  showCompleteDialog: boolean;
  showStartDialog: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}
```

### Reducer Actions

```typescript
type ConsultationAction =
  | { type: 'SET_WORKFLOW_STATE'; payload: ConsultationWorkflowState }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_DATA'; payload: { appointment, patient, vitals, doctorId } }
  | { type: 'SET_CONSULTATION'; payload: ConsultationResponseDto | null }
  | { type: 'SET_CONSULTATION_HISTORY'; payload: PatientConsultationHistoryItemDto[] }
  | { type: 'SET_NOTES'; payload: StructuredNotes }
  | { type: 'UPDATE_NOTE_FIELD'; payload: { field: keyof StructuredNotes; value: string } }
  | { type: 'SET_OUTCOME'; payload: ConsultationOutcomeType }
  | { type: 'SET_PATIENT_DECISION'; payload: PatientDecision | null }
  | { type: 'SET_AUTO_SAVE_STATUS'; payload: 'idle' | 'saving' | 'saved' | 'error' }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SHOW_COMPLETE_DIALOG'; payload: boolean }
  | { type: 'SHOW_START_DIALOG'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };
```

### Derived Values (Computed at Render Time)

```typescript
const appointmentCompleted = state.appointment?.status === AppointmentStatus.COMPLETED;
const appointmentCancelled = state.appointment?.status === AppointmentStatus.CANCELLED;
const isActive = !appointmentCompleted && !appointmentCancelled &&
  state.consultation?.state === ConsultationState.IN_PROGRESS;
const isReadOnly = appointmentCompleted || appointmentCancelled ||
  state.consultation?.state === ConsultationState.COMPLETED;
const canSave = state.workflow.isDirty;
const canComplete = isActive && !state.isSaving;
```

**Note:** These are computed in the `useMemo` value object, not stored in reducer state.

### Derived Collections

```typescript
const waitingQueue = useMemo(() => {
  return todayAppointments.filter((apt) =>
    apt.id !== state.appointment?.id &&
    (apt.status === AppointmentStatus.CHECKED_IN ||
      apt.status === AppointmentStatus.READY_FOR_CONSULTATION)
  );
}, [todayAppointments, state.appointment?.id]);
```

---

## 2. React Query

### 2.1 `useConsultation(appointmentId)`

**Query Key:** `['consultation', appointmentId]`  
**Stale Time:** `0` (always fresh)  
**GC Time:** Default (5 minutes)  
**Retry:** Built-in  
**Consumer:** `ConsultationContext`  
**Data:** `ConsultationResponseDto | null`  
**Purpose:** Fetch active consultation record for the current appointment

### 2.2 `useSaveConsultationDraft()`

**Mutation Key:** `['save-consultation-draft']`  
**Consumer:** `ConsultationContext`  
**Side Effects:**
- Snapshot cache before mutation
- Optimistic update
- Rollback on error
- Version conflict detection

**Cache Behavior:**
- On success: updates consultation query cache
- On error: rolls back to snapshot, checks for `VERSION_CONFLICT`

### 2.3 `usePatientConsultationHistory(patientId)`

**Query Key:** `['patient-consultations', patientId]`  
**Stale Time:** `5 * 60 * 1000` (5 minutes)  
**Retry:** `2`  
**Enabled:** `!!patientId`  
**Consumer:** `ConsultationContext`  
**Data:** `PatientConsultationHistoryDto`

### 2.4 `useDoctorTodayAppointments(doctorId, enabled, polling)`

**Query Key:** `['doctor', doctorId, 'appointments']`  
**Network Mode:** `offlineFirst`  
**Refetch Interval:** Configurable polling  
**Consumer:** `ConsultationContext` (for waiting queue)

---

## 3. Component State

### 3.1 `ConsultationSessionPageOptimized`
```typescript
const [isPatientSidebarCollapsed, setIsPatientSidebarCollapsed] = useState(true);
```
**Purpose:** Toggle left patient panel visibility  
**Owner:** Page component  
**Consumers:** PatientInfoSidebar width classes

### 3.2 `PatientInfoSidebar`
```typescript
const [selectedConsultation, setSelectedConsultation] = useState<PatientConsultationHistoryItemDto | null>(null);
```
**Purpose:** Modal open/close for previous consultation detail  
**Owner:** PatientInfoSidebar  
**Consumers:** Modal rendering

### 3.3 `ConsultationWorkspaceOptimized`
```typescript
const [activeTab, setActiveTab] = useState<string>('subjective');
```
**Purpose:** Active SOAP tab selection  
**Owner:** Workspace component  
**Side Effects:** URL sync via `router.replace`  
**Consumers:** TabsContent rendering

### 3.4 `ConsultationQueuePanel`
```typescript
const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
const [startingId, setStartingId] = useState<number | null>(null);
const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
const [selectedForSwitch, setSelectedForSwitch] = useState<AppointmentResponseDto | null>(null);
```
**Purpose:** Panel collapse, patient switching UX  
**Owner:** QueuePanel  
**Consumers:** Animation, button states, confirmation modal

### 3.5 `StartConsultationDialog`
```typescript
const [doctorNotes, setDoctorNotes] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
```
**Purpose:** Form state for pre-session notes  
**Owner:** Dialog component  
**Consumers:** Form submission

### 3.6 `CompleteConsultationDialog`
```typescript
const [summary, setSummary] = useState('');
const [summaryEdited, setSummaryEdited] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
```
**Purpose:** Editable summary and submission state  
**Owner:** Dialog component  
**Consumers:** Completion submission

---

## 4. Refs

### 4.1 `saveTimeoutRef` (ConsultationContext)
```typescript
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```
**Purpose:** Debounced auto-save timer  
**Owner:** ConsultationContext  
**Lifecycle:** Cleared on unmount, before patient switch, before completion

### 4.2 `calendarRef` (ScheduleCalendarView)
```typescript
const calendarRef = useRef<HTMLDivElement>(null);
```
**Purpose:** Calendar DOM reference (not part of consultation room)

### 4.3 `heartbeatInterval` (ConsultationContext)
```typescript
const heartbeatInterval = setInterval(sendHeartbeat, 30000);
```
**Purpose:** Heartbeat timer (managed inside `useEffect`)  
**Lifecycle:** Cleared on unmount, when `isActive` becomes false, when `consultation.id` changes

---

## 5. Local Storage

### 5.1 Draft Backup

**Key:** `consultation-draft-${appointmentId}`  
**Written:**
- After successful draft save
- After draft restoration from server

**Read:**
- On consultation load (if server data exists, compare timestamps)
- Newer drafts override server data

**Structure:**
```typescript
{
  structured: StructuredNotes;
  timestamp: string; // ISO date
}
```

**Cleared:**
- On consultation completion (`localStorage.removeItem`)
- On draft timestamp older than server `updatedAt`
- On initialization failure

### 5.2 Auth Token Storage
*(Managed by AuthContext, not consultation-specific)*

---

## 6. State Ownership Matrix

| State | Owner | Persistence | Consumers |
|-------|-------|-------------|-----------|
| `appointment` | ConsultationContext (reducer) | React Query cache | Header, Sidebar, Workspace, Queue |
| `patient` | ConsultationContext (reducer) | React Query cache | Header, Sidebar, Workspace |
| `vitals` | ConsultationContext (reducer) | React Query cache | PatientInfoSidebar |
| `consultation` | ConsultationContext (reducer) | React Query cache | Header, Workspace, Context actions |
| `consultationHistory` | ConsultationContext (reducer) | React Query cache (5 min stale) | PatientInfoSidebar |
| `notes` | ConsultationContext (reducer) | LocalStorage + API draft | Workspace tabs |
| `outcomeType` | ConsultationContext (reducer) | API draft | Workspace Plan tab |
| `patientDecision` | ConsultationContext (reducer) | API draft | Workspace Plan tab |
| `workflow.state` | ConsultationContext (reducer) | Memory only | All components (rendering) |
| `isLoading` | ConsultationContext (reducer) | Memory only | Page loading states |
| `isSaving` | ConsultationContext (reducer) | Memory only | Header auto-save badge |
| `autoSaveStatus` | ConsultationContext (reducer) | Memory only | Header auto-save badge |
| `showStartDialog` | ConsultationContext (reducer) | Memory only | StartConsultationDialog visibility |
| `showCompleteDialog` | ConsultationContext (reducer) | Memory only | CompleteConsultationDialog visibility |
| `isActive` | Derived from reducer state | Computed | Header, Workspace, Context actions |
| `isReadOnly` | Derived from reducer state | Computed | Header, Workspace |
| `canSave` | Derived from reducer state | Computed | Header save button |
| `canComplete` | Derived from reducer state | Computed | Header complete button |
| `waitingQueue` | Derived from React Query | React Query cache | ConsultationQueuePanel |
| `activeTab` | ConsultationWorkspaceOptimized | URL query param | TabsContent |
| `isPatientSidebarCollapsed` | Page component | Component state | Sidebar width classes |

---

## 7. Data Flow Ownership

### 7.1 Notes State

**Origin:** User keystrokes in Workspace tabs  
**Flow:**
1. `updateNotes(field, value)` → dispatches `UPDATE_NOTE_FIELD`
2. Sets `workflow.isDirty = true`
3. Debounced auto-save triggers after 3 seconds
4. Calls `saveDraft()` → mutation hook → `PUT /appointments/:id/consultation/draft`
5. Optimistic update in React Query cache
6. On success: `SET_DIRTY(false)`, `SET_AUTO_SAVE_STATUS('saved')`, localStorage backup
7. On error: `SET_AUTO_SAVE_STATUS('error')`, rollback

**Owner:** ConsultationContext reducer + React Query mutation cache  
**Persistence:** API (draft endpoint) + localStorage

### 7.2 Outcome/Decision State

**Origin:** Plan tab UI selection  
**Flow:**
1. `setOutcome(outcome)` → dispatches `SET_OUTCOME`
2. If PROCEDURE_RECOMMENDED → auto-sets PatientDecision.YES
3. Otherwise → clears PatientDecision
4. Persisted via draft save mechanism

**Owner:** ConsultationContext reducer  
**Persistence:** API draft endpoint

### 7.3 Consultation History

**Origin:** API response from `GET /patients/:id/consultations`  
**Flow:**
1. `usePatientConsultationHistory` fetches data
2. `useEffect` in ConsultationContext dispatches `SET_CONSULTATION_HISTORY`
3. Passed to PatientInfoSidebar as prop

**Owner:** React Query cache  
**Persistence:** React Query (5 min stale time)

---

## 8. Render Cascade Analysis

### High-Frequency Updates
1. **Notes typing** → `UPDATE_NOTE_FIELD` → context value change → re-render all context consumers
   - Mitigation: `useMemo` on context value, but all consumers re-render due to new object reference
   - Components affected: Header, Sidebar, Workspace, Queue, Dialogs

2. **Auto-save debounce** → 3-second delay → `saveDraft` → mutation → cache update → re-render

3. **Heartbeat** → Does not trigger re-renders (fire-and-forget)

### Medium-Frequency Updates
1. **Queue polling** → `refetchInterval` → new appointments array → `waitingQueue` recomputed → QueuePanel re-renders
2. **Tab change** → `activeTab` state change → Workspace re-renders

### Low-Frequency Updates
1. **Initial load** → Sequential data fetches → multiple state dispatches → multiple re-renders
2. **Patient switch** → Full context reset → reload

---

## 9. State Hydration

### Initial Load Sequence

```
ConsultationProvider mounts
    ↓
useEffect: loadAppointment(initialAppointmentId)
    ↓
dispatch(SET_LOADING, true)
dispatch(SET_WORKFLOW_STATE, LOADING)
    ↓
Parallel: getAppointment, getDoctorByUserId, getConsultation
    ↓
dispatch(SET_DATA, { appointment, patient, vitals, doctorId })
    ↓
If consultation exists:
    dispatch(SET_CONSULTATION, consultation)
    dispatch(SET_NOTES, consultation.notes.structured || parsed)
    dispatch(SET_OUTCOME, consultation.outcomeType)
    dispatch(SET_PATIENT_DECISION, consultation.patientDecision)
    ↓
Check localStorage draft → if newer than server → override notes
    ↓
Determine workflow state based on appointment status:
    - COMPLETED/CANCELLED → READY (no dialogs)
    - IN_CONSULTATION or consultation IN_PROGRESS → ACTIVE
    - CHECKED_IN/READY_FOR_CONSULTATION → READY (show start dialog)
    - Otherwise → READY
    ↓
dispatch(SET_DIRTY, false)
dispatch(SET_LOADING, false)
    ↓
UI renders appropriate state
```

### Draft Restoration Logic

```typescript
const savedDraft = localStorage.getItem(`consultation-draft-${appointmentId}`);
if (savedDraft) {
  const draft = JSON.parse(savedDraft);
  const draftTime = new Date(draft.timestamp);
  const serverTime = consultation.updatedAt ? new Date(consultation.updatedAt) : new Date(0);
  
  if (draftTime > serverTime) {
    dispatch(SET_NOTES, draft.structured); // No toast
  } else {
    localStorage.removeItem(`consultation-draft-${appointmentId}`);
  }
}
```

**Key Insight:** Draft restoration is silent (no toast notification) to avoid confusing the user.

---

## 10. Context Value Memoization

```typescript
const value = useMemo(() => ({
  state,
  isActive,
  isReadOnly,
  canSave,
  canComplete,
  waitingQueue,
  refetchQueue,
  isQueueRefetching,
  loadWaitingQueue,
  loadAppointment,
  startConsultation,
  // ... all other actions
  consultationHistory: state.consultationHistory,
}), [
  state, isActive, isReadOnly, canSave, canComplete,
  waitingQueue, refetchQueue, isQueueRefetching, loadWaitingQueue,
  loadAppointment, startConsultation,
  // ... all other actions
]);
```

**Observation:** The `state` object is in the dependency array. Since `state` is a new object on every reducer dispatch, the `useMemo` effectively recomputes on every action. This means all context consumers re-render on every state change. The individual action functions are stable (wrapped in `useCallback`), but the `state` object reference changes.

---

## 11. State Persistence Summary

| Mechanism | What | When | Where |
|-----------|------|------|-------|
| React Query Cache | Appointment, patient, consultation, history | On fetch success | Browser memory (query cache) |
| useReducer | Workflow state, notes, outcome, UI flags | On every action | Component memory |
| LocalStorage | Draft notes backup | On save success, on load | Browser localStorage |
| API (Server) | Draft notes, completed consultation | On save, on completion | Database |
| URL | Active tab | On tab change | Browser URL |
| Session (Server) | Auth token, queue status | On login, on mutations | Server session + DB |

---

## 12. Render Impact Analysis

### Components That Re-Render on Notes Change

When a doctor types in a SOAP field:

1. `ConsultationContext` dispatches `UPDATE_NOTE_FIELD`
2. Reducer returns new state object
3. `useMemo` recomputes context value (new object reference)
4. All consumers re-render:
   - `ConsultationSessionPageOptimized` (3-column layout)
   - `ConsultationSessionHeader` (header bar)
   - `PatientInfoSidebar` (left panel)
   - `ConsultationWorkspaceOptimized` (center tabs)
   - `ConsultationQueuePanel` (right panel)
   - `StartConsultationDialog` (if mounted)
   - `CompleteConsultationDialog` (if mounted)

### Components That Re-Render on Queue Change

When queue poll returns new data:

1. `waitingQueue` recomputed via `useMemo`
2. `ConsultationQueuePanel` receives new `appointments` prop
3. Queue panel re-renders

### Components That Do NOT Re-Render on Notes Change

- `ConsultationQueuePanel` patient cards (unless queue data changes)
- Previous consultation modal (unless `selectedConsultation` changes)

---

## 13. Anti-Patterns Observed

### 13.1 Large Context Value
The context value object contains ~20 properties. Every consumer receives the entire object even if it only needs 1-2 properties.

### 13.2 State Object in Dependency Array
Including `state` in the `useMemo` dependency array means the memo recomputes on every dispatch, making the memo partially ineffective.

### 13.3 Mixed State Ownership
Notes exist in three places simultaneously:
- Reducer state
- React Query cache (optimistic update)
- LocalStorage

This triple-write pattern can lead to consistency issues.

### 13.4 Sequential Data Fetching
The `loadAppointment` function fetches appointment/doctor/consultation in parallel (good) but then fetches patient/vitals sequentially (acceptable but could be optimized).

### 13.5 Direct DB Access in Server Components
`app/doctor/consultations/[consultationId]/page.tsx` uses Prisma directly in a server component, bypassing the repository pattern. This is acceptable for read-only server components but creates inconsistency.

---

## 14. State Lifecycle Diagram

```
                    ┌─────────────┐
                    │   IDLE/      │
                    │   LOADING    │
                    └──────┬──────┘
                           │
                    loadAppointment()
                           │
                    ┌──────▼──────┐
                    │    READY    │ ← Appointment loaded, waiting to start
                    └──────┬──────┘
                           │
                    startConsultation()
                           │
                    ┌──────▼──────┐
                    │    ACTIVE   │ ← Consultation in progress
                    └──────┬──────┘
                           │
                    ┌──────┴────────┐
                    │               │
              saveDraft()      completeConsultation()
                    │               │
                    │          ┌────▼─────┐
                    │          │COMPLETING│
                    │          └────┬─────┘
                    │               │
              [auto-save]    finalize + route
                    │               │
                    │          ┌────▼─────┐
                    │          │TRANSITION│
                    │          │  ING     │
                    │          └────┬─────┘
                    │               │
                    │          loadNextPatient() OR router.push
                    │               │
                    └───────────────┘
                                    │
                             [error path]
                                    │
                             ┌──────▼──────┐
                             │    ERROR    │
                             └─────────────┘
```

---

## 15. State Restoration After Completion

When a consultation is completed:

1. `dispatch(RESET)` — clears all state back to initial
2. `queryClient.invalidateQueries({ queryKey: ['consultation', completedAppointmentId] })`
3. `queryClient.invalidateQueries({ queryKey: ['consultation'] })`
4. `queryClient.invalidateQueries({ queryKey: ['doctor'] })`
5. `queryClient.invalidateQueries({ queryKey: ['appointments'] })`
6. `queryClient.invalidateQueries({ queryKey: ['billing'] })`
7. `queryClient.invalidateQueries({ queryKey: ['appointment-billing'] })`
8. `localStorage.removeItem(`consultation-draft-${completedAppointmentId}`)`

This aggressive invalidation ensures no stale data leaks into the next consultation session.

---

## 16. Summary

The consultation module's state management is centralized in a single Context with a reducer pattern. While this provides a single source of truth, it creates a wide dependency graph where many components re-render on every keystroke. The combination of React Query for server state and useReducer for client state is appropriate, but the memoization strategy could be improved to reduce unnecessary re-renders.

The state lifecycle is well-defined with clear loading → ready → active → completing → transitioning/error paths. The auto-save and draft restoration mechanisms provide crash recovery, and the aggressive cache invalidation on completion prevents data leakage between sessions.
