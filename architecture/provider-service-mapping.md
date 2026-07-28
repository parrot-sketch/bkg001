# Provider Service Mapping

## Overview

This document maps each future provider to the Application Services and Use Cases it should consume. It answers: "If I extract this provider, what does it need to call?"

---

## 1. SessionProvider

**Responsibility:** Manage the current consultation session lifecycle and workflow state.

### 1.1 Application Services

| Service | Why Needed |
|---------|-----------|
| `SessionService` | Core service — initializes, starts, resumes, completes, and switches sessions |
| `DraftService` | Auto-save coordination, draft restoration on resume |
| `NotificationService` | Toast messages for session events |
| `AuditService` | Audit trail for session lifecycle events |

### 1.2 Use Cases

| Use Case | When Called |
|----------|-----------|
| `InitializeSession` | On mount when `initialAppointmentId` is provided |
| `StartConsultation` | When doctor confirms start dialog |
| `ResumeConsultation` | When navigating to an already-active session |
| `CompleteConsultation` | When doctor confirms completion dialog |
| `SwitchPatient` | When doctor clicks next patient in queue |

### 1.3 Ports (Indirect)

| Port | Used By |
|------|---------|
| `ConsultationApi` | SessionService → InitializeSession, StartConsultation, ResumeConsultation, CompleteConsultation |
| `PatientApi` | SessionService → InitializeSession (patient data) |
| `QueueApi` | QueueService → AdvanceQueue (next patient lookup) |
| `DraftStorage` | DraftService → SaveDraft, RestoreDraft |

### 1.4 State Owned

- `appointment`, `patient`, `consultation`, `doctorId`
- `workflowState`, `loadingState`, `error`
- Derived: `isActive`, `isReadOnly`, `canStart`, `canComplete`

### 1.5 Migration Risk: **MEDIUM**

**Blockers:**
- `SessionService` does not exist yet
- `DraftService` does not exist yet
- Session state machine is currently inline in ConsultationContext reducer

**Mitigation:**
- Extract SessionService and DraftService first (Phase 2 Week 1-2)
- Build shim prototype that wraps new services behind the old context interface
- Feature flags enable gradual rollout

---

## 2. DocumentationProvider

**Responsibility:** Manage consultation notes, outcomes, patient decisions, and auto-save.

### 2.1 Application Services

| Service | Why Needed |
|---------|-----------|
| `DraftService` | Core service — auto-save, manual save, restore, conflict detection |
| `NotificationService` | Save status indicators, error toasts |

### 2.2 Use Cases

| Use Case | When Called |
|----------|-----------|
| `SaveDraft` | On note change (debounced 3s) or manual save |
| `RestoreDraft` | On session initialization if draft is newer than server |

### 2.3 Ports (Indirect)

| Port | Used By |
|------|---------|
| `ConsultationApi` | DraftService → SaveDraft |
| `DraftStorage` | DraftService → localStorage backup |

### 2.4 State Owned

- `notes` (StructuredNotes: chiefComplaint, examination, assessment, plan)
- `outcomeType`, `patientDecision`
- `saveStatus` ('idle' | 'saving' | 'saved' | 'error')
- `isDirty`
- `draft` (restored draft data)

### 2.5 Migration Risk: **HIGH**

**Blockers:**
- `DraftService` does not exist yet
- Auto-save debouncing is inline in ConsultationContext (lines 820-845)
- Draft restoration logic is mixed with session initialization (lines 476-497)
- `ConsultationNotes` VO does not match blueprint `SOAPNote` shape

**Mitigation:**
- Extract DraftService before DocumentationProvider
- Align `ConsultationNotes` with `SOAPNote` or create migration path
- Keep auto-save indicator in DocumentationProvider, not SessionProvider

---

## 3. PatientContextProvider

**Responsibility:** Manage patient data, demographics, vitals, and consultation history.

### 3.1 Application Services

| Service | Why Needed |
|---------|-----------|
| `PatientService` (future) | Coordinate patient data loading across multiple calls |

### 3.2 Use Cases

| Use Case | When Called |
|----------|-----------|
| `LoadPatientHistory` | On session initialization or patient switch |
| `LoadPatientVitals` | On session initialization |

### 3.3 Ports (Indirect)

| Port | Used By |
|------|---------|
| `PatientApi` | Direct use by PatientContextProvider or via future PatientService |
| `ConsultationApi` | LoadPatientHistory |

### 3.4 State Owned

- `patient` (PatientResponseDto)
- `vitals` (VitalsData)
- `consultationHistory` (PatientConsultationHistoryItemDto[])

### 3.5 Migration Risk: **LOW**

**Rationale:**
- Patient data loading is already relatively isolated in ConsultationContext (lines 418-452)
- `PatientApi` port and `HttpPatientApi` adapter already exist
- No complex state transitions

**Blockers:**
- No `PatientService` — not strictly required, can use `PatientApi` directly
- Feature flags not implemented

---

## 4. QueueContextProvider

**Responsibility:** Manage the clinician's patient queue, filtering, and routing.

### 4.1 Application Services

| Service | Why Needed |
|---------|-----------|
| `QueueService` | Core service — queue filtering, next patient logic, polling |

### 4.2 Use Cases

| Use Case | When Called |
|----------|-----------|
| `RefreshQueue` | On queue panel mount, after session completion |
| `AdvanceQueue` | After consultation completion |
| `FilterQueue` | When queue panel needs filtered view |

### 4.3 Ports (Indirect)

| Port | Used By |
|------|---------|
| `QueueApi` | QueueService → RefreshQueue, AdvanceQueue |
| `ConsultationApi` | QueueService → AdvanceQueue (for session state) |

### 4.4 State Owned

- `todayAppointments` (raw queue data)
- `waitingQueue` (filtered: exclude current, by status)
- `isCollapsed`, `isRefetching`
- `queueLoaded` (lazy-load flag)

### 4.5 Migration Risk: **MEDIUM**

**Blockers:**
- `QueueService` does not exist yet
- Queue filtering is inline in ConsultationContext (lines 364-370)
- `QueuePatient` DTO is API-shaped and in Domain layer

**Mitigation:**
- Refactor `QueuePatient` to Application DTO before extraction
- Extract QueueService with queue filtering logic
- QueueProvider is largely presentational — low coupling risk

---

## 5. TimerProvider

**Responsibility:** Display and manage session timing.

### 5.1 Application Services

| Service | Why Needed |
|---------|-----------|
| `TimerService` | Core service — elapsed time, remaining time, formatting |
| `SessionService` | Session start time, slot duration |

### 5.2 Use Cases

| Use Case | When Called |
|----------|-----------|
| *(None)* | TimerProvider derives display state from SessionService — no dedicated use case |

### 5.3 Ports (Indirect)

| Port | Used By |
|------|---------|
| *(None)* | TimerProvider reads from SessionService, no API calls |

### 5.4 State Owned

- `elapsedSeconds`
- `remainingSeconds`
- `formattedTime`
- `isOvertime`

### 5.5 Migration Risk: **LOW**

**Rationale:**
- Timer is purely computed from session start time and slot duration
- No API calls, no side effects
- Can be a simple React hook or lightweight provider

**Blockers:**
- `TimerService` does not exist yet
- `TimerDuration` VO does not exist
- `SessionService` must exist first

---

## 6. BillingProvider

**Responsibility:** Display billing summary and handle billing at consultation completion.

### 6.1 Application Services

| Service | Why Needed |
|---------|-----------|
| `BillingService` | Core service — billing summary, validation |

### 6.2 Use Cases

| Use Case | When Called |
|----------|-----------|
| `CompleteConsultation` | Billing items included in completion payload |

### 6.3 Ports (Indirect)

| Port | Used By |
|------|---------|
| `BillingApi` | BillingService — not yet implemented |

### 6.4 Migration Risk: **HIGH**

**Blockers:**
- `BillingApi` port does not exist
- `BillingService` does not exist
- Billing data is loaded inline in ConsultationContext via `apiClient.get`

---

## 7. NotificationProvider

**Responsibility:** Manage in-app notifications, toasts, and alerts.

### 7.1 Application Services

| Service | Why Needed |
|---------|-----------|
| `NotificationService` | Core service — toast orchestration, message formatting |

### 7.2 Use Cases

| Use Case | When Called |
|----------|-----------|
| *(None)* | NotificationProvider is event-driven — responds to other use cases' events |

### 7.3 Ports (Indirect)

| Port | Used By |
|------|---------|
| `NotificationApi` | Future — for persistent notifications |

### 7.4 Migration Risk: **HIGH**

**Blockers:**
- `NotificationService` does not exist
- `NotificationApi` port does not exist
- Event bus infrastructure is placeholder
- Toasts are currently direct `sonner` calls scattered across ConsultationContext and hooks

---

## 8. Provider Dependency Graph

```
SessionProvider ◄── ConsultationApi ✅
SessionProvider ◄── PatientApi ✅
SessionProvider ◄── DraftService ❌
SessionProvider ◄── SessionService ❌
SessionProvider ◄── NotificationService ❌
SessionProvider ◄── AuditService ❌

DocumentationProvider ◄── ConsultationApi ✅
DocumentationProvider ◄── DraftStorage ✅
DocumentationProvider ◄── DraftService ❌
DocumentationProvider ◄── NotificationService ❌

PatientContextProvider ◄── PatientApi ✅
PatientContextProvider ◄── ConsultationApi ✅
PatientContextProvider ◄── PatientService (optional) ❌

QueueContextProvider ◄── QueueApi ✅
QueueContextProvider ◄── QueueService ❌
QueueContextProvider ◄── ConsultationApi ✅
QueueContextProvider ◄── NotificationService ❌

TimerProvider ◄── TimerService ❌
TimerProvider ◄── SessionService ❌

BillingProvider ◄── BillingApi ❌
BillingProvider ◄── BillingService ❌

NotificationProvider ◄── NotificationApi ❌
NotificationProvider ◄── NotificationService ❌
NotificationProvider ◄── EventBus ❌
```

**Critical path:** SessionService + DraftService → SessionProvider and DocumentationProvider extraction. These two services are prerequisites for 4 of 7 providers.
