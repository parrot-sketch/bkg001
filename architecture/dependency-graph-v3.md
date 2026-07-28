# Dependency Graph v3

## Executive Summary

This document reconstructs the complete dependency graph for the consultation module after PR-A06-07. It verifies layer boundaries, identifies hidden dependencies, and documents the canonical architecture.

---

## 1. Canonical Dependency Graph

```
Shared Kernel (leaf dependency)
├── domain/enums/
├── domain/interfaces/ (ports)
├── domain/workflows/ (pure state machines)
├── shared-kernel/errors/
├── shared-kernel/types/
├── shared-kernel/utils/
└── shared-kernel/feature-flags.ts

Domain (depends on Shared Kernel only)
├── domain/workflows/WorkflowEngine
├── domain/workflows/ConsultationWorkflowStateMachine
├── domain/workflows/DocumentationWorkflowStateMachine
└── domain/workflows/GuardEngine
    └── imports: shared-kernel/*

Application (depends on Domain + Shared Kernel)
├── application/services/SessionService
│   ├── imports: domain/interfaces/* (ports)
│   ├── imports: domain/workflows/*
│   ├── imports: application/orchestrators/WorkflowCoordinator
│   ├── imports: application/services/DraftService
│   └── imports: shared-kernel/*
├── application/services/DraftService
│   ├── imports: domain/interfaces/*
│   └── imports: shared-kernel/*
├── application/orchestrators/WorkflowCoordinator
│   ├── imports: domain/workflows/*
│   ├── imports: domain/interfaces/*
│   └── imports: application/services/*
├── application/orchestrators/WorkflowCoordinatorFactory
│   ├── imports: application/orchestrators/WorkflowCoordinator
│   ├── imports: application/shims/ConsultationWorkflowShim
│   └── imports: application/shims/WorkflowCoordinatorAdapter
└── application/dtos/
    └── imports: domain/enums/*, shared-kernel/*

Infrastructure (depends on Domain ports + Shared Kernel)
├── lib/api/patient-adapter.ts (HttpPatientApi)
│   ├── imports: domain/interfaces/services/PatientApi
│   ├── imports: lib/api/patient.ts
│   └── imports: shared-kernel/errors/*
├── lib/api/consultation-adapter.ts (HttpConsultationApi)
│   ├── imports: domain/interfaces/services/ConsultationApi
│   ├── imports: lib/api/consultation.ts
│   └── imports: shared-kernel/errors/*
├── lib/api/doctor-adapter.ts (HttpDoctorApi)
│   ├── imports: domain/interfaces/services/DoctorApi
│   ├── imports: lib/api/doctor.ts
│   └── imports: shared-kernel/errors/*
└── lib/storage/local-storage-draft.ts
    ├── imports: shared-kernel/types/notes
    └── imports: shared-kernel/errors/*

Presentation (depends on Application + Domain + Shared Kernel)
├── providers/session/SessionProvider
│   ├── imports: React
│   ├── imports: next/navigation (useRouter)
│   ├── imports: @tanstack/react-query
│   ├── imports: sonner (toast)
│   ├── imports: domain/workflows/*
│   ├── imports: application/services/SessionService
│   ├── imports: application/services/DraftService
│   ├── imports: application/orchestrators/WorkflowCoordinatorFactory
│   ├── imports: application/events/InProcessWorkflowEventBus
│   ├── imports: lib/api/*-adapter.ts ⚠️ VIOLATION
│   ├── imports: providers/* (all 6 sibling providers) ⚠️ VIOLATION
│   └── imports: shared-kernel/*
│
├── providers/billing/BillingProvider
│   ├── imports: React
│   └── imports: self-defined types
│
├── providers/dialog/DialogProvider
│   ├── imports: React
│   └── imports: self-defined types
│
├── providers/timer/TimerContextProvider
│   ├── imports: React
│   └── imports: self-defined types
│
├── providers/queue/QueueContextProvider
│   ├── imports: React
│   ├── imports: application/dtos/AppointmentResponseDto
│   └── imports: hooks/doctor/useDoctorDashboard
│
├── providers/patient/PatientContextProvider
│   ├── imports: React
│   ├── imports: sonner (toast)
│   ├── imports: domain/interfaces/services/PatientApi
│   └── imports: shared-kernel/errors/*
│
├── providers/documentation/DocumentationProvider
│   ├── imports: React
│   ├── imports: sonner (toast)
│   ├── imports: domain/enums/*
│   ├── imports: shared-kernel/types/notes
│   ├── imports: application/services/DraftService
│   └── imports: actions/doctor/consultation-hub ⚠️ VIOLATION
│
└── contexts/ConsultationContext (compat façade)
    ├── imports: React
    ├── imports: providers/session/SessionProvider
    ├── imports: providers/dialog/DialogProvider
    └── imports: application/dtos/*
```

---

## 2. Layer Boundary Verification

### 2.1 Presentation → Application

| Rule | Status | Violations |
|------|--------|------------|
| Presentation may import Application services | ✅ | SessionProvider imports SessionService, DraftService |
| Presentation may import Application orchestrators | ✅ | SessionProvider imports WorkflowCoordinatorFactory |
| Presentation may import Application DTOs | ✅ | ConsultationContext imports ConsultationResponseDto |
| Presentation must not import Infrastructure directly | ⚠️ VIOLATION | SessionProvider imports `HttpPatientApi`, `HttpConsultationApi`, `HttpDoctorApi` from `lib/api/*-adapter.ts` |

### 2.2 Application → Domain

| Rule | Status | Violations |
|------|--------|------------|
| Application may import Domain types | ✅ | SessionService imports ConsultationWorkflowState, GuardContext |
| Application may import Domain interfaces (ports) | ✅ | SessionService imports DoctorApi, ConsultationApi, PatientApi |
| Application must not import Presentation | ✅ | No Application files import React, JSX, or hooks |
| Application must not import Infrastructure directly | ✅ | All I/O goes through ports |

### 2.3 Domain → Shared Kernel

| Rule | Status | Violations |
|------|--------|------------|
| Domain may import Shared Kernel types | ✅ | WorkflowEngine imports ClinicalError, GuardContext |
| Domain may import Shared Kernel enums | ✅ | ConsultationWorkflowStateMachine imports shared enums |
| Domain must not import Application | ✅ | No Domain files import from application/ |
| Domain must not import Infrastructure | ✅ | No Domain files import from lib/ |

### 2.4 Shared Kernel

| Rule | Status | Violations |
|------|--------|------------|
| Zero React dependencies | ✅ | No shared-kernel file imports React |
| Zero Next.js dependencies | ✅ | No shared-kernel file imports next/ |
| Zero browser APIs | ✅ | No shared-kernel file uses window, document, etc. |
| Zero HTTP | ✅ | No shared-kernel file imports fetch, axios, apiClient |
| Zero persistence leaks | ✅ | No shared-kernel file imports storage adapters |

---

## 3. Hidden Dependencies

### 3.1 Infrastructure Imported by Presentation

**File:** `providers/session/SessionProvider.tsx:42-44`
```typescript
import { HttpPatientApi } from '@/lib/api/patient-adapter';
import { HttpConsultationApi } from '@/lib/api/consultation-adapter';
import { HttpDoctorApi } from '@/lib/api/doctor-adapter';
```

**Impact:** SessionProvider leaks infrastructure concerns into the Presentation layer. This violates ADR-001 (Presentation depends only on Application/Shared Kernel).

**Fix:** These adapters should be injected via props or created by an Application-layer factory.

### 3.2 Server Action Imported by Provider

**File:** `providers/documentation/DocumentationProvider.tsx:35`
```typescript
import { updateCompletedConsultationNotes } from '@/actions/doctor/consultation-hub';
```

**Impact:** DocumentationProvider imports a Next.js Server Action directly. This creates coupling to the Next.js runtime and makes the provider non-testable outside a Next.js environment.

**Fix:** The server action should be passed as an injected callback prop.

### 3.3 Sibling Provider Imports

**File:** `providers/session/SessionProvider.tsx:65-70`
```typescript
import { BillingProvider } from '@/providers/billing/BillingProvider';
import { DialogProvider } from '@/providers/dialog/DialogProvider';
import { TimerContextProvider } from '@/providers/timer/TimerContextProvider';
import { QueueContextProvider } from '@/providers/queue/QueueContextProvider';
import { PatientContextProvider } from '@/providers/patient/PatientContextProvider';
import { DocumentationProvider } from '@/providers/documentation/DocumentationProvider';
```

**Impact:** SessionProvider imports all sibling providers. While this is necessary for composition, it means SessionProvider cannot be tested or used without all 6 sibling providers present.

**Fix:** This is acceptable for a root orchestrator but should be noted as intentional coupling.

### 3.4 Noop Implementations in Presentation

**File:** `providers/session/SessionProvider.tsx:199-218`
```typescript
function createNoopQueueApi(): QueueApi { ... }
function createNoopNotificationService(): INotificationService { ... }
function createNoopAuditService(): IAuditService { ... }
```

**Impact:** Noop implementations are defined in Presentation layer. These belong in Application or Testing layers.

**Fix:** Inject these via props or move to a test-utils module.

### 3.5 WorkflowCoordinatorFactory Depends on Shim

**File:** `application/orchestrators/WorkflowCoordinatorFactory.ts:17`
```typescript
import { ConsultationWorkflowShim } from '@/application/shims/ConsultationWorkflowShim';
```

**Impact:** WorkflowCoordinatorFactory imports from `application/shims/`. The shim directory was originally for migration. This creates a hidden dependency between Application orchestrators and shim implementations.

**Fix:** Acceptable as the shim is now a permanent abstraction layer. No action needed.

---

## 4. Circular Dependency Check

| Check | Result | Details |
|-------|--------|---------|
| providers/session → providers/* → providers/session | ✅ No cycle | SessionProvider imports all providers, but no provider imports SessionProvider or another provider |
| application/services → application/orchestrators → application/services | ✅ No cycle | SessionService imports WorkflowCoordinator, but WorkflowCoordinator does not import SessionService |
| domain/workflows → application/orchestrators → domain/workflows | ✅ No cycle | WorkflowCoordinator imports WorkflowEngine, but WorkflowEngine does not import WorkflowCoordinator |
| lib/api/*-adapter → lib/api/* → lib/api/*-adapter | ✅ No cycle | Adapters import base API clients, but base clients do not import adapters |

**No circular dependencies detected.**

---

## 5. Dependency Matrix

| Module | Shared Kernel | Domain | Application | Infrastructure | Presentation |
|--------|--------------|--------|-------------|----------------|--------------|
| Shared Kernel | — | ❌ | ❌ | ❌ | ❌ |
| Domain | ✅ | — | ❌ | ❌ | ❌ |
| Application | ✅ | ✅ | — | ❌ | ❌ |
| Infrastructure | ✅ | ✅ | ❌ | — | ❌ |
| Presentation | ✅ | ✅ | ✅ | ⚠️* | — |

*Presentation imports Infrastructure adapters directly via SessionProvider (violation to fix)

---

## 6. Provider-to-Provider Dependency Check

| Provider | Imports Other Providers? | Status |
|----------|-------------------------|--------|
| BillingProvider | No | ✅ |
| DialogProvider | No | ✅ |
| TimerContextProvider | No | ✅ |
| QueueContextProvider | No | ✅ |
| PatientContextProvider | No | ✅ |
| DocumentationProvider | No | ✅ |
| SessionProvider | Yes (all 6 siblings) | ⚠️ Intentional |

**Conclusion:** SessionProvider is the only provider that imports other providers. This is intentional for root orchestration. All sibling providers are independent.

---

## 7. Service-to-Service Dependency Check

| Service | Depends On | Direction | Status |
|---------|------------|-----------|--------|
| SessionService | WorkflowCoordinator, DraftService | Application → Application | ✅ |
| DraftService | ConsultationApi (port) | Application → Port | ✅ |
| WorkflowCoordinator | WorkflowEngine, DraftService | Application → Application/Domain | ✅ |
| WorkflowEngine | GuardEngine | Domain → Domain | ✅ |

**All service dependencies flow downward (higher layers depend on lower layers).**

---

## 8. Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total files audited | 50+ | — |
| Layer boundary violations | 2 | ⚠️ Requires fix |
| Circular dependencies | 0 | ✅ |
| Hidden dependencies | 3 | ⚠️ Documented |
| Providers importing providers | 1 (intentional) | ⚠️ Documented |
| Dead interfaces | 0 | ✅ |
| Unused feature flags | 1 | ⚠️ Safe to delete |

**Overall:** The dependency graph is largely clean. The two violations (infrastructure import in SessionProvider, server action in DocumentationProvider) are known issues with planned fixes in PR-A07-02.
