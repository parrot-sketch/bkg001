# Consultation Module — Current State Assessment

## 1. Module Overview

### What is the Consultation Module?

The Consultation Module is the clinical workspace where doctors perform active patient consultations. It is the primary interface for real-time SOAP documentation (Subjective, Objective, Assessment, Plan) during patient encounters. The module encompasses:

- **Live consultation room** — the active workspace where doctors document encounters
- **Consultation history** — previous consultation records for reference
- **Queue management** — visibility into waiting patients and ability to switch between them
- **Completion workflow** — outcome recording, patient decision capture, surgical case initiation, billing creation, and notifications
- **Hub view** — read-only consultation detail pages and administrative oversight

### Business Capability

The module enables the full clinical documentation lifecycle:

1. **Initiation** — Doctor starts a consultation from the queue
2. **Documentation** — Real-time SOAP note entry with auto-save
3. **Clinical Decision** — Outcome type selection (procedure recommended, consultation only, follow-up needed, referral, patient deciding)
4. **Patient Decision** — Capture patient's choice when a procedure is recommended
5. **Completion** — Finalize notes, create billing, optionally create surgical case, send notifications
6. **Continuity** — View previous consultations for the same patient during active consultation

### Problem Solved

- Provides a dedicated, focused workspace for clinical documentation separate from administrative scheduling
- Ensures consultation data is captured in real-time with crash recovery via auto-save and localStorage
- Maintains patient journey continuity by surfacing historical consultations during active encounters
- Manages clinical workflow state transitions with proper authorization and audit trails
- Enables aesthetic surgery-specific workflows (procedure recommendation, patient decision, surgical case creation)

### EMR System Fit

The Consultation Module sits between the **Scheduling/Appointment Module** (upstream) and the **Surgical Planning/Billing Module** (downstream):

```
Patient Booking → Frontdesk Check-in → Doctor Queue → [CONSULTATION MODULE] → Surgical Case/Billing
```

It consumes appointment and patient data from upstream modules and produces consultation records, outcomes, and billing events consumed by downstream modules.

---

## 2. Architectural Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Pages                                                             │  │
│  │  ├── app/doctor/consultations/session/[appointmentId]/page.tsx    │  │
│  │  └── app/doctor/consultations/[consultationId]/page.tsx           │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  State Management                                                 │  │
│  │  └── contexts/ConsultationContext.tsx                             │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  Components                                                        │  │
│  │  ├── components/consultation/PatientInfoSidebar.tsx               │  │
│  │  ├── components/consultation/ConsultationSessionHeader.tsx        │  │
│  │  ├── components/consultation/ConsultationWorkspaceOptimized.tsx   │  │
│  │  ├── components/consultation/ConsultationQueuePanel.tsx           │  │
│  │  ├── components/doctor/StartConsultationDialog.tsx                │  │
│  │  └── components/consultation/CompleteConsultationDialog.tsx       │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  Hooks                                                             │  │
│  │  ├── hooks/consultation/useConsultation.ts                        │  │
│  │  ├── hooks/consultation/useSaveConsultationDraft.ts               │  │
│  │  ├── hooks/consultation/usePatientConsultationHistory.ts          │  │
│  │  ├── hooks/doctor/useDoctorDashboard.ts                           │  │
│  │  └── hooks/patient/useAuth.ts                                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                         APPLICATION LAYER                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Use Cases                                                         │  │
│  │  ├── application/use-cases/StartConsultationUseCase.ts            │  │
│  │  └── application/use-cases/CompleteConsultationUseCase.ts         │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  DTOs                                                              │  │
│  │  ├── application/dtos/ConsultationResponseDto.ts                  │  │
│  │  ├── application/dtos/StartConsultationDto.ts                     │  │
│  │  ├── application/dtos/SaveConsultationDraftDto.ts                 │  │
│  │  ├── application/dtos/PatientConsultationHistoryDto.ts            │  │
│  │  └── application/dtos/CompleteConsultationDto.ts                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                         DOMAIN LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Entities                                                          │  │
│  │  └── domain/entities/Consultation.ts                              │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  Enums                                                             │  │
│  │  ├── domain/enums/ConsultationState.ts                            │  │
│  │  ├── domain/enums/ConsultationOutcomeType.ts                      │  │
│  │  └── domain/enums/PatientDecision.ts                              │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  Workflows                                                         │  │
│  │  └── domain/workflows/ConsultationWorkflowState.ts                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE LAYER                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  API Routes                                                        │  │
│  │  ├── app/api/consultations/[id]/start/route.ts                    │  │
│  │  └── app/api/consultations/[id]/complete/route.ts                 │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  Server Actions                                                    │  │
│  │  └── app/actions/doctor/consultation-hub.ts                       │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  Repositories                                                      │  │
│  │  └── infrastructure/database/repositories/PrismaConsultationRepository.ts │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  API Client Library                                                │  │
│  │  ├── lib/api/consultation.ts                                      │  │
│  │  ├── lib/api/doctor.ts                                            │  │
│  │  └── lib/api/client.ts (global singleton)                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Architectural Style

The module follows a **Clean/Hexagonal Architecture** pattern:

- **Domain Layer** is pure TypeScript with no framework dependencies
- **Application Layer** orchestrates workflows via Use Cases
- **Infrastructure Layer** provides concrete implementations (Prisma, Next.js API routes)
- **Presentation Layer** is React-based with clear separation between state (Context) and UI (Components)

### Two State Machines

The module maintains **two distinct state machines**:

1. **Domain Entity State** (`ConsultationState`): `NOT_STARTED` → `IN_PROGRESS` → `COMPLETED`
   - Governed by domain entity methods (`Consultation.start()`, `Consultation.complete()`)
   - Represents the clinical/documentation lifecycle

2. **UI Workflow State** (`ConsultationWorkflowState`): `IDLE` → `LOADING` → `READY` → `ACTIVE` → `COMPLETING` → `TRANSITIONING` → `ERROR`
   - Governed by `ConsultationContext` reducer
   - Controls what the UI renders (loading skeletons, dialogs, workspace, completion state)

These two state machines run in parallel and are reconciled at key transition points (e.g., when starting a consultation, both `AppointmentStatus` and `ConsultationState` transition).

---

## 3. User Journey

### Complete Doctor Consultation Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. DOCTOR DASHBOARD                                                     │
│    - Doctor sees today's appointments                                   │
│    - useDoctorTodayAppointments fetches queue                          │
│    - React Query polling keeps data fresh                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. QUEUE INTERACTION                                                    │
│    - Doctor views ConsultationQueuePanel (right panel)                  │
│    - Patients in CHECKED_IN / READY_FOR_CONSULTATION status             │
│    - Doctor clicks "Begin Consultation"                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. START CONSULTATION DIALOG                                            │
│    - StartConsultationDialog opens (optional doctor notes)              │
│    - Doctor submits → doctorApi.startConsultation()                    │
│    - POST /api/consultations/:id/start                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. BACKEND: START CONSULTATION USE CASE                                 │
│    - JWT authentication                                                 │
│    - Auto-heal stale IN_CONSULTATION appointments                       │
│    - Validate appointment status transition                             │
│    - Update Appointment → IN_CONSULTATION                               │
│    - Create Consultation record (NOT_STARTED)                           │
│    - Start Consultation → IN_PROGRESS                                   │
│    - Update PatientQueue → IN_CONSULTATION                              │
│    - Ensure DoctorPatientAssignment                                     │
│    - Audit log                                                           │
│    - Invalidate doctor/frontdesk dashboard caches                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. CONSULTATION SESSION PAGE LOADS                                      │
│    - ConsultationProvider mounts with initialAppointmentId             │
│    - loadAppointment(appointmentId) triggered                           │
│    - Parallel fetch: appointment, doctor, consultation                  │
│    - Sequential fetch: patient, vitals                                 │
│    - Workflow state → ACTIVE                                            │
│    - UI renders 3-column workspace                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. WORKSPACE RENDERS                                                    │
│    ┌──────────────┬──────────────────────────┬────────────────────┐    │
│    │  Patient Info│     Workspace            │    Queue           │    │
│    │  Sidebar     │  (Tabs: SOAP)            │    Panel           │    │
│    │  (Left)      │  (Center)                │    (Right)         │    │
│    ├──────────────┼──────────────────────────┼────────────────────┤    │
│    │ • Demographics│  • Subjective            │  • Waiting queue  │    │
│    │ • Vitals      │  • Objective             │  • In-consultation│    │
│    │ • Allergies   │  • Assessment            │  • Patient switch │    │
│    │ • Conditions  │  • Plan                  │  • Draft save     │    │
│    │ • Notes       │                          │                    │    │
│    │ • Contact     │                          │                    │    │
│    │ • History     │                          │                    │    │
│    └──────────────┴──────────────────────────┴────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. ACTIVE CONSULTATION DOCUMENTATION                                    │
│    - Doctor enters SOAP notes in Workspace tabs                         │
│    - Each keystroke triggers debounced auto-save (3 seconds)           │
│    - saveDraft mutation via React Query                                 │
│    - Optimistic update + rollback on version conflict                  │
│    - localStorage backup for crash recovery                             │
│    - Auto-save indicator in header shows status                        │
│    - Heartbeat sent every 30 seconds to prevent session timeout         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 8. PREVIOUS CONSULTATIONS REFERENCE                                     │
│    - PatientInfoSidebar shows consultation history (up to 8)           │
│    - usePatientConsultationHistory fetches history                      │
│    - Doctor clicks previous consultation → modal overlay               │
│    - Shows outcome, duration, notes summary, photos, case plan         │
│    - Does NOT interrupt current consultation                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 9. CLINICAL DECISION                                                    │
│    - Doctor selects outcome type (Plan tab):                            │
│      • PROCEDURE_RECOMMENDED                                            │
│      • CONSULTATION_ONLY                                                │
│      • FOLLOW_UP_CONSULTATION_NEEDED                                    │
│      • PATIENT_DECIDING                                                 │
│      • REFERRAL_NEEDED                                                  │
│    - If PROCEDURE_RECOMMENDED → PatientDecision YES by default         │
│    - Context tracks outcomeType and patientDecision                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 10. COMPLETION                                                          │
│     - Doctor clicks "Complete"                                          │
│     - CompleteConsultationDialog opens                                 │
│     - Advisory warnings shown                                          │
│     - Documentation checklist verified                                  │
│     - Editable summary editor (doctor can customize)                   │
│     - Billing summary displayed                                        │
│     - Doctor confirms → POST /api/consultations/:id/complete           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 11. BACKEND: COMPLETE CONSULTATION USE CASE                             │
│     - Finalize Consultation record                                      │
│     - Merge notes, set outcome                                          │
│     - Update Appointment → COMPLETED                                   │
│     - Set consultation_ended_at, consultation_duration                 │
│     - Optionally schedule follow-up appointment                         │
│     - Create billing + payment record (UNPAID for frontdesk)           │
│     - If PROCEDURE_RECOMMENDED + YES → create SurgicalCase + CasePlan │
│     - Send email notification to patient                               │
│     - In-app notifications to frontdesk/nurses                         │
│     - Update PatientQueue, DoctorPatientAssignment                     │
│     - Audit log                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 12. POST-COMPLETION ROUTING                                             │
│     - completeConsultation() in Context                                 │
│     - Aggressive cache invalidation                                     │
│     - Clear localStorage draft                                          │
│     - Reset context state                                               │
│     - Queue-aware routing:                                              │
│       • If next patient in queue → load into workspace                 │
│       • If no queue → navigate to /doctor/consultations hub            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Alternate Path: Resume In-Progress Consultation

```
Doctor clicks "Continue" on existing IN_CONSULTATION appointment
    ↓
doctorApi.startConsultation() → POST /api/consultations/:id/start
    ↓
StartConsultationUseCase detects IN_CONSULTATION status
    ↓
Idempotent return (no error, returns existing appointment data)
    ↓
Context recognizes "already started" → proceeds to workspace
    ↓
Consultation record refetched, notes restored, workflow → ACTIVE
```

This path was recently fixed to handle the 400 error that occurred when resuming an in-progress consultation.

---
