# ADR-004: Make Workflow State Machines Explicit Domain Objects
## Status
Proposed
## Context
The module currently has two state machines:
1. **Domain Entity State** (ConsultationState): NOT_STARTED → IN_PROGRESS → COMPLETED
2. **UI Workflow State** (ConsultationWorkflowState): IDLE → LOADING → READY → ACTIVE → COMPLETING → TRANSITIONING → ERROR
The domain state machine is already formalized as an enum with helper functions. The UI workflow state machine is formalized as an enum with a VALID_TRANSITIONS map, but the transition logic is imperative in the ConsultationContext reducer.
This makes state transitions:
- Hidden in reducer switch cases
- Difficult to visualize
- Impossible to test exhaustively without running the entire reducer
- Not introspectable at runtime
## Decision
Extract explicit state machine classes for UI workflow states:
```typescript
class SessionWorkflow {
  static states = [IDLE, LOADING, READY, ACTIVE, COMPLETING, TRANSITIONING, ERROR] as const;
  static transitions = {
    LOAD: { from: IDLE, to: LOADING },
    LOAD_SUCCESS: { from: LOADING, to: [READY, ACTIVE] },
    LOAD_FAILURE: { from: LOADING, to: ERROR },
    START: { from: READY, to: ACTIVE },
    RESUME: { from: READY, to: ACTIVE },
    COMPLETE: { from: ACTIVE, to: COMPLETING },
    COMPLETE_SUCCESS: { from: COMPLETING, to: TRANSITIONING },
    COMPLETE_FAILURE: { from: COMPLETING, to: ACTIVE },
    RETRY: { from: ERROR, to: LOADING },
    RESET: { from: '*', to: IDLE }
  };
  
  transition(current: State, action: Action): State { ... }
  canPerformAction(state: State, action: Action): boolean { ... }
  createInitial(): State { ... }
}
```
Similarly, create DocumentationWorkflow for documentation save lifecycle:
```typescript
class DocumentationWorkflow {
  static states = [IDLE, EDITING, SAVING, SAVED, ERROR, CONFLICT] as const;
  // transitions for updateNote, saveStart, saveSuccess, saveError, conflictDetected, resolveConflict
}
```
## Alternatives Considered
### Alternative 1: Keep Implicit Transitions in Reducer
Maintain current VALID_TRANSITIONS map in ConsultationContext reducer.
**Why rejected**: Transitions are still hidden in imperative code. Cannot visualize state machine without reading all reducer cases. Exhaustive testing requires running full reducer with all action combinations.
### Alternative 2: Use State Chart Library (XState)
Adopt XState for state machine implementation.
**Why rejected**: Adds external dependency. Current state machines are simple enough to implement with plain TypeScript classes. XState is overkill for 7 states and 10 transitions.
### Alternative 3: Keep Enum + VALID_TRANSITIONS but Extract to Separate File
Move VALID_TRANSITIONS from ConsultationContext to a domain module without changing structure.
**Why rejected**: Does not achieve the goal of explicit, testable, introspectable state machines. The structure is still imperative.
## Trade-offs
- **Benefit**: Every transition is a testable case. Exhaustive transition tests ensure no invalid state is reachable.
- **Benefit**: State machine is introspectable at runtime. Can display current state and valid actions in React DevTools.
- **Benefit**: State machine is visualizable. Documentation can include state diagrams generated from transition table.
- **Cost**: More code than a simple enum + reducer. Each state machine class is ~50-80 lines.
- **Benefit**: State machine logic is decoupled from React. Can run in Node.js tests without DOM.
- **Cost**: Requires discipline to use state machine methods instead of setting state directly.
## Consequences
- **Positive**: SessionWorkflow and DocumentationWorkflow are pure TypeScript. No React dependency. Tested with simple Jest tests.
- **Positive**: All workflow transitions are covered by tests. No invalid state reachable in production.
- **Positive**: Debugging is easier. When a workflow gets stuck, the current state and valid transitions are visible in logs.
- **Negative**: ConsultationWorkflowState enum remains during transition period. Consumers use enum values; state machine classes translate between enum and class.
- **Negative**: Developers must learn to use state machine classes instead of setting workflow state directly in reducers.
- **Mitigation**: Clear documentation and examples. Lint rule prevents direct workflow state mutation outside state machine classes.
## Compliance
- All workflow transitions must use state machine classes
- Direct workflow state mutation is forbidden outside state machine classes
- Exhaustive transition tests required for each state machine
- State machine coverage report must show 100% coverage before production deployment
