# Server-Client Sequence Diagrams

## Purpose
Visualize the request/response flows between Server Component, Server Actions, and Client for the consultation room.

---

## 1. Initial Page Load

### Sequence: Server-Side Initialization

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Component  │    │ Composition Root    │    │   Database   │
│ (Client) │    │ (page.tsx)        │    │ (Factory)           │    │              │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  GET /...          │                        │                       │
     │────────────────────>                        │                       │
     │                    │  1. requireAuth()      │                       │
     │                    │───────────────────────>│                       │
     │                    │  User authenticated    │                       │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │                    │  2. createSessionFactory│                       │
     │                    │───────────────────────>│                       │
     │                    │  Creates services       │                       │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │                    │  3. sessionService.     │                       │
     │                    │     initializeSession()│                       │
     │                    │──────────────────────────────────────────────>│
     │                    │  Parallel:              │  - Appointment        │
     │                    │  - getAppointment()     │  - Doctor             │
     │                    │  - getDoctorByUserId()  │  - Consultation       │
     │                    │  - loadConsultation()   │  - Patient            │
     │                    │  - loadPatient()        │  - Vitals             │
     │                    │  - getPatientVitals()   │                       │
     │                    │  - restoreDraft()       │                       │
     │                    │──────────────────────────────────────────────>│
     │                    │  SessionData returned   │                       │
     │                    │<──────────────────────────────────────────────│
     │                    │                        │                       │
     │                    │  4. Serialize           │                       │
     │                    │     SessionData         │                       │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │                    │  5. Render              │                       │
     │                    │     ConsultationRoomClient                     │
     │                    │     with serialized props│                      │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │  HTML + RSC        │                        │                       │
     │  Payload           │                        │                       │
     │<────────────────────│                        │                       │
     │                    │                        │                       │
     │  6. Hydrate        │                        │                       │
     │  ConsultationRoomClient                                             │
     │  with props        │                        │                       │
     │──────────────────>│                        │                       │
     │                    │                        │                       │
```

### Key Points

1. Server Component executes synchronously during request
2. All database calls happen server-side
3. Client receives fully rendered HTML + serialized state
4. Client hydrates without re-fetching

---

## 2. Start Consultation

### Sequence: Client → Server Action → Client

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Action     │    │ SessionService      │    │   Database   │
│ (Client) │    │ (startSession)    │    │                     │    │              │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  1. User clicks "Start Consultation"                            │
     │                    │                        │                       │
     │  2. SessionProvider calls                    │                       │
     │     startSessionAction({                    │                       │
     │       appointmentId,                        │                       │
     │       doctorId                               │                       │
     │     })                                       │                       │
     │─────────────────────────────────────────────>│                       │
     │                    │  3. Authenticate user  │                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  4. createSessionFactory│                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  5. sessionService.     │                       │
     │                    │     startSession()     │                       │
     │                    │──────────────────────────────────────────────>│
     │                    │  - getAppointment()     │  Update status        │
     │                    │  - loadPatient()        │  Set startedAt        │
     │                    │  - startConsultation()  │                       │
     │                    │  - loadConsultation()   │                       │
     │                    │  - executeWorkflowCommand                       │
     │                    │    (START_CONSULTATION) │                       │
     │                    │──────────────────────────────────────────────>│
     │                    │  SessionData returned   │                       │
     │                    │<──────────────────────────────────────────────│
     │                    │                        │                       │
     │                    │  6. Serialize result    │                       │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │  7. { success: true,│                        │                       │
     │     data: SessionData }                        │                       │
     │<─────────────────────────────────────────────│                       │
     │                    │                        │                       │
     │  8. Update state:                               │                       │
     │     - appointment    │                        │                       │
     │     - patient        │                        │                       │
     │     - consultation   │                        │                       │
     │     - workflowState  │                        │                       │
     │     - doctorId       │                        │                       │
     │──────────────────>│                        │                       │
     │                    │                        │                       │
     │  9. UI re-renders with ACTIVE state             │                       │
     │                    │                        │                       │
```

### Optimistic Update (Enhanced)

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Action     │    │ SessionService      │    │   Database   │
│ (Client) │    │ (startSession)    │    │                     │    │              │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  User clicks        │                        │                       │
     │────────────────────>│                        │                       │
     │                    │                        │                       │
     │  Optimistic update: │                        │                       │
     │  setWorkflowState(  │                        │                       │
     │    ACTIVE           │                        │                       │
     │  )                  │                        │                       │
     │  Show "Starting..." │                        │                       │
     │<────────────────────│                        │                       │
     │                    │                        │                       │
     │  Server Action runs │                        │                       │
     │  (2-7 as above)     │                        │                       │
     │                    │                        │                       │
     │  Success:           │                        │                       │
     │  setState(result)   │                        │                       │
     │<────────────────────│                        │                       │
     │                    │                        │                       │
     │  Failure:           │                        │                       │
     │  setWorkflowState(  │                        │                       │
     │    READY            │                        │                       │
     │  )                  │                        │                       │
     │  toast.error(...)   │                        │                       │
     │<────────────────────│                        │                       │
```

---

## 3. Auto-Save Draft

### Sequence: Debounced Client → Server Action → Client

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Action     │    │ DraftService        │    │   Database   │
│ (Client) │    │ (saveDraft)       │    │                     │    │  (Drafts)    │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  1. User edits notes                                │                  │
     │  (state.isDirty = true)                             │                  │
     │                    │                        │                       │
     │  2. useEffect triggers after 3s debounce            │                  │
     │                    │                        │                       │
     │  3. DocumentationProvider calls                     │                  │
     │     saveDraftAction({                               │                  │
     │       consultationId,                                │                  │
     │       doctorId,                                      │                  │
     │       notes,                                        │                  │
     │       outcomeType,                                   │                  │
     │       patientDecision                                │                  │
     │     })                                               │                  │
     │─────────────────────────────────────────────────────>│                  │
     │                    │  4. Authenticate         │                  │
     │                    │─────────────────────────>│                  │
     │                    │                          │                  │
     │                    │  5. createSessionFactory  │                  │
     │                    │─────────────────────────>│                  │
     │                    │                          │                  │
     │                    │  6. draftService.         │                  │
     │                    │     saveDraft()          │                  │
     │                    │────────────────────────────────────────────>│
     │                    │  Save draft to DB         │                  │
     │                    │<────────────────────────────────────────────│
     │                    │                          │                  │
     │                    │  7. Return { success,     │                  │
     │                    │     version }             │                  │
     │                    │<─────────────────────────│                  │
     │                    │                          │                  │
     │  8. { success: true,│                          │                  │
     │     data: { version } }                          │                  │
     │<─────────────────────────────────────────────────────│                  │
     │                    │                          │                  │
     │  9. Update state:   │                          │                  │
     │     - isDirty = false                          │                  │
     │     - lastSavedAt = version                     │                  │
     │     - autoSaveStatus = 'saved'                  │                  │
     │<────────────────────│                          │                  │
     │                    │                          │                  │
     │  10. After 2s:      │                          │                  │
     │   autoSaveStatus = 'idle'                        │                  │
     │<────────────────────│                          │                  │
```

---

## 4. Advance Queue

### Sequence: Client → Server Action → Client State Replacement

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Action     │    │ SessionService      │    │   Database   │
│ (Client) │    │ (advanceQueue)    │    │                     │    │              │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  1. User clicks "Advance Queue"                          │
     │                    │                        │                       │
     │  2. SessionProvider calls                    │                       │
     │     advanceQueueAction({                     │                       │
     │       doctorId,                              │                       │
     │       userId                                 │                       │
     │     })                                       │                       │
     │─────────────────────────────────────────────>│                       │
     │                    │  3. Authenticate       │                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  4. createSessionFactory│                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  5. sessionService.     │                       │
     │                    │     advanceQueue()     │                       │
     │                    │──────────────────────────────────────────────>│
     │                    │  - execute ADVANCE_QUEUE│  Get next            │
     │                    │  - Check if completed   │  appointment         │
     │                    │  - If next: initSession()│                      │
     │                    │──────────────────────────────────────────────>│
     │                    │  Result: null (empty)   │                       │
     │                    │  OR                     │                       │
     │                    │  SessionInitializationResult                   │
     │                    │<──────────────────────────────────────────────│
     │                    │                        │                       │
     │                    │  6. Serialize result    │                       │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │  7. { success: true,│                        │                       │
     │     data: null }  │                        │                       │
     │<─────────────────────────────────────────────│                       │
     │                    │                        │                       │
     │  8. Clear state:   │                        │                       │
     │     - appointment = null                       │                       │
     │     - patient = null                           │                       │
     │     - consultation = null                      │                       │
     │     - doctorId = null                          │                       │
     │     - isReady = false                          │                       │
     │<──────────────────>│                        │                       │
     │                    │                        │                       │
     │  9. UI shows empty queue state                 │                       │
     │                    │                        │                       │
```

OR

```
     │                    │                        │                       │
     │  7. { success: true,│                        │                       │
     │     data: { session,                         │                       │
     │       restoredDraft }}                        │                       │
     │<─────────────────────────────────────────────│                       │
     │                    │                        │                       │
     │  8. Replace state: │                        │                       │
     │     - appointment = next.appointment         │                       │
     │     - patient = next.patient                 │                       │
     │     - consultation = next.consultation       │                       │
     │     - doctorId = next.doctorId               │                       │
     │     - notes = next.notes                     │                       │
     │     - workflowState = next.workflowState     │                       │
     │     - isReady = true                         │                       │
     │<──────────────────>│                        │                       │
     │                    │                        │                       │
     │  9. UI re-renders with new patient           │                       │
     │                    │                        │                       │
```

---

## 5. Complete Consultation

### Sequence: Client → Server Action → Redirect

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Action     │    │ SessionService      │    │   Database   │
│ (Client) │    │ (completeSession) │    │                     │    │              │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  1. User clicks "Complete Consultation"       │                  │
     │                    │                        │                       │
     │  2. SessionProvider calls                    │                       │
     │     completeSessionAction({                  │                       │
     │       consultationId                          │                       │
     │     })                                        │                       │
     │─────────────────────────────────────────────>│                       │
     │                    │  3. Authenticate       │                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  4. createSessionFactory│                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  5. sessionService.     │                       │
     │                    │     completeSession()  │                       │
     │                    │──────────────────────────────────────────────>│
     │                    │  - loadConsultation()   │  Verify state        │
     │                    │  - execute COMPLETE_CONSULTATION                     │
     │                    │  - discardDraft()       │  Delete draft        │
     │                    │──────────────────────────────────────────────>│
     │                    │  SessionCompletionResult│                       │
     │                    │<──────────────────────────────────────────────│
     │                    │                        │                       │
     │                    │  6. Serialize result    │                       │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │  7. { success: true,│                        │                       │
     │     data: {                                │                       │
     │       completedAppointmentId,              │                       │
     │       redirectPath: '/doctor/consultations'│                       │
     │     }}                                     │                       │
     │<─────────────────────────────────────────────│                       │
     │                    │                        │                       │
     │  8. router.push('/doctor/consultations')     │                       │
     │─────────────────────────────────────────────>│                       │
     │                    │                        │                       │
     │  9. Navigate to consultations list           │                       │
     │                    │                        │                       │
```

---

## 6. Save Draft (Error Flow)

### Sequence: Auto-Save with Conflict

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Action     │    │ DraftService        │    │   Database   │
│ (Client) │    │ (saveDraft)       │    │                     │    │  (Drafts)    │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  1. Auto-save triggers after 3s                 │                  │
     │                    │                        │                       │
     │  2. saveDraftAction(...)                       │                  │
     │───────────────────────────────────────────────>│                  │
     │                    │  3. createSessionFactory│                   │
     │                    │────────────────────────>│                   │
     │                    │                         │                   │
     │                    │  4. draftService.        │                   │
     │                    │     saveDraft()         │                   │
     │                    │────────────────────────────────────────────>│
     │                    │  Write draft             │  CONFLICT          │
     │                    │         (version mismatch)│                   │
     │                    │<────────────────────────────────────────────│
     │                    │                         │                   │
     │                    │  5. Return { success:    │                   │
     │                    │     false,              │                   │
     │                    │     error: 'CONFLICT' }  │                   │
     │                    │<────────────────────────│                   │
     │                    │                         │                   │
     │  6. { success: false,│                         │                   │
     │     error: 'Conflict' }                        │                   │
     │<───────────────────────────────────────────────│                   │
     │                    │                         │                   │
     │  7. Update state:   │                         │                   │
     │     - isSaving = false                         │                   │
     │     - autoSaveStatus = 'error'                 │                   │
     │     - hasConflict = true                       │                   │
     │<──────────────────>│                         │                   │
     │                    │                         │                   │
     │  8. Show conflict UI:                          │                   │
     │     "Your draft conflicts with server version" │                   │
     │     [Keep Local] [Keep Server] [Merge]         │                   │
     │<──────────────────>│                         │                   │
```

---

## 7. Consultation Switch (Full Flow)

### Sequence: Switch Patient with State Replacement

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Action     │    │ SessionService      │    │   Database   │
│ (Client) │    │ (switchToPatient) │    │                     │    │              │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  1. Doctor selects next patient from queue                     │
     │                    │                        │                       │
     │  2. SessionProvider calls                    │                       │
     │     switchToPatientAction({                  │                       │
     │       fromAppointmentId,                     │                       │
     │       toAppointmentId                        │                       │
     │     })                                       │                       │
     │─────────────────────────────────────────────>│                       │
     │                    │  3. Authenticate       │                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  4. createSessionFactory│                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  5. sessionService.     │                       │
     │                    │     switchSession()    │                       │
     │                    │──────────────────────────────────────────────>│
     │                    │  - execute SWITCH_PATIENT│                      │
     │                    │  - save current draft    │                      │
     │                    │  - initSession(toAppointmentId)                 │
     │                    │──────────────────────────────────────────────>│
     │                    │  SessionSwitchResult    │                       │
     │                    │<──────────────────────────────────────────────│
     │                    │                        │                       │
     │                    │  6. Serialize result    │                       │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │  7. { success: true,│                        │                       │
     │     data: {                                │                       │
     │       fromAppointmentId,                   │                       │
     │       toAppointmentId,                     │                       │
     │       draftSaved: true,                    │                       │
     │       nextSession: {                       │                       │
     │         session: SessionData,              │                       │
     │         restoredDraft: false               │                       │
     │       }                                    │                       │
     │     }}                                     │                       │
     │<─────────────────────────────────────────────│                       │
     │                    │                        │                       │
     │  8. Replace ALL state:                      │                       │
     │     - appointment = nextSession.appointment │                       │
     │     - patient = nextSession.patient         │                       │
     │     - consultation = nextSession.consultation                      │
     │     - doctorId = nextSession.doctorId       │                       │
     │     - notes = nextSession.notes             │                       │
     │     - workflowState = nextSession.workflowState                     │
     │     - isReady = true                        │                       │
     │<──────────────────>│                        │                       │
     │                    │                        │                       │
     │  9. UI re-renders with new patient          │                       │
     │                    │                        │                       │
```

---

## 8. Error Handling: Initialization Failure

### Sequence: Server-Side Error

```
┌──────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Browser  │    │ Server Component  │    │ SessionService      │    │   Database   │
│ (Client) │    │ (page.tsx)        │    │                     │    │              │
└────┬─────┘    └────────┬─────────┘    └──────────┬──────────┘    └──────┬───────┘
     │                    │                        │                       │
     │  GET /...           │                        │                       │
     │────────────────────>│                        │                       │
     │                    │  requireAuth()         │                       │
     │                    │───────────────────────>│                       │
     │                    │  User authenticated    │                       │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │                    │  createSessionFactory()│                       │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │                    │  sessionService.       │                       │
     │                    │  initializeSession()   │                       │
     │                    │──────────────────────────────────────────────>│
     │                    │  - getAppointment()     │  NOT FOUND            │
     │                    │<──────────────────────────────────────────────│
     │                    │  { success: false,      │                       │
     │                    │    error: APPOINTMENT_NOT_FOUND }            │
     │                    │<───────────────────────│                       │
     │                    │                        │                       │
     │                    │  Return error UI       │                       │
     │                    │  (NOT ConsultationRoomClient)                  │
     │                    │───────────────────────>│                       │
     │                    │                        │                       │
     │  ErrorPage HTML     │                        │                       │
     │<────────────────────│                        │                       │
     │                    │                        │                       │
     │  Client NEVER receives forbidden modules!                    │
     │                    │                        │                       │
```

---

## 9. Summary

| Flow | Client→Server | Server Processing | Server→Client | Client Update |
|------|---------------|-------------------|---------------|---------------|
| Initial load | HTTP GET | Compose + Initialize | RSC payload | Hydrate + render |
| Start consultation | Server Action | Start session | SessionData | Replace state |
| Auto-save | Server Action | Save draft | { success, version } | Update dirty flag |
| Advance queue | Server Action | Advance + init | SessionData or null | Replace or clear state |
| Complete | Server Action | Complete + redirect | redirectPath | Navigate |
| Error init | HTTP GET | Error | ErrorPage HTML | Render error |

**All flows go through Server Component or Server Action. No client-side Application/Domain/Infrastructure code is executed.**
