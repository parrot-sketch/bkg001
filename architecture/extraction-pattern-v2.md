# Extraction Pattern v2

## Purpose

This document defines the canonical extraction pattern for all remaining Application Service and Provider extractions in the Consultation Module modernization. It incorporates lessons learned from the DraftService extraction and establishes rules that prevent the transition-strategy flaws observed in PR-002B.

---

## Core Principle

> **Extract, validate, cut over, remove. No permanent dual paths.**

Every extraction must result in a **net decrease** in ConsultationContext responsibility. Relocation without removal is not extraction — it is duplication.

---

## Extraction Types

The Consultation Module contains three distinct extraction targets, each requiring a different pattern:

| Target | Examples | Pattern |
|--------|----------|---------|
| **Application Service** | DraftService, SessionService, QueueService, NotificationService, AuditService, BillingService, TimerService | Shim-First Replacement |
| **React Provider** | PatientContextProvider, QueueProvider, DocumentationProvider, SessionProvider, TimerProvider, BillingProvider, NotificationProvider | Migrate-Then-Remove |
| **Domain Entity/VO** | SOAPNote, VitalsSnapshot, QueueFilter, SessionWorkflow | Extract-Then-Adopt |

---

## Pattern 1: Shim-First Replacement (Application Services)

### When to Use

- The target is a stateless or stateful Application Service
- The logic has no UI coupling (no JSX, no React hooks, no component references)
- The logic performs I/O through ports (`ConsultationApi`, `DraftStorage`, etc.)
- The logic is testable without React or a browser

### Steps

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: CREATE                                             │
│  - Implement Application Service (e.g., DraftService)        │
│  - Implement LegacyOperations (exact copy of old logic)      │
│  - Implement Shim (routes between them)                      │
│  - Wire shim into ConsultationContext via single useMemo     │
│  - Feature flag consumed ONLY inside shim                    │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: VALIDATE                                           │
│  - Unit tests for new service (mocked dependencies)          │
│  - Behavioral parity tests: flag OFF vs ON identical output  │
│  - ConsultationContext does NOT branch on flag               │
│  - ConsultationContext line count does NOT increase           │
│  - Existing tests pass without modification                  │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: CUT OVER                                           │
│  - Enable feature flag                                       │
│  - All traffic routes to new service                         │
│  - Monitor for 1-2 days                                      │
│  - Verify error rates, success rates, behavioral parity      │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: REMOVE LEGACY                                      │
│  - Delete LegacyOperations.ts                                │
│  - Delete Shim.ts                                            │
│  - Delete feature flag from Shared Kernel                    │
│  - Update ConsultationContext to call service directly        │
│  - VERIFY: ConsultationContext is SMALLER than before        │
└─────────────────────────────────────────────────────────────┘
```

### Critical Rules

#### Rule 1: No Dual Paths in ConsultationContext

```typescript
// ❌ WRONG — dual path in context (DraftService mistake)
if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
  await draftService.saveDraft(...);
} else {
  await saveDraftMutation.mutateAsync(...);
}

// ✅ CORRECT — single path, shim handles routing
const draftOps = useMemo(() => new DraftOperationsShim(...), [...]);
await draftOps.saveDraft(...);
```

#### Rule 2: ConsultationContext Must Shrink

Before extraction: measure `wc -l contexts/ConsultationContext.tsx`
After cutover: measure again.

**The line count must be lower.** If it is not higher, the extraction failed.

#### Rule 3: Legacy Code Is Frozen

Once `LegacyOperations` is created, it is never modified. Bug fixes go only to the new Application Service.

#### Rule 4: One Feature Flag Per Extraction

Each extraction gets exactly one flag. After cutover, the flag is deleted.

#### Rule 5: Zero Scattered Flag Checks

The flag is consumed in exactly one place: inside the shim. ConsultationContext never imports `feature-flags`.

### DraftService Correction

DraftService violated all 5 rules. The correction for PR-002C:

1. Create `LegacyDraftOperations` with old logic
2. Create `DraftOperationsShim` with single flag check
3. Replace all 4 scattered flag checks in ConsultationContext with shim calls
4. After validation: delete legacy, shim, and flag
5. Expected result: ConsultationContext decreases by ~210 lines

---

## Pattern 2: Migrate-Then-Remove (React Providers)

### When to Use

- The target is a React Context / Provider that owns UI state
- Multiple components consume the provider's state
- The provider has lifecycle concerns (mount effects, subscriptions, cleanup)

### Steps

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: CREATE                                             │
│  - Create new provider in contexts/                         │
│  - Owns its slice of state                                   │
│  - Depends on Application Services (not other providers)     │
│  - Exposes typed context value                               │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: SHADOW MODE                                        │
│  - Wrap app with BOTH old and new providers                  │
│  - New provider runs in shadow — no consumers yet            │
│  - Log/compare state between old and new                     │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: MIGRATE CONSUMERS                                  │
│  - Pick leaf component consuming old provider                │
│  - Switch to consume new provider                            │
│  - Validate behavior matches                                 │
│  - Repeat for next component                                 │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: REMOVE OLD PROVIDER                                │
│  - When zero consumers remain                                │
│  - Delete old context file                                   │
│  - Remove old provider wrapper from app tree                 │
│  - VERIFY: No references to old provider remain              │
└─────────────────────────────────────────────────────────────┘
```

### Critical Rules

#### Rule 1: No Consumer Breakage

Both providers must be active during migration. Consumers switch gradually.

#### Rule 2: No Feature Flags

Providers do not use feature flags. Shadow mode is a development tool, not a production toggle.

#### Rule 3: No Direct Provider Imports

Provider A must not import Provider B directly. Composition happens at the page level.

```typescript
// ❌ FORBIDDEN
function SessionProvider() {
  const patient = usePatientContext(); // Direct import
}

// ✅ CORRECT
function SessionPage() {
  return (
    <PatientContextProvider>
      <SessionProvider>
        {/* SessionProvider receives data via props or React Query */}
      </SessionProvider>
    </PatientContextProvider>
  );
}
```

#### Rule 4: Provider Independence

Each provider must be testable and functional without other providers present.

---

## Pattern 3: Extract-Then-Adopt (Domain Entities/VOs)

### When to Use

- The target is a value object, entity, or enum
- The type is currently inline in ConsultationContext or a hook
- The type is shared across multiple modules

### Steps

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: CREATE                                             │
│  - Create VO in domain/value-objects/ or shared-kernel/      │
│  - Pure TypeScript, no framework dependencies                │
│  - Immutable, readonly properties                            │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: ADOPT                                              │
│  - Update owning module to use new VO                        │
│  - Keep old inline type as alias during transition           │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: MIGRATE                                            │
│  - Update consumers to use new VO                            │
│  - Update mappers if needed                                  │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: REMOVE OLD                                         │
│  - Delete inline type                                       │
│  - Remove alias                                             │
│  - VERIFY: Zero references to old type name                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Extraction Order

The approved extraction order for Phase 2:

| Week | Extraction | Pattern | ConsultationContext Reduction |
|------|-----------|---------|------------------------------|
| 1 | DraftService (cutover) | Shim-First Replacement | −210 lines |
| 2 | QueueService + NotificationService | Shim-First Replacement | −50 lines |
| 3 | PatientContextProvider | Migrate-Then-Remove | −50 lines |
| 4 | DocumentationProvider | Migrate-Then-Remove | −200 lines |
| 5 | SessionService + SessionProvider | Shim-First + Migrate-Then-Remove | −300 lines |
| 6 | Remaining providers | Migrate-Then-Remove | −100 lines |

**Total expected reduction:** ~910 lines → ConsultationContext ≤60 lines or deleted

---

## Verification Checklist

Every extraction must pass ALL of these before merge:

### Pre-Extraction

- [ ] Service interface/class designed and certified
- [ ] `LegacyOperations` class created with exact copy of old logic
- [ ] Shim class created with single flag check
- [ ] Behavioral parity test plan written
- [ ] Rollback strategy defined
- [ ] ConsultationContext line count measured (baseline)

### During Extraction

- [ ] New service has zero React/UI imports
- [ ] New service depends only on ports + Shared Kernel + DTOs
- [ ] `LegacyOperations` is frozen — never modified after creation
- [ ] Shim is the ONLY consumer of feature flag
- [ ] ConsultationContext does NOT import `feature-flags`
- [ ] ConsultationContext does NOT branch on flag
- [ ] ConsultationContext line count does NOT increase

### Post-Extraction (After Cutover)

- [ ] `LegacyOperations.ts` deleted
- [ ] `Shim.ts` deleted
- [ ] Feature flag deleted from `feature-flags.ts`
- [ ] ConsultationContext calls new service directly or via provider
- [ ] ConsultationContext line count is LESS than baseline
- [ ] Zero `isFeatureEnabled` in ConsultationContext
- [ ] Zero `localStorage` in ConsultationContext (if DraftService)
- [ ] Zero `toast` in ConsultationContext (if NotificationService)
- [ ] Zero direct API calls in ConsultationContext (if SessionService)
- [ ] Unit tests cover all new service methods
- [ ] Behavioral parity tests pass
- [ ] All existing tests pass without modification
- [ ] TypeScript compiles without errors
- [ ] No `as unknown as` casts introduced
- [ ] No new circular dependencies

---

## Measurement Protocol

Track these metrics before and after every extraction:

| Metric | Measurement Method | Target |
|--------|-------------------|--------|
| ConsultationContext lines | `wc -l` | Decrease |
| ConsultationContext responsibilities | Count exported actions + state fields | Decrease |
| Cyclomatic complexity of ConsultationContext | Manual count or tool | Decrease |
| Feature flag checks in ConsultationContext | `grep isFeatureEnabled` | Zero (after cutover) |
| localStorage calls in ConsultationContext | `grep localStorage` | Zero (after cutover) |
| toast calls in ConsultationContext | `grep toast.` | Zero (after cutover) |
| Direct API calls in ConsultationContext | `grep doctorApi\|consultationApi\|apiClient` | Zero (after cutover) |
| Reducer actions in ConsultationContext | Count action types | Decrease |
| State fields in ConsultationContext | Count state properties | Decrease |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: The Feature Flag Graveyard

**Description:** Preserving old implementations behind feature flags indefinitely.

**Symptoms:** 5+ flags, old code paths never deleted, bug fixes applied twice.

**Correction:** Delete old path within 1 sprint of validation.

### Anti-Pattern 2: The Scattered Switch

**Description:** Checking feature flags at every call site.

**Symptoms:** `if (isFeatureEnabled(...))` in 4+ methods.

**Correction:** Use a shim class with one decision point.

### Anti-Pattern 3: The Relocating God Object

**Description:** Extracting services but leaving ConsultationContext as the orchestrator of all of them.

**Symptoms:** Context creates all services, calls all services, owns all state.

**Correction:** Providers compose services. Context becomes thin or is deleted.

### Anti-Pattern 4: The Growing Context

**Description:** ConsultationContext line count increases after extraction.

**Symptoms:** Context has more lines after "extraction" than before.

**Correction:** If lines don't decrease, the extraction failed. Revert and retry.

### Anti-Pattern 5: The Unsafe Cast Chain

**Description:** Using `as unknown as` to bypass TypeScript because adapters are incomplete.

**Symptoms:** `consultationApi as unknown as ConsultationApi`.

**Correction:** Complete adapter wiring before extraction.

---

## Rollback Protocol

### For Application Services (Shim-First Replacement)

**During validation (flag OFF or ON by choice):**
- Disable flag → shim routes to legacy
- No code changes needed

**After cutover (flag ON in production):**
- Git revert the commit that deleted legacy operations
- Re-enable legacy path in shim
- Disable flag
- Investigate failure
- Re-implement with fixes

**After legacy deleted and shim removed:**
- Git revert entire extraction commit
- ConsultationContext restored to pre-extraction state
- Zero migration impact

### For Providers (Migrate-Then-Remove)

1. Revert Presentation Layer components to old provider
2. Delete new provider files
3. Re-render and validate

---

## Summary

The Shim-First Replacement pattern eliminates dual-path complexity and ensures ConsultationContext shrinks with every extraction. The Migrate-Then-Remove pattern enables safe provider extraction without breaking consumers. The Extract-Then-Adopt pattern handles domain types cleanly.

**Every extraction must leave the codebase cleaner than it found it.**
