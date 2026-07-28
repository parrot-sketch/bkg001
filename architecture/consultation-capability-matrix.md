# Consultation Module — Capability Matrix

## 1. Matrix Overview

| Capability | UI Components | Hooks | Provider/Context | API | Backend Use Case | Domain Models | State Owner | State Consumer | Persistence |
|------------|---------------|-------|------------------|-----|------------------|---------------|-------------|----------------|-------------|
| Authentication & Authorization | LoadingState, error states | useAuth | AuthContext (global) | JwtMiddleware | None (infra) | Role enum | AuthContext | All components | JWT token (memory/storage) |
| Doctor Assignment Validation | None (backend) | None | None | POST /start | StartConsultationUseCase | AppointmentStatus, DomainException | StartConsultationUseCase | API route | Database |
| Consultation Session Management | ConsultationSessionPageOptimized, StartConsultationDialog, ConsultationSessionHeader | useConsultation, useAuth | ConsultationContext | POST /start, GET /appointments/:id, GET /doctors/by-user/:userId | StartConsultationUseCase | ConsultationState, AppointmentStatus, ConsultationWorkflowState | ConsultationContext | Header, Workspace, Queue, Sidebar | React Query, Database |
| Patient Profile Review | PatientInfoSidebar | useAuth | ConsultationContext | GET /patients/:id | None (data fetch) | PatientResponseDto | ConsultationContext (reducer) | PatientInfoSidebar | React Query, Database |
| Consultation History Review | PatientInfoSidebar (history section) | usePatientConsultationHistory | ConsultationContext | GET /patients/:id/consultations | None (data fetch) | PatientConsultationHistoryDto, ConsultationState | ConsultationContext (reducer) | PatientInfoSidebar | React Query (5min stale), Database |
| Previous Consultation Reference (Modal) | PatientInfoSidebar (modal overlay) | None | None | None | None | ConsultationOutcomeType, ConsultationState | PatientInfoSidebar (local state) | Modal component | Memory |
| Clinical Documentation | ConsultationWorkspaceOptimized, SubjectiveTab, ObjectiveTab, AssessmentTab, PlanTab | None | ConsultationContext | PUT /appointments/:id/consultation/draft | None (data save) | StructuredNotes, ConsultationNotes | ConsultationContext (reducer) | Workspace tabs | Reducer, React Query, localStorage |
| Draft Management (Auto-Save) | ConsultationSessionHeader (status indicator) | useSaveConsultationDraft | ConsultationContext | PUT /appointments/:id/consultation/draft | None (data save) | ConsultationNotes, VersionConflict | ConsultationContext | Header, Context | React Query, localStorage, Database |
| Draft Management (Manual Save) | ConsultationSessionHeader (Save button) | useSaveConsultationDraft | ConsultationContext | PUT /appointments/:id/consultation/draft | None (data save) | ConsultationNotes | ConsultationContext | Header, Context | React Query, Database |
| Draft Restoration (Session Recovery) | None (passive) | None | ConsultationContext | None (localStorage) | None | ConsultationNotes | ConsultationContext | Context (on load) | localStorage |
| Version Conflict Recovery | None (passive) | useSaveConsultationDraft | ConsultationContext | PUT /appointments/:id/consultation/draft | None (data save) | ConsultationNotes | useSaveConsultationDraft (rollback) | Context, Cache | React Query cache |
| Session Heartbeat | None (passive) | None | ConsultationContext | POST /consultations/:id/heartbeat | None (infra) | None | ConsultationContext | Backend (session tracking) | None (fire-and-forget) |
| Timer & Session Duration Tracking | ConsultationSessionHeader | useConsultationTimer | ConsultationContext | None | None | None | Header component | Timer display | Memory (1s interval) |
| Queue Management | ConsultationQueuePanel, QueueHeader, QueuePatientCard, QueueEmptyState, QueueFooter, CollapsedRail | useDoctorTodayAppointments | ConsultationContext | GET /doctors/:id/appointments/today | None (data fetch) | AppointmentStatus, AppointmentResponseDto | React Query cache | QueuePanel | React Query (polling), Database |
| Patient Switching | ConsultationQueuePanel, PatientSwitchConfirmation | useAuth, useRouter | ConsultationContext | None | None | AppointmentResponseDto | QueuePanel (local state) | QueuePanel, Context | Memory (navigation) |
| Outcome Management | PlanTab (outcome selector) | None | ConsultationContext | None (via draft save) | None (via completion) | ConsultationOutcomeType, PatientDecision, requiresCasePlanning | ConsultationContext (reducer) | PlanTab, CompleteConsultationDialog | Reducer, Database (via draft/completion) |
| Consultation Completion | CompleteConsultationDialog, DocumentationChecklist, SummaryEditor, BillingSummary | useAppointmentBilling | ConsultationContext | POST /api/consultations/:id/complete | CompleteConsultationUseCase | ConsultationState, AppointmentStatus, ConsultationOutcomeType, PatientDecision, ConsultationNotes | ConsultationContext | Header, Dialog, Context | Database (appointment, consultation, billing, payment, surgical case, case plan, queue, assignment) |
| Billing Creation | BillingSummary (display) | useAppointmentBilling | ConsultationContext | None (via completion) | CompleteConsultationUseCase | Payment, Billing | Backend use case | CompleteConsultationUseCase | Database |
| Surgical Case Initiation | None (backend) | None | None | None (via completion) | CompleteConsultationUseCase | SurgicalCase, CasePlan, ConsultationOutcomeType, PatientDecision | Backend use case | Backend use case | Database |
| Notification Dispatch | None (backend) | None | None | None (via completion) | CompleteConsultationUseCase | None (email/in-app) | Backend use case | Backend use case | Email service, in-app notification store |
| Queue Progression & Auto-Routing | None (passive) | useDoctorTodayAppointments | ConsultationContext | None | None (orchestration) | AppointmentStatus | ConsultationContext | Context (completion handler) | React Query cache |
| Error Recovery (Load Failure) | LoadingState, error state UI | None | ConsultationContext | None | None | None | Page component | Error state | Memory |
| Error Recovery (Version Conflict) | None (passive) | useSaveConsultationDraft | ConsultationContext | PUT /appointments/:id/consultation/draft | None (data save) | ConsultationNotes | useSaveConsultationDraft | Context, React Query cache | React Query cache |
| Audit & Compliance Logging | None (backend) | None | None | None | StartConsultationUseCase, CompleteConsultationUseCase | None (audit trail) | Backend use case | ConsoleAuditService | Audit log store |
| Legacy Data Migration | None (passive) | None | ConsultationContext | None | None | ConsultationNotes, ConsultationState | ConsultationContext | Context (on load) | Reducer state |

---

## 2. State Ownership Details

### 2.1 ConsultationContext (Reducer State)
Owns:
- `workflow` — UI workflow state machine
- `appointment` — current appointment data
- `patient` — current patient data
- `vitals` — current vitals data
- `consultation` — current consultation record
- `doctorId` — authenticated doctor ID
- `consultationHistory` — patient's previous consultations
- `notes` — structured SOAP notes (working copy)
- `outcomeType` — selected consultation outcome
- `patientDecision` — patient's decision on procedure
- `isLoading`, `isSaving` — UI flags
- `showCompleteDialog`, `showStartDialog` — dialog visibility
- `autoSaveStatus` — auto-save indicator state

### 2.2 React Query Cache
Owns:
- Consultation record (`['consultation', appointmentId]`)
- Draft mutations (`['save-consultation-draft']`)
- Consultation history (`['patient-consultations', patientId]`)
- Today's appointments (`['doctor', doctorId, 'appointments']`)

### 2.3 LocalStorage
Owns:
- Draft notes backup (`consultation-draft-${appointmentId}`)

### 2.4 Component Local State
Owns:
- `activeTab` — ConsultationWorkspaceOptimized
- `isPatientSidebarCollapsed` — ConsultationSessionPageOptimized
- `selectedConsultation` — PatientInfoSidebar
- `isCollapsed`, `startingId`, `switchConfirmOpen`, `selectedForSwitch` — ConsultationQueuePanel
- `doctorNotes`, `isSubmitting` — StartConsultationDialog
- `summary`, `summaryEdited`, `isSubmitting` — CompleteConsultationDialog

### 2.5 Server (Database)
Owns:
- Appointment records
- Consultation records
- Patient records
- Vitals records
- Payment records
- Billing records
- SurgicalCase records
- CasePlan records
- PatientQueue records
- DoctorPatientAssignment records
- Audit logs

---

## 3. Persistence Strategy by Capability

| Capability | Persistence Mechanism | Persistence Timing | Persistence Location |
|------------|----------------------|-------------------|----------------------|
| Authentication & Authorization | JWT token | On login | Browser storage / memory |
| Consultation Session Management | React Query + Database | On load/start | React Query cache, Database |
| Patient Profile Review | React Query | On load | React Query cache, Database |
| Consultation History Review | React Query | On load | React Query cache (5min), Database |
| Clinical Documentation | Reducer + React Query + localStorage | Real-time (debounce) | Reducer, React Query cache, localStorage, Database |
| Draft Management (Auto-Save) | React Query + localStorage | 3s debounce | React Query cache, localStorage, Database |
| Draft Management (Manual Save) | React Query + localStorage | On click | React Query cache, localStorage, Database |
| Draft Restoration | localStorage → Reducer | On load | localStorage, Reducer |
| Session Heartbeat | None (fire-and-forget) | 30s interval | None |
| Queue Management | React Query | Background polling | React Query cache, Database |
| Patient Switching | Navigation | On switch | Memory (full context reset) |
| Outcome Management | Reducer + Draft | Real-time | Reducer, Database (via draft/completion) |
| Consultation Completion | Database | On confirm | Database (7+ tables) |
| Billing Creation | Database | On completion | Database |
| Surgical Case Initiation | Database | On completion | Database |
| Notification Dispatch | Email + In-app store | On completion | Email service, Notification store |
| Queue Progression | React Query + Navigation | On completion | React Query cache, Navigation |
| Error Recovery | Memory + localStorage | On error | Memory, localStorage |
| Audit & Compliance | Audit log store | On action | Audit log store |
| Legacy Data Migration | Reducer | On load | Reducer |

---

## 4. API Surface by Capability

| Capability | API Endpoint | Method | Request Body | Response | Error Handling |
|------------|-------------|--------|--------------|----------|----------------|
| Authentication & Authorization | N/A (JWT middleware) | N/A | Token | Auth result | Redirect to login |
| Consultation Session Management | POST /api/consultations/:id/start | POST | `{ doctorNotes? }` | `AppointmentResponseDto` | DomainException → 400 |
| Patient Profile Review | GET /patients/:id | GET | — | `PatientResponseDto` | Soft-fail (null) |
| Consultation History Review | GET /patients/:id/consultations | GET | — | `PatientConsultationHistoryDto` | React Query retry |
| Clinical Documentation | PUT /appointments/:id/consultation/draft | PUT | `SaveConsultationDraftDto` | `ConsultationResponseDto` | Rollback + VERSION_CONFLICT |
| Queue Management | GET /doctors/:id/appointments/today | GET | — | `AppointmentResponseDto[]` | React Query retry |
| Consultation Completion | POST /api/consultations/:id/complete | POST | `CompleteConsultationDto` | `AppointmentResponseDto` | DomainException → 400 |
| Session Heartbeat | POST /consultations/:id/heartbeat | POST | `{}` | `{ success: true }` | Silent catch |

---

## 5. Domain Model Usage by Capability

| Capability | Entities | Enums | Workflows | Value Objects | Services |
|------------|----------|-------|-----------|---------------|----------|
| Authentication & Authorization | — | Role | — | — | JwtMiddleware |
| Doctor Assignment Validation | Appointment | AppointmentStatus | — | — | AppointmentStateTransitionService |
| Consultation Session Management | Consultation, Appointment | ConsultationState, AppointmentStatus | ConsultationWorkflowState | — | — |
| Patient Profile Review | Patient | — | — | — | — |
| Consultation History Review | Consultation (via history) | ConsultationState | — | — | — |
| Clinical Documentation | Consultation | ConsultationState | — | ConsultationNotes | — |
| Draft Management | Consultation | ConsultationState | — | ConsultationNotes | — |
| Session Heartbeat | Consultation | — | — | — | — |
| Timer & Session Duration | — | — | — | — | useConsultationTimer |
| Queue Management | Appointment | AppointmentStatus | — | — | — |
| Patient Switching | Appointment | AppointmentStatus | ConsultationWorkflowState | — | — |
| Outcome Management | Consultation | ConsultationOutcomeType, PatientDecision | — | — | requiresCasePlanning |
| Consultation Completion | Consultation, Appointment | ConsultationState, AppointmentStatus, ConsultationOutcomeType, PatientDecision | ConsultationWorkflowState | ConsultationNotes, ConsultationDuration | — |
| Billing Creation | — | — | — | — | chargeSheetService |
| Surgical Case Initiation | SurgicalCase, CasePlan | ConsultationOutcomeType, PatientDecision | — | — | resolveConsultationServiceId |
| Notification Dispatch | — | — | — | — | EmailNotificationService |
| Queue Progression | Appointment | AppointmentStatus | ConsultationWorkflowState | — | — |
| Audit & Compliance | — | — | — | — | ConsoleAuditService, IAuditService |
| Legacy Data Migration | Consultation | ConsultationState | — | ConsultationNotes | parseLegacyNotes |

---

## 6. React Query Usage by Capability

| Capability | Query/Mutation | Query Key | Stale Time | GC Time | Refetch Behavior |
|------------|---------------|-----------|------------|---------|------------------|
| Consultation Session Management | Query | `['consultation', appointmentId]` | 0 | Default | Manual refetch on start |
| Patient Profile Review | Query (via loadAppointment) | N/A (no dedicated query) | N/A | N/A | Load-time only |
| Consultation History Review | Query | `['patient-consultations', patientId]` | 5 min | Default | Refetch on patient change |
| Queue Management | Query | `['doctor', doctorId, 'appointments']` | Default | 5 min | Background polling |
| Draft Management (Auto-Save) | Mutation | `['save-consultation-draft']` | N/A | N/A | Optimistic update + rollback |
| Consultation Completion | N/A (mutation via use case) | N/A | N/A | N/A | Cache invalidation after completion |

---

## 7. Component Hierarchy by Capability

### 7.1 Consultation Session Management
```
ConsultationSessionPageOptimized
└── ConsultationProvider (Context)
    ├── ConsultationSessionHeader
    ├── PatientInfoSidebar
    ├── ConsultationWorkspaceOptimized
    │   ├── SubjectiveTab
    │   ├── ObjectiveTab
    │   ├── AssessmentTab
    │   └── PlanTab
    ├── ConsultationQueuePanel
    │   ├── QueueHeader
    │   ├── QueuePatientCard
    │   ├── QueueEmptyState
    │   ├── QueueFooter
    │   ├── CollapsedRail
    │   └── PatientSwitchConfirmation
    ├── StartConsultationDialog
    └── CompleteConsultationDialog
        ├── DocumentationChecklist
        ├── SummaryEditor
        └── BillingSummary
```

### 7.2 Patient Profile Review
```
PatientInfoSidebar
├── Patient Identity Header
├── VitalsGrid
├── Allergies Alert
├── Conditions Text
├── Visit Note
├── Contact Rows
├── Emergency Contact Rows
└── Previous Consultations List
```

### 7.3 Clinical Documentation
```
ConsultationWorkspaceOptimized
├── SubjectiveTab
│   └── Chief complaint inputs
│   └── History of present illness
├── ObjectiveTab
│   └── Vitals display
│   └── Physical examination
├── AssessmentTab
│   └── Diagnosis inputs
│   └── Differential diagnosis
└── PlanTab
    └── Treatment plan
    └── Medications
    └── Outcome selector → Outcome Management
    └── Patient decision → Outcome Management
```

---

## 8. Summary

The capability matrix reveals that:

1. **ConsultationContext** is the central orchestrator, owning or mediating state for 15+ capabilities
2. **React Query** manages server state for 4 distinct data domains (consultation, draft, history, queue)
3. **LocalStorage** provides crash recovery for one capability (draft restoration)
4. **Database** is the ultimate persistence layer for all clinical and administrative data
5. **Two API routes** (`/start`, `/complete`) trigger the most complex capability cascades
6. **Domain models** are used most heavily in completion-related capabilities (billing, surgical case, notifications)
7. **Component hierarchy** is flat — all major components are direct children of the session page, coordinated by Context rather than component composition

The matrix demonstrates that while the module has many capabilities, they are not evenly distributed across layers. The presentation layer handles UI-heavy capabilities, the application layer handles transactional capabilities (completion, billing), and the domain layer provides business rule enforcement primarily for outcome and state transition validation.
