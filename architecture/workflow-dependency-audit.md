# Workflow Dependency Audit

## Purpose

This document identifies every hidden dependency required to implement the Workflow Engine. No implementation may begin without these dependencies resolved.

## Dependency Inventory

### 1. Shared Kernel Types

| Dependency | Required For | Status | Risk |
|------------|--------------|--------|------|
| `StructuredNotes` | TransitionContext.notes | ✅ Implemented in PR-A02 | None |
| `ConsultationOutcomeType` | TransitionContext.outcomeType | ✅ Exists in domain/enums | None |
| `PatientDecision` | TransitionContext.patientDecision | ✅ Exists in domain/enums | None |
| `ClinicalError` | GuardResult, WorkflowError | ✅ Exists in shared-kernel/errors | None |
| `AppointmentStatus` | Guards G-009, G-010, G-012 | ✅ Exists in domain/enums | None |
| `ConsultationState` | Guards G-008, G-021, G-027, G-044 | ✅ Exists in domain/enums | None |
| `FeatureFlagKey` | USE_WORKFLOW_ENGINE flag | ✅ Exists in shared-kernel/feature-flags.ts | None |

### 2. Domain Layer Interfaces

| Dependency | Required For | Status | Risk |
|------------|--------------|--------|------|
| `ConsultationApi` | TransitionContext.consultation | ✅ Clean after PR-A01 | None |
| `PatientApi` | TransitionContext.patient snapshot | ✅ Clean after PR-A01 | None |
| `DraftStorage` | Draft recovery | ✅ Exists in shared-kernel/interfaces | None |

### 3. Application Layer Services

| Dependency | Required For | Status | Risk |
|------------|--------------|--------|------|
| `DraftService` | DocumentationEngine save/restore | ✅ Implemented | Low — needs `generateFullText` import from Shared Kernel |
| `useSaveConsultationDraft` | Mutation execution | ✅ Exists in hooks | Low — needs refactoring to accept engine commands |
| `useConsultation` | Query execution | ✅ Exists in hooks | Low — read-only after integration |

### 4. Infrastructure Adapters

| Dependency | Required For | Status | Risk |
|------------|--------------|--------|------|
| `HttpConsultationApi` | Appointment/consultation loading | ✅ Exists in lib/api | None |
| `HttpPatientApi` | Patient loading | ✅ Exists in lib/api | None |
| `LocalStorageDraftStorage` | Draft backup/restore | ✅ Exists in lib/storage | Low — currently imported by ConsultationContext (LI-003 violation) |

### 5. React Layer Dependencies

| Dependency | Required For | Status | Risk |
|------------|--------------|--------|------|
| `useQueryClient` | Cache invalidation side effect | ✅ Exists in @tanstack/react-query | None |
| `useRouter` | Navigation side effect | ✅ Exists in next/navigation | None |
| `useToast` / `sonner` | Toast side effect | ✅ Exists in sonner | None |
| `useEffect`, `useCallback`, `useMemo`, `useState` | React hooks | ✅ React is installed | None |

### 6. Test Dependencies

| Dependency | Required For | Status | Risk |
|------------|--------------|--------|------|
| `vitest` | Unit test runner | ✅ Configured | None |
| `@testing-library/react` | Component tests | ✅ Configured | None |
| `fast-check` | Property-based tests | ❌ NOT installed | Medium — must add dependency |
| `@vitest/coverage-v8` | Coverage reporting | ✅ Configured | None |

## Hidden Dependencies

### HD-001: TransitionContext Requires Snapshots

**Issue:** `TransitionContext` requires immutable snapshots of `appointment`, `consultation`, and `notes`. Currently these are mutable objects in reducer state.

**Resolution:** Create snapshot builder functions that extract read-only views from current ConsultationContext state.

**Files Affected:**
- `contexts/ConsultationContext.tsx` — add `buildTransitionContext()` helper
- `domain/workflows/TransitionContext.ts` — define snapshot types

**Risk:** Medium. Snapshot must capture all data needed by guards without missing fields.

### HD-002: Side Effects Need React Context Access

**Issue:** `SideEffect` handlers need access to React Query client, router, and toast. These live in React Context, not in the pure engine.

**Resolution:** Create `SideEffectHandlerContext` that provides React-specific implementations to the engine via dependency injection.

**Files Affected:**
- `contexts/WorkflowEngineProvider.tsx` — new (provides side effect handlers)
- `shared-kernel/types/workflow-events.ts` — define handler interface

**Risk:** Medium. Must ensure handlers are pure functions with no engine dependencies.

### HD-003: DocumentationEngine Needs DraftService Integration

**Issue:** `DocumentationEngine` must call `DraftService.save()` and `DraftService.restore()`, but `DraftService` is an Application Service class, not a pure function.

**Resolution:** Wrap `DraftService` methods in Promise-based side effect handlers that the engine can emit.

**Files Affected:**
- `application/services/DraftService.ts` — no changes, but engine must call it
- `application/workflow/DocumentationEngine.ts` — emits `sideEffect` with DraftService command

**Risk:** Low. DraftService already works; engine just needs to trigger it.

### HD-004: ConsultationContext Must Preserve Legacy Behavior During Transition

**Issue:** During feature-flagged rollout, both old reducer and new engine must coexist. They must not interfere.

**Resolution:** Use a shim pattern:
1. Engine runs on every action
2. If engine succeeds, update both engine state AND reducer state
3. If engine fails, fall back to old reducer logic
4. After cutover, remove reducer paths

**Files Affected:**
- `contexts/ConsultationContext.tsx` — dual-runner during transition
- `contexts/consultationReducer.ts` — preserved until cutover

**Risk:** High. Dual state management is complex. Must ensure no race conditions.

### HD-005: Guard G-042 Requires UI Override

**Issue:** Guard G-042 (NoPendingSave) blocks completion when notes are dirty. But production allows "proceed without saving" after user confirmation.

**Resolution:** Engine must support guard override via `metadata` parameter in `tryTransition()`.

**Files Affected:**
- `application/workflow/WorkflowEngine.ts` — accept metadata overrides
- `contexts/ConsultationContext.tsx` — pass override from completion dialog

**Risk:** Low. Metadata override is already in API design.

### HD-006: Timer/Heartbeat Integration

**Issue:** The engine doesn't own timer intervals. Currently `ConsultationContext` manages heartbeat via `setInterval`.

**Resolution:** Engine emits `startHeartbeat` / `stopHeartbeat` side effects. A `TimerProvider` (future) subscribes and manages intervals.

**Files Affected:**
- `application/workflow/side-effects/heartbeat-handler.ts` — new
- `hooks/consultation/useHeartbeat.ts` — new (future)

**Risk:** Low. Side effect pattern already designed.

### HD-007: Retry Count Tracking

**Issue:** Guard G-069 requires `retryCount` in TransitionContext. Currently retry count is not tracked.

**Resolution:** Add `retryCount` to TransitionContext. Increment on each `RETRY` action. Reset on successful transition.

**Files Affected:**
- `shared-kernel/types/workflow.ts` — add retryCount to TransitionContext
- `application/workflow/WorkflowEngine.ts` — increment/decrement retryCount

**Risk:** Low.

## Missing Files to Create

| File | Purpose | Required By |
|------|---------|-------------|
| `shared-kernel/types/workflow.ts` | SideEffect, GuardResult, TransitionResult types | PR-A04-03 |
| `shared-kernel/types/workflow-events.ts` | WorkflowEvent envelope | PR-A04-03 |
| `domain/workflows/ConsultationWorkflowState.ts` | Consultation state machine | PR-A04-01 |
| `domain/workflows/DocumentationWorkflow.ts` | Documentation state machine | PR-A04-01 |
| `domain/workflows/guards/index.ts` | Guard registry | PR-A04-02 |
| `domain/workflows/guards/load-patient.ts` | LOAD_PATIENT guards | PR-A04-02 |
| `domain/workflows/guards/start-consultation.ts` | START_CONSULTATION guards | PR-A04-02 |
| `domain/workflows/guards/save-draft.ts` | SAVE_DRAFT guards | PR-A04-02 |
| `domain/workflows/guards/complete-consultation.ts` | COMPLETE guards | PR-A04-02 |
| `domain/workflows/guards/switch-patient.ts` | SWITCH_PATIENT guards | PR-A04-02 |
| `domain/workflows/guards/resolve-conflict.ts` | RESOLVE guards | PR-A04-02 |
| `application/workflow/WorkflowEngine.ts` | Consultation engine | PR-A04-04 |
| `application/workflow/DocumentationEngine.ts` | Documentation engine | PR-A04-05 |
| `application/workflow/WorkflowCoordinator.ts` | Orchestrator | PR-A04-06 |
| `application/workflow/WorkflowEngineFactory.ts` | Factory | PR-A04-04 |
| `application/workflow/side-effects/toast-handler.ts` | Toast side effect | PR-A04-08 |
| `application/workflow/side-effects/cache-handler.ts` | Cache invalidation | PR-A04-08 |
| `application/workflow/side-effects/storage-handler.ts` | localStorage | PR-A04-08 |
| `application/workflow/side-effects/heartbeat-handler.ts` | Heartbeat | PR-A04-08 |
| `application/workflow/side-effects/navigation-handler.ts` | Router navigation | PR-A04-08 |
| `contexts/WorkflowEngineContext.tsx` | React context for engine | PR-A04-07 |
| `contexts/WorkflowEngineProvider.tsx` | Provider for engine | PR-A04-07 |
| `hooks/consultation/useWorkflowEngine.ts` | Hook for engine | PR-A04-07 |
| `hooks/consultation/useDocumentationEngine.ts` | Hook for documentation engine | PR-A04-07 |

## Missing Interfaces to Define

| Interface | Purpose | Required By |
|-----------|---------|-------------|
| `WorkflowEngine` | Consultation state machine contract | PR-A04-04 |
| `DocumentationEngine` | Documentation state machine contract | PR-A04-05 |
| `WorkflowEngineFactory` | Creates engines with dependencies | PR-A04-04 |
| `WorkflowCoordinator` | Orchestrates both engines | PR-A04-06 |
| `SideEffectHandler` | Handles side effects in Presentation Layer | PR-A04-08 |
| `TransitionHook` | Lifecycle hooks for states | PR-A04-04 |
| `GuardRegistration` | Custom guard registration | PR-A04-02 |

## Required Feature Flags

| Flag | Purpose | Default | Required By |
|------|---------|---------|-------------|
| `USE_WORKFLOW_ENGINE` | Enable/disable workflow engine | `false` | PR-A04-11 |

## Required Migrations

| Migration | Purpose | Required By |
|-----------|---------|-------------|
| None — no database schema changes | | |

## Summary

**Total new files:** ~25
**Total new interfaces:** 7
**Total modified files:** 3 (ConsultationContext, ConsultationReducer, feature-flags)
**External dependencies to add:** `fast-check` (property-based testing)
**Database migrations:** None
**Feature flags:** 1 (`USE_WORKFLOW_ENGINE`)

**Implementation can proceed.** All required interfaces, adapters, and services exist. The only new dependency is `fast-check` for property-based tests.
