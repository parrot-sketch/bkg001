# Consultation Module — Architecture Blueprint

## 1. Vision

### 1.1 What is a Consultation Workspace?

The Consultation Workspace is the **primary clinical environment** where a doctor engages with a patient encounter. It is not a page. It is a **persistent clinical cockpit** that:

- Surfaces the right patient context at the right time
- Enables uninterrupted clinical documentation
- Guides clinical decision-making
- Maintains continuity with historical encounters
- Manages patient flow without administrative overhead
- Produces structured clinical and administrative outputs

A workspace differs from a page in that it is **stateful, long-lived, and multi-faceted**. It combines data consumption (patient profile, history, vitals), data production (SOAP notes, outcomes), workflow orchestration (start, complete, switch), and operational awareness (queue, timer, notifications) into a single coherent environment.

### 1.2 Core Responsibilities

The Consultation Workspace is responsible for:

1. **Session Orchestration** — Initiate, resume, switch, and complete consultation sessions
2. **Clinical Documentation** — Real-time structured SOAP note entry with integrity guarantees
3. **Clinical Context** — Patient demographics, vitals, allergies, conditions, history
4. **Decision Support** — Outcome recording, patient decision capture, downstream workflow triggers
5. **Workflow Continuity** — Queue awareness, patient switching, auto-routing to next patient
6. **Data Integrity** — Auto-save, crash recovery, version safety, conflict resolution
7. **Operational Integration** — Billing, surgical case creation, notifications, audit
8. **Collaboration** — Real-time presence, shared editing, team coordination (future)

### 1.3 Explicitly Out of Scope

The Consultation Workspace does **not** own:

- **Appointment scheduling** — owned by Scheduling Module
- **Patient registration** — owned by Patient Management Module
- **Billing management** — owned by Billing Module
- **Surgical planning** — owned by Surgical Planning Module
- **Pharmacy/Medication management** — owned by Pharmacy Module
- **Laboratory ordering** — owned by Laboratory Module
- **Imaging workflow** — owned by Radiology Module
- **User management** — owned by Identity Module
- **Reporting/Analytics** — owned by Analytics Module

The Workspace **integrates with** these modules but does not implement their business logic.

---

## 2. Design Principles

### 2.1 Principle: Bounded Contexts Over Component Boundaries

**Statement:** Organizational boundaries must follow domain boundaries, not UI boundaries. Components are the unit of presentation; bounded contexts are the unit of ownership.

**Justification:** The current single `ConsultationContext` mixes session orchestration, documentation state, queue management, and UI flags. This works at current scale but prevents independent evolution. Clinical workflows, billing, and queue management evolve at different rates and have different ownership. Bounded contexts allow each to evolve independently.

**Impact:** Enables team separation, independent deployment, and clear ownership.

---

### 2.2 Principle: Server State and Client State Are Never Mixed

**Statement:** Server state (from APIs) and client state (UI, forms, workflow) must flow through separate pipelines and be reconciled only at well-defined boundaries.

**Justification:** The current implementation stores notes in reducer state, React Query cache, and localStorage simultaneously. This triple-write pattern creates ambiguity about the source of truth and makes conflict resolution ad-hoc.

**Impact:** Predictable data flow, testable state transitions, clear rollback semantics.

---

### 2.3 Principle: Capability-Driven Composition Over Monolithic Providers

**Statement:** The UI should compose capabilities (plugins), not inherit from a monolithic shell. Each capability should be self-contained, independently testable, and replaceable.

**Justification:** The current session page renders all six major components in a fixed 3-column layout. As new capabilities arrive (AI assistant, imaging viewer, lab orders), the page must remain composable.

**Impact:** Enables A/B testing, gradual rollout, team ownership of capabilities, and layout experimentation.

---

### 2.4 Principle: Workflow State is Separate from Domain State

**Statement:** The UI workflow state (loading, ready, active, completing) must be separate from the clinical state (not-started, in-progress, completed). They have different valid transitions, different owners, and different lifetimes.

**Justification:** The current dual state machine design is correct and must be preserved. UI workflow state controls rendering; domain state controls clinical validity. Coupling them creates impossible validation scenarios.

**Impact:** Prevents UI bugs where a clinical state transition drives the wrong UI state, and vice versa.

---

### 2.5 Principle: Orchestration Lives in the Application Layer

**Statement:** Use cases orchestrate workflows. Providers manage state. Components render UI. These responsibilities must not cross.

**Justification:** The current `ConsultationContext` mixes orchestration (loadAppointment, startConsultation, completeConsultation) with state management (reducer) and side effects (auto-save, heartbeat). This creates an untestable 976-line file.

**Impact:** Testable workflows, clear responsibility assignment, replaceable orchestrators.

---

### 2.6 Principle: Progressive Loading and Lazy Composition

**Statement:** Heavy capabilities must load on demand. The initial consultation room should render in under 2 seconds; additional panels and tools load as needed.

**Justification:** The consultation room is the most frequently used page in the EMR. Every millisecond of load time impacts doctor throughput. Current lazy loading is a good start but needs systematic expansion.

**Impact:** Better perceived performance, reduced initial bundle, capability-based code splitting.

---

### 2.7 Principle: Observable State Transitions

**Statement:** Every significant state transition must emit an observable signal. No state change should be invisible to debugging, logging, or analytics.

**Justification:** Clinical workflows require auditability. The current console.log-based audit trail is insufficient for production. Every transition—session start, save, complete, switch—must be traceable.

**Impact:** Compliance, debugging, user behavior analysis, error recovery.

---

### 2.8 Principle: Extension Without Modification (Open/Closed)

**Statement:** New capabilities must integrate through public interfaces and extension points. Existing modules must not be modified to accommodate new features.

**Justification:** The EMR will grow over 5–10 years. Hard-coded dependencies on specific outcomes, tab layouts, or side panels will become obstacles to evolution.

**Impact:** Sustainable growth, plugin architecture, team autonomy.

---

### 2.9 Principle: Testability by Design

**Statement:** Every layer must be independently testable. Domain logic must run in a Node.js test without DOM or API mocks. Use cases must run with mocked repositories. Components must render with mocked providers.

**Justification:** The current module has zero automated tests. Clean architecture makes testing easy, but only if boundaries are enforced during development.

**Impact:** Regression prevention, refactoring confidence, onboarding speed.

---

### 2.10 Principle: Clinical Safety Over Clever Architecture

**Statement:** No architectural pattern is worth compromising clinical data integrity. Auto-save, version safety, and audit are non-negotiable and must be expressible in the architecture.

**Justification:** Medical records carry legal and clinical weight. Data loss or corruption has real consequences. The architecture must make data integrity the easiest path, not just a possible one.

**Impact:** Every design decision must pass the "what if the browser crashes" test.

---

## 3. Clinical Workspace Vision

### 3.1 Target Workspace Model

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        CLINICAL WORKSPACE                                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  SHELL                                              [Timer] [Save]  │   │
│  │  Patient: John Doe  |  Age: 34  |  Status: IN_CONSULTATION       │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────┐  ┌───────────┐  │
│  │  PATIENT     │  │       DOCUMENTATION               │  │  QUEUE    │  │
│  │  CONTEXT     │  │                                    │  │           │  │
│  │              │  │  [Subjective] [Objective]          │  │  Next:    │  │
│  │  Demographics│  │  [Assessment] [Plan]               │  │  Jane Doe │  │
│  │  Vitals      │  │                                    │  │           │  │
│  │  Allergies   │  │  SOAP note editor                  │  │  Next:    │  │
│  │  Conditions  │  │  Structured fields                 │  │  John S.  │  │
│  │  History     │  │  Auto-save indicator               │  │           │  │
│  │              │  │                                    │  │  Refresh  │  │
│  │  [History]   │  │  [AI Suggestions] [Voice] [Images] │  │           │  │
│  │  [Timeline]  │  │                                    │  │           │  │
│  └──────────────┘  └──────────────────────────────────┘  └───────────┘  │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Workspace Capabilities

The workspace enables, but does not implement directly:

| Capability | Implementation |
|------------|----------------|
| Session management | Session Context |
| Patient context | Patient Context |
| Documentation | Documentation Context |
| Clinical history | History Context |
| Queue awareness | Queue Context |
| Timer | Timer Context |
| Auto-save | Documentation Context infrastructure |
| Outcome recording | Documentation Context |
| Billing trigger | Completion Application Service |
| Notification trigger | Notification Application Service |
| Audit | Audit infrastructure (cross-cutting) |

### 3.3 Extension Model

New capabilities integrate as **context extensions** or **capability plugins**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        CLINICAL WORKSPACE                                  │
│  ┌─────────────┐  ┌─────────────────────────┐  ┌─────────────┐          │
│  │ Patient     │  │    Documentation        │  │  Queue      │          │
│  │ Context     │  │    Context              │  │  Context    │          │
│  │             │  │  ┌───────────────────┐  │  │             │          │
│  │             │  │  │ Core SOAP Tabs   │  │  │             │          │
│  │             │  │  ├───────────────────┤  │  │             │          │
│  │             │  │  │ Extension Slots  │  │  │             │          │
│  │             │  │  │ [AI Assistant]   │  │  │             │          │
│  │             │  │  │ [Voice Dictation]│  │  │             │          │
│  │             │  │  │ [Lab Orders]     │  │  │             │          │
│  │             │  │  │ [Imaging Orders] │  │  │             │          │
│  │             │  │  │ [Referrals]      │  │  │             │          │
│  │             │  │  │ [Collaboration]  │  │  │             │          │
│  │             │  │  └───────────────────┘  │  │             │          │
│  │             │  │                         │  │             │          │
│  └─────────────┘  └─────────────────────────┘  └─────────────┘          │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

**Extension Contract:** Each capability plugin receives:
- A mount point (component slot)
- Access to shared kernel types
- Access to the current consultation session (read)
- Permission to emit workflow events
- Permission to read extension state from other plugins

**Extension Constraints:**
- Cannot mutate core session state directly
- Must declare data dependencies explicitly
- Must handle missing dependencies gracefully
- Must not block core UI rendering

---

## 4. High-Level Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Workspace Shell                                                     │  │
│  │    ├── Layout Provider                                               │  │
│  │    ├── Auth Provider                                                  │  │
│  │    └── Theme Provider                                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │ Patient Context  │  │ Documentation    │  │ Queue Context     │        │
│  │ Provider         │  │ Provider         │  │ Provider          │        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                                                                             │
│  Components:                                                               │
│    PatientSidebar, VitalsPanel, AllergiesPanel                            │
│    SOAPWorkspace, NoteEditor, VoiceInput, AIAssistant, LabOrders          │
│    QueuePanel, PatientCard, SwitchConfirm                                  │
│                                                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                      FRONTEND APPLICATION LAYER                             │
│                                                                             │
│  Use Cases:                                                                │
│    InitializeSession, StartConsultation, ResumeConsultation                │
│    SaveDocumentation, RestoreDraft, CompleteConsultation                   │
│    SwitchPatient, AdvanceQueue, LoadPatientHistory                         │
│                                                                             │
│  Application Services:                                                     │
│    DraftService (auto-save, debounce, conflict resolution)                 │
│    SessionService (heartbeat, timeout, recovery)                           │
│    QueueService (filtering, progression, routing)                          │
│    AuditService (event emission, correlation)                              │
│                                                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                          DOMAIN LAYER (Frontend)                            │
│                                                                             │
│  Entities:                                                                 │
│    Consultation, StructuredNotes, Draft, PatientContext                    │
│                                                                             │
│  Value Objects:                                                             │
│    SOAPNote, VitalsSnapshot, AppointmentSlot, TimerDuration                │
│                                                                             │
│  Enums:                                                                     │
│    ConsultationState, WorkflowState, OutcomeType, PatientDecision          │
│                                                                             │
│  Workflows:                                                                 │
│    SessionWorkflow, DocumentationWorkflow, QueueWorkflow                    │
│                                                                             │
│  Policies:                                                                  │
│    CanStartConsultation, CanCompleteConsultation, RequiresCasePlanning      │
│                                                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                       INFRASTRUCTURE LAYER                                  │
│                                                                             │
│  API Adapters:                                                             │
│    ConsultationApi, PatientApi, QueueApi, BillingApi                       │
│                                                                             │
│  Storage Adapters:                                                         │
│    DraftStorage (localStorage/IndexedDB), SessionStorage                   │
│                                                                             │
│  Cache Adapters:                                                           │
│    ReactQueryClient, OptimisticCache, ReactQueryPersistence                │
│                                                                             │
│  External Adapters:                                                        │
│    AuthAdapter, WebSocketAdapter, VoiceDictationAdapter, AIServiceAdapter  │
│                                                                             │
├───────────────────────────────────────────────────────────────────────────┤
│                          SHARED KERNEL                                      │
│                                                                             │
│  Brand Tokens | Common Types | Validation Schemas | Error Codes            │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVICES                                  │
│                                                                             │
│  Consultation API │ Patient API │ Queue API │ Billing API │ Notification  │
│                                                                             │
│  Use Cases:                                                                │
│    StartConsultation, CompleteConsultation, SaveDraft                       │
│                                                                             │
│  Domain:                                                                   │
│    Consultation Entity, State Machines, Business Rules                     │
│                                                                             │
│  Infrastructure:                                                            │
│    Prisma Repositories, Audit Service, Notification Service                │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Layered Responsibility Matrix

| Layer | Owns | Depends On | Forbidden From |
|-------|------|------------|----------------|
| Presentation | Components, pages, layouts, hooks | Application Layer (use cases, providers), Shared Kernel | Direct API calls, business logic, state orchestration |
| Frontend Application | Use cases, providers, application services | Domain Layer, Infrastructure Layer, Shared Kernel | Direct DOM manipulation, framework-specific patterns buried in providers |
| Domain (Frontend) | Entities, value objects, enums, workflows, policies | Shared Kernel only | Any external framework, any I/O |
| Infrastructure (Frontend) | API clients, storage adapters, cache adapters, external service adapters | Shared Kernel, Domain types where applicable | Business logic, presentation components, use case orchestration |
| Shared Kernel | Types, constants, validation schemas, error codes | Nothing | Everything (leaf dependency) |

---

## 6. Core Design Decisions

### 6.1 Decision: Multiple Focused Providers Over One Monolithic Context

**Current State:** Single `ConsultationContext` (976 lines)  
**Target State:** Seven focused providers

| Provider | Responsibility | Consumer Scope |
|----------|---------------|----------------|
| `SessionProvider` | Current appointment, patient, consultation data; session workflow state | Session shell, all session-aware components |
| `DocumentationProvider` | SOAP notes, draft management, outcomes, patient decisions | Workspace tabs, completion dialog, save button |
| `PatientContextProvider` | Patient demographics, vitals, allergies, conditions, history | Patient sidebar, documentation context |
| `QueueContextProvider` | Waiting queue, in-consultation patients, patient switching | Queue panel, session shell |
| `TimerProvider` | Session timer, heartbeat, timeout tracking | Header, session shell |
| `BillingProvider` | Billing data, payment items, billing state | Completion dialog, billing summary |
| `NotificationProvider` | Toast queue, in-app notifications, notification preferences | Global shell, all components |

**Rationale:** Each provider has a single reason to change. `DocumentationProvider` evolves with clinical documentation features. `QueueContextProvider` evolves with queue management features. Teams can work in parallel without merge conflicts in a single massive file.

**Boundary Rule:** Providers may not import each other directly. Cross-provider communication happens through:
- Shared Kernel events
- Application Layer orchestration
- React Query cache as a coordination point (server state only)

---

### 6.2 Decision: Notes State Lives in One Place

**Current State:** Notes exist simultaneously in reducer state, React Query cache, and localStorage  
**Target State:** Notes live in `DocumentationProvider` reducer; React Query cache is for draft *metadata* (version, lastSavedAt); localStorage is for crash recovery backup only

**Flow:**
```
User types → DocumentationProvider UPDATE_NOTE_FIELD
    ↓
Reducer updated (single source of truth)
    ↓
Auto-save service debounces
    ↓
DraftService.save() → API + localStorage backup
    ↓
On success: fetch consultation metadata → update React Query cache
    ↓
On failure: keep reducer state, surface error, retry
```

**Rationale:** Eliminates triple-write ambiguity. Reducer is the UI source of truth; API is the server source of truth; localStorage is a backup, not a cache.

---

### 6.3 Decision: Workflow State Machines are First-Class Citizens

**Current State:** Two state machines exist but are implicit in the reducer  
**Target State:** State machines are explicit domain objects

```
class SessionWorkflow extends StateMachine {
  states: [IDLE, LOADING, READY, ACTIVE, COMPLETING, TRANSITIONING, ERROR]
  transitions: {
    LOAD: IDLE → LOADING,
    LOAD_SUCCESS: LOADING → READY | ACTIVE,
    LOAD_FAILURE: LOADING → ERROR,
    START: READY → ACTIVE,
    COMPLETE: ACTIVE → COMPLETING,
    COMPLETE_SUCCESS: COMPLETING → TRANSITIONING,
    COMPLETE_FAILURE: COMPLETING → ACTIVE,
    RESET: * → IDLE
  }
}
```

**Rationale:** Explicit state machines are:
- Visualizable
- Testable (every transition is a test case)
- Introspectable (current state, valid transitions)
- Serializable (for debugging, time-travel)

---

### 6.4 Decision: Extension Points Through Capability Slots

**Current State:** Workspace tabs are hardcoded in `ConsultationWorkspaceOptimized`  
**Target State:** Documentation workspace has extension slots

```typescript
interface DocumentationSlots {
  subjectiveExtensions: ExtensionSlot[];
  objectiveExtensions: ExtensionSlot[];
  assessmentExtensions: ExtensionSlot[];
  planExtensions: ExtensionSlot[];
  sidebarExtensions: ExtensionSlot[];
  headerExtensions: ExtensionSlot[];
}

interface ExtensionSlot {
  id: string;
  component: React.ComponentType<SlotProps>;
  dependencies: string[]; // required capabilities
  position: 'before' | 'after' | 'replace';
}
```

**Rationale:** New capabilities (AI assistant, voice dictation, lab orders) plug into declared slots without modifying the workspace core.

---

### 6.5 Decision: Server State Ownership via React Query with Strict Boundaries

**Current State:** React Query used for consultations, drafts, history, queue  
**Target State:** React Query manages **only** server-derived data with explicit cache policies

| Data Category | React Query Policy | Rationale |
|---------------|-------------------|-----------|
| Appointment | Stale-while-revalidate, invalidate on mutation | Frequently updated by other users (check-in, queue) |
| Patient | Cache-first, invalidate on switch | Changes rarely during consultation |
| Vitals | Cache-first, invalidate on switch | Read-only during session |
| Consultation | Network-only (staleTime 0) | Critical accuracy, frequently mutated by auto-save |
| Consultation History | StaleTime 5min | Infrequent changes, acceptable staleness |
| Queue | Background polling, offlineFirst | Real-time operational view |

**Rationale:** Not all data has the same freshness requirements. Explicit cache policies prevent over-fetching and under-fetching.
