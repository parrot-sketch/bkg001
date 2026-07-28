# Remediation Plan

## Executive Summary

The Consultation Module modernization architecture is **approved and sound**, but the implementation has deviated from it in 6 blocking ways. These deviations are implementation bugs, not architectural flaws. All 6 blockers can be resolved without changing any approved ADR or design document.

**Certification is achievable without revisiting architectural decisions.**

The remediation plan fixes implementation to match the approved architecture through 5 independently reviewable PRs, sequenced to respect dependency direction and minimize merge conflicts.

---

## 1. Blocker Inventory

### Blocker 1: Circular Dependency (Domain → Application DTOs)

**Invariant violated:** INV-001 (Dependency Direction), INV-013 (Port Independence), INV-014 (Adapter Isolation)

**Root cause:** `domain/interfaces/services/ConsultationApi.ts` imports `ConsultationResponseDto` and `SaveConsultationDraftDto` from `application/dtos/`. This creates a cycle: Application Layer → Domain Layer → Application Layer.

**Impact:** Every new Application Service that depends on `ConsultationApi` inherits the cycle. The problem compounds as more services are extracted.

### Blocker 2: Type and Logic Duplication

**Invariants violated:** INV-011 (No Duplicate Domain Types), INV-012 (No Duplicate Business Logic)

**Root cause:** Three definitions of the same concept:
- `StructuredNotes` interface in `contexts/ConsultationContext.tsx`
- `StructuredNotes` interface in `application/services/DraftService.ts`
- `ConsultationNotes` class in `domain/value-objects/ConsultationNotes.ts`

Plus duplicated business logic:
- Version conflict detection in `useSaveConsultationDraft.ts` (lines 32-35, 82-84) and `DraftService.ts` (lines 37-46)
- Full-text formatting: 3 different implementations producing 3 different outputs

**Impact:** Changes must be synchronized manually across 2-3 files. Divergence causes data corruption.

### Blocker 3: ConsultationContext Growth

**Invariant violated:** INV-006 (ConsultationContext Size), INV-008 (Extract-CutOver-Remove), INV-009 (No Scattered Flags), INV-019 (Zero-Embedding Rollback)

**Root cause:** The DraftService extraction preserved old logic behind 4 scattered feature flags instead of using the shim-first replacement pattern.

**Impact:** ConsultationContext grew from 1,004 to 1,019 lines. Every subsequent extraction will add more flags and branches if the pattern is not corrected.

### Blocker 4: Triple-Write Pattern

**Invariant violated:** INV-004 (Single Source of Truth), INV-007 (ConsultationContext Content)

**Root cause:** Notes are written simultaneously to:
1. Reducer state (`state.notes`) — UI source of truth
2. React Query cache (via `useSaveConsultationDraft.ts` optimistic updates)
3. localStorage (via `LocalStorageDraftStorage`)

All three writes happen on every save with no clear single source of truth.

**Impact:** State inconsistencies, difficult debugging, violates ADR-003 state ownership taxonomy.

### Blocker 5: State Machine Bypass

**Invariant violated:** INV-005 (State Machine Enforcement)

**Root cause:** `ConsultationContext.tsx` reducer directly sets workflow state via `SET_WORKFLOW_STATE` action without calling `getNextState()` or `canPerformAction()` from `ConsultationWorkflowState`. The state machine helper functions exist but are unused in production.

**Impact:** Invalid transitions are possible. The ADR-004 investment in a state machine is wasted.

### Blocker 6: Duplicated Business Logic

**Invariant violated:** INV-012 (No Duplicate Business Logic)

**Root cause:** Version conflict detection string matching (`'updated by another session'`, `'VERSION_CONFLICT'`) appears in both `useSaveConsultationDraft.ts` and `DraftService.ts`.

**Impact:** If conflict strings change, both locations must be updated. Easy to miss one.

---

## 2. Remediation Strategy

The remediation follows the same shim-first replacement pattern approved for Application Service extraction. Each PR:
1. Implements one architectural correction
2. Is independently reviewable, deployable, testable, and reversible
3. Leaves the codebase cleaner than it found it
4. Respects dependency direction

### Principle: Fix Foundation Before Facade

```
Layer 1: Dependency Direction (PR-R1)
    ↓
Layer 2: Type Consolidation (PR-R2)
    ↓
Layer 3: State Hygiene (PR-R3)
    ↓
Layer 4: Migration Correction (PR-R4)
    ↓
Layer 5: Naming Cleanup (PR-R5)
```

Each layer depends on the previous one being clean. This prevents compounding fixes.

---

## 3. Dependency Graph

```
PR-R1: Fix Circular Dependency
    │
    ├── Enables PR-R2 (type consolidation needs clean Domain ↔ Application boundary)
    │       │
    │       ├── Enables PR-R3 (state hygiene needs clean types)
    │       │       │
    │       │       └── Enables PR-R4 (shim-first extraction needs clean context)
    │       │               │
    │       │               └── Enables certification
    │       │
    │       └── Parallel: PR-R5 (naming cleanup)
    │
    └── No other dependencies
```

**Critical path:** PR-R1 → PR-R2 → PR-R3 → PR-R4 → Certification

**Optional parallel:** PR-R5 can execute at any time after PR-R1

---

## 4. Risk Assessment

| PR | Risk Level | Rationale |
|----|-----------|-----------|
| PR-R1 | Medium | Moving DTO references changes the ConsultationApi interface contract. All consumers must be updated. |
| PR-R2 | Low | Type consolidation is additive — old types remain as aliases during transition. |
| PR-R3 | Medium | State machine enforcement changes reducer behavior. Must validate all transitions. |
| PR-R4 | Low | Shim-first replacement removes scattered flags. Legacy paths are frozen, not deleted until validation. |
| PR-R5 | Low | Renaming constants is straightforward with IDE refactoring. |

**Overall risk:** MEDIUM — all risks are manageable with behavioral parity tests and staged rollout.

---

## 5. Rollback Strategy

Every PR has a one-command rollback:

| PR | Rollback Mechanism |
|----|-------------------|
| PR-R1 | Git revert — ConsultationApi interface restored, consumers reverted |
| PR-R2 | Git revert — old types restored, aliases removed |
| PR-R3 | Git revert — reducer restored to bypassed transitions |
| PR-R4 | Git revert — scattered flags restored, shim deleted |
| PR-R5 | Git revert — old flag names restored |

**Zero-embedding guarantee:** No PR leaves commented-out code, legacy branches, or dormant flags after cutover.

---

## 6. Validation Strategy

Each PR includes:
1. **Unit tests** for the specific concern (type changes, state transitions, shim routing)
2. **Behavioral parity tests** proving old and new behaviors match
3. **Regression tests** verifying 1,274 existing tests still pass
4. **Architecture compliance tests** verifying invariants (dependency graph, no circular deps, etc.)
5. **Frontend tests** verifying UI behavior unchanged

Post-remediation validation:
1. Re-run consistency audit across all 51 architecture documents
2. Re-score all 13 categories in architecture-scorecard.md
3. Verify all 19 invariants in architecture-invariants.md pass
4. Verify ConsultationContext is ≤1,019 lines (target: ≤810 after PR-R4)
5. Verify zero circular dependencies
6. Verify zero duplicate types
7. Verify zero scattered feature flags

---

## 7. Expected Technical Debt Reduction

| Blocker | Before | After | Debt Removed |
|---------|--------|-------|--------------|
| 1. Circular dependency | Domain → Application DTOs | Clean layers | Circular dependency eliminated |
| 2. Type duplication | 3 `StructuredNotes` definitions | 1 Domain VO | 2 duplicate definitions removed |
| 3. Context growth | 1,019 lines, 4 scattered flags | ≤810 lines, 0 flags | Dual-path complexity removed |
| 4. Triple-write | 3 simultaneous writes | 1 source + 2 caches | Ambiguity eliminated |
| 5. State machine bypass | 0% state machine usage | 100% validated transitions | Dead code removed |
| 6. Duplicated logic | 2 version conflict checks | 1 Shared Kernel utility | DRY violation eliminated |

**Overall:** 6 architectural violations → 0. ConsultationContext reduced by ~210 lines. All invariants pass.
