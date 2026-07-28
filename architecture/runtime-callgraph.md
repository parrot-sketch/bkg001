# Runtime Call Graph — Consultation Room

## Entry Point

`app/doctor/consultations/session/[appointmentId]/page.tsx`
- `'use client'` — forces Turbopack to bundle this route entirely for the browser
- Dynamic imports for heavy UI shells (header, sidebar, workspace, queue, dialogs)
- Static imports for ALL provider infrastructure

## Static Import Chain (Unbroken to Client)

```
page.tsx
 ├─ ConsultationContext.tsx
 │   └─ SessionProvider.tsx
 │       ├─ SessionService.ts
 │       │   └─ WorkflowCoordinator.ts
 │       │       ├─ WorkflowEngine.ts
 │       │       │   └─ DefaultGuardRegistry.ts
 │       │       │       ├─ guards/loadGuards.ts
 │       │       │       ├─ guards/consultationFlowGuards.ts
 │       │       │       ├─ guards/pauseResumeCancelGuards.ts
 │       │       │       ├─ guards/navigationGuards.ts
 │       │       │       ├─ guards/completionGuards.ts
 │       │       │       ├─ guards/conflictGuards.ts
 │       │       │       ├─ guards/restoreGuards.ts
 │       │       │       └─ guards/retryGuards.ts
 │       │       ├─ SideEffectRegistry.ts
 │       │       └─ SideEffectDispatcher.ts
 │       ├─ DraftService.ts
 │       ├─ BillingProvider.tsx
 │       ├─ DialogProvider.tsx
 │       ├─ TimerContextProvider.tsx
 │       ├─ QueueContextProvider.tsx
 │       ├─ PatientContextProvider.tsx
 │       └─ DocumentationProvider.tsx
 ├─ useDocumentationContext → DocumentationProvider.tsx
 ├─ usePatientContext → PatientContextProvider.tsx
 ├─ useQueueContext → QueueContextProvider.tsx
 └─ useDialogContext → DialogProvider.tsx
```

## Execution Graph (Successful Compilation Path)

```
Browser navigation to /doctor/consultations/session/5
 │
 ├─ page.tsx module evaluation
 │   └─ all static imports resolved
 │       └─ Turbopack builds module graph for client entry
 │           └─ ~2,500+ lines application/domain code + 76 guard files pulled into client chunk
 │               └─ HEAP EXHAUSTED → OOM → compilation abort
 │
 └─ [UNREACHABLE] Runtime execution would proceed as:
     ├─ ConsultationSessionPageOptimized renders
     │   └─ useAuth() resolves user from AuthContext
     │   └─ ConsultationProvider renders
     │       └─ SessionProvider renders
     │           ├─ useMemo: create HttpPatientApi, HttpConsultationApi, HttpDoctorApi
     │           ├─ useMemo: create LocalStorageDraftStorage, DraftService
     │           ├─ useMemo: create WorkflowEngine + WorkflowCoordinator
     │           │   └─ new DefaultGuardRegistry() → registers 76 guard functions
     │           ├─ useMemo: create SessionService(coordinator, ...)
     │           ├─ compute docsProps, patientProps, queueProps, timerProps
     │           └─ return nested providers
     │
     ├─ useEffect #1 fires (initialization)
     │   ├─ guard: isReady=false, isInitializing=false, initializationAttempted=false
     │   ├─ workflowEngineRef.current.updateContext({ appointmentId, user })
     │   └─ sessionService.initializeSession(5, userId)
     │       ├─ Promise.all([
     │       │     doctorApi.getAppointment(5),
     │       │     doctorApi.getDoctorByUserId(userId),
     │       │     consultationApi.loadConsultation(5)
     │       │   ])
     │       ├─ Promise.all([
     │       │     patientApi.loadPatient(patientId),
     │       │     patientApi.getPatientVitals(patientId, 5)
     │       │   ])
     │       ├─ draftService.restoreDraft(5, consultation?.updatedAt)
     │       ├─ determineInitialWorkflowState(appointment, consultation)
     │       └─ return SessionInitializationResult
     │
     ├─ SessionProvider sets state (setAppointment, setPatient, setVitals, etc.)
     │   └─ setWorkflowState(READY or ACTIVE)
     │   └─ setIsReady(true)
     │
     ├─ Child providers re-render with new props
     │   ├─ DocumentationProvider useEffect syncs notes/outcome/patientDecision
     │   ├─ PatientContextProvider effects sync patient/appointment/vitals/loading/error
     │   └─ QueueContextProvider re-renders (queue not yet loaded)
     │
     ├─ CompatibilityAdapter recomputes
     │   ├─ useMemo(workflow) — maps session.workflowState + session.error + docs state
     │   ├─ useMemo(state) — aggregates all session + docs + dialog + queue fields
     │   └─ useMemo(value) — builds ConsultationContextValue
     │
     ├─ ConsultationSessionContent render decision
     │   ├─ if (patient.isLoading && !patient.appointment) → LoadingState
     │   ├─ if (state.workflow.error) → Error screen
     │   ├─ if (!patient.appointment || !patient.patient) → NoPatientState
     │   └─ else → Full consultation room renders
     │
     └─ Consultation room renders
         ├─ ConsultationSessionHeader
         ├─ PatientInfoSidebar
         ├─ ConsultationWorkspaceOptimized
         └─ ConsultationQueuePanel
```

## First Failure Point

**Failure:** Turbopack compilation OOM
**Location:** Module graph analysis for `page.tsx` client entry
**Trigger:** Static import of `SessionProvider` → `SessionService` → `WorkflowCoordinator` → `WorkflowEngine` → `DefaultGuardRegistry` → 76 guard files
**Effect:** Dev server process crashes with `JavaScript heap out of memory` at ~3.9GB heap usage
**Reachability:** Happens before ANY runtime code executes. The page never reaches React rendering.

## Critical Path Length

- `page.tsx` → `SessionProvider` → `SessionService` → `WorkflowCoordinator` → `WorkflowEngine` → `DefaultGuardRegistry` = **6 package boundaries** before reaching guard modules
- All boundaries are static imports with no lazy loading or code splitting
- Dynamic imports (`next/dynamic`) only defer UI components, NOT providers or services
