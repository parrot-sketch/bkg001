# Certification Readiness Checklist

## Purpose

This checklist defines the exact criteria that must be satisfied before the Consultation Module modernization architecture can be certified. It is derived from the 6 blocking violations identified in the architecture audit and the 19 architectural invariants defined in `architecture-invariants.md`.

**Certification is not granted until every checkbox is verified and documented.**

---

## Pre-Requisite: All Remediation PRs Merged

- [ ] PR-R1: Fix Circular Dependency — merged and deployed
- [ ] PR-R2: Consolidate Domain Types — merged and deployed
- [ ] PR-R3: Enforce State Ownership and State Machine — merged and deployed
- [ ] PR-R4: Correct DraftService Migration Strategy — merged and deployed
- [ ] PR-R5: Standardize Feature Flag Naming — merged and deployed

---

## Section 1: Zero Blockers

### Blocker 1: Circular Dependency (INV-001, INV-013, INV-014)

- [ ] `domain/interfaces/services/ConsultationApi.ts` contains zero imports from `application/` layer
- [ ] `domain/interfaces/services/PatientApi.ts` contains zero imports from `application/` layer
- [ ] `domain/interfaces/services/QueueApi.ts` contains zero imports from `application/` layer
- [ ] `madge` circular dependency check reports zero cycles in import graph
- [ ] `tsc --noEmit` passes with zero circular dependency errors
- [ ] All adapters compile and pass contract tests

### Blocker 2: Type and Logic Duplication (INV-011, INV-012)

- [ ] `grep -r "interface StructuredNotes"` reports exactly 1 definition (or 1 VO + type aliases)
- [ ] `grep -r "ConsultationNotes"` confirms single canonical VO in `domain/value-objects/`
- [ ] `grep -r "generateFullText"` reports exactly 1 implementation
- [ ] `grep -r "parseLegacyNotes"` reports exactly 1 implementation
- [ ] `grep -r "updated by another session"` reports exactly 1 occurrence (in Shared Kernel utility)
- [ ] `grep -r "VERSION_CONFLICT"` reports exactly 1 occurrence (in Shared Kernel utility)
- [ ] `useSaveConsultationDraft.ts` imports serialization from Shared Kernel
- [ ] `DraftService.ts` imports serialization from Shared Kernel
- [ ] Unit tests verify old and new serialization produce identical output

### Blocker 3: ConsultationContext Growth (INV-006, INV-008, INV-009, INV-019)

- [ ] `wc -l contexts/ConsultationContext.tsx` reports ≤810 lines
- [ ] `grep -r "isFeatureEnabled" contexts/ConsultationContext.tsx` reports 0 occurrences
- [ ] `grep -r "USE_DRAFT_SERVICE" contexts/ConsultationContext.tsx` reports 0 occurrences
- [ ] `grep -r "LegacyDraftOperations"` reports 0 occurrences in production code
- [ ] `grep -r "DraftOperationsShim"` reports 0 occurrences in production code
- [ ] `grep -r "isFeatureEnabled" application/` reports 0 occurrences outside shim layer
- [ ] No commented-out legacy code in ConsultationContext
- [ ] No `// TODO: remove` or `/* legacy */` comments in ConsultationContext

### Blocker 4: Triple-Write Pattern (INV-004)

- [ ] `grep -r "SET_NOTES" contexts/ConsultationContext.tsx` reports 0 occurrences (moved to DocumentationProvider or DraftService)
- [ ] `grep -r "UPDATE_NOTE_FIELD" contexts/ConsultationContext.tsx` reports 0 occurrences
- [ ] Notes have exactly one source of truth (DocumentationProvider or DraftService, documented)
- [ ] React Query cache is documented as server-state cache (read-through)
- [ ] localStorage is documented as backup only (written by DraftService, not by ConsultationContext)
- [ ] No simultaneous writes to multiple stores for the same data

### Blocker 5: State Machine Bypass (INV-005)

- [ ] `grep -r "SET_WORKFLOW_STATE" contexts/ConsultationContext.tsx` reports 0 occurrences
- [ ] All workflow transitions in ConsultationContext use `getNextState()` or `canPerformAction()`
- [ ] `ConsultationWorkflowState.ts` is imported and used in ConsultationContext reducer
- [ ] Unit tests cover every valid state transition
- [ ] Unit tests cover every invalid state transition (asserting rejection)
- [ ] No direct state mutations outside `ConsultationWorkflowState` helpers

### Blocker 6: Duplicated Business Logic (INV-012)

- [ ] Version conflict detection exists in exactly 1 file in production code
- [ ] Full-text formatting exists in exactly 1 implementation
- [ ] Both are located in Shared Kernel utilities
- [ ] All consumers import from Shared Kernel
- [ ] Unit tests verify conflict detection covers all known markers

---

## Section 2: Invariant Compliance

### Layering Invariants

- [ ] **INV-001:** Dependency direction flows Presentation → Application → Domain → Shared Kernel only
- [ ] **INV-002:** Shared Kernel contains zero framework imports
- [ ] **INV-003:** Shared Kernel is leaf module (zero upper-layer imports)

### State Ownership Invariants

- [ ] **INV-004:** Every piece of state has exactly one owner
- [ ] **INV-005:** All workflow transitions flow through validated state machine classes

### ConsultationContext Invariants

- [ ] **INV-006:** ConsultationContext ≤1,100 lines
- [ ] **INV-007:** ConsultationContext contains no business logic, API calls, localStorage access, toast calls, or feature flag checks

### Extraction Invariants

- [ ] **INV-008:** Every extraction followed Extract-CutOver-Remove; no permanent dual paths
- [ ] **INV-009:** Feature flags appear only inside shim classes, not in ConsultationContext
- [ ] **INV-010:** Every Application Service has exactly one responsibility

### Type Invariants

- [ ] **INV-011:** Every domain concept has exactly one type definition
- [ ] **INV-012:** Every business rule has exactly one implementation

### Port and Adapter Invariants

- [ ] **INV-013:** Ports do not depend on layers above Shared Kernel
- [ ] **INV-014:** Adapters are not imported directly by Presentation or Application Layer

### Naming Invariants

- [ ] **INV-015:** All feature flags follow single naming convention

### Clinical Safety Invariants

- [ ] **INV-016:** Auto-save triggers within 3s, draft recovery works, session integrity preserved, queue routing correct

### Testing Invariants

- [ ] **INV-017:** Behavioral parity tests exist for every Application Service
- [ ] **INV-018:** All existing tests pass without modification

### Rollback Invariants

- [ ] **INV-019:** No legacy branches, commented-out code, or dormant feature flags remain after cutover

---

## Section 3: Source Code Validation

### ConsultationContext.tsx

- [ ] File lines: `wc -l` ≤ 810 (after PR-R4 cutover)
- [ ] Zero `localStorage` calls
- [ ] Zero `isFeatureEnabled` calls
- [ ] Zero `toast` calls
- [ ] Zero direct API client calls
- [ ] Zero duplicate business logic
- [ ] All state transitions use `ConsultationWorkflowState`

### application/services/DraftService.ts

- [ ] Zero React imports
- [ ] Zero localStorage imports (uses DraftStorage)
- [ ] Depends only on `ConsultationApi`, `DraftStorage`, Shared Kernel
- [ ] Imports `StructuredNotes` / `ConsultationNotes` from Shared Kernel or Domain
- [ ] Imports serialization from Shared Kernel utility
- [ ] Imports version conflict detection from Shared Kernel utility
- [ ] 18 unit tests pass

### shared-kernel/feature-flags.ts

- [ ] All flags follow single naming convention
- [ ] Zero mixed `_SERVICE` / `_PROVIDER` suffixes

### domain/interfaces/services/ConsultationApi.ts

- [ ] Zero imports from `application/` layer
- [ ] Imports only from `shared-kernel/`
- [ ] Returns generic `ConsultationOutcome<T>` or Shared Kernel types

### domain/value-objects/ConsultationNotes.ts

- [ ] Single canonical VO for consultation notes
- [ ] `toFullText()` and `toPlainText()` methods exist
- [ ] Re-exported from Shared Kernel for Application Layer consumption

---

## Section 4: Regression Validation

- [ ] All 1,274 unit tests pass without modification
- [ ] All 10 frontend tests pass without modification
- [ ] TypeScript compiles with zero errors (`tsc --noEmit --skipLibCheck`)
- [ ] Linter passes with zero warnings
- [ ] No new `as unknown as` casts introduced
- [ ] No new circular dependencies in import graph
- [ ] Bundle size does not increase by more than 5KB gzipped

---

## Section 5: Architecture Scorecard Re-Score

After all remediation PRs merge, re-score each category:

| Category | Pre-Remediation | Target | Actual |
|----------|----------------|--------|--------|
| Documentation Completeness | 8/10 | ≥ 7/10 | |
| Consistency & Coherence | 3/10 | ≥ 7/10 | |
| Layering & Dependency Direction | 4/10 | ≥ 7/10 | |
| State Ownership | 4/10 | ≥ 7/10 | |
| Clinical Workflow Support | 3/10 | ≥ 7/10 | |
| Extraction Readiness | 2/10 | ≥ 7/10 | |
| Testing | 7/10 | ≥ 7/10 | |
| Error Handling | 7/10 | ≥ 7/10 | |
| Caching | 6/10 | ≥ 6/10 | |
| Storage Abstraction | 6/10 | ≥ 6/10 | |
| Extensibility | 4/10 | ≥ 7/10 | |
| Maintainability | 3/10 | ≥ 7/10 | |
| **Weighted Average** | **4.6/10** | **≥ 7.5/10** | |

**Certification requires:**
- No category below 6/10
- Weighted average ≥ 7.5/10
- All 19 invariants pass

---

## Section 6: Final Certification Gate

**All of the following must be true before the architecture is declared CERTIFIED:**

- [ ] All 6 blockers resolved (Section 1 complete)
- [ ] All 19 invariants pass (Section 2 complete)
- [ ] All source code validations pass (Section 3 complete)
- [ ] All regression tests pass (Section 4 complete)
- [ ] Architecture scorecard re-score meets thresholds (Section 5 complete)
- [ ] Consistency audit re-run reports zero HIGH or CRITICAL contradictions
- [ ] Architecture review board signs off on each PR

**If any checkbox is unchecked, certification is DENIED and remediation continues.**
