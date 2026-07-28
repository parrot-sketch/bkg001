# Consultation Module — Capability Map

## 1. Capability Catalogue

### 1.1 Consultation Session Management
**Business Purpose:** Enable doctors to initiate, resume, and switch between active consultation sessions for patients in their queue.  
**Primary Users:** Doctor  
**Clinical Value:** Provides the entry point into the clinical workspace, ensuring the doctor is properly assigned and the appointment is in a valid state for consultation.  
**Entry Points:**
- Queue panel "Begin Consultation" button (`ConsultationQueuePanel`)
- Queue panel "Continue" button for existing `IN_CONSULTATION` appointments
- Direct navigation to `/doctor/consultations/session/[appointmentId]`

**Exit Conditions:**
- Session successfully started → UI transitions to `ACTIVE`
- Session already in progress → idempotent return to `ACTIVE`
- Invalid state (patient not arrived, cancelled, completed) → error toast, remains in `READY`

**Preconditions:**
- User authenticated as DOCTOR
- Appointment exists
- Doctor is assigned to appointment OR present in patient queue

**Success Criteria:**
- Appointment status updated to `IN_CONSULTATION`
- Consultation record exists and is `IN_PROGRESS`
- UI workflow state is `ACTIVE`
- Workspace renders with editable SOAP tabs

---

### 1.2 Clinical Documentation (SOAP Notes)
**Business Purpose:** Allow doctors to document patient encounters using the structured SOAP (Subjective, Objective, Assessment, Plan) format.  
**Primary Users:** Doctor  
**Clinical Value:** Standardizes clinical documentation, ensures completeness, and provides a structured format for medical records.  
**Entry Points:**
- Consultation workspace tabs (`ConsultationWorkspaceOptimized`)
- Subjective tab (`SubjectiveTab`)
- Objective tab (`ObjectiveTab`)
- Assessment tab (`AssessmentTab`)
- Plan tab (`PlanTab`)

**Exit Conditions:**
- Notes are persisted via auto-save or manual save
- Notes exist in reducer state, React Query cache, and localStorage

**Preconditions:**
- Consultation session is `ACTIVE`
- Appointment and patient data loaded

**Success Criteria:**
- `state.notes` contains structured SOAP data
- `workflow.isDirty` reflects unsaved changes
- Draft successfully persisted to server and localStorage

---

### 1.3 Patient Profile Review
**Business Purpose:** Present comprehensive patient demographics, vitals, allergies, conditions, contact information, and emergency contacts during consultation.  
**Primary Users:** Doctor  
**Clinical Value:** Provides immediate access to critical patient information needed for safe clinical decision-making.  
**Entry Points:**
- Left sidebar (`PatientInfoSidebar`) renders automatically when patient data loads

**Exit Conditions:**
- None (persistent display throughout consultation)

**Preconditions:**
- Patient data loaded via `getPatient`
- Vitals data loaded (optional, soft-fail)

**Success Criteria:**
- Patient identity, vitals, allergies, conditions, contact, and emergency contact rendered
- Warning indicators displayed for abnormal vitals

---

### 1.4 Consultation History Review
**Business Purpose:** Allow doctors to review previous consultations for the same patient during the active encounter to inform current clinical decisions.  
**Primary Users:** Doctor  
**Clinical Value:** Supports continuity of care by making historical clinical decisions, outcomes, and notes accessible without leaving the current workspace.  
**Entry Points:**
- Previous consultations list in `PatientInfoSidebar`
- Click on consultation history card

**Exit Conditions:**
- Modal closed (X button or backdrop click)

**Preconditions:**
- `patient.id` available
- `usePatientConsultationHistory` successfully fetches history

**Success Criteria:**
- Consultation history cards rendered (up to 8 most recent)
- Clicking a card opens modal with outcome, duration, notes summary, photos, case plan
- Current consultation session remains uninterrupted

---

### 1.5 Queue Management
**Business Purpose:** Provide visibility into waiting and in-consultation patients, enabling doctors to manage their patient flow.  
**Primary Users:** Doctor  
**Clinical Value:** Enables efficient patient flow management, reduces wait times, and provides clear visibility into clinic status.  
**Entry Points:**
- Right panel (`ConsultationQueuePanel`)
- Queue data fetched via `useDoctorTodayAppointments`

**Exit Conditions:**
- Panel can be collapsed/expanded
- Queue updates via background polling

**Preconditions:**
- Doctor authenticated
- `useDoctorTodayAppointments` enabled

**Success Criteria:**
- Waiting patients (`CHECKED_IN`, `READY_FOR_CONSULTATION`) displayed
- In-consultation patients displayed
- Refresh button triggers manual refetch
- Collapsed rail shown when panel is collapsed

---

### 1.6 Patient Switching
**Business Purpose:** Allow doctors to switch between patients in the queue while preserving unsaved work.  
**Primary Users:** Doctor  
**Clinical Value:** Supports high-throughput clinics where doctors see multiple patients sequentially without losing documentation progress.  
**Entry Points:**
- Patient card click in `ConsultationQueuePanel`
- `onSwitchPatient` callback

**Exit Conditions:**
- Successfully navigated to new patient's consultation room
- New patient data loaded

**Preconditions:**
- Target appointment exists
- If current session is dirty, user confirms switch

**Success Criteria:**
- If dirty: draft saved before navigation (or save failure logged, navigation proceeds)
- New `ConsultationProvider` mounts with new `initialAppointmentId`
- Old state completely replaced

---

### 1.7 Outcome Management
**Business Purpose:** Capture the clinical outcome of the consultation and the patient's decision regarding recommended procedures.  
**Primary Users:** Doctor  
**Clinical Value:** Drives downstream workflows (surgical case creation, follow-up scheduling, referral) based on clinical decisions.  
**Entry Points:**
- Plan tab (`PlanTab`) outcome selection dropdown
- `setOutcome()` action in ConsultationContext

**Exit Conditions:**
- Outcome type and patient decision stored in context state
- Persisted via draft save or completion

**Preconditions:**
- Consultation is `ACTIVE`
- Notes exist (or can be empty)

**Success Criteria:**
- `state.outcomeType` updated
- If `PROCEDURE_RECOMMENDED`, `state.patientDecision` auto-set to `YES`
- Otherwise, `state.patientDecision` cleared

---

### 1.8 Draft Management (Auto-Save)
**Business Purpose:** Automatically persist consultation notes in the background to prevent data loss.  
**Primary Users:** Doctor (passive), System  
**Clinical Value:** Eliminates risk of losing clinical documentation due to browser crashes, network issues, or accidental navigation.  
**Entry Points:**
- Notes change detection via `UPDATE_NOTE_FIELD` dispatch
- Debounce timer activation

**Exit Conditions:**
- Draft successfully saved to server and localStorage
- Or save fails → error status, rollback

**Preconditions:**
- `isActive && isDirty`
- 3-second debounce period elapsed

**Success Criteria:**
- `PUT /appointments/:id/consultation/draft` returns 200
- React Query cache updated optimistically
- `SET_DIRTY(false)`, `SET_AUTO_SAVE_STATUS('saved')`
- localStorage backup written

---

### 1.9 Draft Management (Manual Save)
**Business Purpose:** Allow doctors to explicitly save their work at any time.  
**Primary Users:** Doctor  
**Clinical Value:** Gives clinicians control over when documentation is persisted, useful before switching patients or completing.  
**Entry Points:**
- "Save" button in `ConsultationSessionHeader`
- `onSaveDraft` prop callback

**Exit Conditions:**
- Draft saved immediately (no debounce)
- UI shows saving/saved status

**Preconditions:**
- `canSave === true` (workflow.isDirty)

**Success Criteria:**
- Same as auto-save success criteria
- `isSaving` flag set for UI feedback during save

---

### 1.10 Draft Restoration (Session Recovery)
**Business Purpose:** Recover unsaved notes from localStorage when a consultation session is reloaded after a crash or accidental close.  
**Primary Users:** System (passive), Doctor  
**Clinical Value:** Ensures no clinical data is lost even in catastrophic scenarios.  
**Entry Points:**
- `loadAppointment` useEffect after consultation data loads

**Exit Conditions:**
- Draft restored silently (if newer than server)
- Draft discarded (if older than server)
- No user-facing notification

**Preconditions:**
- `localStorage.getItem(`consultation-draft-${appointmentId}`)` returns valid JSON
- Draft timestamp comparable to `consultation.updatedAt`

**Success Criteria:**
- If draft newer: `SET_NOTES` with draft data, no toast
- If draft older/equal: localStorage entry removed

---

### 1.11 Session Heartbeat
**Business Purpose:** Keep the consultation session alive on proxy/load balancer to prevent timeout.  
**Primary Users:** System  
**Clinical Value:** Prevents session interruption during long consultations due to infrastructure timeout policies.  
**Entry Points:**
- `useEffect` when `isActive && consultation.id`

**Exit Conditions:**
- Continuous 30-second interval until session ends
- Fire-and-forget, no UI impact

**Preconditions:**
- Consultation is `ACTIVE`
- `consultation.id` exists

**Success Criteria:**
- `POST /consultations/:id/heartbeat` sent every 30 seconds
- Errors caught silently

---

### 1.12 Consultation Completion
**Business Purpose:** Finalize a consultation, capture outcome, create billing, trigger downstream workflows, and route to next patient.  
**Primary Users:** Doctor  
**Clinical Value:** Marks the clinical encounter as complete, triggers administrative and surgical follow-up workflows, and maintains accurate clinical records.  
**Entry Points:**
- "Complete" button in `ConsultationSessionHeader`
- `CompleteConsultationDialog` confirmation flow

**Exit Conditions:**
- Appointment status → `COMPLETED`
- Consultation finalized
- Next patient loaded OR navigation to hub

**Preconditions:**
- Consultation is `ACTIVE`
- Doctor confirms in completion dialog

**Success Criteria:**
- `POST /api/consultations/:id/complete` returns 200
- Billing record created (UNPAID)
- If `PROCEDURE_RECOMMENDED + YES`: SurgicalCase and CasePlan created
- Email sent to patient
- In-app notifications sent to frontdesk/nurses
- Cache invalidated, localStorage cleared, context reset
- Queue-aware routing loads next patient or navigates to hub

---

### 1.13 Billing Creation
**Business Purpose:** Automatically create a billing record and payment entry when a consultation is completed.  
**Primary Users:** System, Frontdesk  
**Clinical Value:** Ensures every consultation generates a billable event, linking clinical work to revenue cycle.  
**Entry Points:**
- `CompleteConsultationUseCase` during consultation completion

**Exit Conditions:**
- Billing record exists with `UNPAID` status
- Frontdesk can edit and collect payment

**Preconditions:**
- Consultation is being completed
- Appointment exists

**Success Criteria:**
- Payment record created with default doctor fee
- Payment status remains `UNPAID`
- Billing summary shown in completion dialog

---

### 1.14 Surgical Case Initiation
**Business Purpose:** Create a surgical case and case plan when a consultation results in a recommended procedure and the patient agrees.  
**Primary Users:** System, Doctor  
**Clinical Value:** Automatically bridges the gap between consultation and surgical planning, ensuring no procedural recommendation falls through the cracks.  
**Entry Points:**
- `CompleteConsultationUseCase` when `outcomeType === PROCEDURE_RECOMMENDED && patientDecision === YES`

**Exit Conditions:**
- `SurgicalCase` record created
- `CasePlan` record created
- Linked to consultation and patient

**Preconditions:**
- Consultation outcome is `PROCEDURE_RECOMMENDED`
- Patient decision is `YES`

**Success Criteria:**
- Surgical case exists with proper doctor/patient linkage
- Case plan exists with initial theater/inventory planning data

---

### 1.15 Notification Dispatch
**Business Purpose:** Send email and in-app notifications to relevant parties when a consultation is completed.  
**Primary Users:** Patient, Frontdesk, Nurses  
**Clinical Value:** Keeps all stakeholders informed of consultation outcomes and next steps.  
**Entry Points:**
- `CompleteConsultationUseCase` after successful completion
- Email notification to patient
- In-app notification to frontdesk/nurses

**Exit Conditions:**
- Notifications sent (non-blocking)

**Preconditions:**
- Consultation completed successfully

**Success Criteria:**
- Email sent to patient email address
- In-app notifications created for frontdesk and nurse roles

---

### 1.16 Authentication & Authorization
**Business Purpose:** Ensure only authenticated doctors can access the consultation module, and doctors can only access appointments they are assigned to.  
**Primary Users:** System  
**Clinical Value:** Protects patient confidentiality and ensures clinical accountability.  
**Entry Points:**
- `useAuth` hook for client-side auth checks
- `JwtMiddleware.authenticate` for API route protection

**Exit Conditions:**
- Authenticated → proceed
- Unauthenticated → redirect to login
- Non-doctor role → redirect/login denied

**Preconditions:**
- Valid JWT token present
- Token not expired

**Success Criteria:**
- `authResult.success === true`
- `authResult.user.role === DOCTOR`

---

### 1.17 Doctor Assignment Validation
**Business Purpose:** Verify that the requesting doctor is authorized to consult on the specific appointment, with reconciliation for queue-based assignments.  
**Primary Users:** System  
**Clinical Value:** Prevents unauthorized access to patient consultations while allowing flexible queue-based assignment.  
**Entry Points:**
- `StartConsultationUseCase` step 2
- Doctor ID comparison with `appointment.doctor_id`

**Exit Conditions:**
- Doctor matches → proceed
- Doctor in queue for appointment → reconcile assignment, proceed
- Doctor not authorized → `DomainException` 400/403

**Preconditions:**
- Appointment exists
- Doctor profile exists

**Success Criteria:**
- Doctor authorized to access appointment
- If queue-based: `appointment.doctor_id` updated to match authenticated doctor

---

### 1.18 Error Recovery (Load Failure)
**Business Purpose:** Allow recovery from data loading failures without losing the consultation session.  
**Primary Users:** Doctor  
**Clinical Value:** Provides a clear path forward when technical issues prevent session loading.  
**Entry Points:**
- "Try again" button in error state UI

**Exit Conditions:**
- Full page reload
- New load attempt

**Preconditions:**
- `ConsultationContext` in `ERROR` state

**Success Criteria:**
- `window.location.reload()` triggered
- Fresh load attempt begins

---

### 1.19 Error Recovery (Version Conflict)
**Business Purpose:** Handle concurrent editing conflicts when two sessions attempt to save the same consultation.  
**Primary Users:** System  
**Clinical Value:** Prevents data corruption when multiple tabs or users edit simultaneously.  
**Entry Points:**
- `useSaveConsultationDraft` error handler detecting `VERSION_CONFLICT`

**Exit Conditions:**
- Optimistic update rolled back
- Consultation refetched from server
- Notes reconciled (server wins)

**Preconditions:**
- Save mutation returns version conflict error

**Success Criteria:**
- Snapshot restored
- Fresh consultation data in cache
- Notes updated to server version
- User can continue editing

---

### 1.20 Queue Progression & Auto-Routing
**Business Purpose:** Automatically load the next patient in queue after consultation completion, maintaining workflow continuity.  
**Primary Users:** Doctor  
**Clinical Value:** Eliminates manual navigation between patients, reducing context-switching overhead.  
**Entry Points:**
- `ConsultationContext.completeConsultation()` after successful completion

**Exit Conditions:**
- Next patient loaded into workspace
- OR navigation to `/doctor/consultations` hub

**Preconditions:**
- Consultation completed successfully
- Cache invalidation complete

**Success Criteria:**
- `nextInConsultation` found → `loadAppointment(nextId)`
- OR `nextWaiting` found → `loadAppointment(nextId)`
- OR no queue → `router.push('/doctor/consultations')`

---

### 1.21 Timer & Session Duration Tracking
**Business Purpose:** Display elapsed and remaining time for the consultation slot to help doctors manage time.  
**Primary Users:** Doctor  
**Clinical Value:** Supports time management during consultations, ensuring appointments stay on schedule.  
**Entry Points:**
- `useConsultationTimer` hook
- `ConsultationSessionHeader` timer display

**Exit Conditions:**
- Continuous 1-second interval updates during active consultation

**Preconditions:**
- `slotStartTime` and `slotDurationMinutes` available from appointment

**Success Criteria:**
- Timer displays elapsed/remaining time accurately
- Updates every second while consultation is active

---

### 1.22 Audit & Compliance Logging
**Business Purpose:** Record audit trail for consultation start and completion events for compliance and accountability.  
**Primary Users:** Administrators, Compliance Officers  
**Clinical Value:** Provides traceability of clinical actions for regulatory requirements and quality assurance.  
**Entry Points:**
- `StartConsultationUseCase` audit event
- `CompleteConsultationUseCase` audit event

**Exit Conditions:**
- Audit event recorded

**Preconditions:**
- Consultation start or completion successful

**Success Criteria:**
- `ConsoleAuditService.recordEvent` called with action, model, record ID, details

---

### 1.23 Legacy Data Migration
**Business Purpose:** Parse legacy full-text consultation notes into structured SOAP format for modernized display.  
**Primary Users:** System  
**Clinical Value:** Ensures historical consultation data remains accessible and displayable in the structured workspace.  
**Entry Points:**
- `ConsultationContext.loadAppointment()` when consultation has `notes.fullText` but no `notes.structured`

**Exit Conditions:**
- Structured notes derived from full-text
- Parsed notes dispatched to reducer

**Preconditions:**
- Consultation exists with `notes.fullText`
- `notes.structured` is undefined

**Success Criteria:**
- Regex parsing extracts `chiefComplaint`, `examination`, `assessment`, `plan`
- Parsed notes stored in `state.notes`

---

## 2. Capability Classification

### Core Clinical Capabilities
These are the primary reasons the module exists:
1. Consultation Session Management
2. Clinical Documentation
3. Patient Profile Review
4. Outcome Management
5. Consultation Completion

### Operational Capabilities
These support the clinical workflow:
6. Queue Management
7. Patient Switching
8. Timer & Session Duration Tracking
9. Queue Progression & Auto-Routing

### Data Integrity Capabilities
These ensure data safety and consistency:
10. Draft Management (Auto-Save)
11. Draft Management (Manual Save)
12. Draft Restoration (Session Recovery)
13. Session Heartbeat
14. Version Conflict Recovery

### Business Process Capabilities
These trigger downstream systems:
15. Billing Creation
16. Surgical Case Initiation
17. Notification Dispatch
18. Audit & Compliance Logging

### Reference Capabilities
These provide contextual information:
19. Consultation History Review
20. Previous Consultation Reference (Modal)

### Infrastructure Capabilities
These are cross-cutting concerns:
21. Authentication & Authorization
22. Doctor Assignment Validation
23. Error Recovery (Load Failure)
24. Legacy Data Migration

---

## 3. Capability Interaction Summary

The capabilities form an interconnected system where:

- **Consultation Session Management** is the gateway capability — all others depend on it
- **Clinical Documentation** is the primary value-adding activity during a session
- **Patient Profile Review** and **Consultation History Review** provide context for documentation
- **Queue Management** and **Patient Switching** handle the flow between patients
- **Draft Management** (auto and manual) protects documentation integrity
- **Session Heartbeat** maintains infrastructure session state
- **Outcome Management** determines downstream business processes
- **Consultation Completion** is the terminal capability that triggers billing, surgical case creation, notifications, and routing
- **Authentication & Authorization** gates all access
- **Error Recovery** capabilities provide resilience
