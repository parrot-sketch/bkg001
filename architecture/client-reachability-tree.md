# Client Reachability Tree

## Entry Point
`app/doctor/consultations/session/[appointmentId]/page.tsx` — `'use client'` (452 LOC)

---

## Tree: page.tsx → ConsultationProvider → SessionProvider → SessionService → WorkflowCoordinator

```
app/doctor/consultations/session/[appointmentId]/page.tsx:6
  import { ConsultationProvider, useConsultationContext } from '@/contexts/ConsultationContext'
  ↓
contexts/ConsultationContext.tsx:11
  import { SessionProvider, useSessionContext } from '@/providers/session/SessionProvider'
  ↓
providers/session/SessionProvider.tsx:40
  import { SessionService } from '@/application/services/SessionService'
  ↓
application/services/SessionService.ts:22
  import { WorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinator'
  ↓
application/orchestrators/WorkflowCoordinator.ts:25
  import type { WorkflowCommand } from '@/domain/workflows/WorkflowCommand'
  ↓
domain/workflows/WorkflowCommand.ts (99 LOC)

application/orchestrators/WorkflowCoordinator.ts:26
  import type { WorkflowCoordinatorDependencies } from './WorkflowCoordinatorDependencies'
  ↓
application/orchestrators/WorkflowCoordinatorDependencies.ts:13
  import type { WorkflowEngine } from '@/domain/workflows/WorkflowEngine'
  ↓
domain/workflows/WorkflowEngine.ts:508 LOC
    ├─ line 22: imports ConsultationWorkflowStateMachine (260 LOC)
    ├─ line 23: imports ConsultationWorkflowStateMachine (duplicate re-import in tree, same module)
    ├─ line 24: imports DocumentationWorkflowStateMachine (213 LOC)
    ├─ line 25: imports DocumentationWorkflowStateMachine (duplicate re-import)
    ├─ line 26: imports GuardContext (56 LOC)
    ├─ line 27: imports GuardRegistry (28 LOC)
    ├─ line 28: imports WorkflowCommand (99 LOC) [already in tree]
    ├─ line 29: imports WorkflowDecision (55 LOC)
    ├─ line 30: imports WorkflowError (192 LOC)
    ├─ line 31: imports WorkflowEvent (150 LOC)
    ├─ line 32: imports WorkflowExecutionResult (28 LOC)
    ├─ line 33: imports WorkflowMetadata (63 LOC)
    ├─ line 34: imports WorkflowSideEffect (111 LOC)
    ├─ line 43: imports WorkflowCommandHandler (148 LOC)
    ├─ line 44: imports WorkflowGuardEngine (102 LOC)
    ├─ line 45: imports WorkflowError (duplicate re-import)
    ├─ line 46: imports WorkflowError (duplicate re-import)
    ├─ line 47: imports WorkflowError (duplicate re-import)
    ├─ line 48: imports WorkflowDecision (55 LOC) [already in tree]
    ├─ line 49: imports WorkflowDecision (duplicate re-import)
    ├─ line 50: imports WorkflowMetadata (63 LOC) [already in tree]
    ├─ line 51: imports WorkflowCommand (99 LOC) [already in tree]
    └─ [constructor body runs at module load, not import time — see Initializer Audit]
  ↓
domain/workflows/DefaultGuardRegistry.ts:315 LOC [via SessionProvider.tsx:52 directly, AND via WorkflowCoordinatorFactory.ts:11]
  import { registerAllGuards } from './guard-registry' (internal)
  ↓
domain/workflows/guards/
  loadGuards.ts (109 LOC, 11 guards)
  consultationFlowGuards.ts (188 LOC, 20 guards)
  pauseResumeCancelGuards.ts (73 LOC, 8 guards)
  navigationGuards.ts (72 LOC, 12 guards)
  completionGuards.ts (109 LOC, 11 guards)
  conflictGuards.ts (65 LOC, 4 guards)
  restoreGuards.ts (60 LOC, 5 guards)
  retryGuards.ts (77 LOC, 5 guards)
  TOTAL: 762 LOC, 76 guards
```

---

## Tree: SessionProvider → Infrastructure Adapters

```
providers/session/SessionProvider.tsx:43
  import { HttpPatientApi } from '@/lib/api/patient-adapter'
  ↓
lib/api/patient-adapter.ts (108 LOC)
  ├─ line 19: imports PatientApi interface
  ├─ line 20: imports patient API methods
  ├─ line 21: imports doctor API methods
  ├─ line 22: imports client.ts
  └─ line 23: imports adapter-utils.ts
  ↓
lib/api/patient.ts (133 LOC)
  ├─ line 7: imports client.ts
  ├─ line 8: imports PatientResponseDto
  ├─ line 9: imports AppointmentResponseDto
  ├─ line 10: imports CreatePatientDto
  ├─ line 11: imports ScheduleAppointmentDto
  ├─ line 12: imports CheckInPatientDto
  ├─ line 13: imports DoctorResponseDto
  └─ line 14: imports SubmitConsultationRequestDto
  ↓
lib/api/doctor.ts (336 LOC)
  ├─ line 10: imports StartConsultationDto
  ├─ line 11: imports CompleteConsultationDto
  │   └─ line 1: imports ConsultationOutcomeType
  │   └─ line 2: imports PatientDecision
  ├─ line 14: imports ConfirmAppointmentDto
  └─ line 15: imports AvailableSlotResponseDto

providers/session/SessionProvider.tsx:44
  import { HttpConsultationApi } from '@/lib/api/consultation-adapter'
  ↓
lib/api/consultation-adapter.ts (84 LOC)
  ├─ line 19: imports ConsultationApi
  ├─ line 20: imports consultation API methods
  │   └─ line 9: imports ConsultationResponseDto
  │       └─ line 14: imports ConsultationState
  │       └─ line 15: imports ConsultationOutcomeType
  │       └─ line 16: imports PatientDecision
  │   └─ line 10: imports PatientConsultationHistoryDto
  │       └─ line 16: imports ConsultationState
  │       └─ line 17: imports ConsultationOutcomeType
  │       └─ line 18: imports PatientDecision
  ├─ line 21: imports client.ts
  └─ line 22: imports adapter-utils.ts

providers/session/SessionProvider.tsx:45
  import { HttpDoctorApi } from '@/lib/api/doctor-adapter'
  ↓
lib/api/doctor-adapter.ts (108 LOC)
  ├─ line 18: imports DoctorApi
  ├─ line 19: imports PatientApi (duplicate import, same module)
  ├─ line 20: imports PatientApi (duplicate import)
  ├─ line 21: imports doctor API methods (lib/api/doctor.ts, already in tree)
  ├─ line 22: imports client.ts
  ├─ line 23: imports adapter-utils.ts
  └─ line 24: imports errors/types.ts

providers/session/SessionProvider.tsx:46
  import { LocalStorageDraftStorage } from '@/lib/storage/local-storage-draft'
  ↓
lib/storage/local-storage-draft.ts (187 LOC)
  ├─ line 25: imports DraftStorage interface
  └─ line 29: imports draft-serialization utils

providers/session/SessionProvider.tsx:47
  import { DraftService } from '@/application/services/DraftService'
  ↓
application/services/DraftService.ts (151 LOC)
  ├─ line 17: imports ConsultationApi
  ├─ line 18: imports DraftStorage interface
  ├─ line 19: imports DraftStorage interface (duplicate)
  ├─ line 20: imports ClinicalErrorCode
  ├─ line 21: imports ClinicalError types
  ├─ line 22: imports ConsultationOutcomeType
  ├─ line 23: imports PatientDecision
  ├─ line 24: imports SaveConsultationDraftDto
  ├─ line 25: imports StructuredNotes type
  ├─ line 26: imports note-serialization utils
  │   └─ line 11: imports StructuredNotes type (duplicate)
  └─ line 27: imports version-conflict utils
```

---

## Tree: SessionProvider → WorkflowCoordinatorFactory (Alternate Path)

```
providers/session/SessionProvider.tsx:50
  import { createWorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinatorFactory'
  ↓
application/orchestrators/WorkflowCoordinatorFactory.ts (52 LOC)
  ├─ line 8: imports WorkflowCoordinatorDependencies
  ├─ line 9: imports GuardContext
  ├─ line 10: imports WorkflowEngine
  ├─ line 11: imports DefaultGuardRegistry
  │   ├─ line 8: imports GuardContext (already in tree)
  │   ├─ line 9: imports GuardRegistry
  │   └─ line 10: imports GuardResult
  ├─ line 12: imports ConsultationWorkflowStateMachine (already in tree)
  ├─ line 13: imports DocumentationWorkflowStateMachine (already in tree)
  ├─ line 14: imports SideEffectRegistry
  ├─ line 15: imports SideEffectDispatcher
  ├─ line 16: imports WorkflowCoordinator
  ├─ line 17: imports ConsultationWorkflowShim
  │   ├─ line 15: imports ConsultationWorkflowStateMachine (already in tree)
  │   ├─ line 16: imports WorkflowCoordinatorResult (already in tree)
  │   ├─ line 17: imports WorkflowCommand (already in tree)
  │   └─ line 18: imports WorkflowCoordinatorAdapter
  │       ├─ line 8: imports WorkflowCoordinator (already in tree)
  │       ├─ line 9: imports WorkflowCoordinatorResult (already in tree)
  │       ├─ line 10: imports WorkflowCommand (already in tree)
  │       └─ line 11: imports WorkflowCoordinatorResult (duplicate)
  ├─ line 18: imports WorkflowEventBus
  └─ constructor registers guards via createSideEffectRegistry()
```

---

## Tree: SessionProvider → DocumentationProvider → Server Action

```
providers/session/SessionProvider.tsx:74
  import { DocumentationProvider } from '@/providers/documentation/DocumentationProvider'
  ↓
providers/documentation/DocumentationProvider.tsx:35
  import { updateCompletedConsultationNotes } from '@/actions/doctor/consultation-hub'
  ↓
actions/doctor/consultation-hub.ts (246 LOC)
  ├─ line 3: imports db.ts
  │   └─ 200 LOC, imports PrismaClient, creates singleton `prisma`
  ├─ line 4: imports ConsultationOutcomeType (already in tree)
  └─ exports Server Action `updateCompletedConsultationNotes`
```

**Critical:** `DocumentationProvider` is a client component that imports a Server Action. This is a server/client boundary violation that forces the action module AND its `db.ts` dependency into the client bundle graph.

---

## Tree: SessionProvider → BillingProvider/DialogProvider/TimerProvider/QueueProvider

```
providers/session/SessionProvider.tsx:69  → providers/billing/BillingProvider.tsx  (141 LOC)
providers/session/SessionProvider.tsx:70  → providers/dialog/DialogProvider.tsx  (86 LOC)
providers/session/SessionProvider.tsx:71  → providers/timer/TimerContextProvider.tsx  (174 LOC)
providers/session/SessionProvider.tsx:72  → providers/queue/QueueContextProvider.tsx  (136 LOC)
  └─ line 26: imports useDoctorTodayAppointments hook
      └─ hooks/doctor/useDoctorDashboard.ts (181 LOC)
          ├─ line 16: imports doctor API (lib/api/doctor.ts, already in tree)
          ├─ line 17: imports AppointmentResponseDto (already in tree)
          └─ line 18: imports AppointmentStatus (already in tree)
```

These provider imports are Presentation-to-Presentation and do NOT expand into Application/Domain layers. They are safe.

---

## Tree: Auth Path (Separate Branch)

```
providers/session/SessionProvider.tsx:33
  import { useAuth } from '@/hooks/patient/useAuth'
  ↓
hooks/patient/useAuth.ts (30 LOC)
  ├─ line 8: imports AuthContext
  └─ line 10: imports Role enum
  ↓
contexts/AuthContext.tsx (186 LOC) ['use client']
  ├─ line 11: imports auth API methods
  │   └─ lib/api/auth.ts (39 LOC)
  │       ├─ line 7: imports client.ts (430 LOC)
  │       ├─ line 8: imports LoginDto
  │       └─ line 9: imports RefreshTokenDto
  └─ line 12: imports token storage
      └─ lib/auth/token.ts (107 LOC)
```

Note: `AuthContext.tsx` is `'use client'`. It imports `lib/api/auth.ts` which imports `lib/api/client.ts` (430 LOC). This is a separate boundary violation but smaller in scope.

---

## Summary: Forbidden Module Origins

| Forbidden Module | Reachable Via | Imported At Line | Layer |
|------------------|---------------|------------------|-------|
| SessionService.ts | SessionProvider | line 40 | Application |
| WorkflowCoordinator.ts | SessionService | line 22 | Application |
| WorkflowCoordinatorFactory.ts | SessionProvider | line 50 | Application |
| WorkflowEngine.ts | WorkflowCoordinatorDependencies | line 13 | Domain |
| DefaultGuardRegistry.ts | WorkflowCoordinatorFactory | line 11 | Domain |
| GuardContext.ts | WorkflowEngine, WorkflowCoordinatorFactory | lines 26, 9 | Domain |
| GuardRegistry.ts | DefaultGuardRegistry, WorkflowEngine | lines 9, 27 | Domain |
| GuardResult.ts | DefaultGuardRegistry, GuardContext | lines 10, 14 | Domain |
| WorkflowDecision.ts | WorkflowEngine | line 29 | Domain |
| WorkflowError.ts | WorkflowDecision, WorkflowEngine | lines 10, 30 | Domain |
| WorkflowEvent.ts | WorkflowDecision, WorkflowEventDispatcher | lines 11, 7 | Domain |
| WorkflowSideEffect.ts | WorkflowDecision, SideEffectRegistry | lines 12, 14 | Domain |
| WorkflowCommandHandler.ts | WorkflowEngine | line 43 | Domain |
| WorkflowGuardEngine.ts | WorkflowEngine | line 44 | Domain |
| WorkflowExecutionResult.ts | WorkflowEngine | line 32 | Domain |
| WorkflowMetadata.ts | WorkflowEngine | line 33 | Domain |
| WorkflowState.ts | GuardResult | line 7 | Domain |
| TransitionContext.ts | GuardContext, WorkflowCommandHandler | lines 13, 7 | Domain |
| GuardExecutionResult.ts | WorkflowGuardEngine | line 18 | Domain |
| GuardViolation.ts | GuardExecutionResult | line 7 | Domain |
| DoctorApi.ts | SessionService | line 25 | Domain |
| ConsultationApi.ts | SessionService, DraftService | lines 26, 17 | Domain |
| PatientApi.ts | SessionService, SideEffectRegistry | line 27 | Domain |
| QueueApi.ts | WorkflowCoordinatorDependencies, SideEffectRegistry | line 11 | Domain |
| INotificationService.ts | WorkflowCoordinatorDependencies | line 12 | Domain |
| IAuditService.ts | WorkflowCoordinatorDependencies | line 9 | Domain |
| DraftService.ts | SessionProvider | line 47 | Application |
| SideEffectRegistry.ts | WorkflowCoordinatorFactory | line 14 | Application |
| SideEffectDispatcher.ts | WorkflowCoordinator, WorkflowCoordinatorResult | lines 27, 8 | Application |
| WorkflowCoordinatorResult.ts | WorkflowCoordinator, WorkflowCoordinatorFactory | lines 28, 16 | Application |
| WorkflowEventBus.ts | WorkflowCoordinatorFactory | line 18 | Application |
| WorkflowEventDispatcher.ts | WorkflowCoordinator | line 30 | Application |
| WorkflowEventSubscriber.ts | WorkflowEventDispatcher | line 8 | Application |
| ConsultationWorkflowShim.ts | WorkflowCoordinatorFactory | line 17 | Application |
| WorkflowCoordinatorAdapter.ts | ConsultationWorkflowShim | line 18 | Application |
| updateCompletedConsultationNotes (action) | DocumentationProvider | line 35 | Presentation/Server Action |
| db.ts | consultation-hub action | line 3 | Infrastructure |
| client.ts | auth, patient, consultation, doctor adapters | multiple | Infrastructure |
| doctor.ts | doctor-adapter | line 21 | Infrastructure |
| patient.ts | patient-adapter | line 20 | Infrastructure |
| consultation.ts | consultation-adapter | line 20 | Infrastructure |
| doctor-adapter.ts | SessionProvider | line 45 | Infrastructure |
| patient-adapter.ts | SessionProvider | line 43 | Infrastructure |
| consultation-adapter.ts | SessionProvider | line 44 | Infrastructure |
| local-storage-draft.ts | SessionProvider | line 46 | Infrastructure |
| token.ts | AuthContext | line 12 | Infrastructure |
| adapter-utils.ts | patient-adapter, consultation-adapter, doctor-adapter | lines 22, 22, 23 | Infrastructure |

**Total unique forbidden modules reachable from client entry: 51**

---

## Critical Path Verification

The shortest path from client entry to the largest forbidden module:

```
page.tsx (452 LOC)
  → ConsultationContext.tsx:11 (182 LOC)
    → SessionProvider.tsx:40 (685 LOC)
      → SessionService.ts:22 (704 LOC)
        → WorkflowCoordinator.ts:26 (126 LOC)
          → WorkflowCoordinatorDependencies.ts:13 (58 LOC)
            → WorkflowEngine.ts (508 LOC)
```

This path reaches WorkflowEngine (508 LOC) in exactly **6 import hops**.

The SECOND amplification path:

```
SessionProvider.tsx:52
  → DefaultGuardRegistry.ts (315 LOC)
    → 76 guards across 8 files (762 LOC)
```

This path reaches the guards in **2 import hops** from SessionProvider.

Both paths originate from `SessionProvider.tsx`. No module earlier in the chain imports Application or Domain layers directly.
