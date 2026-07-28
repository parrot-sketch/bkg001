# Domain Model Remediation

## Scope

This document defines the remediation steps for establishing a single canonical consultation note model.

---

## Remediation Summary

### Artifacts Created

| File | Purpose |
|------|---------|
| `shared-kernel/types/notes.ts` | Canonical `StructuredNotes` type + `ConsultationNotesPayload` |
| `shared-kernel/utils/note-serialization.ts` | `generateFullText`, `parseLegacyNotes` |
| `shared-kernel/utils/version-conflict.ts` | `isVersionConflict` |

### Artifacts Modified

| File | Change |
|------|--------|
| `shared-kernel/index.ts` | Export new utilities |
| `domain/value-objects/ConsultationNotes.ts` | Import `StructuredNotes`, add `toStructured()` |
| `application/services/DraftService.ts` | Remove local definitions, import from Shared Kernel |
| `contexts/ConsultationContext.tsx` | Remove local `StructuredNotes`, `generateFullText`, `parseLegacyNotes`; import from canonical locations |
| `contexts/consultationReducer.ts` | Update `StructuredNotes` import |
| `components/consultation/ConsultationWorkspace.tsx` | Remove local `StructuredNotes` interface |
| `components/consultation/ConsultationWorkspaceOptimized.tsx` | Update `StructuredNotes` import |
| `components/consultation/sidebar/ClinicalBrief.tsx` | Update `StructuredNotes` import |
| `hooks/consultation/useSaveConsultationDraft.ts` | Import `isVersionConflict`, replace inline checks |
| `tests/unit/application/services/DraftService.test.ts` | Update imports to canonical locations |

---

## Migration Approach

### Step 1: Define Canonical Types in Shared Kernel

Created `shared-kernel/types/notes.ts` with the canonical `StructuredNotes` interface. This is the single source of truth for the consultation notes shape.

### Step 2: Move Serialization Utilities to Shared Kernel

Created `shared-kernel/utils/note-serialization.ts` with `generateFullText` and `parseLegacyNotes`. These are pure functions with zero side effects, making them ideal for Shared Kernel.

Created `shared-kernel/utils/version-conflict.ts` with `isVersionConflict`. Pure utility, no layer dependencies.

### Step 3: Update Domain VO

Updated `domain/value-objects/ConsultationNotes.ts` to:
- Import `StructuredNotes` from Shared Kernel (allowed: Domain → Shared Kernel)
- Add `toStructured()` bridge method

### Step 4: Update Application Service

Updated `application/services/DraftService.ts` to:
- Remove local `StructuredNotes` interface
- Remove local `generateFullText`, `parseLegacyNotes`, `isVersionConflict`
- Import all from Shared Kernel
- Preserve exact behavior (functions are identical copies)

### Step 5: Update Presentation Layer

Updated `contexts/ConsultationContext.tsx` to:
- Remove local `StructuredNotes` interface
- Remove local `generateFullText` and `parseLegacyNotes` functions
- Import from canonical Shared Kernel locations

Updated `contexts/consultationReducer.ts`, `ConsultationWorkspaceOptimized.tsx`, `ClinicalBrief.tsx` to import `StructuredNotes` from Shared Kernel.

### Step 6: Update Hooks

Updated `hooks/consultation/useSaveConsultationDraft.ts` to:
- Import `isVersionConflict` from Shared Kernel
- Replace 3 inline version conflict string checks with single function calls

### Step 7: Update Tests

Updated `tests/unit/application/services/DraftService.test.ts` to import utilities from canonical Shared Kernel locations.

---

## Rollback

`git revert <PR-commit>` restores all local definitions and old import paths. No data migration required.

---

## Risk

**Low.** All changes are additive relocations. Function signatures and return types are preserved exactly. No behavioral changes.

---

## Testing

1. **TypeScript compilation:** `tsc --noEmit --skipLibCheck` passes
2. **Unit tests:** All 1331 tests pass
3. **Frontend tests:** All 10 tests pass
4. **Grep verification:** Zero duplicate `StructuredNotes`, `generateFullText`, `parseLegacyNotes`, `isVersionConflict` definitions

---

## Verification Commands

```bash
# TypeScript
npx tsc --noEmit --skipLibCheck

# Tests
npm run test:unit
npm run test:frontend

# Grep verification
grep -rn "interface StructuredNotes" --include="*.ts" --include="*.tsx" | grep -v "architecture/" | grep -v "docs/" | grep -v "shared-kernel/"
grep -rn "function generateFullText" --include="*.ts" --include="*.tsx" | grep -v "architecture/" | grep -v "docs/"
grep -rn "function parseLegacyNotes" --include="*.ts" --include="*.tsx" | grep -v "architecture/" | grep -v "docs/"
```
