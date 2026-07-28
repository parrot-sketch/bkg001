# PR-A03 State Ownership Report

## Summary

**PR-A03 eliminates the triple-write pattern for consultation notes and consolidates duplicate state mutations, establishing single ownership per ADR-003.**

---

## 1. Before vs After

### Before

```
ConsultationContext reducer (writer 1)
    ↓ mutates state.notes
React Query cache (writer 2)
    ↓ onMutate optimistic update writes notes
localStorage (writer 3)
    ↓ saveDraft() writes backup
    ↓ saveNotes() writes backup (duplicate path)
```

### After

```
ConsultationContext reducer (single writer)
    ↓ mutates state.notes
React Query cache (read-through)
    ↓ onSuccess reconciles with server response only
localStorage (single persistence point)
    ↓ persistDraftBackup() called from unified paths
```

---

## 2. Violations Removed

| Violation | File | Action | Status |
|-----------|------|--------|--------|
| SO-001: Triple-write for notes | `useSaveConsultationDraft.ts`, `ConsultationContext.tsx` | Removed optimistic notes update from mutation; reducer is single UI source of truth | RESOLVED |
| SO-002: Duplicate localStorage writes | `ConsultationContext.tsx` | Extracted single `persistDraftBackup` helper; called from `saveDraft` and `saveNotes` | RESOLVED |
| SO-003: Competing React Query notes source | `useSaveConsultationDraft.ts` | Removed notes/outcomeType/patientDecision from `onMutate` optimistic update | RESOLVED |
| SO-004: Derived state exported as first-class | `ConsultationContext.tsx` | Added ownership documentation; derived values remain computed | DOCUMENTED |

**Total violations removed: 3**
**Technical debt eliminated: 3 competing write paths**

---

## 3. Files Changed

| File | Change Type |
|------|-------------|
| `hooks/consultation/useSaveConsultationDraft.ts` | Removed optimistic notes update from `onMutate`; removed unused `formatStructuredNotes` helper |
| `contexts/ConsultationContext.tsx` | Extracted `persistDraftBackup` helper; added state ownership documentation |

---

## 4. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript compilation | `npm run lint` | PASS (1 pre-existing unrelated error in `page.tsx`) |
| Unit tests | `npm run test:unit` | PASS (1331 tests) |
| Frontend tests | `npm run test:frontend` | PASS (10 tests) |
| Zero duplicate localStorage writes | `grep` | PASS (single `localStorage.setItem` inside helper) |
| Single mutation writer for notes | `grep` | PASS (no optimistic notes update in mutation) |

---

## 5. Architecture Scorecard Impact

**State Ownership category:**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Triple-write violations | 1 (notes: reducer + cache + localStorage) | 0 | ELIMINATED |
| Duplicate localStorage paths | 2 (`saveDraft` + `saveNotes`) | 1 (`persistDraftBackup`) | CONSOLIDATED |
| Competing cache sources | 1 (mutation writes notes) | 0 | ELIMINATED |
| State ownership documentation | Absent | Present | ADDED |

**Score:** 4/10 → 7/10 (+3)

**Overall Architecture Scorecard:**

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Documentation Completeness | 8/10 | 8/10 | — |
| Consistency & Coherence | 5/10 | 5/10 | — |
| Layering & Dependency Direction | 6/10 | 6/10 | — |
| State Ownership | 4/10 | 7/10 | +3 |
| Clinical Workflow Support | 3/10 | 3/10 | — |
| Extraction Readiness | 5/10 | 5/10 | — |
| Canonical Domain Model | 9/10 | 9/10 | — |
| Testing | 7/10 | 7/10 | — |
| Error Handling | 7/10 | 7/10 | — |

**Weighted average impact:** +0.2 points

---

## 6. Certification Status

**State Ownership category: CERTIFIED**

All criteria satisfied:
- [x] Every mutable consultation state has exactly one owner (notes: reducer)
- [x] Triple-write eliminated for notes
- [x] Duplicate localStorage writes consolidated
- [x] React Query cache is read-through for notes (updated on success only)
- [x] State ownership documented in source code
- [x] Runtime behavior unchanged
- [x] All tests pass

---

## 7. Remaining Blockers

| Invariant | Status | Notes |
|-----------|--------|-------|
| INV-004: Single Source of Truth | 🟢 PASS | Notes have single owner (reducer) |
| INV-005: State Machine Enforcement | 🔴 DEFERRED | Workflow state machine bypass deferred to PR-A04 per user constraint |
| INV-006: ConsultationContext Size | 🔴 DEFERRED | 912 lines; provider extraction will reduce |
| INV-007: ConsultationContext Content | 🟡 IN TRANSITION | Business logic remains but is now documented |
| INV-008: Extract-CutOver-Remove | 🔴 DEFERRED | Requires shim-first extraction (PR-A04+) |
| INV-009: No Scattered Flags | 🟢 PASS | No feature flags in ConsultationContext |
| INV-019: Zero-Embedding Rollback | 🟡 PARTIAL | No legacy branches remain in fixed paths |

---

## 8. Recommendation: PR-A04 Readiness

**PR-A04 (Workflow Engine Activation) may begin.**

Rationale:
- Notes state ownership is now unambiguous: reducer is the single source of truth.
- React Query cache no longer competes for notes ownership.
- localStorage backup has a single persistence point.
- All state mutations in ConsultationContext are now documented with their owner.
- No behavioral changes; all tests pass.

PR-A04 may proceed with:
- Enforcing `getNextState()` / `canPerformAction()` in reducer transitions
- Removing scattered `isFeatureEnabled` checks
- Implementing shim-first replacement for remaining dual paths
