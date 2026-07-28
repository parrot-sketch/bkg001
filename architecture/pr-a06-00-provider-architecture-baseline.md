# PR-A06-00 — Provider Architecture Baseline Certification

## Purpose

Certify that the Presentation layer is ready for systematic provider extraction following the completion of PR-A04 (Workflow modernization) and PR-A05 (Session modernization).

This certification does not perform extraction. It verifies that the remaining Presentation concerns can be decomposed into focused, independent providers without introducing coupling or violating architectural boundaries.

---

## Current State

ConsultationContext (754 lines) currently owns:

| Concern | Lines | Description |
|---------|-------|-------------|
| Session Shim Delegation | ~150 | Thin wrappers routing to SessionOperationsShim |
| Notes Form State | ~80 | `notes`, `outcomeType`, `patientDecision`, `updateNotes`, `setOutcome` |
| Dialog State | ~40 | `showCompleteDialog`, `showStartDialog`, `openCompleteDialog`, `closeCompleteDialog` |
| Save/Notes Relay | ~90 | `saveDraft`, `saveNotes`, auto-save debounce, completed-consultation save path |
| Queue Display | ~40 | `waitingQueue`, `loadWaitingQueue`, `refetchQueue` |
| Computed State | ~20 | `isActive`, `isReadOnly`, `canSave`, `canComplete` |
| Infrastructure Setup | ~60 | WorkflowCoordinator, SessionService, DraftService, adapter instantiation |
| Effects | ~50 | Auto-save, heartbeat, initial load, beforeunload |

---

## Certification Criteria

### 1. Is ConsultationContext now purely presentation orchestration?

**PASS with decomposition required**

ConsultationContext contains no session lifecycle orchestration, no workflow mutations, no draft persistence, and no business rules. All session concerns delegate to `SessionService` via `SessionOperationsShim`.

However, ConsultationContext still mixes multiple presentation concerns:
- Notes editing
- Dialog state
- Queue display
- Save/UI relay
- Timer display
- Billing display

These are all presentation-layer concerns, but they are not yet decomposed into focused providers. The context is "presentation orchestration" but not "pure" — it is a monolith of UI state.

### 2. Which remaining responsibilities belong to which provider?

**PASS — Mapping established**

| Provider | Responsibilities | Source Context Properties |
|----------|------------------|---------------------------|
| **DocumentationProvider** | Notes form state, outcome/decision state, note editing, save notes logic, auto-save debounce, completed-consultation save path | `notes`, `outcomeType`, `patientDecision`, `updateNotes`, `setOutcome`, `setPatientDecision`, `saveNotes`, auto-save effect |
| **PatientContextProvider** | Patient display, vitals display, appointment display, consultation display | `appointment`, `patient`, `vitals`, `consultation`, `doctorId` |
| **QueueProvider** | Queue display, queue filtering, queue refresh, patient switching UI | `waitingQueue`, `loadWaitingQueue`, `refetchQueue`, `isQueueRefetching` |
| **TimerProvider** | Consultation elapsed time, slot remaining time, timer warnings | `useConsultationTimer` hook (currently in `ConsultationSessionHeader`) |
| **BillingProvider** | Billing display in completion dialog, billing summary | `useAppointmentBilling` in `CompleteConsultationDialog` |
| **DialogProvider** | Dialog visibility flags, dialog open/close actions | `showCompleteDialog`, `showStartDialog`, `openCompleteDialog`, `closeCompleteDialog`, `closeStartDialog` |
| **SessionProvider** | Session lifecycle delegation, session state, session actions | `sessionShim`, `startConsultation`, `completeConsultation`, `switchToPatient`, `loadAppointment` |

### 3. Are there any remaining hidden business rules?

**PASS — All remaining logic is presentation-layer**

Identified presentation-layer rules (acceptable at UI boundary):

| Rule | Location | Nature | Verdict |
|------|----------|--------|---------|
| `setOutcome` auto-sets `patientDecision = YES` when `PROCEDURE_RECOMMENDED` | ConsultationContext | UI convenience rule | ✅ Acceptable — belongs in DocumentationProvider |
| `saveNotes` routes between completed-consultation save and draft save based on `isCompleted` | ConsultationContext | UI routing decision | ✅ Acceptable — belongs in DocumentationProvider |
| `canComplete = isActive && !state.isSaving` | ConsultationContext | Computed presentation state | ✅ Acceptable — belongs in SessionProvider or DocumentationProvider |
| `isActive` / `isReadOnly` derived from appointment/consultation status | ConsultationContext | Computed presentation state | ✅ Acceptable — belongs in PatientContextProvider or SessionProvider |
| Queue priority: `IN_CONSULTATION` first, then by check-in time | ConsultationQueuePanel | Display sorting | ✅ Acceptable — belongs in QueueProvider |
| Vitals warning thresholds (temp <36 or >38, BP systolic <90 or diastolic >140, SpO2 <95) | PatientInfoSidebar | Display warnings | ✅ Acceptable — belongs in PatientContextProvider |

No hidden domain business rules remain in the Presentation layer. All domain rules are in Domain or Application layers.

### 4. Are provider boundaries mutually exclusive?

**PASS**

Each proposed provider owns a distinct, non-overlapping concern:

| Provider | State | Actions | Dependencies |
|----------|-------|---------|--------------|
| **DocumentationProvider** | `notes`, `outcomeType`, `patientDecision`, `autoSaveStatus`, `isSaving` | `updateNotes`, `setOutcome`, `setPatientDecision`, `saveNotes` | DraftService, SessionService (for completion) |
| **PatientContextProvider** | `appointment`, `patient`, `vitals`, `consultation`, `doctorId` | None (read-only) | SessionService (via shim for loading) |
| **QueueProvider** | `waitingQueue`, `queueLoaded`, `isQueueRefetching` | `loadWaitingQueue`, `switchToPatient` | SessionService, QueueApi |
| **TimerProvider** | `elapsed`, `timeInfo`, `remainingDisplay` | None (derived) | None (pure computation from `startedAt`) |
| **BillingProvider** | `existingBilling`, `billingTotal`, `billingDiscount`, `billingStatus` | None (read-only) | BillingApi |
| **DialogProvider** | `showCompleteDialog`, `showStartDialog` | `openCompleteDialog`, `closeCompleteDialog`, `closeStartDialog` | WorkflowCoordinator (for dialog-state transitions) |
| **SessionProvider** | `isLoading`, `workflow` | `startConsultation`, `completeConsultation`, `switchToPatient`, `loadAppointment` | SessionService, SessionOperationsShim |

No state is owned by more than one provider. No action logically belongs to more than one provider.

### 5. Can providers be extracted independently without creating new coupling?

**PASS with dependency ordering**

All providers can be extracted independently, with the following natural ordering constraints:

| Provider | Can Extract Alone? | Dependencies on Other Providers |
|----------|-------------------|-------------------------------|
| **DocumentationProvider** | ✅ Yes | None (but SessionProvider should exist for `saveNotes` completed path) |
| **PatientContextProvider** | ✅ Yes | None (but SessionProvider should exist for data loading) |
| **QueueProvider** | ✅ Yes | Depends on SessionProvider for `switchToPatient` |
| **TimerProvider** | ✅ Yes | None (pure computation from props) |
| **BillingProvider** | ✅ Yes | None (read-only, self-contained) |
| **DialogProvider** | ✅ Yes | None (UI state only) |
| **SessionProvider** | ✅ Yes | Depends on SessionService, DraftService, WorkflowCoordinator |

Key insight: No provider depends on another provider's internal state. Cross-provider communication happens through:
1. **Props** (e.g., `BillingProvider` receives `appointmentId` from `PatientContextProvider`)
2. **SessionService** (e.g., `QueueProvider` calls `sessionShim.switchSession()`)
3. **Shared context value** (e.g., `DialogProvider` exposes `openCompleteDialog` for `DocumentationProvider` to call)

This means providers can be extracted in any order without creating circular dependencies.

---

## Provider Extraction Order

### Recommended Sequence

| Phase | Provider | Rationale | Expected Impact |
|-------|----------|-----------|-----------------|
| **1** | **DocumentationProvider** | Largest remaining concern (~200 lines of state + effects). Extracting notes, outcomes, decisions, and auto-save immediately reduces ConsultationContext by ~30%. | ConsultationContext: 754 → ~550 lines |
| **2** | **PatientContextProvider** | Extracts appointment, patient, vitals, consultation display state. Reduces context by ~20%. | ConsultationContext: ~550 → ~350 lines |
| **3** | **DialogProvider** | Small, self-contained. Extracts dialog flags and open/close actions. | ConsultationContext: ~350 → ~280 lines |
| **4** | **QueueProvider** | Extracts queue display and switching. Depends on SessionProvider existing first. | ConsultationContext: ~280 → ~180 lines |
| **5** | **TimerProvider** | Extracts consultation timer logic from header component. Minimal context impact. | ConsultationContext: ~180 → ~160 lines |
| **6** | **BillingProvider** | Extracts billing display from completion dialog. Self-contained. | ConsultationContext: ~160 → ~120 lines |
| **7** | **SessionProvider** | Final extraction — session shim delegation and session actions. This is the orchestrator that other providers call into. | ConsultationContext: ~120 → ~80 lines |

### Final Expected State

After all extractions, ConsultationContext should be approximately **80-120 lines**, containing only:
- Provider composition
- Context value assembly
- Hook export

---

## Architecture Validation

### Layer Integrity

| Layer | Current Status | Post-Extraction Status |
|-------|---------------|------------------------|
| Shared Kernel | ✅ Certified | No change |
| Domain | ✅ Certified | No change |
| Application | ✅ Certified | No change |
| Infrastructure | ✅ Certified | No change |
| Presentation | ⚠️ Monolithic but correct | ✅ Decomposed into focused providers |

### State Ownership

| State | Current Owner | Post-Extraction Owner |
|-------|---------------|----------------------|
| Workflow state | WorkflowCoordinator | No change |
| Session state | SessionService | No change |
| Draft state | DraftService | No change |
| Notes state | ConsultationContext | DocumentationProvider |
| Patient display | ConsultationContext | PatientContextProvider |
| Queue display | ConsultationContext | QueueProvider |
| Dialog state | ConsultationContext | DialogProvider |
| Timer display | ConsultationSessionHeader | TimerProvider |
| Billing display | CompleteConsultationDialog | BillingProvider |

### Dependency Direction

| Source | Target | Direction |
|--------|--------|-----------|
| DocumentationProvider | SessionService | Presentation → Application ✅ |
| QueueProvider | SessionService | Presentation → Application ✅ |
| DialogProvider | WorkflowCoordinator | Presentation → Application ✅ |
| TimerProvider | None | Presentation (pure) ✅ |
| BillingProvider | BillingApi | Presentation → Port ✅ |

No provider imports from Domain or Shared Kernel directly. All cross-layer communication flows through Application Services.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Provider coupling during extraction | LOW | MEDIUM | Strict ownership mapping; no provider imports another provider's state |
| Regression in existing behavior | LOW | HIGH | Extract one provider at a time; verify with existing 1,697 tests |
| Context value fragmentation | MEDIUM | LOW | Maintain `useConsultationContext` hook that composes all providers |
| Performance regression from extra context providers | VERY LOW | LOW | React context selectors prevent unnecessary re-renders |
| Circular dependencies between providers | VERY LOW | HIGH | Dependency graph review after each extraction |

---

## Certification Decision

**CERTIFIED — Presentation layer is ready for systematic provider extraction.**

### Conditions for Extraction

Each provider extraction PR must:
1. Extract exactly one concern from ConsultationContext
2. Maintain backward-compatible `useConsultationContext` hook
3. Pass all existing 1,697 tests without modification
4. Add tests for the new provider
5. Verify no new coupling between providers
6. Update architecture documentation

### Prohibited Actions During Extraction

- Do not combine multiple concerns in one provider
- Do not extract business logic into providers
- Do not create provider-to-provider state sharing
- Do not modify SessionService, DraftService, or WorkflowCoordinator
- Do not bypass SessionOperationsShim

---

## Conclusion

PR-A05 completed the architectural foundation. The remaining work is systematic Presentation layer decomposition.

The provider extraction sequence is clear, the boundaries are mutually exclusive, and the dependencies are acyclic. Each extraction can be performed independently, tested incrementally, and rolled back without affecting lower layers.

**Recommended next action: Begin PR-A06-01 — DocumentationProvider extraction.**
