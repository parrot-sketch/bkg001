# Remediation Roadmap

## Executive Summary

This roadmap defines the week-by-week execution sequence for resolving the 6 blocking architecture violations. The remediation spans 2 weeks (10 working days) and restores full compliance with all 19 architectural invariants.

**Total PRs:** 5
**Total days:** 10
**Certification target:** End of Week 2

---

## Week 1: Foundation Fixes (5 days)

### Day 1-2: PR-R1 — Fix Circular Dependency

**Concern:** Layer boundary violation (INV-001, INV-013, INV-014)

**Objective:** Remove Application DTO imports from `ConsultationApi` Domain interface.

**Actions:**
1. Read all consumers of `ConsultationApi` to understand DTO usage
2. Move `ConsultationResponseDto` and `SaveConsultationDraftDto` references to Shared Kernel or use generic `ApiOutcome<T>` pattern
3. Update `domain/interfaces/services/ConsultationApi.ts` to remove Application DTO imports
4. Update all consumers (DraftService, adapters, hooks) to use new types
5. Run full regression suite

**Deliverables:**
- `domain/interfaces/services/ConsultationApi.ts` — zero Application DTO imports
- Updated consumers using new type strategy
- Circular dependency verification (`madge` or equivalent)

**Validation:**
- `tsc --noEmit` passes with zero circular dependency errors
- All 1,274 unit tests pass
- All 10 frontend tests pass
- Import graph has no cycles

**Rollback:** `git revert` — single commit, zero data migration

**Risk:** MEDIUM — interface contract changes affect all consumers

---

### Day 3-4: PR-R2 — Consolidate Domain Types and Business Logic

**Concern:** Type duplication (INV-011), Logic duplication (INV-012)

**Objective:** Single source of truth for `StructuredNotes`, version conflict detection, and full-text formatting.

**Actions:**
1. Make `ConsultationNotes` Domain VO the canonical type
2. Re-export `ConsultationNotes` (or a compatible type alias) from Shared Kernel for Application Layer consumption
3. Move `generateFullText` and `parseLegacyNotes` to `shared-kernel/utils/note-serialization.ts`
4. Move version conflict detection to `shared-kernel/utils/version-conflict.ts`
5. Update `DraftService.ts` to use Domain VO and Shared Kernel utilities
6. Update `ConsultationContext.tsx` to use Domain VO
7. Delete duplicate `StructuredNotes`, `formatStructuredNotes`, and version conflict strings from hooks
8. Keep old types as deprecated aliases during transition (to be removed in PR-R4)

**Deliverables:**
- `shared-kernel/utils/note-serialization.ts` — single `generateFullText` / `parseLegacyNotes` implementation
- `shared-kernel/utils/version-conflict.ts` — single `isVersionConflict` implementation
- `domain/value-objects/ConsultationNotes.ts` — canonical notes VO
- Updated `DraftService.ts` using Domain VO
- Deprecated aliases in Presentation Layer

**Validation:**
- Unit tests for new Shared Kernel utilities
- Behavioral parity: old and new serialization produce identical output
- `grep` verifies zero duplicate type definitions
- `grep` verifies zero duplicate version conflict strings

**Rollback:** `git revert` — old types restored, aliases removed

**Risk:** LOW — additive changes with deprecation path

---

### Day 5: PR-R5 — Standardize Feature Flag Naming

**Concern:** Naming inconsistency (INV-015)

**Objective:** Uniform feature flag naming convention.

**Actions:**
1. Define canonical naming convention: `USE_<CAPABILITY>_SERVICE` for Application Services, `USE_<CAPABILITY>_PROVIDER` for React Providers
2. Rename `USE_DRAFT_SERVICE` → `USE_DRAFT_SERVICE` (already correct)
3. Rename all `_PROVIDER` flags to `_SERVICE` to match Application Service naming (or vice versa — pick one)
4. Update `shared-kernel/feature-flags.ts`
5. Update all references in architecture documents

**Deliverables:**
- Consistent flag naming in `feature-flags.ts`
- Updated architecture documents referencing new names

**Validation:**
- `grep` verifies zero mixed naming patterns
- All flag keys follow single convention

**Rollback:** `git revert` — old names restored

**Risk:** LOW — rename-only change

**Note:** PR-R5 can execute in parallel with PR-R1 through PR-R4 because it touches only `shared-kernel/feature-flags.ts` and does not affect runtime behavior.

---

## Week 2: State Hygiene and Migration Correction (5 days)

### Day 6-7: PR-R3 — Enforce State Ownership and State Machine

**Concern:** Triple-write pattern (INV-004), State machine bypass (INV-005), ConsultationContext content (INV-007)

**Objective:** Define single source of truth for notes and enforce validated workflow transitions.

**Actions:**
1. **State ownership fix:**
   - Define `DocumentationProvider` as the single source of truth for `notes`
   - React Query cache becomes the server-state cache (read-through from DocumentationProvider)
   - localStorage becomes backup only (written by DraftService, not by ConsultationContext)
   - Remove `SET_NOTES`, `UPDATE_NOTE_FIELD` from ConsultationContext reducer
2. **State machine enforcement:**
   - Replace direct `SET_WORKFLOW_STATE` assignments with `getNextState()` calls
   - Add `canPerformAction()` guard to every state transition in reducer
   - Update reducer actions to use validated transitions only
3. **ConsultationContext content cleanup:**
   - Remove direct API calls (delegate to SessionService shim)
   - Remove direct localStorage calls (delegate to DraftService shim)

**Deliverables:**
- `contexts/ConsultationContext.tsx` with enforced state machine
- State ownership documentation updated
- Reducer using `ConsultationWorkflowState` helpers

**Validation:**
- Unit tests for every state transition (valid and invalid)
- Behavioral parity: same UI behavior before and after
- `grep` verifies zero direct `SET_WORKFLOW_STATE` without validation
- `grep` verifies zero `localStorage` calls in ConsultationContext
- `grep` verifies zero direct API calls in ConsultationContext

**Rollback:** `git revert` — reducer restored to direct assignments

**Risk:** MEDIUM — changes reducer behavior; must validate all transitions

---

### Day 8-9: PR-R4 — Correct DraftService Migration Strategy

**Concern:** Extraction pattern (INV-006, INV-008, INV-009, INV-019)

**Objective:** Implement shim-first replacement for DraftService and remove scattered flags.

**Actions:**
1. Create `application/shim/LegacyDraftOperations.ts` — exact copy of current dual-path draft logic from ConsultationContext
2. Create `application/shim/DraftOperationsShim.ts` — single feature flag check, routes to legacy or DraftService
3. Update `contexts/ConsultationContext.tsx`:
   - Replace all 4 scattered `isFeatureEnabled` checks with single shim call
   - Remove old inline draft logic (now in LegacyDraftOperations)
   - Remove `USE_DRAFT_SERVICE` flag references from context
4. Run behavioral parity tests with flag ON and OFF
5. After 1 day of clean production traffic:
   - Delete `LegacyDraftOperations.ts`
   - Delete feature flag `USE_DRAFT_SERVICE` from `feature-flags.ts`
   - Update ConsultationContext to call DraftService directly
   - Verify ConsultationContext line count decreased

**Deliverables:**
- `application/shim/DraftOperationsShim.ts`
- `application/shim/LegacyDraftOperations.ts` (temporary)
- Cleaned `contexts/ConsultationContext.tsx` with zero feature flag checks
- Deleted legacy paths and flag

**Validation:**
- Behavioral parity tests pass for both flag ON and OFF
- After cutover: `grep` verifies zero `isFeatureEnabled` in ConsultationContext
- After cutover: `wc -l` shows ConsultationContext ≤810 lines
- All unit tests pass
- All frontend tests pass

**Rollback:** `git revert` — restores scattered flags and old logic

**Risk:** LOW — shim pattern is well-defined; legacy paths are frozen, not deleted until validation passes

---

### Day 10: Integration Validation and Certification Prep

**Actions:**
1. Run full regression suite across all 5 PRs
2. Re-run consistency audit:
   - Verify zero circular dependencies
   - Verify zero duplicate types
   - Verify zero scattered feature flags
   - Verify zero triple-write patterns
   - Verify zero state machine bypasses
3. Re-score architecture-scorecard.md categories
4. Verify all 19 invariants in architecture-invariants.md pass
5. Generate certification-readiness report

**Deliverables:**
- Updated `architecture-scorecard.md` with post-remediation scores
- Updated `architecture/architecture-invariants.md` showing all-pass
- `architecture/certification-readiness-checklist.md` completed

---

## Critical Path

```
PR-R1: Fix Circular Dependency
    │ (2 days)
    ▼
PR-R2: Consolidate Types
    │ (2 days)
    ▼
PR-R3: Enforce State Ownership + State Machine
    │ (2 days)
    ▼
PR-R4: Correct DraftService Migration Strategy
    │ (2 days)
    ▼
PR-R5: Standardize Feature Flag Naming (parallel, can run any time after PR-R1)
    │ (2 days, overlaps with R3/R4)
    ▼
Integration Validation + Certification Prep
    │ (1 day)
    ▼
CERTIFICATION
```

**Total critical path duration:** 9 working days (Week 1: 5 days + Week 2: 4 days)

---

## Parallel Execution Opportunities

| PR | Can Parallel With | Constraint |
|----|-------------------|------------|
| PR-R1 | None | Must land first |
| PR-R2 | None | Must land before PR-R3 |
| PR-R3 | PR-R5 | Must land before PR-R4 |
| PR-R4 | PR-R5 | Must land after PR-R3 |
| PR-R5 | PR-R1 (after) | Can run in parallel with R3/R4 |

**Optimal parallel execution:**
- Days 1-2: PR-R1
- Days 3-4: PR-R2 + PR-R5 (R5 runs in parallel with R2)
- Days 6-7: PR-R3
- Days 8-9: PR-R4
- Day 10: Integration validation

**Total calendar time:** 10 days (vs. 13 days if fully sequential)

---

## Milestones

| Milestone | Day | Criteria |
|-----------|-----|----------|
| Foundation clean | Day 2 | PR-R1 merged: zero circular deps |
| Types consolidated | Day 4 | PR-R2 merged: single StructuredNotes, zero duplicate logic |
| Feature flags consistent | Day 4 | PR-R5 merged: uniform naming |
| State hygiene enforced | Day 7 | PR-R3 merged: state machine enforced, triple-write eliminated |
| DraftService corrected | Day 9 | PR-R4 merged: shim-first pattern, ConsultationContext ≤810 lines |
| Integration validated | Day 10 | All PRs pass regression, consistency audit passes |
| Certification ready | Day 10 | All 19 invariants pass, scorecard ≥ 7.5/10 |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| PR-R1 breaks consumers | Medium | High | Behavioral parity tests before/after; staged rollout |
| PR-R2 type alias confusion | Low | Medium | Deprecation warnings; clear migration guide |
| PR-R3 state transition bug | Medium | High | Exhaustive transition matrix tests; clinical SME review |
| PR-R4 shim routing error | Low | High | Feature flag defaults to legacy; canary deployment |
| PR-R5 naming breakage | Low | Low | IDE-assisted rename; grep verification |

---

## Certification Criteria

After all PRs merge, the architecture is certifiable when:

1. **Zero circular dependencies** in import graph
2. **Zero duplicate domain types** across layers
3. **Zero duplicate business logic** across files
4. **Zero scattered feature flags** in ConsultationContext
5. **Zero triple-write patterns** for any state
6. **Zero state machine bypasses** in production reducer
7. **ConsultationContext ≤810 lines** (after PR-R4 cutover)
8. **All 19 invariants pass**
9. **All 1,274 unit tests + 10 frontend tests pass**
10. **Architecture scorecard weighted average ≥ 7.5/10 with no category below 6/10**

If all 10 criteria are met, the architecture is **CERTIFIED** and Phase 2 may proceed.
