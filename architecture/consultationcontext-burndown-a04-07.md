# ConsultationContext Burndown — PR-A04-07

## Executive Summary

This document tracks the reduction of `ConsultationContext` complexity and size throughout the A04 modernization stream, with specific focus on PR-A04-07 legacy decommissioning.

## Line Count History

| PR | File | Lines | Change | Cumulative Reduction |
|----|------|-------|--------|---------------------|
| Baseline | `ConsultationContext.tsx` | 929 | — | — |
| PR-A04-04 | `ConsultationContext.tsx` | 929 | 0 | 0% |
| PR-A04-05 | `ConsultationContext.tsx` | 929 | 0 | 0% |
| PR-A04-06 | `ConsultationContext.tsx` | 929 | 0 | 0% |
| **PR-A04-07** | `ConsultationContext.tsx` | **926** | **-3** | **-0.3%** |

Note: ConsultationContext line count did not decrease significantly because the context was already mostly presentation logic after previous PRs. The real simplification happened in the shim layer.

## Shim Layer Burndown

| Artifact | Before A04 | After PR-A04-07 | Change |
|----------|------------|-----------------|--------|
| `ConsultationWorkflowShim.ts` | 194 lines | 142 lines | -52 lines (-27%) |
| `LegacyWorkflowOperations.ts` | 72 lines | 0 lines | -72 lines (-100%) |
| `application/shims/index.ts` | 10 lines | 8 lines | -2 lines (-20%) |
| **Total shim layer** | **276 lines** | **150 lines** | **-126 lines (-46%)** |

## Complexity Metrics

### Cyclomatic Complexity

| Component | Before | After | Change |
|-----------|--------|-------|--------|
| `ConsultationWorkflowShim.transitionTo` | 8 | 4 | -50% |
| `ConsultationWorkflowShim` (overall) | 12 | 8 | -33% |
| `ConsultationContext` (overall) | 45 | 45 | 0%* |

*ConsultationContext complexity unchanged because it was already a thin orchestrator. Complexity reduction occurred in the shim layer.

### Branch Count

| Component | Before | After | Change |
|-----------|--------|-------|--------|
| `ConsultationWorkflowShim` | 6 branches | 2 branches | -67% |
| `ConsultationContext` workflow methods | 8 branches | 8 branches | 0% |

## Workflow Method Count in ConsultationContext

| Method | Before | After | Status |
|--------|--------|-------|--------|
| `loadAppointment` | Uses shim | Uses shim | ✅ Unchanged |
| `startConsultation` | Uses shim | Uses shim | ✅ Unchanged |
| `openCompleteDialog` | Uses shim | Uses shim | ✅ Unchanged |
| `closeCompleteDialog` | Uses shim | Uses shim | ✅ Unchanged |
| `completeConsultation` | Uses shim | Uses shim | ✅ Unchanged |
| `canTransition` | Not used | Removed | ✅ Deleted |
| `getNextState` | Not used | Removed | ✅ Deleted |
| `validateTransition` | Not used | Removed | ✅ Deleted |

## State Machine Ownership

| Responsibility | Before PR-A04 | After PR-A04-07 |
|----------------|---------------|-----------------|
| Transition validation | Context + Engine + Legacy | Engine only |
| Next state computation | Context + Engine + Legacy | Engine only |
| Guard evaluation | Context + GuardEngine | GuardEngine only |
| Side effect sequencing | Context + Dispatcher | Dispatcher only |
| Event publication | Context + EventBus | EventBus only |
| State machine definition | Context + Domain | Domain only |

## Reducer Ownership

| Action | Before | After | Owner |
|--------|--------|-------|-------|
| `SET_WORKFLOW_STATE` | Context | Context | ✅ Presentation |
| `SET_LOADING` | Context | Context | ✅ Presentation |
| `SET_SAVING` | Context | Context | ✅ Presentation |
| `SET_DATA` | Context | Context | ✅ Presentation |
| `SET_CONSULTATION` | Context | Context | ✅ Presentation |
| `SET_NOTES` | Context | Context | ✅ Presentation |
| `UPDATE_NOTE_FIELD` | Context | Context | ✅ Presentation |
| `SET_OUTCOME` | Context | Context | ✅ Presentation |
| `SET_PATIENT_DECISION` | Context | Context | ✅ Presentation |
| `SET_AUTO_SAVE_STATUS` | Context | Context | ✅ Presentation |
| `SET_DIRTY` | Context | Context | ✅ Presentation |
| `SHOW_COMPLETE_DIALOG` | Context | Context | ✅ Presentation |
| `SHOW_START_DIALOG` | Context | Context | ✅ Presentation |
| `SET_ERROR` | Context | Context | ✅ Presentation |
| `CLEAR_ERROR` | Context | Context | ✅ Presentation |
| `RESET` | Context | Context | ✅ Presentation |

**No reducer actions were removed.** All 16 reducer actions remain valid presentation-level state updates.

## Workflow Ownership Transfer

| Capability | Pre-A04 Owner | Post-A04-07 Owner |
|------------|---------------|-------------------|
| Transition legality | ConsultationContext | WorkflowEngine |
| State sequencing | ConsultationContext | WorkflowCoordinator |
| Guard evaluation | ConsultationContext | WorkflowGuardEngine |
| Side effects | ConsultationContext | SideEffectDispatcher |
| Events | ConsultationContext | WorkflowEventBus |
| Rollback/fallback | ConsultationContext | **REMOVED** |

## Trend Analysis

```
Line Count (ConsultationContext)
929 ┤
    │
    │
    │
926 ┤●
    │
    └────────────────────────────
      Baseline  PR-A04-07

Line Count (Shim Layer)
276 ┤
    │
    │
150 ┤●
    │
    └────────────────────────────
      Baseline  PR-A04-07

Complexity (Shim transitionTo)
8 ┤
  │
4 ┤●
  │
  └────────────────────────────
    Baseline  PR-A04-07
```

## Summary

PR-A04-07 achieved a **46% reduction** in shim layer code and **67% reduction** in shim branching complexity. The ConsultationContext itself remained stable in size because it was already a presentation-only orchestrator after previous PRs. The real simplification was the removal of the legacy fallback path and the `LegacyWorkflowOperations` class, which eliminated the last competing workflow authority.
