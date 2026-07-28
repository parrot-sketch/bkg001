# Architecture Invariants

## Purpose

This document defines every architectural rule that may never be violated during the Consultation Module modernization. These invariants are derived from approved ADRs, Clean Architecture principles, and clinical safety requirements.

Any proposed change, PR, or refactoring that violates an invariant is automatically rejected.

---

## 1. Layering Invariants

### INV-001: Dependency Direction

Upper layers may depend on lower layers. Lower layers may never depend on upper layers.

- **Presentation** may depend on Application, Shared Kernel
- **Application** may depend on Domain interfaces, Shared Kernel, Application DTOs
- **Domain** may depend on Shared Kernel only
- **Infrastructure** may depend on Domain interfaces, Shared Kernel, Application DTOs
- **Shared Kernel** depends on nothing

**Violation example:** `ConsultationApi.ts` (Domain interface) importing `ConsultationResponseDto` from `application/dtos/` — **CURRENT BLOCKER**

### INV-002: Framework Isolation

No layer above Shared Kernel may import framework-dependent modules from Shared Kernel.

- Shared Kernel must never import React, Next.js, TanStack Query, or any UI framework
- Presentation Layer may import React freely
- Application Layer must never import React, JSX, hooks, or component files

**Violation example:** Any Application Service importing `useState`, `useEffect`, or React Context — **NONE CURRENT**

### INV-003: Shared Kernel Leaf Rule

Shared Kernel is a leaf module. No module outside Shared Kernel may be imported by Shared Kernel.

**Violation example:** `shared-kernel/feature-flags.ts` importing from `lib/` or `contexts/` — **NONE CURRENT**

---

## 2. State Ownership Invariants

### INV-004: Single Source of Truth

Every piece of state has exactly one owner. Duplication across stores is forbidden.

- UI state → Presentation Layer (useState, useReducer)
- Session state → Application Service or Provider
- Server state → React Query cache (via QueryProvider policies)
- Persistence state → Domain service or Application Service
- Offline state → DraftStorage or future IndexedDB adapter

**Violation:** Triple-write pattern for notes (reducer + React Query cache + localStorage) — **CURRENT BLOCKER**

### INV-005: State Machine Enforcement

All workflow state transitions must flow through validated state machine classes. Direct state mutation outside the state machine is forbidden.

- `ConsultationWorkflowState` must be used for all workflow transitions
- `getNextState()` and `canPerformAction()` must gate every transition
- Reducer actions like `SET_WORKFLOW_STATE` that bypass validation are forbidden

**Violation:** `ConsultationContext.tsx` reducer directly sets workflow state via `SET_WORKFLOW_STATE` without calling `getNextState()` — **CURRENT BLOCKER**

---

## 3. ConsultationContext Invariants

### INV-006: ConsultationContext Size

`ConsultationContext.tsx` must never exceed 1,100 lines. After Phase 2, it must be ≤60 lines or deleted entirely.

**Violation:** File is currently 1,019 lines and growing due to dual-path feature flags — **CURRENT BLOCKER**

### INV-007: ConsultationContext Content

ConsultationContext must never contain:
- Business logic (belongs in Application Services)
- State machine transitions (belongs in SessionWorkflow)
- Direct API calls (belongs in Use Cases via ports)
- Direct `localStorage` access (belongs in DraftStorage)
- Direct `toast` calls (belongs in NotificationService)
- Feature flag checks (belongs in shim layer only)

**Violation:** Contains all of the above — expected during transition but must be removed after extraction

---

## 4. Extraction Invariants

### INV-008: Extract-CutOver-Remove

Every extraction must follow the sequence: Create → Validate → Cut Over → Remove. Dual paths may exist only during validation and must be removed after cutover.

- Feature flags may control shim routing during validation
- Legacy code must be frozen after copy to LegacyOperations class
- After cutover, legacy code, shim, and flag must all be deleted
- ConsultationContext line count must decrease after every extraction

### INV-009: No Scattered Feature Flags

Feature flags may appear in exactly one location per extraction: inside the shim class. ConsultationContext must never import or check feature flags directly.

**Violation:** `ConsultationContext.tsx` contains 4 `isFeatureEnabled` checks scattered across saveDraft, saveNotes, loadAppointment, completeConsultation — **CURRENT BLOCKER**

### INV-010: Single Responsibility per Service

Every Application Service must have exactly one responsibility. Services must not own React state, timers, UI logic, notifications, or navigation.

**Confirmed:** DraftService correctly owns only draft lifecycle — **PASS**

---

## 5. Type Invariants

### INV-011: No Duplicate Domain Types

Every domain concept must have exactly one type definition. Duplicates in Presentation, Application, or Domain layers are forbidden.

**Violation:** `StructuredNotes` / `ConsultationNotes` defined in 3 locations — **CURRENT BLOCKER**

### INV-012: No Duplicate Business Logic

Every business rule must have exactly one implementation. Duplicated logic across services, hooks, or contexts is forbidden.

**Violation:** Version conflict detection duplicated in `useSaveConsultationDraft.ts` and `DraftService.ts` — **CURRENT BLOCKER**

---

## 6. Port and Adapter Invariants

### INV-013: Port Independence

Ports (Domain interfaces) must not depend on any layer above Shared Kernel. Ports must not import Application DTOs, Presentation types, or Infrastructure types.

**Violation:** `ConsultationApi` imports `ConsultationResponseDto` and `SaveConsultationDraftDto` from Application Layer — **CURRENT BLOCKER**

### INV-014: Adapter Isolation

Adapters must not be imported by Presentation Layer or Application Layer directly. All consumption must flow through ports.

**Violation:** `useSaveConsultationDraft.ts` imports `consultationApi` from `lib/api/consultation` (Infrastructure) — **CURRENT BLOCKER**

---

## 7. Naming Invariants

### INV-015: Consistent Feature Flag Naming

All feature flags must follow a single naming convention. Mixed conventions (`USE_DRAFT_SERVICE` vs `USE_DOCUMENTATION_PROVIDER`) are forbidden.

**Violation:** Mixed `_SERVICE` and `_PROVIDER` suffixes — **CURRENT BLOCKER**

---

## 8. Clinical Safety Invariants

### INV-016: Patient Safety Non-Negotiable

No migration step may disrupt:
- Auto-save (must trigger within 3s of last keystroke)
- Draft recovery (must restore notes after crash)
- Session integrity (start/complete/switch must not lose data)
- Queue integrity (next patient selection must match priority rules)
- Audit integrity (all clinical actions must be logged)
- Performance (no regression on 3G networks)

These requirements are mandatory and override all other constraints.

---

## 9. Testing Invariants

### INV-017: Behavioral Parity Before Cutover

Before any Application Service is promoted to canonical implementation, behavioral parity tests must prove identical behavior between legacy and new implementations.

**Status:** DraftService lacks behavioral parity tests — **CURRENT GAP**

### INV-018: No Regression

Every PR must pass all existing tests without modification. Test suites are not allowed to be updated to match broken behavior.

**Status:** 1,274 unit + 10 frontend tests pass — **PASS**

---

## 10. Rollback Invariants

### INV-019: Zero-Embedding Rollback

After any extraction, no legacy branches, commented-out code, or dormant feature flags may remain in the production code path.

**Status:** Violated by DraftService dual-path — **CURRENT BLOCKER**

---

## Summary

| Invariant | Status |
|-----------|--------|
| INV-001: Dependency Direction | 🔴 VIOLATED |
| INV-002: Framework Isolation | 🟢 PASS |
| INV-003: Shared Kernel Leaf | 🟢 PASS |
| INV-004: Single Source of Truth | 🔴 VIOLATED |
| INV-005: State Machine Enforcement | 🔴 VIOLATED |
| INV-006: ConsultationContext Size | 🔴 VIOLATED |
| INV-007: ConsultationContext Content | 🟡 IN TRANSITION |
| INV-008: Extract-CutOver-Remove | 🔴 VIOLATED |
| INV-009: No Scattered Flags | 🔴 VIOLATED |
| INV-010: Single Responsibility | 🟢 PASS |
| INV-011: No Duplicate Types | 🔴 VIOLATED |
| INV-012: No Duplicate Logic | 🔴 VIOLATED |
| INV-013: Port Independence | 🔴 VIOLATED |
| INV-014: Adapter Isolation | 🔴 VIOLATED |
| INV-015: Consistent Naming | 🔴 VIOLATED |
| INV-016: Clinical Safety | 🟢 PASS |
| INV-017: Behavioral Parity | 🟡 GAP |
| INV-018: No Regression | 🟢 PASS |
| INV-019: Zero-Embedding Rollback | 🔴 VIOLATED |

**Result: 9 invariants violated, 5 pass, 1 gap — NOT CERTIFIED**

All violations must be resolved before Phase 2 implementation proceeds.
