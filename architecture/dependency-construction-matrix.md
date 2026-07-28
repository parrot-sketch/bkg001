# Dependency Construction Matrix

## Purpose
Map every major dependency to its construction site, owner, and consumer.

---

## Matrix

| Dependency | Construction Site | Line | Constructor Arguments | Lifetime | Current Owner | Correct Owner | Consumers |
|------------|------------------|------|----------------------|----------|---------------|---------------|-----------|
| `HttpPatientApi` | SessionProvider.tsx | 201 | none | Per render | Presentation (SessionProvider) | Infrastructure / Composition Root | SessionService, SideEffectRegistry |
| `HttpConsultationApi` | SessionProvider.tsx | 202 | none | Per render | Presentation (SessionProvider) | Infrastructure / Composition Root | SessionService, DraftService |
| `HttpDoctorApi` | SessionProvider.tsx | 203 | none | Per render | Presentation (SessionProvider) | Infrastructure / Composition Root | SessionService |
| `LocalStorageDraftStorage` | SessionProvider.tsx | 204 | none | Per render | Presentation (SessionProvider) | Infrastructure / Composition Root | DraftService |
| `DraftService` | SessionProvider.tsx | 205 | `httpConsultationApi`, `localStorageDraftStorage` | Per render | Presentation (SessionProvider) | Application / Composition Root | SessionProvider, DocumentationProvider |
| `DefaultGuardRegistry` | SessionProvider.tsx | 212 | none | Per render | Presentation (SessionProvider) | Application / Composition Root | WorkflowEngine |
| `GuardContext` | SessionProvider.tsx | 215 | 18 fields | Per render | Presentation (SessionProvider) | Application / SessionProvider | WorkflowEngine |
| `WorkflowEngine` | SessionProvider.tsx | 237 | `state`, `state`, `context`, `{ registry, shortCircuit }` | Per render | Presentation (SessionProvider) | Application / Composition Root | WorkflowCoordinator |
| `InProcessWorkflowEventBus` | SessionProvider.tsx | 244 | `{ preserveOrder: true }` | Per render | Presentation (SessionProvider) | Application / Composition Root | WorkflowCoordinator |
| `WorkflowCoordinator` | SessionProvider.tsx | 245 | `{ dependencies: { ... } }` | Per render | Presentation (SessionProvider) | Application / Composition Root | SessionService |
| `SessionService` | SessionProvider.tsx | 266 | `coordinator`, `httpDoctorApi`, `httpConsultationApi`, `httpPatientApi`, `draftService` | Per render | Presentation (SessionProvider) | Application / Server Action | SessionProvider callbacks |
| `NoopQueueApi` | SessionProvider.tsx | 249 | none | Per render | Presentation (SessionProvider) | Infrastructure / Composition Root | WorkflowCoordinatorDependencies |
| `NoopNotificationService` | SessionProvider.tsx | 250 | none | Per render | Presentation (SessionProvider) | Infrastructure / Composition Root | WorkflowCoordinatorDependencies |
| `NoopAuditService` | SessionProvider.tsx | 251 | none | Per render | Presentation (SessionProvider) | Infrastructure / Composition Root | WorkflowCoordinatorDependencies |

---

## Construction Chain

### Current (Incorrect)

```
SessionProvider (Presentation)
  ├─ new HttpPatientApi() (Infrastructure)
  ├─ new HttpConsultationApi() (Infrastructure)
  ├─ new HttpDoctorApi() (Infrastructure)
  ├─ new LocalStorageDraftStorage() (Infrastructure)
  ├─ new DraftService() (Application)
  │   └─ depends on: HttpConsultationApi, LocalStorageDraftStorage
  ├─ new DefaultGuardRegistry() (Domain)
  ├─ new WorkflowEngine() (Domain)
  │   └─ depends on: DefaultGuardRegistry, GuardContext
  ├─ new InProcessWorkflowEventBus() (Application)
  ├─ createWorkflowCoordinator() (Application)
  │   └─ depends on: WorkflowEngine, EventBus, DraftService, HttpPatientApi, NoopQueueApi, NoopNotificationService, NoopAuditService
  └─ new SessionService() (Application)
      └─ depends on: WorkflowCoordinator, HttpDoctorApi, HttpConsultationApi, HttpPatientApi, DraftService
```

### Correct (Proposed)

```
Server Component (Presentation Server Boundary)
  ├─ new HttpPatientApi() (Infrastructure)
  ├─ new HttpConsultationApi() (Infrastructure)
  ├─ new HttpDoctorApi() (Infrastructure)
  ├─ new LocalStorageDraftStorage() (Infrastructure)
  ├─ new DraftService() (Application)
  ├─ new DefaultGuardRegistry() (Domain)
  ├─ new WorkflowEngine() (Domain)
  ├─ new InProcessWorkflowEventBus() (Application)
  ├─ createWorkflowCoordinator() (Application)
  └─ new SessionService() (Application)
  ↓
  Passes { session, docs, queue, dialogs } as props to ConsultationRoomClient
  ↓
Client Shell (Presentation)
  ├─ SessionProvider (receives initial state)
  ├─ DocumentationProvider (receives initial notes)
  ├─ PatientContextProvider (receives initial patient)
  ├─ QueueContextProvider
  ├─ TimerContextProvider
  └─ DialogProvider
```

---

## Summary

- **Total construction sites in production:** 14 (all in SessionProvider.tsx)
- **Correct construction sites:** 0 in Presentation layer
- **Client bundle impact:** All 14 constructions force Application/Domain modules into client bundle
- **Fix:** Move all constructions to Server Component boundary
