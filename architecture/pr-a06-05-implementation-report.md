# PR-A06-05 — DialogProvider Extraction

## Overview

This PR extracts all dialog visibility state from `ConsultationContext.tsx` into a dedicated `DialogProvider`. This is the fifth Provider Extraction following:

- PR-A04 — Workflow Engine
- PR-A05 — SessionService
- PR-A06-01 — DocumentationProvider
- PR-A06-02 — PatientContextProvider
- PR-A06-03 — QueueContextProvider
- PR-A06-04 — TimerContextProvider

**Status:** COMPLETE

---

## Files Added

| File | Purpose |
|------|---------|
| `providers/dialog/DialogProvider.tsx` | Presentation Layer provider owning all dialog visibility state |
| `tests/frontend/providers/dialog/DialogProvider.test.tsx` | 5 frontend tests |

**Total files added:** 2

---

## Files Modified

| File | Change |
|------|--------|
| `contexts/ConsultationContext.tsx` | Removed dialog state/actions from reducer; added DialogProvider wiring; composed dialog actions with workflow transitions |
| `app/doctor/consultations/session/[appointmentId]/page.tsx` | Consumes `useDialogContext()` for dialog visibility flags |

**Total files modified:** 2

---

## Implementation Summary

### DialogProvider

- **Location:** `providers/dialog/DialogProvider.tsx`
- **Layer:** Presentation Layer (React Context)
- **Lines:** ~85

**State Owned:**
- `isCompleteDialogOpen` — Complete consultation dialog visibility
- `isStartDialogOpen` — Start consultation dialog visibility

**Actions (pure presentation toggles):**
- `openCompleteDialog()` — Sets complete dialog open
- `closeCompleteDialog()` — Sets complete dialog closed
- `openStartDialog()` — Sets start dialog open
- `closeStartDialog()` — Sets start dialog closed

**Behavior:**
- Pure presentation state. No workflow transitions. No business logic.
- DialogProvider only manages visibility flags.

### ConsultationContext Changes

- **Removed:** `showCompleteDialog`, `showStartDialog` from `ConsultationProviderState`
- **Removed:** `SHOW_COMPLETE_DIALOG`, `SHOW_START_DIALOG` from `ConsultationAction`
- **Removed:** Two reducer cases for dialog actions
- **Removed:** `closeStartDialog`, `openCompleteDialog`, `closeCompleteDialog` implementations
- **Added:** `useDialogContext()` consumption
- **Added:** Composed actions that combine DialogProvider toggles with workflow transitions
- **Added:** DialogProvider wrapper in provider tree

### Composed Actions Pattern

ConsultationContext preserves behavior by composing DialogProvider state changes with workflow transitions:

```typescript
const openCompleteDialog = useCallback(async () => {
  dialog.openCompleteDialog(); // Presentation state
  await workflowShim.transitionTo(ConsultationWorkflowState.ACTIVE, ConsultationWorkflowState.COMPLETING, dispatch);
}, [dialog, workflowShim]);
```

### Consumer Updates

| Consumer | Change |
|----------|--------|
| `page.tsx` (ConsultationSessionContent) | Uses `useDialogContext()` for `isStartDialogOpen` / `isCompleteDialogOpen` |
| `ConsultationWorkspaceOptimized` | No changes needed (uses `openCompleteDialog` from ConsultationContext) |

---

## Behavioral Parity Verification

### Preserved Behaviors

| Behavior | Implementation |
|----------|----------------|
| Complete dialog opens on Complete button click | `dialog.openCompleteDialog()` + workflow transition |
| Complete dialog closes on cancel | `dialog.closeCompleteDialog()` + workflow transition |
| Start dialog opens/closes | `dialog.openStartDialog()` / `dialog.closeStartDialog()` |
| Dialog visibility in UI | Same boolean flags exposed via context |

### Public API Changes

| Property | Before | After |
|----------|--------|-------|
| `state.showCompleteDialog` | In reducer state | From `useDialogContext()` |
| `state.showStartDialog` | In reducer state | From `useDialogContext()` |
| `openCompleteDialog` | Direct dispatch + workflow | Dialog toggle + workflow (composed) |
| `closeCompleteDialog` | Direct dispatch + workflow | Dialog toggle + workflow (composed) |
| `closeStartDialog` | Direct dispatch | Dialog toggle only (composed) |

---

## Validation

### TypeScript

```
tsc --noEmit --skipLibCheck
```

**Result:** PASS (0 errors)

### Unit Tests

```
npx vitest run --config vitest.config.unit.ts
```

**Result:** 1697 passed (same as before PR)

### Frontend Tests

```
npx vitest run --config vitest.config.frontend.ts
```

**Result:** 55 passed (5 new DialogProvider tests)

| Test | Description | Status |
|------|-------------|--------|
| returns initial closed state | Default state verification | ✅ |
| opens and closes complete dialog | Complete dialog toggle | ✅ |
| opens and closes start dialog | Start dialog toggle | ✅ |
| toggles dialogs independently | Independent state | ✅ |
| throws error when used outside provider | Hook guard | ✅ |

---

## Dependencies

### Consumed Interfaces

| Interface | Purpose |
|-----------|---------|
| None (pure Presentation Layer state) | — |

### Not Duplicated

| Concern | Source |
|---------|--------|
| Workflow transitions on dialog open/close | ConsultationContext (composed) |
| Session lifecycle | SessionService (unchanged) |

---

## Key Decisions

1. **Composed actions pattern:** DialogProvider owns pure visibility state. ConsultationContext composes dialog toggles with workflow transitions. This keeps DialogProvider free of workflow knowledge while preserving existing behavior.
2. **Backward-compatible public API:** ConsultationContext still exposes `showCompleteDialog`, `showStartDialog`, `openCompleteDialog`, `closeCompleteDialog`, `closeStartDialog` so existing consumers need minimal changes.
3. **Consumer migration:** `page.tsx` now reads dialog visibility from `useDialogContext()` directly, demonstrating the intended consumption pattern.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Consumer regression | Very Low | Low | Only page.tsx and ConsultationWorkspaceOptimized use dialogs; both verified |
| Workflow desync | Very Low | Medium | Composed actions ensure workflow transitions still fire |
| State source confusion | Low | Low | Clear ownership: DialogProvider = visibility, ConsultationContext = actions + workflow |

**Maximum Acceptable Risk:** VERY LOW
