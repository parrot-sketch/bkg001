# Provider Extraction Pattern

## Purpose

This document defines the canonical pattern for extracting Application Services from `ConsultationContext`. It incorporates lessons learned from the DraftService extraction and establishes rules that prevent the transition-strategy flaws observed in PR-002B.

---

## Core Principle

> **Extract, validate, cut over, remove. Do not preserve dual paths.**

The goal of extraction is to **reduce** complexity in ConsultationContext, not to **relocate** it while keeping the original. Every extraction must result in a net decrease in ConsultationContext responsibility.

---

## Extraction Types

The Consultation Module contains three distinct extraction targets, each requiring a different pattern:

| Target | Examples | Pattern |
|--------|----------|---------|
| **Application Service** | DraftService, SessionService, QueueService, NotificationService, AuditService, BillingService, TimerService | Replace Pattern |
| **React Provider** | PatientContextProvider, QueueProvider, DocumentationProvider, SessionProvider, TimerProvider, BillingProvider, NotificationProvider | Migrate-Then-Remove Pattern |
| **Domain Entity/VO** | SOAPNote, VitalsSnapshot, QueueFilter, SessionWorkflow | Extract-Then-Adopt Pattern |

---

## Pattern 1: Replace (Application Services)

### When to Use

- The target is a **stateless or stateful Application Service**
- The logic has **no UI coupling** (no JSX, no React hooks, no component references)
- The logic performs **I/O through ports** (`ConsultationApi`, `DraftStorage`, etc.)
- The logic is **testable without React or a browser**

### Steps

```
1. CREATE the new service in application/services/
   - Implement the public API
   - Depend only on ports + Shared Kernel + Application DTOs

2. VALIDATE the service in isolation
   - Unit tests with mocked dependencies
   - Behavioral parity tests against current ConsultationContext logic

3. WIRE a single shim/adapter in ConsultationContext
   - One `useMemo` creates the service instance
   - One helper method delegates to the service
   - NO feature flag — the new service is the only implementation

4. REMOVE the old logic from ConsultationContext
   - Delete the extracted functions, hooks, and inline logic
   - Delete unused imports
   - Verify line count decreases

5. VERIFY
   - All existing tests pass
   - All Presentation Layer consumers work unchanged
   - TypeScript compiles
   - Lint passes
```

### Critical Rule: No Dual Paths

```typescript
// ❌ WRONG — dual path preserves old logic
if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
  await draftService.saveDraft(...);
} else {
  await legacySaveDraft(...);
}

// ✅ CORRECT — single path, service is the implementation
await draftService.saveDraft(...);
```

### DraftService Lesson

The DraftService extraction violated this rule. The old inline logic was preserved behind a feature flag, creating:
- 4 separate flag checks
- 2 complete implementations of every draft operation
- +15 lines to ConsultationContext instead of -210
- A maintenance burden where bug fixes must be applied twice

**Correction applied in this pattern:** Future Application Service extractions will replace, not duplicate.

### Exception: Low-Risk Background Services

For **low-risk background operations** (auto-save, heartbeat, polling), a short dual-path period (≤1 week) is acceptable if:
1. The old path is removed immediately after validation
2. A single shim class abstracts the decision, not scattered flag checks
3. The shim is deleted after cutover

```typescript
// Acceptable temporary shim — single decision point
class DraftOperations {
  constructor(private service: DraftService, private legacy: LegacyDraftOps) {}
  
  async saveDraft(...) {
    if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
      return this.service.saveDraft(...);
    }
    return this.legacy.saveDraft(...);
  }
}

// After validation: delete LegacyDraftOps, remove flag check
```

---

## Pattern 2: Migrate-Then-Remove (React Providers)

### When to Use

- The target is a **React Context / Provider** that owns UI state
- Multiple components consume the provider's state
- The provider has **lifecycle concerns** (mount effects, subscriptions, cleanup)

### Steps

```
1. CREATE the new provider in contexts/
   - Owns its slice of state
   - Depends on Application Services (not the other way around)
   - Exposes a typed context value

2. RENDER both providers simultaneously
   - Wrap the app with BOTH old and new providers
   - New provider runs in "shadow mode" — no consumers yet
   - Log/compare state between old and new providers

3. MIGRATE consumers one by one
   - Pick a leaf component that consumes the old provider
   - Switch it to consume the new provider
   - Validate behavior matches
   - Repeat for next component

4. REMOVE old provider when no consumers remain
   - Delete the old context file
   - Remove old provider wrapper from app tree
```

### Critical Rule: No Consumer Breakage

```typescript
// ❌ WRONG — breaks all consumers immediately
export function NewDocumentationProvider({ children }) {
  return <NewContext.Provider>{children}</NewContext.Provider>;
}

// ✅ CORRECT — shadow mode, gradual migration
export function DocumentationProvider({ children }) {
  return (
    <OldContext.Provider>
      <NewContext.Provider>
        {children}
      </NewContext.Provider>
    </OldContext.Provider>
  );
}
```

### Exception: New Providers with No Consumers

If the provider is **new functionality** (e.g., TimerProvider for a new timer feature), it can be added without shadow mode.

---

## Pattern 3: Extract-Then-Adopt (Domain Entities/VOs)

### When to Use

- The target is a **value object, entity, or enum**
- The type is currently inline in ConsultationContext or a hook
- The type is **shared across multiple modules**

### Steps

```
1. CREATE the VO in domain/value-objects/ or shared-kernel/types/
   - Pure TypeScript, no framework dependencies
   - Immutable, readonly properties
   - Factory methods if construction is non-trivial

2. ADOPT the VO in the owning module
   - Update ConsultationContext or service to use the VO
   - Update DTOs to use the VO

3. MIGRATE consumers
   - Update imports in Presentation Layer
   - Update mappers if needed

4. REMOVE old inline types
   - Delete inline interfaces
   - Verify no references remain
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: The Feature Flag Graveyard

**Description:** Preserving old implementations behind feature flags indefinitely.

**Symptoms:**
- 5+ feature flags controlling Application Services
- Old code paths never deleted
- Bug fixes applied twice
- New developers confused about which path is canonical

**Correction:** Feature flags are for **rollback**, not **preservation**. Delete the old path within 1 sprint of validation.

### Anti-Pattern 2: The Scattered Switch

**Description:** Checking feature flags at every call site instead of at construction.

**Symptoms:**
- `if (isFeatureEnabled(...))` appears in 4+ methods
- Each method has two complete implementations
- Removing the flag requires editing N methods

**Correction:** Use a shim/adapter class with one decision point.

### Anti-Pattern 3: The Shrinking God Object

**Description:** Extracting services but leaving ConsultationContext as the orchestrator of all of them.

**Symptoms:**
- ConsultationContext creates all services via `useMemo`
- ConsultationContext calls all services in sequence
- ConsultationContext still owns all state and reducers
- ConsultationContext grows with each extraction

**Correction:** Providers should compose services, not ConsultationContext. ConsultationContext should eventually become a thin shim that delegates to providers.

### Anti-Pattern 4: The Unsafe Cast Chain

**Description:** Using `as unknown as` to bypass TypeScript's structural typing because adapters are incomplete.

**Symptoms:**
- `consultationApi as unknown as ConsultationApi`
- Adapters exist but are not wired into consumers
- Type safety is illusory

**Correction:** Complete adapter wiring before extracting services that depend on the port.

---

## Dependency Rules for Extractions

### Application Service Dependencies

```
Application Service
    ├── Ports (Domain interfaces) ✅
    ├── Shared Kernel ✅
    ├── Application DTOs ✅
    ├── Domain enums/VOs ✅
    ├── React ❌
    ├── JSX ❌
    ├── Concrete HTTP clients ❌
    ├── localStorage ❌
    ├── Providers ❌
    └── Other Application Services ⚠️ (only if one service is a natural dependency of another)
```

### Provider Dependencies

```
Provider (React Context)
    ├── Application Services ✅
    ├── Ports (rare, via services) ✅
    ├── Shared Kernel ✅
    ├── React ✅ (required)
    ├── Other Providers ⚠️ (only leaf providers; root providers must not depend on children)
    └── Domain Layer ⚠️ (only types, not logic)
```

---

## Verification Checklist

Every extraction must pass ALL of these before merge:

### Pre-Extraction

- [ ] Service interface/class designed and certified
- [ ] All dependencies exist as ports (no concrete adapters)
- [ ] Behavioral parity test plan written
- [ ] Rollback strategy defined

### During Extraction

- [ ] New service has zero React/UI imports
- [ ] New service depends only on ports + Shared Kernel + DTOs
- [ ] No `localStorage`, `sessionStorage`, `document`, `window` in service
- [ ] No `toast`, `router`, `queryClient` in service
- [ ] Old logic is **removed** from ConsultationContext, not preserved behind a flag
- [ ] ConsultationContext line count **decreases** (or stays the same if only a rename)

### Post-Extraction

- [ ] Unit tests cover all public methods of new service
- [ ] Behavioral parity tests prove identical behavior
- [ ] All existing tests pass without modification
- [ ] TypeScript compiles without errors
- [ ] No `as unknown as` casts introduced
- [ ] No new circular dependencies
- [ ] ConsultationContext complexity **decreases** (fewer responsibilities, not just relocated)

---

## Measurement Protocol

Track these metrics before and after every extraction:

| Metric | Measurement Method | Target |
|--------|-------------------|--------|
| ConsultationContext lines | `wc -l` | Decrease |
| ConsultationContext responsibilities | Count exported actions + state fields | Decrease |
| Cyclomatic complexity of ConsultationContext | `tscomplexity` or manual count | Decrease |
| Draft/Service-specific imports in ConsultationContext | Grep for service import | Zero (after old path removed) |
| Feature flag checks in ConsultationContext | Grep for `isFeatureEnabled` | Zero (after cutover) |
| `localStorage` calls in ConsultationContext | Grep for `localStorage` | Zero (after cutover) |
| Dual-path branches | Grep for `if (isFeatureEnabled` | Zero (after cutover) |

---

## Rollback Protocol

### For Application Services (Replace Pattern)

Rollback is trivial because there is no dual path:

```bash
git revert <commit-hash>
```

This removes the service and restores the original inline logic. No feature flag toggling required.

### For Providers (Migrate-Then-Remove Pattern)

Rollback requires reverting consumer migrations:

1. Revert Presentation Layer components to old provider
2. Delete new provider files
3. Re-render and validate

### For Dual-Path Services (Legacy/DraftService Only)

If a dual path was mistakenly created:

1. Disable feature flag → old path active
2. Delete service files
3. Remove flag checks from ConsultationContext
4. Revert ConsultationContext to pre-extraction state

---

## Summary

The Replace Pattern eliminates dual-path complexity and ensures ConsultationContext shrinks with every extraction. The Migrate-Then-Remove Pattern enables safe provider extraction without breaking consumers. The Extract-Then-Adopt Pattern handles domain types cleanly.

**Never preserve old implementations behind feature flags.** Extract, validate, cut over, remove.
