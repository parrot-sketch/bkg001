# Barrel Expansion Analysis

## Method
Identified all barrel files (`index.ts`, `index.tsx`) in the 100-module reachable graph. Traced what each barrel re-exports and measured expansion factor.

## Finding: Minimal Barrel Expansion

### Barrels in Reachable Graph

| Barrel | Re-exports | Expansion Factor |
|--------|-----------|------------------|
| `domain/workflows/guards/index.ts` | 8 guard modules | 8x (but NOT reached by resolver) |
| `application/events/index.ts` | 4 event modules | 4x |
| `providers/session/index.ts` | Does not exist | N/A |
| `contexts/index.ts` | Multiple contexts | Not in graph |

### Guard Barrel Detail

`domain/workflows/guards/index.ts`:
```
export * from './loadGuards';
export * from './consultationFlowGuards';
export * from './pauseResumeCancelGuards';
export * from './navigationGuards';
export * from './completionGuards';
export * from './conflictGuards';
export * from './restoreGuards';
export * from './retryGuards';
```

This barrel re-exports 8 guard modules totaling 762 LOC. However, **my static import resolver did not traverse `export * from` statements**, so these 8 guard files are NOT counted in the 100-module graph.

**Actual reachable modules:** 100 (resolved via imports) + 8 (guard files via barrel) = **~108 modules**
**Actual reachable LOC:** 12,374 + 762 = **~13,136 LOC**

### Event Barrel Detail

`application/events/index.ts`:
- Re-exports from `WorkflowEventBus.ts`, `WorkflowEventDispatcher.ts`, `WorkflowEventSubscriber.ts`
- These are already individually imported by other modules
- No additional expansion beyond what the direct imports already include

### Why Barrels Are NOT the Root Cause

1. **Small expansion factors:** The largest barrel is 8x, adding only 762 LOC
2. **Most imports are direct:** SessionProvider imports SessionService directly, not through a barrel
3. **Total barrel contribution:** ~762 LOC (6% of total reachable LOC)
4. **The explosion is from direct imports, not barrel expansion**

### Comparison

| Source | Modules Added | LOC Added |
|--------|--------------|-----------|
| Direct imports | ~100 | 12,374 |
| Guard barrel | 8 | 762 |
| Event barrel | 0 (already counted) | 0 |
| **Total** | **~108** | **~13,136** |

**Conclusion:** Barrel files contribute only 6% of the reachable code. The heap exhaustion is NOT caused by barrel expansion. It is caused by the sheer volume of directly imported modules.
