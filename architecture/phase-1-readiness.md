# Phase 1 — Implementation Readiness Review
## Executive Summary
### Recommendation: CONDITIONAL GO
Phase 1 tasks are technically feasible and architecturally compliant, but **prerequisites must be completed before any code is written**. The codebase confirms the architecture document findings and reveals additional constraints not previously documented.
### Overall Readiness: 70%
- **Strengths**: Domain layer is clean and testable. API clients are simple wrappers. Workflow state machine already exists. Test infrastructure (Vitest) is mature. Backend use case tests provide a pattern to follow.
- **Blocking Issues**: No feature flag system exists. Zero frontend tests for consultation module. ConsultationContext is 1004 lines (larger than documented).
- **Prerequisites**: 3 prerequisites must be satisfied before Phase 1 begins.
## Verified Findings (from source code)
### 1. ConsultationContext Size
- **Documented**: 976 lines
- **Actual**: 1004 lines
- **Impact**: Extraction is even more critical than assessed. The monolith is growing.
### 2. No Feature Flag System
- **Search result**: Zero feature flag implementations found in codebase
- **Impact**: Phase 1 cannot use feature flags for safe rollout. Alternative: environment variable gating with manual deployment control.
### 3. Zero Frontend Tests
- **Search result**: No `.test.tsx` files for consultation components or context
- **Impact**: Phase 1 must establish frontend testing patterns from scratch. Backend test patterns exist and should be followed.
### 4. Existing Test Infrastructure
- **Tool**: Vitest with unit, integration, and e2e configurations
- **Coverage**: 428 test files exist; backend use cases are well-tested
- **Impact**: Frontend tests can use same Vitest setup with jsdom environment
### 5. API Client Structure
- `consultationApi` (46 lines): Simple wrapper with 3 methods
- `doctorApi` (331 lines): Larger but still wrapper pattern
- `apiClient` (global singleton): Used directly in ConsultationContext for vitals and heartbeat
- **Impact**: API adapters in Phase 1 are straightforward facades.
### 6. Workflow State Machine
- Already exists as proper enum + VALID_TRANSITIONS + helper functions
- File: `domain/workflows/ConsultationWorkflowState.ts` (178 lines)
- **Impact**: ADR-004 (explicit state machines) is partially already implemented. Phase 1 can formalize further.
### 7. Domain Layer Quality
- `Consultation` entity exists with state methods
- Enums: `ConsultationState`, `ConsultationOutcomeType`, `PatientDecision`, `AppointmentStatus`, `Role`
- **Impact**: Domain layer is production-ready. Phase 1 additive changes are safe.
### 8. Component Dependencies
- Session page imports 6 lazy components
- All components consume `ConsultationContext` directly
- `ConsultationQueuePanel` imports `doctorApi` directly (not through context)
- **Impact**: Provider extraction must maintain prop interfaces for backward compatibility.
### 9. Side Effects in ConsultationContext
- Auto-save useEffect (lines 819-845)
- Heartbeat useEffect (lines 847-870)
- Initial load useEffect (lines 872-877)
- Beforeunload listener (lines 879-890)
- **Impact**: Side effects must be preserved exactly during provider extraction.
### 10. Draft Storage
- localStorage key: `consultation-draft-${appointmentId}`
- Timestamp-based restoration logic (lines 476-497)
- **Impact**: DraftStorage adapter must preserve exact key format and timestamp logic.
## Blocking Issues
| Issue | Severity | Resolution |
|-------|----------|------------|
| No feature flag system | High | Use env var gating (`NEXT_PUBLIC_FEATURE_` prefix) with manual deployment control until feature flag service is available |
| Zero frontend test coverage | Medium | Establish frontend test patterns in Phase 1 Week 1; do not proceed to provider extraction without tests |
| ConsultationContext growing | Medium | Proceed with extraction; size justifies urgency |
## Missing Prerequisites
| Prerequisite | Status | Action |
|--------------|--------|--------|
| Feature flag mechanism | Missing | Implement env-var-based flags in Phase 1 Week 1 |
| Frontend test setup | Missing | Configure Vitest jsdom environment; create test utilities |
| Shared kernel location | Undefined | Agree on `shared-kernel/` directory structure before Phase 1 Week 2 |
| API adapter interfaces | Undefined | Define adapter interfaces in Phase 1 Week 1 |
## Technical Assumptions
1. **Environment variables** can be used as feature flags until a proper feature flag service is available.
2. **Vitest jsdom** is compatible with all consultation components (no native DOM APIs that require JSDOM polyfills).
3. **React Query v5** is used (based on `@tanstack/react-query` imports).
4. **Next.js App Router** is the routing framework (based on `app/` directory and `next/navigation`).
5. **No WebSockets** are used by the consultation module (polling only).
## Hidden Coupling
| Coupling | Location | Risk | Mitigation |
|----------|----------|------|------------|
| `ConsultationQueuePanel` imports `doctorApi` directly | Line 8-10 of queue panel | Will bypass new QueueContextProvider | Migrate to use `useStartConsultation` hook during queue provider extraction |
| `CompleteConsultationDialog` imports `useAppointmentBilling` | External module | Billing data fetching not in ConsultationContext | BillingProvider wraps this hook; ensure same behavior |
| `updateCompletedConsultationNotes` server action | Imported in ConsultationContext | Server action mixed into client context | Documented as pragmatic exception; move to SessionProvider in Phase 2 |
| `apiClient` used directly for vitals and heartbeat | ConsultationContext lines 420, 854 | Bypasses new API adapters | Wrap in PatientApi and TimerApi adapters in Phase 1 |
