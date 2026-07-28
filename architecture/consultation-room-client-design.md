# Consultation Room Client Design

## Purpose
Define the new client shell component that replaces the current client-side page.tsx.

---

## 1. Component Responsibility

### ConsultationRoomClient

**File:** `ConsultationRoomClient.tsx`  
**Location:** `app/doctor/consultations/session/[appointmentId]/`  
**Directive:** `'use client'`

#### Responsibilities

1. Receive serialized session state from Server Component
2. Hydrate all providers with initial state
3. Manage local UI-only state (sidebar collapse, loading spinners)
4. Invoke Server Actions for all mutations
5. Handle Server Action loading states and errors
6. Render the consultation room UI

#### Forbidden Responsibilities

1. ❌ Construct any Application service
2. ❌ Construct any Domain workflow object
3. ❌ Construct any Infrastructure adapter
4. ❌ Import `SessionService`, `DraftService`, `WorkflowCoordinator`, `WorkflowEngine`
5. ❌ Import any HTTP client adapter
6. ❌ Perform business logic orchestration
7. ❌ Directly mutate application state outside React state

---

## 2. Public Props Interface

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

interface ConsultationRoomClientProps {
  // Session data (serialized from server)
  readonly initialSession: SerializedSessionData;
  
  // User data (serialized from server)
  readonly user: SerializedUser;
  
  // Draft state
  readonly restoredDraft: boolean;
  
  // UI-only state (not from server)
  readonly children?: React.ReactNode;
}
```

### SerializedSessionData Shape

```typescript
interface SerializedSessionData {
  readonly appointment: {
    readonly id: number;
    readonly patientId: string;
    readonly doctorId: string;
    readonly appointmentDate: string; // ISO date string
    readonly time: string;
    readonly status: string;
    readonly type: string;
    readonly note?: string;
    readonly reason?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly checkedInAt?: string;
    readonly checkedInBy?: string;
    readonly consultationStartedAt?: string;
    readonly consultationEndedAt?: string;
    readonly consultationDuration?: number;
    readonly patient?: { /* serialized patient */ };
    readonly doctor?: { /* serialized doctor */ };
  };
  readonly patient: {
    readonly id: string;
    readonly fileNumber: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly fullName: string;
    readonly dateOfBirth: string;
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
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly profileImage?: string | null;
  };
  readonly vitals: {
    readonly bodyTemperature: number | null;
    readonly systolic: number | null;
    readonly diastolic: number | null;
    readonly heartRate: string | null;
    readonly respiratoryRate: number | null;
    readonly oxygenSaturation: number | null;
    readonly weight: number | null;
    readonly height: number | null;
    readonly recordedAt: string;
    readonly recordedBy: string | null;
  } | null;
  readonly consultation: {
    readonly id: number;
    readonly appointmentId: number;
    readonly doctorId: string;
    readonly userId?: string;
    readonly state: string;
    readonly startedAt?: string;
    readonly completedAt?: string;
    readonly durationMinutes?: number;
    readonly notes?: {
      readonly fullText: string;
      readonly structured?: {
        readonly chiefComplaint?: string;
        readonly examination?: string;
        readonly assessment?: string;
        readonly plan?: string;
      };
    };
    readonly outcomeType?: ConsultationOutcomeType;
    readonly patientDecision?: PatientDecision;
    readonly createdAt: string;
    readonly updatedAt: string;
  } | null;
  readonly doctorId: string;
  readonly workflowState: ConsultationWorkflowState; // Enum (safe to serialize)
  readonly isDirty: boolean;
  readonly draftAvailable: boolean;
  readonly notes: StructuredNotes; // Plain object (safe)
  readonly outcomeType: ConsultationOutcomeType | null;
  readonly patientDecision: PatientDecision | null;
}
```

### SerializedUser Shape

```typescript
interface SerializedUser {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: string;
}
```

---

## 3. Provider Tree

```
ConsultationRoomClient
  │
  ├─ SessionProvider
  │   │
  │   │  Props:
  │   │  - initialSession: SerializedSessionData
  │   │  - user: SerializedUser
  │   │  - restoredDraft: boolean
  │   │
  │   │  Internal changes:
  │   │  - NO service construction
  │   │  - NO useMemo for Http*Api, DraftService, WorkflowEngine, etc.
  │   │  - NO useMemo for DefaultGuardRegistry
  │   │  - Initializes state directly from props
  │   │  - Calls Server Actions for mutations
  │   │
  │   ├─ BillingProvider
  │   │   │  Props:
  │   │   │  - existingBilling?: BillingSummary | null
  │   │   │  (unchanged from current)
  │   │
  │   ├─ DialogProvider
  │   │   │  Props: none (unchanged)
  │   │
  │   ├─ TimerContextProvider
  │   │   │  Props:
  │   │   │  - startedAt: Date | null
  │   │   │  - slotStartTime: Date | null
  │   │   │  - slotDurationMinutes: number | null
  │   │   │  (derived from initialSession, unchanged interface)
  │   │
  │   ├─ QueueContextProvider
  │   │   │  Props:
  │   │   │  - doctorId: string | null
  │   │   │  - currentAppointmentId: number | null
  │   │   │  (derived from initialSession, unchanged interface)
  │   │
  │   ├─ PatientContextProvider
  │   │   │  Props:
  │   │   │  - patient: PatientResponse | null
  │   │   │  - appointment: AppointmentResponse | null
  │   │   │  - vitals: VitalsData | null
  │   │   │  - isLoading: boolean
  │   │   │  - error: string | null
  │   │   │  - consultationId: number | null
  │   │   │  (data from initialSession, unchanged interface)
  │   │
  │   └─ DocumentationProvider
  │       │  Props:
  │       │  - notes: StructuredNotes
  │       │  - outcomeType: ConsultationOutcomeType | null
  │       │  - patientDecision: PatientDecision | null
  │       │  - isCompleted: boolean
  │       │  (data from initialSession, DraftService removed!)
  │       │
  │       │  CRITICAL CHANGE:
  │       │  - DROPS draftService prop
  │       │  - saveDraft becomes Server Action call
  │       │  - saveNotes for completed consultations becomes Server Action
  │       │
  └─ Children (UI)
```

---

## 4. SessionProvider Changes

### Current Props

```typescript
interface SessionProviderProps {
  children: ReactNode;
  initialAppointmentId?: number;
}
```

### New Props

```typescript
interface SessionProviderProps {
  children: ReactNode;
  initialSession: SerializedSessionData;
  user: SerializedUser;
  restoredDraft: boolean;
}
```

### Removed Imports

```typescript
// REMOVED from SessionProvider.tsx:
import { SessionService } from '@/application/services/SessionService';
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
import { DefaultGuardRegistry } from '@/domain/workflows/DefaultGuardRegistry';
import { createWorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinatorFactory';
import { InProcessWorkflowEventBus } from '@/application/events/WorkflowEventBus';
import { DraftService } from '@/application/services/DraftService';
import { HttpPatientApi } from '@/lib/api/patient-adapter';
import { HttpConsultationApi } from '@/lib/api/consultation-adapter';
import { HttpDoctorApi } from '@/lib/api/doctor-adapter';
import { LocalStorageDraftStorage } from '@/lib/storage/local-storage-draft';
```

### New Imports

```typescript
// ADDED to SessionProvider.tsx:
import {
  startSession,
  completeSession,
  resumeSession,
  cancelCompletion,
  switchToPatient,
  advanceQueue,
  sendHeartbeat,
  pauseSession,
  resumePausedSession,
} from '@/actions/doctor/consultation-session';
```

### State Initialization Changes

```typescript
// BEFORE (client-side construction):
const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
const [patient, setPatient] = useState<PatientResponseDto | null>(null);
// ... 10+ useState calls initialized to null/empty

useEffect(() => {
  if (initialAppointmentId && user && !isReady && !isInitializing && !initializationAttempted) {
    initializeSession(initialAppointmentId); // Calls SessionService
  }
}, [initialAppointmentId, user, isReady, isInitializing, initializeSession, initializationAttempted]);

// AFTER (server-initialized state):
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

// NO initialization useEffect needed!
// Session is already initialized by server
```

### Callback Changes

```typescript
// BEFORE (calls SessionService directly):
const initializeSession = useCallback(async (appointmentId: number) => {
  const result = await sessionService.initializeSession(appointmentId, user.id);
  // ... update state
}, [sessionService, user]);

// AFTER (calls Server Action):
const initializeSession = useCallback(async (appointmentId: number) => {
  const result = await initializeSessionAction(appointmentId);
  if (result.success) {
    // ... update state from result.data
  } else {
    // ... handle error
  }
}, []); // No dependencies on services!
```

---

## 5. DocumentationProvider Changes

### Current Props

```typescript
interface DocumentationProviderProps {
  children: ReactNode;
  draftService: DraftService;  // ❌ Application service in client
  consultationId?: number | null;
  doctorId?: string | null;
  isCompleted?: boolean;
  notes?: StructuredNotes;
  outcomeType?: ConsultationOutcomeType | null;
  patientDecision?: PatientDecision | null;
}
```

### New Props

```typescript
interface DocumentationProviderProps {
  children: ReactNode;
  consultationId?: number | null;
  doctorId?: string | null;
  isCompleted?: boolean;
  notes?: StructuredNotes;
  outcomeType?: ConsultationOutcomeType | null;
  patientDecision?: PatientDecision | null;
  onSaveDraft?: (notes: StructuredNotes, outcomeType: ConsultationOutcomeType | null, patientDecision: PatientDecision | null) => Promise<SaveResult>;
  onSaveNotes?: (notes: StructuredNotes) => Promise<SaveResult>;
}
```

### Removed Imports

```typescript
// REMOVED:
import { DraftService } from '@/application/services/DraftService';
import { updateCompletedConsultationNotes } from '@/actions/doctor/consultation-hub';
```

### New Imports

```typescript
// ADDED:
import { saveDraftAction } from '@/actions/doctor/consultation-session';
import { saveCompletedNotesAction } from '@/actions/doctor/consultation-session';
```

### Callback Changes

```typescript
// BEFORE (uses DraftService directly):
const saveDraft = useCallback(async () => {
  const response = await draftService.saveDraft(
    consultationId,
    doctorId,
    state.notes,
    state.outcomeType ?? undefined,
    state.patientDecision ?? undefined
  );
  // ... update state
}, [draftService, consultationId, doctorId, ...]);

// AFTER (calls Server Action):
const saveDraft = useCallback(async () => {
  if (!consultationId || !doctorId) return;
  const result = await saveDraftAction({
    consultationId,
    doctorId,
    notes: state.notes,
    outcomeType: state.outcomeType ?? undefined,
    patientDecision: state.patientDecision ?? undefined,
  });
  if (result.success) {
    dispatch({ type: 'SET_LAST_SAVED', payload: result.version });
    // ...
  }
}, [consultationId, doctorId, state.notes, state.outcomeType, state.patientDecision]);
```

---

## 6. PatientContextProvider Changes

### Current Props

```typescript
interface PatientContextProviderProps {
  children: ReactNode;
  patientApi: PatientApi;  // ❌ Domain interface, implemented by Infrastructure
  patient: PatientResponse | null;
  appointment: AppointmentResponse | null;
  vitals: VitalsData | null;
  isLoading: boolean;
  error: string | null;
  consultationId?: number | null;
}
```

### New Props

```typescript
interface PatientContextProviderProps {
  children: ReactNode;
  patient: PatientResponse | null;
  appointment: AppointmentResponse | null;
  vitals: VitalsData | null;
  isLoading: boolean;
  error: string | null;
  consultationId?: number | null;
  onRefreshPatient?: (patientId: string) => Promise<void>;
  onRefreshAppointments?: (patientId: string) => Promise<void>;
  onRefreshVitals?: (patientId: string, consultationId: number) => Promise<void>;
}
```

### Removed Imports

```typescript
// REMOVED:
import type { PatientApi } from '@/domain/interfaces/services/PatientApi';
import type { PatientResponse } from '@/domain/interfaces/services/PatientApi';
import type { AppointmentResponse } from '@/domain/interfaces/services/PatientApi';
```

### Callback Changes

```typescript
// BEFORE (calls PatientApi directly):
const refreshPatient = useCallback(async () => {
  const result = await patientApi.loadPatient(patient.id);
  // ...
}, [patient?.id, patientApi]);

// AFTER (calls Server Action):
const refreshPatient = useCallback(async () => {
  if (!patient?.id) return;
  const result = await refreshPatientAction(patient.id);
  if (result.success) {
    dispatch({ type: 'SET_PATIENT', payload: result.data });
  } else {
    dispatch({ type: 'SET_ERROR', payload: result.error });
  }
}, [patient?.id, onRefreshPatient]);
```

---

## 7. ConsultationProvider (Compatibility Layer)

### Current Structure

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

### New Structure

```typescript
export function ConsultationProvider({ children, initialSession, user, restoredDraft }: Props) {
  return (
    <SessionProvider initialSession={initialSession} user={user} restoredDraft={restoredDraft}>
      <CompatibilityAdapter>
        {children}
      </CompatibilityAdapter>
    </SessionProvider>
  );
}
```

**CompatibilityAdapter remains unchanged.** It reads from SessionProvider and child providers to reconstruct the legacy `ConsultationProviderState`. As long as SessionProvider's context value shape remains the same, the compatibility layer works without modification.

---

## 8. useConsultationContext() Preservation

### Current Implementation

```typescript
export function useConsultationContext() {
  const context = useContext(ConsultationContext);
  if (!context) {
    throw new Error('useConsultationContext must be used within ConsultationProvider');
  }
  return context;
}
```

### Future Implementation

**UNCHANGED.** The hook, context, and CompatibilityAdapter remain exactly the same. The only change is what props `ConsultationProvider` accepts from its parent.

**All existing UI components that call `useConsultationContext()` continue to work without modification.**

---

## 9. Lifecycle

### Mount

1. Server Component renders, creates Composition Root, calls initializeSession
2. Server serializes SessionData and sends to client
3. ConsultationRoomClient receives props
4. SessionProvider initializes all state from props (no fetch)
5. Child providers initialize from SessionProvider-derived props
6. UI renders with populated state

### Update (Mutation)

1. User triggers action (e.g., click "Start Consultation")
2. SessionProvider calls Server Action (e.g., `startSession()`)
3. Server Action creates Composition Root, executes method, returns result
4. SessionProvider updates local state from result
5. Child providers receive new props via SessionProvider-derived values
6. UI re-renders

### Unmount

1. User navigates away
2. React unmounts ConsultationRoomClient
3. All providers unmount
4. No cleanup needed (server-side services are garbage-collected with the request)

---

## 10. Hydration

### Server-Rendered HTML

The Server Component renders the initial HTML with all providers wrapping the UI. Since SessionProvider has initial state from props, the HTML contains the fully rendered consultation room.

### Client Hydration

1. React hydrates the server-rendered HTML
2. ConsultationRoomClient receives the same serialized props
3. Providers initialize with the same state
4. No hydration mismatch because server and client state are identical

### No Re-fetch on Hydration

Current behavior: SessionProvider calls `initializeSession()` in `useEffect`, causing a re-fetch on hydration.

New behavior: Session is already initialized server-side. No `useEffect` fetch. No re-fetch. No loading state after hydration.

---

## 11. Loading States

### During Server Render

User sees nothing until the Server Component completes. This is standard SSR behavior.

### If Server Initialization Fails

Server Component returns an error UI. Client never receives ConsultationRoomClient props.

```typescript
// page.tsx
if (!initResult.success) {
  return <ConsultationErrorScreen error={initResult.error} />;
}
```

### After Hydration

All state is immediately available. No spinners, no skeletons for session data.

### During Server Actions

```typescript
// SessionProvider
const [isActionPending, startActionTransition] = useTransition();

const startConsultation = startActionTransition(async () => {
  const result = await startSessionAction(appointment.id, doctorId);
  // update state
});
```

UI shows loading indicator on the specific action button during the transition.

---

## 12. Why This Client No Longer Imports Forbidden Modules

### Import Graph Comparison

#### Current (Forbidden Imports)

```
ConsultationRoomClient (page.tsx, client)
  ├─ ConsultationProvider
  │   └─ SessionProvider
  │       ├─ SessionService (Application) ❌
  │       ├─ WorkflowEngine (Domain) ❌
  │       ├─ DefaultGuardRegistry (Domain) ❌
  │       ├─ WorkflowCoordinator (Application) ❌
  │       ├─ DraftService (Application) ❌
  │       ├─ HttpPatientApi (Infrastructure) ❌
  │       ├─ HttpConsultationApi (Infrastructure) ❌
  │       ├─ HttpDoctorApi (Infrastructure) ❌
  │       └─ InProcessWorkflowEventBus (Application) ❌
  └─ DocumentationProvider
      └─ DraftService (Application) ❌
      └─ updateCompletedConsultationNotes (Server Action) ❌
```

#### New (Forbidden Imports Removed)

```
ConsultationRoomClient (client shell)
  ├─ SessionProvider
  │   ├─ Server Actions (functions, not module graph) ✅
  │   └─ NO Application/Domain/Infrastructure imports ✅
  ├─ DocumentationProvider
  │   ├─ Server Actions (functions, not module graph) ✅
  │   └─ NO DraftService import ✅
  ├─ PatientContextProvider
  │   ├─ Server Actions (functions, not module graph) ✅
  │   └─ NO PatientApi import ✅
  ├─ QueueContextProvider (unchanged, already clean) ✅
  ├─ TimerContextProvider (unchanged, already clean) ✅
  ├─ DialogProvider (unchanged, already clean) ✅
  └─ BillingProvider (unchanged, already clean) ✅
```

### Key Mechanism

**Server Actions are functions, not module graph edges.**

When SessionProvider imports a Server Action:
```typescript
import { startSession } from '@/actions/doctor/consultation-session';
```

Turbopack does NOT pull the entire `consultation-session.ts` module graph into the client. Server Actions are compiled to separate RSC requests. The client only holds a reference to the action, not its implementation.

This is why:
- Current: `import { SessionService } from '@/application/services/SessionService'` → pulls 100 modules
- New: `import { startSession } from '@/actions/doctor/consultation-session'` → pulls 1 function reference

---

## 13. Backward Compatibility Checklist

| Consumer | Current API | New API | Breaking? |
|----------|-------------|---------|-----------|
| `useSessionContext()` | Same return shape | Same return shape | ❌ No |
| `useDocumentationContext()` | Same return shape | Same return shape | ❌ No |
| `usePatientContext()` | Same return shape | Same return shape | ❌ No |
| `useQueueContext()` | Same return shape | Same return shape | ❌ No |
| `useTimerContext()` | Same return shape | Same return shape | ❌ No |
| `useDialogContext()` | Same return shape | Same return shape | ❌ No |
| `useBillingContext()` | Same return shape | Same return shape | ❌ No |
| `useConsultationContext()` | Same return shape | Same return shape | ❌ No |
| `ConsultationProvider` | `initialAppointmentId` prop | `initialSession`, `user`, `restoredDraft` props | ⚠️ Yes (caller changes) |
| `page.tsx` (consumer of ConsultationProvider) | `initialAppointmentId` | Not used (page.tsx IS the server component) | ⚠️ Yes (page.tsx changes) |

**Only page.tsx and ConsultationProvider change their props. All consumer hooks keep identical APIs.**
