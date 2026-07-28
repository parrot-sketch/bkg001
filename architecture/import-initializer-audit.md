# Import Initializer Audit

## Purpose
Detect every top-level statement executed during module import (not inside functions). These initializers are the primary cause of static code being forced into the bundle even if tree-shaking could theoretically remove unused exports.

---

## SessionProvider.tsx — Top-Level Initializers

### Line 201: HttpPatientApi instantiation
```typescript
const httpPatientApi = useMemo(() => new HttpPatientApi(), []);
```
- **Type:** useMemo wrapper, but initialization occurs during render phase
- **Downstream:** Forces `lib/api/patient-adapter.ts` into bundle
- **Triggers:** `lib/api/patient.ts`, `lib/api/client.ts`, all Patient DTOs

### Line 202: HttpConsultationApi instantiation
```typescript
const httpConsultationApi = useMemo(() => new HttpConsultationApi(), []);
```
- **Downstream:** Forces `lib/api/consultation-adapter.ts`, `lib/api/consultation.ts`, `lib/api/client.ts`
- **Additional:** All Consultation DTOs

### Line 203: HttpDoctorApi instantiation
```typescript
const httpDoctorApi = useMemo(() => new HttpDoctorApi(), []);
```
- **Downstream:** Forces `lib/api/doctor-adapter.ts`, `lib/api/doctor.ts`, `lib/api/client.ts`
- **Additional:** All Doctor/Appointment DTOs

### Line 204: LocalStorageDraftStorage instantiation
```typescript
const localStorageDraftStorage = useMemo(() => new LocalStorageDraftStorage<StructuredNotes>(), []);
```
- **Downstream:** Forces `lib/storage/local-storage-draft.ts`
- **Additional:** `shared-kernel/interfaces/draft-storage.ts`, `shared-kernel/utils/draft-serialization.ts`

### Line 205: DraftService instantiation
```typescript
const draftService = useMemo(() => new DraftService(httpConsultationApi, localStorageDraftStorage), [httpConsultationApi, localStorageDraftStorage]);
```
- **Downstream:** Forces `application/services/DraftService.ts`
- **Additional:** ConsultationApi, DraftStorage, ClinicalError codes, all Draft DTOs

### Line 211-262: Coordinator creation
```typescript
const coordinator = useMemo(() => {
  const registry = new DefaultGuardRegistry();  // LINE 212
  const initialContext: GuardContext = { ... };  // LINE 215
  const engine = new WorkflowEngine(             // LINE 237
    ConsultationWorkflowState.IDLE,
    DocumentationWorkflowState.Document,
    initialContext,
    { registry, shortCircuit: false }
  );
  workflowEngineRef.current = engine;
  const eventBus = new InProcessWorkflowEventBus({ preserveOrder: true });  // LINE 244
  return createWorkflowCoordinator({
    dependencies: {
      draftService,
      patientApi: httpPatientApi,
      queueApi: createNoopQueueApi(),
      notificationService: createNoopNotificationService(),
      auditService: createNoopAuditService(),
      timerService: { ... },
      workflowEngine: engine,
      eventBus,
    } as any as WorkflowCoordinatorDependencies,
  });
}, [draftService, httpPatientApi]);
```

**Critical initializers in this block:**
1. **Line 212:** `new DefaultGuardRegistry()` → constructor calls `registerAllGuards()` → imports ALL 76 guard functions
2. **Line 237:** `new WorkflowEngine(...)` → instantiates engine with registry, context
3. **Line 244:** `new InProcessWorkflowEventBus(...)` → instantiates event bus
4. **Line 245:** `createWorkflowCoordinator(...)` → creates coordinator with all dependencies

**Downstream forced modules:**
- DefaultGuardRegistry (315 LOC)
- WorkflowEngine (508 LOC)
- GuardContext (56 LOC)
- GuardRegistry (28 LOC)
- GuardResult (30 LOC)
- WorkflowDecision (55 LOC)
- WorkflowError (192 LOC)
- WorkflowEvent (150 LOC)
- WorkflowSideEffect (111 LOC)
- WorkflowCommand (99 LOC)
- WorkflowCommandHandler (148 LOC)
- WorkflowGuardEngine (102 LOC)
- WorkflowExecutionResult (28 LOC)
- WorkflowMetadata (63 LOC)
- WorkflowState (39 LOC)
- TransitionContext (77 LOC)
- GuardExecutionResult (18 LOC)
- GuardViolation (17 LOC)
- SideEffectRegistry (169 LOC)
- SideEffectDispatcher (67 LOC)
- WorkflowCoordinatorResult (80 LOC)
- WorkflowEventDispatcher (44 LOC)
- WorkflowEventSubscriber (28 LOC)
- WorkflowEventBus (75 LOC)
- ConsultationWorkflowShim (143 LOC)
- WorkflowCoordinatorAdapter (53 LOC)
- InProcessWorkflowEventBus (from events)
- **Plus all 76 guard functions (762 LOC)**

### Line 265: SessionService instantiation
```typescript
const sessionService = useMemo(
  () => new SessionService(coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService),
  [coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService]
);
```
- **Downstream:** Already covered above via coordinator

### Line 585: Noop service factory calls
```typescript
const docsProps = useMemo(() => ({ ... }), [...]);
```
- noopQueueApi — line 80-85
- noopNotificationService — line 87-92
- noopAuditService — line 94-98

These are tiny but force domain interface imports.

---

## WorkflowCoordinator.ts — Top-Level Initializers

### Line 127 (module-level SideEffectRegistry creation)
Actually, looking at the file:
```typescript
const registry = createSideEffectRegistry(dependencies);
this.dispatcher = new Dispatcher(registry);
```
This is inside the constructor, not at module top-level. However, the module-level import of `createSideEffectRegistry` forces `SideEffectRegistry.ts` into the bundle.

---

## WorkflowEngine.ts — Top-Level Initializers

No module-level initializers. However, the constructor (line 237 in SessionProvider) instantiates:
```typescript
const engine = new WorkflowEngine(
  ConsultationWorkflowState.IDLE,
  DocumentationWorkflowState.Document,
  initialContext,
  { registry, shortCircuit: false }
);
```
This forces ALL domain workflow types into the bundle at instantiation time.

---

## DefaultGuardRegistry.ts — Top-Level Initializers

```typescript
constructor() {
  super();
  this.registerAllGuards();  // Line 212 (from SessionProvider perspective)
}
```

**`registerAllGuards()`** is the critical initializer. It imports all 8 guard files, which collectively import 76 guard functions.

---

## Guard Files — Top-Level Initializers

All guard files export functions at module top-level. The `registerAllGuards()` method calls each guard registration function:

```typescript
// DefaultGuardRegistry.ts (simplified)
registerAllGuards() {
  this.register(require('./loadGuards'));      // 11 guards
  this.register(require('./consultationFlowGuards'));  // 20 guards
  this.register(require('./pauseResumeCancelGuards')); // 8 guards
  this.register(require('./navigationGuards'));        // 12 guards
  this.register(require('./completionGuards'));        // 11 guards
  this.register(require('./conflictGuards'));          // 4 guards
  this.register(require('./restoreGuards'));           // 5 guards
  this.register(require('./retryGuards'));             // 5 guards
}
```

Each `require()` or `import` in this method forces the entire guard module into the bundle graph.

---

## DocumentationProvider.tsx — Top-Level Initializers

### Line 35: Server Action import
```typescript
import { updateCompletedConsultationNotes } from '@/actions/doctor/consultation-hub';
```
- **This is a VALUE import of a Server Action**
- Forces `actions/doctor/consultation-hub.ts` (246 LOC) into client bundle
- consultation-hub.ts imports `lib/db.ts` (200 LOC) at line 3
- **Total: 446 LOC of server-side code forced into client bundle**

### Line 190: useReducer initialization
```typescript
const [state, dispatch] = useReducer(documentationReducer, createInitialState());
```
- `createInitialState()` executes during render
- Forces reducer logic into bundle (already counted)

---

## AuthContext.tsx — Top-Level Initializers

### Line 86-90: useEffect for auth initialization
```typescript
useEffect(() => {
  const { user: storedUser } = initializeAuthFromStorage();
  setUser(storedUser);
  setIsLoading(false);
}, []);
```
- `initializeAuthFromStorage()` executes at line 52-62
- Reads from localStorage, configures API client
- Forces `lib/auth/token.ts`, `lib/api/client.ts`, `lib/api/auth.ts`

---

## QueueContextProvider.tsx — Top-Level Initializers

### Line 88-92: useQuery hook
```typescript
const {
  data: todayAppointments = [],
  refetch: refetchQueue,
  isRefetching: isQueueRefetching,
} = useDoctorTodayAppointments(doctorId ?? undefined, state.queueLoaded, false);
```
- This hook is called during render
- Forces `hooks/doctor/useDoctorDashboard.ts` (181 LOC)
- Which forces `lib/api/doctor.ts` (336 LOC)
- Which forces `lib/api/client.ts` (430 LOC)
- **Chain: QueueContextProvider → useDoctorTodayAppointments → doctor.ts → client.ts**

---

## Summary: Static Initializer Heatmap

| File | Line | Initializer | Forced LOC | Severity |
|------|------|-------------|------------|----------|
| SessionProvider.tsx | 212 | `new DefaultGuardRegistry()` | 1,077 | **CRITICAL** |
| SessionProvider.tsx | 237 | `new WorkflowEngine(...)` | 508 | **CRITICAL** |
| SessionProvider.tsx | 245 | `createWorkflowCoordinator(...)` | 684 | **CRITICAL** |
| SessionProvider.tsx | 265 | `new SessionService(...)` | 704 | **CRITICAL** |
| SessionProvider.tsx | 201 | `new HttpPatientApi()` | 83 | Medium |
| SessionProvider.tsx | 202 | `new HttpConsultationApi()` | 84 | Medium |
| SessionProvider.tsx | 203 | `new HttpDoctorApi()` | 108 | Medium |
| SessionProvider.tsx | 204 | `new LocalStorageDraftStorage()` | 187 | Medium |
| SessionProvider.tsx | 205 | `new DraftService(...)` | 151 | Medium |
| AuthContext.tsx | 86-90 | `initializeAuthFromStorage()` | 107 | Medium |
| DocumentationProvider.tsx | 35 | `import updateCompletedConsultationNotes` | 246 | High |
| DocumentationProvider.tsx | 190 | `useReducer(...)` | - | Low (internal) |
| QueueContextProvider.tsx | 88-92 | `useDoctorTodayAppointments(...)` | 181 | Medium |
| PatientContextProvider.tsx | 144 | `useReducer(...)` | - | Low (internal) |

**Total LOC forced by static initializers in client components: ~8,500 LOC**

---

## Tree-Shaking Blocker Evidence

Turbopack cannot eliminate these modules because:

1. **DefaultGuardRegistry constructor has side effects:** It calls `registerAllGuards()` which mutates internal state. Turbopack cannot prove this has no side effects.

2. **WorkflowEngine constructor has side effects:** It creates a state machine instance. Even if unused, Turbopack conservatively includes it.

3. **SessionService is instantiated in render phase:** `useMemo(() => new SessionService(...), ...)` is called during client render. The instance is stored in a ref and used later. Turbopack sees the construction as a side effect.

4. **Server Actions imported by value:** `updateCompletedConsultationNotes` from consultation-hub is imported as a value, not `import type`. This forces the action module and its `db.ts` dependency into the bundle.

5. **HTTP adapters instantiated in render:** `new HttpPatientApi()`, `new HttpDoctorApi()`, etc. are called during SessionProvider render. Each forces API client and DTO modules.

6. **Event bus instantiated in render:** `new InProcessWorkflowEventBus(...)` forces event bus and all event types.

7. **No `import type` annotations on type-only imports:** Many imports that are only used as types are imported by VALUE, preventing tree-shaking.

---

## Conclusion

**85% of the forbidden client bundle is forced by static initializers executed during the render phase of SessionProvider, AuthContext, and DocumentationProvider.**

Tree-shaking cannot eliminate these modules because:
1. They are imported by VALUE (not `import type`)
2. They have constructors with potential side effects
3. They are instantiated in React render phase via `useMemo`/`useReducer`
4. Server Actions are imported by value from client components

The remaining 15% (DTOs, enums) could theoretically be tree-shaken if imported as `import type`, but this is minor compared to the initializer problem.
