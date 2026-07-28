# Workflow Dependency Audit v2

## Purpose

Audit all dependencies in the workflow execution pipeline to verify strict adherence to Clean Architecture layer boundaries and detect any unauthorized framework, infrastructure, or presentation-layer leaks into the Domain.

## Audit Scope

- All files in `domain/workflows/`
- All files in `application/orchestrators/`
- All files in `application/events/`
- All files in `application/shims/`
- `contexts/ConsultationContext.tsx`

## Methodology

1. Scan each file for import statements
2. Classify imports by layer (Domain, Application, Presentation, Infrastructure)
3. Verify no reverse dependencies exist
4. Flag any violations

## Domain Layer (`domain/workflows/`) Results

| File | Imports | Layer | Status |
|------|---------|-------|--------|
| `ConsultationWorkflowStateMachine.ts` | None | Domain | ✅ Clean |
| `DocumentationWorkflowStateMachine.ts` | None | Domain | ✅ Clean |
| `WorkflowGuardEngine.ts` | `GuardContext`, `GuardRegistry`, `GuardResult` | Domain | ✅ Clean |
| `DefaultGuardRegistry.ts` | Guard functions | Domain | ✅ Clean |
| `GuardContext.ts` | `StructuredNotes` | Shared Kernel | ✅ Allowed |
| `WorkflowEngine.ts` | State machines, guard engine, decision, metadata | Domain | ✅ Clean |
| `WorkflowCommand.ts` | None | Domain | ✅ Clean |
| `WorkflowDecision.ts` | None | Domain | ✅ Clean |
| `WorkflowEvent.ts` | None | Domain | ✅ Clean |
| `WorkflowSideEffect.ts` | None | Domain | ✅ Clean |
| `WorkflowError.ts` | None | Domain | ✅ Clean |

### Domain Layer Verdict: CLEAN

Zero framework imports. Zero Application imports. Zero Presentation imports. Zero Infrastructure imports.

## Application Layer (`application/orchestrators/`) Results

| File | Imports | Layer | Status |
|------|---------|-------|--------|
| `WorkflowCoordinator.ts` | Domain types, SideEffectRegistry, EventDispatcher | A → D, A → A | ✅ Clean |
| `SideEffectRegistry.ts` | Domain interfaces, Application interfaces | A → D, A → D | ✅ Clean |
| `SideEffectDispatcher.ts` | SideEffectRegistry | A → A | ✅ Clean |
| `WorkflowCoordinatorFactory.ts` | Domain, Application, shims | A → D, A → A | ✅ Clean |
| `WorkflowCoordinatorDependencies.ts` | Domain interfaces | A → D | ✅ Clean |
| `WorkflowCoordinatorResult.ts` | Domain types | A → D | ✅ Clean |

### Application Layer Verdict: CLEAN

No Presentation imports. No Infrastructure imports. Only Application → Domain dependencies.

## Application Layer (`application/events/`) Results

| File | Imports | Layer | Status |
|------|---------|-------|--------|
| `WorkflowEventBus.ts` | `WorkflowEvent` | A → D | ✅ Clean |
| `WorkflowEventSubscriber.ts` | `WorkflowEvent` | A → D | ✅ Clean |
| `WorkflowEventRegistry.ts` | `WorkflowEventSubscriber` | A → A | ✅ Clean |
| `WorkflowEventDispatcher.ts` | Event types, EventBus | A → D, A → A | ✅ Clean |

### Event Layer Verdict: CLEAN

No Presentation imports. No Infrastructure imports.

## Application Layer (`application/shims/`) Results

| File | Imports | Layer | Status |
|------|---------|-------|--------|
| `ConsultationWorkflowShim.ts` | Domain state machine, Application coordinator | A → D, A → A | ✅ Clean |
| `LegacyWorkflowOperations.ts` | Domain state machine | A → D | ✅ Clean |
| `WorkflowCoordinatorAdapter.ts` | Application coordinator | A → A | ✅ Clean |

### Shim Layer Verdict: CLEAN

No direct Presentation imports except intentional `ConsultationContext` usage via method injection.

## Presentation Layer (`contexts/ConsultationContext.tsx`) Results

| Import | Target Layer | Status |
|--------|-------------|--------|
| `ConsultationWorkflowShim` | Application | ✅ Allowed |
| `ConsultationWorkflowState` | Domain | ✅ Allowed |
| `ConsultationWorkflowAction` | Domain | ✅ Allowed |
| `getNextState` | Domain | ✅ Allowed |
| `canPerformAction` | Domain | ⚠️ To be removed |
| `createInitialContext` | Domain | ⚠️ To be removed |

### Presentation Layer Verdict: MOSTLY CLEAN

Remaining Domain imports (`canPerformAction`, `createInitialContext`) are candidates for removal in PR-A04-07.

## Dependency Graph

```
┌──────────────────────────────────────┐
│     Presentation Layer               │
│  (ConsultationContext)                │
└──────────────┬───────────────────────┘
               │ depends on
               ▼
┌──────────────────────────────────────┐
│     Application Layer                │
│  ┌────────────────────────────────┐  │
│  │  shims/ConsultationWorkflowShim │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  orchestrators/WorkflowCoordinator││
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  events/WorkflowEventBus        │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │ depends on
               ▼
┌──────────────────────────────────────┐
│     Domain Layer                     │
│  ┌────────────────────────────────┐  │
│  │  workflows/WorkflowEngine       │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  workflows/StateMachines        │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  workflows/GuardEngine          │  │
│  │  workflows/Events               │  │
│  │  workflows/Commands             │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │ depends on
               ▼
┌──────────────────────────────────────┐
│     Shared Kernel                    │
│  (types, enums, interfaces)          │
└──────────────────────────────────────┘
```

## Violation Summary

| Severity | Count | Details |
|----------|-------|---------|
| Critical | 0 | No Domain ← Application/Presentation dependencies |
| High | 0 | No framework imports in Domain |
| Medium | 2 | `canPerformAction`, `createInitialContext` in ConsultationContext (to be removed) |
| Low | 0 | — |

## Recommendations

1. **Immediate**: Remove `canPerformAction` and `createInitialContext` from ConsultationContext in PR-A04-07
2. **Future**: Add automated lint rule to prevent Domain ← Application/Presentation imports
3. **Monitoring**: Include dependency audit in CI pipeline

## Conclusion

The workflow dependency graph is clean and compliant with Clean Architecture. No reverse dependencies exist. The Domain remains pure and framework-agnostic.
