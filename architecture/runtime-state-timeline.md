# Runtime State Timeline — Consultation Room

## Assumption
This timeline assumes the browser has already received the compiled bundle. The actual first failure is at T0 (compilation OOM), but this timeline documents the intended runtime state flow.

---

## T0 — Page Module Evaluation
- **Action:** `page.tsx` executes as client bundle
- **State:** Module-level imports resolved
- **Expected:** All providers, services, and guards available in memory
- **Actual:** Turbopack OOM during graph build
- **Invariant:** Client bundle must fit in Node heap during compilation
- **Status:** FAIL

---

## T1 — Auth Resolution
- **Action:** `useAuth()` returns `{ user, isAuthenticated, isLoading }`
- **State:** `user` transitions from `null` → `StoredUser` (from localStorage)
- **Effect:** Triggers `SessionProvider` `useEffect([user])` which resets `initializationAttempted=false`, `isReady=false`, `error=null`

---

## T2 — SessionProvider First Render
- **Action:** `SessionProvider` executes all `useMemo` hooks
- **State mutations:**
  - `httpPatientApi` created (memoized, empty deps)
  - `httpConsultationApi` created
  - `httpDoctorApi` created
  - `localStorageDraftStorage` created
  - `draftService` created
  - `coordinator` created → `WorkflowEngine` instantiated with empty `GuardContext`, `DefaultGuardRegistry` populated with 76 guards
  - `sessionService` created wrapping `coordinator`
- **Provider props computed:**
  - `docsProps`: `{ draftService, consultationId: null, doctorId: null, isCompleted: false, notes: {}, outcomeType: null, patientDecision: null }`
  - `patientProps`: `{ patientApi, patient: null, appointment: null, vitals: null, isLoading: false, error: null, consultationId: null }`
  - `queueProps`: `{ doctorId: null, currentAppointmentId: null }`
  - `timerProps`: `{ startedAt: null, slotStartTime: undefined, slotDurationMinutes: 30 }`
- **Context value:** Session context exposed with all state at initial values

---

## T3 — Initialization Effect Fires
- **Condition:** `initialAppointmentId && user && !isReady && !isInitializing && !initializationAttempted`
- **Action:** `initializeSession(5)` invoked
- **State mutations:** `setIsInitializing(true)`, `setInitializationAttempted(true)`, `setIsLoading(true)`, `setError(null)`
- **Side effect:** `workflowEngineRef.current.updateContext({ appointmentId: 5, user })`

---

## T4 — Parallel API Batch 1
- **Action:** `Promise.all([getAppointment(5), getDoctorByUserId(userId), loadConsultation(5)])`
- **Results:**
  - `appointmentResult` → `{ id: 5, patientId: "xyz", status: "IN_CONSULTATION", ... }`
  - `doctorResult` → `{ id: "doctor-uid", ... }`
  - `consultationResult` → `{ id: 12, state: "IN_PROGRESS", notes: { structured: {...} }, ... }`
- **State mutations:** `appointment` set, `doctorId` set, `consultation` set

---

## T5 — Parallel API Batch 2
- **Action:** `Promise.all([loadPatient(patientId), getPatientVitals(patientId, 5)])`
- **Results:**
  - `patientResult` → `{ id: "xyz", firstName: "Carl", lastName: "Consult", ... }`
  - `vitalsResult` → `[{ systolic: 120, diastolic: 80, ... }]`
- **State mutations:** `patient` set, `vitals` set

---

## T6 — Draft Restore
- **Action:** `draftService.restoreDraft(5, consultation.updatedAt)`
- **Result:** `null` (no draft) or `{ structured: {...}, ... }`
- **State mutations:**
  - If draft found: `notes = draftRecord.structured`, `isDirty = true`
  - Else: `notes = consultation.notes.structured` or parsed from fullText

---

## T7 — Outcome Fields Extract
- **Action:** Read from consultation record
- **State mutations:**
  - `outcomeType = consultation.outcomeType ?? null`
  - `patientDecision = consultation.patientDecision ?? null`

---

## T8 — Workflow State Determination
- **Action:** `determineInitialWorkflowState(appointment, consultation)`
- **Logic:** `IN_CONSULTATION` status + `IN_PROGRESS` state → `ConsultationWorkflowState.ACTIVE`
- **State mutation:** `workflowState` set to `ACTIVE`

---

## T9 — SessionData Assembly
- **Action:** `buildSessionData(...)` returns immutable snapshot
- **Fields:**
  - `appointment`, `patient`, `vitals`, `consultation`, `doctorId` — from APIs
  - `workflowState: ACTIVE`
  - `isDirty: false` (or `true` if draft restored)
  - `draftAvailable: false`
  - `notes`, `outcomeType`, `patientDecision` — from consultation or draft

---

## T10 — SessionProvider State Update
- **Action:** `setAppointment`, `setPatient`, `setVitals`, `setConsultation`, `setDoctorId`, `setNotes`, `setOutcomeType`, `setPatientDecision`, `setWorkflowState`, `setIsReady(true)`
- **Effect:** All child provider props change simultaneously

---

## T11 — DocumentationProvider Sync
- **Trigger:** `consultationId` prop changes from `null` → `12`
- **Guard:** `consultationId !== lastSyncedConsultationIdRef.current` → passes on first change only
- **Action:** `dispatch(SET_NOTES)`, `dispatch(SET_OUTCOME)`, `dispatch(SET_PATIENT_DECISION)` if values differ
- **State:** Internal reducer state now mirrors session notes

---

## T12 — PatientContextProvider Sync
- **Trigger:** `patient`, `appointment`, `vitals`, `isLoading`, `error` props change
- **Actions:** 5 separate `useEffect` hooks dispatch to reducer
- **State:** Internal reducer state mirrors SessionProvider state

---

## T13 — CompatibilityAdapter Recompute
- **Trigger:** Any session/docs/dialog/queue dependency changed
- **Actions:**
  - `useMemo(workflow)` recomputes (depends on `session.workflowState`, `session.error`, `docs.isDirty`, `docs.lastSavedAt`, etc.)
  - `useMemo(state)` recomputes (depends on 11 fields)
  - `useMemo(value)` recomputes (depends on 19 callbacks + state)
- **State:** New `ConsultationContext.Provider` value with fresh object references

---

## T14 — ConsultationSessionContent Render
- **Decision tree:**
  1. `patient.isLoading && !patient.appointment` → `LoadingState` ❌ Not taken
  2. `state.workflow.error` → Error screen ❌ Not taken (no error)
  3. `!patient.appointment || !patient.patient` → `NoPatientState` ❌ Not taken
  4. → Full consultation room ✅

---

## T15 — Full Consultation Room Render
- **Components rendered:**
  - `ConsultationSessionHeader` ( Suspense fallback → dynamic import )
  - `PatientInfoSidebar` ( dynamic import )
  - `ConsultationWorkspaceOptimized` ( dynamic import )
  - `ConsultationQueuePanel` ( dynamic import )
- **Sub-renders:**
  - `useDocumentationContext()` → reads notes, outcomeType, patientDecision
  - `usePatientContext()` → reads patient, appointment, vitals
  - `useQueueContext()` → reads waitingQueue, refetchQueue
  - `useDialogContext()` → reads dialog flags

---

## Timeline Summary

| Time | Event | State Changes | Barrier |
|------|-------|---------------|---------|
| T0 | Bundle compilation | — | **OOM CRASH** |
| T1 | Auth resolves | user: null → StoredUser | — |
| T2 | SessionProvider mount | All providers initialized | — |
| T3 | Init effect fires | isInitializing=true | — |
| T4 | APIs batch 1 | appointment, doctorId, consultation | — |
| T5 | APIs batch 2 | patient, vitals | — |
| T6 | Draft restore | notes, isDirty | — |
| T7 | Outcome extract | outcomeType, patientDecision | — |
| T8 | Workflow compute | workflowState=ACTIVE | — |
| T9 | SessionData build | session snapshot | — |
| T10 | State batch update | 9 setters called | — |
| T11 | Docs sync | notes/outcome/decision in reducer | — |
| T12 | Patient sync | patient/appointment/vitals in reducer | — |
| T13 | Adapter recompute | workflow, state, value memos | — |
| T14 | Render decision | Loading → Error → NoPatient → Room | — |
| T15 | Room renders | Header, sidebar, workspace, queue | — |
