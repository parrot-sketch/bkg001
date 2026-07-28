# Workflow Authority Certification — PR-A04-07

## Certification Statement

This document certifies that, as of PR-A04-07, the **Workflow Engine is the sole authority** for all workflow transition decisions in the consultation module. No competing implementation remains in the production path.

## Authority Chain

```
Presentation Layer (ConsultationContext)
    │
    ▼
Application Shim (ConsultationWorkflowShim)
    │  - Translates (fromState, toState) → WorkflowCommand
    │  - Contains NO business logic
    │  - Contains NO fallback path
    ▼
Application Orchestrator (WorkflowCoordinator)
    │  - Coordinates side effects
    │  - Publishes events
    │  - Returns WorkflowCoordinatorResult
    ▼
Domain Engine (WorkflowEngine)
    │  - Validates transitions via WorkflowGuardEngine
    │  - Executes side effects via SideEffectDispatcher
    │  - Publishes events via WorkflowEventBus
    ▼
State Update (dispatch SET_WORKFLOW_STATE)
```

## Authority Verification

| Question | Answer | Evidence |
|----------|--------|----------|
| Is there exactly one implementation of transition validation? | **Yes** | `WorkflowGuardEngine` + `ConsultationWorkflowStateMachine` |
| Does ConsultationContext determine transition legality? | **No** | Removed in PR-A04-07 |
| Does the shim contain fallback logic? | **No** | LegacyWorkflowOperations deleted |
| Can transitions happen without WorkflowEngine? | **No** | Coordinator requires engine |
| Are there duplicate state machines? | **No** | Only `ConsultationWorkflowStateMachine` exists |
| Are there duplicate guard evaluations? | **No** | Guards only in `WorkflowGuardEngine` |

## Competing Implementations Audit

### Pre-PR-A04-07

| Implementation | Location | Status |
|----------------|----------|--------|
| WorkflowEngine | `domain/workflows/WorkflowEngine.ts` | ✅ Authoritative |
| WorkflowGuardEngine | `domain/workflows/WorkflowGuardEngine.ts` | ✅ Authoritative |
| ConsultationWorkflowStateMachine | `domain/workflows/ConsultationWorkflowStateMachine.ts` | ✅ Authoritative |
| LegacyWorkflowOperations | `application/shims/LegacyWorkflowOperations.ts` | ❌ **Competing** |
| ConsultationContext inline logic | `contexts/ConsultationContext.tsx` | ❌ **Competing** |

### Post-PR-A04-07

| Implementation | Location | Status |
|----------------|----------|--------|
| WorkflowEngine | `domain/workflows/WorkflowEngine.ts` | ✅ **Sole Authority** |
| WorkflowGuardEngine | `domain/workflows/WorkflowGuardEngine.ts` | ✅ Supporting |
| ConsultationWorkflowStateMachine | `domain/workflows/ConsultationWorkflowStateMachine.ts` | ✅ Supporting |
| LegacyWorkflowOperations | `application/shims/LegacyWorkflowOperations.ts` | 🗑️ Deleted |
| ConsultationContext inline logic | `contexts/ConsultationContext.tsx` | ✅ Presentation only |

## Shim Certification

The `ConsultationWorkflowShim` is certified as a **thin translation façade**:

| Property | Requirement | Actual | Status |
|----------|-------------|--------|--------|
| Contains business rules | No | No | ✅ |
| Contains fallback logic | No | No | ✅ |
| Contains validation logic | No | No | ✅ |
| Delegates all transitions | Yes | Yes | ✅ |
| Single responsibility | Yes | Yes | ✅ |

## Transition Correctness

All workflow transitions flow through the certified path:

| Transition | Path | Verified |
|------------|------|----------|
| IDLE → LOADING | Shim → Coordinator → Engine → Guard → Effect → Event | ✅ |
| LOADING → READY | Shim → Coordinator → Engine → Guard → Effect → Event | ✅ |
| READY → ACTIVE | Shim → Coordinator → Engine → Guard → Effect → Event | ✅ |
| ACTIVE → COMPLETING | Shim → Coordinator → Engine → Guard → Effect → Event | ✅ |
| COMPLETING → TRANSITIONING | Shim → Coordinator → Engine → Guard → Effect → Event | ✅ |
| Any → ERROR | Shim → Coordinator → Engine → Guard → Effect → Event | ✅ |
| ERROR → LOADING | Shim → Coordinator → Engine → Guard → Effect → Event | ✅ |

## Guard Authority

| Guard Type | Owner | Test Coverage |
|------------|-------|---------------|
| State transition guards | `WorkflowGuardEngine` | 239 tests |
| Side effect guards | `SideEffectDispatcher` | 10 tests |
| Event guards | `WorkflowEventBus` | 8 tests |

No guard logic exists outside the certified engine.

## Side Effect Authority

| Side Effect Type | Owner | Verified |
|------------------|-------|----------|
| Draft save | `SideEffectDispatcher` | ✅ |
| Cache invalidation | `SideEffectDispatcher` | ✅ |
| Query invalidation | `SideEffectDispatcher` | ✅ |
| Toast notifications | `SideEffectDispatcher` | ✅ |

No side effect logic exists outside the certified dispatcher.

## Event Authority

| Event Type | Owner | Verified |
|------------|-------|----------|
| Workflow state change | `WorkflowEventBus` | ✅ |
| Side effect completion | `WorkflowEventBus` | ✅ |
| Guard failure | `WorkflowEventBus` | ✅ |

No event publication exists outside the certified bus.

## Certification Criteria

| Criterion | Required | Actual | Status |
|-----------|----------|--------|--------|
| Single transition authority | 1 | 1 | ✅ |
| Zero fallback paths | 0 | 0 | ✅ |
| Zero duplicate validation | 0 | 0 | ✅ |
| Zero duplicate sequencing | 0 | 0 | ✅ |
| Shim business-logic-free | Yes | Yes | ✅ |
| All tests passing | 100% | 100% | ✅ |

## Certification Result

**CERTIFIED: Workflow Engine is the sole authority for workflow transitions.**

This certification is valid for PR-A04-07 and all subsequent PRs until new workflow authorities are introduced through the certified Replace Pattern.

## Next Certification Gate

The next authority change will occur in PR-A04-08 (SessionService Extraction). At that time:
1. SessionService will be extracted using the certified Replace Pattern
2. This certification will be re-verified
3. A new certification document will be produced
