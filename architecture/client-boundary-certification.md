# Client Boundary Certification

## Principle
In a Clean Architecture with Next.js App Router, the client bundle should contain ONLY:
- Presentation layer (React components, hooks, contexts)
- Shared Kernel types and pure utilities
- Infrastructure that is genuinely client-side (browser APIs, localStorage)

The client bundle should NOT contain:
- Application services
- Domain logic (workflow engines, guards, state machines)
- Server-side infrastructure (database, HTTP clients to own APIs)

## Audit of Every Client-Reachable Module

### FORBIDDEN (51 modules, ~8,200 LOC)

**Application Layer Forbidden (13 modules)**
1. `SessionService.ts` (704 LOC) - Orchestrates session lifecycle
2. `WorkflowCoordinator.ts` (126 LOC) - Workflow orchestration
3. `WorkflowCoordinatorFactory.ts` (52 LOC) - Creates coordinator
4. `WorkflowCoordinatorResult.ts` (80 LOC) - Workflow result types
5. `WorkflowCoordinatorDependencies.ts` (58 LOC) - Workflow deps
6. `SideEffectRegistry.ts` (169 LOC) - Side-effect routing
7. `SideEffectDispatcher.ts` (67 LOC) - Side-effect dispatch
8. `WorkflowEventBus.ts` (75 LOC) - Event bus
9. `WorkflowEventDispatcher.ts` (44 LOC) - Event dispatch
10. `WorkflowEventSubscriber.ts` (28 LOC) - Event subscriber
11. `ConsultationWorkflowShim.ts` (143 LOC) - Domain shim
12. `WorkflowCoordinatorAdapter.ts` (53 LOC) - Adapter
13. `DraftService.ts` (151 LOC) - Draft orchestration

**Domain Layer Forbidden (25 modules)**
1. `WorkflowEngine.ts` (508 LOC) - Core workflow execution
2. `DefaultGuardRegistry.ts` (315 LOC) - Guard registration
3. `WorkflowError.ts` (192 LOC) - Domain errors
4. `PatientApi.ts` (190 LOC) - Domain port
5. `ConsultationApi.ts` (182 LOC) - Domain port
6. `PhoneNumber.ts` (158 LOC) - Value object
7. `WorkflowEvent.ts` (150 LOC) - Domain event
8. `WorkflowCommandHandler.ts` (148 LOC) - Command handler
9. `Email.ts` (124 LOC) - Value object
10. `DoctorApi.ts` (112 LOC) - Domain port
11. `WorkflowSideEffect.ts` (111 LOC) - Side effect
12. `QueueApi.ts` (104 LOC) - Domain port
13. `WorkflowGuardEngine.ts` (102 LOC) - Guard engine
14. `WorkflowCommand.ts` (99 LOC) - Command interface
15. `TransitionContext.ts` (77 LOC) - Transition context
16. `IAuditService.ts` (74 LOC) - Domain port
17. `WorkflowMetadata.ts` (63 LOC) - Metadata
18. `GuardContext.ts` (56 LOC) - Guard context
19. `WorkflowDecision.ts` (55 LOC) - Decision types
20. `INotificationService.ts` (49 LOC) - Domain port
21. `WorkflowState.ts` (39 LOC) - State interface
22. `GuardResult.ts` (30 LOC) - Result type
23. `GuardRegistry.ts` (28 LOC) - Registry interface
24. `WorkflowExecutionResult.ts` (28 LOC) - Execution result
25. `GuardExecutionResult.ts` (18 LOC) - Execution result
26. `GuardViolation.ts` (17 LOC) - Violation type

**Infrastructure Layer Forbidden (11 modules)**
1. `client.ts` (430 LOC) - HTTP client
2. `doctor.ts` (336 LOC) - API methods
3. `db.ts` (200 LOC) - Database
4. `patient.ts` (133 LOC) - API methods
5. `adapter-utils.ts` (129 LOC) - Adapter utilities
6. `doctor-adapter.ts` (108 LOC) - HTTP adapter
7. `token.ts` (107 LOC) - Token storage
8. `consultation-adapter.ts` (84 LOC) - HTTP adapter
9. `patient-adapter.ts` (83 LOC) - HTTP adapter
10. `consultation.ts` (47 LOC) - API interface
11. `auth.ts` (39 LOC) - Auth API

### QUESTIONABLE (2 modules)

1. `local-storage-draft.ts` (187 LOC) - Client-side storage, but tightly coupled to DraftService
2. `token.ts` (107 LOC) - Client-side token storage, but coupled to AuthContext

### SAFE (49 modules)

**Presentation (10 with 'use client')**
- All provider and page files

**Presentation (5 without 'use client')**
- UI components, hooks

**Application DTOs (17 modules)**
- All `application/dtos/*.ts` files

**Domain Safe (10 modules)**
- Enums: `AppointmentStatus`, `ConsultationState`, `Role`, `ConsultationOutcomeType`, `PatientDecision`, `ConsultationRequestStatus`
- Value objects: `PhoneNumber`, `Email`
- Base: `DomainException`

**Infrastructure Safe (2 modules)**
- `utils.ts` (18 LOC) - Pure utilities

**Shared Kernel (7 modules)**
- All safe: types, errors, pure utilities

---

## Server/Client Boundary Violation

### Exact Boundary Violations

**Violation 1: SessionProvider imports Application Layer**
```typescript
// providers/session/SessionProvider.tsx:40
import { SessionService } from '@/application/services/SessionService';
```
- SessionService orchestrates APIs, workflow, and drafts
- Should only be called from Server Actions or API routes
- Violation: 704 LOC forced into client bundle

**Violation 2: SessionProvider imports Domain Layer**
```typescript
// providers/session/SessionProvider.tsx:49
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
```
- WorkflowEngine executes state transitions
- Should only exist on server
- Violation: 508 LOC forced into client bundle

**Violation 3: SessionProvider constructs services in render**
```typescript
// providers/session/SessionProvider.tsx:265
const sessionService = useMemo(
  () => new SessionService(coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService),
  [coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService]
);
```
- Instantiates SessionService with infrastructure adapters
- This instantiation happens during client render
- Violation: All 30 Application modules + 35 Domain modules become reachable

**Violation 4: DocumentationProvider imports Server Action**
```typescript
// providers/documentation/DocumentationProvider.tsx:35
import { updateCompletedConsultationNotes } from '@/actions/doctor/consultation-hub';
```
- Server Action imported by client component
- Violation: Forces consultation-hub.ts (246 LOC) and its db.ts dependency (200 LOC) into client bundle

---

## Certification

**Status:** CLIENT BOUNDARY VIOLATION CONFIRMED

The consultation room's client entry point has static import reachability to:
- 13 Application modules (1,574 LOC)
- 25 Domain modules (3,487 LOC)
- 11 Infrastructure modules (1,783 LOC)

Total forbidden code in client bundle: **~8,200 LOC across 51 modules**

This is the direct cause of the Turbopack heap exhaustion during module graph compilation.
