# Client Bundle Audit

## Scope
All 100 modules reachable from `/doctor/consultations/session/[appointmentId]/page.tsx`.

## Segment 1: Presentation Layer (15 modules, 2,692 LOC)

| LOC | File | Client | Bundle Role |
|-----|------|--------|-------------|
| 685 | `providers/session/SessionProvider.tsx` | YES | Root of bundle explosion |
| 452 | `page.tsx` | YES | Client entry point |
| 410 | `providers/documentation/DocumentationProvider.tsx` | YES | Provider chain |
| 280 | `providers/patient/PatientContextProvider.tsx` | YES | Provider chain |
| 186 | `contexts/AuthContext.tsx` | YES | Auth wrapper |
| 182 | `contexts/ConsultationContext.tsx` | YES | Compatibility layer |
| 174 | `providers/timer/TimerContextProvider.tsx` | YES | Provider chain |
| 141 | `providers/billing/BillingProvider.tsx` | YES | Provider chain |
| 136 | `providers/queue/QueueContextProvider.tsx` | YES | Provider chain |
| 86 | `providers/dialog/DialogProvider.tsx` | YES | Provider chain |
| ~25 | UI components (Button, Skeleton) | YES | Leaf components |

**Verdict:** All Presentation modules correctly belong in client bundle.

## Segment 2: Application Layer (30 modules, 2,736 LOC)

| LOC | File | Should be client? | Reason |
|-----|------|-------------------|--------|
| 704 | `application/services/SessionService.ts` | **FORBIDDEN** | Orchestrates APIs, workflow, drafts |
| 169 | `application/orchestrators/SideEffectRegistry.ts` | **FORBIDDEN** | Workflow side-effect routing |
| 151 | `application/services/DraftService.ts` | **FORBIDDEN** | Draft persistence orchestration |
| 143 | `application/shims/ConsultationWorkflowShim.ts` | **FORBIDDEN** | Domain workflow shim |
| 134 | `application/dtos/ConsultationResponseDto.ts` | **SAFE** | Type-only DTO |
| 126 | `application/orchestrators/WorkflowCoordinator.ts` | **FORBIDDEN** | Workflow orchestration |
| 97 | `application/dtos/CompleteConsultationDto.ts` | **SAFE** | Type-only DTO |
| 80 | `application/orchestrators/WorkflowCoordinatorResult.ts` | **FORBIDDEN** | Workflow result types |
| 76 | `application/dtos/AppointmentResponseDto.ts` | **SAFE** | Type-only DTO |
| 75 | `application/events/WorkflowEventBus.ts` | **FORBIDDEN** | Event bus implementation |
| 70 | `application/dtos/ScheduleAppointmentDto.ts` | **SAFE** | Type-only DTO |
| 67 | `application/orchestrators/SideEffectDispatcher.ts` | **FORBIDDEN** | Side-effect dispatch |
| 64 | `application/dtos/SaveConsultationDraftDto.ts` | **SAFE** | Type-only DTO |
| 63 | `application/dtos/LoginDto.ts` | **SAFE** | Type-only DTO |
| 59 | `application/dtos/SubmitConsultationRequestDto.ts` | **SAFE** | Type-only DTO |
| 58 | `application/orchestrators/WorkflowCoordinatorDependencies.ts` | **FORBIDDEN** | Workflow deps interface |
| 53 | `application/shims/WorkflowCoordinatorAdapter.ts` | **FORBIDDEN** | Workflow shim |
| 52 | `application/orchestrators/WorkflowCoordinatorFactory.ts` | **FORBIDDEN** | Workflow factory |
| 44 | `application/dtos/RefreshTokenDto.ts` | **SAFE** | Type-only DTO |
| 44 | `application/events/WorkflowEventDispatcher.ts` | **FORBIDDEN** | Event dispatcher |
| 38 | `application/dtos/PatientResponseDto.ts` | **SAFE** | Type-only DTO |
| 36 | `application/dtos/DoctorResponseDto.ts` | **SAFE** | Type-only DTO |
| 28 | `application/events/WorkflowEventSubscriber.ts` | **FORBIDDEN** | Event subscriber interface |
| 28 | `application/dtos/StartConsultationDto.ts` | **SAFE** | Type-only DTO |
| 28 | `application/dtos/ConfirmAppointmentDto.ts` | **SAFE** | Type-only DTO |
| 26 | `application/dtos/CreatePatientDto.ts` | **SAFE** | Type-only DTO |
| 23 | `application/dtos/CheckInPatientDto.ts` | **SAFE** | Type-only DTO |
| 13 | `application/dtos/AvailableSlotResponseDto.ts` | **SAFE** | Type-only DTO |
| 8 | `application/events/index.ts` | **SAFE** | Barrel re-export |

**Application boundary verdict:**
- 13 FORBIDDEN modules (1,574 LOC) — contain business orchestration, workflow coordination, event dispatching
- 17 SAFE modules (1,162 LOC) — pure DTOs that could be shared

**Issue:** SessionProvider imports `SessionService` (704 LOC) which transitively imports all workflow orchestration code. This is the single largest contributor to client bundle size.

## Segment 3: Domain Layer (35 modules, 4,038 LOC)

| LOC | File | Should be client? | Reason |
|-----|------|-------------------|--------|
| 508 | `domain/workflows/WorkflowEngine.ts` | **FORBIDDEN** | Core workflow execution engine |
| 315 | `domain/workflows/DefaultGuardRegistry.ts` | **FORBIDDEN** | 76 guard registration |
| 260 | `domain/workflows/ConsultationWorkflowStateMachine.ts` | **QUESTIONABLE** | Enum values, but entire machine pulled in |
| 213 | `domain/workflows/DocumentationWorkflowStateMachine.ts` | **QUESTIONABLE** | Same |
| 192 | `domain/workflows/WorkflowError.ts` | **FORBIDDEN** | Domain error classes |
| 190 | `domain/interfaces/services/PatientApi.ts` | **FORBIDDEN** | Domain port |
| 182 | `domain/interfaces/services/ConsultationApi.ts` | **FORBIDDEN** | Domain port |
| 158 | `domain/value-objects/PhoneNumber.ts` | **SAFE** | Pure value object |
| 157 | `domain/enums/AppointmentStatus.ts` | **SAFE** | Enum only |
| 156 | `domain/enums/ConsultationRequestStatus.ts` | **SAFE** | Enum only |
| 150 | `domain/workflows/WorkflowEvent.ts` | **FORBIDDEN** | Domain event |
| 148 | `domain/workflows/WorkflowCommandHandler.ts` | **FORBIDDEN** | Command handler |
| 124 | `domain/value-objects/Email.ts` | **SAFE** | Pure value object |
| 112 | `domain/interfaces/services/DoctorApi.ts` | **FORBIDDEN** | Domain port |
| 111 | `domain/workflows/WorkflowSideEffect.ts` | **FORBIDDEN** | Domain side effect |
| 104 | `domain/interfaces/services/QueueApi.ts` | **FORBIDDEN** | Domain port |
| 102 | `domain/workflows/WorkflowGuardEngine.ts` | **FORBIDDEN** | Guard evaluation engine |
| 99 | `domain/workflows/WorkflowCommand.ts` | **FORBIDDEN** | Command interface |
| 77 | `domain/workflows/TransitionContext.ts` | **FORBIDDEN** | Transition context |
| 74 | `domain/interfaces/services/IAuditService.ts` | **FORBIDDEN** | Domain port |
| 63 | `domain/workflows/WorkflowMetadata.ts` | **FORBIDDEN** | Metadata types |
| 60 | `domain/enums/ConsultationOutcomeType.ts` | **SAFE** | Enum only |
| 56 | `domain/workflows/GuardContext.ts` | **FORBIDDEN** | Guard context |
| 55 | `domain/workflows/WorkflowDecision.ts` | **FORBIDDEN** | Decision types |
| 52 | `domain/enums/ConsultationState.ts` | **SAFE** | Enum only |
| 49 | `domain/interfaces/services/INotificationService.ts` | **FORBIDDEN** | Domain port |
| 43 | `domain/exceptions/DomainException.ts` | **SAFE** | Base exception |
| 39 | `domain/workflows/WorkflowState.ts` | **FORBIDDEN** | State interface |
| 34 | `domain/enums/Role.ts` | **SAFE** | Enum only |
| 34 | `domain/enums/PatientDecision.ts` | **SAFE** | Enum only |
| 30 | `domain/workflows/GuardResult.ts` | **FORBIDDEN** | Guard result |
| 28 | `domain/workflows/GuardRegistry.ts` | **FORBIDDEN** | Guard registry interface |
| 28 | `domain/workflows/WorkflowExecutionResult.ts` | **FORBIDDEN** | Execution result |
| 18 | `domain/workflows/GuardExecutionResult.ts` | **FORBIDDEN** | Execution result |
| 17 | `domain/workflows/GuardViolation.ts` | **FORBIDDEN** | Violation type |

**Domain boundary verdict:**
- 25 FORBIDDEN modules (3,487 LOC)
- 10 SAFE modules (551 LOC)

**Issue:** WorkflowEngine (508 LOC), DefaultGuardRegistry (315 LOC), and state machines (473 LOC) are the largest Domain contributors. The session provider's need for `ConsultationWorkflowState` triggers import of the entire state machine file.

## Segment 4: Infrastructure Layer (13 modules, 1,901 LOC)

| LOC | File | Should be client? | Reason |
|-----|------|-------------------|--------|
| 430 | `lib/api/client.ts` | **FORBIDDEN** | HTTP client with token refresh |
| 336 | `lib/api/doctor.ts` | **FORBIDDEN** | API methods |
| 200 | `lib/db.ts` | **FORBIDDEN** | Database connection |
| 187 | `lib/storage/local-storage-draft.ts` | **QUESTIONABLE** | Client-side storage, but coupled |
| 133 | `lib/api/patient.ts` | **FORBIDDEN** | API methods |
| 129 | `lib/api/adapter-utils.ts` | **FORBIDDEN** | Adapter utilities |
| 108 | `lib/api/doctor-adapter.ts` | **FORBIDDEN** | HTTP adapter |
| 107 | `lib/auth/token.ts` | **QUESTIONABLE** | Token storage, but coupled |
| 84 | `lib/api/consultation-adapter.ts` | **FORBIDDEN** | HTTP adapter |
| 83 | `lib/api/patient-adapter.ts` | **FORBIDDEN** | HTTP adapter |
| 47 | `lib/api/consultation.ts` | **FORBIDDEN** | API interface |
| 39 | `lib/api/auth.ts` | **FORBIDDEN** | Auth API |
| 18 | `lib/utils.ts` | **SAFE** | Pure utilities |

**Infrastructure verdict:**
- 11 FORBIDDEN modules (1,783 LOC)
- 2 SAFE modules (118 LOC)

**Issue:** The HTTP client, API adapters, database, and token storage are all server-side infrastructure pulled into client bundle through SessionService's imports.

## Segment 5: Shared Kernel (7 modules, 436 LOC)

| LOC | File | Should be client? | Reason |
|-----|------|-------------------|--------|
| 160 | `shared-kernel/interfaces/draft-storage.ts` | **SAFE** | Interface types |
| 91 | `shared-kernel/errors/codes.ts` | **SAFE** | Error codes enum |
| 54 | `shared-kernel/utils/draft-serialization.ts` | **SAFE** | Pure serialization |
| 48 | `shared-kernel/errors/types.ts` | **SAFE** | Error type definitions |
| 46 | `shared-kernel/utils/note-serialization.ts` | **SAFE** | Pure string utilities |
| 20 | `shared-kernel/types/notes.ts` | **SAFE** | Type definitions |
| 17 | `shared-kernel/utils/version-conflict.ts` | **SAFE** | Pure utilities |

**Shared Kernel verdict:** All 7 modules are SAFE. They contain only types, enums, and pure functions with no I/O.

---

## Bundle Size Summary

| Layer | Modules | LOC | Bundle Verdict |
|-------|---------|-----|----------------|
| Presentation | 15 | 2,692 | SAFE |
| Application | 30 | 2,736 | 17 SAFE, 13 FORBIDDEN |
| Domain | 35 | 4,038 | 10 SAFE, 25 FORBIDDEN |
| Infrastructure | 13 | 1,901 | 2 SAFE, 11 FORBIDDEN |
| Shared Kernel | 7 | 436 | SAFE |
| **TOTAL** | **100** | **12,374** | |
| **FORBIDDEN** | **51** | **~8,200** | Must be removed from client |
| **SAFE** | **49** | **~4,174** | Can remain in client |

**Estimated client bundle after fixing boundary:**
- Current: ~12,374 LOC
- After: ~4,174 LOC (Presentation + safe types)
- Reduction: ~66%
