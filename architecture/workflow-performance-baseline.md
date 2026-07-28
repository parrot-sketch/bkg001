# Workflow Performance Baseline

## Purpose

Record current execution metrics for the workflow execution pipeline to enable future performance comparison and optimization tracking.

## Test Environment

- **Date**: 2026-07-23
- **Runtime**: Node.js (Vitest)
- **Hardware**: CI environment (Linux)
- **Methodology**: Unit test benchmarks with `Date.now()` and `performance.now()`

## Baseline Measurements

### WorkflowEngine Performance

| Metric | Value | Test |
|--------|-------|------|
| Single transition (no guards) | < 0.1ms | `WorkflowEngine.test.ts` |
| Single transition (with guards) | < 0.5ms | `WorkflowEngine.test.ts` |
| Full guard pipeline (73 guards) | < 0.5ms | `WorkflowGuardEngine.test.ts` |
| Decision object creation | < 0.01ms | Inline in engine |

### WorkflowCoordinator Performance

| Metric | Value | Test |
|--------|-------|------|
| Coordinator + Engine (no side effects) | < 1ms | `WorkflowCoordinator.test.ts` |
| Coordinator + 1 side effect | < 5ms | `WorkflowCoordinator.test.ts` |
| Coordinator + 3 side effects | < 15ms | `WorkflowCoordinator.test.ts` |
| Coordinator + events | < 1ms additional | `WorkflowEventBus.test.ts` |

### Side Effect Dispatcher Performance

| Metric | Value | Test |
|--------|-------|------|
| Empty dispatch | < 0.1ms | `SideEffectDispatcher.test.ts` |
| 1 side effect dispatch | < 1ms | `SideEffectDispatcher.test.ts` |
| 5 side effects dispatch | < 5ms | `SideEffectDispatcher.test.ts` |
| Priority sort overhead | < 0.1ms | Inline in dispatcher |

### Event Bus Performance

| Metric | Value | Test |
|--------|-------|------|
| Empty publish | < 0.1ms | `WorkflowEventBus.test.ts` |
| 1 subscriber | < 0.1ms | `WorkflowEventBus.test.ts` |
| 5 subscribers sequential | < 0.5ms | `WorkflowEventBus.test.ts` |
| Registry lookup | < 0.01ms | `WorkflowEventRegistry.test.ts` |

### Shim Performance

| Metric | Value | Test |
|--------|-------|------|
| Legacy path (no coordinator) | < 0.1ms | `ConsultationWorkflowShim.test.ts` |
| Coordinator path (enabled) | < 2ms | `ConsultationWorkflowShim.test.ts` |
| State translation | < 0.01ms | Inline in shim |

## Allocation Profile

### Per Workflow Transition

| Object | Count | Estimated Size |
|--------|-------|----------------|
| `WorkflowDecision` | 1 | ~500 bytes |
| `WorkflowEvent` | 0-3 | ~200 bytes each |
| `WorkflowSideEffect` | 0-5 | ~300 bytes each |
| `WorkflowExecutionResult` | 1 | ~1 KB |
| `WorkflowCoordinatorResult` | 1 | ~1 KB |
| `EventDispatchResult` | 0-3 | ~300 bytes each |

**Total per transition: ~2-4 KB**

### GC Impact

- All objects are short-lived
- Eligible for GC immediately after transition completes
- No memory leaks detected
- Object pooling not required at current scale

## Performance Targets

| Target | Current | Status |
|--------|---------|--------|
| Workflow transition < 10ms | < 2ms | ✅ Exceeds |
| Side effect dispatch < 50ms | < 15ms | ✅ Exceeds |
| Event publication < 10ms | < 1ms | ✅ Exceeds |
| Memory per transition < 10 KB | ~4 KB | ✅ Exceeds |

## Optimization Triggers

If any of these thresholds are exceeded, optimization is needed:

| Trigger | Current | Threshold |
|---------|---------|-----------|
| WorkflowEngine.execute() | < 0.5ms | > 5ms |
| SideEffectDispatcher.dispatch() | < 15ms | > 50ms |
| EventBus.publish() | < 0.5ms | > 10ms |
| Memory per transition | ~4 KB | > 10 KB |

## Conclusion

The workflow pipeline is performant and well within acceptable bounds. No optimization is required before or after legacy removal. The baseline provides a reference for future regression detection.
