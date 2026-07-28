# Factory Analysis

## Purpose
Audit existing factories and determine whether any can serve as the Composition Root.

---

## 1. Existing Factories

### 1.1 WorkflowCoordinatorFactory

**File:** `application/orchestrators/WorkflowCoordinatorFactory.ts`

**Purpose:** Creates WorkflowCoordinator with all workflow-level dependencies.

**Scope:** Application layer — creates WorkflowCoordinator, WorkflowEngine, DefaultGuardRegistry, InProcessWorkflowEventBus.

**Code:**
```typescript
export function createWorkflowCoordinator(options: WorkflowCoordinatorFactoryOptions): WorkflowCoordinator {
  const { dependencies, consultationState, documentationState, context } = options;
  const registry = new DefaultGuardRegistry();
  const engine = new WorkflowEngine(consultationState, documentationState, context, { registry, shortCircuit: false });
  const eventBus = new InProcessWorkflowEventBus({ preserveOrder: true });
  return new WorkflowCoordinator({ ...dependencies, workflowEngine: engine, eventBus });
}
```

**Can it serve as Composition Root?** ❌ **No**

Reasons:
1. **Too narrow:** Only creates WorkflowCoordinator and its immediate dependencies
2. **Doesn't include SessionService:** The factory doesn't create or configure SessionService
3. **Doesn't include DraftService:** DraftService is created outside this factory
4. **Doesn't include HTTP adapters:** HttpPatientApi, HttpConsultationApi, HttpDoctorApi must be provided by caller
5. **Still requires client to import Application modules:** Any component calling this factory must import it, pulling WorkflowEngine, DefaultGuardRegistry, etc. into the bundle
6. **Doesn't cover the full object graph:** A real Composition Root creates SessionService, DraftService, WorkflowCoordinator, AND all their transitive dependencies

---

### 1.2 AuthFactory

**File:** `infrastructure/auth/AuthFactory.ts`

**Purpose:** Creates authentication services, repositories, and use cases.

**Scope:** Infrastructure layer — creates JWT auth service, user repository, audit service, login/refresh/logout use cases.

**Code:**
```typescript
export class AuthFactory {
  static create(prisma: PrismaClient, config?: AuthConfig) {
    const userRepository = new PrismaUserRepository(prisma);
    const auditService = new ConsoleAuditService();
    const authService = createAuthService(userRepository, prisma, config);
    return {
      loginUseCase: new LoginUseCase(authService, userRepository, auditService),
      refreshTokenUseCase: new RefreshTokenUseCase(authService),
      logoutUseCase: new LogoutUseCase(authService, auditService),
    };
  }
}
```

**Can it serve as Composition Root?** ❌ **No**

Reasons:
1. **Wrong domain:** Only covers authentication, not consultation session
2. **Doesn't include session services:** SessionService, WorkflowCoordinator, DraftService are not part of this factory
3. **Already in correct location:** This factory is used from API routes (server-side), never imported by client components
4. **Proof it works:** AuthFactory is ONLY imported from server-side code (`app/api/`), never from Presentation layer

**Lesson from AuthFactory:** When a factory lives in Infrastructure and is only used by Server Components/API routes, it doesn't cause bundle problems. AuthFactory is the CORRECT pattern.

---

### 1.3 TheaterSchedulingFactory

**File:** `application/services/TheaterSchedulingFactory.ts`

**Purpose:** Creates theater scheduling use case with all dependencies.

**Scope:** Application layer — creates TheaterSchedulingUseCase with repositories and services.

**Code:**
```typescript
export class TheaterSchedulingFactory {
  private static instance: TheaterSchedulingUseCase | null = null;
  static create(prisma: PrismaClient = db) {
    const theaterRepository = new TheaterRepository(prisma);
    const billingService = new TheaterBillingService(prisma);
    const notificationService = new TheaterNotificationService();
    const auditService = new TheaterAuditService(prisma);
    return new TheaterSchedulingUseCase(theaterRepository, billingService, notificationService, auditService);
  }
  static getInstance(): TheaterSchedulingUseCase { ... }
}
```

**Can it serve as Composition Root?** ❌ **No**

Reasons:
1. **Wrong domain:** Only covers theater scheduling, not consultation
2. **Doesn't include session services:** SessionService, WorkflowCoordinator are not part of this factory
3. **Already in correct location:** Used from API routes (server-side)
4. **Singleton pattern:** Uses `getInstance()` which is appropriate for server-side

**Lesson from TheaterSchedulingFactory:** Like AuthFactory, this proves the pattern works when factories stay in Application/Infrastructure and are only used server-side.

---

### 1.4 Noop Factories (Incorrect)

**File:** `providers/session/SessionProvider.tsx` (lines 80-98)

**Purpose:** Create stub implementations for client-side operation.

**Code:**
```typescript
function createNoopQueueApi(): QueueApi { return { ... } }
function createNoopNotificationService(): INotificationService { return { ... } }
function createNoopAuditService(): IAuditService { return { ... } }
```

**Can these serve as Composition Root?** ❌ **No**

Reasons:
1. **Wrong layer:** Created in Presentation
2. **Wrong purpose:** These are stubs, not real composition roots
3. **Wrong scope:** Only creates no-op implementations, not real services

---

## 2. Why No Existing Factory Can Serve as Composition Root

### The Problem: Factories Are Domain-Specific

Every factory in the codebase serves a single domain:

| Factory | Domain | What It Creates |
|---------|--------|-----------------|
| WorkflowCoordinatorFactory | Workflow | WorkflowCoordinator, WorkflowEngine, EventBus |
| AuthFactory | Authentication | AuthService, UserRepository, UseCases |
| TheaterSchedulingFactory | Theater | TheaterSchedulingUseCase, Repositories |

**None of them creates the full consultation session object graph.**

### What a Real Composition Root Would Need to Create

A Composition Root for the consultation room would need to create:

```
HttpPatientApi (Infrastructure)
HttpConsultationApi (Infrastructure)
HttpDoctorApi (Infrastructure)
LocalStorageDraftStorage (Infrastructure)
DefaultGuardRegistry (Domain)
WorkflowEngine (Domain)
InProcessWorkflowEventBus (Application)
DraftService (Application)
WorkflowCoordinator (Application)
SessionService (Application)
NoopQueueApi (Infrastructure)
NoopNotificationService (Infrastructure)
NoopAuditService (Infrastructure)
GuardContext (Domain — transient state)
```

### Why Existing Factories Don't Scale

1. **No factory creates cross-domain dependencies:** SessionService depends on WorkflowCoordinator AND HTTP adapters. No factory bridges these domains.
2. **Factories are independent:** WorkflowCoordinatorFactory knows nothing about SessionService. SessionProvider knows about both, but that's the violation.
3. **No "top-level" factory for the consultation module:** There should be a ConsultationSessionFactory or similar that creates everything needed for a consultation session.

---

## 3. Evidence: Factories Are Used Correctly Server-Side

### AuthFactory Usage

```bash
# All imports of AuthFactory
grep -rn "AuthFactory" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test.ts"
```

Result: AuthFactory is only imported from:
- `app/api/` (API routes — server-side)
- Test files

**Never imported from Presentation layer.**

### TheaterSchedulingFactory Usage

```bash
# All imports of TheaterSchedulingFactory
grep -rn "TheaterSchedulingFactory" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test.ts"
```

Result: TheaterSchedulingFactory is only imported from:
- `app/api/` (API routes — server-side)
- `app/frontdesk/dashboard/` (Server Component)
- Test files

**Never imported from client components.**

### WorkflowCoordinatorFactory Usage

```bash
# All imports of WorkflowCoordinatorFactory
grep -rn "WorkflowCoordinatorFactory" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test.ts"
```

Result: WorkflowCoordinatorFactory is imported from:
- `providers/session/SessionProvider.tsx` — ❌ VIOLATION (client component)
- `domain/workflows/WorkflowEngine.ts` — ❌ VIOLATION (Domain shouldn't import Application orchestrator factory)
- Test files

**This proves WorkflowCoordinatorFactory is being used incorrectly when imported by SessionProvider.**

---

## 4. The Correct Pattern (From Existing Evidence)

### AuthFactory Is the Correct Architecture

```
Server-side code (API route)
  ↓
import { AuthFactory } from '@/infrastructure/auth/AuthFactory';
  ↓
const auth = AuthFactory.create(prisma);
  ↓
Use auth service in Server Action / API handler
  ↓
Return result to client
```

This pattern:
1. Composition happens in Application/Infrastructure
2. Server-side code constructs the object graph
3. Client never sees the construction
4. Client only receives data/shape of state

**AuthFactory follows this pattern perfectly.**

### SessionProvider Violates This Pattern

```
Client component (SessionProvider)
  ↓
import { SessionService } from '@/application/services/SessionService';
  ↓
const sessionService = new SessionService(...);
  ↓
Client bundle contains Application module graph
  ↓
Turbopack crashes
```

This is the inverse of the correct pattern.

---

## 5. What a Real Composition Root Would Look Like

### Option A: ConsultationSessionFactory (New)

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY — NOT IMPLEMENTED
// infrastructure/composition/ConsultationSessionFactory.ts

import { HttpPatientApi } from '@/infrastructure/adapters/patient/HttpPatientApi';
import { HttpConsultationApi } from '@/infrastructure/adapters/consultation/HttpConsultationApi';
import { HttpDoctorApi } from '@/infrastructure/adapters/doctor/HttpDoctorApi';
import { LocalStorageDraftStorage } from '@/infrastructure/storage/LocalStorageDraftStorage';
import { DefaultGuardRegistry } from '@/domain/workflows/DefaultGuardRegistry';
import { WorkflowEngine } from '@/domain/workflows/WorkflowEngine';
import { InProcessWorkflowEventBus } from '@/application/events/WorkflowEventBus';
import { DraftService } from '@/application/services/DraftService';
import { createWorkflowCoordinator } from '@/application/orchestrators/WorkflowCoordinatorFactory';
import { SessionService } from '@/application/services/SessionService';
import { ConsultationWorkflowState } from '@/domain/workflows/ConsultationWorkflowStateMachine';
import { DocumentationWorkflowState } from '@/domain/workflows/DocumentationWorkflowStateMachine';
import { GuardContext } from '@/domain/workflows/GuardContext';

interface ConsultationSessionConfig {
  appointmentId: number;
  user: AuthUser;
  patient?: Patient;
  appointment?: Appointment;
  consultation?: Consultation;
}

interface ConsultSessionServices {
  sessionService: SessionService;
  coordinator: WorkflowCoordinator;
  workflowEngine: WorkflowEngine;
  draftService: DraftService;
  eventBus: InProcessWorkflowEventBus;
  guardRegistry: DefaultGuardRegistry;
  httpPatientApi: HttpPatientApi;
  httpConsultationApi: HttpConsultationApi;
  httpDoctorApi: HttpDoctorApi;
}

export function createConsultationSession(config: ConsultationSessionConfig): ConsultSessionServices {
  // Infrastructure adapters
  const httpPatientApi = new HttpPatientApi();
  const httpConsultationApi = new HttpConsultationApi();
  const httpDoctorApi = new HttpDoctorApi();
  const localStorageDraftStorage = new LocalStorageDraftStorage();

  // Domain objects
  const guardRegistry = new DefaultGuardRegistry();
  const initialContext: Partial<GuardContext> = {
    appointmentId: config.appointmentId,
    user: config.user,
    // ... other fields
  };

  // Application orchestration
  const eventBus = new InProcessWorkflowEventBus({ preserveOrder: true });
  const workflowEngine = new WorkflowEngine(
    ConsultationWorkflowState.IDLE,
    DocumentationWorkflowState.Document,
    initialContext as GuardContext,
    { registry: guardRegistry, shortCircuit: false }
  );

  const coordinator = createWorkflowCoordinator({
    dependencies: {
      draftService: new DraftService(httpConsultationApi, localStorageDraftStorage),
      patientApi: httpPatientApi,
      queueApi: createNoopQueueApi(),
      notificationService: createNoopNotificationService(),
      auditService: createNoopAuditService(),
      timerService: createTimerService(),
      eventBus,
    },
    context: initialContext,
  });

  // Application service
  const sessionService = new SessionService(
    coordinator,
    httpDoctorApi,
    httpConsultationApi,
    httpPatientApi,
    coordinator.dependencies.draftService
  );

  return {
    sessionService,
    coordinator,
    workflowEngine,
    draftService: coordinator.dependencies.draftService,
    eventBus,
    guardRegistry,
    httpPatientApi,
    httpConsultationApi,
    httpDoctorApi,
  };
}
```

**Location:** `infrastructure/composition/ConsultationSessionFactory.ts`

**Usage:**
```typescript
// app/api/doctor/consultations/session/[appointmentId]/route.ts
// OR Server Component page.tsx

import { createConsultationSession } from '@/infrastructure/composition/ConsultationSessionFactory';

export default async function ConsultationSessionPage({ params }: { params: { appointmentId: string } }) {
  const session = createConsultationSession({
    appointmentId: parseInt(params.appointmentId),
    user: await getCurrentUser(),
    // ... pre-fetch data
  });

  // Execute initial commands
  const initialSession = await session.sessionService.initializeSession();

  // Pass to client shell
  return <ConsultationRoomClient initialSession={initialSession} />;
}
```

### Option B: Individual Composition Functions (Smaller)

Instead of one monolithic factory, split into composition functions:

```typescript
// infrastructure/composition/createInfrastructure.ts
export function createInfrastructure() {
  return {
    patientApi: new HttpPatientApi(),
    consultationApi: new HttpConsultationApi(),
    doctorApi: new HttpDoctorApi(),
    draftStorage: new LocalStorageDraftStorage(),
    noopQueueApi: createNoopQueueApi(),
    noopNotificationService: createNoopNotificationService(),
    noopAuditService: createNoopAuditService(),
  };
}

// infrastructure/composition/createDomain.ts
export function createDomain(infra: InfrastructureDeps) {
  const registry = new DefaultGuardRegistry();
  // ... create WorkflowEngine
  return { registry, engine, eventBus };
}

// infrastructure/composition/createApplication.ts
export function createApplication(infra: InfrastructureDeps, domain: DomainDeps) {
  // ... create DraftService, WorkflowCoordinator, SessionService
}
```

This is more modular but still serves the same purpose: establish the Composition Root outside the client bundle.

---

## 6. Comparison: Existing vs. Required

| Aspect | WorkflowCoordinatorFactory | Required Composition Root |
|--------|---------------------------|---------------------------|
| Scope | Workflow coordinator + immediate deps | Full session object graph |
| Creates SessionService | ❌ No | ✅ Yes |
| Creates DraftService | ❌ No | ✅ Yes |
| Creates HTTP adapters | ❌ No (requires caller) | ✅ Yes |
| Returns SessionService | ❌ No | ✅ Yes (as part of session state) |
| Location | Application | Infrastructure (preferred) |
| Current caller | SessionProvider (client) ❌ | Server Component ✅ |

**Conclusion:** No existing factory can serve as the Composition Root. A new factory/function is required at the Infrastructure layer that creates the complete consultation session object graph and returns pre-computed initial state for the client.

---

## 7. Conclusion

**No existing factory can serve as the Composition Root.**

Reasons:
1. **Scope:** All existing factories are domain-specific and don't create the full object graph
2. **Location:** The only factory used from Presentation (WorkflowCoordinatorFactory) causes the bundle problem
3. **Missing pieces:** No factory creates HTTP adapters, DraftService, AND SessionService together
4. **Incorrect usage:** WorkflowCoordinatorFactory is imported by SessionProvider, which is the violation

**What is needed:**
- A new Composition Root function/factory at the Infrastructure layer
- Creates the complete consultation session object graph
- Returns pre-computed initial state for the client
- Only imported by Server Components

**Existing factories ARE used correctly elsewhere:** AuthFactory and TheaterSchedulingFactory are only imported server-side and never reach the client bundle. This proves the pattern works when followed correctly.
