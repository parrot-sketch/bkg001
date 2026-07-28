# PR-A02 Canonical Domain Model Report

## Summary

**PR-A02 establishes a single canonical ownership model for all consultation note structures, serialization, parsing, formatting, and version conflict detection.**

---

## 1. Before vs After

### Before

```
StructuredNotes interface
    ├── contexts/ConsultationContext.tsx   ❌ Presentation Layer
    ├── application/services/DraftService.ts  ❌ Application Layer
    └── components/consultation/ConsultationWorkspace.tsx  ❌ Dead code

generateFullText function
    ├── contexts/ConsultationContext.tsx   ❌ Presentation Layer
    └── application/services/DraftService.ts  ❌ Application Layer

parseLegacyNotes function
    ├── contexts/ConsultationContext.tsx   ❌ Presentation Layer
    └── application/services/DraftService.ts  ❌ Application Layer

isVersionConflict detection
    ├── application/services/DraftService.ts (function)  ❌ Application Layer
    └── hooks/consultation/useSaveConsultationDraft.ts (3x inline)  ❌ Presentation Layer
```

### After

```
shared-kernel/types/notes.ts
    └── StructuredNotes interface  ✅ Single canonical definition

shared-kernel/utils/note-serialization.ts
    ├── generateFullText()  ✅ Single canonical implementation
    └── parseLegacyNotes()  ✅ Single canonical implementation

shared-kernel/utils/version-conflict.ts
    └── isVersionConflict()  ✅ Single canonical implementation

domain/value-objects/ConsultationNotes.ts
    └── ConsultationNotes VO with toStructured() bridge  ✅ Canonical Domain model
```

---

## 2. Violations Removed

| Violation | File(s) | Action | Status |
|-----------|---------|--------|--------|
| CDM-001: 3× `StructuredNotes` | ConsultationContext, DraftService, ConsultationWorkspace | Consolidated to `shared-kernel/types/notes.ts` | RESOLVED |
| CDM-002: 2× `generateFullText` | ConsultationContext, DraftService | Consolidated to `shared-kernel/utils/note-serialization.ts` | RESOLVED |
| CDM-003: 2× `parseLegacyNotes` | ConsultationContext, DraftService | Consolidated to `shared-kernel/utils/note-serialization.ts` | RESOLVED |
| CDM-004: 2× version conflict detection | DraftService, useSaveConsultationDraft | Consolidated to `shared-kernel/utils/version-conflict.ts` | RESOLVED |
| CDM-005: Dead code `StructuredNotes` | ConsultationWorkspace.tsx | Removed local interface | RESOLVED |
| CDM-006: VO not canonical | ConsultationNotes.ts | Added `toStructured()`, imported canonical type | RESOLVED |

**Total violations removed: 6**
**Technical debt eliminated: 9 duplicate definitions**

---

## 3. Files Changed

| File | Change Type |
|------|-------------|
| `shared-kernel/types/notes.ts` | Created |
| `shared-kernel/utils/note-serialization.ts` | Created |
| `shared-kernel/utils/version-conflict.ts` | Created |
| `shared-kernel/index.ts` | Updated exports |
| `domain/value-objects/ConsultationNotes.ts` | Added `StructuredNotes` import, `toStructured()` method |
| `application/services/DraftService.ts` | Removed local definitions, imported from Shared Kernel |
| `contexts/ConsultationContext.tsx` | Removed local `StructuredNotes`, `generateFullText`, `parseLegacyNotes` |
| `contexts/consultationReducer.ts` | Updated `StructuredNotes` import |
| `components/consultation/ConsultationWorkspace.tsx` | Removed local `StructuredNotes` |
| `components/consultation/ConsultationWorkspaceOptimized.tsx` | Updated `StructuredNotes` import |
| `components/consultation/sidebar/ClinicalBrief.tsx` | Updated `StructuredNotes` import |
| `hooks/consultation/useSaveConsultationDraft.ts` | Imported `isVersionConflict`, replaced inline checks |
| `tests/unit/application/services/DraftService.test.ts` | Updated imports to canonical locations |

---

## 4. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript compilation | `npm run lint` | PASS (1 pre-existing unrelated error in `page.tsx`) |
| Unit tests | `npm run test:unit` | PASS (1331 tests) |
| Frontend tests | `npm run test:frontend` | PASS (10 tests) |
| Zero duplicate `StructuredNotes` | `grep` | PASS |
| Zero duplicate `generateFullText` | `grep` | PASS |
| Zero duplicate `parseLegacyNotes` | `grep` | PASS |
| Zero duplicate `isVersionConflict` | `grep` | PASS |
| Legacy draft compatibility | Preserved exact serialization format | PASS |
| API payload compatibility | Preserved exact `rawText`/`structured` shape | PASS |

---

## 5. Architecture Scorecard Impact

**Canonical Domain Model category:**

- **Before:** 2/10 (3 type definitions, 2 formatters, 2 parsers, 2 conflict detectors)
- **After:** 9/10 (1 type, 1 formatter, 1 parser, 1 conflict detector, canonical VO adopted)

**Overall Architecture Scorecard:**

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Documentation Completeness | 8/10 | 8/10 | — |
| Consistency & Coherence | 3/10 | 5/10 | +2 |
| Layering & Dependency Direction | 6/10 | 6/10 | — |
| State Ownership | 4/10 | 4/10 | — |
| Clinical Workflow Support | 3/10 | 3/10 | — |
| Extraction Readiness | 2/10 | 5/10 | +3 |
| **Canonical Domain Model** | **2/10** | **9/10** | **+7** |
| Testing | 7/10 | 7/10 | — |
| Error Handling | 7/10 | 7/10 | — |

**Weighted average impact:** +0.5 points

---

## 6. Certification Status

**Canonical Domain Model category: CERTIFIED**

All criteria satisfied:
- [x] One canonical `StructuredNotes` definition
- [x] One serialization pipeline (`generateFullText`)
- [x] One parsing pipeline (`parseLegacyNotes`)
- [x] One formatter (canonical `generateFullText` in Shared Kernel)
- [x] One version conflict model (`isVersionConflict`)
- [x] `ConsultationContext` no longer owns domain artifacts (removed local definitions)
- [x] Runtime behavior unchanged
- [x] All tests pass

---

## 7. Recommendation: PR-A03 Readiness

**PR-A03 (State Ownership Remediation) may begin.**

Rationale:
- All consultation note artifacts have canonical owners.
- `ConsultationContext` no longer claims ownership of domain types.
- Serialization/deserialization is centralized in Shared Kernel.
- `DraftService` and `ConsultationContext` both consume the same canonical utilities.
- No behavioral changes; all tests pass.

PR-A03 may proceed with:
- Eliminating triple-write pattern for notes
- Enforcing workflow state machine transitions
- Removing scattered feature flags
