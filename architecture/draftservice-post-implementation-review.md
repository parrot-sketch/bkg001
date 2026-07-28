# DraftService Post-Implementation Review

## Executive Summary

The DraftService extraction was **architecturally correct but operationally premature**. The service itself is clean, well-tested, and properly layered. However, the implementation strategy — feature-flag duality with both old and new paths coexisting — has introduced temporary complexity that will not resolve until the old path is removed. The extraction did not reduce the operational complexity of ConsultationContext; it merely relocated draft logic while preserving the original as a fallback.

**Verdict: Approved with Improvements**

---

## 1. Complexity Assessment

### Question: Did the extraction reduce architectural complexity?

**Answer: No. It relocated complexity.**

| Metric | Before PR-002B | After PR-002B |
|--------|---------------|---------------|
| ConsultationContext lines | 1004 | 1019 |
| Draft logic locations | 1 (inline) | 2 (inline + DraftService) |
| Feature flag checks in context | 0 | 4 |
| `localStorage` calls in context | 4 | 4 (2 new + 2 old) |
| Cyclomatic complexity of `saveDraft` | ~8 | ~14 (flag + two code paths) |
| Cyclomatic complexity of `saveNotes` | ~12 | ~18 (flag + three code paths) |
| Cyclomatic complexity of `loadAppointment` | ~15 | ~18 (flag + draft block) |
| Cyclomatic complexity of `completeConsultation` | ~10 | ~12 (flag + discard draft) |

The extraction added:
- **15 net lines** to ConsultationContext
- **4 feature flag checks** scattered across 4 methods
- **2 complete duplicate code paths** for every draft operation
- **New imports** (`isFeatureEnabled`, `DraftService`, `generateFullText`, `parseLegacyNotes`, `ConsultationApi`, `LocalStorageDraftStorage`)
- **A new `StructuredNotes` interface** duplicated between DraftService and ConsultationContext
- **A `draftService` instance** created via `useMemo` with a unsafe cast (`consultationApi as unknown as ConsultationApi`)

The draft logic is now testable in isolation, which is a genuine architectural win. But the ConsultationContext God Object is **larger and more complex** than before.

---

## 2. ConsultationContext Evolution

### Question: Is ConsultationContext evolving toward an orchestrator?

**Answer: No. It remains a God Object and is getting worse.**

Current responsibilities still owned by ConsultationContext:

| Responsibility | Lines | Target |
|---------------|-------|--------|
| Reducer + 16 action types | 138-276 | SessionService / DocumentationProvider |
| `VitalsData` interface | 70-85 | PatientContextProvider |
| `StructuredNotes` interface | 87-92 | DocumentationProvider / SOAPNote VO |
| `ConsultationProviderState` interface | 94-117 | Split among providers |
| `ConsultationAction` union | 119-136 | Split among providers |
| `loadAppointment` | 401-552 | SessionService |
| `startConsultation` | 554-602 | SessionService |
| `closeStartDialog` | 604-606 | SessionProvider |
| `updateNotes` | 753-755 | DocumentationProvider |
| `setOutcome` | 757-767 | DocumentationProvider |
| `setPatientDecision` | 769-771 | DocumentationProvider |
| `openCompleteDialog` / `closeCompleteDialog` | 773-781 | SessionProvider |
| `completeConsultation` | 783-851 | SessionService |
| `switchToPatient` | 853-872 | SessionService |
| `goToSurgeryPlanning` | 874-877 | SessionProvider |
| Auto-save useEffect | 881-907 | DraftService (timer) + DocumentationProvider (status) |
| Heartbeat useEffect | 909-932 | SessionService |
| Initial load useEffect | 934-939 | SessionProvider |
| beforeunload useEffect | 941-952 | SessionService |
| Context value memoization | 957-1004 | Split among providers |
| Provider render | 1006-1010 | Split among providers |

**What changed:** Only `saveDraft`, `saveNotes`, and the draft restoration block in `loadAppointment` were modified to check a feature flag. Everything else remains untouched.

**What should have happened:** The extraction should have removed the old draft code from ConsultationContext and left only the DraftService delegation. Instead, the old path was preserved behind a flag, creating a **dual-implementation** that doubles the maintenance burden.

### Evidence that ConsultationContext remains a God Object

1. **It still imports and depends on everything:**
   - React, Next.js, TanStack Query, Sonner, Lodash
   - `doctorApi`, `consultationApi`, `apiClient`
   - `useAuth`, `useDoctorTodayAppointments`, `useConsultation`, `useSaveConsultationDraft`, `usePatientConsultationHistory`
   - `LocalStorageDraftStorage`, `DraftService`
   - All domain enums and workflow types
   - All DTO types

2. **It still owns 16 state fields, 16 action types, and 15 callbacks**
3. **It still makes 10+ API calls directly**
4. **It still contains UI logic** (dialog visibility, auto-save status, saving status)
5. **It still imports Application Layer services** — violating the intended dependency direction

The intended evolution was:
```
ConsultationContext (orchestrator)
    ↓ delegates to
SessionProvider, DocumentationProvider, QueueProvider, etc.
```

The current reality is:
```
ConsultationContext (God Object)
    ↓ conditionally delegates to
DraftService (but still contains all old logic)
```

---

## 3. Public API Review

### DraftService Methods

| Method | In Correct Location? | Assessment |
|--------|---------------------|------------|
| `saveDraft()` | ✅ Application Service | Correct — orchestrates API call + storage backup |
| `restoreDraft()` | ✅ Application Service | Correct — business logic for timestamp comparison |
| `discardDraft()` | ✅ Application Service | Correct — cleanup is a draft lifecycle concern |

### DraftService Exported Functions

| Function | In Correct Location? | Assessment |
|----------|---------------------|------------|
| `generateFullText()` | ⚠️ Application Service | **Should move to Shared Kernel utility.** This is a pure serialization function with no service dependencies. It is used by DraftService but could be used by DocumentationProvider, Mappers, or any layer. |
| `parseLegacyNotes()` | ⚠️ Application Service | **Should move to Shared Kernel utility.** Same rationale — pure parsing logic, no service dependencies, potentially useful for migration tasks. |
| `StructuredNotes` interface | ⚠️ Application Service | **Should move to Shared Kernel or Domain VO.** This is a domain concept (consultation notes shape) that is duplicated between DraftService and ConsultationContext. Moving it to `shared-kernel/types/` or creating a `SOAPNote` VO would eliminate duplication. |

### Why These Should Move

The current placement violates **separation of concerns**:
- `generateFullText` and `parseLegacyNotes` are **serialization utilities**, not service behavior
- `StructuredNotes` is a **domain type**, not an Application Service concern
- Keeping them in DraftService creates an artificial dependency: any code that needs to serialize notes must import an Application Service

**Recommended relocation:**
- `shared-kernel/utils/note-serialization.ts` — `generateFullText`, `parseLegacyNotes`
- `shared-kernel/types/StructuredNotes.ts` — or create `domain/value-objects/SOAPNote.ts`

---

## 4. Dependency Review

### Current Dependencies

| Dependency | Required? | Assessment |
|-----------|-----------|------------|
| `ConsultationApi` | ✅ Yes | Core port — needed for `saveConsultationDraft` |
| `DraftStorage<StructuredNotes>` | ✅ Yes | Storage abstraction — needed for backup |
| `ClinicalErrorCode/Category/Severity` | ✅ Yes | Error taxonomy from Shared Kernel |
| `ClinicalError` type | ✅ Yes | Error shape from Shared Kernel |
| `ConsultationOutcomeType` | ✅ Yes | Domain enum — part of draft payload |
| `PatientDecision` | ✅ Yes | Domain enum — part of draft payload |
| `SaveConsultationDraftDto` | ✅ Yes | DTO for API call |

### Should DraftService Own These?

| Dependency | Verdict | Reasoning |
|-----------|---------|-----------|
| `ConsultationApi` | ✅ Yes | DraftService is the only Application Service that calls `saveConsultationDraft`. It correctly depends on the port, not the concrete HTTP client. |
| `DraftStorage` | ✅ Yes | DraftService owns the draft lifecycle, including backup. The `LocalStorageDraftStorage` adapter implements this port. |
| `LocalStorageDraftStorage` | ❌ No | DraftService should not know about the concrete adapter. It receives `DraftStorage` via constructor injection. The current implementation is correct — the context creates the adapter and passes it in. |
| `ClinicalError*` | ✅ Yes | DraftService returns `ClinicalError` in its `SaveDraftResult`. This is the approved error taxonomy. |
| Domain enums | ✅ Yes | These are part of the draft payload business rules. |
| `SaveConsultationDraftDto` | ✅ Yes | This DTO is owned by the Application Layer and represents the contract with `ConsultationApi`. |

### The Unsafe Cast Problem

```typescript
const draftService = useMemo(() => new DraftService(consultationApi as unknown as ConsultationApi, draftStorage), [consultationApi, draftStorage]);
```

The `consultationApi` object from `lib/api/consultation.ts` does not structurally match the `ConsultationApi` interface because it uses different method names (`getConsultation` vs `loadConsultation`, `saveDraft` vs `saveConsultationDraft`). This cast is a **technical debt marker** that indicates the adapter layer is incomplete.

**Impact:** This is not a DraftService problem — it's an Infrastructure layer problem. The `HttpConsultationApi` adapter exists but is not wired into ConsultationContext. The cast will remain until the adapter is wired in.

---

## 5. Feature Flag Boundary

### Current Approach

```typescript
if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
  // New path: DraftService
} else {
  // Old path: inline logic
}
```

This approach has **three problems**:

#### Problem 1: Branch Duplication

Every draft operation now has two implementations. They must be maintained in parallel until the old path is removed. During the transition period:

- Bug fixes must be applied to **both** paths
- Behavioral changes must be synchronized
- Testing must verify **both** paths produce identical results

#### Problem 2: Scattered Decision Points

The flag is checked in 4 different locations:
1. `loadAppointment` — draft restoration
2. `saveDraft` — manual/auto-save
3. `saveNotes` — manual save
4. `completeConsultation` — draft cleanup

If a future developer adds a new draft operation and forgets the flag check, the old path silently executes, creating inconsistent behavior.

#### Problem 3: Incomplete Abstraction

The flag does not abstract "how drafts work." It abstracts "which module implements draft logic." This means:

- The Presentation Layer still needs to know about draft internals
- The flag is not composable — you can't combine it with other flags cleanly
- Removing the flag requires editing 4 separate code paths

### Alternative: Shim Pattern

A better approach would be a **shim/adapter layer** that presents a single interface to ConsultationContext:

```typescript
interface DraftOperations {
  saveDraft(): Promise<void>;
  restoreDraft(appointmentId, serverUpdatedAt): Promise<...>;
  discardDraft(appointmentId): Promise<void>;
}

class LegacyDraftOperations implements DraftOperations { ... }
class DraftServiceOperations implements DraftOperations { ... }

// In ConsultationContext:
const draftOperations = useMemo(() => 
  isFeatureEnabled('USE_DRAFT_SERVICE')
    ? new DraftServiceOperations(draftService)
    : new LegacyDraftOperations(saveDraftMutation, localStorage),
  [isFeatureEnabled('USE_DRAFT_SERVICE'), draftService, saveDraftMutation]
);

// Usage:
await draftOperations.saveDraft();
```

**Advantages:**
- Single decision point at construction time
- ConsultationContext never branches on the flag
- Old path can be removed by deleting one class
- Testable in isolation

**Disadvantages:**
- Requires an extra interface and two wrapper classes
- More upfront design than feature flags
- Still temporary — the goal is to eliminate both paths and replace with just DraftService

**Verdict:** The current flag-based approach is acceptable for a **short transition period** (1-2 weeks). It should be replaced with the shim pattern for subsequent extractions (SessionService, QueueService) to minimize branch proliferation.

---

## 6. Metrics

### Coupling Reduction

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| ConsultationContext imports | 18 | 22 | +4 (worse) |
| ConsultationContext external dependencies | 9 modules | 13 modules | +4 (worse) |
| DraftService imports | N/A | 7 | New module |
| Can test draft logic without React | No | Yes | ✅ Improved |
| Can test draft logic without HTTP | No | Yes | ✅ Improved |
| Can test draft logic without localStorage | No | Yes | ✅ Improved |

**Finding:** Coupling **increased** in ConsultationContext due to the dual-path implementation. The new DraftService module has clean dependencies, but the context is now more coupled than before.

### Cohesion Improvement

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Draft-related lines in ConsultationContext | ~210 | ~210 (old) + ~5 (flag checks) | No change |
| Draft logic in one module | No (scattered across 3 functions + 2 hooks) | Yes (DraftService) | ✅ Improved |
| `generateFullText` locations | 1 | 2 | ❌ Worse |
| `parseLegacyNotes` locations | 1 | 2 | ❌ Worse |
| `StructuredNotes` definitions | 1 | 2 | ❌ Worse |

**Finding:** Draft logic cohesion improved within DraftService, but three artifacts were duplicated between modules.

### Complexity Reduction

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| ConsultationContext cyclomatic complexity | ~45 | ~55 | +10 (worse) |
| DraftService cyclomatic complexity | N/A | ~8 | New module (acceptable) |
| Total system complexity | ~45 | ~63 | +18 (worse during transition) |

**Finding:** Total system complexity increased during the transition period. This is expected and temporary. The complexity will decrease when the old path is removed.

### Dependency Reduction

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Direct `localStorage` access in ConsultationContext | 4 calls | 4 calls | No change (old path preserved) |
| `localStorage` abstraction usage | 0 | 2 (new path) | ✅ Improved in new path |
| React Query mutation coupling | High (`useSaveConsultationDraft`) | Low (DraftService uses port) | ✅ Improved in new path |
| Feature flag count | 0 | 1 | Neutral (expected) |

---

## 7. Strategy Applicability for Future Services

### Should the same extraction strategy be used for SessionService?

**No. The strategy should change.**

SessionService is **not a background operation**. It:
- Manages the core clinical workflow (start, complete, switch)
- Has immediate UI impact
- Controls navigation and state transitions
- Must be atomic and synchronous from the user's perspective

Running SessionService behind a feature flag with dual paths would:
1. Create an enormous branch in `loadAppointment`, `startConsultation`, `completeConsultation`, `switchToPatient`
2. Risk splitting the session state machine across two implementations
3. Make debugging extremely difficult (which path executed?)
4. Require both paths to maintain identical workflow state transitions

**Recommended strategy for SessionService:** Extract first, then cut over. Do not preserve the old path behind a flag.

### Should the same strategy be used for QueueService?

**Yes, with modifications.**

QueueService is:
- A read-heavy operation (filtering, displaying)
- Low clinical risk (errors affect display, not data)
- Stateless

The dual-path strategy works for QueueService **if** the flag check is centralized in a shim:
```typescript
const queueOperations = useMemo(() => 
  isFeatureEnabled('USE_QUEUE_SERVICE')
    ? new QueueServiceOperations(queueService)
    : new LegacyQueueOperations(),
  [...]
);
```

### Should the same strategy be used for PatientContextProvider?

**No. Providers require a different strategy.**

PatientContextProvider is a **React Context** that owns UI state. The extraction strategy for providers should be:

1. Build the new provider alongside the old context
2. Migrate consumers one component at a time
3. Remove old context properties only when all consumers have migrated

This is a **consumer-by-consumer migration**, not a flag-based dual path.

### Should the same strategy be used for DocumentationProvider?

**No. DocumentationProvider requires a phased migration.**

DocumentationProvider is the most complex provider because:
- It owns the notes state (core clinical data)
- It integrates with DraftService (auto-save)
- Multiple components consume notes state

**Recommended strategy:**
1. Build DocumentationProvider with DraftService integration
2. Run both providers in parallel (not behind a flag, but as actual parallel state)
3. Validate they produce identical state on every keystroke
4. Switch consumers to DocumentationProvider one by one
5. Remove old notes state from ConsultationContext only after all consumers have migrated

---

## 8. Key Findings Summary

### What Went Well

1. **DraftService is clean** — single responsibility, no React imports, proper port dependencies
2. **Tests are comprehensive** — 18 unit tests covering all methods and edge cases
3. **Error handling is typed** — `SaveDraftResult` discriminated union instead of `Promise<void>`
4. **Version conflict detection preserved** — string matching matches old behavior
5. **localStorage compatibility preserved** — identical key format and serialization
6. **Rollback is instant** — feature flag defaults to false

### What Went Wrong

1. **Old path not removed** — dual implementation creates maintenance burden
2. **Feature flag scattered** — 4 separate flag checks instead of single decision point
3. **Artifacts duplicated** — `StructuredNotes`, `generateFullText`, `parseLegacyNotes` defined in both modules
4. **Unsafe cast introduced** — `consultationApi as unknown as ConsultationApi` signals incomplete adapter wiring
5. **ConsultationContext grew** — net +15 lines, +4 imports, +4 flag checks
6. **No orchestrator evolution** — context remains a God Object with full reactivity

### What Should Change for SessionService

| Current Strategy | Recommended Strategy |
|------------------|----------------------|
| Feature flag with dual paths | Extract and replace — no dual path |
| Branch at each call site | Single shim/adapter layer |
| Preserve old implementation as fallback | Remove old implementation after validation |
| Incremental consumer migration | Extract core behavior first, then migrate consumers |

---

## 9. Final Verdict

### Extraction Pattern Approved with Improvements

The DraftService extraction successfully demonstrated that:
1. Application Services can be cleanly extracted from ConsultationContext
2. The port/adapter pattern works for draft operations
3. Feature flags enable safe rollout
4. Behavioral parity is verifiable

However, the implementation revealed flaws in the **transition strategy** that must be corrected before SessionService extraction:

### Required Improvements Before SessionService

1. **Remove old paths before adding new services.** The pattern should be: extract → validate → cut over → remove old. Not: add new → preserve old → branch forever.

2. **Use a shim/adapter layer instead of scattered flag checks.** One decision point at construction time, not 4 separate `if (isFeatureEnabled(...))` blocks.

3. **Eliminate artifact duplication.** Move `StructuredNotes`, `generateFullText`, `parseLegacyNotes` to Shared Kernel before they proliferate across more modules.

4. **Complete adapter wiring before next extraction.** The `consultationApi as unknown as ConsultationApi` cast is a blocker for clean dependency direction.

5. **Define a ConsultationContext reduction target for each extraction.** After DraftService cutover, ConsultationContext should be measurably smaller — not larger.

### Architecture Health Assessment

| Dimension | Status |
|-----------|--------|
| DraftService internal quality | ✅ Healthy |
| ConsultationContext evolution | ❌ Stagnant — still a God Object |
| Dependency direction | ⚠️ Compromised by unsafe cast + old path imports |
| Duplication | ❌ Increased (3 artifacts duplicated) |
| Testability | ✅ Improved (DraftService is testable in isolation) |
| Rollback safety | ✅ Excellent (feature flag default false) |
| Transition complexity | ❌ Increased (dual paths, scattered flags) |
| Overall architecture health | ⚠️ Net neutral — improved in new module, degraded in context |

The pattern is **approved for background/low-risk services** (DraftService, QueueService) with the shim improvement. It is **not appropriate for core workflow services** (SessionService) and requires a different strategy for providers.
