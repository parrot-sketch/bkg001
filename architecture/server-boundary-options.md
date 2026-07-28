# Server Boundary Options

## Evaluating Three Candidate Architectures

---

## Option A: Server Component Page + Client Shell

### Structure
```
app/doctor/consultations/session/[appointmentId]/page.tsx  (Server Component, NO 'use client')
  → Server Action: initializeSession(appointmentId)
    → SessionService (server-side only)
      → WorkflowCoordinator (server-side only)
        → WorkflowEngine (server-side only)
  → ConsultationRoomClient (client shell, 'use client')
    → receives { session, docs, queue, dialogs } as props
    → SessionProvider (lightweight, receives initial state)
      → DocumentationProvider (receives initial notes)
      → PatientContextProvider (receives initial patient)
      → QueueContextProvider
      → TimerContextProvider
      → DialogProvider
```

### Architecture Compliance
**COMPLIANT** with Clean Architecture:
- Server Component handles data fetching and orchestration
- Client shell handles only presentation state
- Application/Domain layers execute server-side only
- No static import path from client to Application/Domain

### Bundle Reduction
- Current: ~12,374 LOC reachable
- After: ~4,174 LOC (Presentation + safe types only)
- **Reduction: 66%**

### Complexity
**Medium.** Requires:
1. Converting page.tsx to Server Component
2. Creating `initializeSession` Server Action
3. Creating `ConsultationRoomClient` shell component
4. Passing session state as props

### Hydration Cost
**Minimal.** Server Component renders initial HTML, client shell hydrates with initial state. Props are serialized and passed through. No extra round-trips.

### SSR Impact
**Positive.** Initial consultation data is rendered server-side, improving perceived performance. Client only hydrates the interactive shell.

### Test Impact
**Low.** SessionService, WorkflowCoordinator, WorkflowEngine remain unchanged. Only page.tsx and SessionProvider need test adjustments for Server Component pattern.

### Migration Effort
**Medium.** ~2 days of work:
- Day 1: Convert page.tsx to Server Component, create Server Action
- Day 2: Create client shell, adjust SessionProvider props

### Rollback Difficulty
**Easy.** Server Component can be reverted to client component by adding `'use client'` back. No database or API changes.

---

## Option B: Client Page + Server Actions + Thin Providers

### Structure
```
app/doctor/consultations/session/[appointmentId]/page.tsx  ('use client')
  → ConsultationProvider
    → SessionProvider (thin, no service instantiation)
      → calls Server Action initializeSession()
      → DocumentationProvider (thin, no DraftService import)
        → calls Server Action saveDraft()
      → PatientContextProvider (thin)
      → QueueContextProvider (thin)
      → TimerContextProvider
      → DialogProvider
```

### Architecture Compliance
**PARTIALLY COMPLIANT.** Client still orchestrates state flow. Server Actions handle side effects, but providers still manage session state coordination.

### Bundle Reduction
- Current: ~12,374 LOC reachable
- After: ~6,000 LOC (remove SessionService, DraftService, but keep providers)
- **Reduction: ~50%**

### Complexity
**High.** Requires:
1. Removing ALL service instantiation from SessionProvider
2. Creating Server Actions for every session operation
3. Managing async state flow from Server Actions back to providers
4. Error handling across Server Action boundaries

### Hydration Cost
**Higher.** Client must wait for Server Action resolution before rendering. More loading states.

### SSR Impact
**Minimal.** Page still renders client-side.

### Test Impact
**High.** SessionProvider logic changes from sync service calls to async Server Action calls. All provider tests need rewriting.

### Migration Effort
**High.** ~5 days of work.

### Rollback Difficulty
**Medium.** Can revert to direct service calls, but Server Actions leave traces.

---

## Option C: Current Page + Dynamic Imports

### Structure
```
app/doctor/consultations/session/[appointmentId]/page.tsx  ('use client')
  → const SessionProvider = dynamic(() => import('@/providers/session/SessionProvider'), { ssr: false })
  → const DocumentationProvider = dynamic(() => import('@/providers/documentation/DocumentationProvider'), { ssr: false })
  → ...
```

### Architecture Compliance
**VIOLATES Clean Architecture.** This is cosmetic bundling only. The server-side services still execute on the client; they are just in a separate chunk.

### Bundle Reduction
- Current: ~12,374 LOC reachable
- After: ~12,374 LOC (same total, just split into chunks)
- **Reduction: 0%**

### Complexity
**Low.** Only requires adding `dynamic()` wrappers.

### Hydration Cost
**Worse.** Multiple dynamic imports create waterfall loading. Each chunk must be fetched, parsed, and evaluated separately.

### SSR Impact
**Negative.** `ssr: false` means no server-side rendering for providers. Entire consultation room is client-rendered.

### Test Impact
**Low.** No logic changes.

### Migration Effort
**Low.** ~1 day of work.

### Rollback Difficulty
**Trivial.** Remove dynamic wrappers.

---

## Comparison Matrix

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| Architecture compliance | ✅ Compliant | ⚠️ Partial | ❌ Violation |
| Bundle reduction | 66% | 50% | 0% |
| Complexity | Medium | High | Low |
| Hydration cost | Minimal | Higher | Worse |
| SSR impact | Positive | Minimal | Negative |
| Test impact | Low | High | Low |
| Migration effort | 2 days | 5 days | 1 day |
| Rollback difficulty | Easy | Medium | Trivial |
| Fixes root cause | ✅ Yes | ⚠️ Partial | ❌ No |

---

## Recommendation

**Option A is the correct architectural correction.**

It is the only option that:
1. Restores the Clean Architecture boundary (server = Application/Domain, client = Presentation)
2. Achieves sufficient bundle reduction (66%)
3. Improves SSR performance
4. Maintains reasonable migration effort
5. Provides easy rollback

Option C is a trap. It appears simpler but does not solve the heap exhaustion problem. The module graph is still analyzed by Turbopack; splitting into chunks does not reduce graph analysis memory.

Option B is over-engineered. It turns every provider method into an async Server Action, adding complexity without solving the fundamental problem that client components should not orchestrate session state.

---

## Evidence That Option A Solves the Problem

If `page.tsx` becomes a Server Component:
1. It runs on the server during request
2. It can directly import and call `SessionService.initializeSession()`
3. `SessionService`, `WorkflowCoordinator`, `WorkflowEngine`, `DefaultGuardRegistry` all execute server-side
4. The client receives only the serialized session data
5. `ConsultationRoomClient` receives `session` as a prop — no imports of Application/Domain layers

**Client bundle becomes:**
- `ConsultationRoomClient` (~200 LOC)
- SessionProvider (lightweight, receives state props)
- DocumentationProvider
- PatientContextProvider
- QueueContextProvider
- TimerContextProvider
- DialogProvider
- BillingProvider
- UI components

**Total: ~4,174 LOC** — well within Turbopack's heap capacity.
