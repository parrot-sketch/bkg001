# Technical Debt Index

## Executive Summary

This document catalogs all remaining technical debt after PR-A06-07 completion. Debt is categorized by severity, with estimated impact, effort, and risk for each item.

| Category | Count | Total Effort |
|----------|-------|--------------|
| Critical | 2 | Large |
| High | 4 | Medium |
| Medium | 6 | Small-Medium |
| Low | 5 | Small |
| Future Enhancement | 3 | Medium |

**Overall Technical Debt Index: 20 items**

---

## 1. Critical Debt

### 1.1 SessionProvider Direct Infrastructure Coupling

| Attribute | Value |
|-----------|-------|
| **Impact** | High — Presentation layer violates ADR-001 by importing Infrastructure adapters directly |
| **Effort** | Large — Requires refactoring SessionProvider to accept injected APIs |
| **Risk** | Medium — High-risk change; affects entire session initialization path |
| **Recommended PR** | PR-A07-02 |
| **Evidence** | `providers/session/SessionProvider.tsx:42-44` imports `HttpPatientApi`, `HttpConsultationApi`, `HttpDoctorApi` |

### 1.2 Dead `consultationReducer.ts`

| Attribute | Value |
|-----------|-------|
| **Impact** | Medium — Dead code creates confusion; future developers may mistakenly use old reducer |
| **Effort** | Small — Delete file |
| **Risk** | Low — Zero imports, safe to delete |
| **Recommended PR** | PR-A07-01 |
| **Evidence** | `contexts/consultationReducer.ts` has zero imports outside its own file |

---

## 2. High Debt

### 2.1 Dead SessionOperationsShim and LegacySessionOperations

| Attribute | Value |
|-----------|-------|
| **Impact** | Medium — Dead migration classes create confusion and maintenance burden |
| **Effort** | Small — Delete files and tests |
| **Risk** | Low — Zero Presentation usage |
| **Recommended PR** | PR-A07-01 |
| **Evidence** | Only used in own test files |

### 2.2 Dead USE_SESSION_SERVICE Feature Flag

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — Dead flag adds noise to feature flag system |
| **Effort** | Small — Remove flag definition and conditionals |
| **Risk** | Low — No active consumers |
| **Recommended PR** | PR-A07-01 |
| **Evidence** | Only consumer was SessionOperationsShim |

### 2.3 Server Action in DocumentationProvider

| Attribute | Value |
|-----------|-------|
| **Impact** | Medium — Provider cannot be tested outside Next.js runtime |
| **Effort** | Medium — Inject save function via props |
| **Risk** | Low — Internal refactor, no API change |
| **Recommended PR** | PR-A07-02 |
| **Evidence** | `providers/documentation/DocumentationProvider.tsx:35` imports `updateCompletedConsultationNotes` |

### 2.4 SessionProvider Service Instantiation

| Attribute | Value |
|-----------|-------|
| **Impact** | High — SessionProvider instantiates SessionService, DraftService, WorkflowCoordinator, WorkflowEngine directly |
| **Effort** | Large — Requires dependency injection refactoring |
| **Risk** | Medium — Affects session initialization and all orchestration |
| **Recommended PR** | PR-A07-02 |
| **Evidence** | `providers/session/SessionProvider.tsx:167-204` |

---

## 3. Medium Debt

### 3.1 Duplicate BillItem Type

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — Type duplication creates maintenance burden |
| **Effort** | Small — Consolidate into single Shared Kernel type |
| **Risk** | Low — Internal type refactor |
| **Recommended PR** | PR-A07-03 |
| **Evidence** | `hooks/billing/useChargeSheet.ts` and `providers/billing/BillingProvider.tsx` both define BillItem |

### 3.2 Noop Implementations in SessionProvider

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — Noop implementations clutter Presentation layer |
| **Effort** | Small — Move to test-utils or inject via props |
| **Risk** | Low — Internal refactor |
| **Recommended PR** | PR-A07-02 |
| **Evidence** | `providers/session/SessionProvider.tsx:199-218` defines `createNoopQueueApi`, `createNoopNotificationService`, `createNoopAuditService` |

### 3.3 WorkflowCoordinatorFactory Shim Dependency

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — Acceptable but creates hidden dependency between orchestrators and shim layer |
| **Effort** | Small — Document as intentional or refactor |
| **Risk** | Low — No functional impact |
| **Recommended PR** | PR-A07-03 |
| **Evidence** | `application/orchestrators/WorkflowCoordinatorFactory.ts:17` imports `ConsultationWorkflowShim` |

### 3.4 QueueContextProvider Data Source Coupling

| Attribute | Value |
|-----------|-------|
| **Impact** | Medium — QueueProvider depends on specific data-fetching hook |
| **Effort** | Medium — Inject data via prop |
| **Risk** | Low — Internal refactor |
| **Recommended PR** | PR-A07-03 |
| **Evidence** | `providers/queue/QueueContextProvider.tsx` imports `useDoctorTodayAppointments` |

### 3.5 Unsafe Type Cast in ConsultationContext

| Attribute | Value |
|-----------|-------|
| **Impact** | Medium — `ctx as any` bypasses TypeScript safety |
| **Effort** | Small — Define proper interface |
| **Risk** | Low — Type safety improvement |
| **Recommended PR** | PR-A07-01 |
| **Evidence** | `contexts/ConsultationContext.tsx:68` |

### 3.6 Type Error in ConsultationProviderState

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — Incorrect type `AppointmentResponseDto | null` instead of `PatientResponseDto | null` |
| **Effort** | Small — Fix type definition |
| **Risk** | Low — Type safety improvement |
| **Recommended PR** | PR-A07-01 |
| **Evidence** | `contexts/ConsultationContext.tsx:22` |

---

## 4. Low Debt

### 4.1 Unused Imports in ConsultationContext

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — Dead code |
| **Effort** | Trivial — Remove imports |
| **Risk** | None |
| **Recommended PR** | PR-A07-01 |
| **Evidence** | `ConsultationResponseDto`, `StructuredNotes` imported but unused |

### 4.2 Dead `ConsultationProviderState` Fields

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — 3 of 7 fields are Omit-ted out |
| **Effort** | Trivial — Remove dead fields |
| **Risk** | None |
| **Recommended PR** | PR-A07-01 |
| **Evidence** | `contexts/consultationReducer.ts` |

### 4.3 Unused `loadAppointment` Alias

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — Alias adds mental overhead |
| **Effort** | Trivial — Rename to `initializeSession` in compatibility layer |
| **Risk** | Low — API change for consumers |
| **Recommended PR** | PR-A07-05 |
| **Evidence** | `contexts/ConsultationContext.tsx:73` maps `loadAppointment` to `initializeSession` |

### 4.4 SessionProvider Testability

| Attribute | Value |
|-----------|-------|
| **Impact** | Medium — No direct unit tests for SessionProvider |
| **Effort** | Medium — Extract orchestration logic, add tests |
| **Risk** | Low — Test coverage improvement |
| **Recommended PR** | PR-A07-06 |
| **Evidence** | Tests only exist through compatibility layer |

### 4.5 Missing SessionProvider Direct Tests

| Attribute | Value |
|-----------|-------|
| **Impact** | Medium — Cannot verify orchestration in isolation |
| **Effort** | Medium — Refactor to enable direct testing |
| **Risk** | Low — Test improvement |
| **Recommended PR** | PR-A07-06 |
| **Evidence** | All tests use ConsultationProvider wrapper |

---

## 5. Future Enhancements

### 5.1 Deprecate useConsultationContext

| Attribute | Value |
|-----------|-------|
| **Impact** | Low — Compatibility layer is working correctly |
| **Effort** | Medium — Migrate all consumers to useSessionContext |
| **Risk** | Low — Internal migration |
| **Recommended PR** | PR-A07-05 |
| **Evidence** | `contexts/ConsultationContext.tsx` is 96 lines |

### 5.2 Remove ConsultationContext Entirely

| Attribute | Value |
|-----------|-------|
| **Impact** | Medium — Breaks backward compatibility for external consumers |
| **Effort** | Large — Migrate all consumers to useSessionContext |
| **Risk** | Medium — Consumer migration required |
| **Recommended PR** | PR-A07-06 |
| **Evidence** | `contexts/ConsultationContext.tsx` |

### 5.3 Extract SessionProvider Orchestration to Application Layer

| Attribute | Value |
|-----------|-------|
| **Impact** | High — Separates orchestration from presentation concerns |
| **Effort** | Large — Create SessionOrchestrator in Application layer |
| **Risk** | Medium — Significant refactoring |
| **Recommended PR** | PR-A08-01 |
| **Evidence** | `providers/session/SessionProvider.tsx` |

---

## 6. Debt Prioritization Matrix

| Item | Impact | Effort | Risk | Priority |
|------|--------|--------|------|----------|
| SessionProvider infra coupling | H | L | M | 1 |
| Dead consultationReducer | M | S | L | 2 |
| Dead session shims | M | S | L | 3 |
| Server action in DocumentationProvider | M | M | L | 4 |
| SessionProvider service instantiation | H | L | M | 5 |
| Unsafe type cast | M | S | L | 6 |
| Duplicate BillItem | L | S | L | 7 |
| Noop implementations | L | S | L | 8 |
| QueueProvider data coupling | M | M | L | 9 |

**S = Small, M = Medium, L = Large**

**Recommendation:** Address items 1-3 in PR-A07-01 and PR-A07-02. Items 4-9 can be addressed in subsequent cleanup sprints.
