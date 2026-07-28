# Runtime Sequence Verification

## Executive Summary

This document produces runtime sequence diagrams for all consultation feature mutation flows. Every server/client boundary crossing is highlighted.

**Date:** 2026-07-26  
**Status:** 4 SEQUENCES VERIFIED, 4 VIOLATIONS DOCUMENTED

---

## 1. Initialize Sequence

```mermaid
sequenceDiagram
    participant C as Client (Server Component)
    participant SA as Server Action
    participant F as Factory
    participant S as SessionService
    participant W as WorkflowCoordinator
    participant WE as WorkflowEngine
    participant E as EventBus

    C->>SA: initializeSession(appointmentId)
    SA->>F: createConsultationSession(...)
    F->>F: createSessionServiceContainer()
    F->>S: new SessionService(...)
    S->>W: new WorkflowCoordinator(...)
    W->>WE: new WorkflowEngine(...)
    F->>S: initializeSession()
    S->>W: execute(INITIALIZE_CONSULTATION)
    W->>WE: evaluate()
    WE->>WE: transition()
    WE->>E: publish(ConsultationInitialized)
    E-->>W: ack
    W-->>S: result
    S-->>F: session
    F-->>SA: session
    SA-->>C: ActionResult<session>
    C->>C: Hydrate SessionProvider
    C->>C: setAppointment, setPatient, setWorkflowState, setIsReady
```

**Boundary Crossings:** 1 (Client → Server Action)  
**Status:** ✅ MIGRATED

---

## 2. Start Sequence

```mermaid
sequenceDiagram
    participant UI as ConsultationSessionHeader
    participant SP as SessionProvider
    participant SA as Server Action
    participant F as Factory
    participant S as SessionService
    participant W as WorkflowCoordinator
    participant WE as WorkflowEngine
    participant Q as QueryClient

    UI->>SP: onClick: startConsultation()
    SP->>SA: startSession(appointmentId, doctorId)
    SA->>F: startConsultationSession(...)
    F->>F: createSessionServiceContainer()
    F->>S: new SessionService(...)
    S->>W: new WorkflowCoordinator(...)
    W->>WE: new WorkflowEngine(...)
    F->>S: startSession()
    S->>W: execute(START_CONSULTATION)
    W->>WE: evaluate()
    WE->>WE: transition()
    WE->>E: publish(ConsultationStarted)
    W-->>S: result
    S-->>F: session
    F-->>SA: session
    SA-->>SP: ActionResult<session>
    SP->>SP: setAppointment, setPatient, setWorkflowState, setIsReady
    SP->>Q: invalidateQueries(['doctor', userId, 'appointments'])
```

**Boundary Crossings:** 1 (Provider → Server Action)  
**Status:** ✅ MIGRATED

---

## 3. Resume Sequence

```mermaid
sequenceDiagram
    participant UI as ConsultationSessionContent
    participant SP as SessionProvider
    participant SA as Server Action
    participant F as Factory
    participant S as SessionService
    participant W as WorkflowCoordinator
    participant WE as WorkflowEngine

    UI->>SP: onClick: resumeSession()
    SP->>SA: resumeSession(consultationId)
    SA->>F: resumeConsultationSession(...)
    F->>F: createSessionServiceContainer()
    F->>S: new SessionService(...)
    S->>W: new WorkflowCoordinator(...)
    W->>WE: new WorkflowEngine(...)
    F->>S: resumeSession()
    S->>W: execute(START_CONSULTATION)
    W->>WE: evaluate()
    WE->>WE: transition()
    WE->>E: publish(ConsultationResumed)
    W-->>S: result
    S-->>F: session
    F-->>SA: session
    SA-->>SP: ActionResult<session>
    SP->>SP: setAppointment, setPatient, setWorkflowState, setIsReady
```

**Boundary Crossings:** 1 (Provider → Server Action)  
**Status:** ✅ MIGRATED

---

## 4. Complete Sequence

### 4.1 Current (VIOLATION)

```mermaid
sequenceDiagram
    participant UI as CompleteConsultationDialog
    participant A as doctorApi
    participant H as HTTP
    participant R as Route Handler
    participant P as PrismaRepositories
    participant WE as WorkflowEngine

    UI->>A: doctorApi.completeConsultation(dto)
    A->>H: POST /api/consultations/[id]/complete
    H->>R: Route Handler
    R->>P: Query/update database
    P-->>R: result
    R->>WE: execute(COMPLETE_CONSULTATION) [if wired]
    R-->>H: JSON response
    H-->>A: response
    A-->>UI: { success, data }
    UI->>UI: toast.success(), onSuccess()
```

**Boundary Crossings:** 1 (Client → Route Handler) — bypasses Server Action  
**Status:** 🚨 VIOLATION

### 4.2 Expected (After Fix)

```mermaid
sequenceDiagram
    participant UI as CompleteConsultationDialog
    participant SA as Server Action
    participant F as Factory
    participant S as SessionService
    participant W as WorkflowCoordinator
    participant WE as WorkflowEngine
    participant E as EventBus

    UI->>SA: completeSession(consultationId)
    SA->>F: completeConsultationSession(...)
    F->>F: createSessionServiceContainer()
    F->>S: new SessionService(...)
    S->>W: new WorkflowCoordinator(...)
    W->>WE: new WorkflowEngine(...)
    F->>S: completeSession()
    S->>W: execute(COMPLETE_CONSULTATION)
    W->>WE: evaluate()
    WE->>WE: transition()
    WE->>E: publish(ConsultationCompleted)
    WE->>E: publish(DraftDiscarded)
    W-->>S: result
    S-->>F: result
    F-->>SA: CompleteSessionResult
    SA-->>UI: ActionResult<result>
    UI->>UI: router.push(redirectPath)
```

**Boundary Crossings:** 1 (UI → Server Action)  
**Status:** ✅ EXPECTED

---

## 5. Switch Patient Sequence

### 5.1 Current (VIOLATION)

```mermaid
sequenceDiagram
    participant UI as ConsultationQueuePanel
    participant A as doctorApi
    participant H as HTTP
    participant R as Route Handler

    UI->>UI: onSaveDraft() (if dirty)
    UI->>A: doctorApi.startConsultation({appointmentId, doctorId, userId})
    A->>H: POST /api/consultations/[id]/start
    H->>R: Route Handler
    R-->>H: JSON response
    H-->>A: response
    A-->>UI: { success, data }
    UI->>UI: onSwitchPatient(appointmentId) OR router.push(...)
```

**Boundary Crossings:** 1 (Client → Route Handler) — bypasses Server Action  
**Status:** 🚨 VIOLATION

### 5.2 Expected (After Fix)

```mermaid
sequenceDiagram
    participant UI as ConsultationQueuePanel
    participant SP as SessionProvider
    participant SA as Server Action
    participant F as Factory
    participant S as SessionService
    participant W as WorkflowCoordinator
    participant WE as WorkflowEngine

    UI->>SP: onClick: switchToPatient(appointmentId)
    SP->>SA: switchToPatient(fromId, toId)
    SA->>F: switchPatientSession(...)
    F->>F: createSessionServiceContainer()
    F->>S: new SessionService(...)
    S->>W: new WorkflowCoordinator(...)
    W->>WE: new WorkflowEngine(...)
    F->>S: switchSession()
    S->>W: execute(SWITCH_PATIENT)
    W->>WE: evaluate()
    WE->>WE: transition()
    WE->>E: publish(PatientSwitched)
    W-->>S: result
    S-->>F: nextSession
    F-->>SA: nextSession
    SA-->>SP: ActionResult<nextSession>
    SP->>SP: setAppointment, setPatient, setWorkflowState, setIsReady
```

**Boundary Crossings:** 1 (Provider → Server Action)  
**Status:** ✅ EXPECTED

---

## 6. Heartbeat Sequence

```mermaid
sequenceDiagram
    participant SP as SessionProvider
    participant SA as Server Action
    participant F as Factory
    participant S as SessionService

    SP->>SP: useEffect: setInterval(sendHeartbeat, 30000)
    SP->>SA: sendHeartbeat(consultationId)
    SA->>F: sendHeartbeatSession(...)
    F->>F: createSessionServiceContainer()
    F->>S: new SessionService(...)
    F->>S: sendHeartbeat()
    S->>S: Update lastHeartbeatAt
    S-->>F: void
    F-->>SA: void
    SA-->>SP: ActionResult<void>
```

**Boundary Crossings:** 1 (Provider → Server Action)  
**Status:** ⚠️ STUBBED — boundary exists

---

## 7. Save Draft Sequence

```mermaid
sequenceDiagram
    participant UI as ConsultationSessionHeader
    participant DP as DocumentationProvider
    participant SA as Server Action
    participant F as Factory
    participant DS as DraftService

    UI->>DP: onClick: saveDraft()
    DP->>DP: dispatch({ type: 'SET_SAVING', payload: true })
    DP->>SA: saveDraft(consultationId, doctorId, notes, outcomeType, patientDecision)
    SA->>F: saveDraftSession(...)
    F->>F: createSessionServiceContainer()
    F->>DS: new DraftService(...)
    F->>DS: saveDraft(...)
    DS->>DS: Persist to storage
    DS-->>F: { version }
    F-->>SA: { version }
    SA-->>DP: ActionResult<{ version }>
    DP->>DP: dispatch({ type: 'SET_DIRTY', payload: false })
    DP->>DP: dispatch({ type: 'SET_LAST_SAVED', payload: version })
    DP->>DP: dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' })
```

**Boundary Crossings:** 1 (Provider → Server Action)  
**Status:** ⚠️ STUBBED — boundary exists

---

## 8. Save Notes Sequence

```mermaid
sequenceDiagram
    participant UI as ConsultationWorkspaceOptimized
    participant DP as DocumentationProvider
    participant SA as Server Action
    participant F as Factory

    UI->>DP: onClick: handleSave()
    DP->>DP: dispatch({ type: 'SET_SAVING', payload: true })
    DP->>SA: saveCompletedNotes(consultationId, doctorId, notes)
    SA->>F: saveCompletedNotesSession(...)
    F->>F: createSessionServiceContainer()
    F->>F: Persist notes
    F-->>SA: { version }
    SA-->>DP: ActionResult<{ version }>
    DP->>DP: dispatch({ type: 'SET_DIRTY', payload: false })
    DP->>DP: dispatch({ type: 'SET_LAST_SAVED', payload: version })
    DP->>DP: dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' })
```

**Boundary Crossings:** 1 (Provider → Server Action)  
**Status:** ⚠️ STUBBED — boundary exists

---

## 9. Certification

| Sequence | Boundary Crossings | Status |
|----------|-------------------|--------|
| Initialize | 1 Client → Server Action | ✅ MIGRATED |
| Start | 1 Provider → Server Action | ✅ MIGRATED |
| Resume | 1 Provider → Server Action | ✅ MIGRATED |
| Complete | 1 Client → Route Handler (VIOLATION) | 🚨 NOT MIGRATED |
| Switch | 1 Client → Route Handler (VIOLATION) | 🚨 NOT MIGRATED |
| Heartbeat | 1 Provider → Server Action (STUB) | ⚠️ STUBBED |
| Save Draft | 1 Provider → Server Action (STUB) | ⚠️ STUBBED |
| Save Notes | 1 Provider → Server Action (STUB) | ⚠️ STUBBED |

**Verdict: 4 MIGRATED, 2 VIOLATIONS, 2 STUBBED**
