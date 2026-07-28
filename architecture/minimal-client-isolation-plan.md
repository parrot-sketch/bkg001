# Minimal Client Isolation Plan

## Objective
Define the smallest architectural correction that restores Clean Architecture while preserving all existing behavior.

---

## Scope: What Must Stay Unchanged

| Component | Reason |
|-----------|--------|
| SessionService | Core business logic, 704 LOC, 21 tests |
| WorkflowCoordinator | Workflow orchestration, 126 LOC |
| WorkflowEngine | State machine execution, 508 LOC, 4 tests |
| DefaultGuardRegistry | Guard registration, 315 LOC |
| All guard files | Clinical validation, 76 guards, 762 LOC |
| All domain enums | App-wide constants |
| All DTOs | Type contracts |
| All API adapters | HTTP communication |
| DraftService | Draft persistence logic |
| DocumentationProvider | Note editing state |
| PatientContextProvider | Patient display state |
| QueueContextProvider | Queue display state |

**Total unchanged: 90+ modules.**

---

## What Must Change

### Change 1: Convert page.tsx to Server Component

**File:** `app/doctor/consultations/session/[appointmentId]/page.tsx`

**Change:**
```typescript
// BEFORE
'use client';

export default function ConsultationSessionPageOptimized({ params }: PageProps) {
  // 452 LOC of client-side logic
}

// AFTER
// NO 'use client' directive

export default async function ConsultationSessionPageOptimized({ params }: PageProps) {
  const resolvedParams = await params;
  const appointmentId = parseInt(resolvedParams.appointmentId, 10);
  
  // Server-side initialization
  const sessionService = new SessionService(
    createWorkflowCoordinator({ ... }),
    new HttpDoctorApi(),
    new HttpConsultationApi(),
    new HttpPatientApi(),
    new DraftService(...)
  );
  
  const result = await sessionService.initializeSession(appointmentId, user.id);
  
  if (!result.success) {
    return <ErrorScreen error={result.error} />;
  }
  
  const session = result.data.session;
  
  return (
    <ConsultationRoomClient
      initialSession={session}
      restoredDraft={result.data.restoredDraft}
    />
  );
}
```

**LOC Delta:** +30 lines, -4 lines (removing auth check that moves to Server Component)

### Change 2: Create ConsultationRoomClient

**File:** `app/doctor/consultations/session/[appointmentId]/ConsultationRoomClient.tsx` (NEW)

```typescript
'use client';

interface ConsultationRoomClientProps {
  initialSession: SessionInitializationResult['data']['session'];
  restoredDraft: boolean;
}

export function ConsultationRoomClient({ initialSession, restoredDraft }: ConsultationRoomClientProps) {
  const { user } = useAuth();
  
  return (
    <SessionProvider initialSession={initialSession} restoredDraft={restoredDraft}>
      <ConsultationProvider>
        <ConsultationSessionContent />
      </ConsultationProvider>
    </SessionProvider>
  );
}
```

**LOC Delta:** +40 lines (new file)

### Change 3: Modify SessionProvider to Accept Initial State

**File:** `providers/session/SessionProvider.tsx`

**Change:**
```typescript
// BEFORE
interface SessionProviderProps {
  children: ReactNode;
  initialAppointmentId?: number;
}

// AFTER
interface SessionProviderProps {
  children: ReactNode;
  initialSession?: SessionData | null;
  restoredDraft?: boolean;
}
```

**Change in useEffect:**
```typescript
// BEFORE
useEffect(() => {
  if (initialAppointmentId && user && !isReady && !isInitializing && !initializationAttempted) {
    initializeSession(initialAppointmentId);
  }
}, [initialAppointmentId, user, isReady, isInitializing, initializeSession, initializationAttempted]);

// AFTER
useEffect(() => {
  if (initialSession && user && !isReady && !isInitializing && !initializationAttempted) {
    // Apply initial session directly — no API calls needed
    const session = initialSession;
    setAppointment(session.appointment);
    setPatient(session.patient);
    setVitals(session.vitals as any);
    setConsultation(session.consultation as any);
    setDoctorId(session.doctorId);
    setNotes(session.notes);
    setOutcomeType(session.outcomeType);
    setPatientDecision(session.patientDecision);
    setWorkflowState(session.workflowState as any);
    setIsDirty(restoredDraft);
    setIsReady(true);
    
    // Update workflow engine context
    if (workflowEngineRef.current && session.appointment) {
      workflowEngineRef.current.updateContext({ ... });
      workflowEngineRef.current.resetConsultationState(session.workflowState);
    }
  } else if (initialAppointmentId && !initialSession && !isReady && !isInitializing && !initializationAttempted) {
    // Fallback: initialize from appointment ID
    initializeSession(initialAppointmentId);
  }
}, [initialSession, initialAppointmentId, restoredDraft, user, isReady, isInitializing, initializeSession, initializationAttempted]);
```

**LOC Delta:** +20 lines, -5 lines

### Change 4: Remove Service Instantiation from SessionProvider

**File:** `providers/session/SessionProvider.tsx`

**Remove:**
```typescript
// REMOVE these lines (211-268):
const coordinator = useMemo(() => {
  const registry = new DefaultGuardRegistry();
  // ... 52 lines of coordinator creation
}, [draftService, httpPatientApi]);

const sessionService = useMemo(
  () => new SessionService(coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService),
  [coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService]
);
```

**Replace with:**
```typescript
// SessionProvider no longer creates services
// It receives session data as props and manages presentation state only
```

**LOC Delta:** -52 lines

### Change 5: Modify DocumentationProvider to Remove Server Action Import

**File:** `providers/documentation/DocumentationProvider.tsx`

**Change:**
```typescript
// BEFORE
import { updateCompletedConsultationNotes } from '@/actions/doctor/consultation-hub';

// AFTER
// Action is called from Server Component, not from client provider
// DocumentationProvider receives saveNotes callback as prop
interface DocumentationProviderProps {
  children: ReactNode;
  draftService: DraftService;
  consultationId?: number | null;
  doctorId?: string | null;
  isCompleted?: boolean;
  notes?: StructuredNotes;
  outcomeType?: ConsultationOutcomeType | null;
  patientDecision?: PatientDecision | null;
  onSaveCompletedNotes?: (notes: StructuredNotes) => Promise<void>;
}
```

**LOC Delta:** -10 lines (import), +5 lines (prop interface)

---

## Changes Summary

| File | Action | LOC Change |
|------|--------|------------|
| `page.tsx` | Modify: remove `'use client'`, add Server Action call | +26 |
| `ConsultationRoomClient.tsx` | NEW: client shell | +40 |
| `SessionProvider.tsx` | Modify: accept initial state, remove service instantiation | -32 |
| `DocumentationProvider.tsx` | Modify: remove Server Action import | -5 |
| **Total** | | **+29 LOC** |

**Files changed:** 3
**Files added:** 1
**Files deleted:** 0

---

## Bundle Reduction Estimate

| Layer | Current LOC | After Fix | Reduction |
|-------|-------------|-----------|-----------|
| Presentation | 2,692 | 4,214 (with new shell) | +522 (new client shell) |
| Application | 2,736 (in bundle) | 0 | **-2,736** |
| Domain | 4,038 (in bundle) | 0 | **-4,038** |
| Infrastructure | 1,901 (in bundle) | 0 | **-1,901** |
| Shared Kernel | 436 | 436 | 0 |
| **Total** | **12,374** | **4,650** | **-7,724 (62%)** |

Note: The +522 LOC in Presentation is the new `ConsultationRoomClient` shell. All existing Presentation modules remain.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Server Component breaks client-side auth | Low | Medium | Auth check stays in Server Component |
| SessionProvider prop changes break consumers | Medium | Medium | Keep backward-compatible props alongside new ones |
| Server Action errors not handled | Low | Medium | Add error boundary in page.tsx |
| Hydration mismatch | Low | Low | Server renders exact initial state, client hydrates from props |
| Existing tests fail | Medium | Low | SessionService tests unchanged; only provider/page tests need update |

**Overall Risk: LOW-MEDIUM**

---

## Rollback Strategy

1. **Add `'use client'` back to page.tsx**
2. **Re-add `initialAppointmentId` prop to SessionProvider**
3. **Re-add service instantiation in SessionProvider useEffect**
4. **Re-add Server Action import in DocumentationProvider**
5. **Delete ConsultationRoomClient.tsx**

**Estimated rollback time:** 2 hours

---

## Why This Is the Minimum Viable Fix

1. **Does not refactor any business logic:** SessionService, WorkflowCoordinator, WorkflowEngine are untouched.
2. **Does not change provider interfaces:** SessionProvider still exposes the same context value.
3. **Does not change page UI:** The consultation room renders identically from the user's perspective.
4. **Only changes WHERE orchestration executes:** From client render to server-side data fetching.
5. **Uses Next.js App Router primitives:** Server Components and Server Actions are first-class features designed for exactly this use case.

**Any smaller change would either:**
- Fail to reduce bundle size enough (Option C: dynamic imports)
- Introduce more architectural violations (Option B: async providers)
- Leave the root cause in place (heap bump: temporary workaround only)

---

## Verification Criteria

After implementation:
1. `npx next build` completes without OOM
2. Turbopack compiles consultation room in <5 seconds
3. Client bundle analysis shows <5,000 LOC for the route
4. Consultation room renders identically (snapshot test)
5. All existing SessionService tests pass (unchanged)
6. Manual QA: open, start, resume, complete consultation flows work
