# Phase 1 — Task Breakdown
## Overview
Phase 1 establishes the architectural foundations for all subsequent modernization. No providers are extracted in Phase 1. The focus is on infrastructure adapters, shared kernel, storage abstraction, and test infrastructure. All tasks are independently deployable, testable, and reversible.
## Task Inventory
### P1-001: Configure Frontend Test Infrastructure
**Objective**: Enable Vitest with jsdom environment for frontend component and provider testing.
**Architectural Concern**: Testing infrastructure (cross-cutting)
**Related ADR**: ADR-001 (Frontend Clean Architecture)
**Files Affected**:
- `vitest.config.unit.ts` (add jsdom include)
- `tests/vitest.setup.unit.ts` (add jsdom setup)
- `tests/frontend/` (new directory)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes — test-only change; no production code modified
**Independent Testing**: Yes — run `pnpm test:unit` to verify Vitest picks up new config
**Rollback Strategy**: Revert config changes; test files can remain unused
**Feature Flag Required**: No
**Breaking Changes**: None
**Hidden Dependencies**: None
**Acceptance Criteria**:
- `pnpm test:unit` runs without errors
- jsdom environment available for React component tests
- Test coverage report includes frontend files
### P1-002: Establish Shared Kernel Directory Structure
**Objective**: Create `shared-kernel/` directory with types, constants, schemas, and errors subdirectories.
**Architectural Concern**: Shared Kernel (ADR-001)
**Related ADR**: ADR-001
**Files Affected**:
- `shared-kernel/types/identities.ts` (new)
- `shared-kernel/types/temporal.ts` (new)
- `shared-kernel/constants/brand.ts` (new)
- `shared-kernel/errors/codes.ts` (new)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes — additive new files only
**Independent Testing**: Yes — import types in test file to verify compilation
**Rollback Strategy**: Delete new directory; no existing code references it yet
**Feature Flag Required**: No
**Breaking Changes**: None
**Hidden Dependencies**: None — must agree on location before Phase 1 Week 2
**Acceptance Criteria**:
- `shared-kernel/` directory exists with all subdirectories
- Types compile without errors
- No circular dependencies to existing code
### P1-003: Extract ClinicalErrorCode Enum and ClinicalError Type
**Objective**: Move error codes from scattered string literals to typed enum in Shared Kernel.
**Architectural Concern**: Error handling (ADR-001)
**Related ADR**: ADR-001
**Files Affected**:
- `shared-kernel/errors/codes.ts` (new)
- `shared-kernel/errors/types.ts` (new)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes — additive types only
**Independent Testing**: Yes — unit tests for enum values and error type construction
**Rollback Strategy**: Delete new files; existing code continues using string errors
**Feature Flag Required**: No
**Breaking Changes**: None — additive only
**Hidden Dependencies**: ConsultationContext and API routes currently use string errors; they will continue to do so until Phase 2-3 migration
**Acceptance Criteria**:
- `ClinicalErrorCode` enum covers all current error strings in ConsultationContext
- `ClinicalError` type defined with code, message, and optional details
- Unit tests verify all enum values
### P1-004: Create QUERY_CONFIG with Centralized Cache Policies
**Objective**: Define query key factories and cache policies for all consultation data types.
**Architectural Concern**: React Query cache policies (ADR-001)
**Related ADR**: ADR-001
**Files Affected**:
- `lib/query-config.ts` (new)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes — additive configuration
**Independent Testing**: Yes — unit tests verify key factories produce correct keys
**Rollback Strategy**: Delete file; existing ad-hoc keys continue working
**Feature Flag Required**: No
**Breaking Changes**: None — QUERY_CONFIG is not yet wired into hooks
**Hidden Dependencies**: None
**Acceptance Criteria**:
- `consultationKey(appointmentId)` returns `['consultation', appointmentId]`
- `patientKey(patientId)` returns `['patient', patientId]`
- `queueKey(doctorId)` returns `['queue', doctorId]`
- All policies match documented rationales from `consultation-state-ownership.md`
### P1-005: Create DraftStorage Interface and LocalStorage Implementation
**Objective**: Abstract localStorage draft operations behind DraftStorage interface.
**Architectural Concern**: State ownership (ADR-003)
**Related ADR**: ADR-003
**Files Affected**:
- `infrastructure/storage/DraftStorage.ts` (new interface)
- `infrastructure/storage/LocalStorageDraftStorage.ts` (new implementation)
**Estimated Effort**: 1 day
**Independent Deployment**: Yes — additive interface and implementation
**Independent Testing**: Yes — unit tests with mocked localStorage
**Rollback Strategy**: Delete new files; ConsultationContext continues using direct localStorage calls
**Feature Flag Required**: No
**Breaking Changes**: None
**Hidden Dependencies**: Must preserve exact key format: `consultation-draft-${appointmentId}`; must preserve exact timestamp comparison logic
**Acceptance Criteria**:
- `DraftStorage` interface defines `get`, `set`, `remove`
- `LocalStorageDraftStorage` implements interface with exact same behavior as current ad-hoc calls
- Unit tests verify: save, load, restore, delete, quota-exceeded handling, JSON parse failure handling
- Draft restoration logic (timestamp comparison) produces identical results to current implementation
### P1-006: Create API Adapter Interfaces
**Objective**: Define interfaces for ConsultationApi, PatientApi, QueueApi, BillingApi, NotificationApi, AuditApi.
**Architectural Concern**: Infrastructure layer boundaries (ADR-001)
**Related ADR**: ADR-001
**Files Affected**:
- `infrastructure/api/ConsultationApi.ts` (new interface)
- `infrastructure/api/PatientApi.ts` (new interface)
- `infrastructure/api/QueueApi.ts` (new interface)
- `infrastructure/api/BillingApi.ts` (new interface)
- `infrastructure/api/NotificationApi.ts` (new interface)
- `infrastructure/api/AuditApi.ts` (new interface)
**Estimated Effort**: 1 day
**Independent Deployment**: Yes — interfaces only, no implementations yet
**Independent Testing**: Yes — compile-time verification that interfaces match current API client signatures
**Rollback Strategy**: Delete interface files
**Feature Flag Required**: No
**Breaking Changes**: None
**Hidden Dependencies**: Existing `consultationApi` and `doctorApi` methods must exactly match interface signatures
**Acceptance Criteria**:
- All interfaces compile without errors
- Interface methods match signatures of existing `consultationApi` and relevant `doctorApi` methods
- No implementation yet — interfaces are contracts for Phase 2
### P1-007: Create ConsultationApi Adapter Implementation
**Objective**: Implement ConsultationApi interface by wrapping existing `consultationApi`.
**Architectural Concern**: API adapter (ADR-001)
**Related ADR**: ADR-001
**Files Affected**:
- `infrastructure/api/ConsultationApi.ts` (add implementation)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes — wrapper around existing client
**Independent Testing**: Yes — contract tests verify adapter returns identical responses to `consultationApi`
**Rollback Strategy**: Delete adapter; existing `consultationApi` continues to be used
**Feature Flag Required**: No
**Breaking Changes**: None
**Hidden Dependencies**: Must preserve exact error handling and response shape
**Acceptance Criteria**:
- `ConsultationApi.getConsultation`, `saveDraft`, `getPatientConsultationHistory` produce identical results to `consultationApi`
- Contract tests pass for all 3 methods
### P1-008: Create PatientApi Adapter Implementation
**Objective**: Implement PatientApi interface by wrapping relevant `doctorApi` methods.
**Architectural Concern**: API adapter (ADR-001)
**Related ADR**: ADR-001
**Files Affected**:
- `infrastructure/api/PatientApi.ts` (new implementation)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes
**Independent Testing**: Yes — contract tests
**Rollback Strategy**: Delete adapter
**Feature Flag Required**: No
**Breaking Changes**: None
**Hidden Dependencies**: Must wrap `doctorApi.getPatient`, `doctorApi.getPatientAppointments`, and direct `apiClient.get` for vitals
**Acceptance Criteria**:
- `PatientApi.getPatient`, `getVitals`, `getConsultationHistory` work correctly
- Contract tests pass
### P1-009: Create QueueApi Adapter Implementation
**Objective**: Implement QueueApi interface by wrapping `doctorApi.getTodayAppointments`.
**Architectural Concern**: API adapter (ADR-001)
**Related ADR**: ADR-001
**Files Affected**:
- `infrastructure/api/QueueApi.ts` (new implementation)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes
**Independent Testing**: Yes — contract tests
**Rollback Strategy**: Delete adapter
**Feature Flag Required**: No
**Breaking Changes**: None
**Hidden Dependencies**: None
**Acceptance Criteria**:
- `QueueApi.getTodayAppointments` returns identical results to `doctorApi.getTodayAppointments`
- Contract tests pass
### P1-010: Establish Environment Variable Feature Flag System
**Objective**: Create lightweight feature flag utility using `NEXT_PUBLIC_` environment variables.
**Architectural Concern**: Deployment safety (cross-cutting)
**Related ADR**: ADR-001
**Files Affected**:
- `lib/feature-flags.ts` (new)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes — additive utility
**Independent Testing**: Yes — unit tests with mocked env vars
**Rollback Strategy**: Delete utility; revert to hardcoded behavior
**Feature Flag Required**: Yes — this task creates the flag system
**Breaking Changes**: None
**Hidden Dependencies**: Next.js automatically exposes `NEXT_PUBLIC_*` vars to client; no additional config needed
**Acceptance Criteria**:
- `isFeatureEnabled('USE_NEW_DOCUMENTATION_PROVIDER')` returns boolean from env
- Defaults to `false` (old path) when env var not set
- Type-safe flag names via union type or const object
### P1-011: Create Migration Compatibility Shim Pattern
**Objective**: Document and prototype the backward-compatible shim pattern for provider extraction.
**Architectural Concern**: Migration safety (ADR-002)
**Related ADR**: ADR-002
**Files Affected**:
- `contexts/ConsultationContext.shim.ts` (new prototype, not used in production yet)
- `architecture/phase-1-validation-checklist.md` (reference)
**Estimated Effort**: 0.5 days
**Independent Deployment**: Yes — prototype only
**Independent Testing**: Yes — verify shim produces identical context value to original
**Rollback Strategy**: Delete prototype file
**Feature Flag Required**: No
**Breaking Changes**: None
**Hidden Dependencies**: None — prototype validates pattern for Phase 2-6
**Acceptance Criteria**:
- Shim pattern documented with code example
- Prototype demonstrates value merging from new provider to old context shape
- Prototype passes behavioral parity test against original context for 10 random state snapshots
## Task Dependency Graph
```
P1-001 (Test Infra) ──┐
                     ├──▶ P1-005 (DraftStorage) ──▶ P1-007 (ConsultationApi)
P1-002 (Shared Kernel) ─┤
                     ├──▶ P1-003 (ClinicalError) 
                     ├──▶ P1-004 (QUERY_CONFIG)
                     ├──▶ P1-006 (API Interfaces)
                     │         ├──▶ P1-007 (ConsultationApi)
                     │         ├──▶ P1-008 (PatientApi)
                     │         └──▶ P1-009 (QueueApi)
                     └──▶ P1-010 (Feature Flags) ──▶ P1-011 (Shim Pattern)
```
## Execution Order
Week 1:
1. P1-001: Configure frontend test infrastructure
2. P1-002: Establish shared kernel directory structure
3. P1-003: Extract ClinicalErrorCode enum and type
4. P1-004: Create QUERY_CONFIG
5. P1-010: Create feature flag system

Week 2:
6. P1-005: Create DraftStorage interface and implementation
7. P1-006: Create API adapter interfaces
8. P1-007: Create ConsultationApi adapter
9. P1-008: Create PatientApi adapter
10. P1-009: Create QueueApi adapter
11. P1-011: Create migration compatibility shim pattern
## Duration Summary
| Task | Duration | Cumulative |
|------|----------|------------|
| P1-001 | 0.5 days | 0.5 days |
| P1-002 | 0.5 days | 1.0 day |
| P1-003 | 0.5 days | 1.5 days |
| P1-004 | 0.5 days | 2.0 days |
| P1-005 | 1.0 days | 3.0 days |
| P1-006 | 1.0 days | 4.0 days |
| P1-007 | 0.5 days | 4.5 days |
| P1-008 | 0.5 days | 5.0 days |
| P1-009 | 0.5 days | 5.5 days |
| P1-010 | 0.5 days | 6.0 days |
| P1-011 | 0.5 days | 6.5 days |
**Total Phase 1 Duration: 6.5 days (under 1 sprint)**
