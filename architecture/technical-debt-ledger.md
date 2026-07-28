# Technical Debt Ledger

## Classification Key

| Class | Meaning |
|-------|---------|
| BLOCKER | Must be resolved before Provider Extraction begins |
| ACCEPTABLE | Can be addressed during Phase 2 without blocking progress |
| PHASE_2 | Should be resolved in Phase 2 for long-term maintainability |
| LOW | Minor issue; can be deferred to later phases |

---

## 1. Debt Eliminated by Phase 1

| Debt | Elimination Method | Classification |
|------|-------------------|----------------|
| Inline error strings in ConsultationContext | `ClinicalErrorCode` enum + `ClinicalError` type | ELIMINATED |
| Scattered query key literals | `query-config.ts` centralizes key factories | ELIMINATED |
| Direct `localStorage` coupling in ConsultationContext | `DraftStorage` interface + adapter | ELIMINATED (contract exists; not yet wired in) |
| Unstructured error handling in adapters | `adapter-utils.ts` centralizes error mapping | ELIMINATED |

---

## 2. Debt Remaining (Blocking Phase 2)

| ID | Debt | Location | Classification | Resolution |
|----|------|----------|----------------|------------|
| D-01 | No feature flag system | `lib/feature-flags.ts` missing | BLOCKER | Implement feature flag primitive + UI toggle |
| D-02 | No compatibility shim prototype | `ConsultationContext.shim.ts` missing | BLOCKER | Build shim with behavioral parity tests |
| D-03 | No Application Layer (use cases/services) | `application/use-cases/`, `application/services/` empty | BLOCKER | Scaffold SessionService, DraftService, QueueService |
| D-04 | ConsultationContext monolith untouched | `contexts/ConsultationContext.tsx` (1004 lines) | BLOCKER | Extract providers only after D-01 through D-03 resolved |
| D-05 | BillingApi, NotificationApi, AuditApi ports missing | `domain/interfaces/services/` | BLOCKER | Implement 3 missing ports + adapters |
| D-06 | QueuePatient DTO in Domain layer | `domain/interfaces/services/QueueApi.ts` | BLOCKER | Move to Application DTO; port should use pure domain type |
| D-07 | Adapter imports Application DTOs ( infra→app coupling) | `lib/api/*-adapter.ts` | BLOCKER | Ports should define/export their own response types |
| D-08 | SOAPNote entity missing | `domain/entities/` | BLOCKER | Align with existing `ConsultationNotes` or migrate |

---

## 3. Debt Introduced by Phase 1

| ID | Debt | Location | Classification | Rationale |
|----|------|----------|----------------|-----------|
| D-09 | `DraftStorage<T>` over-engineered (6 methods, generics, capabilities) | `shared-kernel/interfaces/draft-storage.ts` | ACCEPTABLE | Blueprint specifies 3 methods; current 6-method interface adds unneeded API surface. Can be simplified in Phase 2 without breaking consumers since no code uses it yet. |
| D-10 | Three duplicate `*Success`/`*Failure`/`*Outcome` types | `ConsultationApi.ts`, `PatientApi.ts`, `QueueApi.ts` | ACCEPTABLE | Functionally correct; minor maintenance overhead. Unified `ApiOutcome<T>` in Shared Kernel is a Phase 2 cleanup. |
| D-11 | Adapters implemented but not consumed | `lib/api/*-adapter.ts` | ACCEPTABLE | Forward investment for Phase 2. Creates dead code until providers migrate, but tests validate correctness. |
| D-12 | `query-config.ts` uses React Query terminology | `shared-kernel/query-config.ts` comments | ACCEPTABLE | Comments reference `useQuery`/`useMutation`; implementation is framework-agnostic. Terminology should be abstracted in Phase 2. |
| D-13 | `lib/` path prefix ambiguous | `lib/api/`, `lib/storage/` | ACCEPTABLE | "lib" doesn't communicate Infrastructure layer role. Low confusion risk given project conventions. |
| D-14 | `IdentityType = string` placeholder | `shared-kernel/types/identities.ts` | PHASE_2 | Blueprint requires branded identity types. Placeholder provides zero type safety. |
| D-15 | `ConsultationNotes` vs `SOAPNote` mismatch | `domain/value-objects/ConsultationNotes.ts` | PHASE_2 | Renaming or migration needed before DocumentationProvider extraction. |
| D-16 | `react-query.tsx` extension for JSX file | `tests/frontend/mocks/react-query.tsx` | LOW | Necessary for `QueryWrapper` component; no action needed. |
| D-17 | Queue polling interval discrepancy (60s actual vs 30s blueprint) | `shared-kernel/query-config.ts` | LOW | Documented unilateral reduction. May need revisiting based on UX feedback. |

---

## 4. Debt by Phase

### Phase 1 (Current)
- **Eliminated:** Error taxonomy, query keys, localStorage coupling, adapter error mapping duplication
- **Introduced:** D-09 through D-13 (acceptable forward investment)

### Phase 2 (Prerequisites + Provider Extraction)
- **Must resolve before extraction:** D-01 through D-08 (all BLOCKERs)
- **Should resolve during extraction:** D-14, D-15 (Phase_2)
- **Can defer:** D-16, D-17 (LOW)

### Phase 3+
- **Can defer:** D-10 unification, D-12 terminology abstraction, D-13 path conventions

---

## 5. Debt Summary

| Classification | Count | IDs |
|---------------|-------|-----|
| BLOCKER | 8 | D-01 through D-08 |
| ACCEPTABLE | 5 | D-09 through D-13 |
| PHASE_2 | 2 | D-14, D-15 |
| LOW | 2 | D-16, D-17 |
| **Total** | **17** | |

**Blockers must be resolved before Phase 2 provider extraction begins. Acceptable debt can be managed during Phase 2.**
