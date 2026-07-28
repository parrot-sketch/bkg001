# Legacy Cleanup Audit Report

## Executive Summary

This audit identifies all migration-era artifacts remaining in the codebase after PR-A06-07 completion. Every artifact is classified with a recommended action.

| Classification | Count | Priority |
|----------------|-------|----------|
| Safe to Delete | 4 | High |
| Requires Migration | 3 | High |
| Keep Permanently | 8 | — |

---

## Phase 1 Findings

### 1.1 Dead Reducers

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `consultationReducer` | `contexts/consultationReducer.ts` | Safe to Delete | Zero imports outside its own file. SessionProvider replaced all reducer usage. | Delete file and all exports |
| `ConsultationProviderState` | `contexts/consultationReducer.ts` | Safe to Delete | Only referenced within dead reducer file. | Delete with reducer |
| `ConsultationAction` union | `contexts/consultationReducer.ts` | Safe to Delete | Only referenced within dead reducer file. | Delete with reducer |

### 1.2 Obsolete Adapters

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `HttpPatientApi` adapter | `lib/api/patient-adapter.ts` | Requires Migration | Imported directly by `SessionProvider.tsx` (line 42). This is a Presentation-layer violation. SessionProvider should receive an injected `PatientApi` via props, not instantiate adapters. | Migrate: inject `PatientApi` into SessionProvider |
| `HttpConsultationApi` adapter | `lib/api/consultation-adapter.ts` | Requires Migration | Imported directly by `SessionProvider.tsx` (line 43). Same violation. | Migrate: inject `ConsultationApi` into SessionProvider |
| `HttpDoctorApi` adapter | `lib/api/doctor-adapter.ts` | Requires Migration | Imported directly by `SessionProvider.tsx` (line 44). Same violation. | Migrate: inject `DoctorApi` into SessionProvider |

**Note:** These adapters themselves are correct implementations of domain ports. The issue is that SessionProvider imports them directly instead of receiving them via dependency injection.

### 1.3 Compatibility Shims (Presentation Layer)

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `SessionOperationsShim` | `application/shims/SessionOperationsShim.ts` | Safe to Delete | Zero imports in Presentation layer. SessionProvider calls SessionService directly. Only referenced by its own test file and shim index. | Delete file and all exports |
| `LegacySessionOperations` | `application/shims/LegacySessionOperations.ts` | Safe to Delete | Zero imports in Presentation layer. Only referenced by SessionOperationsShim and its test. | Delete file and all exports |
| `SessionOperationsShim.test.ts` | `tests/unit/application/shim/SessionOperationsShim.test.ts` | Safe to Delete | Tests dead shim code. | Delete test file |
| `LegacySessionOperations.test.ts` | (no separate test file) | Safe to Delete | N/A | N/A |

### 1.4 Compatibility Shims (Still in Use)

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `ConsultationWorkflowShim` | `application/shims/ConsultationWorkflowShim.ts` | Keep Permanently | Referenced by `WorkflowCoordinatorFactory.ts` and used by `SessionOperationsShim` (which is dead). However, the shim provides a useful abstraction for workflow state transitions. The factory still exports it. | Keep. Consider whether it is still needed after SessionOperationsShim is removed. |
| `WorkflowCoordinatorAdapter` | `application/shims/WorkflowCoordinatorAdapter.ts` | Keep Permanently | Used by `WorkflowCoordinatorFactory.ts` to bridge WorkflowCoordinator to the shim interface. | Keep. Part of certified WorkflowCoordinator pattern. |
| `WorkflowCoordinatorFactory` | `application/orchestrators/WorkflowCoordinatorFactory.ts` | Keep Permanently | Still actively used by SessionProvider to create WorkflowCoordinator instances. | Keep. Certified factory pattern. |

### 1.5 Unused Feature Flags

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `USE_SESSION_SERVICE` | `shared-kernel/feature-flags.ts` | Safe to Delete | Only consumer was `SessionOperationsShim.ts`. SessionProvider no longer checks this flag. No other references in Presentation or Application code. | Remove flag definition and all related conditionals |

### 1.6 Dead Interfaces

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `QueueApi` (noop implementations) | `providers/session/SessionProvider.tsx` | Requires Migration | `createNoopQueueApi()` and `createNoopNotificationService()` and `createNoopAuditService()` are defined inline in SessionProvider. These are implementation details that should be injected. | Migrate: inject noop implementations via props |
| `INotificationService` | `domain/interfaces/services/INotificationService.ts` | Keep Permanently | Still part of the WorkflowCoordinator dependencies contract. Even if not currently implemented, it is a defined port. | Keep. Part of certified WorkflowCoordinator pattern. |
| `IAuditService` | `domain/interfaces/services/IAuditService.ts` | Keep Permanently | Same as above. | Keep. Part of certified WorkflowCoordinator pattern. |

### 1.7 Deprecated Helper Functions

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `parseLegacyNotes` | `shared-kernel/utils/note-serialization.ts` | Keep Permanently | Still imported by SessionProvider and DocumentationProvider for backward compatibility with legacy note formats. | Keep. Active backward compatibility utility. |
| `stripHtml` (in dialogs) | `components/consultation/CompleteConsultationDialog.tsx` | Keep Permanently | Still actively used for UI formatting. | Keep. |

### 1.8 Unused Context Values

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `showCompleteDialog` / `showStartDialog` in reducer | `contexts/consultationReducer.ts` | Safe to Delete | These reducer cases are dead. DialogProvider now owns these. | Delete with reducer |
| `SHOW_COMPLETE_DIALOG` / `SHOW_START_DIALOG` actions | `contexts/consultationReducer.ts` | Safe to Delete | Same as above. | Delete with reducer |
| `autoSaveStatus` in ConsultationContext | `contexts/consultationReducer.ts` | Safe to Delete | DocumentationProvider now owns autoSaveStatus. | Delete with reducer |

### 1.9 Obsolete Barrel Exports

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `application/shims/index.ts` | `application/shims/index.ts` | Requires Migration | Exports dead shims (`SessionOperationsShim`, `LegacySessionOperations`) alongside active ones (`ConsultationWorkflowShim`, `WorkflowCoordinatorAdapter`). | Update: remove dead exports |
| `contexts/index.ts` | `contexts/index.ts` | Keep Permanently | Still exports ConsultationProvider for backward compatibility. | Keep. Compatibility requirement. |

### 1.10 Duplicate Types

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `BillItem` in `hooks/billing/useChargeSheet.ts` | `hooks/billing/useChargeSheet.ts` | Requires Migration | Duplicates `BillItem` interface in `providers/billing/BillingProvider.tsx`. BillingProvider defines its own version. | Migrate: consolidate into single Shared Kernel type |

### 1.11 Dead Providers

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| None found | — | — | All 7 providers are actively imported and used. | — |

### 1.12 Dead Hooks

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `useConsultationTimer` | `hooks/consultation/useConsultationTimer.ts` | Requires Migration | Check if still imported after TimerProvider migration. | Verify: if not imported, delete |
| `useConsultationHeartbeat` | `hooks/useConsultationHeartbeat.ts` | Requires Migration | SessionProvider now owns heartbeat. Check if this hook is still used. | Verify: if not imported, delete |
| `useConsultation` (custom hook) | `hooks/consultation/useConsultation.ts` | Requires Migration | May be redundant with useConsultationContext. | Verify: if not imported, delete |

### 1.13 Server Action in Provider

| Artifact | Path | Classification | Evidence | Recommendation |
|----------|------|----------------|----------|----------------|
| `updateCompletedConsultationNotes` import | `providers/documentation/DocumentationProvider.tsx:35` | Requires Migration | DocumentationProvider imports a Next.js Server Action. Providers should receive save functions via props. | Migrate: inject save function via props |

---

## Summary Table

| # | Artifact | Classification | Priority | Recommended PR |
|---|----------|----------------|----------|----------------|
| 1 | `consultationReducer.ts` | Safe to Delete | High | PR-A07-01 |
| 2 | `patient-adapter.ts` direct import | Requires Migration | High | PR-A07-02 |
| 3 | `consultation-adapter.ts` direct import | Requires Migration | High | PR-A07-02 |
| 4 | `doctor-adapter.ts` direct import | Requires Migration | High | PR-A07-02 |
| 5 | `SessionOperationsShim.ts` | Safe to Delete | High | PR-A07-01 |
| 6 | `LegacySessionOperations.ts` | Safe to Delete | High | PR-A07-01 |
| 7 | `SessionOperationsShim.test.ts` | Safe to Delete | High | PR-A07-01 |
| 8 | `USE_SESSION_SERVICE` feature flag | Safe to Delete | High | PR-A07-01 |
| 9 | `ConsultationWorkflowShim` | Keep Permanently | — | — |
| 10 | `WorkflowCoordinatorAdapter` | Keep Permanently | — | — |
| 11 | `WorkflowCoordinatorFactory` | Keep Permanently | — | — |
| 12 | Noop implementations in SessionProvider | Requires Migration | Medium | PR-A07-02 |
| 13 | `INotificationService` / `IAuditService` | Keep Permanently | — | — |
| 14 | `parseLegacyNotes` | Keep Permanently | — | — |
| 15 | Dead reducer cases (`SHOW_*_DIALOG`) | Safe to Delete | High | PR-A07-01 |
| 16 | Dead context value `autoSaveStatus` | Safe to Delete | High | PR-A07-01 |
| 17 | `application/shims/index.ts` | Requires Migration | Medium | PR-A07-01 |
| 18 | `contexts/index.ts` | Keep Permanently | — | — |
| 19 | Duplicate `BillItem` type | Requires Migration | Medium | PR-A07-03 |
| 20 | Server action in DocumentationProvider | Requires Migration | Medium | PR-A07-02 |
| 21 | `useConsultationTimer` | Requires Verification | Low | PR-A07-04 |
| 22 | `useConsultationHeartbeat` | Requires Verification | Low | PR-A07-04 |
| 23 | `useConsultation` hook | Requires Verification | Low | PR-A07-04 |

---

## Next Steps

1. **PR-A07-01 (Immediate)**: Delete dead shims, dead reducer, dead feature flag, dead test files
2. **PR-A07-02 (High)**: Migrate SessionProvider to injected dependencies (no direct adapter imports)
3. **PR-A07-03 (Medium)**: Consolidate duplicate types
4. **PR-A07-04 (Low)**: Verify and remove dead hooks
