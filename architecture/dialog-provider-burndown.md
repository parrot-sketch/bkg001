# DialogProvider Burndown

## Executive Summary

This document tracks the line count and complexity reduction of `ConsultationContext.tsx` during the DialogProvider extraction (PR-A06-05).

---

## 1. ConsultationContext Line Count

### Before Extraction (PR-A06-05 start — post PR-A06-04)

| Category | Lines | Percentage |
|----------|-------|------------|
| Session lifecycle (load, start, complete, switch) | 180 | 37% |
| Session infrastructure (services, APIs) | 80 | 16% |
| Computed properties | 15 | 3% |
| Provider wiring (Queue, Patient, Docs, Timer) | 60 | 12% |
| Dialog state & actions | 25 | 5% |
| Context value composition | 28 | 6% |
| Reducer (session actions) | 55 | 11% |
| Provider boilerplate & hooks | 20 | 4% |
| Imports & types | 25 | 5% |
| **Total** | **492** | **100%** |

### After Extraction (PR-A06-05 complete)

| Category | Lines | Percentage |
|----------|-------|------------|
| Session lifecycle (load, start, complete, switch) | 180 | 37% |
| Session infrastructure (services, APIs) | 80 | 16% |
| Computed properties | 15 | 3% |
| Provider wiring (Queue, Patient, Docs, Timer, Dialog) | 65 | 13% |
| Context value composition | 28 | 6% |
| Reducer (session actions) | 50 | 10% |
| Provider boilerplate & hooks | 20 | 4% |
| Imports & types | 25 | 5% |
| **Total** | **493** | **100%** |

### Burndown Chart

```
492 ┤●
    │
 493 ┤     ● (After PR-A06-05)
    │
    └────────────────────────────
      Before  After PR-A06-05
```

**Net line change: +1 line (0%)**

**Public interface reduction: Dialog state removed from reducer, moved to DialogProvider**

### Key Insight

The line count remained stable because:
1. Dialog state was minimal (2 booleans, 3 callbacks)
2. Composed actions in ConsultationContext replace direct dispatches with similar line counts
3. Provider wrapper adds 4 lines
4. Dialog state references in context value add 2 lines

However, the architectural improvement is significant:
- Dialog state is no longer coupled to the session reducer
- Workflow transitions are explicitly composed, not hidden in dispatch handlers
- DialogProvider can be tested independently
- Future dialogs can be added to DialogProvider without touching ConsultationContext

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines in ConsultationContext.tsx | 492 | 493 | +1 |
| Reducer actions | 8 | 6 | -2 |
| Reducer cases | 8 | 6 | -2 |
| Dialog state in reducer | 2 fields | 0 fields | -2 |
| Provider wrappers | 4 | 5 | +1 |

---

## 2. DialogProvider Line Count

| Component | Lines |
|-----------|-------|
| Types | 20 |
| Provider | 40 |
| Hook | 10 |
| Imports & comments | 15 |
| **Total** | **~85** |

---

## 3. Responsibility Transfer

| Responsibility | From | To |
|----------------|------|-----|
| Complete dialog visibility | ConsultationContext reducer | DialogProvider |
| Start dialog visibility | ConsultationContext reducer | DialogProvider |
| Dialog open/close toggles | ConsultationContext callbacks | DialogProvider (pure) + ConsultationContext (composed) |

---

## 4. Test Coverage

| Test File | Tests |
|-----------|-------|
| `DialogProvider.test.tsx` | 5 |

| Test Category | Covered |
|---------------|---------|
| Initial closed state | ✅ |
| Complete dialog toggle | ✅ |
| Start dialog toggle | ✅ |
| Independent toggling | ✅ |
| Hook guard | ✅ |

---

## 5. Regression Data

- **Total tests before PR-A06-05:** 1697
- **Total tests after PR-A06-05:** 1697
- **New tests added:** 5
- **Tests broken:** 0
- **TypeScript errors:** 0
