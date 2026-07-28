# Compatibility Shim Design

## Purpose

The compatibility shim is the single migration boundary between `ConsultationContext` and the modernized Application Layer. It enables safe, reversible extraction of business logic without scattering feature flags throughout the codebase.

---

## 1. Shim Concept

```
ConsultationContext
        ↓
  [Shim Layer] ← ONLY place where feature flags are checked
        ↓
    ┌───┴───┐
    │       │
Legacy    New
Ops      Service
```

The shim implements the same interface as the legacy ConsultationContext methods. Internally, it routes to either the old implementation or the new Application Service.

**Unlike DraftService's scattered flags:** The shim centralizes the routing decision. ConsultationContext never branches on a feature flag.

---

## 2. Responsibilities

| Responsibility | Owner | Rationale |
|---------------|-------|-----------|
| Route calls to legacy or new implementation | Shim | Single decision point |
| Preserve old interface during extraction | Shim | Consumers never change |
| Enable behavioral parity testing | Shim | Both paths available simultaneously |
| Provide instant rollback | Shim | Disable flag → legacy active |
| Enable clean removal after cutover | Shim | Delete shim + legacy, leave only new service |

**The shim does NOT:**
- Contain business logic
- Modify state
- Know about consumers
- Persist after cutover

---

## 3. Lifecycle

### Phase 1: Create

1. Implement new Application Service (e.g., `DraftService`)
2. Implement `LegacyDraftOperations` — exact copy of old logic, frozen after creation
3. Implement `DraftOperationsShim` — routes between legacy and new
4. Wire shim into ConsultationContext via single `useMemo`

```typescript
const draftOps = useMemo(() => 
  new DraftOperationsShim(
    new DraftService(consultationApi, draftStorage),
    new LegacyDraftOperations(saveDraftMutation, localStorage)
  ),
  [consultationApi, draftStorage, saveDraftMutation]
);
```

### Phase 2: Validate

1. Run behavioral parity tests: flag OFF vs ON produce identical outputs
2. Run existing test suite: all pass
3. Run frontend tests: all pass
4. Verify ConsultationContext does not branch on flag
5. Production canary: 5% traffic through new path

### Phase 3: Cut Over

1. Enable feature flag: `NEXT_PUBLIC_USE_DRAFT_SERVICE=true`
2. All traffic routes to DraftService
3. Monitor for 1-2 days:
   - Error rate
   - Draft save success rate
   - localStorage backup success
   - Draft restoration accuracy

### Phase 4: Remove

1. Delete `LegacyDraftOperations.ts` — old logic permanently removed
2. Delete `DraftOperationsShim.ts` — shim no longer needed
3. Delete `USE_DRAFT_SERVICE` flag from `feature-flags.ts`
4. Update ConsultationContext to call DraftService directly (or via SessionProvider)
5. Verify ConsultationContext line count decreased

---

## 4. Shim Interface

Every shim implements the same interface as the legacy ConsultationContext method it replaces:

```typescript
// Example: DraftOperationsShim interface

interface DraftOperations {
  saveDraft(appointmentId: number, doctorId: string, notes: StructuredNotes, outcomeType?, patientDecision?): Promise<SaveDraftResult>;
  restoreDraft(appointmentId: number, serverUpdatedAt: Date | null | undefined): Promise<DraftRecord<StructuredNotes> | null>;
  discardDraft(appointmentId: number): Promise<void>;
}
```

**Rule:** The shim interface must exactly match the legacy method signature. Any deviation means the interface is wrong.

---

## 5. Ownership

| Component | Layer | Lifetime | Created By | Deleted By |
|-----------|-------|----------|------------|------------|
| `DraftService` | Application | Permanent | PR-002B | Never |
| `LegacyDraftOperations` | Application Shim | Temporary | PR-002B | PR-002C (cutover) |
| `DraftOperationsShim` | Application Shim | Temporary | PR-002B | PR-002C (cutover) |
| `USE_DRAFT_SERVICE` flag | Shared Kernel | Temporary | PR-001 | PR-002C (cutover) |

---

## 6. Construction

### 6.1 Constructor Injection

```typescript
export class DraftOperationsShim {
  constructor(
    private readonly service: DraftService,
    private readonly legacy: LegacyDraftOperations,
  ) {}
}
```

Dependencies are injected at construction time. The shim does not create its own dependencies.

### 6.2 Dependency Sources

| Dependency | Source | Notes |
|-----------|--------|-------|
| `DraftService` | Created in `useMemo` in ConsultationContext | Passed to shim |
| `LegacyDraftOperations` | Created in `useMemo` in ConsultationContext | Wraps existing hooks + localStorage |
| `isFeatureEnabled` | Imported inside shim implementation | ONLY the shim imports feature flags |

### 6.3 Why ConsultationContext Doesn't See the Flag

```typescript
// ConsultationContext — completely unaware of feature flags
const draftOps = useMemo(() => 
  new DraftOperationsShim(service, legacy),
  [service, legacy]
);

await draftOps.saveDraft(...); // No flag check here
```

The flag check is encapsulated inside the shim:
```typescript
// Inside DraftOperationsShim only
async saveDraft(...) {
  if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
    return this.service.saveDraft(...);
  }
  return this.legacy.saveDraft(...);
}
```

This means:
- ConsultationContext never imports `feature-flags`
- Adding/removing flags doesn't touch ConsultationContext
- Flag logic is testable in isolation
- Flag removal requires deleting one import (inside shim)

---

## 7. Dependency Rules

### 7.1 Allowed Dependencies

| Component | May Depend On |
|-----------|--------------|
| `LegacyDraftOperations` | ConsultationContext internals, React Query hooks, localStorage, API clients |
| `DraftOperationsShim` | DraftService, LegacyDraftOperations, isFeatureEnabled |
| `ConsultationContext` | DraftOperationsShim ONLY |
| `Application Services` | Ports, Shared Kernel, Application DTOs |

### 7.2 Forbidden Dependencies

| Component | Must Not Depend On |
|-----------|-------------------|
| `LegacyDraftOperations` | Application Services (it IS the old logic) |
| `DraftOperationsShim` | React, JSX, UI components |
| `ConsultationContext` | Feature flags, Application Services directly |

---

## 8. Testing

### 8.1 Shim Tests

```typescript
describe('DraftOperationsShim', () => {
  it('routes to service when flag is enabled', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);
    const result = await shim.saveDraft(...);
    expect(service.saveDraft).toHaveBeenCalled();
    expect(legacy.saveDraft).not.toHaveBeenCalled();
  });

  it('routes to legacy when flag is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(false);
    const result = await shim.saveDraft(...);
    expect(legacy.saveDraft).toHaveBeenCalled();
    expect(service.saveDraft).not.toHaveBeenCalled();
  });
});
```

### 8.2 Behavioral Parity Tests

Run with flag OFF and ON, verify identical outputs:
```typescript
describe('DraftService behavioral parity', () => {
  const scenarios = [
    { name: 'save empty notes', notes: {} },
    { name: 'save with outcome', notes: {...}, outcomeType: 'PROCEDURE_RECOMMENDED' },
    { name: 'version conflict', mockError: 'updated by another session' },
    // ... 10+ scenarios
  ];

  scenarios.forEach(scenario => {
    it(scenario.name, async () => {
      // Test with flag OFF (legacy)
      vi.mocked(isFeatureEnabled).mockReturnValue(false);
      const legacyResult = await shim.saveDraft(...);

      // Test with flag ON (service)
      vi.mocked(isFeatureEnabled).mockReturnValue(true);
      const serviceResult = await shim.saveDraft(...);

      // Compare
      expect(serviceResult).toMatchDraftResult(legacyResult);
    });
  });
});
```

---

## 9. Removal Checklist

After cutover, verify:

- [ ] `LegacyDraftOperations.ts` deleted
- [ ] `DraftOperationsShim.ts` deleted
- [ ] `USE_DRAFT_SERVICE` flag removed from `feature-flags.ts`
- [ ] ConsultationContext imports updated (no shim import)
- [ ] ConsultationContext calls DraftService directly or via SessionProvider
- [ ] No `isFeatureEnabled` calls in ConsultationContext
- [ ] No `localStorage` calls in ConsultationContext for drafts
- [ ] ConsultationContext line count < pre-extraction count
- [ ] All tests pass without legacy path
- [ ] No commented-out legacy code

---

## 10. Error Handling

### 10.1 Shim Error Propagation

The shim must not swallow errors. Both paths must propagate errors identically:

```typescript
async saveDraft(...): Promise<SaveDraftResult> {
  if (isFeatureEnabled('USE_DRAFT_SERVICE')) {
    return this.service.saveDraft(...); // Propagates SaveDraftResult
  }
  try {
    return await this.legacy.saveDraft(...); // Legacy returns Promise<void>
  } catch (error) {
    return makeFailure(ClinicalErrorCode.DRAFT_SAVE_FAILED, error.message);
  }
}
```

### 10.2 Legacy Path Normalization

The legacy path may return different types than the new service. The shim normalizes them:

```typescript
// New service returns SaveDraftResult
// Legacy path returns Promise<void> or throws
// Shim normalizes both to SaveDraftResult
```

---

## 11. Future-Proofing

### 11.1 Adding a Third Implementation

If a third draft implementation is ever needed (e.g., cloud sync):

```typescript
async saveDraft(...) {
  const impl = this.selectImplementation(); // flag, config, runtime detection
  return impl.saveDraft(...);
}
```

The shim pattern supports N implementations. The interface contract ensures all implementations are interchangeable.

### 11.2 Removing the Shim After Cutover

After all consumers have migrated and the legacy path is deleted:

```typescript
// Before (with shim):
const draftOps = useMemo(() => new DraftOperationsShim(...), [...]);
await draftOps.saveDraft(...);

// After (shim deleted):
const draftService = useMemo(() => new DraftService(...), [...]);
await draftService.saveDraft(...);
```

No feature flag, no shim, no legacy code. Clean.

---

## 12. Comparison with DraftService Implementation

| Aspect | DraftService Actual | Shim-First Pattern |
|--------|---------------------|-------------------|
| Flag location | 4 scattered in ConsultationContext | 1 inside shim |
| Legacy code location | `else` branches in ConsultationContext | `LegacyDraftOperations` class |
| ConsultationContext lines | 1019 (+15) | ~810 (-210 after cutover) |
| Removal process | Edit 4 code paths to remove flags | Delete 3 files |
| Rollback safety | Risk of missed flag check | Single shim = single rollback point |
| Duplication | Logic duplicated in context + service | Logic in service + frozen legacy class |
| Testability | Must test both paths in context | Test shim in isolation |
