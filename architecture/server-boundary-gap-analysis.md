# Server Boundary Gap Analysis

## Executive Summary

This document identifies gaps between the current Phase 1 implementation and the target server-boundary architecture. All critical and high-severity gaps have been resolved. Remaining gaps are low-severity and acceptable for Phase 1.

**Date:** 2026-07-26  
**Status:** CONDITIONAL GO — No blockers for PR-A08-04

---

## 1. Original Problem Statement

The consultation room failed because Turbopack attempted to compile:
- ~100 reachable modules
- ~12,374 LOC
- 51 forbidden Application/Domain/Infrastructure modules

The proven gateway was:
```
SessionProvider
→ SessionService
→ WorkflowCoordinator
→ WorkflowEngine
→ DefaultGuardRegistry
→ 76 workflow guards
```

---

## 2. Gap Analysis

### 2.1 Critical Gaps

| # | Gap | Status | Severity |
|---|-----|--------|----------|
| C1 | SessionProvider constructs SessionService | ✅ FIXED | — |
| C2 | SessionProvider constructs WorkflowEngine | ✅ FIXED | — |
| C3 | SessionProvider constructs DraftService | ✅ FIXED | — |
| C4 | SessionProvider constructs HTTP adapters | ✅ FIXED | — |
| C5 | SessionProvider imports WorkflowCoordinator | ✅ FIXED | — |
| C6 | SessionProvider imports DefaultGuardRegistry | ✅ FIXED | — |
| C7 | page.tsx is `'use client'` | ✅ FIXED | — |
| C8 | page.tsx imports useAuth/apiClient | ✅ FIXED | — |

**Critical gaps: 0 remaining.**

### 2.2 High-Severity Gaps

| # | Gap | Status | Severity |
|---|-----|--------|----------|
| H1 | SessionProvider calls sessionService directly | ✅ FIXED | — |
| H2 | DocumentationProvider receives draftService | ✅ FIXED | — |
| H3 | PatientContextProvider receives patientApi | ✅ FIXED | — |
| H4 | Date objects leak across boundary | ✅ FIXED | — |
| H5 | Auth happens in client | ✅ FIXED | — |
| H6 | State initialization in useEffect | ✅ FIXED | — |

**High-severity gaps: 0 remaining.**

### 2.3 Medium-Severity Gaps

| # | Gap | Status | Severity | Rationale |
|---|-----|--------|----------|-----------|
| M1 | Server actions stubbed | ⚠️ OPEN | Medium | Expected for Phase 1 |
| M2 | HTTP clients still in client bundle | ⚠️ OPEN | Medium | Pre-existing, acceptable |
| M3 | AuthContext still in client bundle | ⚠️ OPEN | Medium | Pre-existing, acceptable |

**Medium-severity gaps: 3 remaining, all acceptable for Phase 1.**

### 2.4 Low-Severity Gaps

| # | Gap | Status | Severity | Rationale |
|---|-----|--------|----------|-----------|
| L1 | DocumentationProvider has dead imports | ⚠️ OPEN | Low | Cleanup in PR-A08-05 |
| L2 | WorkflowCoordinatorFactory still creates coordinator | ⚠️ OPEN | Low | Factory function, not in bundle |
| L3 | Domain enums in client bundle | ⚠️ OPEN | Low | Pure, safe, acceptable |

**Low-severity gaps: 3 remaining, all acceptable.**

---

## 3. Server Action Coverage

### 3.1 Current State

| Mutation | Action | Stub? | Priority |
|----------|--------|-------|----------|
| initializeSession | ✅ | Yes | PR-A08-04 |
| startSession | ✅ | Yes | PR-A08-04 |
| completeSession | ✅ | Yes | PR-A08-04 |
| resumeSession | ✅ | Yes | PR-A08-05 |
| cancelCompletion | ✅ | Yes | PR-A08-05 |
| switchToPatient | ✅ | Yes | PR-A08-05 |
| advanceQueue | ✅ | Yes | PR-A08-05 |
| sendHeartbeat | ✅ | Yes | PR-A08-05 |
| saveDraft | ✅ | Yes | PR-A08-05 |
| saveCompletedNotes | ✅ | Yes | PR-A08-06 |
| refreshPatient | ✅ | Yes | PR-A08-06 |
| refreshVitals | ✅ | Yes | PR-A08-06 |

**Gap:** All actions are stubs returning `{ success: false }`.

**Impact:** Phase 1 establishes the boundary and hydration. Mutations are implemented in subsequent PRs.

**Verdict:** Acceptable for Phase 1.

---

## 4. Client Bundle Gaps

### 4.1 Remaining Forbidden Modules

| Module | Present? | Gap |
|--------|----------|-----|
| SessionService | ❌ No | — |
| WorkflowCoordinator | ❌ No | — |
| WorkflowEngine | ❌ No | — |
| DefaultGuardRegistry | ❌ No | — |
| DraftService | ❌ No | — |
| HttpPatientApi | ❌ No | — |
| HttpConsultationApi | ❌ No | — |
| HttpDoctorApi | ❌ No | — |
| LocalStorageDraftStorage | ❌ No | — |
| Prisma repositories | ❌ No | — |
| Guard classes | ❌ No | — |

### 4.2 Pre-existing Acceptable Modules

| Module | Present? | Reason |
|--------|----------|--------|
| `lib/api/doctor.ts` | ✅ Yes | Pre-existing, needed for queue/dialogs |
| `lib/api/client.ts` | ✅ Yes | Pre-existing, transitive |
| `lib/api/auth.ts` | ✅ Yes | Pre-existing, token management |
| `lib/auth/token.ts` | ✅ Yes | Pre-existing, localStorage storage |

**Gap:** HTTP clients remain. These are acceptable as they were in the original bundle and are necessary for remaining client-side API interactions.

---

## 5. Readiness Assessment

### 5.1 Can PR-A08-04 Proceed?

| Requirement | Status |
|-------------|--------|
| Server Component boundary established | ✅ |
| Client bundle free of service/workflow chain | ✅ |
| Composition Root operational | ✅ |
| Provider APIs preserved | ✅ |
| Hydration contract verified | ✅ |
| No critical gaps remaining | ✅ |
| No high-severity gaps remaining | ✅ |

**Verdict: YES — PR-A08-04 may begin.**

### 5.2 PR-A08-04 Scope

PR-A08-04 should focus on:
1. Implementing real Server Actions (replacing stubs)
2. Removing `isReady` manual state — derive from server initialization
3. Wiring up mutation feedback (toasts, query invalidation)
4. Removing remaining client-side fallback paths

### 5.3 Out of Scope for PR-A08-04

- Migrating HTTP clients to Server Actions (PR-A08-05+)
- Removing AuthContext (PR-A08-05+)
- Cleaning up dead imports (PR-A08-06)

---

## 6. Certification

**Verdict: CONDITIONAL GO**

No blockers exist for PR-A08-04. The three medium-severity gaps (stubbed actions, HTTP clients, AuthContext) are acceptable for Phase 1 and will be addressed in subsequent PRs.

**PR-A08-04 may proceed.**
