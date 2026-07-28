# Consultation Composition Root

## Purpose
Define exactly what the Composition Root creates, in what order, who owns each object, and its lifetime.

---

## 1. Composition Root Definition

**File:** `infrastructure/composition/ConsultationSessionFactory.ts`

**Owner:** Infrastructure Layer

**Imported by:** Server Components and Server Actions only

**Never imported by:** Client components, Presentation layer, UI components

---

## 2. Creation Order and Ownership

### Phase 1: Infrastructure Adapters

These are created first because Application and Domain objects depend on them.

| Order | Object | Type | Constructor Arguments | Owner | Lifetime |
|-------|--------|------|----------------------|-------|----------|
| 1 | `HttpPatientApi` | Infrastructure Adapter | none | Infrastructure | Per request |
| 2 | `HttpConsultationApi` | Infrastructure Adapter | none | Infrastructure | Per request |
| 3 | `HttpDoctorApi` | Infrastructure Adapter | none | Infrastructure | Per request |
| 4 | `LocalStorageDraftStorage` | Infrastructure Storage | none | Infrastructure | Per session (server-side mirror) |

**Ownership:** Infrastructure Layer  
**Rationale:** HTTP adapters are I/O concerns. Draft storage is persistence concern. Both belong in Infrastructure.

### Phase 2: Shared Singletons

These are stateless or configuration objects that can be shared.

| Order | Object | Type | Construction | Owner | Lifetime |
|-------|--------|------|--------------|-------|----------|
| 5 | `DefaultGuardRegistry` | Domain Configuration | `new DefaultGuardRegistry()` — registers 76 guards internally | Domain | Singleton |
| 6 | `NoopQueueApi` | Infrastructure Stub | `createNoopQueueApi()` | Infrastructure | Singleton |
| 7 | `NoopNotificationService` | Infrastructure Stub | `createNoopNotificationService()` | Infrastructure | Singleton |
| 8 | `NoopAuditService` | Infrastructure Stub | `createNoopAuditService()` | Infrastructure | Singleton |

**Ownership:** Domain ( registry) / Infrastructure (noops)  
**Rationale:** Guard registry is domain configuration. No-ops are stateless stubs. Both should be singletons, not per-request.

### Phase 3: Application Services

These depend on Phase 1 and Phase 2 objects.

| Order | Object | Type | Constructor Arguments | Owner | Lifetime |
|-------|--------|------|----------------------|-------|----------|
| 9 | `DraftService` | Application Service | `consultationApi`, `draftStorage` | Application | Per request |
| 10 | `InProcessWorkflowEventBus` | Application Event Bus | `{ preserveOrder: true }` | Application | Per request |
| 11 | `WorkflowEngine` | Domain State Machine | `consultationState`, `documentationState`, `context`, `{ registry, shortCircuit }` | Domain | Per request |
| 12 | `WorkflowCoordinator` | Application Orchestrator | `dependencies` object containing DraftService, PatientApi, QueueApi, NotificationService, AuditService, TimerService, WorkflowEngine, EventBus | Application | Per request |
| 13 | `SessionService` | Application Service | `coordinator`, `doctorApi`, `consultationApi`, `patientApi`, `draftService` | Application | Per request |

**Ownership:** Application  
**Rationale:** These are the business orchestration layer. They coordinate workflows, manage drafts, and own session lifecycle. They should be per-request, not constructed by Presentation.

### Phase 4: Presentation State

This is prepared for serialization and hydration.

| Order | Object | Type | Construction | Owner | Lifetime |
|-------|--------|------|--------------|-------|----------|
| 14 | `SessionData` | DTO | Built from `sessionService.initializeSession()` result | Application | Per request (serialized) |
| 15 | `GuardContext` | Domain Context | Built from user/appointment data | Domain | Per request (transient) |

**Ownership:** Application / Domain  
**Rationale:** These are data structures, not services. They flow from server to client as serialized state.

---

## 3. Complete Construction Graph

```
ConsultationSessionFactory.create({ appointmentId, user })
  │
  ├─ Phase 1: Infrastructure Adapters
  │   ├─ new HttpPatientApi()
  │   ├─ new HttpConsultationApi()
  │   ├─ new HttpDoctorApi()
  │   └─ new LocalStorageDraftStorage()
  │
  ├─ Phase 2: Shared Singletons
  │   ├─ new DefaultGuardRegistry()
  │   ├─ createNoopQueueApi()
  │   ├─ createNoopNotificationService()
  │   └─ createNoopAuditService()
  │
  ├─ Phase 3: Application Services
  │   ├─ new DraftService(consultationApi, draftStorage)
  │   ├─ new InProcessWorkflowEventBus({ preserveOrder: true })
  │   │
  │   ├─ new WorkflowEngine(
  │   │     ConsultationWorkflowState.IDLE,
  │   │     DocumentationWorkflowState.Document,
  │   │     initialContext,
  │   │     { registry, shortCircuit: false }
  │   │   )
  │   │
  │   ├─ createWorkflowCoordinator({
  │   │     dependencies: {
  │   │       draftService,
  │   │       patientApi: httpPatientApi,
  │   │       queueApi: noopQueueApi,
  │   │       notificationService: noopNotificationService,
  │   │       auditService: noopAuditService,
  │   │       timerService: noopTimerService,
  │   │       workflowEngine: engine,
  │   │       eventBus,
  │   │     }
  │   │   })
  │   │
  │   └─ new SessionService(coordinator, doctorApi, consultationApi, patientApi, draftService)
  │
  └─ Phase 4: Initialization
      └─ sessionService.initializeSession(appointmentId, user.id)
            │
            ├─ Parallel: doctorApi.getAppointment(appointmentId)
            ├─ Parallel: doctorApi.getDoctorByUserId(userId)
            ├─ Parallel: consultationApi.loadConsultation(appointmentId)
            ├─ Parallel: patientApi.loadPatient(appointmentId.patientId)
            ├─ Parallel: patientApi.getPatientVitals(patientId, appointmentId)
            ├─ draftService.restoreDraft(appointmentId)
            ├─ coordinator.execute({ type: 'INITIALIZE_CONSULTATION' })
            └─ Returns: SessionInitializationResult
```

---

## 4. Factory Interface

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

interface ConsultationSessionConfig {
  readonly appointmentId: number;
  readonly user: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly role: string;
  };
}

interface ConsultationSessionServices {
  readonly sessionService: SessionService;
  readonly coordinator: WorkflowCoordinator;
  readonly workflowEngine: WorkflowEngine;
  readonly draftService: DraftService;
  readonly eventBus: InProcessWorkflowEventBus;
  readonly guardRegistry: DefaultGuardRegistry;
  readonly httpPatientApi: HttpPatientApi;
  readonly httpConsultationApi: HttpConsultationApi;
  readonly httpDoctorApi: HttpDoctorApi;
  readonly localStorageDraftStorage: LocalStorageDraftStorage;
}

interface ConsultationSessionResult {
  readonly services: ConsultationSessionServices;
  readonly initialSession: SessionData;
  readonly restoredDraft: boolean;
  readonly invalidationInstructions: InvalidationInstruction[];
}

export function createConsultationSession(
  config: ConsultationSessionConfig
): Promise<ConsultationSessionResult> {
  // Phase 1: Infrastructure
  const httpPatientApi = new HttpPatientApi();
  const httpConsultationApi = new HttpConsultationApi();
  const httpDoctorApi = new HttpDoctorApi();
  const localStorageDraftStorage = new LocalStorageDraftStorage();

  // Phase 2: Singletons
  const guardRegistry = new DefaultGuardRegistry();
  const noopQueueApi = createNoopQueueApi();
  const noopNotificationService = createNoopNotificationService();
  const noopAuditService = createNoopAuditService();

  // Phase 3: Application services
  const draftService = new DraftService(httpConsultationApi, localStorageDraftStorage);
  const eventBus = new InProcessWorkflowEventBus({ preserveOrder: true });

  const initialContext = buildInitialContext(config.appointmentId, config.user);
  const engine = new WorkflowEngine(
    ConsultationWorkflowState.IDLE,
    DocumentationWorkflowState.Document,
    initialContext,
    { registry: guardRegistry, shortCircuit: false }
  );

  const coordinator = createWorkflowCoordinator({
    dependencies: {
      draftService,
      patientApi: httpPatientApi,
      queueApi: noopQueueApi,
      notificationService: noopNotificationService,
      auditService: noopAuditService,
      timerService: createNoopTimerService(),
      workflowEngine: engine,
      eventBus,
    },
    context: initialContext,
  });

  const sessionService = new SessionService(
    coordinator,
    httpDoctorApi,
    httpConsultationApi,
    httpPatientApi,
    draftService
  );

  // Phase 4: Initialize
  const initResult = await sessionService.initializeSession(config.appointmentId, config.user.id);

  return {
    services: {
      sessionService,
      coordinator,
      workflowEngine: engine,
      draftService,
      eventBus,
      guardRegistry,
      httpPatientApi,
      httpConsultationApi,
      httpDoctorApi,
      localStorageDraftStorage,
    },
    initialSession: initResult.data.session,
    restoredDraft: initResult.data.restoredDraft,
    invalidationInstructions: initResult.data.invalidationInstructions,
  };
}
```

---

## 5. Ownership Boundaries

### What the Composition Root Owns

| Object | Ownership | Reason |
|--------|-----------|--------|
| All construction order | Composition Root | Centralized, explicit, auditable |
| Infrastructure adapter instantiation | Composition Root | Presentation must not know about adapters |
| Singleton lifecycle | Composition Root | Shared instances, constructed once |
| Application service graph wiring | Composition Root | Complete object graph created atomically |
| Initial session state computation | Composition Root | Server-side data fetching and state assembly |

### What the Application Layer Owns

| Object | Ownership | Reason |
|--------|-----------|--------|
| SessionService business logic | Application | Business orchestration |
| DraftService business logic | Application | Draft coordination |
| WorkflowCoordinator transitions | Application | Workflow orchestration |
| WorkflowEngine state machine | Application/Domain | Workflow evaluation |
| Guard registration | Domain | Workflow configuration |

### What the Presentation Layer Owns

| Object | Ownership | Reason |
|--------|-----------|--------|
| React state in SessionProvider | Presentation | UI state management |
| React state in DocumentationProvider | Presentation | UI state management |
| React state in PatientContextProvider | Presentation | UI state management |
| React state in all other providers | Presentation | UI state management |
| Dialog visibility | Presentation | UI state management |
| Timer display computation | Presentation | UI computation |
| Provider composition | Presentation | UI structure |

### What the Client Owns

| Object | Ownership | Reason |
|--------|-----------|--------|
| Local UI interactions | Client | Immediate feedback (sidebar collapse, etc.) |
| Optimistic updates | Client | Performance optimization |
| Auto-save debouncing | Client | Performance optimization |
| Server Action invocation | Client | Mutation triggering |
| Server Action result handling | Client | State update from server response |

---

## 6. Lifetime Summary

| Object | Lifetime | Correct? | Justification |
|--------|----------|----------|---------------|
| `HttpPatientApi` | Per request | ✅ | HTTP adapter, fresh per session |
| `HttpConsultationApi` | Per request | ✅ | HTTP adapter, fresh per session |
| `HttpDoctorApi` | Per request | ✅ | HTTP adapter, fresh per session |
| `LocalStorageDraftStorage` | Per request | ✅ | Server-side mirror, fresh per session |
| `DefaultGuardRegistry` | Singleton | ✅ | Static guard definitions |
| `NoopQueueApi` | Singleton | ✅ | Stateless no-op |
| `NoopNotificationService` | Singleton | ✅ | Stateless no-op |
| `NoopAuditService` | Singleton | ✅ | Stateless no-op |
| `DraftService` | Per request | ✅ | Per-session draft coordination |
| `InProcessWorkflowEventBus` | Per request | ✅ | Per-session event bus |
| `WorkflowEngine` | Per request | ✅ | Per-session state machine |
| `WorkflowCoordinator` | Per request | ✅ | Per-session orchestrator |
| `SessionService` | Per request | ✅ | Per-session service |
| `SessionData` | Serialized to client | ✅ | Initial state for hydration |
| `GuardContext` | Per request (transient) | ✅ | Mutable context during workflow execution |

---

## 7. Construction Validation

### Pre-conditions

1. `appointmentId` > 0
2. `user` is authenticated
3. User has DOCTOR role (or appropriate role)

### Post-conditions

1. All services constructed and wired correctly
2. `sessionService.initializeSession()` completes successfully
3. `SessionData` contains all required fields:
   - appointment (non-null)
   - patient (non-null)
   - vitals (nullable)
   - consultation (nullable)
   - doctorId (non-null)
   - workflowState (non-null)
   - notes (object)
   - outcomeType (nullable)
   - patientDecision (nullable)
4. If initialization fails, error is returned and no client renders

### Failure Handling

| Failure Point | Recovery |
|---------------|----------|
| Auth check fails | Render authentication required UI |
| Appointment not found | Render error state with retry |
| Patient not found | Render error state with retry |
| Doctor not found | Render error state with retry |
| Consultation load fails | Continue with null consultation |
| Draft restore fails | Continue with consultation notes |
| Workflow initialization fails | Render error state with retry |

---

## 8. Why This Composition Root Is Correct

### Single Responsibility
The Composition Root has exactly one job: wire the object graph. It does not contain business logic, UI logic, or presentation concerns.

### Explicit Dependencies
Every dependency is explicitly listed in the factory. There are no hidden imports or implicit dependencies.

### Testable
The factory can be tested independently. Each service can be mocked and injected for testing.

### No Circular Dependencies
The construction order (Infrastructure → Domain → Application → Presentation) respects the Clean Architecture dependency rule.

### Minimal Surface Area
The factory returns exactly what the Server Component needs. It does not expose unnecessary internal details.

### Server-Side Only
The factory imports Application, Domain, and Infrastructure modules. It is NEVER imported by client code.

---

## 9. Differences from Current Architecture

| Aspect | Current | New |
|--------|---------|-----|
| Where Composition Root lives | SessionProvider (Presentation client) | ConsultationSessionFactory (Infrastructure) |
| Who constructs services | SessionProvider via useMemo | ConsultationSessionFactory via explicit construction |
| Service lifetime | Per render (incorrectly memoized) | Per request (correctly scoped) |
| Initialization timing | Client useEffect | Server Component render |
| Error handling | Client useEffect + toast | Server Component error UI |
| Bundle impact | 12,374 LOC in client | ~4,650 LOC in client |
| Clean Architecture | Violated | Restored |

---

## 10. Conclusion

The Composition Root is a single, explicit, server-side factory that constructs the complete consultation session object graph in the correct order. It is the ONLY location in the codebase where Application, Domain, and Infrastructure services are constructed for the consultation room.

All other code (Server Components, Server Actions, Providers, UI Components) consumes the results of this Composition Root without constructing any services themselves.
