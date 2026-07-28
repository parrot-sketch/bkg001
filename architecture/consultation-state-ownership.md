# Consultation Module — State Ownership Strategy

## 1. State Classification Framework

Every piece of state in the Consultation Module belongs to exactly one category. The category determines the ownership mechanism, persistence strategy, and synchronization model.

| Category | Definition | Ownership | Persistence | Synchronization |
|----------|-----------|-----------|-------------|------------------|
| **Server State** | Data derived from backend APIs | React Query | API + cache | Revalidation, polling |
| **Client State** | State produced by user interaction, not stored on server | useReducer / Context | Memory | Events, derived values |
| **Form State** | Intermediate form values during input | Component / useReducer | Memory | Controlled components |
| **UI State** | Interface preferences and transient flags | Component local state | Memory | Props, callbacks |
| **Session State** | Long-lived cross-tab state | IndexedDB / Cookies | Persistent storage | Cross-tab sync |
| **Offline State** | Data available without network | IndexedDB | Persistent storage | Background sync |

---

## 2. Server State Ownership

### 2.1 Definition

Server state is data created or owned by the backend. The frontend is a consumer. The backend is the source of truth.

### 2.2 Data Catalog

| Data | API Source | React Query Key | Cache Policy | Invalidation Trigger |
|------|-----------|-----------------|--------------|---------------------|
| Appointment | `GET /appointments/:id` | `['appointment', id]` | Stale-while-revalidate, 5min stale | Start, complete, switch |
| Patient | `GET /patients/:id` | `['patient', patientId]` | Cache-first, 15min stale | Switch patient |
| Vitals | `GET /patients/:id/vitals` | `['vitals', patientId, appointmentId]` | Cache-first, 10min stale | Switch patient, manual refresh |
| Consultation | `GET /appointments/:id/consultation` | `['consultation', appointmentId]` | Network-only, staleTime 0 | Save draft, complete |
| Consultation History | `GET /patients/:id/consultations` | `['patient-history', patientId]` | Cache-first, 5min stale | Patient switch |
| Queue | `GET /doctors/:id/appointments/today` | `['queue', doctorId]` | Background polling, 30s interval | Start, complete, switch, manual |
| Billing | `GET /appointments/:id/billing` | `['billing', appointmentId]` | Cache-first, 5min stale | Complete |

### 2.3 Ownership Rules

**Rule 1: React Query is the sole owner of server state cache.**
No provider may maintain its own copy of server data. If data came from an API, it must flow through React Query.

**Rule 2: Mutations invalidate, they do not update directly.**
When a mutation succeeds, invalidate the relevant query key. React Query refetches. This prevents optimistic update desync.

**Exception:** Draft saves use optimistic updates because the save is a background operation and the UI should not wait for refetch.

**Rule 3: Cache keys are global contracts.**
Query keys like `['consultation', appointmentId]` are shared across all providers. Changing a key structure is a breaking change.

**Rule 4: Stale time reflects clinical urgency.**
High-stakes data (consultation) has staleTime 0. Low-stakes data (patient demographics) has higher stale time.

### 2.4 Implementation

```typescript
// infrastructure/cache/QueryConfig.ts

export const QUERY_CONFIG = {
  appointment: {
    queryKey: (id: number) => ['appointment', id] as const,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  },
  consultation: {
    queryKey: (id: number) => ['consultation', id] as const,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, // auto-save handles freshness
  },
  queue: {
    queryKey: (doctorId: string) => ['queue', doctorId] as const,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    networkMode: 'offlineFirst',
  },
} as const;
```

---

## 3. Client State Ownership

### 3.1 Definition

Client state is state produced by user interaction, UI preferences, or computation that does not need to persist beyond the session.

### 3.2 Data Catalog

| Data | Owner | Mechanism | Persistence | Lifetime |
|------|-------|-----------|-------------|----------|
| `workflowState` | SessionProvider | useReducer | Memory | Session lifetime |
| `notes` | DocumentationProvider | useReducer | Memory + localStorage backup | Session lifetime |
| `outcomeType` | DocumentationProvider | useReducer | Memory + API | Session lifetime |
| `patientDecision` | DocumentationProvider | useReducer | Memory + API | Session lifetime |
| `draftStatus` | DocumentationProvider | useReducer | Memory | Session lifetime |
| `dirtyFields` | DocumentationProvider | useReducer | Memory | Session lifetime |
| `switchingState` | QueueProvider | useReducer | Memory | Transient |
| `isCollapsed` | QueueProvider | useReducer | Memory | Session lifetime |
| `activeTab` | DocumentationProvider | useState | Memory + URL | Session lifetime |
| `selectedHistoryId` | PatientContextProvider | useState | Memory | Transient |
| `toastQueue` | NotificationProvider | useReducer | Memory | Transient |

### 3.3 Ownership Rules

**Rule 1: Client state lives in reducers within providers.**
No global client state. All client state is scoped to a provider with a clear owner.

**Rule 2: Client state is never duplicated.**
If two providers need the same client state, it must be owned by one provider and accessed via events or shared read model.

**Rule 3: Client state is cleared on session end.**
When a consultation is completed or abandoned, all client state within the SessionProvider tree is reset to initial values.

### 3.4 Implementation

```typescript
// contexts/consultation/providers/DocumentationProvider.tsx

interface DocumentationState {
  notes: SOAPNote;
  outcomeType: OutcomeType | null;
  patientDecision: PatientDecision | null;
  draftStatus: SaveStatus;
  dirtyFields: Set<NoteField>;
  version: string | null;
  activeTab: NoteTab;
  hasConflict: boolean;
}

type DocumentationAction =
  | { type: 'UPDATE_NOTE'; field: NoteField; value: string }
  | { type: 'SET_OUTCOME'; outcome: OutcomeType }
  | { type: 'SET_PATIENT_DECISION'; decision: PatientDecision }
  | { type: 'SET_SAVE_STATUS'; status: SaveStatus }
  | { type: 'SET_DIRTY'; field: NoteField }
  | { type: 'CLEAN_FIELD'; field: NoteField }
  | { type: 'RESET' };

function documentationReducer(state: DocumentationState, action: DocumentationAction): DocumentationState {
  switch (action.type) {
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: { ...state.notes, [action.field]: action.value },
        dirtyFields: new Set(state.dirtyFields).add(action.field),
        draftStatus: 'idle',
      };
    case 'SET_OUTCOME':
      return {
        ...state,
        outcomeType: action.outcome,
        patientDecision: action.outcome === 'PROCEDURE_RECOMMENDED' ? 'PENDING' : null,
        dirtyFields: new Set(state.dirtyFields).add('outcome'),
      };
    case 'RESET':
      return createInitialDocumentationState();
    default:
      return state;
  }
}
```

---

## 4. Form State Ownership

### 4.1 Definition

Form state is intermediate values during user input that have not yet been committed to client state.

### 4.2 Data Catalog

| Form Data | Owner | Mechanism | Commit Trigger |
|-----------|-------|-----------|---------------|
| Doctor pre-session notes | StartConsultationDialog | useState | Form submit |
| Completion summary | CompletionDialog | useState | Form submit |
| Follow-up date/time | PlanTab | useState | Outcome change |
| Referral doctor name | PlanTab | useState | Outcome change |
| Billing item description | BillingSummary | useState | Completion confirm |

### 4.3 Ownership Rules

**Rule 1: Form state lives in the component that renders the form.**
No provider manages dialog-specific form state.

**Rule 2: Form state is committed on submit, not on change.**
Input changes update form state. Submit commits to client state or triggers a use case.

**Rule 3: Form state is discarded on dialog close.**
If the user closes the dialog without submitting, form state is lost. No persistence.

### 4.4 Implementation

```tsx
// components/StartConsultationDialog.tsx

function StartConsultationDialog({ onClose, onSuccess, appointment }: Props) {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSuccess(doctorNotes); // commits to SessionProvider via use case
      onClose();
    } catch (error) {
      // Form state retained for retry
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <form onSubmit={handleSubmit}>
        <Textarea value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} />
        <Button type="submit" disabled={isSubmitting}>Begin Consultation</Button>
      </form>
    </Dialog>
  );
}
```

---

## 5. UI State Ownership

### 5.1 Definition

UI state is transient interface state: panel visibility, hover states, scroll position, loading toggles.

### 5.2 Data Catalog

| Data | Owner | Mechanism | Lifetime |
|------|-------|-----------|----------|
| `isPatientSidebarCollapsed` | SessionPage | useState | Session lifetime |
| `isQueuePanelCollapsed` | QueuePanel internal | useState | Session lifetime |
| `isSubmitting` | Dialog components | useState | Form submission |
| `isLoading` | Components (local) | useState | Fetch lifetime |
| `activeTooltip` | Components | useState | Hover lifetime |

### 5.3 Ownership Rules

**Rule 1: UI state is local by default.**
If state is used by only one component, it stays in that component's `useState`.

**Rule 2: UI state that crosses a component boundary must be promoted to a provider.**
If two sibling components need the same UI state, the parent owns it via `useState` and passes it as props, or a provider owns it.

**Rule 3: UI state never persists.**
No localStorage, no React Query, no session storage. UI state resets on navigation.

---

## 6. Session State Ownership

### 6.1 Definition

Session state is data that must survive navigation, tab close, or browser restart within the same logical session.

### 6.2 Data Catalog

| Data | Owner | Mechanism | Persistence | Recovery Trigger |
|------|-------|-----------|-------------|-----------------|
| Draft notes backup | DraftStorage adapter | localStorage / IndexedDB | Disk | Session load (DraftService.restoreDraft) |
| Draft metadata | DraftStorage adapter | localStorage / IndexedDB | Disk | Session load |
| Auth token | AuthAdapter | TokenStorage | Browser storage | Auth check |
| Session heartbeat | TimerService | Memory + backend | Backend timestamp | Every 30s |

### 6.3 Ownership Rules

**Rule 1: Session state is opt-in.**
Only data explicitly marked as session-critical is persisted. Everything else is memory-only.

**Rule 2: Session state has explicit recovery semantics.**
Draft restoration has clear rules: newer than server → restore; older → discard. No ambiguity.

**Rule 3: Session state is cleared on terminal events.**
On completion, cancellation, or explicit reset, all session state is cleared.

### 6.4 Implementation

```typescript
// infrastructure/storage/DraftStorage.ts

interface DraftStorage {
  get(appointmentId: number): Promise<Draft | null>;
  set(appointmentId: number, draft: Draft): Promise<void>;
  remove(appointmentId: number): Promise<void>;
}

class LocalStorageDraftStorage implements DraftStorage {
  private readonly prefix = 'consultation-draft-';

  async get(appointmentId: number): Promise<Draft | null> {
    try {
      const raw = localStorage.getItem(`${this.prefix}${appointmentId}`);
      if (!raw) return null;
      const draft = JSON.parse(raw) as Draft;
      if (!draft.timestamp) {
        localStorage.removeItem(`${this.prefix}${appointmentId}`);
        return null;
      }
      return draft;
    } catch {
      localStorage.removeItem(`${this.prefix}${appointmentId}`);
      return null;
    }
  }

  async set(appointmentId: number, draft: Draft): Promise<void> {
    try {
      localStorage.setItem(`${this.prefix}${appointmentId}`, JSON.stringify(draft));
    } catch (quotaExceeded) {
      // Graceful degradation: draft not backed up, but save succeeded
      console.warn('localStorage quota exceeded, draft backup skipped');
    }
  }

  async remove(appointmentId: number): Promise<void> {
    localStorage.removeItem(`${this.prefix}${appointmentId}`);
  }
}
```

---

## 7. Offline State Ownership

### 7.1 Definition

Offline state is server state that has been synchronized to the client for offline access.

### 7.2 Strategy

| Data | Offline Strategy | Sync Trigger |
|------|-----------------|-------------|
| Consultation notes | IndexedDB (future) | Auto-save when online |
| Draft backup | localStorage (current) | On save |
| Queue data | React Query persistence | On load, on polling when online |

### 7.3 Ownership Rules

**Rule 1: Offline state is infrastructure concern, not domain concern.**
Providers do not know whether data came from online or offline. The cache adapter handles sync.

**Rule 2: Offline writes are queued and retried.**
If a draft save fails due to network, it is queued and retried when connectivity returns.

**Rule 3: Offline data is reconciled on reconnection.**
When coming back online, the cache adapter compares local state with server state and resolves conflicts.

---

## 8. State Transition Rules

### 8.1 Permitted Transitions

```
Server State
    ↓ (API response)
React Query cache
    ↓ (provider reads)
Provider state (client state)
    ↓ (user action)
Form state (component)
    ↓ (submit)
Use case / Application Service
    ↓ (mutation)
API call
    ↓ (success)
React Query invalidation
    ↓ (refetch)
Server State (updated)
```

**One-directional flow for server data.** Server → React Query → Provider → Component → User Action → API → React Query → Server.

### 8.2 Notes State Exception

Notes have a special loop for real-time editing:

```
User types → Component dispatch → Provider reducer → Component re-render
    ↓ (debounce 3s)
DocumentationService.save() → API call → React Query optimistic → API response
    ↓ (success)
DraftStorage.set() → localStorage backup
    ↓
Provider state stays (no refetch needed)
```

**Rationale:** Refetching notes after every save would interrupt typing. Optimistic update preserves local state while server confirms.

---

## 9. Conflict Resolution

### 9.1 Version Conflict (Concurrent Editing)

**Scenario:** Two tabs edit the same consultation simultaneously.

**Resolution:**
1. Both tabs have independent provider state.
2. Both tabs auto-save with incrementing version.
3. Tab A's save succeeds (version 3).
4. Tab B's save fails (version 2 is stale, server at version 3).
5. Tab B detects `VERSION_CONFLICT`.
6. Tab B rolls back optimistic update.
7. Tab B refetches `['consultation', appointmentId]` from server.
8. Tab B dispatches `RESOLVE_CONFLICT` with server notes.
9. Tab B's notes are overwritten with server version.
10. User sees a subtle conflict indicator and can manually merge if needed.

**Owner:** DocumentationService + useSaveConsultationDraft hook.

### 9.2 LocalStorage/Server Conflict (Crash Recovery)

**Scenario:** Browser crashes after localStorage save but before server confirms.

**Resolution:**
1. On reload, DraftStorage.get() returns draft with timestamp T1.
2. Server consultation.updatedAt is T0 (T0 < T1).
3. Draft is newer → silent restore.
4. Next auto-save pushes T1 to server, reconciling.

**Owner:** DraftService.restoreDraft().

---

## 10. Summary

State ownership in the target architecture follows a strict taxonomy:

- **Server state** → React Query with explicit cache policies
- **Client state** → Provider reducers with single ownership
- **Form state** → Component local state, committed on submit
- **UI state** → Component local state, never persisted
- **Session state** → Storage adapters with explicit recovery semantics
- **Offline state** → Infrastructure adapters with sync/queue mechanisms

The key principle is **no ambiguity about ownership**. Every piece of state has exactly one owner, one persistence mechanism, and one synchronization model. This eliminates the current triple-write ambiguity for notes and prevents future inconsistencies as the module grows.
