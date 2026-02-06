# Consultation & Surgery Workflow Architecture

## Overview

This document describes the complete clinical workflow architecture for the healthcare platform, covering:

1. **Appointment Booking** → Frontdesk schedules, doctor confirms
2. **Check-in Flow** → Patient arrives, frontdesk checks in
3. **Consultation Workflow** → Doctor consults, documents, determines outcome
4. **Surgery Workflow** → When procedure is recommended, case planning through surgery

The architecture follows clean separation of concerns with:
- **State Machines** for workflow transitions
- **Context Providers** for centralized state management
- **Lazy Loading** for performance optimization
- **Domain-Driven Design** for business logic

---

## Complete Workflow

### 1. Appointment Booking (Frontdesk)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTDESK DASHBOARD                              │
├──────────────────────────────────────────────────────────────────────┤
│  1. Frontdesk user views available doctors                           │
│  2. Selects a doctor and available time slot                         │
│  3. Enters patient information                                       │
│  4. Submits booking request                                          │
│                                                                      │
│  → Appointment created with status: PENDING_DOCTOR_CONFIRMATION      │
│  → Doctor receives notification                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Status Flow:**
```
PENDING_DOCTOR_CONFIRMATION
    ↓ (Doctor confirms)
CONFIRMED
    ↓ (Alternative: Doctor cancels)
CANCELLED
    ↓ (Alternative: Doctor reschedules)
RESCHEDULED → New appointment created
```

### 2. Day of Appointment - Patient Check-in (Frontdesk)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTDESK CHECK-IN                               │
├──────────────────────────────────────────────────────────────────────┤
│  1. Patient arrives at facility                                      │
│  2. Frontdesk verifies appointment                                   │
│  3. Frontdesk clicks "Check In" button                               │
│                                                                      │
│  → Appointment status: CONFIRMED → CHECKED_IN                        │
│  → checked_in_at timestamp recorded                                  │
│  → Doctor dashboard queue updates in real-time                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Only Frontdesk/Admin can check in patients
- Check-in triggers real-time update to doctor's queue
- Patient appears in "Waiting Queue" on doctor dashboard

### 3. Doctor Consultation

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DOCTOR WORKFLOW                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  A. Doctor sees patient in queue (two locations):                    │
│     - Dashboard: "Waiting Queue" section                             │
│     - Consultation Interface: Queue panel (right sidebar)            │
│                                                                      │
│  B. Doctor clicks "Start" on patient                                 │
│     → Appointment status: CHECKED_IN → IN_CONSULTATION               │
│     → Consultation record created (if not exists)                    │
│     → Consultation state: NOT_STARTED → IN_PROGRESS                  │
│     → Doctor navigated to consultation workspace                     │
│                                                                      │
│  C. During consultation:                                             │
│     - Doctor documents in structured tabs                            │
│     - Auto-save every 3 seconds                                      │
│     - Queue panel shows remaining patients                           │
│                                                                      │
│  D. Doctor completes consultation                                    │
│     → Records outcome (Procedure Recommended, Follow-up, etc.)       │
│     → Appointment status: IN_CONSULTATION → COMPLETED                │
│     → Consultation state: IN_PROGRESS → COMPLETED                    │
│     → Can immediately start next patient from queue                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Appointment Entity

```prisma
model Appointment {
  id               Int               @id
  patient_id       String
  doctor_id        String
  appointment_date DateTime
  time             String            // HH:mm format
  status           AppointmentStatus // See below
  type             String            // "Consultation", "Follow-up", etc.
  
  // Check-in tracking
  checked_in_at    DateTime?
  checked_in_by    String?
  
  // Consultation timing (on Appointment for quick queries)
  consultation_started_at DateTime?
  consultation_ended_at   DateTime?
  consultation_duration   Int?
}
```

### Consultation Entity

```prisma
model Consultation {
  id               Int       @id
  appointment_id   Int       @unique  // 1:1 with Appointment
  doctor_id        String
  user_id          String?   // Who started the consultation
  
  // Timing
  started_at       DateTime?
  completed_at     DateTime?
  duration_minutes Int?
  
  // Clinical Notes (stored as JSON in TEXT)
  doctor_notes     String?   @db.Text
  
  // Outcome
  outcome_type     String?   // PROCEDURE_RECOMMENDED, FOLLOW_UP, etc.
  patient_decision String?   // YES, NO, PENDING
  
  // Follow-up
  follow_up_date   DateTime?
  follow_up_type   String?
  follow_up_notes  String?
}
```

### ConsultationNotes Structure

Notes are stored as JSON in `doctor_notes`:

```typescript
interface ConsultationNotesData {
  structured: {
    chiefComplaint?: string;  // Patient's presenting concern
    examination?: string;     // Physical examination findings
    assessment?: string;      // Doctor's assessment/diagnosis
    plan?: string;           // Treatment plan
  };
  rawText?: string;          // Full text version for display
}
```

---

## Status Transitions

### Appointment Status Flow

```
                    ┌─────────────┐
                    │   PENDING   │ (Patient self-books)
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌─────────────────┐      ┌─────────────────────────┐
    │    SCHEDULED    │      │ PENDING_DOCTOR_CONFIRM  │
    └────────┬────────┘      └───────────┬─────────────┘
             │                           │
             │              ┌────────────┴────────────┐
             │              ▼                         ▼
             │    ┌─────────────────┐      ┌─────────────────┐
             │    │    CONFIRMED    │      │    CANCELLED    │
             │    └────────┬────────┘      └─────────────────┘
             │             │
             └─────────────┴────────────┐
                                        ▼
                              ┌─────────────────┐
                              │   CHECKED_IN    │ ← Frontdesk action
                              └────────┬────────┘
                                       │
                                       ▼
                           ┌───────────────────────┐
                           │   IN_CONSULTATION     │ ← Doctor starts
                           └───────────┬───────────┘
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                    ┌─────────────────┐  ┌─────────────────┐
                    │    COMPLETED    │  │     NO_SHOW     │
                    └─────────────────┘  └─────────────────┘
```

### Consultation State Flow

```
    ┌─────────────────┐
    │   NOT_STARTED   │ (Record created when doctor starts)
    └────────┬────────┘
             │ doctor.start()
             ▼
    ┌─────────────────┐
    │   IN_PROGRESS   │ (Active consultation)
    └────────┬────────┘
             │ doctor.complete()
             ▼
    ┌─────────────────┐
    │    COMPLETED    │ (Notes finalized)
    └─────────────────┘
```

---

## UI Architecture

### Consultation Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: [Patient Name] | [IN PROGRESS] | [Time] |    [Save] [Complete]      │
├───────────┬─────────────────────────────────────────────┬───────────────────┤
│           │                                             │                   │
│  PATIENT  │           CONSULTATION WORKSPACE            │     WAITING       │
│  SIDEBAR  │                                             │      QUEUE        │
│  (w-80)   │  ┌───────────────────────────────────────┐  │     (w-72)        │
│           │  │ Tabs:                                 │  │                   │
│ • Photo   │  │ [Chief] [Exam] [Procedure] [Photos]   │  │  👤 John (5m)     │
│ • History │  │ [Assessment] [Plan]                   │  │     [Start]       │
│ • Notes   │  │                                       │  │                   │
│           │  │  ┌─────────────────────────────────┐  │  │  👤 Jane (2m)     │
│           │  │  │                                 │  │  │     [Start]       │
│           │  │  │    Rich Text Editor Area       │  │  │                   │
│           │  │  │                                 │  │  │  ─────────────    │
│           │  │  └─────────────────────────────────┘  │  │  Avg wait: 4 min  │
│           │  │                                       │  │                   │
│           │  │  [Previous]              [Next/Done]  │  │                   │
│           │  └───────────────────────────────────────┘  │                   │
│           │                                             │                   │
└───────────┴─────────────────────────────────────────────┴───────────────────┘
```

### Component Structure

```
app/doctor/consultations/[appointmentId]/session/
└── page.tsx                        # Main page orchestrator

components/consultation/
├── ConsultationSessionHeader.tsx   # Top header with patient info
├── PatientInfoSidebar.tsx          # Left panel: patient details
├── ConsultationWorkspace.tsx       # Center: tabbed notes editor
├── ConsultationQueuePanel.tsx      # Right: waiting queue (NEW)
├── CompleteConsultationDialog.tsx  # Completion dialog
└── tabs/
    ├── PatientGoalsTab.tsx         # Chief complaint
    ├── ExaminationTab.tsx          # Physical exam
    ├── ProcedureDiscussionTab.tsx  # Procedure discussion
    ├── PhotosTab.tsx               # Clinical photos
    ├── RecommendationsTab.tsx      # Assessment
    └── TreatmentPlanTab.tsx        # Plan
```

---

## Key Features

### 1. Queue Integration
- Queue panel visible during consultation
- Collapsible for more workspace when needed
- Shows wait time for each patient
- Quick "Start" button to switch patients

### 2. Auto-Save
- Notes auto-save every 3 seconds (debounced)
- Local storage backup for recovery
- Version token validation (temporarily disabled for stability)

### 3. Time Awareness
- Overdue consultations flagged with amber badge
- Slot time displayed in cards
- Average wait time shown in queue

### 4. Audit Trail
- All actions logged for medico-legal compliance
- Timestamp tracking for start/end
- User tracking for who performed actions

---

---

## Surgery Workflow (Post-Consultation)

When a consultation results in `PROCEDURE_RECOMMENDED`, the surgery workflow begins.

### Surgery Workflow States

```
                    CONSULTATION COMPLETED
                    outcome: PROCEDURE_RECOMMENDED
                              │
                              ▼
                ┌─────────────────────────────┐
                │ AWAITING_PATIENT_DECISION   │
                └─────────────┬───────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               │               ▼
    ┌──────────────┐          │     ┌──────────────┐
    │   DECLINED   │          │     │   PENDING    │
    └──────────────┘          │     └──────────────┘
                              ▼
                    ┌──────────────────┐
                    │ CASE_PLAN_DRAFT  │ ← Create surgical plan
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ READINESS_CHECK  │ ← Pre-op requirements
                    └────────┬─────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│ Intake   │         │   Photos     │         │   Consent    │
│ Complete │         │   Uploaded   │         │   Signed     │
└──────────┘         └──────────────┘         └──────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ READY_TO_SCHEDULE│ ← All checks passed
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    SCHEDULED     │ ← Surgery date set
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   IN_THEATRE     │ ← Surgery in progress
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    RECOVERY      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    FOLLOW_UP     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    COMPLETED     │
                    └──────────────────┘
```

### Readiness Criteria

Before surgery can be scheduled, the following must be complete:

| Category | Check | Required |
|----------|-------|----------|
| **Patient File** | Intake form complete | ✅ |
| | Medical history complete | ✅ |
| | Clinical photos uploaded | ✅ |
| **Legal** | Consent form signed | ✅ |
| | Medical clearance received | ✅ |
| **Labs** | Lab work complete | Depends |
| **Financial** | Insurance verified | Depends |

### Implementation Files

```
domain/workflows/
├── ConsultationWorkflowState.ts   # Consultation state machine
└── SurgeryWorkflowState.ts        # Surgery state machine

contexts/
└── ConsultationContext.tsx        # Consultation state provider

components/consultation/
├── ConsultationWorkspaceOptimized.tsx  # Lazy-loaded workspace
├── ConsultationQueuePanel.tsx          # Inline queue
└── LazyTab.tsx                         # Tab lazy loading wrapper
```

---

## Architecture Principles

### 1. State Machines for Workflow Logic

All workflow transitions are defined in domain layer state machines:

```typescript
// Example: Check if action is valid
if (canPerformAction(currentState, action)) {
  const nextState = getNextState(currentState, action);
  // Perform transition
}
```

### 2. Context Providers for State Management

React Context providers centralize state and prevent prop drilling:

```typescript
// Usage in any component
const { state, saveDraft, updateNotes } = useConsultationContext();
```

### 3. Lazy Loading for Performance

Heavy components (rich text editors) are loaded on-demand:

```typescript
const PatientGoalsTab = dynamic(
  () => import('./tabs/PatientGoalsTab'),
  { loading: () => <Skeleton />, ssr: false }
);
```

### 4. Domain-Driven Design

Business logic lives in the domain layer:

```
domain/
├── entities/          # Core business objects
├── enums/            # Status types, outcomes
├── value-objects/    # Immutable data (ConsultationNotes)
├── workflows/        # State machines
├── services/         # Domain services
└── exceptions/       # Business rule violations
```

---

## Future Improvements

### Phase 2: Real-Time Updates
- WebSocket integration for queue updates
- Collaborative editing for multi-provider consultations
- Push notifications for status changes

### Phase 3: AI Assistance
- Voice-to-text for notes
- Smart template suggestions
- Automated coding (ICD-10, CPT)

### Phase 4: Analytics
- Consultation duration tracking
- Outcome analysis
- Wait time optimization
