# Client Runtime Import Audit

## Executive Summary

This document audits all runtime imports in the consultation feature client code after PR-A08-09. No Presentation component may import Application runtime, Domain runtime, or Infrastructure runtime modules.

**Date:** 2026-07-26  
**Status:** AUDIT PASS — 0 FORBIDDEN RUNTIME IMPORTS

---

## 1. Consultation Feature Entry Points

| File | Layer | Status |
|------|-------|--------|
| `components/consultation/CompleteConsultationDialog.tsx` | Client | ✅ |
| `components/consultation/complete/CompleteConsultationDialog.tsx` | Client | ✅ |
| `components/consultation/ConsultationQueuePanel.tsx` | Client | ✅ |
| `components/consultation/tabs/BillingTab.tsx` | Client | ✅ |
| `components/consultation/DictationControl.tsx` | Client | ✅ |
| `components/consultation/tabs/ServicePicker.tsx` | Client | ✅ |
| `components/consultation/PatientInfoSidebar.tsx` | Client | ✅ |
| `providers/session/SessionProvider.tsx` | Client | ✅ |
| `providers/documentation/DocumentationProvider.tsx` | Client | ✅ |
| `providers/billing/BillingProvider.tsx` | Client | ✅ |
| `providers/dialog/DialogProvider.tsx` | Client | ✅ |
| `providers/queue/QueueContextProvider.tsx` | Client | ✅ |
| `providers/patient/PatientContextProvider.tsx` | Client | ✅ |
| `providers/timer/TimerContextProvider.tsx` | Client | ✅ |
| `contexts/ConsultationContext.tsx` | Client | ✅ |

---

## 2. Forbidden Runtime Imports — Search Results

### 2.1 Application Runtime

| Module | Files | Runtime Imports | Status |
|--------|-------|-----------------|--------|
| `SessionService` | components/, providers/, contexts/ | 0 | ✅ |
| `DraftService` | components/, providers/, contexts/ | 0 | ✅ |
| `BillingService` | components/, providers/, contexts/ | 0 | ✅ |
| `ConsultationSessionFactory` | components/, providers/, contexts/ | 0 | ✅ |
| Application services | components/, providers/, contexts/ | 0 | ✅ |

### 2.2 Domain Runtime

| Module | Files | Runtime Imports | Status |
|--------|-------|-----------------|--------|
| `WorkflowCoordinator` | components/, providers/, contexts/ | 0 | ✅ |
| `WorkflowEngine` | components/, providers/, contexts/ | 0 | ✅ |
| `GuardRegistry` | components/, providers/, contexts/ | 0 | ✅ |
| `StateMachine` | components/, providers/, contexts/ | 0 | ✅ |
| Domain events | components/, providers/, contexts/ | 0 | ✅ |
| `ConsultationWorkflowState` | providers/session/SessionProvider.tsx:17 | 1 | ✅ Allowed (pure enum) |

### 2.3 Infrastructure Runtime

| Module | Files | Runtime Imports | Status |
|--------|-------|-----------------|--------|
| `repositories` | components/, providers/, contexts/ | 0 | ✅ |
| `Prisma` | components/, providers/, contexts/ | 0 | ✅ |
| `adapters` | components/, providers/, contexts/ | 0 | ✅ |
| `factories` (runtime) | components/, providers/, contexts/ | 0 | ✅ |

### 2.4 API Clients (Runtime)

| Module | Files | Runtime Imports | Status |
|--------|-------|-----------------|--------|
| `doctorApi` | components/consultation/ | 0 | ✅ REMOVED |
| `patientApi` | components/consultation/ | 0 | ✅ |
| `consultationApi` | components/consultation/ | 0 | ✅ |
| `apiClient` | components/consultation/ | 0 | ✅ REMOVED |

---

## 3. Allowed Client Imports

| Module | Files | Justification |
|--------|-------|---------------|
| Server Actions | SessionProvider, ConsultationQueuePanel, CompleteConsultationDialog, BillingTab | Expected Next.js RPC proxies |
| Domain enums | SessionProvider, ConsultationQueuePanel, DocumentationProvider, PatientContextProvider, ConsultationSessionContent | Pure TypeScript enums, no side effects |
| DTOs (type-only) | Various | Type-only imports, not runtime |
| `useRouter` | CompleteConsultationDialog, ConsultationQueuePanel | Next.js client navigation |
| React Query | QueueContextProvider, BillingTab hooks | Data fetching abstraction |

---

## 4. Import Graph Summary

### 4.1 CompleteConsultationDialog.tsx

```
CompleteConsultationDialog (use client)
  → react
  → next/navigation (useRouter)
  → @/components/ui/*
  → @/providers/documentation/*
  → @/actions/doctor/consultation-session (completeSession)
  → @/application/dtos/* (type-only)
```

**Status:** ✅ Clean

### 4.2 complete/CompleteConsultationDialog.tsx

```
complete/CompleteConsultationDialog (use client)
  → react
  → next/navigation (useRouter)
  → @/components/ui/*
  → @/providers/documentation/*
  → @/providers/billing/*
  → @/actions/doctor/consultation-session (completeSession)
  → @/application/dtos/* (type-only)
```

**Status:** ✅ Clean

### 4.3 ConsultationQueuePanel.tsx

```
ConsultationQueuePanel (use client)
  → react
  → next/navigation (useRouter)
  → @/components/ui/*
  → @/domain/enums/*
  → @/hooks/patient/*
  → @/actions/doctor/consultation-session (startSession)
  → @/application/dtos/* (type-only)
```

**Status:** ✅ Clean

### 4.4 BillingTab.tsx

```
BillingTab (use client)
  → react
  → @/components/ui/*
  → @/hooks/doctor/*
  → @/components/inventory/*
  → @/actions/doctor/consultation-session (getConsultationServiceId)
```

**Status:** ✅ Clean

---

## 5. Certification

| Check | Status |
|-------|--------|
| No Application runtime imports in client | ✅ 0 |
| No Domain runtime imports in client | ✅ 0 (enum only) |
| No Infrastructure runtime imports in client | ✅ 0 |
| No API client imports in consultation components | ✅ 0 |
| No Prisma imports in client | ✅ 0 |
| No repository imports in client | ✅ 0 |
| No adapter imports in client | ✅ 0 |
| Server Actions correctly imported | ✅ 4 |
| Type-only imports only | ✅ |

**Verdict: CLIENT RUNTIME IMPORT AUDIT PASS**
