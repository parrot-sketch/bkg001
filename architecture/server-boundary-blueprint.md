# Server Boundary Blueprint

## Purpose
Define the complete runtime architecture for the consultation room with the Composition Root at the Server Component boundary.

---

## 1. High-Level Runtime Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client Bundle)                           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ConsultationRoomClient  ('use client')                            │   │
│  │                                                                    │   │
│  │  Responsibilities:                                                 │   │
│  │  - Receive serialized session state from server                   │   │
│  │  - Hydrate providers with initial state                            │   │
│  │  - Manage local UI state (dialogs, sidebar collapse, etc.)         │   │
│  │  - Call Server Actions for mutations                               │   │
│  │  - Render UI skeleton while loading                                │   │
│  │                                                                    │   │
│  │  Forbidden imports:                                                 │   │
│  │  - NO Application services                                         │   │
│  │  - NO Domain workflows                                              │   │
│  │  - NO Infrastructure adapters                                       │   │
│  │  - NO SessionService, WorkflowCoordinator, DraftService             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                  │                                       │
│          ┌───────────────────────┼───────────────────────┐              │
│          ▼                       ▼                       ▼              │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │ useSession   │    │ useDocumentation │    │  usePatient      │       │
│  │ Context()    │    │ Context()        │    │  Context()       │       │
│  │              │    │                  │    │                  │       │
│  │ State:       │    │ State:           │    │ State:           │       │
│  │ - session    │    │ - notes          │    │ - patient        │       │
│  │ - workflow   │    │ - outcome        │    │ - appointment    │       │
│  │ - loading    │    │ - isDirty        │    │ - vitals         │       │
│  │              │    │                  │    │                  │       │
│  │ Callbacks:   │    │ Callbacks:       │    │ Callbacks:       │       │
│  │ - startSession│   │ - updateNotes    │    │ - refreshPatient │       │
│  │ - complete   │    │ - saveDraft      │    │ - refreshVitals  │       │
│  │ - switch     │    │ - saveNotes      │    │                  │       │
│  │ - advance    │    │                  │    │                  │       │
│  │ - heartbeat  │    │                  │    │                  │       │
│  └──────────────┘    └──────────────────┘    └──────────────────┘       │
│                                                                          │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │ useQueue     │    │ useTimer         │    │ useDialog        │       │
│  │ Context()    │    │ Context()        │    │ Context()        │       │
│  │              │    │                  │    │                  │       │
│  │ State:       │    │ State:           │    │ State:           │       │
│  │ - queue      │    │ - elapsed        │    │ - dialogs        │       │
│  │ - refetching │    │ - timeInfo       │    │                  │       │
│  └──────────────┘    └──────────────────┘    └──────────────────┘       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ useConsultationContext()  [Compatibility Layer]                   │   │
│  │ - Reconstructs legacy ConsultationProviderState                   │   │
│  │ - Delegates to SessionProvider + child providers                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ UI Components                                                    │   │
│  │ - ConsultationSessionHeader                                       │   │
│  │ - PatientInfoSidebar                                              │   │
│  │ - ConsultationWorkspaceOptimized                                  │   │
│  │ - ConsultationQueuePanel                                          │   │
│  │ - StartConsultationDialog                                         │   │
│  │ - CompleteConsultationDialog                                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        SERVER (Node.js Runtime)                          │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ page.tsx  (Server Component — NO 'use client')                    │   │
│  │                                                                    │   │
│  │  Responsibilities:                                                 │   │
│  │  - Composition Root                                                 │   │
│  │  - Authentication check                                             │   │
│  │  - Construct all Application/Domain/Infrastructure services         │   │
│  │  - Execute initializeSession()                                     │   │
│  │  - Pre-fetch all dependent data                                    │   │
│  │  - Serialize session state for client                              │   │
│  │  - Render ConsultationRoomClient with serialized props             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                  │                                       │
│                                  ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ConsultationSessionFactory  (Composition Root)                     │   │
│  │                                                                    │   │
│  │  Creates (in order):                                               │   │
│  │  1. Infrastructure adapters                                         │   │
│  │     - HttpPatientApi                                               │   │
│  │     - HttpConsultationApi                                          │   │
│  │     - HttpDoctorApi                                                │   │
│  │     - LocalStorageDraftStorage                                     │   │
│  │  2. Shared singletons                                              │   │
│  │     - DefaultGuardRegistry                                         │   │
│  │     - NoopQueueApi                                                 │   │
│  │     - NoopNotificationService                                       │   │
│  │     - NoopAuditService                                              │   │
│  │  3. Application services                                           │   │
│  │     - DraftService                                                  │   │
│  │     - WorkflowEngine                                               │   │
│  │     - InProcessWorkflowEventBus                                    │   │
│  │     - WorkflowCoordinator (via WorkflowCoordinatorFactory)          │   │
│  │     - SessionService                                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                  │                                       │
│                                  ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Server Actions  ('use server')                                     │   │
│  │                                                                    │   │
│  │  Each action:                                                      │   │
│  │  - Imports ConsultationSessionFactory                              │   │
│  │  - Constructs or receives service graph                            │   │
│  │  - Executes single SessionService method                           │   │
│  │  - Returns serialized result                                       │   │
│  │                                                                    │   │
│  │  Actions:                                                          │   │
│  │  - startSession                                                    │   │
│  │  - completeSession                                                 │   │
│  │  - resumeSession                                                   │   │
│  │  - cancelCompletion                                                │   │
│  │  - switchToPatient                                                 │   │
│  │  - advanceQueue                                                    │   │
│  │  - sendHeartbeat                                                   │   │
│  │  - pauseSession                                                    │   │
│  │  - resumePausedSession                                             │   │
│  │  - saveDraft                                                       │   │
│  │  - saveCompletedNotes                                              │   │
│  │  - updateConsultationOutcome                                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Database / External APIs                                           │   │
│  │ - Prisma (PostgreSQL)                                              │   │
│  │ - HTTP APIs (patient, consultation, doctor)                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layered Responsibility Matrix

| Responsibility | Client | Server Component | Server Actions | Application | Domain | Infrastructure |
|----------------|--------|------------------|----------------|-------------|--------|----------------|
| Composition Root | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Authentication | Display only | ✅ Verify | ✅ Verify | ❌ | ❌ | ❌ |
| Session initialization | ❌ | ✅ Execute | ❌ | ✅ Logic | ✅ State machine | ✅ API calls |
| Workflow commands | ❌ | ❌ | ✅ Execute | ✅ Orchestrate | ✅ Guard/evaluate | ❌ |
| Draft persistence | ❌ | ❌ | ✅ Execute | ✅ Coordinate | ❌ | ✅ Storage |
| Note editing UI | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Note persistence | ❌ | ❌ | ✅ Execute | ❌ | ❌ | ✅ API |
| Patient display | ✅ State | ❌ | ❌ | ❌ | ❌ | ❌ |
| Patient refresh | ❌ | ❌ | ✅ Execute | ❌ | ❌ | ✅ API |
| Queue rendering | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Queue refetch | ✅ Trigger | ❌ | ❌ | ❌ | ❌ | ✅ React Query |
| Timer display | ✅ Compute | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dialog visibility | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Navigation | ✅ Router | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Module Ownership After Migration

### Client Bundle (What Lives in Browser)

| Module | Layer | Reason |
|--------|-------|--------|
| `providers/session/SessionProvider` | Presentation | State management, Server Action calls |
| `providers/documentation/DocumentationProvider` | Presentation | Note editing state |
| `providers/patient/PatientContextProvider` | Presentation | Patient display state |
| `providers/queue/QueueContextProvider` | Presentation | Queue display state |
| `providers/timer/TimerContextProvider` | Presentation | Timer computation |
| `providers/dialog/DialogProvider` | Presentation | Dialog visibility |
| `providers/billing/BillingProvider` | Presentation | Billing display state |
| `contexts/ConsultationContext` | Presentation | Compatibility layer |
| `components/consultation/*` | Presentation | UI components |
| `application/dtos/*` | Application | Type-only imports (safe) |
| `domain/enums/*` | Domain | Type-only imports (safe) |
| `shared-kernel/types/*` | Shared Kernel | Type-only imports (safe) |

### Server Bundle (What Lives on Server)

| Module | Layer | Reason |
|--------|-------|--------|
| `infrastructure/composition/ConsultationSessionFactory` | Infrastructure | Composition Root |
| `application/services/SessionService` | Application | Business orchestration |
| `application/services/DraftService` | Application | Draft coordination |
| `application/orchestrators/WorkflowCoordinator` | Application | Workflow orchestration |
| `application/orchestrators/WorkflowCoordinatorFactory` | Application | Workflow construction |
| `domain/workflows/WorkflowEngine` | Domain | State machine |
| `domain/workflows/DefaultGuardRegistry` | Domain | Guard registration |
| `domain/workflows/GuardContext` | Domain | Workflow context |
| `infrastructure/adapters/patient/HttpPatientApi` | Infrastructure | HTTP client |
| `infrastructure/adapters/consultation/HttpConsultationApi` | Infrastructure | HTTP client |
| `infrastructure/adapters/doctor/HttpDoctorApi` | Infrastructure | HTTP client |
| `infrastructure/storage/LocalStorageDraftStorage` | Infrastructure | Client storage (server-side mirror) |
| `application/events/WorkflowEventBus` | Application | Event bus |
| `actions/doctor/consultation-session.ts` | Presentation | Server Actions |

---

## 4. Data Flow Diagram

### Initial Load (Server-Side)

```
1. User navigates to /doctor/consultations/session/[appointmentId]
2. Next.js Server Component executes:
   a. Authentication check (requireAuth)
   b. Composition Root: createSessionFactory({ appointmentId, user })
   c. sessionService.initializeSession(appointmentId, user.id)
      - Parallel: fetch appointment, doctor, consultation
      - Parallel: fetch patient, vitals
      - Restore draft
      - Determine initial workflow state
      - Execute INITIALIZE_CONSULTATION workflow command
   d. Serialize SessionData to plain object
   e. Serialize User to plain object
3. Server sends HTML with embedded serialized state
4. Client hydrates ConsultationRoomClient with props
5. Providers initialize from props (no service construction)
```

### Mutation (Client → Server Action → Client)

```
1. User clicks "Start Consultation"
2. Client: SessionProvider calls startSession(appointmentId, doctorId)
3. Instead of SessionService, calls Server Action: startSession(appointmentId, doctorId)
4. Server Action:
   a. createSessionFactory({ appointmentId, user })
   b. sessionService.startSession(appointmentId, doctorId, user.id)
   c. Serialize result
   d. Return serialized SessionData
5. Client: SessionProvider updates local state from result
6. UI re-renders with new state
```

### Draft Save (Client → Server Action → Client)

```
1. User edits notes, auto-save triggers after 3s debounce
2. Client: DocumentationProvider calls saveDraft()
3. Instead of DraftService, calls Server Action: saveDraft(consultationId, doctorId, notes, outcomeType, patientDecision)
4. Server Action:
   a. createSessionFactory({ appointmentId, user })
   b. draftService.saveDraft(...)
   c. Return { success, version }
5. Client: DocumentationProvider updates isDirty=false, lastSavedAt=version
```

### Queue Advance (Client → Server Action → Client)

```
1. User clicks "Advance Queue"
2. Client: SessionProvider calls advanceQueue()
3. Server Action: advanceQueue(doctorId, userId)
4. Server Action:
   a. createSessionFactory({ appointmentId, user })
   b. sessionService.advanceQueue(doctorId, userId)
   c. If next session exists, return SessionInitializationResult
   d. If queue empty, return null
5. Client: SessionProvider either:
   a. Clears state (queue empty)
   b. Switches to next session (replaces all state)
```

---

## 5. Key Architectural Invariants

| Invariant | Enforcement | Validation |
|-----------|-------------|------------|
| Client bundle contains ZERO Application service modules | No imports of `application/services/*` in `'use client'` files | Bundle analysis in CI |
| Client bundle contains ZERO Domain workflow modules | No imports of `domain/workflows/*` in `'use client'` files | Bundle analysis in CI |
| Client bundle contains ZERO Infrastructure adapter modules | No imports of `infrastructure/adapters/*` in `'use client'` files | Bundle analysis in CI |
| Composition Root exists exactly once | Only `ConsultationSessionFactory` creates full object graph | Code review |
| SessionService is never constructed in client | No `new SessionService` outside server | Grep in CI |
| All mutations go through Server Actions | No direct API calls from providers | Code review |
| Provider APIs remain unchanged | Same context values, same hooks | Existing tests pass |
| useConsultationContext() unchanged | Same context shape | Existing UI components work |

---

## 6. File Inventory

### New Files

| File | Purpose | Owner |
|------|---------|-------|
| `infrastructure/composition/ConsultationSessionFactory.ts` | Composition Root — creates full session object graph | Infrastructure |
| `actions/doctor/consultation-session.ts` | Server Actions for all session mutations | Presentation (server) |
| `ConsultationRoomClient.tsx` | Client shell receiving serialized session | Presentation |
| `lib/session-serializer.ts` | Serialize/deserialize SessionData for hydration | Shared Kernel |

### Modified Files

| File | Changes | Owner |
|------|---------|-------|
| `app/doctor/consultations/session/[appointmentId]/page.tsx` | Remove `'use client'`, add server initialization, render ConsultationRoomClient | Presentation |
| `providers/session/SessionProvider.tsx` | Accept initial state props, replace SessionService calls with Server Actions | Presentation |
| `providers/documentation/DocumentationProvider.tsx` | Replace DraftService prop with save callbacks | Presentation |
| `providers/patient/PatientContextProvider.tsx` | Replace PatientApi prop with refresh callbacks | Presentation |
| `contexts/ConsultationContext.tsx` | Update to work with new SessionProvider props | Presentation |

### Unchanged Files

| File | Reason |
|------|--------|
| `providers/queue/QueueContextProvider.tsx` | Pure presentation, no service dependencies |
| `providers/timer/TimerContextProvider.tsx` | Pure computation, no service dependencies |
| `providers/dialog/DialogProvider.tsx` | Pure UI state |
| `providers/billing/BillingProvider.tsx` | Pure presentation, receives data as props |
| `application/services/SessionService.ts` | Business logic unchanged, just called from different places |
| `application/orchestrators/WorkflowCoordinatorFactory.ts` | Unchanged |
| `domain/workflows/WorkflowEngine.ts` | Unchanged |
| All UI components | Unchanged |

---

## 7. Runtime Guarantees

| Guarantee | How |
|-----------|-----|
| No Application/Domain/Infrastructure code in client bundle | Server Component boundary + no imports in client files |
| Session state is always initialized before hydration | Server Component blocks render until initializeSession completes |
| Workflow state is consistent | WorkflowEngine constructed server-side, state serialized to client |
| Draft integrity | Draft restore happens server-side, draft save via Server Action |
| No stale workflow state across consultations | New Composition Root per request, new WorkflowEngine per request |
| Authentication enforced | Server Component requires auth, Server Actions verify auth |
| Error states handled | Server Component returns error UI, Server Actions return error results |
| Rollback possible | Can revert to current client-side architecture by re-adding `'use client'` |

---

## 8. Comparison to Existing Patterns

### AuthFactory Pattern

```
API Route / Server Component
  ↓
AuthFactory.create(prisma)  ← Composition Root in Infrastructure
  ↓
Returns: LoginUseCase, RefreshTokenUseCase, LogoutUseCase
  ↓
Used server-side only
```

**This pattern is proven.** AuthFactory has never caused a bundle problem because it's never imported by client components.

### ConsultationSessionFactory Pattern (New)

```
Server Component
  ↓
ConsultationSessionFactory.create(config)  ← Composition Root in Infrastructure
  ↓
Returns: SessionService, WorkflowCoordinator, WorkflowEngine, DraftService, adapters
  ↓
Server Component calls initializeSession()
  ↓
Serializes result to ConsultationRoomClient props
  ↓
Client: Zero Application/Domain/Infrastructure imports
```

**This is the same proven pattern, applied to the consultation session.**

### TheaterSchedulingFactory Pattern

```
Server Component
  ↓
TheaterSchedulingFactory.create(prisma)  ← Composition Root in Application
  ↓
Returns: TheaterSchedulingUseCase
  ↓
Used server-side only
```

**Also proven.** Both AuthFactory and TheaterSchedulingFactory demonstrate that the Composition Root belongs in Infrastructure/Application, never in Presentation client.

---

## 9. Why This Architecture Is Correct

### 1. Single Composition Root
`ConsultationSessionFactory` is the ONLY location that constructs the full session object graph. It is imported ONLY by server-side code.

### 2. Clean Architecture Restored
Dependency flow is restored:
- Infrastructure adapters → Application services → Domain workflows → Presentation (server)
- Presentation client never imports inner layers

### 3. Bundle Problem Solved
Client bundle contains:
- Presentation providers (state management)
- Presentation components (UI)
- Safe types (DTOs, enums)

Client bundle does NOT contain:
- SessionService, DraftService, WorkflowCoordinator
- WorkflowEngine, DefaultGuardRegistry
- HttpPatientApi, HttpConsultationApi, HttpDoctorApi

### 4. Clinical Behavior Preserved
- All workflow transitions execute identically
- All draft saves execute identically
- All data fetching executes identically
- All error handling executes identically
- Only the invocation path changes (client→server→client instead of client→service)

### 5. Incrementally Migratable
- Can be implemented in PRs
- Each PR is revertible
- Can validate bundle size at each step
- Existing tests for SessionService continue to pass
