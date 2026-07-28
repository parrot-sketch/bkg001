# Consultation Module — Data Flow Analysis

## 1. Appointment Data Flow

### 1.1 Origin
**Source:** Backend database (`Appointment` table)  
**Fetched by:** `doctorApi.getAppointment(appointmentId)` → `GET /appointments/:id`

### 1.2 Flow
```
API Response
    ↓
ConsultationContext.loadAppointment()
    ↓
dispatch(SET_DATA, { appointment, patient, vitals, doctorId })
    ↓
state.appointment = AppointmentResponseDto
    ↓
Consumed by:
  - ConsultationSessionHeader (status, patient name)
  - PatientInfoSidebar (visit note)
  - ConsultationWorkspaceOptimized (appointment ID for save)
  - StartConsultationDialog (appointment details)
  - CompleteConsultationDialog (appointment details)
  - State derivation: isActive, isReadOnly, canComplete
```

### 1.3 Persistence
- **Server:** Database via Prisma
- **Client:** React Query cache, reducer state
- **Invalidation:** On start, complete, and switch patient

---

## 2. Patient Data Flow

### 2.1 Origin
**Source:** Backend database (`Patient` table)  
**Fetched by:** `doctorApi.getPatient(patientId)` → `GET /patients/:id`

### 2.2 Flow
```
API Response
    ↓
ConsultationContext.loadAppointment()
    ↓
dispatch(SET_DATA, { appointment, patient, vitals, doctorId })
    ↓
state.patient = PatientResponseDto
    ↓
Consumed by:
  - PatientInfoSidebar (demographics, contact, emergency)
  - ConsultationSessionHeader (patient name)
  - State derivation: load consultation history
    ↓
usePatientConsultationHistory(patient.id) [triggered by useEffect]
    ↓
GET /patients/:patientId/consultations
    ↓
dispatch(SET_CONSULTATION_HISTORY, consultations)
    ↓
state.consultationHistory
    ↓
PatientInfoSidebar (previous consultations list)
```

### 2.3 Persistence
- **Server:** Database
- **Client:** React Query cache, reducer state

---

## 3. Vitals Data Flow

### 3.1 Origin
**Source:** Backend database (`Vitals` table)  
**Fetched by:** `apiClient.get(/patients/${patientId}/vitals?appointmentId=${appointmentId})`

### 3.2 Flow
```
API Response (array of vitals records)
    ↓
ConsultationContext.loadAppointment()
    ↓
Map first record to VitalsData shape
    ↓
dispatch(SET_DATA, { ..., vitals })
    ↓
state.vitals
    ↓
PatientInfoSidebar (vitals grid with warning indicators)
```

### 3.3 Persistence
- **Server:** Database
- **Client:** Reducer state only (no React Query optimization)

---

## 4. Consultation Data Flow

### 4.1 Origin
**Source:** Backend database (`Consultation` table)  
**Fetched by:** `consultationApi.getConsultation(appointmentId)` → `GET /appointments/:id/consultation`

### 4.2 Flow
```
API Response (ConsultationResponseDto | null)
    ↓
ConsultationContext.loadAppointment()
    ↓
dispatch(SET_CONSULTATION, consultation)
    ↓
If consultation.notes.structured:
    dispatch(SET_NOTES, consultation.notes.structured)
Else if consultation.notes.fullText:
    parseLegacyNotes() → dispatch(SET_NOTES, parsed)
    ↓
If consultation.outcomeType:
    dispatch(SET_OUTCOME, consultation.outcomeType)
    ↓
If consultation.patientDecision:
    dispatch(SET_PATIENT_DECISION, consultation.patientDecision)
    ↓
state.notes = { chiefComplaint, examination, assessment, plan }
state.outcomeType
state.patientDecision
    ↓
Consumed by:
  - ConsultationWorkspaceOptimized (notes fields, outcome/decision)
  - CompleteConsultationDialog (outcome for completion)
  - State derivation: isActive (consultation.state === IN_PROGRESS)
```

### 4.3 Persistence
- **Server:** Database (created on start, updated on draft save, finalized on completion)
- **Client:** React Query cache, reducer state, localStorage draft

---

## 5. Notes Data Flow (Active Editing)

### 5.1 Origin
**Source:** User keystrokes in Workspace tabs (Subjective, Objective, Assessment, Plan)

### 5.2 Flow
```
User types in tab field
    ↓
Tab component calls updateNotes(field, value)
    ↓
ConsultationContext.updateNotes()
    ↓
dispatch(UPDATE_NOTE_FIELD, { field, value })
    ↓
Reducer: state.notes[field] = value
Reducer: workflow.isDirty = true
    ↓
useEffect(auto-save dependency) triggers after 3-second debounce
    ↓
saveDraft() mutation
    ↓
PUT /appointments/:id/consultation/draft
    ↓
Optimistic update in React Query cache
    ↓
On success:
  dispatch(SET_DIRTY, false)
  dispatch(SET_AUTO_SAVE_STATUS, 'saved')
  localStorage.setItem(`consultation-draft-${appointmentId}`, JSON.stringify({ structured, timestamp }))
    ↓
On error:
  dispatch(SET_AUTO_SAVE_STATUS, 'error')
  Rollback to snapshot
  Check for VERSION_CONFLICT → refetch if detected
```

### 5.3 Ownership
- **Authoritative:** Server draft endpoint
- **Client cache:** React Query mutation cache
- **Local backup:** localStorage
- **Redux/reducer:** ephemeral working copy

### 5.4 Triple-Write Pattern Notes
The notes exist simultaneously in:
1. Reducer state (working copy)
2. React Query cache (server sync)
3. localStorage (crash recovery)

On successful save, all three are reconciled. On version conflict, React Query cache is refetched from server, overriding reducer state.

---

## 6. Consultation History Data Flow

### 6.1 Origin
**Source:** Backend database via aggregation query  
**Fetched by:** `usePatientConsultationHistory(patientId)` → `GET /patients/:patientId/consultations`

### 6.2 Flow
```
API Response (PatientConsultationHistoryDto)
    ↓
React Query cache (staleTime: 5 minutes)
    ↓
ConsultationContext useEffect
    ↓
dispatch(SET_CONSULTATION_HISTORY, consultations)
    ↓
state.consultationHistory
    ↓
Prop passed to PatientInfoSidebar
    ↓
Rendered as clickable cards
    ↓
On click: setSelectedConsultation(consultation)
    ↓
Modal overlay with full details
```

### 6.3 Persistence
- **Server:** Database
- **Client:** React Query cache (5-minute stale time)

---

## 7. Waiting Queue Data Flow

### 7.1 Origin
**Source:** Backend database (`Appointment` table filtered by doctor, date, status)  
**Fetched by:** `useDoctorTodayAppointments(doctorId)` → `GET /doctors/:id/appointments/today`

### 7.2 Flow
```
API Response (AppointmentResponseDto[])
    ↓
React Query cache (with polling refetchInterval)
    ↓
ConsultationContext waitingQueue useMemo
    ↓
Filter: exclude current appointment, include CHECKED_IN/READY_FOR_CONSULTATION
    ↓
waitingQueue array
    ↓
Prop passed to ConsultationQueuePanel
    ↓
Rendered as patient cards with action buttons
    ↓
On "Begin Consultation" click:
  1. QueuePanel calls onSaveDraft() callback
  2. QueuePanel calls doctorApi.startConsultation()
  3. On success: router.push to session page (or reload)
```

### 7.3 Persistence
- **Server:** Database
- **Client:** React Query cache with background polling

---

## 8. Outcome and Patient Decision Data Flow

### 8.1 Origin
**Source:** Doctor selection in Plan tab UI

### 8.2 Flow
```
Doctor selects outcome type
    ↓
setOutcome(outcomeType)
    ↓
dispatch(SET_OUTCOME, outcomeType)
    ↓
If PROCEDURE_RECOMMENDED:
  dispatch(SET_PATIENT_DECISION, YES)
Else:
  dispatch(SET_PATIENT_DECISION, null)
    ↓
state.outcomeType, state.patientDecision
    ↓
Persisted via draft save mechanism
    ↓
On completion:
  CompleteConsultationUseCase reads these values
  Creates SurgicalCase if PROCEDURE_RECOMMENDED + YES
```

### 8.3 Persistence
- **Client:** Reducer state
- **Server:** Saved via draft endpoint, finalized on completion

---

## 9. Auto-Save Data Flow

### 9.1 Trigger
Debounced 3-second timer activated when `isActive && isDirty`

### 9.2 Flow
```
Debounce timer expires
    ↓
saveDraft()
    ↓
useSaveConsultationDraft mutation
    ↓
PUT /appointments/:id/consultation/draft
Body: { notes, outcomeType, patientDecision, versionToken }
    ↓
Optimistic update: snapshot cache, update with response
    ↓
On success:
  dispatch(SET_DIRTY, false)
  dispatch(SET_AUTO_SAVE_STATUS, 'saved')
  localStorage backup
  setTimeout(() => SET_AUTO_SAVE_STATUS, 'idle', 2000)
    ↓
On error (VERSION_CONFLICT):
  Rollback to snapshot
  Refetch consultation
  Reconcile notes from server data
```

### 9.3 Version Safety
The draft endpoint supports a `versionToken` for optimistic locking. If the server detects a stale version, it returns a conflict error, triggering a refetch and reconciliation.

---

## 10. Heartbeat Data Flow

### 10.1 Trigger
30-second interval when `isActive && consultation.id`

### 10.2 Flow
```
setInterval fires every 30s
    ↓
apiClient.post(`/consultations/${id}/heartbeat`, {})
    ↓
Fire-and-forget (errors caught silently)
    ↓
Server updates last_activity_at on Consultation record
```

### 10.3 Purpose
- Prevents session timeout on proxy/load balancer
- Enables backend cleanup of truly abandoned sessions
- No UI impact (silent)

---

## 11. Draft Restoration Data Flow

### 11.1 Trigger
On consultation load, after server data is fetched

### 11.2 Flow
```
localStorage.getItem(`consultation-draft-${appointmentId}`)
    ↓
If draft exists:
  Parse JSON
  Compare draft.timestamp vs consultation.updatedAt
    ↓
If draft is newer:
  dispatch(SET_NOTES, draft.structured) — silent replace
  No toast notification
    ↓
If draft is older or equal:
  localStorage.removeItem(...) — discard
```

### 11.3 Purpose
Crash recovery: if the browser crashes/tabs close, the most recent draft is preserved in localStorage and restored on reload, but only if it's newer than the server version.

---

## 12. Completion Data Flow

### 12.1 Origin
**Source:** Doctor confirmation in CompleteConsultationDialog

### 12.2 Flow
```
Doctor clicks "Finalize" in dialog
    ↓
CompleteConsultationDialog submits
    ↓
doctorApi.completeConsultation(dto)
    ↓
POST /api/consultations/:id/complete
    ↓
CompleteConsultationUseCase.execute()
    ↓
Server actions:
  1. Finalize consultation record
  2. Update appointment → COMPLETED
  3. Create billing + payment
  4. Optionally create SurgicalCase + CasePlan
  5. Send notifications
  6. Audit log
    ↓
Response returns to client
    ↓
ConsultationContext.completeConsultation()
    ↓
localStorage.removeItem(draft)
dispatch(RESET)
Aggressive cache invalidation (7 query keys)
    ↓
Queue-aware routing:
  - If next patient in queue:
      loadAppointment(nextPatient.id)
  - If no queue:
      router.push('/doctor/consultations')
```

### 12.3 Persistence
- **Server:** Database (appointment, consultation, billing, surgical case)
- **Client:** All state cleared

---

## 13. Patient Switch Data Flow

### 13.1 Origin
**Source:** Doctor clicks "Switch" in ConsultationQueuePanel

### 13.2 Flow
```
Doctor clicks patient card
    ↓
QueuePanel checks hasDrafts
    ↓
If dirty:
  Show confirmation dialog
  If confirmed:
    onSaveDraft() → save draft before switching
    ↓
  If confirmed or clean:
    onSwitchPatient(appointmentId)
    ↓
ConsultationContext.switchToPatient()
    ↓
Clear save timeout
    ↓
If dirty:
  saveDraft() then router.push
    ↓
Else:
  router.push(`/doctor/consultations/session/${appointmentId}`)
    ↓
New page loads with new initialAppointmentId
    ↓
New ConsultationProvider mounts
    ↓
loadAppointment(newId) fetches new data
    ↓
Old state replaced with new state
```

### 13.3 Purpose
Allow doctor to move between patients in queue without losing work. Draft is saved before navigation.

---

## 14. Start Consultation Data Flow

### 14.1 Origin
**Source:** Doctor clicks "Begin Consultation" (from queue or dialog)

### 14.2 Flow
```
 doctorApi.startConsultation(dto)
     ↓
 POST /api/consultations/:id/start
     ↓
 JWT authentication
     ↓
 StartConsultationUseCase.execute()
     ↓
 Server actions:
   1. Auto-heal stale IN_CONSULTATION appointments
   2. Validate doctor assignment (allow queue reconciliation)
   3. Validate state transition
   4. Update appointment → IN_CONSULTATION
   5. Create consultation if not exists
   6. Start consultation → IN_PROGRESS
   7. Update PatientQueue
   8. Ensure DoctorPatientAssignment
   9. Audit log
     ↓
 Response: AppointmentResponseDto
     ↓
 ConsultationContext.startConsultation()
     ↓
 Refetch consultation data
 dispatch(SET_CONSULTATION)
 Restore notes from consultation
 dispatch(SET_WORKFLOW_STATE, ACTIVE)
 dispatch(SHOW_START_DIALOG, false)
 queryClient.invalidateQueries(['doctor', user.id, 'appointments'])
 toast.success('Consultation started')
     ↓
 UI: Start dialog closes, workspace becomes active
```

### 14.3 Special Case: Already In Progress
```
If appointment.status === IN_CONSULTATION:
    StartConsultationUseCase returns existing data (idempotent)
     ↓
 ConsultationContext recognizes "already started"
     ↓
 Proceeds to workspace without error
```

*This behavior was recently fixed to prevent 400 errors when resuming an in-progress consultation.*

---

## 15. Data Freshness Strategy

| Data | Stale Time | Refresh Trigger | Invalidation |
|------|------------|-----------------|--------------|
| Appointment | Load-time only | Manual navigation | On start/complete/switch |
| Patient | Load-time only | Manual navigation | On switch patient |
| Vitals | Load-time only | Manual navigation | On switch patient |
| Consultation | 0 (always fresh) | Auto-save, manual refetch | On save, complete |
| Consultation History | 5 minutes | Patient change | On patient change |
| Waiting Queue | Background polling | refetchInterval | On start/complete/queue change |
| Draft | N/A (localStorage) | Every save | On save, completion, explicit clear |

---

## 16. Data Race Conditions

### 16.1 Draft vs Server
**Scenario:** Doctor types in tab A, auto-save fires, doctor switches to tab B, types, doctor switches patient before save completes.

**Current Handling:**
- `switchToPatient` clears save timeout before navigation
- If `isDirty`, explicitly calls `saveDraft()` and waits for completion before navigating
- If save fails, navigation proceeds anyway (draft is not critical)

**Risk:** Low. The explicit save-before-switch prevents data loss.

### 16.2 Version Conflict
**Scenario:** Two browser tabs open for same consultation, both editing.

**Current Handling:**
- `useSaveConsultationDraft` detects `VERSION_CONFLICT` in error response
- Rolls back optimistic update
- Refetches consultation
- Reconciles notes from server

**Risk:** Medium. Last save wins after reconciliation; one tab's changes may be lost.

### 16.3 Queue Staleness
**Scenario:** Queue data is stale between polling intervals.

**Current Handling:**
- `refetchInterval` keeps data fresh
- `networkMode: 'offlineFirst'` allows offline viewing
- Manual refresh button in UI

**Risk:** Low. Polling ensures eventual consistency.

---

## 17. Summary

The consultation module's data flows are well-structured with clear ownership:

- **Server state** (appointment, patient, consultation) flows through React Query
- **Client state** (workflow, notes, UI flags) flows through Context reducer
- **Persistence** is handled at appropriate layers (API for server, localStorage for crash recovery)
- **Auto-save** provides real-time sync with debouncing and version safety
- **Cache invalidation** is aggressive on completion to prevent stale data leakage

The main complexity lies in the triple-write pattern for notes (reducer + React Query + localStorage), which requires careful reconciliation but provides robust crash recovery.
