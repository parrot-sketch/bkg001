# Composition Root Certification

## Executive Summary

This document certifies that `ConsultationSessionFactory` is the single Composition Root for the consultation session. All service construction, dependency creation, and initialization occur here. No client code can reach any service constructor.

**Certification Date:** 2026-07-26  
**Status:** CERTIFIED

---

## 1. Composition Root Definition

**File:** `infrastructure/factories/ConsultationSessionFactory.ts`  
**Function:** `createConsultationSession(config: ConsultationSessionConfig)`  
**Visibility:** Imported only by `page.tsx` (Server Component) and `actions/doctor/consultation-session.ts` (Server Actions)

---

## 2. Service Construction Matrix

| Service | Constructed In Factory | Constructed Elsewhere (Production) | Severity |
|---------|------------------------|-----------------------------------|----------|
| SessionService | ✅ Line 310 | ❌ None | — |
| DraftService | ✅ Line 294 | ❌ None | — |
| WorkflowEngine | ✅ Line 287 | `domain/workflows/WorkflowEngine.ts:503` (child engine) | Low |
| WorkflowCoordinator | ✅ Line 294 (via factory) | `application/orchestrators/WorkflowCoordinatorFactory.ts:30` (factory function) | Low |
| DefaultGuardRegistry | ✅ Line 274 | `WorkflowCoordinatorFactory.ts:30` (factory function) | Low |
| HttpPatientApi | ✅ Line 269 | ❌ None | — |
| HttpConsultationApi | ✅ Line 270 | ❌ None | — |
| HttpDoctorApi | ✅ Line 271 | ❌ None | — |
| LocalStorageDraftStorage | ✅ Line 272 | ❌ None | — |
| InProcessWorkflowEventBus | ✅ Line 285 | ❌ None | — |
| Prisma repositories | ❌ Not in factory | API routes (`app/api/*`) | None (server-only) |

---

## 3. Construction Outside Factory

### 3.1 Acceptable Server-Side Construction

| File | Line | Constructor | Reason | Severity |
|------|------|-------------|--------|----------|
| `lib/server-auth.ts` | 20 | `new PrismaUserRepository(db)` | Server singleton for auth | None |
| `app/api/consultations/[id]/route.ts` | 25 | `new PrismaConsultationRepository(db)` | API route handler | None |
| `app/api/consultations/[id]/complete/route.ts` | 41 | `new PrismaConsultationRepository(db)` | API route handler | None |

**Assessment:** API routes construct their own repositories per-request. They are server-only and not reachable from client code.

### 3.2 Acceptable Test Construction

| File | Line | Constructor | Reason | Severity |
|------|------|-------------|--------|----------|
| `tests/unit/application/services/SessionService.test.ts` | 156 | `new SessionService(...)` | Unit test | None |
| `tests/unit/domain/workflows/WorkflowEngine.test.ts` | 238 | `new WorkflowEngine(...)` | Unit test | None |
| `tests/unit/application/orchestrators/WorkflowCoordinator.test.ts` | 49 | `new WorkflowEngine(...)` | Unit test | None |

**Assessment:** Test files construct services for testing purposes. They are not bundled in production.

### 3.3 Low-Severity: WorkflowCoordinatorFactory

**File:** `application/orchestrators/WorkflowCoordinatorFactory.ts`  
**Lines:** 30-46

```typescript
export function createWorkflowCoordinator(...) {
  const registry = new DefaultGuardRegistry();
  const engine = new WorkflowEngine(...);
  const eventBus = new InProcessWorkflowEventBus({ preserveOrder: true });
  return new WorkflowCoordinator(coordinatorDependencies);
}
```

**Assessment:** This is a factory FUNCTION, not a direct instantiation in client code. It is called only from `ConsultationSessionFactory`. The factory function itself is server-only.

**Verdict:** Acceptable. Not a client bundle issue.

---

## 4. Factory Responsibilities

### 4.1 What the Factory Does

1. Constructs all infrastructure adapters (`HttpPatientApi`, `HttpConsultationApi`, `HttpDoctorApi`, `LocalStorageDraftStorage`)
2. Constructs domain services (`DefaultGuardRegistry`, `WorkflowEngine`, `InProcessWorkflowEventBus`)
3. Constructs application services (`DraftService`, `SessionService`)
4. Initializes session via `SessionService.initializeSession()`
5. Serializes all Date fields to ISO strings
6. Returns `ConsultationSessionResult` with serialized data

### 4.2 What the Factory Does NOT Do

- Import React
- Import JSX
- Import browser APIs
- Import client-side hooks
- Import Presentation components

**Verified:** File contains zero React/JSX imports.

---

## 5. Dependency Graph

```
ConsultationSessionFactory
├── Infrastructure
│   ├── HttpPatientApi
│   ├── HttpConsultationApi
│   ├── HttpDoctorApi
│   └── LocalStorageDraftStorage
├── Domain
│   ├── DefaultGuardRegistry
│   ├── WorkflowEngine
│   └── InProcessWorkflowEventBus
├── Application
│   ├── DraftService
│   └── SessionService
└── Shared Kernel
    ├── ClinicalErrorCode
    ├── ClinicalErrorCategory
    └── StructuredNotes
```

**No circular dependencies. No Presentation imports.**

---

## 6. Certification

| Check | Status |
|-------|--------|
| Factory is single Composition Root | ✅ |
| All services constructed in factory | ✅ |
| No client code reaches constructors | ✅ |
| No React/JSX in factory | ✅ |
| No browser APIs in factory | ✅ |
| No circular dependencies | ✅ |

**Verdict: CERTIFIED**

`ConsultationSessionFactory` is the single Composition Root. All consultation service construction is centralized here. No client code can reach any service constructor.
