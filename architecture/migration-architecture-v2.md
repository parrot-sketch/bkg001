# Migration Architecture v2

## Executive Summary

The DraftService extraction revealed that the current migration strategy — scattered feature flags with preserved dual paths — is a **scalability risk**. Every subsequent extraction that follows the same pattern will compound complexity in ConsultationContext until it becomes an unmaintainable branching labyrinth.

This document redesigns the migration architecture to ensure every extraction **reduces** ConsultationContext complexity rather than increasing it.

**Core principle: Extract, validate, cut over, remove. No permanent dual paths.**

---

## 1. Migration Strategy

### 1.1 Coexistence Models Evaluated

| Model | Description | Verdict |
|-------|-------------|---------|
| **Scattered feature flags** | `if (isFeatureEnabled(...))` at every call site | ❌ Rejected — DraftService proved this creates branching proliferation |
| **Provider shadow mode** | Old and new providers render simultaneously | ✅ Approved — for React Providers only |
| **Strangler proxy / delegating façade** | Single shim intercepts calls, routes to old or new | ✅ Approved — for Application Services |
| **Composition root selection** | Top-level component chooses implementation tree | ✅ Approved — for eventual final state |
| **Adapter/compatibility shim** | Shim implements old interface, delegates to new | ✅ Approved — the canonical pattern |

### 1.2 Recommended Approach: Shim-First Replacement

The migration mechanism for Application Services is a **single compatibility shim** that:
1. Implements the same interface as the legacy ConsultationContext methods
2. Internally routes to either the old implementation or the new Application Service
3. Is the **only** place in the codebase where the feature flag is checked
4. Is deleted after cutover, leaving zero legacy branches

```
Before extraction:
ConsultationContext → inline draft logic

During extraction:
ConsultationContext → DraftOperationsShim → [legacy path | DraftService]

After cutover:
ConsultationContext → DraftService (direct)
                     ↓
              [shim deleted]
```

### 1.3 Why This Differs from DraftService

DraftService used **scattered flags**:
- 4 separate `if (isFeatureEnabled('USE_DRAFT_SERVICE'))` blocks
- Old logic preserved in `else` branches
- ConsultationContext grew by 15 lines

The shim approach uses **one decision point**:
- Shim constructed once via `useMemo`
- ConsultationContext calls `shim.saveDraft()` — never branches
- Old logic lives in one class: `LegacyDraftOperations`
- After cutover: delete `LegacyDraftOperations`, remove flag, delete shim
- ConsultationContext **shrinks** by ~210 lines

---

## 2. Shim Architecture

### 2.1 Responsibilities

The `ConsultationContextShim` is responsible for:

1. **Interface preservation** — exposes the same API as ConsultationContext's draft/session/queue actions
2. **Routing** — delegates to either legacy implementation or new Application Service based on feature flags
3. **Lifecycle management** — created once, validated, cut over, then deleted
4. **Zero knowledge of consumers** — Presentation Layer components never know which path is active

The shim is **not** responsible for:
- Business logic (lives in Application Services)
- State management (lives in providers)
- UI logic (lives in Presentation Layer)
- Feature flag definition (lives in Shared Kernel)

### 2.2 Lifecycle

```
Phase 1: CREATE
- Implement new Application Service (e.g., DraftService)
- Implement LegacyDraftOperations (wraps old ConsultationContext logic)
- Implement DraftOperationsShim (routes between them)
- Shim is the ONLY consumer of the feature flag

Phase 2: VALIDATE
- Run both paths in parallel (flag OFF vs ON)
- Behavioral parity tests prove identical outputs
- No other code changes required

Phase 3: CUT OVER
- Enable feature flag (set to true)
- Shim routes all calls to DraftService
- LegacyDraftOperations is frozen — no further changes

Phase 4: REMOVE
- Delete LegacyDraftOperations
- Delete feature flag
- Delete shim
- ConsultationContext calls DraftService directly
- Net result: ConsultationContext is smaller
```

### 2.3 Ownership

| Artifact | Owner | Lifetime |
|----------|-------|----------|
| `DraftService` | Application Layer | Permanent |
| `LegacyDraftOperations` | Application Layer (temporary) | Deleted after cutover |
| `DraftOperationsShim` | Application Layer (temporary) | Deleted after cutover |
| Feature flag `USE_DRAFT_SERVICE` | Shared Kernel | Deleted after cutover |

### 2.4 Construction

```typescript
// application/shim/DraftOperationsShim.ts

import { isFeatureEnabled } from '@/shared-kernel/feature-flags';
import { DraftService } from '../services/DraftService';
import { LegacyDraftOperations } from './LegacyDraftOperations';

export class DraftOperationsShim {
  constructor(
    private readonly service: DraftService,
    private readonly legacy: LegacyDraftOperations,
  ) {}

  async saveDraft(appointmentId: number, doctorId: string, notes: StructuredNotes, outcomeType?, patientDecision?) {
    if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
      return this.service.saveDraft(appointmentId, doctorId, notes, outcomeType, patientDecision);
    }
    return this.legacy.saveDraft(appointmentId, doctorId, notes, outcomeType, patientDecision);
  }

  async restoreDraft(appointmentId: number, serverUpdatedAt: Date | null | undefined) {
    if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
      return this.service.restoreDraft(appointmentId, serverUpdatedAt);
    }
    return this.legacy.restoreDraft(appointmentId, serverUpdatedAt);
  }

  async discardDraft(appointmentId: number) {
    if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
      return this.service.discardDraft(appointmentId);
    }
    return this.legacy.discardDraft(appointmentId);
  }
}
```

### 2.5 Dependency Injection

The shim is constructed in ConsultationContext via `useMemo`:

```typescript
// In ConsultationContext — ONE decision point, not scattered flags
const draftOperations = useMemo(() => {
  const service = new DraftService(consultationApi, draftStorage);
  const legacy = new LegacyDraftOperations(saveDraftMutation, localStorage);
  return new DraftOperationsShim(service, legacy);
}, [consultationApi, draftStorage, saveDraftMutation]);
```

**Critical:** ConsultationContext never imports `isFeatureEnabled` directly. The flag is consumed only inside the shim.

### 2.6 Removal Strategy

After validation passes:

1. **Enable flag** → all traffic routes to DraftService
2. **Monitor** → 1-2 days of production traffic
3. **Delete `LegacyDraftOperations.ts`** — old logic removed
4. **Delete `DraftOperationsShim.ts`** — shim no longer needed
5. **Delete `USE_DRAFT_SERVICE` flag** from `feature-flags.ts`
6. **Update ConsultationContext** — calls `draftOperations.service.saveDraft()` directly (or better: the service is injected via SessionProvider)

Result: ConsultationContext has **zero** draft-related logic, **zero** feature flag checks, and **zero** localStorage calls for drafts.

### 2.7 Legacy Operations Class

The legacy class preserves the exact old behavior:

```typescript
// application/shim/LegacyDraftOperations.ts

export class LegacyDraftOperations {
  constructor(
    private readonly saveDraftMutation: ReturnType<typeof useSaveConsultationDraft>,
    private readonly localStorage: Storage,
  ) {}

  async saveDraft(appointmentId, doctorId, notes, outcomeType, patientDecision) {
    // Exact copy of current ConsultationContext saveDraft logic
    // No modifications — this is frozen after creation
  }

  async restoreDraft(appointmentId, serverUpdatedAt) {
    // Exact copy of current ConsultationContext draft restoration logic
  }

  async discardDraft(appointmentId) {
    this.localStorage.removeItem(`consultation-draft-${appointmentId}`);
  }
}
```

**Rule:** Once created, `LegacyDraftOperations` is never modified. Bug fixes go only to the new Application Service.

---

## 3. Feature Flag Placement

### 3.1 Where Flags May Appear

Flags are allowed **only** at architectural composition boundaries:

| Location | Example | Purpose |
|----------|---------|---------|
| **Shim class** | `DraftOperationsShim` | Route to legacy or new service |
| **Provider composition** | `<SessionProvider legacy={ ConsultationContext }>` | Swap entire provider tree |
| **App layout** | `<FeatureFlagProvider>` | Global flag availability |
| **Test environment** | `vitest.config.ts` | Override flags for testing |

### 3.2 Where Flags Must NOT Appear

| Location | Why Forbidden |
|----------|---------------|
| **ConsultationContext business logic** | Creates scattered dual paths |
| **Application Services** | Services are the new canonical implementation |
| **React components** | Components should never branch on architecture flags |
| **Hooks** | Hooks are Presentation Layer concerns |
| **Domain entities/VOs** | Domain logic must not depend on deployment flags |
| **Shared Kernel** | Feature flags are deployment concerns, not domain concerns |

### 3.3 Current Violation

DraftService implementation has flags in 4 places within ConsultationContext:
1. `loadAppointment` — draft restoration
2. `saveDraft` — manual/auto-save
3. `saveNotes` — manual save
4. `completeConsultation` — draft cleanup

**Correction:** These become a single flag check inside `DraftOperationsShim`. ConsultationContext never sees the flag.

---

## 4. ConsultationContext Evolution

### 4.1 Target State

ConsultationContext evolves through 4 phases:

| Phase | Lines | Description |
|-------|-------|-------------|
| **Current** | 1019 | God Object with all logic |
| **After DraftService cutover** | ~810 | Draft logic removed, shim deleted |
| **After SessionService cutover** | ~650 | Session logic removed |
| **After QueueService + NotificationService** | ~600 | Queue/toast logic removed |
| **After PatientContextProvider** | ~565 | Patient logic removed |
| **After DocumentationProvider** | ~485 | Notes/outcome logic removed |
| **After SessionProvider** | ~185 | Remaining orchestration only |
| **Final** | ≤60 or deleted | Thin shim or removed entirely |

### 4.2 Measurable Checkpoints

After each extraction, verify:

| Checkpoint | Measurement | Target |
|------------|-------------|--------|
| ConsultationContext lines | `wc -l` | Decreases |
| Feature flag checks in context | `grep isFeatureEnabled` | Zero after cutover |
| localStorage calls in context | `grep localStorage` | Zero after cutover |
| toast calls in context | `grep toast.` | Zero after cutover |
| API calls in context | `grep doctorApi\|consultationApi\|apiClient` | Zero after cutover |
| Reducer actions | Count action types | Decreases |
| State fields | Count state properties | Decreases |
| Cyclomatic complexity | Manual or tool count | Decreases |

### 4.3 Evolution Triggers

| Trigger | Action |
|---------|--------|
| Feature flag enabled + 2 days clean production traffic | Delete legacy path, remove flag |
| All unit tests pass on new path only | Delete legacy path |
| Behavioral parity tests pass 100% | Delete legacy path |
| No bug reports on new path for 1 week | Delete legacy path |

---

## 5. Extraction Pattern v2

### 5.1 Canonical Pattern: Shim-First Replacement

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: CREATE                                             │
│  - Implement Application Service (DraftService)              │
│  - Implement LegacyOperations (exact copy of old logic)      │
│  - Implement Shim (routes between them)                      │
│  - Feature flag is consumed ONLY inside shim                 │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: VALIDATE                                           │
│  - Unit tests for new service                                │
│  - Behavioral parity: flag OFF vs ON produces identical output│
│  - ConsultationContext does NOT branch on flag               │
│  - ConsultationContext line count does NOT increase           │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: CUT OVER                                           │
│  - Enable feature flag                                       │
│  - All traffic routes to new service                         │
│  - Monitor for 1-2 days                                      │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: REMOVE LEGACY                                      │
│  - Delete LegacyOperations                                   │
│  - Delete Shim                                               │
│  - Delete feature flag                                       │
│  - ConsultationContext calls service directly                │
│  - VERIFY: Context is SMALLER than before extraction         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Critical Rules

1. **No dual paths in ConsultationContext.** The context never branches on a flag.
2. **No legacy logic preservation.** Old code is copied to `LegacyOperations`, frozen, then deleted.
3. **No feature flag proliferation.** One flag per extraction, deleted after cutover.
4. **Every extraction must shrink ConsultationContext.** If lines don't decrease, the extraction failed.
5. **Legacy code is never modified after copy.** Bug fixes go to the new service only.

### 5.3 Provider Extraction Variant

For React Providers, use the **Migrate-Then-Remove** pattern:

```
1. CREATE new provider alongside old context
2. RENDER both in shadow mode (old provider active, new provider logging state)
3. MIGRATE consumers one by one to new provider
4. REMOVE old provider when zero consumers remain
5. DELETE old context logic
```

No feature flags needed for providers. The shadow mode is a development/debugging tool, not a production toggle.

---

## 6. Provider Extraction Impact

### 6.1 SessionProvider

**Impact:** HIGH. SessionProvider is the root orchestrator.

**Strategy:** Replace Pattern for SessionService, Migrate-Then-Remove for SessionProvider.

```
1. Extract SessionService with shim (DraftService-style)
2. Validate SessionService.replace pattern
3. Create SessionProvider consuming SessionService
4. Migrate components to SessionProvider one by one
5. Remove old session logic from ConsultationContext
6. Delete shim
```

**ConsultationContext reduction:** ~300 lines (reducer, loadAppointment, startConsultation, completeConsultation, switchToPatient, heartbeat, beforeunload)

### 6.2 QueueProvider

**Impact:** MEDIUM. Queue filtering is relatively isolated.

**Strategy:** Replace Pattern via shim.

```
1. Extract QueueService with shim
2. Create QueueProvider
3. Migrate queue panel to QueueProvider
4. Remove queue logic from ConsultationContext
5. Delete shim
```

**ConsultationContext reduction:** ~50 lines

### 6.3 DocumentationProvider

**Impact:** HIGH. Notes state is core clinical data with auto-save integration.

**Strategy:** Migrate-Then-Remove with DraftService integration.

```
1. DocumentationProvider already depends on DraftService (extracted earlier)
2. Run DocumentationProvider in shadow mode
3. Migrate SOAPWorkspace, tabs, header save button
4. Remove notes/outcome/decision state from ConsultationContext
5. Remove old draft path (Week 1 mistake correction)
6. Delete ConsultationContext notes handlers
```

**ConsultationContext reduction:** ~200 lines

### 6.4 PatientContextProvider

**Impact:** LOW-MEDIUM. Patient data loading is relatively isolated.

**Strategy:** Migrate-Then-Remove.

```
1. Create PatientContextProvider
2. Migrate PatientInfoSidebar
3. Migrate consultation history modal
4. Remove patient/vitals loading from ConsultationContext
```

**ConsultationContext reduction:** ~50 lines

### 6.5 BillingProvider

**Impact:** LOW. Billing is only needed at completion.

**Strategy:** New functionality — no migration needed.

```
1. Create BillingProvider
2. Wire into CompletionDialog
3. No changes to ConsultationContext
```

### 6.6 NotificationProvider

**Impact:** LOW. Toast display is UI-only.

**Strategy:** New functionality — no migration needed.

```
1. Create NotificationService
2. Create NotificationProvider
3. Migrate toast calls from ConsultationContext to NotificationService
4. Remove toast imports from ConsultationContext
```

**ConsultationContext reduction:** ~20 lines

---

## 7. Rollback Strategy

### 7.1 Design Principle

Rollback must not leave embedded legacy branches. After cutover, the codebase should be **cleaner** than before extraction — no dual paths, no feature flags, no commented-out code.

### 7.2 Rollback Mechanisms by Phase

| Phase | Mechanism | Rollback Action | Cleanup Required |
|-------|-----------|-----------------|------------------|
| **Create** | Feature flag in shim | Disable flag → legacy path active | Delete new service files, shim |
| **Validate** | Parallel testing | Stop flag, revert shim | Delete all new files |
| **Cut Over** | Flag enabled | Disable flag → shim routes to legacy | Delete service files, re-enable legacy |
| **Remove Legacy** | Flag still enabled | Git revert commit | None — already clean |

### 7.3 The Rollback Problem with Scattered Flags

With DraftService's scattered flag approach, rollback requires:
1. Disable `USE_DRAFT_SERVICE`
2. Verify 4 separate code paths all use legacy logic
3. Risk: one path was missed and still calls DraftService

With the shim approach, rollback requires:
1. Disable `USE_DRAFT_SERVICE`
2. Shim automatically routes all calls to `LegacyDraftOperations`
3. No code changes needed
4. After stabilization: revert commit that added DraftService + shim

### 7.4 Zero-Embedding Rule

After any extraction, the codebase must satisfy:
- [ ] Zero `if (isFeatureEnabled(...))` in ConsultationContext
- [ ] Zero commented-out legacy code
- [ ] Zero `Legacy*` classes in production path
- [ ] Zero feature flags for completed extractions

---

## 8. Dependency Rules for Migration Layer

### 8.1 Shim Dependencies

```
LegacyDraftOperations
    ├── ConsultationContext internals ✅ (it IS the old logic)
    ├── React Query hooks ✅ (legacy implementation detail)
    ├── localStorage ✅ (legacy implementation detail)
    └── Application Services ❌ (never imports new code)

DraftOperationsShim
    ├── DraftService ✅ (new implementation)
    ├── LegacyDraftOperations ✅ (legacy implementation)
    └── isFeatureEnabled ✅ (flag source)

ConsultationContext
    ├── DraftOperationsShim ✅ (single migration boundary)
    └── isFeatureEnabled ❌ (must not import flags)
```

### 8.2 Forbidden Patterns

```typescript
// ❌ FORBIDDEN: Feature flag in ConsultationContext
if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
  await draftService.saveDraft(...);
} else {
  await legacySaveDraft(...);
}

// ❌ FORBIDDEN: Importing Application Service + legacy logic side-by-side
import { DraftService } from '@/application/services/DraftService';
// ... old saveDraft function still here ...

// ✅ CORRECT: Single shim boundary
const draftOps = useMemo(() => new DraftOperationsShim(...), []);
await draftOps.saveDraft(...);
// No flag visible here
```

---

## 9. Summary

The migration architecture v2 replaces scattered feature flags with a single compatibility shim that serves as the migration boundary. The shim:

- Routes calls to either legacy or new implementation
- Is the **only** consumer of feature flags
- Is deleted after cutover, leaving zero legacy branches
- Ensures ConsultationContext shrinks with every extraction

This pattern scales to all 7 remaining services/providers without creating the branching proliferation that DraftService's scattered-flag approach produced.

**The roadmap must be updated before SessionService begins.**
