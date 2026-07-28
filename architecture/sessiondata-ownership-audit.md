# SessionData Ownership Audit

## Executive Summary

Complete ownership analysis of every `SessionData` property across all `SessionService` methods. Identifies which fields belong to session orchestration vs. documentation, and determines the correct source for each.

**Date:** 2026-07-25  
**Status:** AUDIT COMPLETE

---

## 1. SessionData Property Ownership Table

| Property | Type | Source / Owner | initializeSession | startSession | resumeSession | switchSession | completeSession |
|----------|------|----------------|-------------------|--------------|---------------|---------------|-----------------|
| `appointment` | `AppointmentResponseDto` | SessionService → `doctorApi.getAppointment()` | ✅ Fetch | ✅ Fetch | ✅ Fetch | ✅ Delegates to init | ❌ Not needed |
| `patient` | `PatientResponseDto` | SessionService → `patientApi.loadPatient()` | ✅ Fetch | ✅ Fetch | ✅ Fetch | ✅ Delegates to init | ❌ Not needed |
| `vitals` | `VitalsData \| null` | SessionService → `patientApi.getPatientVitals()` | ✅ Fetch | ❌ Not fetched | ❌ Not fetched | ✅ Delegates to init | ❌ Not needed |
| `consultation` | `ConsultationResponseDto \| null` | SessionService → `consultationApi.loadConsultation()` | ✅ Fetch | ✅ Fetch | ✅ Fetch | ✅ Delegates to init | ✅ Fetch |
| `doctorId` | `string` | SessionService → `doctorApi.getDoctorByUserId()` | ✅ Fetch | ✅ Parameter | ❌ Not fetched | ✅ Delegates to init | ❌ Derived from consultation |
| `workflowState` | `ConsultationWorkflowState` | WorkflowCoordinator | ✅ Execute INITIALIZE_CONSULTATION | ✅ Execute START_CONSULTATION | ✅ Execute START_CONSULTATION | ✅ Execute SWITCH_PATIENT | ✅ Execute COMPLETE_CONSULTATION |
| `isDirty` | `boolean` | DraftService / DocumentationProvider | ✅ From draft restore | ❌ Not set | ❌ Not set | ✅ Delegates to init | ❌ Not needed |
| `draftAvailable` | `boolean` | DraftService | ✅ Set to false | ❌ Not set | ❌ Not set | ✅ Set to false | ❌ Not needed |
| `notes` | `StructuredNotes` | **DocumentationProvider / DraftService** | ✅ Read from consultation + draft restore | ❌ **MISSING** | ❌ **MISSING** | ✅ Delegates to init | ❌ Not needed |
| `outcomeType` | `ConsultationOutcomeType \| null` | **DocumentationProvider** | ✅ Read from consultation | ❌ **MISSING** | ❌ **MISSING** | ✅ Delegates to init | ❌ Not needed |
| `patientDecision` | `PatientDecision \| null` | **DocumentationProvider** | ✅ Read from consultation | ❌ **MISSING** | ❌ **MISSING** | ✅ Delegates to init | ❌ Not needed |

---

## 2. Architectural Ownership Determination

### 2.1 SessionService Owns (Session Orchestration)

| Field | Justification |
|-------|---------------|
| `appointment` | Core session entity, fetched via doctor API |
| `patient` | Core session entity, fetched via patient API |
| `vitals` | Clinical data tied to session, fetched via patient API |
| `consultation` | Consultation record, fetched via consultation API |
| `doctorId` | Derived from doctor lookup, needed for session identity |
| `workflowState` | Requested from WorkflowCoordinator, session lifecycle |
| `isDirty` | Session metadata from draft restore |
| `draftAvailable` | Session metadata from draft service |

### 2.2 DocumentationProvider Owns (Documentation State)

| Field | Justification |
|-------|---------------|
| `notes` | Primary owner. `DocumentationProvider` manages notes state, autosave, dirty tracking. `SessionService` only reads initial value from consultation record. |
| `outcomeType` | Primary owner. `DocumentationProvider` manages outcome selection. `SessionService` only reads initial value from consultation record. |
| `patientDecision` | Primary owner. `DocumentationProvider` manages patient decision. `SessionService` only reads initial value from consultation record. |

### 2.3 WorkflowCoordinator Owns (State Machine)

| Field | Justification |
|-------|---------------|
| `workflowState` | The `WorkflowCoordinator` is the sole authority for workflow state transitions. `SessionService` requests transitions via commands. |

### 2.4 Presentation Owns (UI State)

| Field | Justification |
|-------|---------------|
| `showCompleteDialog` | `DialogProvider` owns dialog visibility |
| `showStartDialog` | `DialogProvider` owns dialog visibility |
| `canSave` | Derived in `ConsultationContext` from `docs.isDirty` |
| `canComplete` | Derived in `ConsultationContext` from `isActive && !isSaving` |

---

## 3. Ownership Rules

### 3.1 Rule 1: SessionService Reads, DocumentationProvider Owns

`SessionService` may **read** `notes`, `outcomeType`, and `patientDecision` from the `Consultation` record during initialization, but it does not **own** these fields. It passes them through `SessionData` as initial values. After initialization, `DocumentationProvider` owns and manages these fields.

### 3.2 Rule 2: No Duplicate State Ownership

`SessionService` must not maintain independent copies of documentation state. Any `notes`/`outcomeType`/`patientDecision` values in `SessionData` are transient carriers of the consultation record's initial values.

### 3.3 Rule 3: buildSessionData() Carries Initial Values, Not Live State

`buildSessionData()` constructs a snapshot of session state at a point in time. Documentation fields in this snapshot represent the consultation record's values at initialization, not the current live values managed by `DocumentationProvider`.

---

## 4. Field-by-Field Audit

### 4.1 appointment

- **Owner:** SessionService
- **Fetched by:** `doctorApi.getAppointment()`
- **Required by ALL session methods:** Yes
- **Verdict:** Core session field. Correctly owned by SessionService.

### 4.2 patient

- **Owner:** SessionService
- **Fetched by:** `patientApi.loadPatient()`
- **Required by ALL session methods:** Yes
- **Verdict:** Core session field. Correctly owned by SessionService.

### 4.3 vitals

- **Owner:** SessionService
- **Fetched by:** `patientApi.getPatientVitals()`
- **Required by:** `initializeSession` only
- **Verdict:** Session field. `startSession` and `resumeSession` don't refetch vitals because the patient hasn't changed. Current behavior is correct.

### 4.4 consultation

- **Owner:** SessionService
- **Fetched by:** `consultationApi.loadConsultation()`
- **Required by:** `initializeSession`, `startSession`, `resumeSession`, `completeSession`
- **Verdict:** Core session field. Correctly owned by SessionService.

### 4.5 doctorId

- **Owner:** SessionService
- **Derived from:** `doctorApi.getDoctorByUserId()`
- **Required by:** `initializeSession`, `startSession`
- **Verdict:** Core session field. Correctly owned by SessionService.

### 4.6 workflowState

- **Owner:** WorkflowCoordinator (requested by SessionService)
- **Transitioned by:** SessionService via command execution
- **Required by:** ALL session methods
- **Verdict:** Session lifecycle field. SessionService correctly requests state transitions from the coordinator.

### 4.7 notes ⚠️

- **Owner:** DocumentationProvider
- **Read by:** SessionService from consultation record during init
- **Required by:** `initializeSession` ✅, `startSession` ❌ MISSING, `resumeSession` ❌ MISSING
- **Verdict:** DocumentationProvider owns this field. SessionService only reads it to pass as initial state. `startSession` and `resumeSession` must read it from the consultation record they already fetch.

### 4.8 outcomeType ⚠️

- **Owner:** DocumentationProvider
- **Read by:** SessionService from consultation record during init
- **Required by:** `initializeSession` ✅, `startSession` ❌ MISSING, `resumeSession` ❌ MISSING
- **Verdict:** DocumentationProvider owns this field. SessionService only reads it to pass as initial state. `startSession` and `resumeSession` must read it from the consultation record they already fetch.

### 4.9 patientDecision ⚠️

- **Owner:** DocumentationProvider
- **Read by:** SessionService from consultation record during init
- **Required by:** `initializeSession` ✅, `startSession` ❌ MISSING, `resumeSession` ❌ MISSING
- **Verdict:** DocumentationProvider owns this field. SessionService only reads it to pass as initial state. `startSession` and `resumeSession` must read it from the consultation record they already fetch.

---

## 5. Recommendations

### 5.1 For notes, outcomeType, patientDecision

These fields belong to `DocumentationProvider`. `SessionService` should:
1. **Read** them from the consultation record when available (not duplicate or invent)
2. **Pass** them through `SessionData` as initial values
3. **Not** maintain independent state for these fields

### 5.2 For startSession() and resumeSession()

These methods already fetch the `consultation` record. They should extract `notes`, `outcomeType`, and `patientDecision` from the fetched consultation data before calling `buildSessionData()`. This is not duplicating ownership — it's reading from the authoritative source (consultation record) and passing values through the session pipeline.

### 5.3 For buildSessionData()

`buildSessionData()` is a **session state carrier DTO**, not a God DTO. It correctly carries all fields needed by `SessionProvider` to initialize its state and pass to child providers. However, documentation fields (`notes`, `outcomeType`, `patientDecision`) should be clearly marked as "initial values only" in the type definition.

---

## 6. Certification

**Status:** AUDIT COMPLETE

- `notes`, `outcomeType`, `patientDecision` are **required** during `startSession()` and `resumeSession()` because `SessionProvider` passes them to `DocumentationProvider`
- These fields belong to **DocumentationProvider**, but `SessionService` correctly reads them from the consultation record and passes them through
- The fix is to **declare and initialize** these variables in `startSession()` and `resumeSession()` from the consultation data they already fetch
- No ownership duplication occurs — this is read-through, not state duplication
