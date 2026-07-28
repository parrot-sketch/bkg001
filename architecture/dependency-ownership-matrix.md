# Dependency Ownership Matrix

## Purpose
Define ownership for every major dependency: who constructs it, who should own construction, and who consumes it.

---

## 1. Core Application Services

| Dependency | Constructed By | Correct Owner | Consumers | Construction Arguments |
|------------|---------------|---------------|-----------|------------------------|
| `SessionService` | SessionProvider (Presentation) | Application / Server Component | SessionProvider callbacks (useSession) | `coordinator`, `httpDoctorApi`, `httpConsultationApi`, `httpPatientApi`, `draftService` |
| `WorkflowCoordinator` | SessionProvider (Presentation) | Application / WorkflowCoordinatorFactory | SessionService | `dependencies` object containing DraftService, PatientApi, QueueApi, NotificationService, AuditService, TimerService, WorkflowEngine, EventBus |
| `WorkflowEngine` | SessionProvider (Presentation) | Application / WorkflowCoordinatorFactory | WorkflowCoordinator | `consultationState`, `documentationState`, `context`, `{ registry, shortCircuit }` |
| `DraftService` | SessionProvider (Presentation) | Application / Server Component | SessionProvider callbacks, DocumentationProvider | `consultationApi`, `draftStorage` |

### Ownership Chain

```
Server Component (Presentation Server Boundary) — COMPOSITION ROOT
  ├─ constructs: SessionService
  │   └─ receives: WorkflowCoordinator
  │       └─ receives: WorkflowEngine
  │           └─ receives: DefaultGuardRegistry
  ├─ constructs: DraftService
  │   └─ receives: HttpConsultationApi
  │       └─ receives: LocalStorageDraftStorage
  └─ passes: SessionService, DraftService, initialSession state to Client Shell
```

---

## 2. Domain Workflow Components

| Dependency | Constructed By | Correct Owner | Consumers | Construction Arguments |
|------------|---------------|---------------|-----------|------------------------|
| `DefaultGuardRegistry` | SessionProvider (Presentation) | Domain / WorkflowCoordinatorFactory | WorkflowEngine | none (registers all guards internally) |
| `GuardContext` | SessionProvider (Presentation) | Presentation (SessionProvider) | WorkflowEngine (via WorkflowCoordinator) | 18 fields: appointmentId, patientId, doctorId, consultationId, appointment, consultation, notes, outcomeType, patientDecision, isDirty, lastSavedAt, version, queue, user, retryCount, metadata, consultationWorkflowState, documentationWorkflowState, hasLocalDraft, localDraftTimestamp |

### Ownership Analysis

**DefaultGuardRegistry:**
- **Current:** Presentation (SessionProvider.tsx:212)
- **Correct:** Domain / WorkflowCoordinatorFactory (WorkflowCoordinatorFactory.ts:30 already does this correctly)
- **Consumers:** WorkflowEngine (via EngineContext)
- **Why Presentation is wrong:** Registry is a domain configuration object. It registers 76 guard functions. Presentation should not know about guard registration.

**GuardContext:**
- **Current:** Presentation (SessionProvider.tsx:215)
- **Correct:** Presentation (SessionProvider)
- **Consumers:** WorkflowEngine (via WorkflowCoordinator)
- **Why Presentation is correct:** GuardContext is a mutable state holder that changes for each command execution. It's presentation-level state.

---

## 3. Infrastructure Adapters

| Dependency | Constructed By | Correct Owner | Consumers | Construction Arguments |
|------------|---------------|---------------|-----------|------------------------|
| `HttpPatientApi` | SessionProvider (Presentation) | Infrastructure / Composition Root | SessionService | none |
| `HttpConsultationApi` | SessionProvider (Presentation) | Infrastructure / Composition Root | SessionService, DraftService | none |
| `HttpDoctorApi` | SessionProvider (Presentation) | Infrastructure / Composition Root | SessionService | none |
| `LocalStorageDraftStorage` | SessionProvider (Presentation) | Infrastructure / Composition Root | DraftService | none |

### Ownership Analysis

All four adapters are currently constructed in Presentation. They should be constructed in Infrastructure or at the Composition Root.

**Note:** These adapters have no construction dependencies, so they could be singletons or per-request instances with equal correctness.

---

## 4. Event Bus

| Dependency | Constructed By | Correct Owner | Consumers | Construction Arguments |
|------------|---------------|---------------|-----------|------------------------|
| `InProcessWorkflowEventBus` | SessionProvider (Presentation) | Application / WorkflowCoordinatorFactory | WorkflowCoordinator | `{ preserveOrder: true }` |

### Ownership Analysis

- **Current:** Presentation (SessionProvider.tsx:244)
- **Correct:** Application / WorkflowCoordinatorFactory (WorkflowCoordinatorFactory.ts:38 already does this correctly)
- **Consumers:** WorkflowCoordinator (via WorkflowCoordinatorDependencies)
- **Why Presentation is wrong:** Event bus is an application infrastructure concern. Presentation should not know about event bus configuration.

---

## 5. Noop Implementations

| Dependency | Constructed By | Correct Owner | Consumers | Construction Arguments |
|------------|---------------|---------------|-----------|------------------------|
| `NoopQueueApi` | SessionProvider (Presentation) | Infrastructure / Composition Root | WorkflowCoordinatorDependencies | none |
| `NoopNotificationService` | SessionProvider (Presentation) | Infrastructure / Composition Root | WorkflowCoordinatorDependencies | none |
| `NoopAuditService` | SessionProvider (Presentation) | Infrastructure / Composition Root | WorkflowCoordinatorDependencies | none |

### Ownership Analysis

These are stateless no-op implementations. They should be:
- Constructed at the Composition Root as singletons
- OR implemented as exported constants from a shared module

**Current:**
```typescript
// SessionProvider.tsx:80-98
function createNoopQueueApi(): QueueApi { return { ... } }
function createNoopNotificationService(): INotificationService { return { ... } }
function createNoopAuditService(): IAuditService { return { ... } }
```

**Correct pattern:**
```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY
// infrastructure/adapters/NoopClients.ts
export const noopQueueApi: QueueApi = { ... };
export const noopNotificationService: INotificationService = { ... };
export const noopAuditService: IAuditService = { ... };
```

---

## 6. Consumption Matrix

### Who Consumes What?

| Consumer | SessionService | WorkflowCoordinator | WorkflowEngine | DraftService | HttpPatientApi | HttpConsultationApi | HttpDoctorApi | DefaultGuardRegistry | EventBus | NoopQueueApi | NoopNotification | NoopAudit |
|----------|---------------|---------------------|----------------|--------------|----------------|---------------------|---------------|---------------------|----------|--------------|-----------------|-----------|
| SessionProvider callbacks | ✅ Uses | ✅ Via SessionService | ✅ Via SessionService | ✅ Direct use | ✅ Via SessionService | ✅ Via SessionService | ✅ Via SessionService | ❌ | ❌ | ❌ | ❌ | ❌ |
| SessionService | ❌ Owns | ✅ Owns | ✅ Via coordinator | ❌ | ✅ Owns | ✅ Owns | ✅ Owns | ❌ | ✅ Via coordinator | ❌ | ❌ | ❌ |
| WorkflowCoordinator | ❌ | ✅ Owns | ✅ Owns | ✅ Owns | ❌ | ❌ | ❌ | ❌ | ✅ Owns | ✅ Owns by wrapper | ✅ Owns by wrapper | ✅ Owns by wrapper |
| WorkflowEngine | ❌ | ❌ | ✅ Owns | ❌ | ❌ | ❌ | ❌ | ✅ Uses | ✅ Via context | ❌ | ❌ | ❌ |
| DraftService | ❌ | ❌ | ❌ | ✅ Owns | ❌ | ✅ Owns | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| SideEffectRegistry | ❌ | ❌ | ❌ | ❌ | ✅ Uses | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Key Finding: SessionProvider Is the Only Client of SessionService

```typescript
// SessionProvider.tsx:265-280
const sessionService = useMemo(
  () => new SessionService(coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService),
  [coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService]
);

// Later in SessionProvider: sessionService is used in callbacks passed via context
const value: SessionContextValue = {
  ...
  initializeSession: async () => { ... sessionService ... },
  startConsultation: async () => { ... sessionService ... },
  ...
};
```

**Implication:** SessionProvider is the ONLY consumer of the SessionService interface. If SessionProvider received SessionService as a prop, the bundle reduction would be total for SessionService and its entire dependency graph.

---

## 7. Dependency Flow Analysis

### Current (Incorrect) Flow

```
Presentation Layer
  │
  ├─ SessionProvider constructs:
  │   ├─ Infrastructure adapters (HttpPatientApi, etc.)
  │   ├─ Application services (SessionService, DraftService, WorkflowCoordinator)
  │   └─ Domain objects (WorkflowEngine, DefaultGuardRegistry)
  │
  └─ All forced into client bundle
```

### Correct Flow

```
Infrastructure Layer
  │
  └─ Adapters constructed here:
      ├─ HttpPatientApi
      ├─ HttpConsultationApi
      └─ HttpDoctorApi

Application Layer
  │
  └─ Services constructed here:
      ├─ DraftService (receives adapters from Infrastructure)
      ├─ WorkflowEngine (receives registry from Domain)
      ├─ WorkflowCoordinator (receives engine, eventBus, DraftService)
      └─ SessionService (receives coordinator, adapters)

Domain Layer
  │
  └─ Workflow components constructed here:
      ├─ DefaultGuardRegistry
      ├─ GuardContext (mutable state, acceptable in Presentation)

Server Component Boundary
  │
  └─ Composition Root:
      ├─ Constructs all services
      └─ Passes initial state to Client Shell

Client Shell
  │
  └─ SessionProvider receives:
      ├─ Session state (pre-computed by server)
      ├─ SessionService callbacks (via Server Actions)
      └─ No direct imports of Application/Domain modules
```

---

## 8. Ownership Violations Summary

| Layer | Currently Constructs | Should Construct | Violations |
|-------|---------------------|-----------------|------------|
| Domain | DefaultGuardRegistry | DefaultGuardRegistry | None (Correct via WorkflowCoordinatorFactory) — BUT SessionProvider bypasses this |
| Application | WorkflowEngine, WorkflowCoordinator | SessionService, DraftService | Partial (Factory exists but not used by Composition Root) |
| Infrastructure | — | HttpPatientApi, HttpConsultationApi, HttpDoctorApi, LocalStorageDraftStorage | Full violation (all constructed in Presentation) |
| Presentation | SessionService, WorkflowCoordinator, WorkflowEngine, DraftService, DefaultGuardRegistry, EventBus, Noop* | Nothing (state only) | Complete violation |

### The Core Problem

**The Composition Root does not exist.** Construction is distributed across SessionProvider.

The correct architecture would be:

```
Composition Root (NEW)
  │
  └─ ONE location that constructs:
      ├─ All infrastructure adapters
      ├─ All application services
      ├─ All domain workflows
      └─ Returns fully-wired object graph
```

Currently, SessionProvider IS the Composition Root, but it's in the wrong layer (Presentation client).

---

## 9. Constructor Dependency Graph

### Complete Dependency Graph

```
SessionService (Application)
  ├── WorkflowCoordinator (Application)
  │   ├── WorkflowEngine (Domain)
  │   │   └── DefaultGuardRegistry (Domain)
  │   ├── InProcessWorkflowEventBus (Application)
  │   ├── DraftService (Application)
  │   │   ├── HttpConsultationApi (Infrastructure)
  │   │   └── LocalStorageDraftStorage (Infrastructure)
  │   ├── HttpPatientApi (Infrastructure)
  │   ├── NoopQueueApi (Infrastructure)
  │   ├── NoopNotificationService (Infrastructure)
  │   ├── NoopAuditService (Infrastructure)
  │   └── TimerService (Infrastructure)
  ├── HttpDoctorApi (Infrastructure)
  ├── HttpConsultationApi (Infrastructure)
  ├── HttpPatientApi (Infrastructure)
  └── DraftService (Application)
      ├── HttpConsultationApi (Infrastructure)
      └── LocalStorageDraftStorage (Infrastructure)
```

### Inversion Points

**Where should construction invert from Presentation to Application?**

```
SessionProvider (Presentation)
  │
  ├─ Should NOT construct: HttpPatientApi, HttpConsultationApi, HttpDoctorApi
  │   └─ Correct: Infrastructure / Composition Root
  │
  ├─ Should NOT construct: DraftService
  │   └─ Correct: Application / Composition Root
  │
  ├─ Should NOT construct: DefaultGuardRegistry, WorkflowEngine, InProcessWorkflowEventBus
  │   └─ Correct: Application / WorkflowCoordinatorFactory
  │
  ├─ Should NOT construct: WorkflowCoordinator
  │   └─ Correct: Application / WorkflowCoordinatorFactory
  │
  └─ Should NOT construct: SessionService
      └─ Correct: Application / Composition Root
```

**Only two things SessionProvider should construct:**
1. `GuardContext` — mutable presentation state
2. React state holders — standard React pattern

---

## 10. Conclusion

**Every major dependency's ownership is incorrectly assigned.**

| Layer | Should Own | Currently Owns |
|-------|-----------|----------------|
| Domain | DefaultGuardRegistry | ❌ SessionProvider constructs it |
| Application | SessionService, WorkflowCoordinator, WorkflowEngine, DraftService | ❌ SessionProvider constructs them |
| Infrastructure | All HTTP adapters, DraftStorage | ❌ SessionProvider constructs them |
| Composition Root | All of the above | ❌ Does not exist |
| Presentation | Presentation state only | ⚠️ Also constructs everything above |

**The Composition Root is absent.** SessionProvider has absorbed all construction responsibilities, violating Clean Architecture's rule that inner layers should not be constructed by outer layers.

The fix requires establishing a Composition Root at the Server Component boundary. This is the smallest architectural correction that restores correct ownership across all layers.
