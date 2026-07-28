# Import Graph Forensics

## Method
Static import graph traced from `app/doctor/consultations/session/[appointmentId]/page.tsx` using resolver that handles:
- Relative imports (`.`, `..`)
- `@/` alias imports
- `.ts`, `.tsx`, `.js` extensions
- Directory `index.tsx`/`index.ts` resolution

Dynamic imports (`next/dynamic`) excluded.
Type-only imports (`import type`) excluded.
Node modules excluded.

---

## 1. Entry Point

| Property | Value |
|----------|-------|
| File | `app/doctor/consultations/session/[appointmentId]/page.tsx` |
| Layer | Presentation |
| LOC | 452 |
| Client marker | `'use client'` |
| Direct imports | 17 |

---

## 2. Complete Reachable Module Graph

### Counts

| Metric | Value |
|--------|-------|
| Total reachable modules | 100 |
| Total reachable LOC | 12,374 |
| Presentation modules | 15 (2,692 LOC) |
| Application modules | 30 (2,736 LOC) |
| Domain modules | 35 (4,038 LOC) |
| Infrastructure modules | 13 (1,901 LOC) |
| Shared Kernel modules | 7 (436 LOC) |
| Node modules | excluded |

### Layer Breakdown

**Presentation (15 modules)**
| LOC | File |
|-----|------|
| 685 | `providers/session/SessionProvider.tsx` |
| 452 | `app/doctor/consultations/session/[appointmentId]/page.tsx` |
| 410 | `providers/documentation/DocumentationProvider.tsx` |
| 280 | `providers/patient/PatientContextProvider.tsx` |
| 186 | `contexts/AuthContext.tsx` |
| 182 | `contexts/ConsultationContext.tsx` |
| 174 | `providers/timer/TimerContextProvider.tsx` |
| 141 | `providers/billing/BillingProvider.tsx` |
| 136 | `providers/queue/QueueContextProvider.tsx` |
| 86 | `providers/dialog/DialogProvider.tsx` |
| ... | ... (5 more small components/utilities) |

**Application (30 modules)**
| LOC | File |
|-----|------|
| 704 | `application/services/SessionService.ts` |
| 179 | `application/dtos/PatientConsultationHistoryDto.ts` |
| 169 | `application/orchestrators/SideEffectRegistry.ts` |
| 151 | `application/services/DraftService.ts` |
| 143 | `application/shims/ConsultationWorkflowShim.ts` |
| 134 | `application/dtos/ConsultationResponseDto.ts` |
| 126 | `application/orchestrators/WorkflowCoordinator.ts` |
| 97 | `application/dtos/CompleteConsultationDto.ts` |
| 80 | `application/orchestrators/WorkflowCoordinatorResult.ts` |
| 76 | `application/dtos/AppointmentResponseDto.ts` |
| 75 | `application/events/WorkflowEventBus.ts` |
| ... | ... (20 more DTOs, orchestrators, events) |

**Domain (35 modules)**
| LOC | File |
|-----|------|
| 508 | `domain/workflows/WorkflowEngine.ts` |
| 315 | `domain/workflows/DefaultGuardRegistry.ts` |
| 260 | `domain/workflows/ConsultationWorkflowStateMachine.ts` |
| 213 | `domain/workflows/DocumentationWorkflowStateMachine.ts` |
| 192 | `domain/workflows/WorkflowError.ts` |
| 190 | `domain/interfaces/services/PatientApi.ts` |
| 182 | `domain/interfaces/services/ConsultationApi.ts` |
| 158 | `domain/value-objects/PhoneNumber.ts` |
| 157 | `domain/enums/AppointmentStatus.ts` |
| 150 | `domain/workflows/WorkflowEvent.ts` |
| 148 | `domain/workflows/WorkflowCommandHandler.ts` |
| ... | ... (25 more domain files) |

**Infrastructure (13 modules)**
| LOC | File |
|-----|------|
| 430 | `lib/api/client.ts` |
| 336 | `lib/api/doctor.ts` |
| 200 | `lib/db.ts` |
| 187 | `lib/storage/local-storage-draft.ts` |
| 133 | `lib/api/patient.ts` |
| 129 | `lib/api/adapter-utils.ts` |
| 108 | `lib/api/doctor-adapter.ts` |
| 107 | `lib/auth/token.ts` |
| ... | ... (5 more) |

**Shared Kernel (7 modules)**
| LOC | File |
|-----|------|
| 160 | `shared-kernel/interfaces/draft-storage.ts` |
| 91 | `shared-kernel/errors/codes.ts` |
| 54 | `shared-kernel/utils/draft-serialization.ts` |
| 48 | `shared-kernel/errors/types.ts` |
| 46 | `shared-kernel/utils/note-serialization.ts` |
| 20 | `shared-kernel/types/notes.ts` |
| 17 | `shared-kernel/utils/version-conflict.ts` |

---

## 3. Critical Observation

**All 100 reachable modules belong to the client bundle.** In Next.js, any module statically imported by a client component becomes part of the client bundle, regardless of whether that module itself contains `'use client'`. The 10 files with `'use client'` are entry points; the remaining 90 files are bundled alongside them.

This includes:
- 30 Application modules (SessionService, DraftService, WorkflowCoordinator, etc.)
- 35 Domain modules (WorkflowEngine, DefaultGuardRegistry, state machines, etc.)
- 13 Infrastructure modules (API clients, database, storage)
- 7 Shared Kernel modules (errors, types, utilities)

**Total: 85 non-Presentation modules are forced into the browser bundle.**

---

## 4. Comparison with Expected Architecture

Expected Clean Architecture boundary:
```
Presentation → Application → Domain → Shared Kernel
   ↓ client    ↓ server     ↓ server     ↓ server
```

Actual reachability:
```
page.tsx (client)
  → SessionProvider (client)
    → SessionService (client bundle)
      → WorkflowCoordinator (client bundle)
        → WorkflowEngine (client bundle)
          → DefaultGuardRegistry (client bundle)
            → guards (client bundle)
      → DraftService (client bundle)
        → LocalStorageDraftStorage (client bundle)
    → DocumentationProvider (client bundle)
      → updateCompletedConsultationNotes (action, client bundle)
        → consultation-hub.ts (client bundle)
          → db.ts (client bundle)
```

**Boundary violation:** Application and Domain layers are reachable from client entry.

---

## 5. Summary

| Question | Answer |
|----------|--------|
| Total modules reachable from client entry | 100 verified, ~108 with guard re-exports |
| Total LOC forced into client bundle | 12,374+ LOC verified |
| Application modules in client bundle | 30 (2,736 LOC) |
| Domain modules in client bundle | 35 (4,038 LOC) |
| Infrastructure modules in client bundle | 13 (1,901 LOC) |
| First violation point | `SessionProvider.tsx` imports `SessionService` |
