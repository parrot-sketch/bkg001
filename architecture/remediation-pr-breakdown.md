# Remediation PR Breakdown

## Overview

This document defines 5 remediation PRs that resolve all 6 blocking architecture violations. Each PR addresses exactly one architectural concern, is independently reviewable, independently deployable, independently testable, and independently reversible.

---

## PR-R1: Fix Circular Dependency Between Domain and Application

### Summary

Remove Application DTO imports from `ConsultationApi` Domain interface. This unblocks all future Application Service work.

### Architectural Concern

Layer boundary violation (INV-001, INV-013, INV-014)

### Root Cause

`domain/interfaces/services/ConsultationApi.ts` imports `ConsultationResponseDto` and `SaveConsultationDraftDto` from `application/dtos/`, creating a circular dependency: Application → Domain → Application.

### Scope

**Files changed:**
- `domain/interfaces/services/ConsultationApi.ts` — remove Application DTO imports, replace with generic types or Shared Kernel DTOs
- `shared-kernel/dtos/Consultation.ts` — new: generic DTOs for consultation responses (if needed)
- `application/dtos/ConsultationResponseDto.ts` — update to import from Shared Kernel or remain as Application DTO with generic port types
- `application/services/DraftService.ts` — update imports
- `domain/interfaces/services/PatientApi.ts` — verify no similar violations
- `domain/interfaces/services/QueueApi.ts` — verify no similar violations

**Files NOT changed:**
- `contexts/ConsultationContext.tsx`
- `application/services/SessionService.ts` (does not exist yet)
- Any provider files

### Dependency Graph After Fix

```
Application Layer
    ↓
ConsultationApi (Domain interface) — imports ONLY from Shared Kernel
    ↓
Infrastructure adapters — implement ConsultationApi
```

### Migration Impact

**High impact:** `ConsultationApi` interface contract changes. All consumers must be updated in the same PR.

**Consumers affected:**
- `application/services/DraftService.ts`
- `lib/api/consultation-adapter.ts`
- `lib/api/patient-adapter.ts` (if it imports ConsultationApi)
- `hooks/consultation/useConsultation.ts`
- `hooks/consultation/useSaveConsultationDraft.ts`

### Risk

**Medium.** Interface contract changes affect all consumers. Mitigated by behavioral parity tests.

### Rollback

`git revert <PR-R1-commit>` — restores original interface and consumer imports. Zero data migration.

### Testing Requirements

1. **Unit tests:** ConsultationApi interface contract tests
2. **Integration tests:** Adapter → mock backend with new DTO types
3. **Regression tests:** All 1,274 unit tests + 10 frontend tests pass
4. **Architecture tests:** `madge` circular dependency check passes

### Certification Criteria

After PR-R1:
- [ ] `ConsultationApi.ts` has zero Application DTO imports
- [ ] `madge` reports zero circular dependencies
- [ ] All tests pass

---

## PR-R2: Consolidate Note Types and Business Logic

### Summary

Single source of truth for `StructuredNotes` / `ConsultationNotes`. Move serialization and version conflict detection to Shared Kernel utilities.

### Architectural Concern

Type duplication (INV-011), Logic duplication (INV-012)

### Root Cause

`StructuredNotes` defined in 3 locations. `generateFullText` / `parseLegacyNotes` duplicated between DraftService and ConsultationContext. Version conflict detection duplicated between `useSaveConsultationDraft.ts` and `DraftService.ts`.

### Scope

**Files changed:**
- `domain/value-objects/ConsultationNotes.ts` — canonical VO (already exists, may need minor adjustments)
- `shared-kernel/utils/note-serialization.ts` — new: `generateFullText`, `parseLegacyNotes`
- `shared-kernel/utils/version-conflict.ts` — new: `isVersionConflict`
- `shared-kernel/types/StructuredNotes.ts` — new: re-export or type alias from Domain VO
- `application/services/DraftService.ts` — import from Shared Kernel, remove local definitions
- `hooks/consultation/useSaveConsultationDraft.ts` — import from Shared Kernel, remove local definitions
- `contexts/ConsultationContext.tsx` — import from Shared Kernel, keep old type as deprecated alias

**Files NOT changed:**
- `domain/interfaces/services/ConsultationApi.ts`
- Any provider files
- `shared-kernel/feature-flags.ts`

### Dependency Graph After Fix

```
Shared Kernel
    ├── types/StructuredNotes.ts — single type definition
    ├── utils/note-serialization.ts — single generateFullText/parseLegacyNotes
    └── utils/version-conflict.ts — single isVersionConflict

Application Layer
    └── DraftService — imports from Shared Kernel only

Presentation Layer
    └── useSaveConsultationDraft — imports from Shared Kernel only
```

### Migration Impact

**Medium impact.** All notes-related code must reference the new canonical type. Old types remain as deprecated aliases during transition.

### Risk

**Low.** Additive changes with deprecation path. No behavior changes.

### Rollback

`git revert <PR-R2-commit>` — old types restored, aliases removed.

### Testing Requirements

1. **Unit tests:** New Shared Kernel utilities (serialization, conflict detection)
2. **Behavioral parity tests:** Old and new serialization produce identical output
3. **Regression tests:** All existing tests pass
4. **Grep verification:** Zero duplicate type definitions, zero duplicate conflict strings

### Certification Criteria

After PR-R2:
- [ ] `grep` reports exactly 1 `StructuredNotes` definition
- [ ] `grep` reports exactly 1 `generateFullText` implementation
- [ ] `grep` reports exactly 1 `parseLegacyNotes` implementation
- [ ] `grep` reports exactly 1 `isVersionConflict` implementation
- [ ] All tests pass

---

## PR-R3: Enforce State Ownership and State Machine

### Summary

Eliminate triple-write pattern for notes and enforce validated workflow state transitions in ConsultationContext reducer.

### Architectural Concern

State ownership (INV-004), State machine enforcement (INV-005), ConsultationContext content (INV-007)

### Root Cause

Notes written to reducer, React Query cache, and localStorage simultaneously. Workflow state set directly via `SET_WORKFLOW_STATE` without validation.

### Scope

**Files changed:**
- `contexts/ConsultationContext.tsx` — reducer, effects, state management
- `domain/workflows/ConsultationWorkflowState.ts` — may need additional export of helper functions
- `shared-kernel/utils/state-machine-helpers.ts` — new: re-export `getNextState`, `canPerformAction` if needed

**Files NOT changed:**
- `application/services/DraftService.ts`
- Any provider files
- `shared-kernel/feature-flags.ts`

### Dependency Graph After Fix

```
ConsultationContext reducer
    ↓
ConsultationWorkflowState.getNextState() — validated transitions only
    ↓
No direct SET_WORKFLOW_STATE without validation
```

### Migration Impact

**High impact.** Reducer behavior changes. All state transitions must be validated. Requires exhaustive testing of every transition path.

### Risk

**Medium.** State machine enforcement could surface previously-hidden invalid transitions. Mitigated by behavioral parity tests.

### Rollback

`git revert <PR-R3-commit>` — reducer restored to direct assignments.

### Testing Requirements

1. **Unit tests:** Every valid state transition (IDLE → LOADING → READY → ACTIVE → COMPLETING → TRANSITIONING → READY)
2. **Unit tests:** Every invalid transition rejected (e.g., ACTIVE → READY without completing)
3. **Behavioral parity tests:** Same UI behavior before and after
4. **Regression tests:** All existing tests pass
5. **Grep verification:** Zero `SET_WORKFLOW_STATE` without `getNextState` call
6. **Grep verification:** Zero `localStorage` calls in ConsultationContext

### Certification Criteria

After PR-R3:
- [ ] `grep` reports zero `localStorage` calls in ConsultationContext
- [ ] `grep` reports zero direct API client calls in ConsultationContext
- [ ] All workflow transitions use `getNextState()` or `canPerformAction()`
- [ ] All tests pass

---

## PR-R4: Correct DraftService Migration Strategy

### Summary

Implement shim-first replacement for DraftService. Remove 4 scattered feature flags. Delete legacy paths after validation.

### Architectural Concern

Extraction pattern (INV-006, INV-008, INV-009, INV-019)

### Root Cause

DraftService was extracted with scattered feature flags instead of the approved shim-first replacement pattern. Old logic preserved in `else` branches across 4 locations.

### Scope

**Files created:**
- `application/shim/LegacyDraftOperations.ts` — frozen copy of old draft logic from ConsultationContext
- `application/shim/DraftOperationsShim.ts` — single feature flag check, routes to legacy or DraftService

**Files modified:**
- `contexts/ConsultationContext.tsx` — replace 4 scattered `isFeatureEnabled` checks with shim calls; remove old inline draft logic
- `shared-kernel/feature-flags.ts` — remove `USE_DRAFT_SERVICE` flag after cutover

**Files deleted (after cutover):**
- `application/shim/LegacyDraftOperations.ts` — old logic permanently removed
- `application/shim/DraftOperationsShim.ts` — shim no longer needed

**Files NOT changed:**
- `application/services/DraftService.ts` (unchanged — already implemented)
- Any provider files

### Dependency Graph After Fix

```
ConsultationContext
    ↓
DraftOperationsShim (temporary, deleted after cutover)
    ↓
DraftService (permanent)
```

After cutover:
```
ConsultationContext
    ↓
DraftService (direct)
```

### Migration Impact

**Medium impact.** ConsultationContext delegates all draft operations through shim. Feature flag controls routing during validation. After cutover, shim is deleted.

### Risk

**Low.** Shim pattern is well-defined. Legacy paths are frozen, not deleted until validation passes. Feature flag defaults to legacy (safe default).

### Rollback

During validation: disable `USE_DRAFT_SERVICE` flag → shim routes to legacy. No code changes needed.
After cutover: `git revert <PR-R4-commit>` — restores scattered flags and old logic.

### Testing Requirements

1. **Unit tests:** Shim routing tests (flag ON → service, flag OFF → legacy)
2. **Behavioral parity tests:** Flag ON vs OFF produce identical outputs for 10+ scenarios
3. **Integration tests:** DraftService → ConsultationApi → mock backend
4. **Regression tests:** All existing tests pass
5. **Grep verification after cutover:** Zero `isFeatureEnabled` in ConsultationContext
6. **Line count verification:** `wc -l` shows ConsultationContext ≤810 lines after cutover

### Certification Criteria

After PR-R4:
- [ ] `grep` reports zero `isFeatureEnabled` in ConsultationContext
- [ ] `grep` reports zero `localStorage` calls in ConsultationContext
- [ ] `wc -l` shows ConsultationContext ≤810 lines
- [ ] `LegacyDraftOperations.ts` deleted
- [ ] `DraftOperationsShim.ts` deleted
- [ ] `USE_DRAFT_SERVICE` flag deleted
- [ ] All tests pass

---

## PR-R5: Standardize Feature Flag Naming

### Summary

Enforce uniform naming convention for all feature flags.

### Architectural Concern

Naming consistency (INV-015)

### Root Cause

Mixed `_SERVICE` and `_PROVIDER` suffixes in `shared-kernel/feature-flags.ts`.

### Scope

**Files changed:**
- `shared-kernel/feature-flags.ts` — rename inconsistent flags
- Architecture documents referencing flag names

**Files NOT changed:**
- `contexts/ConsultationContext.tsx`
- `application/services/DraftService.ts`
- Any provider files

### Risk

**Low.** Rename-only change. No behavior changes.

### Rollback

`git revert <PR-R5-commit>` — old names restored.

### Testing Requirements

1. **Unit tests:** Feature flag registry tests updated with new names
2. **Grep verification:** Zero mixed naming patterns in `feature-flags.ts`
3. **Regression tests:** All existing tests pass

### Certification Criteria

After PR-R5:
- [ ] All feature flags follow single naming convention
- [ ] All tests pass

---

## PR Interleaving and Merge Order

```
Day 1-2:   PR-R1 merges
Day 3-4:   PR-R2 merges + PR-R5 merges (parallel)
Day 6-7:   PR-R3 merges
Day 8-9:   PR-R4 merges
Day 10:    Integration validation
```

**Why this order:**
1. PR-R1 must land first — all other PRs benefit from clean dependency direction
2. PR-R2 depends on PR-R1 — type consolidation needs clean Domain/Application boundary
3. PR-R5 can run in parallel with PR-R2 — independent concern, no file overlap
4. PR-R3 depends on PR-R2 — state hygiene needs clean types (StructuredNotes)
5. PR-R4 depends on PR-R3 — shim-first extraction needs clean ConsultationContext
6. PR-R4 is the final remediation — it removes the scattered flags introduced by the flawed DraftService extraction

**Merge conflict minimization:**
- PR-R1 touches `domain/interfaces/` and `shared-kernel/` — no overlap with others
- PR-R2 touches `domain/value-objects/`, `shared-kernel/utils/`, and `application/services/` — no overlap with PR-R3/R4
- PR-R3 touches `contexts/ConsultationContext.tsx` and `domain/workflows/` — no overlap with PR-R4's new files
- PR-R4 touches `contexts/ConsultationContext.tsx` and `application/shim/` — different files from PR-R3
- PR-R5 touches `shared-kernel/feature-flags.ts` — independent

The only sequential merge risk is PR-R2 → PR-R3 → PR-R4, which all touch `ConsultationContext.tsx` but at different times (R2 adds aliases, R3 fixes state machine, R4 removes flags). They can be rebased cleanly.

---

## Rollback Matrix

| Scenario | Rollback Action | Result |
|----------|----------------|--------|
| PR-R1 breaks consumers | `git revert R1` | ConsultationApi restored, circular dependency returns |
| PR-R2 causes type confusion | `git revert R2` | Old types restored, aliases removed |
| PR-R3 causes state transition bug | `git revert R3` | Reducer restored to direct assignments |
| PR-R4 shim routing fails | Disable flag or `git revert R4` | Legacy path active or scattered flags restored |
| PR-R5 naming breaks build | `git revert R5` | Old flag names restored |

**All rollbacks are single-command git operations. No data migration. No manual fixups.**
