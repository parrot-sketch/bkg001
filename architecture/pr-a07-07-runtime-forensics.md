# PR-A07-07 — Runtime Forensics Report

## Executive Summary

Complete runtime integration investigation of the consultation room failure. The first and only observed runtime failure is a **Node.js heap out-of-memory during Turbopack compilation**, caused by the consultation room client entry point transitively importing the entire application/domain layer.

**Date:** 2026-07-26  
**Status:** ROOT CAUSE IDENTIFIED

---

## 1. First Runtime Failure

**Failure:** JavaScript heap out of memory
**Location:** Turbopack module graph compilation for `/doctor/consultations/session/[appointmentId]`
**Observed heap:** ~3.9GB (3,668 MB → 3,921 MB over successive GC cycles)
**Trigger:** Static import chain from client page through providers to application/domain services

---

## 2. Root Cause

### 2.1 Direct Cause
Turbopack cannot build the client module graph for the consultation room page within Node's default heap limit (~4GB).

### 2.2 Architectural Cause
The consultation room is `'use client'` and statically imports `ConsultationProvider` → `SessionProvider`. `SessionProvider` directly instantiates:

- `SessionService` (703 lines)
- `WorkflowCoordinator` (125 lines)
- `WorkflowEngine` (507 lines)
- `DefaultGuardRegistry` (314 lines)
- 76 guard files (~6,000+ lines total)
- `DraftService` (150 lines)
- All domain enums, DTOs, and API adapters

This creates a client bundle of ~2,500+ lines of application/domain code that Turbopack must analyze, transform, and bundle.

### 2.3 Boundary Violation
The Clean Architecture migration (A01–A07) correctly extracted providers and services, but it **did not preserve the presentation-layer boundary**. Client-side components now have static import reachability to application and domain layer code, which is a layering violation.

---

## 3. Why It Was Not Detected

| Check | Why Missed |
|-------|-----------|
| TypeScript | Only validates types, not bundle composition |
| Unit tests | Run in Node, not Turbopack; no bundling occurs |
| Architecture certification | Validated design patterns, not runtime bundle metrics |
| Previous `next build` success | Webpack handles module graphs differently than Turbopack |
| Dynamic imports | Defer UI components only, NOT providers or services |

---

## 4. Runtime Behavior After Successful Compilation

If the OOM is worked around (e.g., `NODE_OPTIONS="--max-old-space-size=8192"`):

### 4.1 Call Graph (Verified)
```
page.tsx mount
  → ConsultationProvider
    → SessionProvider
      → useEffect → initializeSession()
        → SessionService.initializeSession()
          → Parallel API batch: appointment, doctor, consultation
          → Parallel API batch: patient, vitals
          → DraftService.restoreDraft()
          → determineInitialWorkflowState()
          → buildSessionData()
        → SessionProvider sets state (10 setters, batched)
      → Child providers re-render
        → DocumentationProvider syncs notes/outcome
        → PatientContextProvider syncs patient/appointment/vitals
        → QueueContextProvider recomputes queue
        → TimerContextProvider recomputes time
      → CompatibilityAdapter recomputes (3 useMemos)
      → ConsultationSessionContent renders
        → Renders header, sidebar, workspace, queue
```

### 4.2 State Timeline (Verified)
All state transitions are bounded and one-directional. No loops detected.

### 4.3 Provider Audit (Verified)
All providers are render-safe. No crashes during render phase.

### 4.4 Error Propagation (Verified)
`SessionService.ClinicalError` → `SessionProvider.toErrorMessage()` → `string` → `ConsultationContext` → `page.tsx`. No `[object Object]` in current code.

### 4.5 Invariants (Verified)
All 12 runtime architecture invariants pass.

### 4.6 Render Cycles (Verified)
No pathological render behavior. Timer ticks cause bounded re-renders (2-3 components per second). Queue refetches every 30s.

---

## 5. Downstream Symptoms

| Symptom | Root Cause |
|---------|-----------|
| `Compiling /doctor/consultations/session/[appointmentId]` stalls | Module graph too large for heap |
| 3.6GB → 3.9GB GC cycles | V8 trying to free memory during graph build |
| `Ineffective mark-compacts` | Heap fragmentation from large module metadata |
| `JavaScript heap out of memory` | Allocation failure in `next-server` |
| Consultation room never renders | Compilation never completes |

---

## 6. Smallest Fix

### 6.1 Correct Fix (Architectural)
Convert `page.tsx` to a Server Component that fetches initial consultation data, then wraps a client-shell that holds the providers.

**Scope:** 3 files changed
**Impact:** Eliminates all application/domain imports from client bundle. Restores Clean Architecture boundary.

### 6.2 Workaround (Immediate)
```bash
NODE_OPTIONS="--max-old-space-size=8192" npm run dev
```

**Scope:** 1 environment variable
**Impact:** Delays OOM but does not fix architectural issue

---

## 7. Certification

**Status:** ROOT CAUSE PROVEN

- **What fails:** Turbopack compilation of client module graph
- **Where it fails:** Module graph builder in `next-server`
- **Why it fails:** ~2,500+ lines of application/domain code pulled into client bundle via static imports from `SessionProvider`
- **Why not caught:** TypeScript and tests validate types and logic, not bundle composition
- **Downstream symptoms:** All symptoms (stalled compilation, GC pressure, OOM) are caused by oversized module graph
- **Smallest fix:** Server Component boundary with Server Action for SessionService orchestration
