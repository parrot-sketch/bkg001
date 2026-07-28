# Composition Root Options

## Purpose
Evaluate three architectural options for establishing the Composition Root and restoring Clean Architecture.

---

## 1. Current State (Baseline)

```
Client Component: page.tsx
  ↓
Client Component: ConsultationProvider
  ↓
Client Component: SessionProvider  ← Composition Root (WRONG LOCATION)
  ↓
  new HttpPatientApi() (Infrastructure)
  new HttpConsultationApi() (Infrastructure)
  new HttpDoctorApi() (Infrastructure)
  new DraftService() (Application)
  new DefaultGuardRegistry() (Domain)
  new WorkflowEngine() (Domain)
  new WorkflowCoordinator() (Application)
  new SessionService() (Application)
```

**Problems:**
- 51 forbidden modules in client bundle
- 12,374 LOC in client bundle
- Turbopack heap exhaustion
- Presentation layer constructs Application/Domain objects

---

## 2. Option A: Server Component + Composition Root (RECOMMENDED)

### Architecture

```
Server Component: page.tsx
  ↓
Server Action / Direct import: SessionService + dependencies (constructed here)
  ↓
Pre-compute: initializeSession(), getInitialSessionState()
  ↓
Client Shell: ConsultationRoomClient  ← Receives session state as props
  ↓
Client Component: SessionProvider  ← Receives initial state, NOT services
  ↓
Client Component: DocumentationProvider
  ↓
Client Component: PatientContextProvider
  ↓
Client Component: QueueContextProvider
  ↓
Client Component: TimerContextProvider
  ↓
Client Component: DialogProvider
```

### Implementation Pattern

```typescript
// app/doctor/consultations/session/[appointmentId]/page.tsx (SERVER)
import { createSessionFactory } from '@/infrastructure/composition/ConsultationSessionFactory';
import { ConsultationRoomClient } from './ConsultationRoomClient';

export default async function ConsultationSessionPage({ params }: { params: { appointmentId: string } }) {
  const session = createSessionFactory({ appointmentId: parseInt(params.appointmentId), user });

  const [initialSession, patient, consultation] = await Promise.all([
    session.initializeSession(),
    session.patientApi.getPatient(appointment.patientId),
    session.consultationApi.getConsultation(appointmentId)
  ]);

  return (
    <ConsultationRoomClient
      initialSession={initialSession}
      patient={patient}
      consultation={consultation}
    />
  );
}
```

```typescript
// ConsultationRoomClient.tsx (CLIENT)
'use client';

export function ConsultationRoomClient({
  initialSession,
  patient,
  consultation
}: {
  initialSession: SessionState;
  patient: Patient;
  consultation: Consultation;
}) {
  return (
    <SessionProvider initialSession={initialSession} patient={patient} consultation={consultation}>
      <DocumentationProvider initialNotes={initialSession.notes}>
        <PatientContextProvider patient={patient}>
          <QueueContextProvider>
            <TimerContextProvider>
              <DialogProvider>
                {children}
              </DialogProvider>
            </TimerContextProvider>
          </QueueContextProvider>
        </PatientContextProvider>
      </DocumentationProvider>
    </SessionProvider>
  );
}
```

### Comparison

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Layer compliance | ✅ Compliant | Server Component is the Composition Root. Presentation server boundary constructs Application/Domain. |
| Dependency direction | ✅ Correct | All dependencies flow inward: Infrastructure → Application → Domain → Presentation (server) |
| Client bundle | ✅ 4,650 LOC | Only Presentation modules + safe types. Application/Domain/Infrastructure never reach client. |
| Runtime behavior | ✅ Works | Server constructs, serializes state, client renders. No heap exhaustion. |
| Hydration | ✅ Minimal | Server renders initial state. Client hydrates shell. No runtime service instantiation. |
| Complexity | ⚠️ Medium | New client shell component + Server Component conversion + 3 provider prop changes. |
| Rollback | ✅ Easy | Re-add `'use client'` to page.tsx. Done. |
| Testing impact | ✅ Low | Service tests unchanged. Provider tests focus on state management. |
| Long-term maintainability | ✅ Excellent | Clean boundary scales. New features don't risk bundle explosion. |

### Implementation Details

**Files changed:**
1. `app/doctor/consultations/session/[appointmentId]/page.tsx` — Remove `'use client'`, add server initialization logic
2. `ConsultationRoomClient.tsx` — NEW client shell component
3. `providers/session/SessionProvider.tsx` — Accept `initialSession`, `patient`, `consultation` props; remove service construction
4. `providers/documentation/DocumentationProvider.tsx` — Accept `initialNotes` prop; remove direct Action import

**LOC delta:** +34 total

**Effort:** 0.5-1 day for implementation + 0.5 day for testing

**Risk:** LOW-MEDIUM

---

## 3. Option B: Composition Root in Parent Component (NOT RECOMMENDED)

### Architecture

```
Client Component: page.tsx
  ↓
Composition Root: SessionComposition  ← NEW (still client-side)
  ↓
  new SessionService() (Application)
  new WorkflowCoordinator() (Application)
  new WorkflowEngine() (Domain)
  ↓
Client Component: SessionProvider (receives services as props)
  ↓
Client Component: DocumentationProvider
  ↓
...
```

### Implementation Pattern

```typescript
// SessionComposition.tsx (CLIENT — still)
'use client';

function SessionComposition({ children, appointmentId }: Props) {
  const services = useMemo(() => {
    return createSessionFactory({ appointmentId });
  }, [appointmentId]);

  return (
    <SessionProvider sessionService={services.sessionService} ...>
      {children}
    </SessionProvider>
  );
}
```

### Comparison

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Layer compliance | ⚠️ Partial | Composition Root is still in Presentation. Not a true boundary. |
| Dependency direction | ⚠️ Mixed | Dependencies flow inward BUT within Presentation layer |
| Client bundle | ❌ 12,374 LOC | Modules still imported from client. Same heap exhaustion. |
| Runtime behavior | ❌ Crashes | Same Turbopack heap exhaustion. Composition doesn't change module graph. |
| Hydration | ❌ N/A | Never reaches hydration |
| Complexity | ⚠️ Medium | New composition component + prop drilling |
| Rollback | ✅ Easy | Remove SessionComposition wrapper |
| Testing impact | ✅ Low | Similar to current |
| Long-term maintainability | ❌ Poor | Bundle problem not solved. Same risk of growth. |

### Why This Fails

**This option does NOT solve the heap exhaustion because:**

1. `SessionComposition` is still a client component
2. `createSessionFactory` must import `SessionService`
3. `SessionService` imports `WorkflowCoordinator`
4. `WorkflowCoordinator` imports `WorkflowEngine`
5. The module graph is identical
6. Turbopack still analyzes the same 100 modules
7. Result: SAME heap exhaustion, SAME crash

**Moving the Composition Root within the client side does not move the module boundary.**

---

## 4. Option C: Dynamic Imports (NOT RECOMMENDED — Trap)

### Architecture

```
Client Component: page.tsx
  ↓
const SessionService = dynamic(() => import('@/application/services/SessionService'));
  ↓
Client Component: SessionProvider
  ↓
new SessionService()  ← Constructed in client render
```

### Comparison

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Layer compliance | ❌ Violation | Still constructs Application in client |
| Client bundle | ❌ 12,374 LOC | Dynamic import doesn't change module graph analysis |
| Runtime behavior | ❌ Crashes | Turbopack still analyzes all modules for module graph. Static initializers still execute. |
| Complexity | ⚠️ Low | Only one-line change |
| Rollback | ✅ Trivial | Remove dynamic import |

### Why This Is a Trap

**Dynamic imports move code delivery, NOT module analysis.**

When Turbopack builds the module graph:
1. It parses STATIC imports to build the graph
2. It follows ALL transitive imports
3. It identifies initializers (side effects)
4. It doesn't matter if a module is dynamically imported — the graph still includes it

**Dynamic imports change WHEN code loads, not WHETHER it's analyzed.**

For Turbopack:
- `import Foo from './foo'` → Analyzes './foo' and all its dependencies
- `const Foo = dynamic(() => import('./foo'))` → Still analyzes './foo' and all its dependencies for the initial module graph

The heap exhaustion happens during module graph ANALYSIS, not during runtime execution. Dynamic imports don't help.

---

## 5. Option D: Server Actions Only (Variant of Option A)

### Architecture

```
Server Component: page.tsx
  ↓
Server Action: createSession() → constructs services server-side, returns initial state
  ↓
Client Component: ConsultationRoomClient
  ↓
Client Component: SessionProvider (receives state, calls Server Actions for mutations)
```

### Comparison with Option A

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Layer compliance | ✅ Compliant | Same as Option A |
| Client bundle | ✅ Same | Same as Option A |
| Runtime behavior | ✅ Same | Same as Option A |
| Complexity | ⚠️ Slightly higher | Server Action adds extra indirection |
| Hydration | ✅ Same | Same as Option A |
| Testing impact | ✅ Low | Same as Option A |

**Verdict:** Option D is essentially Option A with an extra Server Action wrapper. Not strictly necessary if page.tsx can be a Server Component. Use Option A unless a specific Server Action pattern is required by existing conventions.

---

## 6. Option E: Heap Increase (NOT RECOMMENDED)

### Architecture

```
Client Component: page.tsx
  ↓
NODE_OPTIONS='--max-old-space-size=8192'  ← Increase heap
  ↓
Client Component: SessionProvider  ← Same as current
```

### Comparison

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Layer compliance | ❌ Still violates | Same architectural violation |
| Client bundle | ❌ Still large | More memory, same logic |
| Runtime behavior | ⚠️ Works | May work temporarily, but not sustainable |
| Complexity | ⚠️ Low | One config change |
| Rollback | ✅ Trivial | Remove NODE_OPTIONS |
| Testing impact | ✅ None | Same tests |

### Problems

1. **Temporary workaround:** Bundle size keeps growing. Next feature addition may break it again.
2. **Costly:** Developer machines need 8GB+ heap limits.
3. **CI/CD impact:** Build servers need more resources.
4. **Doesn't fix architecture:** The violation remains, hiding behind more memory.
5. **Poor developer experience:** Dev server starts slower, more memory pressure.

**This is NOT a fix. It's a workaround that delays the real fix.**

---

## 7. Side-by-Side Comparison

| Option | Layer Compliant | Fixes Bundle | Fixes Architecture | Runtime Works | Rollback Easy | Complexity | Maintainability |
|--------|----------------|-------------|-------------------|---------------|---------------|------------|-----------------|
| A (Server Component + Composition Root) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Easy | Medium | ✅ Excellent |
| B (Composition Root in Parent) | ⚠️ Partial | ❌ No | ⚠️ Partial | ❌ No | ✅ Easy | Medium | ❌ Poor |
| C (Dynamic Imports) | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Trivial | Low | ❌ Poor |
| D (Server Actions) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Easy | Medium-High | ✅ Excellent |
| E (Heap Increase) | ❌ No | ❌ No | ❌ No | ⚠️ Maybe | ✅ Trivial | Low | ❌ Poor |

---

## 8. Recommended Option

**Option A: Server Component + Composition Root**

### Why Option A is Correct

1. **Only option that fixes the bundle problem:** Moves 51 forbidden modules out of client bundle
2. **Only option that restores Clean Architecture:** Server boundary becomes single Composition Root
3. **Low risk:** Rollback is trivial (re-add `'use client'`)
4. **Proven pattern:** AuthFactory and TheaterSchedulingFactory use the same pattern successfully
5. **Minimal code changes:** +34 LOC, 3 files modified, 1 file added
6. **Preserves behavior:** All existing functionality works identically

### Why Other Options Are Rejected

- **Option B:** Doesn't solve bundle problem. Same heap exhaustion.
- **Option C:** Traps readers. Dynamic imports don't change module graph analysis.
- **Option D:** Overkill. Option A is simpler. Option D is viable if Server Actions are required.
- **Option E:** Workaround that delays the real fix. Unsustainable.

---

## 9. Implementation Plan Summary

### Step 1: Create Infrastructure Composition Root

**New file:** `infrastructure/composition/ConsultationSessionFactory.ts`

Creates the complete session object graph:
- Infrastructure adapters
- Application services
- Domain workflow components
- Returns fully-wired services + initial state

### Step 2: Convert page.tsx to Server Component

**Modify:** `app/doctor/consultations/session/[appointmentId]/page.tsx`

- Remove `'use client'`
- Import composition root
- Pre-fetch data server-side
- Create `ConsultationRoomClient` wrapper

### Step 3: Create Client Shell

**New file:** `ConsultationRoomClient.tsx`

- `'use client'` directive
- Receives initial state as props
- Wraps providers with received data

### Step 4: Modify SessionProvider

**Modify:** `providers/session/SessionProvider.tsx`

- Accept `initialSession`, `patient`, `consultation` props
- Remove `new HttpPatientApi()`, `new HttpConsultationApi()`, etc.
- Remove `new DefaultGuardRegistry()`, `new WorkflowEngine()`, etc.
- Remove `new SessionService()` construction
- Apply initial state directly without service instantiation

### Step 5: Modify DocumentationProvider

**Modify:** `providers/documentation/DocumentationProvider.tsx`

- Accept `initialNotes` prop
- Remove direct import of Server Action
- Receive `onSave` callback as prop

### Step 6: Verify

- Run lint/typecheck
- Verify client bundle size
- Verify no forbidden modules in client bundle
- Verify heap usage during Turbopack compilation

---

## 10. Conclusion

**Option A is the only architectural correction that restores Clean Architecture, fixes the bundle explosion, and maintains runtime correctness.**

The other options fail because they don't address the root cause: the Composition Root is in the wrong layer.
