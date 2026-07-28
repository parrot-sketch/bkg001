# State Ownership Remediation

## Scope

This document defines the remediation steps for state ownership violations. Only **RI-001, RI-002, RI-003** are resolved in this PR. Workflow state machine enforcement (INV-005) is deferred to PR-A04 per user constraints.

---

## Remediation: RI-001, RI-002, RI-003 — Eliminate Triple-Write for Notes

### Root Cause

Three independent write paths for `notes` with no coordination:
1. ConsultationContext reducer
2. React Query cache via mutation optimistic update
3. localStorage via two duplicate write paths

### Target Owner

ConsultationContext reducer (single UI source of truth for notes).

### Migration Approach

**Files modified:**
- `hooks/consultation/useSaveConsultationDraft.ts` — remove optimistic notes update from `onMutate`
- `contexts/ConsultationContext.tsx` — extract single localStorage backup helper

**Files NOT changed:**
- `components/consultation/ConsultationWorkspaceOptimized.tsx`
- `components/consultation/CompleteConsultationDialog.tsx`
- Any provider files

### Step 1: Remove optimistic notes update from mutation

In `useSaveConsultationDraft.ts`:
- Keep `onMutate` for snapshot/rollback only
- Remove notes, outcomeType, patientDecision from optimistic cache update
- Let `onSuccess` reconcile the cache with server response

### Step 2: Consolidate localStorage backup

In `ConsultationContext.tsx`:
- Extract `persistDraftBackup(appointmentId, notes)` helper
- Replace both `localStorage.setItem` calls with this helper
- Helper is called from `saveDraft` and `saveNotes`

### Step 3: Document ownership

Add comments in ConsultationContext marking the single owner for each state category.

### Rollback

`git revert <PR-commit>` restores original mutation behavior and localStorage writes.

### Testing

1. `tsc --noEmit --skipLibCheck` passes
2. All 1331 unit tests pass
3. All 10 frontend tests pass
4. Manual verification: notes persist correctly after save and page reload
5. Grep verification: single `localStorage.setItem` for draft backup in ConsultationContext functions (or unified helper)

### Risk

**Low.** Removes non-essential optimistic updates that no component reads. Consolidates duplicate code paths.

---

## Verification Commands

```bash
# TypeScript
npm run lint

# Tests
npm run test:unit
npm run test:frontend

# Verify no duplicate localStorage writes
grep -n "localStorage.setItem" contexts/ConsultationContext.tsx
```

---

## Remaining Violations (Deferred)

| Violation | Layer | Deferred To |
|-----------|-------|-------------|
| INV-005: Workflow state machine bypass | ConsultationContext reducer | PR-A04 |
| LI-002: Presentation → Infrastructure (hooks) | Hooks | PR-A02+ |
| LI-003: Presentation → Infrastructure (localStorage) | ConsultationContext | PR-A04 |
| LI-004: Domain → Prisma | Repository interfaces | PR-A06 |
| LI-005: Application → Prisma | Application services | PR-A07+ |
| LI-006: Presentation → Infrastructure (ConsultationContext calls) | ConsultationContext | PR-A02+ |
