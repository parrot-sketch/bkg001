# Composition Root Audit

## Purpose
Identify every location that constructs major dependencies and determine where construction should belong.

---

## 1. Complete Construction Site Inventory

### Major Objects Constructed in Production Code

| Object | File | Line | Construction Method | Arguments | Lifetime |
|--------|------|------|---------------------|-----------|----------|
| `HttpPatientApi` | SessionProvider.tsx | 201 | `new HttpPatientApi()` | none | Per render (memoized) |
| `HttpConsultationApi` | SessionProvider.tsx | 202 | `new HttpConsultationApi()` | none | Per render (memoized) |
| `HttpDoctorApi` | SessionProvider.tsx | 203 | `new HttpDoctorApi()` | none | Per render (memoized) |
| `LocalStorageDraftStorage` | SessionProvider.tsx | 204 | `new LocalStorageDraftStorage<StructuredNotes>()` | none | Per render (memoized) |
| `DraftService` | SessionProvider.tsx | 205 | `new DraftService(httpConsultationApi, localStorageDraftStorage)` | 2 deps | Per render (memoized) |
| `DefaultGuardRegistry` | SessionProvider.tsx | 212 | `new DefaultGuardRegistry()` | none | Per render (memoized) |
| `GuardContext` | SessionProvider.tsx | 215 | `{ appointmentId, patientId, ... }` | 18 fields | Per render (memoized) |
| `WorkflowEngine` | SessionProvider.tsx | 237 | `new WorkflowEngine(state, state, context, { registry, shortCircuit })` | 4 args | Per render (memoized) |
| `InProcessWorkflowEventBus` | SessionProvider.tsx | 244 | `new InProcessWorkflowEventBus({ preserveOrder: true })` | 1 option | Per render (memoized) |
| `WorkflowCoordinator` | SessionProvider.tsx | 245 | `createWorkflowCoordinator({ dependencies })` | 1 config object | Per render (memoized) |
| `SessionService` | SessionProvider.tsx | 266 | `new SessionService(coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService)` | 5 deps | Per render (memoized) |
| `NoopQueueApi` | SessionProvider.tsx | 249 | `createNoopQueueApi()` | none | Per render (memoized) |
| `NoopNotificationService` | SessionProvider.tsx | 250 | `createNoopNotificationService()` | none | Per render (memoized) |
| `NoopAuditService` | SessionProvider.tsx | 251 | `createNoopAuditService()` | none | Per render (memoized) |

### Construction Sites in Application Layer (Non-Test)

| Object | File | Line | Construction Method | Arguments | Lifetime |
|--------|------|------|---------------------|-----------|----------|
| `WorkflowCoordinator` | WorkflowCoordinatorFactory.ts | 46 | `new WorkflowCoordinator(coordinatorDependencies)` | 1 deps object | Per call |
| `DefaultGuardRegistry` | WorkflowCoordinatorFactory.ts | 30 | `new DefaultGuardRegistry()` | none | Per call |
| `WorkflowEngine` | WorkflowCoordinatorFactory.ts | 31 | `new WorkflowEngine(...)` | 4 args | Per call |
| `InProcessWorkflowEventBus` | WorkflowCoordinatorFactory.ts | 38 | `new InProcessWorkflowEventBus({ preserveOrder: true })` | 1 option | Per call |

### Construction Sites in Tests Only (Excluded from Production Analysis)

- SessionService.test.ts:156
- DraftService.test.ts:70
- WorkflowCoordinator.test.ts (multiple lines)
- WorkflowPipelineCertification.test.ts (multiple lines)
- WorkflowEventDispatcher.test.ts (multiple lines)
- WorkflowEventBus.test.ts (multiple lines)
- WorkflowCoordinatorAdapter.test.ts (multiple lines)

---

## 2. Object Lifetime Classification

### Current Lifetimes

| Object | Current Lifetime | Correct? | Justification |
|--------|-----------------|----------|---------------|
| `HttpPatientApi` | Per render (memoized) | ❌ | Should be per-request or singleton |
| `HttpConsultationApi` | Per render (memoized) | ❌ | Should be per-request or singleton |
| `HttpDoctorApi` | Per render (memoized) | ❌ | Should be per-request or singleton |
| `LocalStorageDraftStorage` | Per render (memoized) | ⚠️ | Acceptable for client-side storage, but construction belongs in infrastructure layer |
| `DraftService` | Per render (memoized) | ❌ | Should be per-request or singleton |
| `DefaultGuardRegistry` | Per render (memoized) | ❌ | Should be singleton or per-request |
| `GuardContext` | Per render (memoized) | ⚠️ | Acceptable as mutable state holder |
| `WorkflowEngine` | Per render (memoized) | ❌ | Should be per-consultation |
| `InProcessWorkflowEventBus` | Per render (memoized) | ❌ | Should be per-consultation or singleton |
| `WorkflowCoordinator` | Per render (memoized) | ❌ | Should be per-consultation |
| `SessionService` | Per render (memoized) | ❌ | Should be per-request (server) or injected (client) |
| `NoopQueueApi` | Per render (memoized) | ❌ | Should be singleton or injected |
| `NoopNotificationService` | Per render (memoized) | ❌ | Should be singleton or injected |
| `NoopAuditService` | Per render (memoized) | ❌ | Should be singleton or injected |

### Correct Lifetime Classification

**Singleton** (one instance per application):
- `DefaultGuardRegistry` — guard definitions are static
- `NoopQueueApi` — stateless no-op
- `NoopNotificationService` — stateless no-op
- `NoopAuditService` — stateless no-op

**Per request** (one instance per HTTP request / Server Action):
- `SessionService` — orchestrates single consultation session
- `WorkflowCoordinator` — orchestrates workflow for single session
- `WorkflowEngine` — state machine for single consultation
- `InProcessWorkflowEventBus` — event bus for single session
- `DraftService` — draft operations for single consultation

**Per render / Per component mount** (acceptable):
- `GuardContext` — mutable state that changes per command
- `LocalStorageDraftStorage` — client-side storage wrapper

**Infrastructure-owned** (constructed by adapter/factory):
- `HttpPatientApi` — HTTP adapter, constructed by infrastructure
- `HttpConsultationApi` — HTTP adapter, constructed by infrastructure
- `HttpDoctorApi` — HTTP adapter, constructed by infrastructure

---

## 3. Dependency Ownership Matrix

| Dependency | Currently Constructed By | Should Be Constructed By | Consumers |
|------------|-------------------------|--------------------------|-----------|
| `SessionService` | SessionProvider (Presentation) | Server Action / Composition Root | SessionProvider callbacks |
| `WorkflowCoordinator` | SessionProvider (Presentation) | Server Action / Composition Root | SessionService |
| `WorkflowEngine` | SessionProvider (Presentation) | WorkflowCoordinatorFactory (Application) | WorkflowCoordinator |
| `DefaultGuardRegistry` | SessionProvider (Presentation) | WorkflowCoordinatorFactory (Application) | WorkflowEngine |
| `DraftService` | SessionProvider (Presentation) | Server Action / Composition Root | SessionProvider, DocumentationProvider |
| `HttpPatientApi` | SessionProvider (Presentation) | Infrastructure / Composition Root | SessionService, SideEffectRegistry |
| `HttpConsultationApi` | SessionProvider (Presentation) | Infrastructure / Composition Root | SessionService, DraftService |
| `HttpDoctorApi` | SessionProvider (Presentation) | Infrastructure / Composition Root | SessionService |
| `LocalStorageDraftStorage` | SessionProvider (Presentation) | Infrastructure / Composition Root | DraftService |
| `InProcessWorkflowEventBus` | SessionProvider (Presentation) | WorkflowCoordinatorFactory (Application) | WorkflowCoordinator |
| `NoopQueueApi` | SessionProvider (Presentation) | Composition Root | WorkflowCoordinatorDependencies |
| `NoopNotificationService` | SessionProvider (Presentation) | Composition Root | WorkflowCoordinatorDependencies |
| `NoopAuditService` | SessionProvider (Presentation) | Composition Root | WorkflowCoordinatorDependencies |

---

## 4. Presentation Layer Boundary Audit

### SessionProvider.tsx — Dependency Construction Statements

#### Category: Application Responsibility (VIOLATION)

**Line 212: `new DefaultGuardRegistry()`**
```typescript
const registry = new DefaultGuardRegistry();
```
- **Architectural owner:** WorkflowCoordinatorFactory (Application)
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing domain workflow registry

**Line 237: `new WorkflowEngine(...)`**
```typescript
const engine = new WorkflowEngine(
  ConsultationWorkflowState.IDLE,
  DocumentationWorkflowState.Document,
  initialContext,
  { registry, shortCircuit: false }
);
```
- **Architectural owner:** WorkflowCoordinatorFactory (Application)
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing domain workflow engine

**Line 244: `new InProcessWorkflowEventBus(...)`**
```typescript
const eventBus = new InProcessWorkflowEventBus({ preserveOrder: true });
```
- **Architectural owner:** WorkflowCoordinatorFactory (Application)
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing application event bus

**Line 245: `createWorkflowCoordinator(...)`**
```typescript
return createWorkflowCoordinator({
  dependencies: { ... }
});
```
- **Architectural owner:** Composition Root
- **Current owner:** SessionProvider (Presentation)
- **Note:** This calls the factory, but the factory is being called from the wrong layer

**Line 266: `new SessionService(...)`**
```typescript
() => new SessionService(coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService)
```
- **Architectural owner:** Server Action / Composition Root
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing application service

#### Category: Infrastructure Responsibility (VIOLATION)

**Line 201: `new HttpPatientApi()`**
```typescript
const httpPatientApi = useMemo(() => new HttpPatientApi(), []);
```
- **Architectural owner:** Infrastructure / Composition Root
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing infrastructure adapter

**Line 202: `new HttpConsultationApi()`**
```typescript
const httpConsultationApi = useMemo(() => new HttpConsultationApi(), []);
```
- **Architectical owner:** Infrastructure / Composition Root
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing infrastructure adapter

**Line 203: `new HttpDoctorApi()`**
```typescript
const httpDoctorApi = useMemo(() => new HttpDoctorApi(), []);
```
- **Architectical owner:** Infrastructure / Composition Root
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing infrastructure adapter

**Line 204: `new LocalStorageDraftStorage()`**
```typescript
const localStorageDraftStorage = useMemo(() => new LocalStorageDraftStorage<StructuredNotes>(), []);
```
- **Architectical owner:** Infrastructure / Composition Root
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing infrastructure storage

#### Category: Application Responsibility (QUESTIONABLE)

**Line 205: `new DraftService(...)`**
```typescript
const draftService = useMemo(() => new DraftService(httpConsultationApi, localStorageDraftStorage), [httpConsultationApi, localStorageDraftStorage]);
```
- **Architectical owner:** Server Action / Composition Root
- **Current owner:** SessionProvider (Presentation)
- **Violation:** Presentation layer constructing application service

#### Category: Presentation Responsibility (CORRECT)

**Line 215: `GuardContext` object literal**
```typescript
const initialContext: GuardContext = { ... }
```
- This is acceptable because it's presentation state initialization

**Lines 249-251: Noop factories**
```typescript
queueApi: createNoopQueueApi(),
notificationService: createNoopNotificationService(),
auditService: createNoopAuditService(),
```
- These are acceptable because they're stub implementations for client-side operation

---

## 5. Factory Analysis

### Existing Factories

| Factory | File | Purpose | Scope | Could Serve as Composition Root? |
|---------|------|---------|-------|--------------------------------|
| `createWorkflowCoordinator` | WorkflowCoordinatorFactory.ts | Creates WorkflowCoordinator with all dependencies | Application | ❌ No |
| `createSideEffectRegistry` | SideEffectRegistry.ts | Creates SideEffectRegistry | Application | ❌ No |
| `createNoopQueueApi` | SessionProvider.tsx:80 | Creates no-op QueueApi | Presentation | ❌ No |
| `createNoopNotificationService` | SessionProvider.tsx:87 | Creates no-op INotificationService | Presentation | ❌ No |
| `createNoopAuditService` | SessionProvider.tsx:94 | Creates no-op IAuditService | Presentation | ❌ No |

### Why Existing Factories Cannot Serve as Composition Root

**WorkflowCoordinatorFactory:**
1. **Too narrow:** Only creates WorkflowCoordinator, not the full object graph
2. **Still requires client to provide dependencies:** Caller must construct DefaultGuardRegistry, WorkflowEngine, EventBus, and all dependencies
3. **Doesn't solve the boundary problem:** Even if SessionProvider called this factory, it would still need to import and construct the dependencies, pulling them into the client bundle
4. **Factory itself imports Application/Domain modules:** `WorkflowCoordinatorFactory.ts` imports `WorkflowEngine`, `DefaultGuardRegistry`, etc., so importing the factory into SessionProvider still pulls those modules into the client bundle

**createSideEffectRegistry:**
1. **Even narrower:** Only creates SideEffectRegistry
2. **Same boundary problem:** Imports domain interfaces

**Noop factories:**
1. **Presentation layer concerns:** Created in SessionProvider
2. **Not general-purpose:** Specific to client-side stubbing

### Evidence

```typescript
// WorkflowCoordinatorFactory.ts:27-46
export function createWorkflowCoordinator(options: WorkflowCoordinatorFactoryOptions): WorkflowCoordinator {
  const registry = new DefaultGuardRegistry();  // Still constructs here!
  const engine = new WorkflowEngine(...);         // Still constructs here!
  const eventBus = new InProcessWorkflowEventBus(...);  // Still constructs here!
  return new WorkflowCoordinator(coordinatorDependencies);
}
```

The factory does NOT accept pre-constructed dependencies. It constructs them internally. This means:
- The factory cannot be called from the client without importing all its dependencies
- The factory does not provide indirection from the client bundle
- Moving construction to the factory does NOT solve the bundle problem

### What a Real Composition Root Factory Would Look Like

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY — NOT IMPLEMENTED
// infrastructure/composition/ServerCompositionRoot.ts

export function createServerCompositionRoot() {
  // Infrastructure adapters
  const patientApi = new HttpPatientApi();
  const consultationApi = new HttpConsultationApi();
  const doctorApi = new HttpDoctorApi();
  const draftStorage = new LocalStorageDraftStorage();

  // Application services
  const draftService = new DraftService(consultationApi, draftStorage);
  const guardRegistry = new DefaultGuardRegistry();
  const workflowEngine = new WorkflowEngine(...);
  const eventBus = new InProcessWorkflowEventBus();
  const coordinator = createWorkflowCoordinator({
    dependencies: {
      draftService,
      patientApi,
      queueApi: createNoopQueueApi(),
      notificationService: createNoopNotificationService(),
      auditService: createNoopAuditService(),
      timerService: { ... },
      workflowEngine,
      eventBus,
    }
  });
  const sessionService = new SessionService(coordinator, doctorApi, consultationApi, patientApi, draftService);

  return {
    sessionService,
    coordinator,
    workflowEngine,
    draftService,
    // ... all other services
  };
}
```

This factory would:
1. Live in the Infrastructure layer
2. Be imported ONLY by Server Components / Server Actions
3. Never appear in the client bundle
4. Return fully-constructed services as a single unit

---

## 6. Dependency Injection Audit

### Could SessionProvider Receive Dependencies as Props?

**Yes, technically.** But this does NOT solve the bundle problem.

#### What Dependency Injection Would Look Like

```typescript
interface SessionProviderProps {
  children: ReactNode;
  initialAppointmentId?: number;
  sessionService?: SessionService;  // NEW: injected dependency
  coordinator?: WorkflowCoordinator;  // NEW: injected dependency
  workflowEngine?: WorkflowEngine;  // NEW: injected dependency
  draftService?: DraftService;  // NEW: injected dependency
  httpPatientApi?: PatientApi;  // NEW: injected dependency
  httpConsultationApi?: ConsultationApi;  // NEW: injected dependency
  httpDoctorApi?: DoctorApi;  // NEW: injected dependency
}
```

#### Pros of Dependency Injection

| Pro | Evidence |
|-----|----------|
| SessionProvider becomes presentation-only | No imports of Application/Domain layers |
| Testability improves | Can inject mocks without module mocking |
| Single responsibility | SessionProvider only manages state, not construction |
| Reversibility | Can still construct dependencies internally if needed |

#### Cons of Dependency Injection

| Con | Evidence |
|-----|----------|
| Who constructs the dependencies? | Still need a Composition Root somewhere |
| Client bundle still needs injection point | Parent component must import and construct |
| Adds prop drilling | 8 new required props |
| Doesn't solve server/client boundary | Parent component still needs to import services |
| React render phase constraints | Cannot use async DI without Suspense/throw |

#### Runtime Implications

1. **Current:** SessionProvider constructs during render via `useMemo`
2. **With DI:** Parent component constructs before rendering SessionProvider
3. **Net effect:** ZERO bundle reduction. Construction still happens in client bundle.

#### Bundle Implications

- Current: SessionProvider imports Application/Domain modules
- With DI: SessionProvider receives them as props, but PARENT still imports them
- Result: Same modules in client bundle, just different file

#### Architecture Compliance

- Current: ❌ Presentation constructs Application
- With DI: ✅ Presentation receives Application (but parent still violates)
- Net change: Moves violation from SessionProvider to parent component

#### Verdict

**Dependency injection alone does NOT solve the problem.** It moves the construction site from SessionProvider to its parent, but the parent is still a client component. The modules still end up in the client bundle.

---

## 7. Compare Three Architectures

### Option A: Current Architecture

```
Client Component: page.tsx
  → Client Component: ConsultationProvider
    → Client Component: SessionProvider
      → NEW SessionService (Application)
      → NEW WorkflowCoordinator (Application)
      → NEW WorkflowEngine (Domain)
      → NEW DefaultGuardRegistry (Domain)
```

**Layer compliance:** ❌ Violation — Presentation constructs Application/Domain
**Dependency direction:** ✅ Downward (Presentation → Application → Domain)
**Client bundle:** ❌ 12,374 LOC (51 forbidden modules)
**Runtime behavior:** ❌ Crashes Turbopack
**Hydration:** N/A (never reaches hydration)
**Complexity:** Low (no extra components)
**Rollback:** N/A (current broken state)
**Testing impact:** None
**Long-term maintainability:** ❌ Heap exhaustion blocks all development

### Option B: Composition Root in Parent Component

```
Client Component: page.tsx
  → Composition Root: createSessionServices()  [NEW]
    → NEW SessionService
    → NEW WorkflowCoordinator
    → NEW WorkflowEngine
  → Client Component: SessionProvider (receives services as props)
    → Uses injected services
```

**Layer compliance:** ⚠️ Partial — Composition Root is still in Presentation
**Dependency direction:** ✅ Downward
**Client bundle:** ❌ Still 12,374 LOC (parent still imports everything)
**Runtime behavior:** ❌ Still crashes Turbopack
**Hydration:** N/A
**Complexity:** Medium (new composition root component)
**Rollback:** Easy (remove composition root)
**Testing impact:** Low
**Long-term maintainability:** ❌ Client bundle still oversized

### Option C: Server Component Boundary

```
Server Component: page.tsx
  → Server Action / Direct import: SessionService
    → WorkflowCoordinator (server)
    → WorkflowEngine (server)
    → DefaultGuardRegistry (server)
  → Client Shell: ConsultationRoomClient
    → SessionProvider (receives initial state)
      → DocumentationProvider
      → PatientContextProvider
      → QueueContextProvider
```

**Layer compliance:** ✅ Clean Architecture restored
**Dependency direction:** ✅ Downward (Presentation → Application → Domain on server)
**Client bundle:** ✅ ~4,650 LOC (only Presentation + Safe types)
**Runtime behavior:** ✅ Compiles and runs
**Hydration:** Minimal (server renders initial state, client hydrates shell)
**Complexity:** Medium (new client shell component)
**Rollback:** Easy (add 'use client' back)
**Testing impact:** Low (SessionService tests unchanged)
**Long-term maintainability:** ✅ Clean boundary, scales with codebase growth

---

## 8. Minimum Architectural Correction

### Answer: Move Composition Root to Server Component

The smallest correction that restores Clean Architecture is:

1. **Convert `page.tsx` to Server Component** (remove `'use client'`)
2. **Add Server Action or direct server-side initialization** for `SessionService`
3. **Create `ConsultationRoomClient` shell** that receives session data as props
4. **SessionProvider receives initial session state** as props instead of `initialAppointmentId`

### Why This Is the Minimum

| Alternative | Why It's Insufficient |
|-------------|----------------------|
| Dependency injection only | Still constructs in client bundle |
| Factory relocation only | Factory imports still reachable from client |
| Dynamic imports only | Module graph still analyzed, same heap pressure |
| Heap increase | Temporary workaround, not architectural |
| Tree-shaking fixes | Cannot eliminate side-effect constructors |

### What Must Move

| Component | Current Location | Correct Location | Reason |
|-----------|-----------------|------------------|--------|
| SessionService construction | SessionProvider (Presentation) | Server Component (Presentation server boundary) | Application service |
| WorkflowCoordinator construction | SessionProvider (Presentation) | Server Component | Application orchestration |
| WorkflowEngine construction | SessionProvider (Presentation) | Server Component | Domain workflow |
| DefaultGuardRegistry construction | SessionProvider (Presentation) | Server Component | Domain workflow |
| DraftService construction | SessionProvider (Presentation) | Server Component | Application service |
| Http*Api construction | SessionProvider (Presentation) | Server Component | Infrastructure adapters |

### What Must Stay

| Component | Location | Reason |
|-----------|----------|--------|
| SessionProvider | Presentation (client) | State management for UI |
| DocumentationProvider | Presentation (client) | Note editing state |
| PatientContextProvider | Presentation (client) | Patient display state |
| QueueContextProvider | Presentation (client) | Queue display state |
| TimerContextProvider | Presentation (client) | Timer display state |
| DialogProvider | Presentation (client) | Dialog visibility state |

### Estimated Effort

| File | Change | LOC Delta |
|------|--------|-----------|
| `page.tsx` | Remove 'use client', add server initialization | +30 / -4 |
| `ConsultationRoomClient.tsx` | NEW client shell | +40 |
| `SessionProvider.tsx` | Accept initial state props, remove service construction | -32 |
| **Total** | | **+34 LOC** |

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Server Component breaks client-side auth | Low | Medium | Auth check stays in Server Component |
| Provider prop changes break consumers | Medium | Medium | Keep backward-compatible props |
| Server Action errors unhandled | Low | Medium | Error boundary in page.tsx |
| Hydration mismatch | Low | Low | Server renders exact initial state |
| Existing tests fail | Medium | Low | Service tests unchanged |

**Overall Risk: LOW-MEDIUM**

---

## 9. Verification Against Architecture

### ADR-001: Clean Architecture

**Current state:** ❌ VIOLATED
- Presentation layer constructs Application and Domain objects
- Client bundle contains server-layer code

**After fix:** ✅ COMPLIANT
- Server Component constructs Application/Domain objects
- Client bundle contains only Presentation + safe types

### ADR-003: State Ownership

**Current state:** ✅ PRESERVED
- SessionProvider owns session state
- DocumentationProvider owns documentation state
- No state ownership violations

**After fix:** ✅ PRESERVED
- No state ownership changes

### ADR-004: Workflow Engine Isolation

**Current state:** ❌ VIOLATED
- WorkflowEngine instantiated in client render phase

**After fix:** ✅ COMPLIANT
- WorkflowEngine instantiated server-side
- Client receives computed workflow state

### Architecture Invariants

| Invariant | Current | After Fix |
|-----------|---------|-----------|
| SessionService owns orchestration | ❌ Constructed by Presentation | ✅ Constructed by Server Component |
| WorkflowCoordinator owns transitions | ❌ Constructed by Presentation | ✅ Constructed by Server Component |
| DraftService owns drafts | ❌ Constructed by Presentation | ✅ Constructed by Server Component |
| Presentation owns presentation state only | ❌ Constructs services | ✅ Receives state as props |
| No hidden business logic in providers | ❌ Constructs workflow engine | ✅ Pure state management |
| Compatibility layer preserves legacy contract | ✅ | ✅ |
| No provider mutates another provider's state | ✅ | ✅ |
| No stale closure | ✅ | ✅ |
| No duplicate initialization | ✅ | ✅ |
| No repeated effects | ✅ | ✅ |
| No provider recreation loop | ✅ | ✅ |
| No circular rendering | ✅ | ✅ |

### Composition Principles

| Principle | Current | After Fix |
|-----------|---------|-----------|
| Composition Root exists | ❌ No (distributed across SessionProvider) | ✅ Yes (Server Component) |
| Single Composition Root | ❌ No | ✅ Yes |
| Composition Root in correct layer | ❌ No (Presentation) | ✅ Yes (Presentation server boundary) |
| Dependencies flow inward | ✅ | ✅ |
| Inner layers don't know about outer | ✅ | ✅ |

---

## 10. Conclusion

### The True Composition Root Problem

**SessionProvider IS the Composition Root.** It constructs 14 major objects during render phase:
- 3 HTTP API adapters
- 1 draft storage
- 1 draft service
- 1 workflow engine
- 1 guard registry
- 1 event bus
- 1 workflow coordinator
- 1 session service
- 3 no-op services

This is NOT a Presentation responsibility. The Composition Root belongs at the server/client boundary, typically in:
- Server Components
- Server Actions
- API route handlers
- Application entry points (main.ts, etc.)

### Why This Causes Heap Exhaustion

1. SessionProvider imports Application/Domain modules
2. Those modules import more Application/Domain modules
3. Turbopack must analyze the entire graph for the client bundle
4. Static initializers (`new WorkflowEngine()`, `new DefaultGuardRegistry()`) force execution paths
5. Tree-shaking cannot eliminate side-effect constructors
6. Result: 12,374 LOC in client bundle, 51 forbidden modules

### The Minimum Correction

**Move the Composition Root to the Server Component boundary.**

This requires:
1. Converting page.tsx to Server Component
2. Creating ConsultationRoomClient shell
3. Passing initial session state as props

This is the smallest change that:
- Restores Clean Architecture
- Eliminates the client bundle explosion
- Preserves all existing behavior
- Maintains testability
- Provides easy rollback

No code modifications were made. This is analysis only.
