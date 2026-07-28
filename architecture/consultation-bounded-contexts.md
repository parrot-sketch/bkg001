# Consultation Module — Bounded Contexts

## 1. Context Map Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          SHARED KERNEL                                     │
│  Patient, Appointment, Consultation, Doctor, User, Role, Timestamp        │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  CLINICAL     │          │  CLINICAL     │          │  CLINICAL     │
│  SESSION      │◄────────►│  DOCUMENT     │◄────────►│  PATIENT      │
│  CONTEXT      │  events  │  CONTEXT      │  context  │  CONTEXT      │
│               │          │               │  queries  │               │
│ • Session mgmt│          │ • SOAP notes  │          │ • Demographics│
│ • Workflow    │          │ • Draft mgmt  │          │ • Vitals      │
│ • Timer       │          │ • Outcomes    │          │ • History     │
│ • Heartbeat   │          │ • Auto-save   │          │ • Conditions  │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  QUEUE &      │          │  OUTCOME &    │          │  WORKSPACE    │
│  SCHEDULING   │◄────────►│  PLANNING     │◄────────►│  PLATFORM     │
│  CONTEXT      │  flow    │  CONTEXT      │  routing  │  CONTEXT      │
│               │          │               │           │               │
│ • Queue mgmt  │          │ • Outcomes    │           │ • Shell       │
│ • Patient     │          │ • Decisions   │           │ • Layout      │
│   switching   │          │ • Surgical    │           │ • Navigation  │
│ • Routing     │          │   cases       │           │ • Auth wrapper│
└───────┬───────┘          └───────┬───────┘          └───────────────┘
        │                          │
        │                          │
        ▼                          ▼
┌───────────────┐          ┌───────────────┐
│  ADMIN        │          │  NOTIFICATION │
│  CONTEXT      │          │  CONTEXT      │
│               │          │               │
│ • Billing     │          │ • Email       │
│ • Audit       │          │ • In-app      │
│ • Compliance  │          │ • Alerts      │
└───────────────┘          └───────────────┘
```

---

## 2. Core Contexts

### 2.1 Clinical Session Context

**Purpose:** Manage the lifecycle and state of an active consultation session.

**Business Responsibility:**
- Initiate, resume, and close consultation sessions
- Enforce session-level invariants (doctor assigned, appointment valid, patient arrived)
- Track session timing and heartbeat
- Coordinate session transitions (start → active → completing → transitioned)

**Owned Capabilities:**
- Consultation Session Management
- Session Heartbeat
- Timer & Session Duration Tracking
- Error Recovery (Load Failure)

**Owned State:**
- `sessionId` — unique session identifier
- `workflowState` — UI workflow state machine
- `slotStartTime` — appointment slot start
- `slotDurationMinutes` — appointment slot duration
- `elapsedSeconds` — computed timer state
- `heartbeatStatus` — last heartbeat timestamp
- `loadingState` — tiered loading status

**Public Interfaces:**
```
interface ClinicalSessionApi {
  initialize(appointmentId: number): Promise<SessionInitializationResult>;
  start(doctorNotes?: string): Promise<SessionStartResult>;
  resume(): Promise<SessionResumeResult>;
  complete(): Promise<SessionCompleteResult>;
  switchTo(appointmentId: number): Promise<void>;
  getState(): SessionState;
  getWorkflowState(): WorkflowState;
}
```

**Dependencies:**
- ConsultationContext (for fetching data)
- QueueContext (for routing on completion)
- DocumentationContext (for dirty check on switch)
- PatientContext (for patient data)

**Integration Events:**
- `SESSION_STARTED` — emitted when session transitions to ACTIVE
- `SESSION_COMPLETED` — emitted when session reaches COMPLETING
- `SESSION_SWITCHED` — emitted when switching to new patient
- `SESSION_HEARTBEAT` — emitted every 30 seconds
- `SESSION_ERROR` — emitted on unrecoverable load failure

**Invariants:**
- A session cannot be started if the appointment is in a terminal state (CANCELLED, COMPLETED, NO_SHOW)
- A session cannot be started if the patient has not arrived (unless overridden by queue reconciliation)
- Only one active session per appointment at a time
- Heartbeat must be sent at least every 60 seconds while active

---

### 2.2 Clinical Documentation Context

**Purpose:** Manage clinical note entry, structured documentation, and draft persistence.

**Business Responsibility:**
- Capture SOAP notes in structured format
- Auto-save drafts with version safety
- Restore drafts from crash recovery
- Manage clinical outcomes and patient decisions
- Provide extension points for AI, voice, templates

**Owned Capabilities:**
- Clinical Documentation (SOAP Notes)
- Draft Management (Auto-Save)
- Draft Management (Manual Save)
- Draft Restoration (Session Recovery)
- Outcome Management
- Version Conflict Recovery

**Owned State:**
- `notes` — structured SOAP notes (single source of truth)
- `draftMetadata` — version, lastSavedAt, saveStatus, conflictCount
- `outcomeType` — selected clinical outcome
- `patientDecision` — patient's decision on recommended procedure
- `dirtyFields` — set of fields modified since last save
- `activeTab` — current documentation tab

**Public Interfaces:**
```
interface ClinicalDocumentationApi {
  updateNote(field: NoteField, value: string): void;
  setOutcome(outcome: OutcomeType, decision?: PatientDecision): void;
  saveDraft(): Promise<DraftSaveResult>;
  restoreDraft(): Promise<DraftRestoreResult>;
  getSaveStatus(): SaveStatus;
  getHistory(): ConsultationNoteHistory[];
  registerExtension(slot: ExtensionSlot): void;
}
```

**Dependencies:**
- Infrastructure: DraftStorage (localStorage/IndexedDB), ConsultationApi
- Shared Kernel: SOAP schema, OutcomeType enum

**Integration Events:**
- `NOTE_UPDATED` — emitted on every note field change
- `DRAFT_SAVED` — emitted on successful auto-save or manual save
- `DRAFT_SAVE_FAILED` — emitted on save failure
- `OUTCOME_CHANGED` — emitted when outcome type changes
- `CONFLICT_DETECTED` — emitted on version conflict

**Invariants:**
- Notes are valid SOAP structure (schema validated)
- Only one auto-save operation can be in flight at a time
- Draft version must increment on every successful save
- If PROCEDURE_RECOMMENDED, patientDecision cannot be null after outcome is set

---

### 2.3 Patient Context

**Purpose:** Manage patient-specific data consumed during consultation.

**Business Responsibility:**
- Provide patient demographics, vitals, allergies, conditions
- Provide contact and emergency contact information
- Aggregate consultation history for the patient
- Provide visit context (current appointment note)

**Owned Capabilities:**
- Patient Profile Review
- Consultation History Review
- Previous Consultation Reference (Modal)

**Owned State:**
- `patient` — PatientResponseDto
- `vitals` — VitalsData (current appointment)
- `allergies` — string representation
- `conditions` — string representation
- `consultationHistory` — PatientConsultationHistoryDto
- `visitNote` — current appointment note

**Public Interfaces:**
```
interface PatientContextApi {
  getDemographics(): PatientDemographics;
  getVitals(): VitalsSnapshot;
  getAllergies(): AllergySummary;
  getConditions(): ConditionSummary;
  getContactInfo(): ContactInfo;
  getEmergencyContact(): EmergencyContact;
  getConsultationHistory(limit?: number): ConsultationHistoryItem[];
  getSelectedConsultation(): ConsultationHistoryItem | null;
  selectConsultation(id: number): void;
}
```

**Dependencies:**
- Infrastructure: PatientApi, ConsultationHistoryApi

**Integration Events:**
- `PATIENT_LOADED` — emitted when patient data first available
- `PATIENT_SWITCHED` — emitted on patient change
- `VITALS_LOADED` — emitted when vitals data available
- `HISTORY_LOADED` — emitted when consultation history available

**Invariants:**
- Patient data must be loaded before consultation history (foreign key dependency)
- Vitals are optional; absence is not an error state
- Consultation history is capped at 50 items for performance

---

### 2.4 Queue & Scheduling Context

**Purpose:** Manage patient queue visibility, patient switching, and queue-aware routing.

**Business Responsibility:**
- Display today's appointments for the authenticated doctor
- Group appointments by status (waiting, in-consultation)
- Enable patient switching with draft preservation
- Determine next patient on completion (auto-routing)

**Owned Capabilities:**
- Queue Management
- Patient Switching
- Queue Progression & Auto-Routing

**Owned State:**
- `todayAppointments` — AppointmentResponseDto[]
- `waitingQueue` — filtered appointments (excludes current)
- `inConsultation` — appointments currently active
- `currentAppointmentId` — active appointment ID
- `isCollapsed` — panel visibility
- `switchState` — patient switching UX state (idle, confirming, switching)

**Public Interfaces:**
```
interface QueueContextApi {
  getTodayAppointments(): AppointmentResponseDto[];
  getWaitingQueue(): AppointmentResponseDto[];
  getInConsultation(): AppointmentResponseDto[];
  switchToPatient(appointmentId: number): Promise<void>;
  refresh(): Promise<void>;
  collapse(): void;
  expand(): void;
  getNextForRouting(): NextPatientRouting | null;
}
```

**Dependencies:**
- Infrastructure: QueueApi (doctor today appointments)
- SessionContext: for dirty check before switch, current appointment ID
- DocumentationContext: for draft save before switch

**Integration Events:**
- `QUEUE_REFRESHED` — emitted after polling or manual refresh
- `PATIENT_SWITCH_REQUESTED` — emitted before switch
- `PATIENT_SWITCHED` — emitted after successful navigation
- `NEXT_PATIENT_SELECTED` — emitted during auto-routing

**Invariants:**
- Current appointment is never in the waiting queue
- Queue is sorted by appointment time, then by status priority
- Patient switching always saves draft first if dirty
- Auto-routing prioritizes IN_CONSULTATION over CHECKED_IN

---

### 2.5 Outcome & Care Planning Context

**Purpose:** Manage clinical outcomes, patient decisions, and downstream care planning triggers.

**Business Responsibility:**
- Record consultation outcome type
- Capture patient decision on recommended procedures
- Determine if surgical case planning is required
- Coordinate with downstream modules (surgical, follow-up, referral)

**Owned Capabilities:**
- Outcome Management
- Surgical Case Initiation (triggers)
- Follow-up Planning (triggers)
- Referral Management (triggers)

**Owned State:**
- `selectedOutcome` — ConsultationOutcomeType
- `patientDecision` — PatientDecision
- `followUpPlan` — FollowUpPlan (date, type, notes)
- `referralInfo` — ReferralInfo (doctor, reason)
- `requiresCasePlanning` — boolean (derived from outcome + decision)
- `outcomeHistory` — previous outcomes for this patient (optional)

**Public Interfaces:**
```
interface OutcomeContextApi {
  selectOutcome(outcome: ConsultationOutcomeType): void;
  setPatientDecision(decision: PatientDecision): void;
  setFollowUpPlan(plan: FollowUpPlan): void;
  setReferralInfo(info: ReferralInfo): void;
  requiresCasePlanning(): boolean;
  getCurrentOutcome(): ConsultationOutcomeType | null;
  getPatientDecision(): PatientDecision | null;
  isValidOutcome(outcome: ConsultationOutcomeType): boolean;
}
```

**Dependencies:**
- DocumentationContext: reads/writes notes metadata
- Shared Kernel: OutcomeType, PatientDecision enums, requiresCasePlanning policy
- Infrastructure: OutcomeApi (for server-side outcome updates)

**Integration Events:**
- `OUTCOME_SELECTED` — emitted when outcome type changes
- `PATIENT_DECISION_SET` — emitted when decision changes
- `CASE_PLANNING_REQUIRED` — emitted when surgical case creation is indicated
- `FOLLOW_UP_REQUIRED` — emitted when follow-up is indicated
- `REFERRAL_REQUIRED` — emitted when referral is indicated

**Invariants:**
- If outcome is PROCEDURE_RECOMMENDED, patientDecision must be set before completion
- If patientDecision is YES and outcome is PROCEDURE_RECOMMENDED, requiresCasePlanning is true
- Only one active outcome per consultation
- Outcome cannot be changed after consultation is COMPLETED

---

### 2.6 Administrative Context

**Purpose:** Manage billing, audit, and compliance concerns resulting from consultation completion.

**Business Responsibility:**
- Create billing records on consultation completion
- Record audit trail for compliance
- Dispatch notifications to stakeholders
- Maintain administrative state separate from clinical state

**Owned Capabilities:**
- Billing Creation
- Notification Dispatch
- Audit & Compliance Logging

**Owned State:**
- `billingItems` — billing line items (read-only, from completion)
- `paymentStatus` — UNPAID, PAID, WAIVED
- `auditLog` — list of audit events for current session
- `notificationQueue` — pending notifications

**Public Interfaces:**
```
interface AdministrativeContextApi {
  getBillingSummary(): BillingSummary | null;
  getAuditLog(): AuditEvent[];
  getNotificationQueue(): Notification[];
}
```

**Dependencies:**
- Infrastructure: BillingApi, AuditApi, NotificationApi
- SessionContext: listens for SESSION_COMPLETED event

**Integration Events:**
- `BILLING_CREATED` — emitted after billing record created
- `NOTIFICATION_SENT` — emitted for each successful notification
- `AUDIT_RECORDED` — emitted for each audit event

**Invariants:**
- Billing is created atomically with consultation completion
- Audit events are immutable once recorded
- Notifications are fire-and-forget; failure does not block completion

---

## 3. Supporting Context

### 3.1 Workspace Platform Context

**Purpose:** Provide cross-cutting UI infrastructure that is not clinical-specific.

**Business Responsibility:**
- Layout management (sidebar collapse, panel visibility, responsive behavior)
- Navigation within the workspace
- Theme and branding
- Global keyboard shortcuts

**Owned Capabilities:**
- Workspace Shell
- Navigation

**Owned State:**
- `layout` — sidebar states, panel states, breakpoints
- `navigation` — current route, breadcrumbs
- `theme` — brand tokens, dark/light mode

**Public Interfaces:**
```
interface WorkspacePlatformApi {
  getLayout(): LayoutState;
  toggleSidebar(side: 'left' | 'right'): void;
  collapsePanel(panel: string): void;
  expandPanel(panel: string): void;
  navigate(path: string): void;
  getActivePath(): string;
}
```

**Dependencies:**
- Shared Kernel: Brand tokens, breakpoint definitions
- Infrastructure: Router adapter

**Integration Events:**
- `LAYOUT_CHANGED` — emitted on sidebar/panel toggle
- `NAVIGATION_CHANGED` — emitted on route change

**Rationale:** Separating platform concerns from clinical concerns allows the workspace to be re-skinned or re-laid-out without touching clinical logic.

---

## 4. Shared Kernel

### 4.1 Contents

The Shared Kernel contains types, enums, and constants that are stable and shared across all bounded contexts.

| Category | Contents | Rationale |
|----------|----------|-----------|
| **Identity** | `PatientId`, `AppointmentId`, `ConsultationId`, `DoctorId` | Domain identifiers used by all contexts |
| **Temporal** | `Timestamp`, `DateRange`, `SlotDuration` | Time concepts shared across contexts |
| **Clinical Enums** | `ConsultationState`, `AppointmentStatus`, `OutcomeType`, `PatientDecision` | State machines shared across contexts |
| **Workflow Enums** | `WorkflowState`, `SaveStatus`, `TimerStatus` | UI state shared across contexts |
| **Validation** | `NoteSchema`, `OutcomeSchema`, `PatientDecisionSchema` | Validation rules used by all contexts |
| **Errors** | `ClinicalErrorCode`, `AuthorizationErrorCode`, `ConflictErrorCode` | Error taxonomy shared across contexts |
| **Brand** | `BrandTokens`, `SpacingScale`, `TypographyScale` | Design system tokens |

### 4.2 Stability Contract

Shared Kernel types follow strict versioning:
- Major version bump = breaking change to any kernel type
- Minor version bump = additive change (new enum value, new optional field)
- Patch version bump = bug fix, no API change

No context may depend on types outside the Shared Kernel without going through the Infrastructure Layer (API adapters, repository interfaces).

---

## 5. Context Interaction Patterns

### 5.1 Request-Reply

Most cross-context interactions are request-reply through the Application Layer:

```
DocumentationContext needs patient name
    ↓
Application Layer: getPatientName(patientId)
    ↓
PatientContext: getDemographics().name
    ↓
Returns string
```

**Allowed when:** Request is synchronous, data is available, latency < 16ms (one frame).

### 5.2 Event-Driven

Reactive cross-context interactions use events:

```
SessionContext emits SESSION_STARTED
    ↓
DocumentationContext listener: enable editing
PatientContext listener: load history
QueueContext listener: update queue status
TimerContext listener: start timer
```

**Allowed when:** Multiple contexts need to react to the same event, or producer doesn't know consumers.

### 5.3 Shared Read Model

Some data is read-only and shared:

```
React Query cache contains:
  - consultation (SessionContext + DocumentationContext read)
  - patient (PatientContext owns, others read)
  - queue (QueueContext owns, others read)
```

**Allowed when:** Data is server-derived, immutable from client perspective, and cache policies are explicitly defined.

---

## 6. Anti-Corruption Layers

### 6.1 External Module Adapters

The Consultation Module must not import directly from other modules. Adapters enforce boundaries:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Consultation   │     │  Anti-Corruption │     │   Scheduling     │
│   Module         │────▶│     Layer        │────▶│   Module         │
│                  │     │                  │     │                  │
│  QueueContext    │     │  AppointmentApi  │     │  AppointmentApi  │
│  OutcomeContext  │     │  PatientApi      │     │  DoctorApi       │
│  SessionContext  │     │  BillingApi      │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Rules:**
- Consultation Module imports only from its own `infrastructure/` adapters
- Adapters translate between Consultation Kernel types and external module types
- Adapters handle authentication, retry, and error translation
- No direct Prisma access outside Infrastructure Layer

### 6.2 Legacy Adapters

The current `parseLegacyNotes` function is wrapped in an adapter:

```
LegacyNotesAdapter {
  parse(fullText: string): StructuredNotes | LegacyParseFailure
  isLegacyFormat(notes: ConsultationNotes): boolean
}
```

**Rationale:** Isolates fragile regex parsing from the rest of the domain. Can be removed when legacy data is fully migrated.

---

## 7. Context Evolution Roadmap

### Phase 1: Extract (Current → Target Foundation)
- Extract `DocumentationProvider` from `ConsultationContext`
- Extract `PatientContextProvider` from `ConsultationContext`
- Extract `QueueContextProvider` from `ConsultationContext`
- Preserve existing behavior; no capability changes

### Phase 2: Formalize (Target Foundation → Clean Boundaries)
- Introduce explicit state machines for Session and Documentation workflows
- Replace triple-write notes pattern with single reducer + draft metadata in React Query
- Replace `localStorage` draft backup with DraftStorage adapter (localStorage first, IndexedDB later)
- Define explicit provider interfaces

### Phase 3: Extend (Clean Boundaries → Plugin Architecture)
- Implement extension slot system in DocumentationContext
- Plumb AI Assistant through extension slot
- Plumb Voice Dictation through extension slot
- Add capability registration manifest

### Phase 4: Observe (Plugin Architecture → Observable Platform)
- Replace ConsoleAuditService with persistent event store
- Add OpenTelemetry spans to use cases
- Implement real-time dashboard for session metrics
- Add feature flag system for capability rollouts

---

## 8. Summary

The bounded context design partitions the Consultation Module into seven contexts with clear responsibilities:

- **Clinical Session** — session lifecycle
- **Clinical Documentation** — notes and outcomes
- **Patient Context** — patient data and history
- **Queue & Scheduling** — patient flow and routing
- **Outcome & Care Planning** — clinical decisions and downstream triggers
- **Administrative** — billing, audit, notifications
- **Workspace Platform** — layout, navigation, shell

Each context owns its state, exposes typed interfaces, emits events for reactive updates, and depends on other contexts only through Application Layer orchestration or shared events. The Shared Kernel provides stable common types, and Anti-Corruption Layers protect against external module changes.

This structure supports growth because new capabilities (AI, voice, imaging, labs, referrals) integrate as:
1. New bounded contexts (if they need their own state and lifecycle)
2. Extension slots within existing contexts (if they augment existing capabilities)
3. Infrastructure adapters (if they integrate with external services)

No existing context needs modification to accommodate new capabilities.
