# Dependency Injection Audit

## Purpose
Evaluate whether SessionProvider could receive dependencies as injected props instead of constructing them internally.

---

## 1. Current Injection Points

### SessionProvider Props

```typescript
// SessionProvider.tsx:160
interface SessionContextValue {
  // ... callbacks that use sessionService
  initializeSession: () => Promise<void>;
  startConsultation: () => Promise<void>;
  // ... more callbacks
}

function SessionProvider({ children, initialAppointmentId }: { children: ReactNode; initialAppointmentId?: string }) {
  // Constructs everything internally
}
```

**Current props:** `children`, `initialAppointmentId`

**Potential injection props:** `sessionService`, `workflowCoordinator`, `workflowEngine`, `draftService`, `httpPatientApi`, `httpConsultationApi`, `httpDoctorApi`

---

## 2. Injection Mechanism Analysis

### Option A: Direct Props Injection

```typescript
interface SessionProviderProps {
  children: ReactNode;
  initialAppointmentId?: string;
  sessionService?: SessionService;  // injected
  workflowCoordinator?: WorkflowCoordinator;  // injected
  workflowEngine?: WorkflowEngine;  // injected
  draftService?: DraftService;  // injected
  httpPatientApi?: PatientApi;  // injected
  httpConsultationApi?: ConsultationApi;  // injected
  httpDoctorApi?: DoctorApi;  // injected
}
```

**Pros:**
- SessionProvider becomes presentation-only
- No construction code in SessionProvider
- Explicit dependency declaration

**Cons:**
- Parent component must still import and construct ALL dependencies
- Parent component still forces everything into client bundle
- 8 new optional props with fallback construction logic
- Caller complexity increases significantly

### Option B: Context-Based Injection

```typescript
interface CompositionContextValue {
  sessionService: SessionService;
  workflowCoordinator: WorkflowCoordinator;
  // ... all other services
}

const CompositionContext = createContext<CompositionContextValue | null>(null);

function CompositionProvider({ children, config }: { children: ReactNode; config: SessionFactoryConfig }) {
  const services = useMemo(() => createSessionFactory(config), [config]);
  return (
    <CompositionContext.Provider value={services}>
      {children}
    </CompositionContext.Provider>
  );
}
```

**Pros:**
- Centralizes construction in one place
- All providers can consume from CompositionContext
- Layer separation is clear

**Cons:**
- CompositionProvider still constructs everything in client bundle
- Same heap exhaustion problem
- Context overhead (re-renders, memoization)
- Doesn't solve the server/client boundary

### Option C: Higher-Order Component (HOC) Injection

```typescript
function withSessionService<P extends object>(
  Component: React.ComponentType<P & { sessionService: SessionService }>
) {
  return function InjectedComponent(props: P) {
    const sessionService = useMemo(() => new SessionService(...), deps);
    return <Component {...props} sessionService={sessionService} />;
  };
}
```

**Pros:**
- Separates construction from presentation
- Can swap implementations

**Cons:**
- Still constructs in client bundle
- Adds indirection layer
- HOC pattern is less common in modern React
- Doesn't solve the root problem

---

## 3. Why Dependency Injection Does NOT Solve the Problem

### The Core Issue

**Dependency injection moves the construction site. It does not move the module graph.**

```
BEFORE: SessionProvider → import SessionService → import WorkflowCoordinator → ...
AFTER (with DI):  Parent → import SessionService → import WorkflowCoordinator → ...
```

The modules are still in the client bundle. The heap exhaustion still happens.

### Evidence

```typescript
// SessionProvider with DI
function SessionProvider({ children, sessionService }: SessionProviderProps) {
  // No construction here
  const sessionService = props.sessionService || new SessionService(); // fallback
}

// Parent component
function App() {
  // STILL imports SessionService
  const sessionService = new SessionService();

  return (
    <SessionProvider sessionService={sessionService}>
      {children}
    </SessionProvider>
  );
}
```

**The import of SessionService is in App, not SessionProvider. But App is ALSO a client component. The modules still end up in the client bundle.**

The only way to prevent modules from entering the client bundle is to NOT import them in client components. This requires a server/client boundary — not dependency injection.

---

## 4. When Dependency Injection IS Appropriate

### Scenario 1: Testing

**Current approach:**
```typescript
// SessionProvider.test.tsx
vi.mock('@/application/services/SessionService', () => ({
  SessionService: vi.fn().mockImplementation(() => ({
    /* mock methods */
  }))
}));
```

**With DI:**
```typescript
// SessionProvider.test.tsx
const mockSessionService = { initializeSession: vi.fn(), startConsultation: vi.fn() };

render(
  <SessionProvider sessionService={mockSessionService}>
    <TestComponent />
  </SessionProvider>
);
```

**Verdict:** DI improves testability. But this is a TESTING concern, not an architectural fix for the bundle problem.

### Scenario 2: Service Implementation Swapping

**Example:** Replace InProcessWorkflowEventBus with a WebSocketEventBus.

With DI:
```typescript
<SessionProvider eventBus={new WebSocketEventBus(url)}>
  {children}
</SessionProvider>
```

**Verdict:** DI enables runtime swapping. But again, this doesn't solve the bundle problem.

### Scenario 3: Shared Services Across Providers

**Example:** Multiple providers need the same DraftService instance.

With DI:
```typescript
<CompositionContext.Provider value={{ draftService, sessionService }}>
  <SessionProvider>
    <DocumentationProvider>
      {children}
    </DocumentationProvider>
  </SessionProvider>
</CompositionContext.Provider>
```

**Verdict:** DI enables service sharing. But context-based DI still keeps everything in the client bundle.

---

## 5. Pros and Cons Summary

### Pros of Dependency Injection for SessionProvider

| Pro | Evidence | Relevance to Bundle Problem |
|-----|----------|----------------------------|
| Presentation decoupled from construction | SessionProvider doesn't `new` anything | ❌ No impact — parent still imports |
| Better testability | Can inject mocks without module mocking | ✅ Testing benefit only |
| Explicit dependencies | Props declare what SessionProvider needs | ❌ No bundle impact |
| Runtime swapping | Can replace implementations at runtime | ❌ No bundle impact |
| Single source of truth | Construction happens in one place | ❌ That place is still in client |

### Cons of Dependency Injection for SessionProvider

| Con | Evidence |
|-----|----------|
| Parent still imports everything | Modules still reachable from client |
| Doesn't solve boundary problem | Architecture violation moves, not resolves |
| Adds prop drilling complexity | 8+ new required props |
| Creates new coupling | Parent knows about SessionService internals |
| Doesn't address causative factor | The problem is server/client boundary, not DI pattern |
| Maintains incorrect lifetime | Objects still per-render instead of per-request |

---

## 6. Architecture Compliance Comparison

### Current (No DI)

```
SessionProvider (Presentation)
  ├─ imports SessionService (Application)
  │   └─ imports WorkflowCoordinator (Application)
  │       └─ imports WorkflowEngine (Domain)
  │           └─ imports DefaultGuardRegistry (Domain)
  └─ constructs all during render
```

**Layer compliance:** ❌ Presentation imports and constructs Application/Domain
**Bundle impact:** 12,374 LOC in client bundle
**Follows DI?** No (direct construction)

### With DI (Props Injection)

```
App (Presentation — client)
  ├─ imports SessionService (Application)
  │   └─ imports WorkflowCoordinator (Application)
  │       └─ imports WorkflowEngine (Domain)
  │           └─ imports DefaultGuardRegistry (Domain)
  ├─ constructs all during render
  └─ injects into SessionProvider
```

**Layer compliance:** ❌ Presentation still imports and constructs Application/Domain (just moved to parent)
**Bundle impact:** 12,374 LOC in client bundle (SAME)
**Follows DI?** Yes (injected construction)

### With DI + Server Components (Correct)

```
Page (Presentation — SERVER)
  ├─ imports SessionService (Application)
  │   └─ imports WorkflowCoordinator (Application)
  │   └─ imports WorkflowEngine (Domain)
  │       └─ imports DefaultGuardRegistry (Domain)
  ├─ constructs all on server
  ├─ pre-computes session state
  └─ passes state props to ConsultationRoomClient
    ↓
Client Shell (Presentation — client)
  └─ SessionProvider (receives initial state, no service imports)
```

**Layer compliance:** ✅ Presentation server boundary constructs Application/Domain
**Bundle impact:** ~4,650 LOC in client bundle
**Follows DI?** Yes, plus correct layer boundary

**Key insight:** DI is useful, but it's orthogonal to the server/client boundary problem. DI alone doesn't solve the heap exhaustion. DI + correct layer boundary is the right solution.

---

## 7. Runtime Implications

### Current Runtime Behavior

1. **Mount:** SessionProvider runs `useMemo` to construct all services
2. **Render:** WorkflowEngine, WorkflowCoordinator created with IDLE state
3. **User action:** SessionProvider callbacks use sessionService
4. **Session persistence:** Services persist for component lifespan
5. **Navigation:** Services persist across consultation switches (BUG)

### With DI (Props Injection) Runtime Behavior

1. **Parent mount:** Parent runs `useMemo` to construct all services
2. **Parent render:** Services created with IDLE state
3. **Props pass:** Services passed to SessionProvider
4. **User action:** SessionProvider callbacks use injected sessionService
5. **Session persistence:** Services persist for parent component lifespan
6. **Navigation:** Services persist across consultation switches (SAME BUG)

**Runtime behavior is identical.** The only difference is WHERE construction happens.

### With Server Components Runtime Behavior

1. **Server render:** Server constructs services, calls `initializeSession()`
2. **Response:** Server sends HTML + serialized session state
3. **Client hydration:** Client shell hydrates with received state
4. **User action:** Client calls Server Actions with session data
5. **Session persistence:** No service instances in client

**Runtime behavior is correct.** Services are per-request (server), state is serialized to client.

---

## 8. Testability Comparison

### Current Testability

```typescript
// SessionProvider.test.tsx
vi.mock('@/application/services/SessionService');
vi.mock('@/application/orchestrators/WorkflowCoordinatorFactory');
// ... many module mocks required
```

### With DI Testability

```typescript
// SessionProvider.test.tsx
const mockServices = createMockServices();
render(
  <SessionProvider sessionService={mockServices.sessionService} ...>
    <TestComponent />
  </SessionProvider>
);
```

### With Server Components Testability

```typescript
// SessionProvider.test.tsx (UNCHANGED)
// SessionProvider no longer contains business logic
// Tests focus on presentation behavior only
// Business logic tested in SessionService tests
```

**Verdict:** DI improves testability of SessionProvider, but SessionProvider testing is not the bottleneck. SessionService tests already exist and work correctly. The correct approach is testing SessionService (business logic) and SessionProvider (presentation) separately.

---

## 9. Bundle Implications

### Current Bundle

```
SessionProvider.tsx imports:
  ├─ SessionService.ts (Application)
  ├─ WorkflowCoordinator.ts (Application)
  ├─ WorkflowEngine.ts (Domain)
  ├─ DefaultGuardRegistry.ts (Domain)
  ├─ HttpPatientApi.ts (Infrastructure)
  ├─ HttpConsultationApi.ts (Infrastructure)
  ├─ HttpDoctorApi.ts (Infrastructure)
  ├─ LocalStorageDraftStorage.ts (Infrastructure)
  └─ DraftService.ts (Application)
```

**Client bundle includes all these modules and their transitive dependencies.**

### With DI Bundle

```
App.tsx imports:
  ├─ SessionService.ts (Application)
  ├─ WorkflowCoordinator.ts (Application)
  ├─ WorkflowEngine.ts (Domain)
  ├─ DefaultGuardRegistry.ts (Domain)
  ├─ HttpPatientApi.ts (Infrastructure)
  ├─ HttpConsultationApi.ts (Infrastructure)
  ├─ HttpDoctorApi.ts (Infrastructure)
  ├─ LocalStorageDraftStorage.ts (Infrastructure)
  └─ DraftService.ts (Application)
```

**Client bundle includes the SAME modules.** Just in a different file.

### With Server Components Bundle

```
page.tsx (Server Component)
  └─ imports SessionService (Application)
      └─ imports WorkflowCoordinator (Application)
          └─ imports WorkflowEngine (Domain)
              └─ imports DefaultGuardRegistry (Domain)
  ↓
Server processes, creates session state
  ↓
ConsultationRoomClient.tsx (Client Component)
  └─ imports ONLY Presentation modules
  └─ receives session state as props
```

**Client bundle includes ONLY Presentation modules.** Session data is serialized, not the service graph.

---

## 10. Conclusion

**Dependency injection is useful for testing and implementation swapping, but it does NOT solve the client bundle explosion.**

The problem is not HOW dependencies are provided to SessionProvider (construction vs. injection). The problem is WHERE dependencies are constructed (client vs. server).

### When to Use Dependency Injection

- Testing: ✅ Inject mocks instead of using module mocking
- Implementation swapping: ✅ Replace services at runtime
- Service sharing: ✅ Share instances across components

### When NOT to Use Dependency Injection as the Primary Fix

- Bundle problems: ❌ Doesn't reduce module graph
- Architecture boundary violations: ❌ Moves the violation, doesn't eliminate it
- Heap exhaustion: ❌ Same modules still reachable

### Correct Solution

**Dependency injection AND server/client boundary, in that order:**

1. **First:** Establish Composition Root at Server Component boundary (solves bundle/arch violation)
2. **Second:** Use DI within Presentation for testability and flexibility (nice-to-have improvement)

The correct minimum fix is establishing the Composition Root. DI is an orthogonal improvement that can happen later.
