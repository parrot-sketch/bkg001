# Provider Hydration Audit

## Purpose
Verify that every provider can hydrate from the designed payload without hidden initialization assumptions. Identify any provider that cannot receive its initial state via props.

---

## 1. Hydration Payload Shape

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

interface SerializedSessionData {
  readonly appointment: SerializedAppointment;
  readonly patient: SerializedPatient;
  readonly vitals: SerializedVitals | null;
  readonly consultation: SerializedConsultation | null;
  readonly doctorId: string;
  readonly workflowState: ConsultationWorkflowState;
  readonly isDirty: boolean;
  readonly draftAvailable: boolean;
  readonly notes: StructuredNotes;
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
}

interface SerializedAppointment {
  readonly id: number;
  readonly patientId: string;
  readonly doctorId: string;
  readonly appointmentDate: string;       // ISO string
  readonly time: string;
  readonly status: string;
  readonly type: string;
  readonly note?: string;
  readonly reason?: string;
  readonly createdAt?: string;             // ISO string
  readonly updatedAt?: string;             // ISO string
  readonly checkedInAt?: string;           // ISO string
  readonly checkedInBy?: string;
  readonly consultationStartedAt?: string; // ISO string
  readonly consultationEndedAt?: string;   // ISO string
  readonly consultationDuration?: number;
  readonly patient?: { ... };
  readonly doctor?: { ... };
  readonly slotAllocation?: { ... };
}

interface SerializedPatient {
  readonly id: string;
  readonly fileNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly dateOfBirth: string;            // ISO string
  readonly age: number;
  readonly gender: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappPhone?: string;
  readonly address?: string;
  readonly occupation?: string;
  readonly maritalStatus?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactNumber?: string;
  readonly relation?: string;
  readonly hasPrivacyConsent: boolean;
  readonly hasServiceConsent: boolean;
  readonly hasMedicalConsent: boolean;
  readonly bloodGroup?: string;
  readonly allergies?: string;
  readonly medicalConditions?: string;
  readonly medicalHistory?: string;
  readonly insuranceProvider?: string;
  readonly insuranceNumber?: string;
  readonly createdAt?: string;              // ISO string
  readonly updatedAt?: string;              // ISO string
  readonly profileImage?: string | null;
  readonly colorCode?: string;
  readonly lastVisitDate?: string;          // ISO string
  readonly assignedAt?: string | null;      // ISO string
  readonly visitCount?: number;
}

interface SerializedConsultation {
  readonly id: number;
  readonly appointmentId: number;
  readonly doctorId: string;
  readonly userId?: string;
  readonly state: string;
  readonly startedAt?: string;              // ISO string
  readonly completedAt?: string;            // ISO string
  readonly durationMinutes?: number;
  readonly notes?: { ... };
  readonly outcomeType?: ConsultationOutcomeType;
  readonly patientDecision?: PatientDecision;
  readonly followUp?: {
    readonly date?: string;                 // ISO string
    readonly type?: string;
    readonly notes?: string;
  };
}

interface SerializedVitals {
  readonly bodyTemperature: number | null;
  readonly systolic: number | null;
  readonly diastolic: number | null;
  readonly heartRate: string | null;
  readonly respiratoryRate: number | null;
  readonly oxygenSaturation: number | null;
  readonly weight: number | null;
  readonly height: number | null;
  readonly recordedAt: string;              // ISO string
  readonly recordedBy: string | null;
}
```

---

## 2. SessionProvider Hydration

### Current Initialization

```typescript
// BEFORE (client-side)
function SessionProvider({ children, initialAppointmentId }: SessionProviderProps) {
  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  // ... 10+ useState calls initialized to null/empty
  
  useEffect(() => {
    if (initialAppointmentId && user && !isReady && !isInitializing && !initializationAttempted) {
      initializeSession(initialAppointmentId); // Calls SessionService
    }
  }, [initialAppointmentId, user, ...]);
```

### New Initialization

```typescript
// AFTER (server-initialized)
function SessionProvider({ 
  children, 
  initialSession, 
  user, 
  restoredDraft 
}: SessionProviderProps) {
  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(
    initialSession.appointment
  );
  const [patient, setPatient] = useState<PatientResponseDto | null>(
    initialSession.patient
  );
  const [vitals, setVitals] = useState<VitalsData | null>(
    initialSession.vitals
  );
  // ... all state initialized from initialSession props
```

### Hidden Assumptions Check

| Hidden Assumption | Exists? | Risk | Resolution |
|-------------------|---------|------|------------|
| State starts as null/empty, then populates via useEffect | ✅ Yes | Medium | Hydration provides full state. No useEffect fetch needed. |
| `initializeSession` must be called to populate state | ✅ Yes | Low | Server already called it. Client receives result. |
| `workflowEngineRef` must call `updateContext()` before commands | ✅ Yes | Medium | Server already called `updateContext()`. Client doesn't need engine. |
| `draftService` must be passed to DocumentationProvider | ✅ Yes | Low | DocumentationProvider gets `notes` prop instead. |
| `httpPatientApi` must be passed to PatientContextProvider | ✅ Yes | Low | PatientContextProvider gets `patient` prop instead. |
| `queryClient` for cache invalidation | ✅ Yes | Low | Client shell wraps with QueryClientProvider. SessionProvider uses `useQueryClient()` internally. |

### Verdict

✅ SessionProvider can hydrate from serialized payload.

**One risk:** If `initialSession.appointment` is `null` (e.g., appointment not found), providers must handle null state gracefully. This is already handled — all providers check for null before rendering.

---

## 3. DocumentationProvider Hydration

### Current Initialization

```typescript
// BEFORE
function DocumentationProvider({ 
  children, 
  draftService,         // ❌ Application service
  consultationId, 
  doctorId, 
  isCompleted = false,
  notes,                // ✅ Optional initial notes
  outcomeType,
  patientDecision,
}: DocumentationProviderProps) {
  const [state, dispatch] = useReducer(documentationReducer, createInitialState());
  
  useEffect(() => {
    if (notes && Object.keys(notes).length > 0) {
      dispatch({ type: 'SET_NOTES', payload: notes });
    }
  }, [consultationId, notes, ...]);
```

### New Initialization

```typescript
// AFTER
function DocumentationProvider({ 
  children,
  consultationId,
  doctorId,
  isCompleted = false,
  notes = {},           // ✅ Initial notes from server
  outcomeType,
  patientDecision,
  onSaveDraft,          // ✅ Callback instead of DraftService
  onSaveNotes,          // ✅ Callback for completed notes
}: DocumentationProviderProps) {
  const [state, dispatch] = useReducer(documentationReducer, {
    ...createInitialState(),
    notes: notes,       // ✅ Initialize directly from props
  });
```

### Hidden Assumptions Check

| Hidden Assumption | Exists? | Risk | Resolution |
|-------------------|---------|------|------------|
| `notes` prop is optional, defaults to `{}` | ✅ Yes | Low | Server always provides notes. Client defaults to `{}` as fallback. |
| `draftService.saveDraft` is the save mechanism | ✅ Yes | High | Replaced with `onSaveDraft` callback. |
| `updateCompletedConsultationNotes` imported directly | ✅ Yes | Medium | Replaced with `onSaveNotes` callback. |
| Auto-save debouncing (3s useEffect) | ✅ Yes | Low | Stays unchanged. Triggers `onSaveDraft`. |
| `lastSyncedConsultationIdRef` tracks consultation changes | ✅ Yes | Low | Server provides correct consultationId. No tracking needed. |

### Verdict

✅ DocumentationProvider can hydrate from serialized payload.

**Key change:** `draftService` prop is removed. Save operations use callbacks.

---

## 4. PatientContextProvider Hydration

### Current Initialization

```typescript
// BEFORE
function PatientContextProvider({
  children,
  patientApi,           // ❌ Domain interface
  patient,              // ✅ Data
  appointment,          // ✅ Data
  vitals,               // ✅ Data
  isLoading,
  error,
  consultationId,
}: PatientContextProviderProps) {
  const [state, dispatch] = useReducer(patientContextReducer, createInitialState());
  
  useEffect(() => {
    dispatch({ type: 'SET_PATIENT', payload: patient });
  }, [patient]);
```

### New Initialization

```typescript
// AFTER
function PatientContextProvider({
  children,
  patient,              // ✅ Data from server
  appointment,          // ✅ Data from server
  vitals,               // ✅ Data from server
  isLoading = false,    // ✅ Initialized from server
  error = null,         // ✅ Initialized from server
  consultationId,
  onRefreshPatient,     // ✅ Callback
  onRefreshAppointments,// ✅ Callback
  onRefreshVitals,      // ✅ Callback
}: PatientContextProviderProps) {
  const [state, dispatch] = useReducer(patientContextReducer, {
    ...createInitialState(),
    patient,
    appointment,
    vitals,
    isLoading,
    error,
  });
```

### Hidden Assumptions Check

| Hidden Assumption | Exists? | Risk | Resolution |
|-------------------|---------|------|------------|
| `patientApi` is required for refresh | ✅ Yes | High | Replaced with `onRefreshPatient` callback. |
| State starts empty, populated via useEffect | ✅ Yes | Medium | Server provides full state. Initialize directly. |
| `consultationId` used for vitals refresh | ✅ Yes | Low | Passed as prop. No change needed. |
| `isLoading` starts false, set true during refresh | ✅ Yes | Low | Server sets initial `isLoading = false`. Client sets true during refresh. |

### Verdict

✅ PatientContextProvider can hydrate from serialized payload.

---

## 5. QueueContextProvider Hydration

### Current Initialization

```typescript
// BEFORE (unchanged)
function QueueContextProvider({
  children,
  doctorId,             // ✅ Passed by SessionProvider
  currentAppointmentId, // ✅ Passed by SessionProvider
}: QueueContextProviderProps) {
  const [state, dispatch] = useReducer(queueContextReducer, createInitialQueueState());
  
  const { data: todayAppointments = [], refetch, isRefetching } = 
    useDoctorTodayAppointments(doctorId, state.queueLoaded, false);
```

### New Initialization

```typescript
// AFTER (unchanged)
function QueueContextProvider({
  children,
  doctorId,             // ✅ Still passed by SessionProvider (derived from initialSession)
  currentAppointmentId, // ✅ Still passed by SessionProvider (derived from initialSession)
}: QueueContextProviderProps) {
```

### Hidden Assumptions Check

| Hidden Assumption | Exists? | Risk | Resolution |
|-------------------|---------|------|------------|
| `doctorId` is required for React Query hook | ✅ Yes | Low | Server provides `doctorId` from session. |
| `currentAppointmentId` filters queue | ✅ Yes | Low | Server provides from session. |
| Queue data loads via React Query | ✅ Yes | Low | Client-side data fetching stays. |
| `useDoctorTodayAppointments` filters by time | ✅ Yes | Low | Hook behavior unchanged. |

### Verdict

✅ QueueContextProvider can hydrate from serialized payload. No changes needed.

---

## 6. TimerContextProvider Hydration

### Current Initialization

```typescript
// BEFORE (unchanged)
function TimerContextProvider({
  children,
  startedAt,            // ✅ Passed by SessionProvider
  slotStartTime,        // ✅ Passed by SessionProvider
  slotDurationMinutes,  // ✅ Passed by SessionProvider
}: TimerContextProviderProps) {
```

### New Initialization

```typescript
// AFTER (unchanged)
function TimerContextProvider({
  children,
  startedAt,            // ✅ Derived from initialSession.consultation?.startedAt
  slotStartTime,        // ✅ Derived from initialSession.appointment
  slotDurationMinutes,  // ✅ Derived from initialSession.appointment
}: TimerContextProviderProps) {
```

### Hidden Assumptions Check

| Hidden Assumption | Exists? | Risk | Resolution |
|-------------------|---------|------|------------|
| `startedAt` can be null/undefined | ✅ Yes | Low | Server passes null if consultation not started. |
| `slotStartTime` computed from appointment | ✅ Yes | Low | Server computes same way. |
| `slotDurationMinutes` defaults to 30 | ✅ Yes | Low | Server provides actual value or default. |

### Verdict

✅ TimerContextProvider can hydrate from serialized payload. No changes needed.

---

## 7. DialogProvider Hydration

### Current Initialization

```typescript
// BEFORE (unchanged)
function DialogProvider({ children }: DialogProviderProps) {
  const [isCompleteDialogOpen, setCompleteDialogOpen] = useState(false);
  const [isStartDialogOpen, setStartDialogOpen] = useState(false);
```

### New Initialization

```typescript
// AFTER (unchanged)
function DialogProvider({ children }: DialogProviderProps) {
  const [isCompleteDialogOpen, setCompleteDialogOpen] = useState(false);
  const [isStartDialogOpen, setStartDialogOpen] = useState(false);
```

### Hidden Assumptions Check

| Hidden Assumption | Exists? | Risk | Resolution |
|-------------------|---------|------|------------|
| Dialogs start closed | ✅ Yes | Low | Server hydration starts false. Client mutates via callbacks. |
| Dialog state is ephemeral | ✅ Yes | Low | No persistence needed. |

### Verdict

✅ DialogProvider can hydrate from serialized payload. No changes needed.

---

## 8. BillingProvider Hydration

### Current Initialization

```typescript
// BEFORE (unchanged)
function BillingProvider({
  children,
  existingBilling,      // ✅ Optional billing summary
}: BillingProviderProps) {
  const [billingItems, setBillingItems] = useState<BillItem[]>([]);
  const [billingTotal, setBillingTotal] = useState(0);
```

### New Initialization

```typescript
// AFTER (unchanged)
function BillingProvider({
  children,
  existingBilling,      // ✅ Passed from server if available
}: BillingProviderProps) {
```

### Hidden Assumptions Check

| Hidden Assumption | Exists? | Risk | Resolution |
|-------------------|---------|------|------------|
| Billing data is optional | ✅ Yes | Low | Server may or may not provide billing. Client handles both. |
| BillingItems start empty | ✅ Yes | Low | Server populates if available. |

### Verdict

✅ BillingProvider can hydrate from serialized payload. No changes needed.

---

## 9. useConsultationContext() Compatibility

### Current Implementation

```typescript
export function ConsultationProvider({ children, initialAppointmentId }: Props) {
  return (
    <SessionProvider initialAppointmentId={initialAppointmentId}>
      <CompatibilityAdapter>
        {children}
      </CompatibilityAdapter>
    </SessionProvider>
  );
}
```

### New Implementation

```typescript
export function ConsultationProvider({ 
  children, 
  initialSession, 
  user, 
  restoredDraft 
}: Props) {
  return (
    <SessionProvider initialSession={initialSession} user={user} restoredDraft={restoredDraft}>
      <CompatibilityAdapter>
        {children}
      </CompatibilityAdapter>
    </SessionProvider>
  );
}
```

### CompatibilityAdapter Status

**UNCHANGED.** The adapter reads from SessionProvider and child providers via hooks. As long as SessionProvider's context value shape remains the same, the compatibility layer works without modification.

### Verdict

✅ `useConsultationContext()` continues to work unchanged.

---

## 10. Hidden Initialization Assumptions

### Critical Assumptions Found

| # | Assumption | Provider | Current Behavior | Post-Migration Risk | Resolution |
|---|-----------|----------|------------------|---------------------|------------|
| 1 | `workflowEngineRef.current.updateContext()` must be called before workflow commands | SessionProvider | Called in `initializeSession` after session data loads | Server already calls this. Client doesn't need engine. | Remove `workflowEngineRef` entirely from client. |
| 2 | `SessionService` instance persists across renders | SessionProvider | Created in `useMemo`, reused | No service instance in client. | Server Actions replace direct service calls. |
| 3 | `DraftService` instance passed to DocumentationProvider | SessionProvider → DocumentationProvider | Via `docsProps.draftService` | Removed. DocumentationProvider uses `onSaveDraft`. | Replace prop with callback. |
| 4 | `PatientApi` instance passed to PatientContextProvider | SessionProvider → PatientContextProvider | Via `patientProps.patientApi` | Removed. PatientContextProvider uses `onRefreshPatient`. | Replace prop with callback. |
| 5 | `queryClient.invalidateQueries()` called after mutations | SessionProvider | Via `queryClient` from `useQueryClient()` | Still needed for React Query cache. | SessionProvider continues to use `useQueryClient()` internally. |
| 6 | `useEffect` initializes session on mount | SessionProvider | Triggers `initializeSession` | Server already initialized session. | Remove initialization useEffect. |

### Non-Critical Assumptions

| # | Assumption | Provider | Risk | Resolution |
|---|-----------|----------|------|------------|
| 7 | Auto-save debouncing (3s) | DocumentationProvider | Low | Unchanged. Client still debounces. |
| 8 | Timer interval (30s heartbeat) | SessionProvider | Low | Now calls Server Action instead of SessionService. |
| 9 | User change resets session | SessionProvider | Low | Server Component re-renders with new user. |
| 10 | `initialAppointmentId` changes trigger re-initialization | SessionProvider | High (if not handled) | Server Component handles navigation. ConsultationRoomClient receives new props. |

---

## 11. Provider State Transition Matrix

| Provider | Before: Initial State | After: Initial State | State Transitions |
|----------|----------------------|----------------------|-------------------|
| SessionProvider | `null`/empty → populated by `initializeSession` | Populated from `initialSession` prop | Same transitions (setState on mutations) |
| DocumentationProvider | `{}` → populated by `SET_NOTES` | Populated from `notes` prop | Same transitions (dispatch actions) |
| PatientContextProvider | `null` → populated by `SET_PATIENT` | Populated from `patient` prop | Same transitions (dispatch actions) |
| QueueContextProvider | Empty → populated by React Query | Empty → populated by React Query | Unchanged |
| TimerContextProvider | Derived from `startedAt` | Derived from `startedAt` | Unchanged |
| DialogProvider | `false` | `false` | Unchanged |
| BillingProvider | `[]`/`0` | Populated from `existingBilling` if provided | Unchanged |

**All providers transition from client-side initialization to server-side initialization without changing their state transition logic.**

---

## 12. Conclusion

**All 8 providers can hydrate from the designed payload.**

**No provider has a hidden initialization assumption that cannot be resolved.**

**Required changes:**
1. SessionProvider: Remove service construction, receive `initialSession` prop
2. DocumentationProvider: Remove `draftService` prop, add `onSaveDraft` callback
3. PatientContextProvider: Remove `patientApi` prop, add `onRefreshPatient` callback
4. All other providers: No changes needed

**Zero providers require new state management patterns.**
