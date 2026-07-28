# Implementation Guardrails

## Purpose

This document defines mandatory rules for every future PR in the Consultation Module modernization. No PR may be merged without answering all 8 questions and satisfying all guardrails.

These guardrails are non-negotiable. Violating any guardrail requires the PR to be redesigned before review.

---

## 1. The 8 Mandatory Answers

Every implementation PR must include a section titled **"Architecture Compliance"** that answers these 8 questions. Reviewers must verify all answers before approving.

### Q1: Which architectural concern?

The PR must address exactly one architectural concern. Examples:
- Extract a specific Application Service
- Migrate a specific Provider
- Remove a specific legacy path
- Fix a specific architectural violation

**Reject if:** PR addresses multiple concerns (e.g., "extract DraftService AND fix circular dependency AND add feature flags")

### Q2: Which ADR?

The PR must reference the ADR(s) that authorize the change:
- ADR-001: Frontend Clean Architecture
- ADR-002: Provider Boundaries
- ADR-003: State Ownership
- ADR-004: Workflow State Machines
- ADR-005: Extension Architecture

**Reject if:** PR makes architectural changes without referencing an ADR or `architecture-invariants.md`

### Q3: Which provider?

If the PR touches provider logic, it must name the provider:
- SessionProvider
- DocumentationProvider
- PatientContextProvider
- QueueProvider
- TimerProvider
- BillingProvider
- NotificationProvider

**Reject if:** PR modifies provider boundaries without naming which provider is affected

### Q4: Which use case?

If the PR implements or modifies a use case, it must name it:
- InitializeSession
- StartConsultation
- ResumeConsultation
- CompleteConsultation
- SaveDraft / RestoreDraft
- SwitchPatient
- AdvanceQueue
- LoadPatientHistory
- LoadPatientVitals
- RefreshQueue

**Reject if:** PR adds business logic without naming the use case it serves

### Q5: Which capability?

The PR must map to a capability from `consultation-capability-map.md`:
- Draft Management
- Session Lifecycle
- Queue Management
- Patient Context
- Documentation
- Billing
- Notifications
- Timer/Heartbeat

**Reject if:** PR cannot be traced to a documented capability

### Q6: Which rollback?

The PR must specify the exact rollback procedure:
- Feature flag disable
- Git revert commit hash
- Shim class deletion
- Provider consumer revert

**Reject if:** PR has no documented rollback strategy

### Q7: Which tests?

The PR must specify test coverage:
- Unit tests for new services/methods
- Behavioral parity tests (if extraction)
- Integration tests (if new port/adapter)
- Regression tests (if modifying existing behavior)
- Frontend tests (if modifying UI)

**Reject if:** PR lacks tests for the changed behavior

### Q8: Which migration step?

The PR must specify where it falls in the migration sequence:
- Phase 1: Foundations
- Phase 2: Application Layer extraction
- Phase 3: DocumentationProvider
- Phase 4: PatientContextProvider
- Phase 5: QueueProvider
- Phase 6: SessionProvider
- Phase 7: Extension Framework
- Phase 8: Observability

**Reject if:** PR attempts work out of sequence without documented justification

---

## 2. Layer Boundary Guardrails

### G-001: No React in Application Layer

Application Layer files (`application/services/`, `application/use-cases/`, `application/commands/`, `application/queries/`) must not import React, JSX, hooks, or component files.

**Enforcement:** `tsc` + `eslint` rule `no-restricted-imports`
**Penalty:** CI failure

### G-002: No Direct Infrastructure Imports in Presentation

Presentation Layer files (`contexts/`, `components/`, `hooks/`) must not import from `lib/api/`, `lib/storage/`, or other Infrastructure directories. All I/O must flow through ports.

**Enforcement:** `eslint` rule `no-restricted-imports`
**Penalty:** CI failure

### G-003: Domain Layer Import Rule

Domain Layer files must not import from Application, Presentation, or Infrastructure layers.

**Enforcement:** `madge` or `tsc` circular dependency check
**Penalty:** CI failure

### G-004: Shared Kernel Leaf Rule

Shared Kernel files must not import from any layer outside Shared Kernel.

**Enforcement:** `madge` dependency graph check
**Penalty:** CI failure

### G-005: Ports Never Import Adapters

Port interfaces (Domain interfaces) must not import or reference adapter implementations.

**Enforcement:** Code review + grep for adapter imports in `domain/interfaces/`
**Penalty:** Review rejection

---

## 3. Extraction Guardrails

### G-006: Shim-First Replacement

Every Application Service extraction must use the shim-first replacement pattern:
1. Create new Application Service
2. Create LegacyOperations class (frozen copy of old logic)
3. Create shim class with single feature flag check
4. Wire shim into ConsultationContext via single useMemo
5. After validation: delete LegacyOperations, delete shim, delete flag

**Reject if:** PR uses scattered feature flags, dual paths in ConsultationContext, or preserves old logic without a shim

### G-007: ConsultationContext Must Shrink

After every extraction cutover, `contexts/ConsultationContext.tsx` must have fewer lines than before the extraction started.

**Measurement:** `wc -l` before and after
**Penalty:** PR must be redesigned if line count does not decrease

### G-008: Zero Legacy Branches After Cutover

After any extraction is promoted to production, no legacy branches, commented-out code, or dormant feature flags may remain in `ConsultationContext`.

**Enforcement:** `grep` for `isFeatureEnabled`, `// TODO: remove`, `/* legacy */` in ConsultationContext
**Penalty:** CI failure + review rejection

### G-009: No Unsafe Type Casts

`as unknown as` casts are forbidden unless accompanied by a ticket to complete the adapter wiring.

**Reject if:** PR introduces `as unknown as` without a linked issue and expected resolution date

---

## 4. Type Guardrails

### G-010: No Duplicate Domain Types

Domain concepts must have exactly one type definition. Duplicates in Presentation, Application, or Domain layers are forbidden.

**Enforcement:** `grep` for duplicate interface definitions of the same concept
**Penalty:** Review rejection

### G-011: No Duplicate Business Logic

Business rules must have exactly one implementation. Duplicated logic across services, hooks, or contexts is forbidden.

**Enforcement:** Code review + architectural review
**Penalty:** Review rejection

### G-012: No Promise<void> in Application Services

Application Service methods must return typed results, not `Promise<void>`. Callers must be able to distinguish success from failure.

**Enforcement:** `eslint` rule or code review
**Penalty:** Review rejection

---

## 5. Provider Guardrails

### G-013: No Direct Provider Imports

Provider A must not import Provider B directly. Composition must happen at the page/component level.

**Enforcement:** `eslint` `no-restricted-imports` for provider files
**Penalty:** CI failure

### G-014: Provider Independence

Every provider must be testable and functional without other providers present.

**Enforcement:** Unit tests must render each provider in isolation
**Penalty:** Review rejection

### G-015: Provider Feature Flag Prohibition

React Providers must not use feature flags for production routing. Shadow mode is a development tool only.

**Reject if:** PR adds feature-flag-controlled provider switching

---

## 6. Testing Guardrails

### G-016: Behavioral Parity Before Promotion

Before any Application Service is promoted to the canonical implementation, behavioral parity tests must prove identical behavior between legacy and new implementations.

**Enforcement:** Test suite must include `*.parity.test.ts` files
**Penalty:** PR cannot be merged without parity tests

### G-017: No Test Modifications to Match Broken Behavior

Existing tests must not be modified to match broken production code. If a test fails after a PR, the production code is wrong, not the test.

**Penalty:** Review rejection + test revert required

### G-018: Coverage Requirement

New code must have ≥80% line coverage and ≥90% branch coverage for critical paths.

**Enforcement:** `vitest --coverage`
**Penalty:** CI failure

---

## 7. Documentation Guardrails

### G-019: Architecture Document Update

Every PR that changes architecture must update at least one architecture document.

**Reject if:** PR changes boundaries, dependencies, or ownership without updating architecture docs

### G-020: Migration Path Documentation

Every new component must have a documented migration path from the current implementation.

**Reject if:** New component lacks migration documentation

---

## 8. Clinical Safety Guardrails

### G-021: No Clinical Risk Without Validation

No PR affecting clinical workflows (draft save, session start/complete, queue routing, notes) may be merged without clinical validation.

**Enforcement:** Clinical SME sign-off required
**Penalty:** Review rejection

### G-022: Rollback Tested in Staging

Every PR with a rollback strategy must have that rollback tested in staging before production deployment.

**Enforcement:** Deployment checklist includes rollback verification
**Penalty:** Production deployment blocked

---

## 9. PR Review Checklist

Before any PR is approved, the reviewer must verify:

```
Architecture Compliance
  [ ] Q1: Single architectural concern addressed
  [ ] Q2: ADR referenced
  [ ] Q3: Provider named (if applicable)
  [ ] Q4: Use case named (if applicable)
  [ ] Q5: Capability mapped
  [ ] Q6: Rollback documented
  [ ] Q7: Tests specified
  [ ] Q8: Migration step identified

Layer Boundaries
  [ ] G-001: No React in Application Layer
  [ ] G-002: No direct Infrastructure imports in Presentation
  [ ] G-003: No Domain imports of upper layers
  [ ] G-004: Shared Kernel is leaf
  [ ] G-005: Ports don't import adapters

Extraction
  [ ] G-006: Shim-first replacement used
  [ ] G-007: ConsultationContext shrinks
  [ ] G-008: Zero legacy branches after cutover
  [ ] G-009: No unsafe type casts

Types
  [ ] G-010: No duplicate domain types
  [ ] G-011: No duplicate business logic
  [ ] G-012: No Promise<void> in services

Providers
  [ ] G-013: No direct provider imports
  [ ] G-014: Provider testable in isolation
  [ ] G-015: No feature flags in providers

Testing
  [ ] G-016: Behavioral parity tests present
  [ ] G-017: No test modifications for broken behavior
  [ ] G-018: Coverage ≥80%

Documentation
  [ ] G-019: Architecture docs updated
  [ ] G-020: Migration path documented

Clinical Safety
  [ ] G-021: Clinical validation passed
  [ ] G-022: Rollback tested in staging
```

**All checkboxes must be checked. If any are unchecked, the PR must be revised.**
