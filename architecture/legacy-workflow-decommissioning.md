# Legacy Workflow Decommissioning

## Overview

This document records the complete removal of legacy workflow execution paths from the consultation module. The legacy system competed with the certified Workflow Engine for transition authority, creating duplication and maintenance burden.

## Decommissioned Components

### 1. LegacyWorkflowOperations (DELETED)

**File**: `application/shims/LegacyWorkflowOperations.ts`  
**Lines**: 72  
**Status**: Deleted in PR-A04-07

**Responsibilities**:
- `validateTransition()` — validated state machine transitions
- `canTransition()` — checked if action was allowed from state
- `getNextState()` — computed next state from current state + action
- `isTerminalState()` — checked if state was terminal

**Replacement**: All functionality now resides in the certified Workflow Engine (`domain/workflows/ConsultationWorkflowStateMachine.ts`).

### 2. Legacy Fallback Path in Shim (REMOVED)

**File**: `application/shims/ConsultationWorkflowShim.ts`  
**Lines removed**: 52

**Removed logic**:
- `enabled` feature flag
- `LegacyWorkflowOperations` instantiation
- `stateToAction()` private method
- Legacy validation fallback in `transitionTo()`
- Legacy execution fallback in `transitionTo()`

**Replacement**: Shim now unconditionally delegates to `WorkflowCoordinatorAdapter`.

### 3. Unused Imports in ConsultationContext (REMOVED)

**File**: `contexts/ConsultationContext.tsx`  
**Imports removed**:
- `ConsultationWorkflowAction`
- `getNextState`
- `canPerformAction`

**Reason**: These were imported but never used in the context file. They represented dead code from the pre-shim era.

## Removal Timeline

| Phase | Action | PR | Date |
|-------|--------|-----|------|
| 1 | LegacyWorkflowOperations frozen | PR-A04-04 | 2026-07-22 |
| 2 | Shim created with dual path | PR-A04-04 | 2026-07-22 |
| 3 | Certification completed | PR-A04-06a | 2026-07-23 |
| 4 | Legacy path removed | PR-A04-07 | 2026-07-23 |

## Verification

### Before Removal
- Tests passing: 328/328 (workflow)
- Legacy path exercised in tests: Yes
- Fallback behavior verified: Yes

### After Removal
- Tests passing: 338/338 (workflow)
- Legacy path exercised in tests: No (removed)
- Fallback behavior verified: No (removed)
- Shim thin façade verified: Yes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Coordinator not available | Low | High | Context creates shim with null coordinator; returns failure gracefully | Mitigated |
| Production regression | Low | High | Full test suite passes; certification tests validate behavior | Mitigated |
| Rollback required | Very Low | Medium | Git revert available; PR-A04-06 state recoverable | Mitigated |

## Post-Decommissioning State

The workflow subsystem now has exactly one implementation of transition logic:

```
WorkflowEngine (domain)
  ├── WorkflowGuardEngine
  ├── SideEffectDispatcher
  └── WorkflowEventBus
        ▲
        │
WorkflowCoordinator (application)
        ▲
        │
ConsultationWorkflowShim (application)
        ▲
        │
ConsultationContext (presentation)
```

No alternative paths exist. No legacy code remains in the production path.
