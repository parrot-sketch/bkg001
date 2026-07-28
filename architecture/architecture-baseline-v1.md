# Architecture Baseline v1

## Status: NOT CERTIFIED — Blocker Issues Identified

This document defines the canonical architecture for the Consultation Module modernization. It is derived from all approved ADRs, architecture documents, and the current Implementation.

**Certification Status:** NOT CERTIFIED

The architecture contains 6 blocking inconsistencies that must be resolved before Phase 2 implementation proceeds. See `architecture-invariants.md` for the rules that were violated and `architecture-scorecard.md` for the maturity assessment.

---

## 1. Current State

### 1.1 Codebase

| Component | Location | Lines | Status |
|-----------|----------|-------|--------|
| ConsultationContext | `contexts/ConsultationContext.tsx` | 1,019 | Monolith — must shrink to ≤60 or be deleted |
| DraftService | `application/services/DraftService.ts` | 197 | Extracted — has circular dependency |
| Shared Kernel | `shared-kernel/` | varies | Partial — feature flags exist, DraftStorage exists |
| Presentation Layer | `contexts/`, `components/` | varies | Violates ADR-001 by importing Infrastructure directly |
| Domain Layer | `domain/` | varies | ConsultationApi interface imports Application DTOs |
| Infrastructure | `lib/api/`, `lib/storage/` | varies | Orphaned adapters not consumed by production |

### 1.2 Document Set

51 architecture documents define the target architecture, migration strategy, execution plan, and design specifications. Key documents:

- **ADRs:** ADR-001 (Frontend Clean Architecture), ADR-002 (Provider Boundaries), ADR-003 (State Ownership), ADR-004 (Workflow State Machines), ADR-005 (Extension Architecture)
- **Strategy:** consultation-provider-strategy.md, consultation-modernization-roadmap.md, migration-architecture-v2.md
- **Design:** application-layer-blueprint.md, consultation-use-cases.md, compatibility-shim-design.md, extraction-pattern-v2.md
- **Execution:** phase-2-execution-plan.md, deployment-validation.md, implementation-checklists.md

---

## 2. Target Architecture

### 2.1 Layer Boundaries

| Layer | Owner | May Import | Must Not Import |
|-------|-------|-----------|-----------------|
| **Presentation** | UI components, hooks, contexts | Application Layer, Shared Kernel | Domain, Infrastructure |
| **Application** | Use cases, services, commands, queries | Domain interfaces, Shared Kernel, Application DTOs | React, JSX, concrete HTTP clients, localStorage |
| **Domain** | Entities, VOs, enums, workflows | Shared Kernel | Application, Presentation, Infrastructure |
| **Infrastructure** | Adapters, HTTP clients, storage | Domain interfaces, Shared Kernel, Application DTOs | Presentation, Application |
| **Shared Kernel** | Types, errors, utilities, constants | Nothing (leaf layer) | Any upper layer |

### 2.2 Provider Composition

```
SessionProvider (root orchestrator)
    ├── DocumentationProvider (notes, outcome, patient decision, draft status)
    │   └── DraftService (auto-save, restore, discard)
    ├── PatientContextProvider (patient, vitals, history)
    │   └── PatientApi
    ├── QueueProvider (queue list, filtering, switching)
    │   └── QueueService
    ├── TimerProvider (elapsed, heartbeat, overdue)
    │   └── TimerService
    ├── BillingProvider (billing summary, payment status)
    │   └── BillingService
    └── NotificationProvider (toasts, in-app notifications)
        └── NotificationService
```

### 2.3 Application Services

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| DraftService | Draft lifecycle (save, restore, discard) | ConsultationApi, DraftStorage |
| SessionService | Session lifecycle (initialize, start, complete, switch) | ConsultationApi, PatientApi, QueueApi, DraftService |
| QueueService | Queue filtering, polling, next-patient routing | QueueApi, ConsultationApi |
| NotificationService | Toast display, ClinicalError formatting | None (pure) |
| AuditService | Event emission, correlation IDs | AuditApi |
| BillingService | Billing load, submission | BillingApi |
| TimerService | Session timing, heartbeat interval | None (pure) |

### 2.4 State Ownership

| State | Owner | Persistence |
|-------|-------|-------------|
| `appointment` | SessionProvider | React Query cache |
| `patient` | PatientContextProvider | React Query cache |
| `vitals` | PatientContextProvider | React Query cache |
| `consultation` | SessionProvider | React Query cache |
| `notes` | DocumentationProvider | API draft + localStorage (via DraftStorage) |
| `outcomeType` | DocumentationProvider | API draft |
| `patientDecision` | DocumentationProvider | API draft |
| `workflow` | SessionProvider | Memory (state machine) |
| `queue` | QueueProvider | React Query cache |
| `timer` | TimerProvider | Memory (interval) |

---

## 3. Critical Path

```
Phase 1 (Foundations) — COMPLETE with BLOCKERS
    │
    ▼
Shim-First Replacement for DraftService — BLOCKED
    │
    ▼
Application Services (SessionService, QueueService, NotificationService)
    │
    ▼
Providers (SessionProvider, DocumentationProvider, PatientContextProvider, QueueProvider)
    │
    ▼
ConsultationContext Removal (≤60 lines or deleted)
```

---

## 4. Blocking Issues

### 4.1 Circular Dependency: Domain → Application DTOs

**File:** `domain/interfaces/services/ConsultationApi.ts`
**Issue:** Imports `ConsultationResponseDto` and `SaveConsultationDraftDto` from `application/dtos/`
**Impact:** Domain Layer depends on Application Layer — violates ADR-001
**Resolution:** Move DTOs to Shared Kernel or define generic result types in Domain interface

### 4.2 StructuredNotes Duplication

**Files:** `contexts/ConsultationContext.tsx`, `application/services/DraftService.ts`, `domain/value-objects/ConsultationNotes.ts`
**Issue:** Same concept defined in 3 locations
**Impact:** Violates DRY; changes must be synchronized manually
**Resolution:** Consolidate into Domain Value Object; import everywhere

### 4.3 ConsultationContext Growth

**File:** `contexts/ConsultationContext.tsx`
**Current:** 1,019 lines
**Target:** ≤60 lines or deleted
**Issue:** File grew by 43 lines after DraftService extraction due to dual-path feature flags
**Resolution:** Implement shim-first replacement; remove legacy paths

### 4.4 Triple-Write Pattern

**File:** `contexts/ConsultationContext.tsx`
**Issue:** Notes written to reducer state, React Query cache, AND localStorage on every save
**Impact:** Violates ADR-003 state ownership taxonomy
**Resolution:** Define single source of truth; other stores are read-through caches

### 4.5 Workflow State Machine Bypass

**File:** `contexts/ConsultationContext.tsx`
**Issue:** Reducer directly sets workflow state via `SET_WORKFLOW_STATE`, bypassing `getNextState()` and `canPerformAction()` from `ConsultationWorkflowState`
**Impact:** State machine is dead code; invalid transitions possible
**Resolution:** Replace direct state assignment with validated transitions from SessionService

### 4.6 Duplicated Business Logic

**Files:** `useSaveConsultationDraft.ts`, `application/services/DraftService.ts`
**Issue:** Version conflict detection and full-text formatting duplicated
**Impact:** Bug fixes must be applied in 2+ places
**Resolution:** Extract to Shared Kernel utilities; single source of truth

---

## 5. Dependencies

### 5.1 Existing Dependencies (Phase 1 Complete)

| Component | Depends On | Status |
|-----------|-----------|--------|
| ConsultationApi (port) | Shared Kernel | ✅ Defined |
| PatientApi (port) | Shared Kernel | ✅ Defined |
| QueueApi (port) | Shared Kernel | ✅ Defined |
| DraftStorage (port) | Shared Kernel | ✅ Defined |
| LocalStorageDraftStorage (adapter) | DraftStorage | ✅ Implemented |
| ClinicalErrorCode | Shared Kernel | ✅ Implemented |
| ClinicalError type | Shared Kernel | ✅ Implemented |
| Feature flags | Shared Kernel | ✅ Implemented but inconsistent naming |
| query-config.ts | Shared Kernel | ✅ Implemented |

### 5.2 Missing Dependencies (Block Phase 2)

| Component | Required For | Status |
|-----------|-------------|--------|
| BillingApi port | BillingProvider, SessionService | ❌ Missing |
| NotificationApi port | NotificationProvider | ❌ Missing |
| AuditApi port | AuditService | ❌ Missing |
| SOAPNote VO | DocumentationProvider | ❌ Missing (ConsultationNotes exists but not adopted) |
| SessionWorkflow state machine | SessionService | ❌ Exists but not used |
| Compatibility shim | DraftService cutover | ❌ Not implemented |
| Event bus | Provider communication | ❌ Placeholder only |

---

## 6. Implementation Guidelines

All implementation must follow `architecture-invariants.md` and `implementation-guardrails.md`. No PR may proceed without satisfying both documents.

---

## 7. Open Decisions

| Decision | Options | Needed By |
|----------|---------|-----------|
| ConsultationContext final state | Delete vs. ≤60-line shim | SessionProvider extraction |
| DraftService cleanup approach | Shim-first replacement vs. revert | Week 0 of revised Phase 2 |
| StructuredNotes ownership | Domain VO vs. Shared Kernel type | DocumentationProvider extraction |
