# Phase 1 — Validation Checklist
## Usage
This checklist must be completed for every pull request in Phase 1. No PR merges unless all items pass.
## P1-001: Configure Frontend Test Infrastructure
### Pre-Merge
- [ ] `pnpm test:unit` runs without errors
- [ ] jsdom environment is available
- [ ] Vitest config includes frontend test patterns
- [ ] No existing tests broken
### Code Review
- [ ] Config changes are minimal and documented
- [ ] No production code modified
- [ ] Test setup file does not pollute global scope
### Exit Criteria
- [ ] Frontend tests can be added and run successfully
## P1-002: Establish Shared Kernel Directory Structure
### Pre-Merge
- [ ] `shared-kernel/` directory exists with all subdirectories
- [ ] All files compile without TypeScript errors
- [ ] No imports from other layers (Shared Kernel is leaf dependency)
### Code Review
- [ ] Directory structure matches architecture document
- [ ] Naming conventions consistent with existing codebase
- [ ] No business logic in Shared Kernel
### Exit Criteria
- [ ] Shared Kernel is ready to receive types in subsequent tasks
## P1-003: Extract ClinicalErrorCode Enum and ClinicalError Type
### Pre-Merge
- [ ] `ClinicalErrorCode` enum covers all current error strings in ConsultationContext
- [ ] `ClinicalError` type defined correctly
- [ ] Unit tests pass for all enum values
- [ ] No breaking changes to existing error handling
### Code Review
- [ ] Enum values match existing error messages
- [ ] Type definition is extensible
- [ ] Documentation comments present
### Exit Criteria
- [ ] All current error strings can be replaced with typed codes
- [ ] No runtime behavior change
## P1-004: Create QUERY_CONFIG with Centralized Cache Policies
### Pre-Merge
- [ ] `consultationKey(appointmentId)` returns `['consultation', appointmentId]`
- [ ] `patientKey(patientId)` returns `['patient', patientId]`
- [ ] `queueKey(doctorId)` returns `['queue', doctorId]`
- [ ] All policies match documented rationales
- [ ] Unit tests pass for all key factories
### Code Review
- [ ] Policies match consultation-state-ownership.md specifications
- [ ] No hardcoded keys remain in config
- [ ] Stale times match clinical urgency rationale
### Exit Criteria
- [ ] QUERY_CONFIG is ready for hook migration in Phase 2
## P1-005: Create DraftStorage Interface and LocalStorage Implementation
### Pre-Merge
- [ ] `DraftStorage` interface defines `get`, `set`, `remove`
- [ ] `LocalStorageDraftStorage` preserves exact key format: `consultation-draft-${appointmentId}`
- [ ] Timestamp comparison logic matches current implementation exactly
- [ ] Unit tests pass for: save, load, restore, delete, quota-exceeded, JSON parse failure
- [ ] No direct localStorage calls remain in new code (only in adapter)
### Code Review
- [ ] Interface is minimal and focused
- [ ] Implementation handles all edge cases from current ConsultationContext
- [ ] Tests use mocked localStorage (not real browser storage)
- [ ] No memory leaks (intervals, listeners cleared)
### Exit Criteria
- [ ] DraftStorage can replace direct localStorage calls without behavior change
- [ ] Crash recovery verified in test environment
## P1-006: Create API Adapter Interfaces
### Pre-Merge
- [ ] `ConsultationApi` interface matches existing `consultationApi` methods
- [ ] `PatientApi` interface covers getPatient, getVitals, getConsultationHistory
- [ ] `QueueApi` interface covers getTodayAppointments
- [ ] `BillingApi`, `NotificationApi`, `AuditApi` interfaces defined (stubs acceptable)
- [ ] All interfaces compile without errors
### Code Review
- [ ] Interfaces are minimal (no implementation details)
- [ ] Method signatures exactly match existing API clients
- [ ] Return types use existing DTOs
### Exit Criteria
- [ ] Interfaces are ready for implementation in subsequent tasks
## P1-007: Create ConsultationApi Adapter Implementation
### Pre-Merge
- [ ] Adapter wraps existing `consultationApi` without modification
- [ ] Contract tests verify identical responses for all 3 methods
- [ ] Error handling preserved exactly
- [ ] No changes to `consultationApi` itself
### Code Review
- [ ] Adapter is thin facade (no logic)
- [ ] Error propagation matches original
- [ ] Type safety preserved
### Exit Criteria
- [ ] `ConsultationApi` can replace `consultationApi` in any consumer without behavior change
## P1-008: Create PatientApi Adapter Implementation
### Pre-Merge
- [ ] Adapter wraps `doctorApi.getPatient` and direct `apiClient.get` for vitals
- [ ] Contract tests pass
- [ ] Error handling preserved
- [ ] Vitals response mapping matches current ConsultationContext logic
### Code Review
- [ ] Adapter handles soft-fail for vitals (returns null on error)
- [ ] Patient data mapping matches current shape
### Exit Criteria
- [ ] `PatientApi` can replace direct calls in ConsultationContext without behavior change
## P1-009: Create QueueApi Adapter Implementation
### Pre-Merge
- [ ] Adapter wraps `doctorApi.getTodayAppointments`
- [ ] Contract tests pass
- [ ] Error handling preserved
### Code Review
- [ ] Adapter is thin facade
- [ ] Query parameters preserved
### Exit Criteria
- [ ] `QueueApi` can replace `useDoctorTodayAppointments` data source without behavior change
## P1-010: Establish Environment Variable Feature Flag System
### Pre-Merge
- [ ] `isFeatureEnabled(flagName)` utility works correctly
- [ ] Defaults to `false` when env var not set
- [ ] Type-safe flag names
- [ ] Unit tests pass with mocked env vars
### Code Review
- [ ] Utility is minimal (no external dependencies)
- [ ] Naming convention documented (`NEXT_PUBLIC_FEATURE_*`)
- [ ] No production code uses flags yet (flags are infrastructure only)
### Exit Criteria
- [ ] Feature flags are ready for Phase 2 provider extraction rollback
## P1-011: Create Migration Compatibility Shim Pattern
### Pre-Merge
- [ ] Shim prototype compiles without errors
- [ ] Behavioral parity tests pass (10 random state snapshots)
- [ ] Documentation includes code example and explanation
- [ ] No production code modified
### Code Review
- [ ] Shim pattern is well-documented
- [ ] Prototype demonstrates value merging correctly
- [ ] Limitations are documented (not for production use yet)
### Exit Criteria
- [ ] Shim pattern is validated and ready for Phase 2 provider extraction
## Phase 1 Gate Criteria
All of the following must be true before Phase 1 is considered complete:
1. **Zero production regressions**: All existing tests pass; no manual testing reveals behavioral changes
2. **Zero API contract changes**: All existing endpoints return identical responses
3. **Zero clinical workflow disruption**: Auto-save, draft restoration, completion, and queue flows work identically
4. **Test infrastructure operational**: Frontend tests can be written and run
5. **Shared Kernel established**: Types, errors, and constants are in place
6. **Adapters contract-tested**: All API adapters produce identical responses to existing clients
7. **DraftStorage validated**: localStorage behavior preserved exactly
8. **Feature flags ready**: Env-var gating works for Phase 2 rollback
9. **Shim pattern validated**: Compatibility shim produces identical context values
10. **Documentation updated**: All new infrastructure is documented inline and in architecture docs
