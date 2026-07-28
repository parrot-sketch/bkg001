# Root Cause Proof

## Hypothesis
The consultation room fails to render because its client entry point transitively imports the entire application/domain layer, causing Turbopack to exhaust the Node.js heap during module graph compilation.

## Evidence Chain

### Evidence 1: Static Import Analysis

`app/doctor/consultations/session/[appointmentId]/page.tsx` is `'use client'`. It statically imports:

| Import | Source | Layer |
|--------|--------|-------|
| `ConsultationProvider, useConsultationContext` | `@/contexts/ConsultationContext` | Presentation |
| `useDocumentationContext` | `@/providers/documentation/DocumentationProvider` | Presentation |
| `usePatientContext` | `@/providers/patient/PatientContextProvider` | Presentation |
| `useQueueContext` | `@/providers/queue/QueueContextProvider` | Presentation |
| `useDialogContext` | `@/providers/dialog/DialogProvider` | Presentation |

`ConsultationContext.tsx` imports:
| Import | Source | Layer |
|--------|--------|-------|
| `SessionProvider, useSessionContext` | `@/providers/session/SessionProvider` | Presentation |

`SessionProvider.tsx` imports:
| Import | Source | Layer |
|--------|--------|-------|
| `SessionService` | `@/application/services/SessionService` | **Application** |
| `DraftService` | `@/application/services/DraftService` | **Application** |
| `WorkflowCoordinator` | `@/application/orchestrators/WorkflowCoordinator` | **Application** |
| `WorkflowEngine` | `@/domain/workflows/WorkflowEngine` | **Domain** |
| `DefaultGuardRegistry` | `@/domain/workflows/DefaultGuardRegistry` | **Domain** |
| `parseLegacyNotes` | `@/shared-kernel/utils/note-serialization` | Shared Kernel |
| ` ConsultationWorkflowState, createInitialContext` | `@/domain/workflows/ConsultationWorkflowStateMachine` | **Domain** |

`DefaultGuardRegistry.ts` imports all 76 guard functions from `@/domain/workflows/guards/`.

### Evidence 2: Module Graph Size Estimate

Static import chain from client entry to guard modules:
```
page.tsx (client)
→ ConsultationContext.tsx (client)
→ SessionProvider.tsx (client)
→ SessionService.ts (client)
→ WorkflowCoordinator.ts (client)
→ WorkflowEngine.ts (client)
→ DefaultGuardRegistry.ts (client)
→ 76 guard modules (client)
```

Plus transitive imports:
- All domain enums (`ConsultationState`, `AppointmentStatus`, etc.)
- All DTOs (`PatientResponseDto`, `AppointmentResponseDto`, etc.)
- All API adapters (`HttpPatientApi`, `HttpConsultationApi`, `HttpDoctorApi`)
- `DraftService` + `LocalStorageDraftStorage`
- `SideEffectRegistry`, `SideEffectDispatcher`, `WorkflowEventDispatcher`
- `InProcessWorkflowEventBus`

**Estimated lines pulled into client bundle:** 2,500+

### Evidence 3: Turbopack Heap Exhaustion

```
○ Compiling /doctor/consultations/session/[appointmentId] ...
[16943:0x3e60b000]  1170777 ms: Mark-Compact 3663.4 (3917.1) -> 3643.4 (3913.0) MB
[16943:0x3e60b000]  1174702 ms: Mark-Compact 3667.9 (3921.6) -> 3648.0 (3918.0) MB
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**Heap usage:** ~3.9GB
**Default Node heap limit:** ~4GB (with some overhead, effectively ~3.5-4GB)
**Module:** `next-server (v16.2.9)`
**Phase:** Compilation of single route

### Evidence 4: No Pathological React Behavior

If the bundle were successfully compiled and loaded:
- React render cycle is bounded (verified in render-cycle-analysis.md)
- No infinite loops, no repeated effects, no state mutation storms
- The consultation room would render successfully after initialization

**Conclusion:** The failure is NOT in React rendering. It is in Turbopack's inability to compile the oversized module graph within heap limits.

## Why TypeScript and Tests Did Not Catch This

| Check | Why It Missed The Issue |
|-------|------------------------|
| TypeScript type checking | Only validates types, not bundle size or module graph complexity |
| Unit tests (`vitest`) | Run in Node, not Turbopack. Import modules directly without bundling. |
| Architecture certification | Validated design, layering, and invariants. Did not measure client bundle composition. |
| `npx next build` previously passing | Builds use webpack (not Turbopack) and may handle large module graphs differently. The OOM occurred in dev mode with Turbopack. |
| Dynamic imports | Defer UI components (`ConsultationSessionHeader`, `PatientInfoSidebar`, etc.) but NOT providers or services. |

## The Architectural Assumption That Became False

**Assumption:** "Extracting providers from a monolithic component preserves client-side performance because React contexts are lightweight."

**Reality:** Providers are NOT lightweight when they directly instantiate application services and domain engines at the top level of their render function. The extraction moved code around but kept the same static import reachability from the client entry point.

The Clean Architecture migration correctly separated concerns:
- Session orchestration → SessionService
- Workflow transitions → WorkflowCoordinator/WorkflowEngine
- Draft management → DraftService

But it placed these server-side concerns directly into the client component tree, making them unavoidable dependencies of the consultation room page.

## First Runtime Failure

**Failure:** Node.js heap out of memory during Turbopack compilation
**File:** `application/orchestrators/WorkflowCoordinator.ts` (line 127 reported by build, but root cause is the ENTIRE import chain)
**Line:** Not a single line — the failure occurs at the module graph boundary
**Architectural violation:** Client entry point (`page.tsx`) has static import reachability to application/domain layer via `SessionProvider`

## Downstream Symptoms

| Symptom | Relationship to Root Cause |
|---------|---------------------------|
| Build takes >60s then crashes | Turbopack analyzing oversized module graph |
| `○ Compiling /doctor/consultations/session/[appointmentId]` stalls | Graph traversal exhausts heap |
| 3.6GB → 3.9GB GC cycles | V8 trying to free memory during graph analysis |
| `Ineffective mark-compacts` | Heap fragmentation from large AST/module metadata |

## Smallest Possible Change That Fixes the True Root Cause

The smallest change is to **break the static import chain** between the client entry point and the application/domain layer.

### Option A: Server Component Boundary (Smallest Surface)
Move the consultation room page to a Server Component boundary where providers are initialized via a client wrapper that receives data from a Server Component parent. This requires:
1. Converting `page.tsx` to a Server Component (remove `'use client'`)
2. Wrapping the client interactive shell in `'use client'`
3. Moving `SessionService` orchestration to a Server Action
4. Passing initialized state as props to the client wrapper

**Scope:** 1 page + 1 wrapper component + 1 server action
**Impact:** Eliminates all application/domain imports from client bundle

### Option B: Dynamic Import Providers (Targeted)
Lazy-load the provider chain inside a dynamic import:
```tsx
const ConsultationRoom = dynamic(() => import('@/components/consultation/ConsultationRoomShell'), { ssr: false });
```

This defers the heavy module graph to a separate chunk, reducing initial compilation pressure.

**Scope:** 1 dynamic import wrapper
**Impact:** Splits module graph; Turbopack may handle chunks independently

### Option C: Increase Node Heap (Workaround)
```bash
NODE_OPTIONS="--max-old-space-size=8192" npm run dev
```

**Scope:** 1 environment variable
**Impact:** Delays OOM but does not fix the architectural issue. With continued feature growth, the bundle will eventually exceed even 8GB.

## Recommendation

**Option A** is the correct architectural fix. It restores the intended Clean Architecture boundary:
- Server Components → Server Actions → Application Layer → Domain Layer
- Client Components → Presentation Layer only

The consultation room should be a Server Component that fetches initial data, then hands off to a client shell for interactivity. This is the pattern Next.js App Router was designed for.
