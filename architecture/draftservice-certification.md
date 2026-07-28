# DraftService Architectural Certification

## 1. DraftService Certification

### Overall Readiness Assessment

The DraftService design is **Certified with Minor Improvements**.

The service has a well-defined, single responsibility (draft lifecycle management), clear dependencies (`ConsultationApi`, `DraftStorage`, Shared Kernel), and complete workflow coverage for the Phase 2 scope. The extraction from `ConsultationContext` is straightforward and low-risk.

Two minor issues should be addressed before implementation:
1. **Callback-based error notification** in the proposed API (`onSaveSuccess` / `onSaveError`) should be replaced with return-value-based error propagation.
2. **`NotificationService` dependency** is premature — no such service exists yet. DraftService must not depend on a future service.

No blocking issues exist. The design is ready for implementation.

---

## 2. Responsibility Matrix

### DraftService Owns

| Responsibility | Source in ConsultationContext | Evidence |
|---------------|------------------------------|----------|
| Auto-save debouncing (3s) | Lines 819-845 (`useEffect` with `setTimeout`) | `application-service-catalog.md` item 1 |
| Manual save trigger | Lines 590-629 (`saveDraft`) | `application-service-catalog.md` item 2 |
| Version conflict detection | `useSaveConsultationDraft.ts` lines 32-35, 82-85 | `application-service-catalog.md` item 3 |
| localStorage backup via `DraftStorage` | Lines 611-617, 675-681 (`localStorage.setItem`) | `application-service-catalog.md` item 4 |
| Draft restoration with timestamp comparison | Lines 476-497 (draft restoration logic) | `application-service-catalog.md` item 5 |
| Draft cleanup on completion | Line 745 (`localStorage.removeItem`) | `application-service-catalog.md` item 6 |

### DraftService Must Never Own

| Responsibility | Owner | Rationale |
|---------------|--------|-----------|
| `notes`, `outcomeType`, `patientDecision` state | DocumentationProvider / ConsultationContext | These are domain state, not draft state. DraftService operates on them but does not own them. |
| Workflow state (`ACTIVE`, `COMPLETING`, etc.) | SessionProvider / SessionService | Draft lifecycle is triggered by session state but does not control it. |
| Query cache invalidation | SessionService / Use Cases | Cache invalidation is a cross-cutting concern owned by the orchestrating use case, not the draft service. |
| Toast/notification display | NotificationService (future) / Presentation Layer | DraftService reports results; the caller decides how to notify the user. |
| Navigation (`router.push`) | Presentation Layer / SessionProvider | DraftService must never know about routes. |
| React Query mutations | Use Cases / Presentation Layer | DraftService calls `ConsultationApi.saveConsultationDraft` through the port; it does not own the mutation wrapper. |
| UI state (`saveStatus`, `isSaving`) | DocumentationProvider | These are presentation concerns. DraftService can return a status enum; the provider maps it to UI state. |

### State Ownership Verdict

DraftService owns exactly **4 pieces of internal state**:
- `saveTimer`: debounce timer handle
- `lastSavedAt`: timestamp of last successful save
- `isDirty`: whether notes have unsaved changes (derived from inputs, not stored)
- `conflictCount`: consecutive version conflicts

It does **not** own any React state, provider state, or UI state. This is correct for an Application Service.

---

## 3. Dependency Validation

### Required Dependencies

| Dependency | Type | Evidence | Status |
|-----------|------|----------|--------|
| `ConsultationApi` | Port | `application-service-catalog.md` line 43-46 | ✅ Already implemented (`domain/interfaces/services/ConsultationApi.ts`) |
| `DraftStorage` | Port | `application-service-catalog.md` line 44 | ✅ Already implemented (`shared-kernel/interfaces/draft-storage.ts`) |
| `LocalStorageDraftStorage` | Adapter | `lib/storage/local-storage-draft.ts` | ✅ Already implemented |
| Shared Kernel (`ClinicalErrorCode`, `DraftRecord`) | Types | `shared-kernel/errors/codes.ts`, `shared-kernel/interfaces/draft-storage.ts` | ✅ Already implemented |

### Forbidden Dependencies (Must Not Import)

| Layer | Evidence | Status |
|-------|----------|--------|
| React / JSX | ADR-001: Application Layer must not import Presentation Layer | ✅ No React imports in design |
| Provider contexts | ADR-002: Providers must not import other providers | ✅ No provider imports in design |
| `NotificationService` | Does not exist yet; premature coupling | ❌ **Issue:** Proposed API includes `private notificationService: NotificationService` |
| `apiClient` / HTTP clients | ADR-001: Must use ports, not concrete clients | ✅ Uses `ConsultationApi` port |
| Domain entities | Application Layer may depend on Domain | ✅ Permitted — but DraftService should use DTOs, not entities |

### Dependency Graph

```
DraftService
    ├── ConsultationApi (port) ✅
    ├── DraftStorage (port) ✅
    ├── Shared Kernel (ClinicalErrorCode, DraftRecord) ✅
    └── Application DTOs (SaveConsultationDraftDto, ConsultationResponseDto) ✅
```

**Verdict:** Clean. No circular dependencies. No layer violations. One correction needed: remove `NotificationService` from constructor.

---

## 4. Public API Review

### Proposed Methods

| Method | Assessment | Recommendation |
|--------|-----------|----------------|
| `autoSave(appointmentId, notes, outcomeType, patientDecision): Promise<void>` | ✅ Correct name, correct signature | Keep |
| `manualSave(appointmentId, notes, outcomeType, patientDecision): Promise<void>` | ✅ Correct — mirrors auto-save but immediate | Keep |
| `restoreDraft(appointmentId, serverUpdatedAt): Promise<DraftRecord<StructuredNotes> \| null>` | ✅ Correct — returns null when no draft or draft is older | Keep |
| `clearDraft(appointmentId): Promise<void>` | ✅ Correct — idempotent cleanup | Keep |
| `hasNewerDraft(appointmentId, serverUpdatedAt): Promise<boolean>` | ⚠️ Redundant with `restoreDraft` | **Remove.** `restoreDraft` already compares timestamps and returns null when draft is not newer. Having both creates dual source-of-truth risk. |
| `onSaveSuccess(callback: () => void): void` | ❌ Anti-pattern | **Remove.** Callbacks create implicit coupling and are un-testable. Return `Promise<void>` and let callers chain `.then()`. |
| `onSaveError(callback: (error: ClinicalError) => void): void` | ❌ Anti-pattern | **Remove.** Same rationale. Throw or return a result type that includes error information. |

### Error Handling Review

Current design returns `Promise<void>` for save methods. This is insufficient because:
1. Callers cannot distinguish between "save succeeded" and "save failed silently"
2. Version conflicts are swallowed inside the service
3. The Presentation Layer cannot show appropriate UI feedback

**Recommendation:** Return a discriminated union:

```typescript
type SaveDraftResult =
  | { success: true; version: string }
  | { success: false; error: ClinicalError };
```

Or throw on error and let callers catch. Given the codebase uses `ConsultationOutcome<T>` pattern elsewhere, returning a result type is more consistent.

### Return Type Consistency

ConsultationContext currently:
- Dispatches `SET_AUTO_SAVE_STATUS` ('idle' | 'saving' | 'saved' | 'error')
- Dispatches `SET_DIRTY`
- Calls `toast.success` / `toast.error`

DraftService should **return** status information. The Presentation Layer (DocumentationProvider) should dispatch state and show toasts. This preserves separation of concerns.

### Parameter Design

`autoSave` and `manualSave` both accept `(appointmentId, notes, outcomeType, patientDecision)`. This is correct — the service must be able to save the complete draft payload. The only question is whether `outcomeType` and `patientDecision` belong in the draft payload or are separate concerns.

**Evidence:** `saveDraftMutation.mutateAsync` in ConsultationContext lines 597-606 and 661-670 includes all three fields in the same payload. The backend expects them together. **Verdict: Keep combined.**

---

## 5. Migration Plan

### What Moves Out of ConsultationContext

| Lines | Code | Destination |
|-------|------|-------------|
| 590-629 | `saveDraft` function | DraftService.manualSave |
| 631-693 | `saveNotes` function | DraftService.manualSave |
| 476-497 | Draft restoration logic | DraftService.restoreDraft |
| 611-617, 675-681 | `localStorage.setItem` calls | DraftService (via DraftStorage) |
| 745 | `localStorage.removeItem` on completion | DraftService.clearDraft |
| 819-845 | Auto-save `useEffect` | DraftService.autoSave (internal timer) |
| 967-984 | `generateFullText` helper | Shared Kernel utility or DraftService |
| 986-1004 | `parseLegacyNotes` helper | DraftService or future migration utility |
| (entire file) | `useSaveConsultationDraft.ts` hook | Fully superseded by DraftService |
| (entire file) | `useDraftStorage.ts` hook | Fully superseded by DraftService |

### What Remains in ConsultationContext

| Lines | Reason |
|-------|--------|
| 138-276 | Reducer — will move to SessionService later |
| 282-311 | Context value interface — will decompose as providers are extracted |
| 319-332 | Provider props and initialization — SessionProvider territory |
| 334-351 | Consultation history effect — PatientContextProvider territory |
| 353-354 | Auto-save timeout ref — DraftService territory, but ref itself stays until DraftService extraction |
| 356-377 | Queue lazy-loading — QueueProvider territory |
| 379-390 | Computed properties — split among providers |
| 394-534 | `loadAppointment` — SessionService territory |
| 536-584 | `startConsultation` — SessionService territory |
| 586-588 | `closeStartDialog` — SessionProvider territory |
| 695-723 | `updateNotes`, `setOutcome`, `setPatientDecision`, dialog management — DocumentationProvider / SessionProvider territory |
| 725-810 | `completeConsultation`, `switchToPatient`, `goToSurgeryPlanning` — SessionService territory |
| 847-870 | Heartbeat — SessionService territory |
| 872-877 | Initial appointment load — SessionProvider territory |
| 879-890 | beforeunload — SessionService territory |
| 894-961 | Context value memoization + provider render — shim layer |
| 955-961 | `useConsultationContext` hook — convenience hook |

### Expected Complexity Reduction

| Metric | Before | After DraftService Only |
|--------|--------|------------------------|
| ConsultationContext lines | 1004 | ~850 |
| Draft-related lines in context | 210 | 0 |
| Hooks superseded | 2 (`useSaveConsultationDraft`, `useDraftStorage`) | 2 |
| Direct localStorage access in context | 4 locations | 0 |
| Duplicated save logic | 2 functions (`saveDraft`, `saveNotes`) | 1 service |

**Note:** The ~850-line remaining ConsultationContext is expected. SessionService, QueueService, PatientContextProvider, and other providers will extract their responsibilities in subsequent PRs. The burndown plan shows zero lines only after all providers are extracted.

---

## 6. Test Strategy

### Unit Tests (Required)

Every public method must have unit tests using mocks only:

| Method | Test Scenarios |
|--------|---------------|
| `autoSave` | Debounce timing (3s); cancels previous timer; calls `ConsultationApi.saveConsultationDraft`; calls `DraftStorage.saveDraft`; handles errors; does not save when not dirty |
| `manualSave` | Immediate save; calls `ConsultationApi.saveConsultationDraft`; calls `DraftStorage.saveDraft`; handles version conflict; handles network error |
| `restoreDraft` | Returns draft when newer than server; returns null when older; returns null when missing; returns null when corrupt; removes corrupt draft |
| `clearDraft` | Removes draft from `DraftStorage`; idempotent (no error if missing) |
| `hasNewerDraft` | (If kept) Returns true/false correctly; handles missing draft; handles invalid timestamp |

**Mocking requirements:**
- `ConsultationApi` — mocked interface
- `DraftStorage` — mocked interface
- `setTimeout` / `clearTimeout` — use fake timers (`vi.useFakeTimers()`)
- No React, no Providers, no Browser APIs, no HTTP

### Integration Tests (Required)

| Scenario | Evidence |
|----------|----------|
| DraftService → ConsultationApi → mock backend | Verify payload shape matches `SaveConsultationDraftDto` |
| DraftService → DraftStorage → mock storage | Verify localStorage key format `consultation-draft-{appointmentId}` |
| Auto-save + manual save conflict | Verify only one save occurs when manual save triggers during debounce window |

### Compatibility Tests (Required)

| Scenario | Evidence |
|----------|----------|
| Existing `localStorage` format preserved | `LocalStorageDraftStorage` guarantees format `{ structured, timestamp }` matches ConsultationContext exactly |
| Existing draft keys readable | `LocalStorageDraftStorage` uses prefix `consultation-draft-` matching current code |
| `generateFullText` output unchanged | Verify extracted utility produces identical output |

### Regression Tests (Required)

| Scenario | Current Behavior | Expected After |
|----------|-----------------|----------------|
| Auto-save triggers 3s after last keystroke | ✅ | ✅ |
| Manual save triggers immediately | ✅ | ✅ |
| Draft restored when newer than server | ✅ | ✅ |
| Draft discarded when older than server | ✅ | ✅ |
| Draft cleared on completion | ✅ | ✅ |
| Version conflict shows error toast | ✅ (toast in context) | ✅ (error returned to caller) |
| Corrupt draft removed silently | ✅ | ✅ |
| localStorage quota error handled | ✅ | ✅ |

---

## 7. Future Compatibility

### DraftStorage Abstraction

DraftService depends on `DraftStorage` interface, not `localStorage`. This means:

| Future Storage | Change Required |
|---------------|----------------|
| IndexedDB | Implement `DraftStorage` with IndexedDB backend. Zero changes to DraftService. |
| Cloud sync | Implement `DraftStorage` with cloud backend. Zero changes to DraftService. |
| Encrypted storage | Implement `DraftStorage` with encryption layer. Zero changes to DraftService. |

### Offline Mode

DraftService is offline-compatible by design:
- `autoSave` / `manualSave` will queue or fail gracefully when `ConsultationApi` is unreachable
- `DraftStorage` continues to work without network
- `restoreDraft` works entirely offline

### Multi-Device Sync

Requires:
- A new `DraftStorage` implementation that syncs across devices
- Conflict detection at the cloud level (not just timestamp comparison)
- DraftService public interface does not need to change

### CRDT-Based Collaborative Editing

Requires:
- Changes to `ConsultationApi.saveConsultationDraft` to accept CRDT operations
- Changes to notes comparison logic in DraftService
- **Public interface could remain unchanged** if CRDT is handled at the API layer

### AI Documentation Assistance

Requires:
- New Application Service (`AIDocumentationService`) that calls AI APIs
- DraftService would need to accept AI-generated note suggestions
- **Public interface may need a small extension** (e.g., `applyAISuggestions(suggestions)`) but this is a future concern, not a blocker.

---

## 8. Final Verdict

### Certified with Minor Improvements

DraftService is ready to become the first Application Service. Two corrections are recommended before implementation:

1. **Remove callback methods** (`onSaveSuccess`, `onSaveError`). Use return-value-based error propagation instead.
2. **Remove `NotificationService` dependency** from the constructor. DraftService must not depend on a service that does not exist. Toast/notification logic belongs in the Presentation Layer or a future `NotificationService` consumed by providers, not by Application Services.

### Approved Public API (After Corrections)

```typescript
class DraftService {
  constructor(
    private consultationApi: ConsultationApi,
    private draftStorage: DraftStorage<DraftRecord<StructuredNotes>>,
  ) {}

  autoSave(appointmentId: number, notes: StructuredNotes, outcomeType, patientDecision): Promise<SaveDraftResult>
  manualSave(appointmentId: number, notes, outcomeType, patientDecision): Promise<SaveDraftResult>
  restoreDraft(appointmentId: number, serverUpdatedAt: Date): Promise<DraftRecord<StructuredNotes> | null>
  clearDraft(appointmentId: number): Promise<void>
}
```

Where `SaveDraftResult` is:
```typescript
type SaveDraftResult =
  | { success: true; version: string }
  | { success: false; error: ClinicalError };
```

### What Must NOT Change

- The `DraftStorage` interface and `LocalStorageDraftStorage` adapter — both are certified
- The `ConsultationApi` interface and `HttpConsultationApi` adapter — both are certified
- The `ClinicalError` / `ClinicalErrorCode` taxonomy — consistent with error handling pattern
- The `shared-kernel/utils/draft-serialization.ts` helpers — format is stable
- The localStorage key format `consultation-draft-{appointmentId}` — backward compatibility is guaranteed
- The serialization format `{ structured, timestamp }` — backward compatibility is guaranteed

### Architecture Compliance Summary

| Artifact | Compliance |
|----------|-----------|
| **Architecture Baseline v1** | ✅ Single responsibility; clean dependencies |
| **ADR-001** (Frontend Clean Architecture) | ✅ No React/UI imports; depends on ports + Shared Kernel |
| **ADR-002** (Provider Boundaries) | ✅ Not applicable — no providers involved |
| **ADR-003** (State Ownership) | ✅ Owns only draft lifecycle state; no domain state |
| **Layered Architecture** | ✅ Application Layer — depends on Domain interfaces + Infrastructure ports + Shared Kernel |
| **Shared Kernel rules** | ✅ Imports only Shared Kernel types and utilities |
| **Phase 2 Execution Plan** | ✅ Matches Day 1-2 scope and file locations |
| **Rollback Strategy** | ✅ Feature flag `USE_DRAFT_SERVICE`; disabling reverts to ConsultationContext inline logic |
