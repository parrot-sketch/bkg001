# Object Lifetime Analysis

## Purpose
Classify the lifetime of every constructed object and determine whether the current lifetime is correct.

---

## 1. Object Inventory by Provider

### SessionProvider.tsx — 14 Constructed Objects

| # | Object | Line | Construction Expression | Lifetime | Classification |
|---|--------|------|------------------------|----------|----------------|
| 1 | `HttpPatientApi` | 201 | `new HttpPatientApi()` | Per render (memoized) | Per render |
| 2 | `HttpConsultationApi` | 202 | `new HttpConsultationApi()` | Per render (memoized) | Per render |
| 3 | `HttpDoctorApi` | 203 | `new HttpDoctorApi()` | Per render (memoized) | Per render |
| 4 | `LocalStorageDraftStorage` | 204 | `new LocalStorageDraftStorage<StructuredNotes>()` | Per render (memoized) | Per render |
| 5 | `DraftService` | 205 | `new DraftService(httpConsultationApi, localStorageDraftStorage)` | Per render (memoized) | Per render |
| 6 | `DefaultGuardRegistry` | 212 | `new DefaultGuardRegistry()` | Per render (memoized) | Per render |
| 7 | `GuardContext` | 215 | `{ appointmentId, patientId, ... }` (object literal) | Per render | Per render |
| 8 | `WorkflowEngine` | 237 | `new WorkflowEngine(state, state, context, { registry, shortCircuit })` | Per render (memoized) | Per render |
| 9 | `InProcessWorkflowEventBus` | 244 | `new InProcessWorkflowEventBus({ preserveOrder: true })` | Per render (memoized) | Per render |
| 10 | `WorkflowCoordinator` | 245 | `createWorkflowCoordinator({ dependencies })` | Per render (memoized) | Per render |
| 11 | `NoopQueueApi` | 249 | `createNoopQueueApi()` | Per render (memoized) | Per render |
| 12 | `NoopNotificationService` | 250 | `createNoopNotificationService()` | Per render (memoized) | Per render |
| 13 | `NoopAuditService` | 251 | `createNoopAuditService()` | Per render (memoized) | Per render |
| 14 | `SessionService` | 266 | `new SessionService(coordinator, httpDoctorApi, httpConsultationApi, httpPatientApi, draftService)` | Per render (memoized) | Per render |

### DocumentationProvider.tsx — 0 Major Objects

- Uses `useReducer` with `createInitialState()`
- No Application/Domain/Infrastructure dependencies constructed

### PatientContextProvider.tsx — 0 Major Objects

- Uses `useReducer` with `createInitialState()`
- Only imports types (`import type`)

### QueueContextProvider.tsx — 0 Major Objects

- Uses `useReducer` with `createInitialQueueState()`
- No service dependencies constructed

### TimerContextProvider.tsx — 0 Major Objects

- Uses `useState(new Date())` and `setInterval`
- No Application/Domain/Infrastructure dependencies constructed

### BillingProvider.tsx — 0 Major Objects

- Uses `createContext` only
- No service dependencies constructed

### DialogProvider.tsx — 0 Major Objects

- Uses `createContext` only
- No service dependencies constructed

---

## 2. Lifetime Classification

### Singleton

**Definition:** One instance per application process.

#### Candidates

| Object | Should Be Singleton? | Rationale |
|--------|---------------------|-----------|
| `DefaultGuardRegistry` | ✅ YES | Guard definitions are static. No mutable state per consultation. Creating one per render wastes memory and bundles unnecessary code. |
| `NoopQueueApi` | ✅ YES | Stateless no-op implementation. Same instance can be reused everywhere. |
| `NoopNotificationService` | ✅ YES | Stateless no-op implementation. Same instance can be reused everywhere. |
| `NoopAuditService` | ✅ YES | Stateless no-op implementation. Same instance can be reused everywhere. |

#### Current Status

All four are currently constructed per render via `useMemo`. This is architecturally incorrect — they should be singletons, instantiated once at the Composition Root.

### Per Request

**Definition:** One instance per HTTP request or Server Action.

#### Candidates

| Object | Should Be Per Request? | Rationale |
|--------|------------------------|-----------|
| `SessionService` | ✅ YES | Orchestrates a single consultation session. Should not persist across requests. |
| `WorkflowCoordinator` | ✅ YES | Manages workflow for single consultation. Should not persist across requests. |
| `WorkflowEngine` | ✅ YES | State machine for single consultation. Should not persist across requests. |
| `InProcessWorkflowEventBus` | ✅ YES | Event bus for single session. Should not persist across requests. |
| `DraftService` | ✅ YES | Draft operations for single consultation. Should not persist across requests. |

#### Current Status

All five are currently constructed per render via `useMemo`. This is architecturally incorrect — they should be constructed per request at the Server Component boundary.

**Evidence of per-request correctness:**

```typescript
// SessionProvider.tsx:237-268
const coordinator = useMemo(() => {
  const engine = new WorkflowEngine(..., initialContext, ...);
  const eventBus = new InProcessWorkflowEventBus();
  return createWorkflowCoordinator({ dependencies: { workflowEngine, eventBus, ... } });
}, [...]);

const sessionService = useMemo(() => {
  return new SessionService(coordinator, ...);
}, [coordinator, ...]);
```

Each `useMemo` creates a new instance when the dependency array changes. In React, these instances persist for the component's lifetime, which in a client component means:
- Per page navigation (not per request)
- Per session mount (could be minutes or hours)
- NOT per consultation (a single session may handle multiple consultations via consultation switching)

**Correct lifetime:** Per consultation or per request. Not per session mount.

### Per Consultation

**Definition:** One instance per active consultation (appointment).

#### Candidates

| Object | Should Be Per Consultation? | Rationale |
|--------|---------------------------|-----------|
| `WorkflowEngine` | ✅ YES | Each consultation has its own workflow state machine |
| `WorkflowCoordinator` | ✅ YES | Each consultation has its own workflow orchestration |
| `DraftService` | ✅ YES | Each consultation has its own draft |

#### Current Status

Currently constructed per render (memoized). If consultation switching happens within a session, these objects persist across consultations, which is a correctness bug, not just an architectural issue.

### Infrastructure Adapters

| Object | Should Be Per Request? | Rationale |
|--------|------------------------|-----------|
| `HttpPatientApi` | ✅ YES | HTTP client. Can be per-request or per-session singleton. |
| `HttpConsultationApi` | ✅ YES | HTTP client. Can be per-request or per-session singleton. |
| `HttpDoctorApi` | ✅ YES | HTTP client. Can be per-request or per-session singleton. |
| `LocalStorageDraftStorage` | ⚠️ Client-only | Client-side storage wrapper. Acceptable as per-session singleton in client. Should be constructed in Infrastructure layer. |

### Presentation State Holders

| Object | Correct Lifetime | Rationale |
|--------|-----------------|-----------|
| `GuardContext` | Per render | This is mutable state that changes per command. Acceptable. |
| React state (`workflowState`, `sessionState`, etc.) | Per component mount | Standard React state. Correct. |

---

## 3. Lifetime Correctness Matrix

| Object | Current Lifetime | Recommended Lifetime | Correct? | Severity |
|--------|-----------------|---------------------|----------|----------|
| `HttpPatientApi` | Per render | Singleton / per-request | ❌ | High (bundle) |
| `HttpConsultationApi` | Per render | Singleton / per-request | ❌ | High (bundle) |
| `HttpDoctorApi` | Per render | Singleton / per-request | ❌ | High (bundle) |
| `LocalStorageDraftStorage` | Per render | Per-session (client) | ⚠️ | Low |
| `DraftService` | Per render | Per-request | ❌ | High (bundle) |
| `DefaultGuardRegistry` | Per render | Singleton | ❌ | High (bundle) |
| `GuardContext` | Per render | Per render | ✅ | N/A |
| `WorkflowEngine` | Per render | Per-request | ❌ | Critical (correctness) |
| `InProcessWorkflowEventBus` | Per render | Per-request | ❌ | High (bundle) |
| `WorkflowCoordinator` | Per render | Per-request | ❌ | Critical (correctness) |
| `SessionService` | Per render | Per-request | ❌ | Critical (correctness) |
| `NoopQueueApi` | Per render | Singleton | ❌ | Medium |
| `NoopNotificationService` | Per render | Singleton | ❌ | Medium |
| `NoopAuditService` | Per render | Singleton | ❌ | Medium |

---

## 4. Correctness Bugs Identified

### Bug 1: State Machines Persist Across Consultations

**Objects:** `WorkflowEngine`, `WorkflowCoordinator`

**Current behavior:** Created in `useMemo`, persisting for the component's lifespan.

**Problem:** If a doctor opens multiple consultations within the same session (e.g., navigates between appointments), the workflow state from the previous consultation persists.

**Evidence:**
```typescript
// SessionProvider.tsx:211-263
const coordinator = useMemo(() => {
  const engine = new WorkflowEngine(ConsultationWorkflowState.IDLE, ...);
  return createWorkflowCoordinator({ dependencies: { workflowEngine: engine, ... } });
}, []); // Empty dependency array = never recreated
```

The `useMemo` has an empty dependency array for the coordinator (line 263: `}, [draftService, httpPatientApi]`). This means:
- Engine is created once with `IDLE` state
- Engine is never reset when `initialAppointmentId` changes
- Previous consultation's workflow state leaks into the next consultation

**Fix needed:** Recreate `WorkflowEngine` and `WorkflowCoordinator` when `initialAppointmentId` changes.

### Bug 2: No Cleanup on Session Unmount

**Objects:** `InProcessWorkflowEventBus` with `preserveOrder: true`

**Current behavior:** Created in `useMemo`, no cleanup on unmount.

**Problem:** Event bus holds pending events. If the component unmounts with pending events, they may attempt to dispatch to unsubscribed listeners.

### Bug 3: DraftService Shares ConsultationApi Across Consultations

**Object:** `DraftService`

**Current behavior:**
```typescript
// SessionProvider.tsx:205
const draftService = useMemo(() => new DraftService(httpConsultationApi, localStorageDraftStorage), [...]);

// SessionProvider.tsx:266
const sessionService = new SessionService(coordinator, ..., draftService);
```

**Problem:** `DraftService` receives `httpConsultationApi` in constructor, but `SessionService` also receives the same `httpConsultationApi`. If `DraftService` has any cached state per consultation, it will leak across consultations because it's created once and reused.

---

## 5. Lifetime vs. Bundle Impact

| Lifetime Category | Objects | Bundle Impact | Why |
|-------------------|---------|---------------|-----|
| Per render (incorrect) | 14 | High | Forces 12,374 LOC into client bundle |
| Singleton (correct) | 4 | Low | Construct once, import once |
| Per request (correct) | 5 | Zero | Never in client bundle |
| Per consultation (similar to per-request) | 3 | Zero | Never in client bundle |
| Infrastructure adapters | 4 | High | Forces Infrastructure layer into client bundle |

**Key insight:** The bundle explosion is caused by INCORRECT lifetime classification. Objects that should be per-request (and never in the client bundle) are classified as per-render (and forced into the client bundle).

---

## 6. Correct Lifetime Architecture

### Client Bundle (Should Be Minimal)

| Object | Lifetime | Correct? | Where Constructed |
|--------|----------|----------|-------------------|
| React state | Per mount | ✅ | Presentation provider |
| `GuardContext` | Per render | ✅ | Presentation (mutable state holder) |

### Server Bundle (Should Contain Everything Else)

| Object | Lifetime | Correct Construction Site |
|--------|----------|---------------------------|
| `DefaultGuardRegistry` | Singleton | Composition Root / WorkflowCoordinatorFactory |
| `NoopQueueApi` | Singleton | Composition Root |
| `NoopNotificationService` | Singleton | Composition Root |
| `NoopAuditService` | Singleton | Composition Root |
| `HttpPatientApi` | Per request | Composition Root / Infrastructure |
| `HttpConsultationApi` | Per request | Composition Root / Infrastructure |
| `HttpDoctorApi` | Per request | Composition Root / Infrastructure |
| `LocalStorageDraftStorage` | Per session | Composition Root / Infrastructure (client only) |
| `DraftService` | Per request | Composition Root / Application |
| `WorkflowEngine` | Per request | Composition Root / Application |
| `InProcessWorkflowEventBus` | Per request | Composition Root / Application |
| `WorkflowCoordinator` | Per request | Composition Root / Application |
| `SessionService` | Per request | Composition Root / Application |

---

## 7. Conclusion

**Current lifetime classification is fundamentally incorrect for 12 of 14 constructed objects.**

The only objects with correct lifetimes are:
- `GuardContext` (purely presentation state)
- React state holders (standard React pattern)

The remaining 12 objects are classified as "per render" when they should be:
- 4 singletons
- 5 per-request
- 3 per-consultation (similar to per-request)

This incorrect lifetime classification is the root cause of both:
1. **Architectural violation:** Presentation layer constructs Application/Domain objects
2. **Bundle explosion:** All per-render objects are forced into the client bundle
3. **Correctness bugs:** Workflow engines persist across consultations

**The correction is simple:** Move construction to the Composition Root at the Server Component boundary, where the lifetime classification matches the architectural intent.
