# Consultation Module — Layered Architecture

## 1. Layer Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                                │
│                                                                             │
│  Pages                     Components              Layouts                 │
│  ├── SessionPage           ├── Sidebar             ├── ShellLayout         │
│  ├── DetailPage            ├── Workspace           └── AuthGate            │
│  │                         ├── QueuePanel                                      │
│  │                         ├── Header                                         │
│  │                         ├── Dialogs                                        │
│  │                         └── Extensions                                     │
│  │                                                                           │
│  Presentation Hooks       Presentational Providers                           │
│  ├── useTimer             ├── useSidebar                                     │
│  ├── useActiveTab         ├── useTheme                                       │
│  └── useBreakpoint        └── useResponsiveLayout                            │
│                                                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                    FRONTEND APPLICATION LAYER                              │
│                                                                             │
│  Use Cases                    Application Services                          │
│  ├── InitializeSession        ├── DraftService                               │
│  ├── StartConsultation        ├── SessionService                              │
│  ├── ResumeConsultation       ├── QueueService                                │
│  ├── CompleteConsultation     ├── AuditService                                │
│  ├── SaveDraft                └── NotificationService                         │
│  ├── RestoreDraft                                                          │
│  ├── SwitchPatient                                                         │
│  ├── AdvanceQueue                                                           │
│  └── LoadPatientHistory                                                    │
│                                                                             │
│  Orchestration Providers                                                     │
│  ├── SessionProvider                                                        │
│  ├── DocumentationProvider                                                  │
│  ├── PatientContextProvider                                                 │
│  ├── QueueContextProvider                                                   │
│  ├── TimerProvider                                                          │
│  ├── BillingProvider                                                        │
│  └── NotificationProvider                                                   │
│                                                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                        DOMAIN LAYER (Frontend)                              │
│                                                                             │
│  Entities                     Value Objects                                  │
│  ├── Consultation             ├── SOAPNote                                    │
│  ├── Draft                    ├── VitalsSnapshot                              │
│  └── PatientSnapshot          ├── AppointmentSlot                             │
│                               ├── TimerDuration                               │
│  Enums                        └── NoteVersion                                 │
│  ├── ConsultationState                                                    │
│  ├── WorkflowState                                                        │
│  ├── OutcomeType                                                          │
│  ├── PatientDecision                                                      │
│  └── SaveStatus                                                           │
│                                                                             │
│  State Machines              Policies                                       │
│  ├── SessionWorkflow         ├── CanStartConsultation                        │
│  ├── DocumentationWorkflow   ├── CanCompleteConsultation                     │
│  └── QueueWorkflow           └── RequiresCasePlanning                        │
│                                                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE LAYER                                    │
│                                                                             │
│  API Adapters                Storage Adapters                               │
│  ├── ConsultationApi         ├── DraftStorage                                │
│  ├── PatientApi              │   ├── LocalStorageAdapter                     │
│  ├── QueueApi                │   └── IndexedDBAdapter                        │
│  ├── BillingApi              └── SessionStorage                              │
│  ├── NotificationApi                                                     │
│  └── AuditApi                                                            │
│                                                                             │
│  Cache Adapters             External Service Adapters                       │
│  ├── QueryClientProvider    ├── AuthAdapter                                  │
│  ├── OptimisticCache        ├── WebSocketAdapter                             │
│  └── QueryPersistence       ├── VoiceDictationAdapter                       │
│                             ├── AIServiceAdapter                             │
│                             └── ImagingAdapter                               │
│                                                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                          SHARED KERNEL                                      │
│                                                                             │
│  Types                     Constants                    Validation          │
│  ├── PatientId             ├── BRAND_TOKENS            ├── noteSchema       │
│  ├── AppointmentId         ├── SPACING_SCALE           ├── outcomeSchema    │
│  ├── ConsultationId        ├── TYPOGRAPHY_SCALE        └── vitalsSchema     │
│  ├── DoctorId              └── BREAKPOINTS                                      │
│  └── Timestamp                                                                 │
│                                                                             │
│  Errors                                                                      │
│  ├── ClinicalErrorCode                                                       │
│  ├── AuthorizationErrorCode                                                  │
│  └── ConflictErrorCode                                                       │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Presentation Layer

### 2.1 Responsibilities
- Render UI from state
- Handle user input events
- Dispatch actions to Application Layer
- Display data from providers
- Responsive layout and accessibility

### 2.2 Allowed Dependencies
- Shared Kernel (types, constants, brand tokens)
- Application Layer providers (via React Context)
- Frontend Application Layer use cases (rare, for complex orchestration)
- Infrastructure Layer (only for adaptive hooks that bridge to providers)

### 2.3 Forbidden Dependencies
- Direct API calls (`apiClient`, `doctorApi`, etc.)
- Domain entities (consume DTOs from providers instead)
- Business logic (validation, state transitions)
- Storage adapters (use providers)

### 2.4 Typical Artifacts

**Pages:**
- `SessionPage` — orchestrates shell, providers, lazy capabilities
- `DetailPage` — read-only consultation view

**Components (atomic design):**
- `Atoms`: `Button`, `Badge`, `Skeleton`, `Avatar`, `Icon`
- `Molecules`: `PatientHeader`, `SaveIndicator`, `StatusBadge`, `TimerDisplay`
- `Organisms`: `PatientSidebar`, `SOAPWorkspace`, `QueuePanel`, `CompletionDialog`
- `Templates`: `ThreeColumnShell`, `FullScreenDialog`
- `Pages`: `SessionPage`, `DetailPage`

**Layouts:**
- `ShellLayout` — sidebar, header, main content area
- `AuthGate` — authentication wrapper

**Presentation Hooks:**
- `useTimer` — derives timer display from TimerProvider
- `useActiveTab` — derives active tab from DocumentationProvider
- `useBreakpoint` — responsive layout logic

---

## 3. Frontend Application Layer

### 3.1 Responsibilities
- Orchestrate use cases (coordinate multiple operations)
- Manage provider state and side effects
- Bridge Presentation Layer events to Domain Layer logic
- Coordinate cross-context communication
- Handle auto-save, heartbeat, and background tasks

### 3.2 Allowed Dependencies
- Domain Layer (entities, value objects, enums, workflows, policies)
- Infrastructure Layer (API adapters, storage adapters)
- Shared Kernel

### 3.3 Forbidden Dependencies
- Presentation Layer components (no JSX in use cases)
- Direct DOM manipulation
- Framework-specific patterns buried in providers

### 3.4 Typical Artifacts

**Use Cases (stateless orchestrators):**
```
InitializeSession
  - Input: { appointmentId: number }
  - Output: { session: ConsultationSession, patient: Patient, workflowState: WorkflowState }
  - Dependencies: SessionService, PatientContext, ConsultationApi
  - Side effects: None (pure orchestration)

StartConsultation
  - Input: { appointmentId: number, doctorNotes?: string }
  - Output: { appointment: Appointment, consultation: Consultation }
  - Dependencies: SessionService, StartConsultationApi
  - Side effects: POST /start, cache invalidation, audit event

SaveDraft
  - Input: { notes: SOAPNote, outcome?: OutcomeType, decision?: PatientDecision }
  - Output: { saveStatus: SaveStatus, version: string }
  - Dependencies: DraftService, ConsultationApi, DraftStorage
  - Side effects: PUT /draft, localStorage backup

CompleteConsultation
  - Input: { outcome: OutcomeType, decision?: PatientDecision, billingItems?: BillingItem[] }
  - Output: { appointment: Appointment, consultation: Consultation }
  - Dependencies: SessionService, CompleteConsultationApi, QueueService
  - Side effects: POST /complete, cache invalidation, routing, localStorage clear

SwitchPatient
  - Input: { appointmentId: number }
  - Output: void
  - Dependencies: SessionService, DraftService, QueueService
  - Side effects: save draft, navigate

LoadPatientHistory
  - Input: { patientId: string, limit?: number }
  - Output: { history: ConsultationHistoryItem[] }
  - Dependencies: PatientContext, ConsultationHistoryApi
  - Side effects: GET /patients/:id/consultations
```

**Application Services (stateful helpers):**
```
DraftService
  - Debounced auto-save (3s)
  - Manual save trigger
  - Version conflict detection
  - localStorage backup
  - Draft restoration

SessionService
  - Heartbeat interval (30s)
  - Session timeout tracking
  - Dirty state check before navigation
  - beforeunload warning

QueueService
  - Queue filtering (exclude current, by status)
  - Next patient routing logic
  - Polling coordination

AuditService
  - Event emission
  - Correlation ID generation
  - Event batching
```

**Providers (state containers):**
Each provider owns a slice of state and exposes:
- State snapshot (read)
- Actions (write)
- Derived values (computed)
- Event subscriptions (reactive)

```
SessionProvider
  State: appointment, patient, consultation, workflowState, loadingState
  Actions: initialize, start, resume, complete, switch, reset
  Derived: isActive, isReadOnly, canStart, canComplete

DocumentationProvider
  State: notes, outcomeType, patientDecision, saveStatus, dirtyFields
  Actions: updateNote, setOutcome, setDecision, saveDraft, restoreDraft
  Derived: canSave, hasDraft, requiresCasePlanning

QueueProvider
  State: todayAppointments, waitingQueue, isCollapsed, switchingState
  Actions: refresh, switchToPatient, collapse, expand
  Derived: queueLength, nextPatient, has waitingPatients
```

---

## 4. Domain Layer (Frontend)

### 4.1 Responsibilities
- Define clinical and UI domain concepts
- Enforce business rules through entity methods
- Define valid state transitions through state machines
- Provide validation policies
- Remain framework-agnostic

### 4.2 Allowed Dependencies
- Shared Kernel only

### 4.3 Forbidden Dependencies
- Any I/O (API, storage, DOM)
- Any framework (React, Next.js, TanStack Query)
- Any mutable global state

### 4.4 Typical Artifacts

**Entities:**
```
Consultation
  - id, appointmentId, doctorId, state, notes, outcome, decision
  - start(userId): Consultation
  - complete(): Consultation
  - updateNotes(notes): Consultation
  - isActive(): boolean
  - isCompleted(): boolean

SOAPNote
  - subjective, objective, assessment, plan
  - merge(other: SOAPNote): SOAPNote
  - toFullText(): string
  - isEmpty(): boolean

Draft
  - id, appointmentId, version, notes, savedAt, source
  - incrementVersion(): Draft
  - isNewerThan(timestamp): boolean
  - toSavePayload(): DraftSavePayload
```

**Value Objects:**
```
VitalsSnapshot
  - temperature, bloodPressure, heartRate, respiratoryRate, oxygenSaturation
  - isAbnormal(): boolean
  - warnFlags(): Warning[]

AppointmentSlot
  - startTime, durationMinutes, endTime
  - overlaps(other: AppointmentSlot): boolean
  - contains(time: Timestamp): boolean

TimerDuration
  - elapsedSeconds, remainingSeconds
  - format(): string
  - isOverdue(): boolean
```

**State Machines:**
```
SessionWorkflow
  States: IDLE, LOADING, READY, ACTIVE, COMPLETING, TRANSITIONING, ERROR
  Transitions:
    LOAD: IDLE → LOADING
    LOAD_SUCCESS: LOADING → READY | ACTIVE
    LOAD_FAILURE: LOADING → ERROR
    START: READY → ACTIVE
    RESUME: READY → ACTIVE
    COMPLETE: ACTIVE → COMPLETING
    COMPLETE_SUCCESS: COMPLETING → TRANSITIONING
    COMPLETE_FAILURE: COMPLETING → ACTIVE
    RESET: * → IDLE
    RETRY: ERROR → LOADING
```

**Policies:**
```
CanStartConsultation
  - check(appointmentStatus, doctorAssigned): boolean

CanCompleteConsultation
  - check(consultationState, outcomeSet, decisionSet): boolean

RequiresCasePlanning
  - check(outcomeType, patientDecision): boolean
```

---

## 5. Infrastructure Layer

### 5.1 Responsibilities
- Provide concrete implementations of interfaces defined in upper layers
- Handle all I/O (HTTP, storage, WebSocket, external services)
- Translate between domain types and external formats
- Handle retries, caching, and error normalization

### 5.2 Allowed Dependencies
- Domain Layer (entities, value objects, enums, interface definitions)
- Shared Kernel
- External libraries (axios, Prisma, react-query, etc.)

### 5.3 Forbidden Dependencies
- Presentation Layer
- Business logic
- UI concerns

### 5.4 Typical Artifacts

**API Adapters:**
```
ConsultationApi
  - getConsultation(appointmentId): Promise<ConsultationResponseDto>
  - saveDraft(appointmentId, payload): Promise<ConsultationResponseDto>
  - completeConsultation(appointmentId, payload): Promise<AppointmentResponseDto>
  - startConsultation(appointmentId, payload): Promise<AppointmentResponseDto>

PatientApi
  - getPatient(patientId): Promise<PatientResponseDto>
  - getVitals(patientId, appointmentId): Promise<VitalsDto[]>
  - getConsultationHistory(patientId): Promise<PatientConsultationHistoryDto>

QueueApi
  - getTodayAppointments(doctorId): Promise<AppointmentResponseDto[]>
```

**Storage Adapters:**
```
DraftStorage (interface)
  - get(appointmentId): Promise<Draft | null>
  - set(appointmentId, draft): Promise<void>
  - remove(appointmentId): Promise<void>

LocalStorageDraftStorage (implements DraftStorage)
  - Reads/writes to localStorage key: `consultation-draft-${appointmentId}`
  - Handles JSON serialization/deserialization
  - Handles quota exceeded errors

IndexedDBDraftStorage (implements DraftStorage)
  - Future implementation for larger drafts
  - Versioned storage with migration support
```

**Cache Adapters:**
```
QueryClientProvider
  - Wraps TanStack Query client
  - Configures default cache policies per context
  - Handles cache persistence for offline mode

OptimisticCache
  - Wraps mutation optimistic updates
  - Provides snapshot/rollback semantics
  - Integrates with DraftService for conflict detection
```

**External Service Adapters:**
```
AuthAdapter
  - Wraps JWT authentication
  - Handles token refresh
  - Provides user context

WebSocketAdapter
  - Manages WebSocket connection lifecycle
  - Emits typed events to contexts
  - Handles reconnection with backoff

AIServiceAdapter
  - Manages AI assistant API calls
  - Handles streaming responses
  - Provides suggestion callbacks

VoiceDictationAdapter
  - Wraps Web Speech API or native SDK
  - Emits transcript events
  - Handles language/locale configuration
```

---

## 6. Shared Kernel

### 6.1 Responsibilities
- Provide stable, versioned types used across all layers
- Define brand tokens and design system constants
- Provide validation schemas
- Define error codes and messages

### 6.2 Allowed Dependencies
- Nothing (leaf dependency)

### 6.3 Forbidden Dependencies
- All other layers depend on Shared Kernel, never the reverse

### 6.4 Contents

**Types:**
```typescript
type PatientId = string;
type AppointmentId = number;
type ConsultationId = number;
type DoctorId = string;
type Timestamp = Date;
type DurationSeconds = number;
```

**Constants:**
```typescript
const BRAND_TOKENS = {
  primary: '#2c2e4b',
  primaryLight: '#e7d6bf',
  accent: '#caa26a',
  // ...
} as const;

const SPACING_SCALE = [0, 4, 8, 12, 16, 24, 32, 48] as const;
const TYPOGRAPHY_SCALE = { xs: 10, sm: 12, base: 14, lg: 16, xl: 20, '2xl': 24 } as const;
const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
```

**Schemas:**
```typescript
const noteSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

const outcomeSchema = z.nativeEnum(ConsultationOutcomeType);
```

**Errors:**
```typescript
enum ClinicalErrorCode {
  PATIENT_NOT_ARRIVED = 'PATIENT_NOT_ARRIVED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  CONSULTATION_COMPLETED = 'CONSULTATION_COMPLETED',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

interface ClinicalError {
  code: ClinicalErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
```

---

## 7. Layer Interaction Rules

### 7.1 Permitted Interactions

| From | To | Mechanism | Example |
|------|----|-----------|---------|
| Presentation | Application | Provider hooks | `useSession()` |
| Presentation | Infrastructure | Adaptive hooks only | `useOnlineStatus()` |
| Application | Domain | Direct import | `CanStartConsultation.check()` |
| Application | Infrastructure | Direct import | `ConsultationApi.start()` |
| Domain | Shared Kernel | Direct import | `ConsultationState` enum |
| Infrastructure | Domain | Type adapters | `PrismaConsultationMapper.toDomain()` |
| All layers | Shared Kernel | Direct import | `BRAND_TOKENS` |

### 7.2 Forbidden Interactions

| From | To | Reason |
|------|----|--------|
| Presentation | Domain | Business logic must not leak to UI |
| Presentation | Infrastructure | API calls must flow through providers |
| Domain | Application | Domain must not depend on orchestration |
| Domain | Infrastructure | Domain must not know about databases or APIs |
| Application | Presentation | Use cases must not return JSX |
| Infrastructure | Presentation | Adapters must not know about components |

### 7.3 Cross-Layer Data Flow

```
User Input (Presentation)
    ↓ dispatch
Application Action
    ↓
Use Case / Application Service
    ↓
Domain Policy / Entity Method
    ↓
Infrastructure Adapter (API call, storage write)
    ↓
External System / Browser Storage
    ↓
Infrastructure Adapter (response parsing)
    ↓
Provider State Update
    ↓
React Re-render
    ↓
Updated UI (Presentation)
```

---

## 8. File Organization

```
app/doctor/consultations/
├── session/
│   └── [appointmentId]/
│       └── page.tsx                    # Presentation: Session shell
├── [consultationId]/
│   └── page.tsx                        # Presentation: Read-only detail

contexts/
├── consultation/
│   ├── providers/
│   │   ├── SessionProvider.tsx         # Application: Session state
│   │   ├── DocumentationProvider.tsx   # Application: Notes state
│   │   ├── PatientContextProvider.tsx  # Application: Patient state
│   │   ├── QueueContextProvider.tsx    # Application: Queue state
│   │   ├── TimerProvider.tsx           # Application: Timer state
│   │   ├── BillingProvider.tsx         # Application: Billing state
│   │   └── NotificationProvider.tsx    # Application: Notification state
│   ├── hooks/
│   │   ├── useSession.ts
│   │   ├── useDocumentation.ts
│   │   ├── usePatientContext.ts
│   │   ├── useQueue.ts
│   │   ├── useTimer.ts
│   │   ├── useBilling.ts
│   │   └── useNotifications.ts
│   └── index.ts                        # Re-exports all providers + hooks

features/
├── clinical-documentation/
│   ├── components/
│   │   ├── SOAPWorkspace.tsx           # Presentation: Tab container
│   │   ├── SubjectiveTab.tsx           # Presentation: Subjective inputs
│   │   ├── ObjectiveTab.tsx            # Presentation: Objective inputs
│   │   ├── AssessmentTab.tsx           # Presentation: Assessment inputs
│   │   ├── PlanTab.tsx                 # Presentation: Plan + outcome
│   │   ├── NoteEditor.tsx              # Presentation: Shared note input
│   │   ├── VoiceInput.tsx              # Presentation: Voice extension
│   │   ├── AIAssistant.tsx             # Presentation: AI extension
│   │   └── SaveIndicator.tsx           # Presentation: Auto-save status
│   ├── hooks/
│   │   ├── useSOAPNotes.ts             # Presentation: Note field hooks
│   │   └── useAutoSave.ts              # Presentation: Auto-save integration
│   ├── domain/
│   │   ├── SOAPNote.ts                 # Domain: Note entity
│   │   ├── NoteVersion.ts              # Domain: Version value object
│   │   └── NoteSchema.ts               # Domain: Validation
│   └── extension-slots/
│       ├── SlotRegistry.ts             # Domain: Extension registry
│       └── types.ts                    # Domain: Extension contracts

features/
├── patient-context/
│   ├── components/
│   │   ├── PatientSidebar.tsx          # Presentation: Left panel
│   │   ├── VitalsPanel.tsx             # Presentation: Vitals display
│   │   ├── AllergiesPanel.tsx          # Presentation: Allergy alert
│   │   ├── HistoryTimeline.tsx         # Presentation: History list
│   │   └── ConsultationModal.tsx       # Presentation: History detail
│   ├── hooks/
│   │   └── usePatientData.ts           # Presentation: Patient data hooks
│   └── domain/
│       ├── PatientSnapshot.ts          # Domain: Patient value object
│       └── VitalsSnapshot.ts           # Domain: Vitals value object

features/
├── queue/
│   ├── components/
│   │   ├── QueuePanel.tsx              # Presentation: Right panel
│   │   ├── PatientCard.tsx             # Presentation: Queue item
│   │   ├── SwitchConfirm.tsx           # Presentation: Switch dialog
│   │   └── EmptyQueue.tsx              # Presentation: Empty state
│   ├── hooks/
│   │   └── useQueue.ts                 # Presentation: Queue hooks
│   └── domain/
│       ├── QueueFilter.ts              # Domain: Queue filtering logic
│       └── NextPatientRouter.ts        # Domain: Routing policy

application/
├── use-cases/
│   ├── InitializeSession.ts            # Application: Session initialization
│   ├── StartConsultation.ts            # Application: Start orchestration
│   ├── ResumeConsultation.ts           # Application: Resume orchestration
│   ├── CompleteConsultation.ts         # Application: Complete orchestration
│   ├── SaveDraft.ts                    # Application: Save orchestration
│   ├── RestoreDraft.ts                 # Application: Restore orchestration
│   ├── SwitchPatient.ts                # Application: Switch orchestration
│   ├── AdvanceQueue.ts                 # Application: Queue routing
│   └── LoadPatientHistory.ts           # Application: History loading
│
├── services/
│   ├── DraftService.ts                 # Application: Auto-save, debounce, conflict
│   ├── SessionService.ts               # Application: Heartbeat, timeout, recovery
│   ├── QueueService.ts                 # Application: Queue filtering, routing
│   ├── AuditService.ts                 # Application: Event emission, correlation
│   └── NotificationService.ts          # Application: Notification coordination

infrastructure/
├── api/
│   ├── ConsultationApi.ts              # Infrastructure: Consultation endpoints
│   ├── PatientApi.ts                   # Infrastructure: Patient endpoints
│   ├── QueueApi.ts                     # Infrastructure: Queue endpoints
│   ├── BillingApi.ts                   # Infrastructure: Billing endpoints
│   └── NotificationApi.ts              # Infrastructure: Notification endpoints
│
├── storage/
│   ├── DraftStorage.ts                 # Infrastructure: Draft storage interface
│   ├── LocalStorageAdapter.ts          # Infrastructure: localStorage impl
│   └── IndexedDBAdapter.ts             # Infrastructure: IndexedDB impl
│
├── cache/
│   ├── QueryClientProvider.tsx         # Infrastructure: React Query setup
│   ├── OptimisticCache.ts              # Infrastructure: Snapshot/rollback
│   └── QueryPersistence.ts             # Infrastructure: Offline persistence
│
└── adapters/
    ├── AuthAdapter.ts                  # Infrastructure: JWT handling
    ├── WebSocketAdapter.ts             # Infrastructure: Real-time connection
    ├── VoiceDictationAdapter.ts        # Infrastructure: Speech-to-text
    ├── AIServiceAdapter.ts             # Infrastructure: AI suggestions
    └── ImagingAdapter.ts               # Infrastructure: Medical imaging

domain/
├── entities/
│   ├── Consultation.ts                 # Domain: Core entity
│   ├── SOAPNote.ts                     # Domain: Note entity
│   └── Draft.ts                        # Domain: Draft entity
│
├── value-objects/
│   ├── VitalsSnapshot.ts               # Domain: Vitals VO
│   ├── AppointmentSlot.ts              # Domain: Slot VO
│   ├── TimerDuration.ts                # Domain: Timer VO
│   └── NoteVersion.ts                  # Domain: Version VO
│
├── enums/
│   ├── ConsultationState.ts            # Domain: Clinical state
│   ├── WorkflowState.ts                # Domain: UI workflow state
│   ├── OutcomeType.ts                  # Domain: Clinical outcome
│   ├── PatientDecision.ts              # Domain: Patient choice
│   └── SaveStatus.ts                   # Domain: Save status
│
├── workflows/
│   ├── SessionWorkflow.ts              # Domain: Session state machine
│   ├── DocumentationWorkflow.ts        # Domain: Documentation state machine
│   └── QueueWorkflow.ts                # Domain: Queue state machine
│
└── policies/
    ├── CanStartConsultation.ts         # Domain: Start guard
    ├── CanCompleteConsultation.ts      # Domain: Complete guard
    └── RequiresCasePlanning.ts         # Domain: Surgical planning guard

shared-kernel/
├── types/
│   ├── identities.ts                   # Shared: PatientId, AppointmentId, etc.
│   ├── temporal.ts                     # Shared: Timestamp, Duration
│   └── clinical.ts                     # Shared: Clinical type aliases
│
├── constants/
│   ├── brand.ts                        # Shared: Brand tokens
│   ├── spacing.ts                      # Shared: Spacing scale
│   ├── typography.ts                   # Shared: Typography scale
│   └── breakpoints.ts                  # Shared: Responsive breakpoints
│
├── schemas/
│   ├── note.ts                         # Shared: Note validation
│   ├── outcome.ts                      # Shared: Outcome validation
│   └── vitals.ts                       # Shared: Vitals validation
│
└── errors/
    ├── codes.ts                        # Shared: Error codes
    └── types.ts                        # Shared: Error type definitions
```

---

## 9. Module Boundaries Summary

| Layer | Cannot Import | Must Import | Optional Import |
|-------|--------------|-------------|-----------------|
| Presentation | Domain, Infrastructure | Shared Kernel, Application providers | Application use cases (rare) |
| Application | Presentation | Domain, Infrastructure, Shared Kernel | Nothing |
| Domain | All other layers | Shared Kernel | Nothing |
| Infrastructure | Presentation, Application | Domain (interfaces), Shared Kernel | Nothing |
| Shared Kernel | All other layers | Nothing | Nothing |

---

## 10. Summary

The layered architecture enforces strict dependency direction: Presentation → Application → Domain → Shared Kernel, and Infrastructure → Domain + Shared Kernel. This ensures that:

- UI changes never break business rules
- Business logic changes never break UI
- Domain logic remains pure and testable
- Infrastructure can be swapped without touching business logic
- Shared Kernel provides stable contracts across all layers

The file organization moves from monolithic `ConsultationContext.tsx` to feature-first modules (`features/clinical-documentation`, `features/patient-context`, `features/queue`) with clear internal layering.
