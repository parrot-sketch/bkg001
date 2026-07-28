# Canonical Domain Model Audit

## Purpose

This document audits every definition of consultation note structures, serialization logic, parsing logic, formatting, version conflict detection, and draft payloads in the Consultation Module implementation.

**Scope:** Domain, Application, Infrastructure, Shared Kernel, Presentation layers.

---

## 1. Audit Methodology

Every file was searched for:

| Artifact | Search Pattern |
|----------|----------------|
| `StructuredNotes` type | `interface StructuredNotes`, `type StructuredNotes` |
| `ConsultationNotes` class | `class ConsultationNotes`, `interface ConsultationNotes` |
| `generateFullText` | `function generateFullText`, `export function generateFullText` |
| `parseLegacyNotes` | `function parseLegacyNotes`, `export function parseLegacyNotes` |
| `formatStructuredNotes` | `function formatStructuredNotes` |
| `isVersionConflict` | `function isVersionConflict`, `VERSION_CONFLICT_MARKERS` |
| Version conflict strings | `'updated by another session'`, `'VERSION_CONFLICT'` |
| Draft payloads | `SaveConsultationDraftDto` |
| Save payloads | `rawText`, `structured` in draft context |

---

## 2. Violation Inventory

### VIOLATION CDM-001: Three `StructuredNotes` Definitions

**Files:**
1. `contexts/ConsultationContext.tsx:81` — Presentation Layer
2. `application/services/DraftService.ts:26` — Application Layer
3. `components/consultation/ConsultationWorkspace.tsx:30` — Presentation Layer (dead code)

**Details:**
All three define the same shape:
```typescript
export interface StructuredNotes {
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}
```

**Why it violates the architecture:**
- INV-011: "Every domain concept must have exactly one type definition."
- ConsultationNotes VO exists in Domain but was not adopted as the canonical type.
- Each module redefines the shape, creating maintenance burden.

**Impact:**
- Medium. Field renames must be applied in 2+ places.
- Type inference inconsistencies between layers.

---

### VIOLATION CDM-002: Two `generateFullText` Implementations

**Files:**
1. `contexts/ConsultationContext.tsx:919` — Presentation Layer
2. `application/services/DraftService.ts:67` — Application Layer

**Details:**
Both produce identical output:
```
PATIENT CONCERNS:
{chiefComplaint}

====================

TREATMENT PLAN & CLINICAL NOTES:
{examination}

{plan}
```

**Why it violates the architecture:**
- INV-012: "Every business rule must have exactly one implementation."
- Serialization logic is duplicated across layers.

**Impact:**
- Medium. Changes to formatting must be synchronized.

---

### VIOLATION CDM-003: Two `parseLegacyNotes` Implementations

**Files:**
1. `contexts/ConsultationContext.tsx:942` — Presentation Layer
2. `application/services/DraftService.ts:85` — Application Layer

**Details:**
Both use identical regex patterns to parse:
```
Chief Complaint: ...
Examination: ...
Assessment: ...
Plan: ...
```

**Why it violates the architecture:**
- INV-012: "Every business rule must have exactly one implementation."

**Impact:**
- Medium. Regex changes must be synchronized.

---

### VIOLATION CDM-004: Two Version Conflict Detection Implementations

**Files:**
1. `application/services/DraftService.ts:37-46` — Application Layer
2. `hooks/consultation/useSaveConsultationDraft.ts:32-35, 82-84, 99-100` — Presentation Layer

**Details:**
Both check for the same markers:
- `'updated by another session'`
- `'VERSION_CONFLICT'`

DraftService uses a clean `isVersionConflict()` function.
useSaveConsultationDraft uses inline string matching with 3 separate locations.

**Why it violates the architecture:**
- INV-012: "Every business rule must have exactly one implementation."

**Impact:**
- Medium. If conflict markers change, both locations must be updated.

---

### VIOLATION CDM-005: `ConsultationWorkspace.tsx` Dead Code with Local Types

**File:**
- `components/consultation/ConsultationWorkspace.tsx:30`

**Details:**
Defines local `StructuredNotes` interface and inline `formatStructuredNotes` helper. This file is NOT imported by any production code (only referenced in documentation).

**Why it violates the architecture:**
- INV-011: Duplicate type definition.
- Dead code increases maintenance burden.

**Impact:**
- Low. File is not in production import chain. But violates DRY.

---

### VIOLATION CDM-006: `ConsultationNotes` VO Exists but Is Not Canonical

**File:**
- `domain/value-objects/ConsultationNotes.ts`

**Details:**
A fully-featured Domain VO exists with:
- `createStructured()`, `createRaw()`, `createEmpty()`
- `toFullText()`, `toPlainText()`
- `isStructured()`, `equals()`
- `stripHtml()` private method

But consumers use plain `StructuredNotes` interfaces instead of this VO.

**Why it violates the architecture:**
- INV-011: The canonical type exists but is not adopted.
- ADR-001 blueprint specifies `SOAPNote` VO as the canonical model.

**Impact:**
- Medium. Rich domain model exists but is bypassed by flat interfaces.

---

## 3. Canonical Ownership Model

### 3.1 Canonical Type

**Owner:** `shared-kernel/types/notes.ts`

```typescript
export interface StructuredNotes {
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}
```

**Rationale:** `StructuredNotes` is a pure shape used across all layers for serialization, DTOs, and state. Placing it in Shared Kernel allows all layers to import it without circular dependencies. Domain VO `ConsultationNotes` wraps this shape with rich behavior.

### 3.2 Canonical Serialization

**Owner:** `shared-kernel/utils/note-serialization.ts`

```typescript
export function generateFullText(notes: StructuredNotes): string
export function parseLegacyNotes(fullText: string): StructuredNotes
```

**Rationale:** Pure functions with no side effects. Operate on the canonical `StructuredNotes` shape. Preserve exact backward compatibility with existing localStorage and API payloads.

### 3.3 Canonical Version Conflict Detection

**Owner:** `shared-kernel/utils/version-conflict.ts`

```typescript
export function isVersionConflict(errorMessage: string | undefined): boolean
```

**Rationale:** Pure function. Used by both Application Service and Presentation Layer hooks. Single source of truth for conflict markers.

### 3.4 Canonical Domain VO

**Owner:** `domain/value-objects/ConsultationNotes.ts`

```typescript
export class ConsultationNotes {
  static createStructured(params)
  static createRaw(text)
  static createEmpty()
  toFullText()
  toPlainText()
  toStructured() → StructuredNotes
  isStructured()
  equals()
}
```

**Rationale:** Rich domain behavior belongs in Domain Layer. `toStructured()` bridges the VO to the canonical `StructuredNotes` shape.

---

## 4. Consumer Migration Map

| Consumer | Old Import | New Import |
|----------|-----------|------------|
| `application/services/DraftService.ts` | Local `StructuredNotes`, `generateFullText`, `parseLegacyNotes`, `isVersionConflict` | `shared-kernel/types/notes`, `shared-kernel/utils/note-serialization`, `shared-kernel/utils/version-conflict` |
| `contexts/ConsultationContext.tsx` | Local `StructuredNotes`, `generateFullText`, `parseLegacyNotes` | `shared-kernel/types/notes`, `shared-kernel/utils/note-serialization` |
| `contexts/consultationReducer.ts` | `./ConsultationContext` | `shared-kernel/types/notes` |
| `components/consultation/ConsultationWorkspaceOptimized.tsx` | `@/contexts/ConsultationContext` | `shared-kernel/types/notes` |
| `components/consultation/sidebar/ClinicalBrief.tsx` | `@/contexts/ConsultationContext` | `shared-kernel/types/notes` |
| `hooks/consultation/useSaveConsultationDraft.ts` | Inline version conflict strings | `shared-kernel/utils/version-conflict` |
| `tests/unit/application/services/DraftService.test.ts` | `@/application/services/DraftService` | `shared-kernel/types/notes`, `shared-kernel/utils/note-serialization`, `shared-kernel/utils/version-conflict` |

---

## 5. Technical Debt Eliminated

| Artifact | Before | After |
|----------|--------|-------|
| `StructuredNotes` definitions | 3 | 1 |
| `generateFullText` implementations | 2 | 1 |
| `parseLegacyNotes` implementations | 2 | 1 |
| Version conflict detection | 2 (1 function + 3 inline) | 1 |
| Local type definitions in ConsultationContext | 1 | 0 |
| Local helper functions in ConsultationContext | 2 | 0 |
| Dead code `StructuredNotes` in ConsultationWorkspace.tsx | 1 | 0 |

**Total definitions removed: 9**
**Files affected: 6**
**Architectural debt eliminated: All type/function duplication for consultation notes**
