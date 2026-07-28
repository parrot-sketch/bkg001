# Application Layer Blueprint

## 1. Purpose

The Application Layer is the coordination boundary between the Presentation Layer (React components, hooks, contexts) and the Domain/Infrastructure layers. It contains:

- **Use Cases** — stateless orchestrators that coordinate a single business operation
- **Application Services** — stateful helpers that manage cross-cutting concerns (auto-save, heartbeat, queue filtering)
- **DTOs** — request/response types owned by the Application Layer
- **Mappers** — translate between Domain types and Application DTOs

The Application Layer has **no knowledge of React, Next.js, TanStack Query, or any UI framework**. It operates on plain TypeScript objects and async functions.

---

## 2. Directory Structure

```
application/
├── use-cases/
│   ├── consultation/
│   │   ├── InitializeSession.ts
│   │   ├── StartConsultation.ts
│   │   ├── ResumeConsultation.ts
│   │   ├── CompleteConsultation.ts
│   │   ├── SaveDraft.ts
│   │   ├── RestoreDraft.ts
│   │   ├── SwitchPatient.ts
│   │   ├── AdvanceQueue.ts
│   │   └── LoadPatientHistory.ts
│   ├── patient/
│   │   ├── LoadPatientProfile.ts
│   │   └── LoadPatientVitals.ts
│   └── queue/
│       ├── RefreshQueue.ts
│       └── FilterQueue.ts
├── services/
│   ├── DraftService.ts
│   ├── SessionService.ts
│   ├── QueueService.ts
│   ├── AuditService.ts
│   ├── NotificationService.ts
│   ├── BillingService.ts
│   └── TimerService.ts
├── commands/
│   ├── StartConsultationCommand.ts
│   ├── SaveDraftCommand.ts
│   ├── CompleteConsultationCommand.ts
│   ├── SwitchPatientCommand.ts
│   └── AdvanceQueueCommand.ts
├── queries/
│   ├── GetConsultationQuery.ts
│   ├── GetPatientProfileQuery.ts
│   ├── GetQueueQuery.ts
│   ├── GetPatientHistoryQuery.ts
│   └── GetVitalsQuery.ts
├── dto/
│   ├── consultation/
│   │   ├── InitializeSessionRequest.ts
│   │   ├── InitializeSessionResponse.ts
│   │   ├── SaveDraftRequest.ts
│   │   ├── SaveDraftResponse.ts
│   │   ├── CompleteConsultationRequest.ts
│   │   ├── CompleteConsultationResponse.ts
│   │   ├── SwitchPatientRequest.ts
│   │   └── AdvanceQueueRequest.ts
│   ├── patient/
│   │   ├── PatientProfileResponse.ts
│   │   └── PatientVitalsResponse.ts
│   └── queue/
│       ├── QueueFilterRequest.ts
│       └── QueueEntryResponse.ts
├── mappers/
│   ├── ConsultationMapper.ts
│   ├── PatientMapper.ts
│   ├── QueueMapper.ts
│   └── VitalsMapper.ts
├── orchestrators/
│   └── ConsultationOrchestrator.ts
└── index.ts
```

### 2.1 Justification for Commands/Queries Directories

CQRS is justified for the Consultation Module because:

1. **Write operations** (start, save, complete, switch) require validation, side effects, optimistic updates, and cache invalidation.
2. **Read operations** (load consultation, load patient, load queue) are pure fetches with no side effects.
3. The existing codebase already separates these concerns implicitly (e.g., `useConsultation` is a query, `useSaveConsultationDraft` is a mutation).
4. Separating Commands and Queries makes the Application Layer's intent explicit and prevents read operations from accidentally triggering mutations.

**However**, for Phase 2 implementation, a simpler flat `use-cases/` structure is acceptable. The `commands/` and `queries/` directories can be introduced when adding CQRS infrastructure (command bus, query bus) becomes necessary.

---

## 3. Dependency Rules

```
Presentation Layer
    ↓
    ├── use-cases/ (Commands + Queries)
    │       ↓
    ├── services/ (Application Services)
    │       ↓
    ├── ports/ (Domain interfaces)
    │       ↓
    ├── adapters/ (Infrastructure implementations)
    │       ↓
    ├── http-client/
    │       ↓
    └── backend
```

### 3.1 Allowed Dependencies

| Layer | May Depend On |
|-------|--------------|
| Presentation | use-cases, services, ports (rare), shared-kernel |
| Use Cases | services, ports, domain (entities, VOs, enums), shared-kernel |
| Application Services | ports, domain, shared-kernel |
| Commands | services, ports, domain, shared-kernel |
| Queries | ports, domain, shared-kernel |
| DTOs | domain (enums, VOs), shared-kernel |
| Mappers | domain, DTOs, shared-kernel |
| Ports (Domain interfaces) | shared-kernel only |
| Adapters (Infrastructure) | ports, http-client, shared-kernel, application DTOs (via mapper) |

### 3.2 Forbidden Dependencies

| Layer | Must NOT Depend On |
|-------|--------------------|
| Shared Kernel | Anything (leaf dependency) |
| Domain (interfaces) | Application, Presentation, Infrastructure |
| Ports | Infrastructure implementations |
| Use Cases | Other use cases (use services for orchestration) |
| Application Services | Infrastructure implementations |
| Adapters | Domain entities (must use DTOs from Application layer) |
| Presentation | Direct API clients (`apiClient`, `doctorApi`, etc.) |

### 3.3 The Critical Rule

**No layer may depend on a layer above it.**

The Application Layer is the bridge. It depends on Domain and Infrastructure. Presentation depends on Application. Domain depends only on Shared Kernel. Infrastructure depends on Domain interfaces and Shared Kernel.

---

## 4. DTO Ownership

### 4.1 What Belongs in Domain

- Pure business types (`Consultation`, `Draft`, `PatientSnapshot`)
- Value objects (`SOAPNote`, `VitalsSnapshot`, `AppointmentSlot`, `TimerDuration`, `NoteVersion`)
- Enums (`ConsultationState`, `AppointmentStatus`, `ConsultationOutcomeType`, `PatientDecision`, `SaveStatus`, `NoteTab`)
- State machines (`SessionWorkflow`, `DocumentationWorkflow`, `QueueWorkflow`)
- Policies (`CanStartConsultation`, `CanCompleteConsultation`, `RequiresCasePlanning`)
- Port result types (`ConsultationSuccess<T>`, `ConsultationFailure`, `ConsultationOutcome<T>`)
- Repository interfaces (`IConsultationRepository`, `IAppointmentRepository`)

### 4.2 What Belongs in Application

- Use case request/response DTOs
- Service interface contracts
- Mapper implementations (translate between Domain and Infrastructure types)
- Command/Query definitions (if CQRS is adopted)

### 4.3 What Belongs in Infrastructure

- API response types that mirror backend schemas
- HTTP-specific types (`ApiError`, `ApiResponse<T>`)
- Storage-specific types (`DraftRecord<T>`)
- Adapter implementations
- HTTP client configuration

### 4.4 Current DTO Ownership Issues

| Current Location | Should Move To | Reason |
|-----------------|----------------|--------|
| `application/dtos/PatientResponseDto` | Keep in Application | Correct — transport DTO for API responses |
| `application/dtos/AppointmentResponseDto` | Keep in Application | Correct |
| `application/dtos/ConsultationResponseDto` | Keep in Application | Correct |
| `domain/interfaces/services/QueueApi.ts` — `QueuePatient` | Move to `application/dto/queue/QueueEntryResponse.ts` | Contains API-shaped fields; pollutes Domain |
| `shared-kernel/interfaces/draft-storage.ts` — `DraftRecord<T>` | Keep in Shared Kernel | Cross-cutting contract used by multiple adapters |

---

## 5. CQRS Decision

**Decision: Adopt lightweight CQRS for the Application Layer.**

### 5.1 Commands (Write Operations)

Commands represent intent to change state. They are validated, authorized, and executed by the Application Layer.

| Command | Description |
|---------|-------------|
| `StartConsultationCommand` | Start a new consultation session |
| `SaveDraftCommand` | Save consultation notes (auto or manual) |
| `CompleteConsultationCommand` | Finalize a consultation |
| `SwitchPatientCommand` | Navigate to a different patient's session |
| `AdvanceQueueCommand` | Move to the next patient in queue |

### 5.2 Queries (Read Operations)

Queries represent requests for data. They have no side effects.

| Query | Description |
|-------|-------------|
| `GetConsultationQuery` | Load consultation by appointment ID |
| `GetPatientProfileQuery` | Load patient demographics |
| `GetPatientVitalsQuery` | Load patient vitals for appointment |
| `GetQueueQuery` | Load clinician's patient queue |
| `GetPatientHistoryQuery` | Load patient consultation history |

### 5.3 Why Lightweight CQRS

- Commands and Queries share the same ports and services — no separate read/write models.
- The separation is organizational: it makes it clear which operations mutate state vs. read state.
- React Query handles the actual caching and refetching; the Application Layer provides the data-fetching functions.
- This is not Event Sourcing. Commands do not produce events in the Event Store pattern. They produce side effects (API calls, cache invalidation, notifications).

---

## 6. Provider Mapping Preview

| Provider | Primary Service | Use Cases | Ports |
|----------|----------------|-----------|-------|
| SessionProvider | `SessionService` | InitializeSession, StartConsultation, ResumeConsultation, CompleteConsultation, SwitchPatient | ConsultationApi, PatientApi |
| DocumentationProvider | `DraftService` | SaveDraft, RestoreDraft | ConsultationApi, DraftStorage |
| PatientContextProvider | `PatientService` | LoadPatientProfile, LoadPatientVitals, LoadPatientHistory | PatientApi, ConsultationApi |
| QueueContextProvider | `QueueService` | RefreshQueue, FilterQueue, AdvanceQueue | QueueApi |
| TimerProvider | `TimerService` | (no dedicated use case — derives from SessionService) | (none — uses SessionService state) |
| BillingProvider | `BillingService` | (Phase 6 — requires BillingApi) | BillingApi |
| NotificationProvider | `NotificationService` | (Phase 7 — requires NotificationApi + event bus) | NotificationApi |

---

## 7. Implementation Sequence

### Phase 2 Prerequisite: Application Layer Scaffolding (2 weeks)

**Week 1: Skeleton + Commands**
1. Create `application/` directory structure
2. Implement `DraftService` (extract from ConsultationContext auto-save logic)
3. Implement `SessionService` (extract from ConsultationContext workflow + heartbeat)
4. Implement `QueueService` (extract from ConsultationContext queue filtering)
5. Create Commands: `StartConsultationCommand`, `SaveDraftCommand`, `CompleteConsultationCommand`, `SwitchPatientCommand`

**Week 2: Queries + Services**
6. Implement Queries: `GetConsultationQuery`, `GetPatientProfileQuery`, `GetQueueQuery`
7. Implement `AuditService` (event emission)
8. Implement `NotificationService` (toast orchestration)
9. Implement `TimerService` (session timing abstraction)
10. Write behavioral parity tests for all use cases against current ConsultationContext logic

### Phase 2: Provider Extraction (Weeks 3-8)

Each week extracts one provider by wrapping the corresponding use cases/services in a React Context.

---

## 8. Key Design Decisions

### 8.1 Why No `orchestrators/` Directory Initially

The `orchestrators/` directory is reserved for complex multi-service workflows (e.g., `ConsultationOrchestrator` coordinating `SessionService` + `DraftService` + `QueueService` + `NotificationService` during `CompleteConsultation`). For Phase 2, individual services are sufficient. Orchestrators are introduced in Phase 3 when documentation workflows require multi-service coordination.

### 8.2 Why Commands and Queries Are Files, Not Classes

The existing codebase uses class-based use cases (e.g., `StartConsultationUseCase`). The Application Layer follows this convention for consistency. Commands and Queries are plain functions that delegate to services, but they are organized into the `commands/` and `queries/` directories for clarity.

### 8.3 Why Application Services Are Stateful

Application Services manage long-lived concerns:
- `DraftService` — debouncing timers, draft state
- `SessionService` — heartbeat intervals, dirty tracking
- `QueueService` — queue filtering state, polling coordination

These are not stateless like use cases. They hold references to ports and manage lifecycle (start/stop intervals, clear timeouts).

---

## 9. Relationship to Existing Code

The existing `application/use-cases/` directory already contains backend use cases (e.g., `StartConsultationUseCase`, `SaveConsultationDraftUseCase`). These are **server-side** use cases that interact with repositories.

The new `application/use-cases/` structure defined here is for **frontend** use cases that interact with ports (API adapters, storage adapters). Both coexist:

- `application/use-cases/StartConsultationUseCase.ts` — backend, uses `IAppointmentRepository`
- `application/use-cases/consultation/StartConsultation.ts` — frontend, uses `ConsultationApi`

The naming convention distinguishes them: backend use cases use PascalCase class names, frontend use cases use PascalCase function names in a namespace directory.
