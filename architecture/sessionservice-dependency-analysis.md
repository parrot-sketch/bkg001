# SessionService Dependency Analysis

## Purpose

This document defines every dependency of SessionService, justifies its classification, and produces the complete dependency graph.

---

## 1. Dependency Inventory

### 1.1 Application Layer Dependencies

| Dependency | Type | Classification | Justification |
|------------|------|----------------|---------------|
| `WorkflowCoordinator` | Application Orchestrator | **REQUIRED** | SessionService must issue workflow commands for every session lifecycle event. The coordinator is the only path to WorkflowEngine. |
| `WorkflowCoordinatorFactory` | Application Factory | **REQUIRED** | SessionService needs a configured coordinator. The factory encapsulates WorkflowEngine, GuardEngine, Dispatcher, and EventBus construction. |
| `WorkflowCommand` | Domain Type | **REQUIRED** | SessionService constructs commands to pass to the coordinator. |
| `WorkflowCoordinatorResult` | Application Type | **REQUIRED** | SessionService consumes coordinator results and maps them to `SessionResult<T>`. |
| `ConsultationApi` | Domain Port | **REQUIRED** | SessionService calls `loadConsultation()` and `saveConsultationDraft()` via the consultation API port. |
| `DoctorApi` | Domain Port | **REQUIRED** | SessionService calls `startConsultation()`, `completeConsultation()`, `getAppointment()`, `getDoctorByUserId()`, `getPatient()` via the doctor API port. |
| `PatientApi` | Domain Port | **REQUIRED** | SessionService calls `getPatient()` and vitals endpoints via the patient API port. |
| `DraftService` | Application Service | **REQUIRED** | SessionService delegates draft save/restore/discard to DraftService during session switching and completion. |
| `DraftStorage` | Shared Kernel Port | **REQUIRED** | SessionService needs DraftStorage to compare local draft timestamps with server timestamps during initialization. |
| `ClinicalErrorCode` | Shared Kernel | **REQUIRED** | SessionService maps infrastructure failures to clinical error codes. |
| `ClinicalError` | Shared Kernel | **REQUIRED** | SessionService returns typed errors in `SessionResult`. |
| `SessionErrorCode` | Shared Kernel (new) | **REQUIRED** | SessionService-specific error codes for session lifecycle failures. |
| `StructuredNotes` | Shared Kernel Type | **REQUIRED** | SessionService passes notes to DraftService and consumes hydrated notes from API responses. |
| `generateFullText` | Shared Kernel Utility | **REQUIRED** | SessionService serializes structured notes to full-text for API calls. |
| `parseLegacyNotes` | Shared Kernel Utility | **REQUIRED** | SessionService parses legacy full-text notes back to structured format during hydration. |

### 1.2 Optional Dependencies

| Dependency | Type | Classification | Justification | Fallback |
|------------|------|----------------|---------------|----------|
| `WorkflowEventBus` | Domain Service | **OPTIONAL** | SessionService can emit audit events for session lifecycle milestones. If absent, events are silently dropped (coordinator handles this). | Coordinator already handles event publication. |
| `NotificationService` | Application Service | **OPTIONAL** | SessionService can request toast notifications for start/complete/failure. If absent, Presentation handles all UI feedback. | Presentation Layer always handles toast display. |
| `AuditService` | Application Service | **OPTIONAL** | SessionService can log clinical actions for compliance. If absent, no audit trail for SessionService actions (WorkflowEventBus still logs transitions). | WorkflowEventBus provides transition audit. |

### 1.3 Forbidden Dependencies

| Dependency | Reason Forbidden |
|------------|------------------|
| React / JSX / hooks | G-001: No React in Application Layer |
| `react-query` / `useQuery` / `useMutation` | G-001: No React in Application Layer |
| `next/navigation` (`useRouter`) | G-001: No React in Application Layer |
| `sonner` / `toast` | G-001: No UI framework in Application Layer |
| `localStorage` directly | INV-007: LocalStorage access must flow through DraftStorage port |
| `apiClient` directly | INV-013: Ports must not depend on adapters; SessionService depends on ports only |
| `ConsultationContext` | G-013: No direct provider imports; Presentation consumes Application, not vice versa |
| `WorkflowEngine` directly | SessionService must not bypass WorkflowCoordinator |
| `WorkflowGuardEngine` directly | Guard logic is coordinator's responsibility |
| `SideEffectDispatcher` directly | Side effects are coordinator's responsibility |
| `WorkflowEventBus` directly (as required) | Events are coordinator's responsibility |

---

## 2. Dependency Graph

### 2.1 SessionService Internal Graph

```
SessionService
    ├── REQUIRED:
    │   ├── WorkflowCoordinator
    │   │     └── WorkflowEngine
    │   │           ├── WorkflowGuardEngine
    │   │           ├── SideEffectDispatcher
    │   │           └── WorkflowEventBus
    │   ├── WorkflowCoordinatorFactory
    │   ├── ConsultationApi (port)
    │   ├── DoctorApi (port)
    │   ├── PatientApi (port)
    │   ├── DraftService
    │   │     └── ConsultationApi (port)
    │   │     └── DraftStorage (port)
    │   ├── ClinicalErrorCode
    │   ├── ClinicalError
    │   ├── StructuredNotes
    │   ├── generateFullText
    │   └── parseLegacyNotes
    │
    ├── OPTIONAL:
    │   ├── WorkflowEventBus
    │   ├── NotificationService
    │   └── AuditService
    │
    └── FORBIDDEN:
        ├── React
        ├── react-query
        ├── next/navigation
        ├── sonner/toast
        ├── localStorage (direct)
        ├── apiClient (direct)
        ├── ConsultationContext
        ├── WorkflowEngine (direct)
        ├── WorkflowGuardEngine (direct)
        ├── SideEffectDispatcher (direct)
        └── WorkflowEventBus (as required)
```

### 2.2 Layer Dependency Graph

```
Presentation Layer
    │
    ├── SessionProvider (future)
    │     └── SessionService  ← NEW
    │           │
    │           ├── WorkflowCoordinator
    │           │     └── WorkflowEngine
    │           │           ├── WorkflowGuardEngine
    │           │           ├── SideEffectDispatcher
    │           │           └── WorkflowEventBus
    │           │
    │           ├── ConsultationApi (port)
    │           │     └── HttpConsultationApi (adapter, infra)
    │           │
    │           ├── DoctorApi (port)
    │           │     └── HttpDoctorApi (adapter, infra)
    │           │
    │           ├── PatientApi (port)
    │           │     └── HttpPatientApi (adapter, infra)
    │           │
    │           ├── DraftService
    │           │     ├── ConsultationApi (port)
    │           │     └── DraftStorage (port)
    │           │           └── LocalStorageDraftStorage (adapter, infra)
    │           │
    │           └── [Shared Kernel]
    │
    ├── DraftService (existing)
    │
    └── ConsultationContext (existing, shrinking)
```

### 2.3 Cross-Service Dependencies

| Service | Depends On | Depended On By |
|---------|------------|----------------|
| SessionService | DraftService, WorkflowCoordinator, ConsultationApi, DoctorApi, PatientApi | SessionProvider (future), ConsultationWorkflowShim (interim) |
| DraftService | ConsultationApi, DraftStorage | SessionService, DocumentationProvider (future) |
| WorkflowCoordinator | WorkflowEngine, SideEffectDispatcher, WorkflowEventBus | SessionService, ConsultationWorkflowShim |

---

## 3. Constructor Signature

### 3.1 Required Dependencies

```typescript
export class SessionService {
  constructor(
    private readonly coordinator: WorkflowCoordinator,
    private readonly coordinatorFactory: WorkflowCoordinatorFactory,
    private readonly consultationApi: ConsultationApi,
    private readonly doctorApi: DoctorApi,
    private readonly patientApi: PatientApi,
    private readonly draftService: DraftService,
    private readonly draftStorage: DraftStorage<StructuredNotes>,
  ) {}
}
```

### 3.2 Optional Dependencies

```typescript
export class SessionService {
  constructor(
    // ... required dependencies ...
    private readonly eventBus?: WorkflowEventBus,
    private readonly notificationService?: NotificationService,
    private readonly auditService?: AuditService,
  ) {}
}
```

### 3.3 Construction Site

```typescript
// In SessionProvider or composition root:
const sessionService = new SessionService(
  coordinatorFactory.create(),
  coordinatorFactory,
  consultationApi,
  doctorApi,
  patientApi,
  draftService,
  draftStorage,
  eventBus,       // optional
  notificationService, // optional
  auditService,   // optional
);
```

---

## 4. Port Definitions Needed

### 4.1 DoctorApi (already exists)

```typescript
// domain/interfaces/services/DoctorApi.ts
export interface DoctorApi {
  getAppointment(appointmentId: number): Promise<ConsultationOutcome<AppointmentResponse>>;
  getDoctorByUserId(userId: string): Promise<ConsultationOutcome<DoctorResponse>>;
  getPatient(patientId: string): Promise<ConsultationOutcome<PatientResponse>>;
  getPatientVitals(patientId: string, appointmentId: number): Promise<ConsultationOutcome<VitalsResponse[]>>;
  startConsultation(dto: StartConsultationDto): Promise<ConsultationOutcome<AppointmentResponse>>;
  completeConsultation(dto: CompleteConsultationDto): Promise<ConsultationOutcome<AppointmentResponse>>;
  checkInPatient(appointmentId: number, userId: string): Promise<ConsultationOutcome<AppointmentResponse>>;
}
```

### 4.2 PatientApi (already exists or needs creation)

```typescript
// domain/interfaces/services/PatientApi.ts
export interface PatientApi {
  getPatient(patientId: string): Promise<ConsultationOutcome<PatientResponse>>;
  getPatientVitals(patientId: string, appointmentId: number): Promise<ConsultationOutcome<VitalsResponse[]>>;
}
```

### 4.3 DraftStorage (already exists in Shared Kernel)

```typescript
// shared-kernel/interfaces/draft-storage.ts
export interface DraftStorage<T> {
  saveDraft(key: string, data: T): Promise<StorageResult>;
  loadDraft(key: string): Promise<StorageResult<T>>;
  removeDraft(key: string): Promise<void>;
}
```

---

## 5. Dependency Classification Rationale

### 5.1 Why WorkflowCoordinator is REQUIRED

Every session lifecycle event is a workflow state transition. SessionService must not bypass the WorkflowEngine. The coordinator is the only validated path.

### 5.2 Why DraftService is REQUIRED

SessionService must save dirty drafts before switching patients and discard drafts after completion. DraftService is the single owner of draft lifecycle. SessionService delegates, never duplicates.

### 5.3 Why WorkflowEventBus is OPTIONAL

SessionService itself does not need to publish events — the WorkflowCoordinator already publishes events for every transition. SessionService may emit additional lifecycle events (e.g., "session loaded"), but these are non-critical. If the event bus is unavailable, the session continues.

### 5.4 Why NotificationService is OPTIONAL

Toasts are a Presentation concern. SessionService returns results; Presentation shows feedback. NotificationService is a convenience, not a dependency.

### 5.5 Why AuditService is OPTIONAL

Audit is a cross-cutting concern. WorkflowEventBus already provides transition audit. SessionService lifecycle audit is nice-to-have, not required for correctness.

---

## 6. Dependency Stability

| Dependency | Stability | Reasoning |
|------------|-----------|-----------|
| WorkflowCoordinator | HIGH | Certified in PR-A04-06a; interface is stable |
| WorkflowCoordinatorFactory | HIGH | Factory pattern; stable constructor |
| ConsultationApi | HIGH | Port interface; already defined |
| DoctorApi | HIGH | Port interface; already defined |
| PatientApi | HIGH | Port interface; needs creation but trivial |
| DraftService | HIGH | Already extracted and tested |
| DraftStorage | HIGH | Shared Kernel port; stable |
| ClinicalErrorCode | HIGH | Shared Kernel enum; stable |
| ClinicalError | HIGH | Shared Kernel type; stable |
| StructuredNotes | HIGH | Shared Kernel type; stable |
| generateFullText | HIGH | Shared Kernel utility; stable |
| parseLegacyNotes | HIGH | Shared Kernel utility; stable |
| WorkflowEventBus | MEDIUM | Domain service; interface may evolve |
| NotificationService | MEDIUM | Application service; not yet implemented |
| AuditService | LOW | Not yet implemented; interface unknown |

---

## 7. Circular Dependency Check

```
SessionService
    ├── WorkflowCoordinator → WorkflowEngine → WorkflowGuardEngine → (none)
    │                         └── SideEffectDispatcher → (none)
    │                         └── WorkflowEventBus → (none)
    ├── ConsultationApi (port) → (no deps on SessionService)
    ├── DoctorApi (port) → (no deps on SessionService)
    ├── PatientApi (port) → (no deps on SessionService)
    ├── DraftService → ConsultationApi (port) → (no deps on SessionService)
    │               └── DraftStorage (port) → (no deps on SessionService)
    └── Shared Kernel → (no deps on SessionService)
```

**Result: Zero circular dependencies.**

---

## 8. Testability

| Dependency | Test Strategy |
|------------|---------------|
| WorkflowCoordinator | Mock with `execute: vi.fn()` returning typed results |
| ConsultationApi | Mock with `loadConsultation: vi.fn()` returning `SessionResult` |
| DoctorApi | Mock with `startConsultation: vi.fn()` etc. |
| PatientApi | Mock with `getPatient: vi.fn()` |
| DraftService | Mock with `saveDraft: vi.fn()`, `restoreDraft: vi.fn()` |
| DraftStorage | Mock with `saveDraft: vi.fn()`, `loadDraft: vi.fn()`, `removeDraft: vi.fn()` |
| WorkflowEventBus | Optional mock; absence should not affect test |
| NotificationService | Optional mock; absence should not affect test |
| AuditService | Optional mock; absence should not affect test |

All dependencies are injectable via constructor, enabling full unit test isolation.
