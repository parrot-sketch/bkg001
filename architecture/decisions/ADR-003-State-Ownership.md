# ADR-003: Enforce Strict State Ownership Taxonomy
## Status
Proposed
## Context
The Consultation Module has no state ownership taxonomy. Notes exist simultaneously in three places:
1. Reducer state (working copy)
2. React Query cache (optimistic update)
3. localStorage (crash recovery)
This triple-write pattern creates ambiguity about the source of truth. During version conflicts, all three must be reconciled. During crash recovery, server notes vs localStorage notes may diverge. The current system handles this but the complexity is hidden and fragile.
Other state is similarly unclassified: server state is mixed with client state in the same reducer; form state and UI state are stored alongside clinical data.
## Decision
Enforce a strict state ownership taxonomy with six categories:
| Category | Definition | Ownership | Persistence | Synchronization |
|----------|-----------|-----------|-------------|----------------|
| **Server State** | Data derived from backend APIs | React Query | API + cache | Revalidation, polling |
| **Client State** | State produced by user interaction, not stored on server | useReducer / Provider | Memory | Events, derived values |
| **Form State** | Intermediate form values during input | Component useState | Memory | Controlled components |
| **UI State** | Interface preferences and transient flags | Component useState | Memory | Props, callbacks |
| **Session State** | Long-lived cross-tab state | DraftStorage adapter | Persistent storage | Cross-tab sync |
| **Offline State** | Data available without network | IndexedDB (future) | Persistent storage | Background sync |
Rules:
1. Server state lives only in React Query. No provider maintains its own copy.
2. Client state lives only in provider reducers. No global client state.
3. Form state lives only in component useState. Committed on submit.
4. UI state lives only in component useState. Never persisted.
5. Session state lives only in DraftStorage adapter. Cleared on terminal events.
6. Each data type has exactly one owner. No duplication.
## Alternatives Considered
### Alternative 1: Keep Triple-Write with Better Reconciliation
Maintain current pattern but add more explicit reconciliation logic and conflict resolution UI.
**Why rejected**: Adds complexity without solving root cause. Reconciliation is always fragile because there are three sources of truth.
### Alternative 2: Single-Write with Server Round-Trip After Every Keystroke
Save notes to server on every keystroke (debounced). Server is single source of truth.
**Why rejected**: Too slow for real-time editing. Every keystroke would require network round-trip. Poor UX.
### Alternative 3: IndexedDB as Primary Notes Store
Store notes in IndexedDB first; sync to server in background.
**Why rejected**: Overkill for current needs. localStorage is sufficient for crash recovery. IndexedDB adds complexity without clear benefit.
## Trade-offs
- **Benefit**: Clear ownership eliminates ambiguity. Every developer knows where state lives and how it synchronizes.
- **Benefit**: Single-write notes pattern is simpler to reason about and test. Crash recovery is a backup, not a cache.
- **Cost**: Requires refactoring notes lifecycle from triple-write to single-write-with-backup. Dual-write period adds temporary complexity.
- **Cost**: localStorage becomes a pure backup. Doctors cannot rely on it for anything other than crash recovery.
- **Benefit**: React Query cache policies are explicit and documented. No ad-hoc staleTime values.
- **Cost**: More categories to understand. New developers must learn the taxonomy.
## Consequences
- **Positive**: Notes state is unambiguous. Reducer is the UI source of truth; API is the server source of truth; localStorage is backup only.
- **Positive**: Version conflicts are handled in one place (DocumentationProvider) instead of three.
- **Positive**: Crash recovery is predictable: localStorage draft is restored only if newer than server.
- **Negative**: During migration (Phase 3), both old and new paths must run in parallel. Divergence detection is required.
- **Negative**: localStorage backup is write-only after extraction. Reads happen only during draft restoration on session load.
- **Mitigation**: Dual-write period with automated comparison. Feature flag for instant rollback. Comprehensive draft restoration tests.
## Compliance
- State ownership documented in provider interfaces
- CI lint rules prevent duplicate state ownership
- New state must be classified before implementation
- Quarterly state audit ensures taxonomy is followed
