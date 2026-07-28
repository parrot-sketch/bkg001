# PR-A07-02 — Compatibility Façade Reconstruction

## Overview

This PR reconstructs the complete legacy ConsultationContext API contract in the compatibility façade. It fixes the runtime TypeError (`Cannot read properties of undefined (reading 'error')`) and ensures every legacy property, nested object, computed value, and action callback is faithfully reproduced.

**Status:** COMPLETE

---

## Problem Statement

After PR-A06-07 and PR-A07-01, the compatibility façade passed the raw SessionProvider context as `state` without reconstructing the legacy nested shape. Consumers expected:

```typescript
state.workflow.error    // nested object
state.workflow.state    // nested object
state.consultation      // direct property
state.doctorId          // direct property
```

But SessionProvider exposes:
```typescript
error                   // top-level
workflowState           // top-level
consultation            // top-level
doctorId                // top-level
```

This mismatch caused `state.workflow` to be `undefined`, throwing a TypeError when the consultation page accessed `state.workflow.error`.

---

## Solution

Updated `ConsultationContext.tsx` CompatibilityAdapter to:

1. **Rebuild nested workflow context** — Map `workflowState` → `state.workflow.state`, `error` → `state.workflow.error`, etc.
2. **Reconstruct full state object** — Include all 19 legacy state properties
3. **Expose all computed properties** — `canSave`, `canComplete`, `waitingQueue`, etc.
4. **Expose all action callbacks** — `saveDraft`, `saveNotes`, `updateNotes`, `setOutcome`, `setPatientDecision`
5. **Consume all extracted providers** — SessionProvider, DialogProvider, DocumentationProvider, QueueProvider

---

## Files Changed

| File | Change |
|------|--------|
| `contexts/ConsultationContext.tsx` | Complete compatibility adapter reconstruction (176 lines) |
| `tests/frontend/providers/session/ConsultationContextContract.test.tsx` | New contract tests |

---

## Compatibility Matrix Summary

| Category | Total | Full Match | Mapped | Missing |
|----------|-------|------------|--------|---------|
| State properties | 19 | 9 | 10 | 0 |
| Nested workflow | 7 | 0 | 7 | 0 |
| Computed properties | 8 | 4 | 4 | 0 |
| Actions | 13 | 9 | 4 | 0 |
| **Total** | **47** | **22** | **25** | **0** |

---

## Verification

### TypeScript
- Compiles cleanly

### Tests
- New contract tests cover all 47 API surface points
- Existing tests continue to pass

### Browser Integration
- `state.workflow.error` no longer throws
- `state.workflow.state` accessible
- All destructured properties defined
- All action callbacks callable

---

## Certification

PR-A07-02 certifies that:
1. Every legacy ConsultationContext property is reconstructed
2. Every legacy callback is preserved with correct signatures
3. Every nested object matches the previous API
4. No Presentation component requires modification
5. Browser loads the consultation page without compatibility errors
