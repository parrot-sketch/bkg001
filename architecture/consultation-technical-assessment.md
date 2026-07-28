# Consultation Module — Technical Assessment

## 1. Architectural Strengths

### 1.1 Clean Layered Architecture
The module follows a strict layered approach:
- **Domain** has zero framework dependencies (pure TypeScript enums, entities, value objects)
- **Application** orchestrates via use cases, depends only on interfaces
- **Infrastructure** provides concrete implementations (Prisma, Next.js routes)
- **Presentation** is React-based with clear state/UI separation

**Why it's a strength:** Enables testing domain logic independently, allows infrastructure swaps, and maintains clear boundaries.

### 1.2 Rich Domain Entity
`Consultation` is a proper domain entity with:
- State machine methods (`start()`, `complete()`)
- Business rule enforcement in entity methods
- Value objects (`ConsultationNotes`, `ConsultationDuration`)
- Immutability (state transitions return new instances)

**Why it's a strength:** Business rules are encapsulated where they belong, not scattered across controllers or services.

### 1.3 Dual State Machine Design
Separate state machines for:
- **Domain entity state** (`ConsultationState`: NOT_STARTED → IN_PROGRESS → COMPLETED)
- **UI workflow state** (`ConsultationWorkflowState`: IDLE → LOADING → READY → ACTIVE → COMPLETING → TRANSITIONING → ERROR)

**Why it's a strength:** Clinical state and UI state evolve at different rates and have different valid transitions. Separation prevents coupling.

### 1.4 Reducer Pattern for Complex State
`useReducer` with discriminated union actions provides:
- Predictable state transitions
- Time-travel debugging capability
- Clear action logging
- Type-safe action handling

**Why it's a strength:** Better suited for complex state than multiple `useState` calls, scales well with new features.

### 1.5 Auto-Save with Debouncing
Real-time draft persistence with:
- 3-second debounce
- Optimistic updates
- Version conflict detection
- localStorage backup

**Why it's a strength:** Prevents data loss while minimizing server load. localStorage provides crash recovery beyond browser memory.

### 1.6 Queue-Aware Completion
On consultation completion, the system:
- Aggressively invalidates all related caches
- Automatically loads the next patient in queue
- Falls back to hub navigation if no queue exists

**Why it's a strength:** Seamless doctor workflow without manual navigation.

### 1.7 Idempotent Start Consultation
The start endpoint now handles already-IN_CONSULTATION appointments idempotently, returning existing data instead of 400.

**Why it's a strength:** Prevents UI errors when resuming sessions, supports multiple concurrent consultation sessions.

### 1.8 Type-Safe API Client
All API methods are typed with DTOs, providing:
- Compile-time type checking
- IDE autocomplete
- Clear parameter/response contracts

**Why it's a strength:** Reduces runtime errors, improves developer experience.

### 1.9 Structured Error Handling
- Domain exceptions return friendly 400 messages
- Unexpected errors return 500 with dev-mode details
- Version conflicts detected and recovered
- Specific error messages for each invalid state

**Why it's a strength:** Users see clinical-friendly messages; developers see details in development.

### 1.10 Use Case Orchestration
Start and complete consultations are orchestrated by dedicated use cases that:
- Coordinate multiple repository updates
- Handle audit logging
- Manage side effects (notifications, queue updates)
- Return clean DTOs

**Why it's a strength:** Complex workflows have a single orchestrator, preventing scattered logic.

---

## 2. Technical Debt Observations

### 2.1 ConsultationContext as God Object
`ConsultationContext` is 976 lines and imports from 15+ files. It is the primary integration point for:
- Data fetching (5 different API calls)
- State management (reducer with 15+ action types)
- Side effects (auto-save, heartbeat, beforeunload)
- Business logic (workflow transitions, queue filtering)

**Observation:** The context has grown to encompass data fetching, state management, side effects, and business logic. While functional, it violates single responsibility.

### 2.2 Triple-Write Pattern for Notes
Notes exist simultaneously in:
1. Reducer state (working copy)
2. React Query cache (optimistic update)
3. localStorage (crash recovery)

**Observation:** This requires careful reconciliation and creates potential inconsistency if any write fails. Currently handled but adds complexity.

### 2.3 Context Value Memoization Ineffectiveness
```typescript
const value = useMemo(() => ({...}), [state, ...actions]);
```

Including `state` (a new object on every dispatch) in the dependency array means `useMemo` recomputes on every action. All context consumers re-render on every keystroke during note editing.

**Observation:** The memoization is technically correct but practically ineffective due to the `state` object reference changing on every dispatch.

### 2.4 Sequential Data Fetching in loadAppointment()
```typescript
const [patientResponse, vitalsResponse] = await Promise.all([
  doctorApi.getPatient(apt.patientId),
  apiClient.get(`/patients/${apt.patientId}/vitals?...`)
]);
```

While `Promise.all` is used, these could potentially be parallelized with the initial tier (appointment, doctor, consultation) to reduce total load time.

**Observation:** Two-tier loading is acceptable but could be optimized to a single parallel batch.

### 2.5 Mixed Client/Server State
The context uses:
- React Query (client-side cached server state)
- `useReducer` (client-side ephemeral state)
- `localStorage` (persistent client state)
- Server actions (`updateCompletedConsultationNotes`)

**Observation:** Multiple state persistence layers increase complexity. Currently manageable but could become harder to reason about as features grow.

### 2.6 Direct Prisma Access in Server Components
`app/doctor/consultations/[consultationId]/page.tsx` uses Prisma directly:
```typescript
const record = await db.consultation.findUnique({...});
```

**Observation:** While acceptable for read-only server components, this bypasses the repository pattern used elsewhere, creating inconsistency.

### 2.7 Large Component Count with Lazy Loading
The session page lazy-loads 6 components. While this improves initial load time, it creates:
- Multiple network waterfalls on initial render
- Suspense boundary management complexity
- Potential for loading flicker

**Observation:** Lazy loading is appropriate for the heavy workspace components, but 6 concurrent lazy loads may still cause visible loading states.

### 2.8 Queue Polling Without Exponential Backoff
`useDoctorTodayAppointments` uses fixed `refetchInterval` without exponential backoff on errors.

**Observation:** Could cause unnecessary requests during extended outages.

### 2.9 Legacy Note Parsing
```typescript
function parseLegacyNotes(fullText: string): StructuredNotes {
  const chiefMatch = fullText.match(/Chief Complaint:([\s\S]*?)(?:Examination:|Assessment:|Plan:|=== CONSULTATION OUTCOME ===|$)/i);
  // ... regex parsing
}
```

**Observation:** Regex-based parsing is fragile. If the legacy format changes, parsing silently fails. This is technical debt from a previous format migration.

### 2.10 No WebSocket/Real-Time Strategy
The module relies on polling for queue updates. If multiple doctors are working simultaneously, there is a delay between queue changes and UI updates.

**Observation:** Polling is simpler but less real-time than WebSockets. Acceptable for current scale but may need revisiting.

### 2.11 Completion Side Effects in Use Case
`CompleteConsultationUseCase` handles:
- Billing creation
- Surgical case creation
- Email notifications
- In-app notifications
- Queue updates
- Audit logging

**Observation:** The use case is doing too much. While it's the orchestrator, the notification and billing logic could be extracted into domain events or separate services.

### 2.12 Version Conflict Handling
Version conflicts are detected reactively (after save fails) rather than proactively (before save).

**Observation:** Could lead to user frustration if conflicts occur frequently. Currently mitigated by short auto-save interval.

---

## 3. Mixed Architecture Observations

### 3.1 Clean Architecture with Pragmatic Exceptions
The module follows Clean Architecture principles but makes pragmatic exceptions:
- `db` (Prisma) is imported directly in use cases instead of via repository interface
- Server components use Prisma directly
- Context mixes React Query with reducer

**Observation:** These exceptions are reasonable for a TypeScript/Next.js application but reduce testability and consistency.

### 3.2 Two Context Patterns
The application has:
- `AuthContext` (global, manages auth state)
- `ConsultationContext` (local to consultation room, manages workflow)

**Observation:** Appropriate separation. No evidence of context proliferation issues.

### 3.3 React Query + Reducer Hybrid
Server state (React Query) and client state (reducer) are cleanly separated in the ConsultationContext. However, the boundary between them is blurry for notes:
- Notes are in reducer
- Notes are also in React Query cache (optimistic update)
- Notes are in localStorage

**Observation:** The hybrid approach works but the notes state crosses all three boundaries, making it harder to reason about the source of truth.

---

## 4. Performance Observations

### 4.1 Render Frequency
During active note editing:
- Every keystroke → dispatch → reducer → new state → context value recomputed → all consumers re-render
- 5+ components re-render on every keystroke
- Debounce prevents API calls, but not re-renders

**Observation:** Current implementation is functional but not optimal for low-end devices.

### 4.2 Initial Load
Two-tier loading:
- Tier 1: 3 parallel requests (appointment, doctor, consultation)
- Tier 2: 2 parallel requests (patient, vitals)

Total: 2 sequential rounds of parallel requests.

**Observation:** Could be reduced to 1 round if patient/vitals were loaded in Tier 1 or if appointment response included patient ID for eager loading.

### 4.3 Query Cache Size
React Query caches:
- Consultation (staleTime 0)
- Draft mutations (no cache)
- Consultation history (5 min stale)
- Today's appointments (polling, gcTime 5 min)

**Observation:** Cache footprint is reasonable for a single consultation session.

### 4.4 Memory Leaks
Potential areas:
- `saveTimeoutRef` cleared on unmount ✓
- `heartbeatInterval` cleared on unmount ✓
- `beforeunload` listener cleaned up ✓

**Observation:** Cleanup is properly handled. No obvious memory leaks.

---

## 5. Testing Observations

### 5.1 Current State
No test files were identified for the consultation module components or context during this audit.

**Observation:** The module lacks automated tests, making refactoring risky. The Clean Architecture layers (domain, use cases) would be relatively easy to test once test infrastructure is established.

### 5.2 Testability Strengths
- Domain entities are pure and easily testable
- Use cases depend on interfaces (mockable repositories)
- Reducer actions are pure functions

### 5.3 Testability Weaknesses
- Context depends on React Query, making component-level testing complex
- Heavy use of `useEffect` with side effects (auto-save, heartbeat)
- Lazy-loaded components require dynamic import mocking

---

## 6. Security Observations

### 6.1 Authentication
- JWT-based with refresh flow
- Tokens stored client-side (not HttpOnly cookies)
- Token auto-refresh with promise deduplication

### 6.2 Authorization
- Role check (DOCTOR required)
- Doctor assignment validation
- Queue-based reconciliation for assigned doctors

### 6.3 Data Exposure
- Server does not expose detailed error messages in production
- Audit logging for start and complete actions
- No PII exposure in API responses beyond clinical necessity

### 6.4 Missing Security Features
- No rate limiting observed
- No CSRF protection (JWT in Authorization header mitigates this)
- No request signing

---

## 7. Observability

### 7.1 Logging
- Console logging at key state transitions
- Prisma query logging enabled
- Audit events recorded via `ConsoleAuditService`

### 7.2 Monitoring Gaps
- No structured logging (all console.log)
- No metrics collection
- No performance tracing
- No error boundary tracking

### 7.3 User Feedback
- Toast notifications for success/error states
- Auto-save status indicator in header
- Loading skeletons for all major sections

---

## 8. Scalability Observations

### 8.1 Horizontal Scaling
- Stateless presentation layer (scales well)
- React Query cache is per-client (no server-side cache dependency)
- Database access via Prisma (standard connection pooling)

### 8.2 Bottlenecks
- `revalidateDoctorDashboard` on every start — could cause cache stampede
- No connection pooling configuration visible in audit
- Heartbeat adds 1 request per 30 seconds per active consultation

### 8.3 Data Volume
- Consultation history limited to 8 items in sidebar (reasonable)
- Queue polling fetches all of today's appointments (acceptable for typical daily volume)

---

## 9. Maintainability Assessment

### 9.1 Strengths
- Clear file organization by layer
- Type safety throughout (TypeScript strict mode implied)
- DTOs enforce API contracts
- Domain entities encapsulate business rules

### 9.2 Weaknesses
- `ConsultationContext.tsx` is 976 lines (exceeds maintainability threshold)
- `CompleteConsultationUseCase` is likely large (288 lines for start, complete is larger)
- Some components exceed 400 lines
- Limited documentation/comments in complex areas

### 9.3 Cognitive Load
A developer needs to understand:
- 2 state machines (domain + workflow)
- 5+ API endpoints
- 3+ state persistence mechanisms
- React Query caching behavior
- Next.js App Router + SSR boundaries
- Server actions vs API routes

**Observation:** The module is complex but cohesive. The main cognitive burden is the ConsultationContext's breadth.

---

## 10. Summary

The Consultation Module is a well-architected, production-grade clinical workspace that follows Clean Architecture principles with pragmatic exceptions. Its greatest strengths are the rich domain model, dual state machine design, robust auto-save mechanism, and clean layer separation.

The primary technical debt is concentrated in `ConsultationContext`, which has grown into a central orchestrator handling data fetching, state management, side effects, and business logic. The triple-write pattern for notes, while providing crash recovery, adds complexity.

The module is functional, maintainable at its current scale, and appropriately isolated from other system modules. The main risks for future growth are the Context's size and the lack of automated tests.
