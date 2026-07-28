# Consultation Module — Dependency Map

## 1. High-Level Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ConsultationSessionPageOptimized                                 │ │
│  │  ├── ConsultationProvider                                         │ │
│  │  │   ├── useAuth                                                  │ │
│  │  │   ├── useDoctorTodayAppointments                               │ │
│  │  │   ├── useConsultation                                          │ │
│  │  │   ├── useSaveConsultationDraft                                 │ │
│  │  │   ├── usePatientConsultationHistory                            │ │
│  │  │   ├── doctorApi                                                │ │
│  │  │   ├── consultationApi                                          │ │
│  │  │   ├── apiClient                                                │ │
│  │  │   └── updateCompletedConsultationNotes (server action)         │ │
│  │  │                                                                 │ │
│  │  └── Children (Suspense-wrapped):                                 │ │
│  │      ├── ConsultationSessionHeader                                │ │
│  │      │   └── useConsultationTimer                                 │ │
│  │      ├── PatientInfoSidebar                                       │ │
│  │      ├── ConsultationWorkspaceOptimized                           │ │
│  │      │   ├── useConsultationContext                               │ │
│  │      │   └── [SubjectiveTab, ObjectiveTab, AssessmentTab, PlanTab]│ │
│  │      ├── ConsultationQueuePanel                                   │ │
│  │      │   ├── useAuth                                              │ │
│  │      │   └── doctorApi                                            │ │
│  │      ├── StartConsultationDialog                                  │ │
│  │      │   ├── useAuth                                              │ │
│  │      │   └── doctorApi                                            │ │
│  │      └── CompleteConsultationDialog                               │ │
│  │          ├── useConsultationContext                               │ │
│  │          └── useAppointmentBilling                                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         APPLICATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  StartConsultationUseCase                                         │ │
│  │  ├── IAppointmentRepository → PrismaAppointmentRepository         │ │
│  │  ├── IConsultationRepository → PrismaConsultationRepository       │ │
│  │  ├── IAuditService → ConsoleAuditService                          │ │
│  │  ├── AppointmentStateTransitionService                            │ │
│  │  └── AppointmentMapper                                            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  CompleteConsultationUseCase                                      │ │
│  │  ├── IAppointmentRepository → PrismaAppointmentRepository         │ │
│  │  ├── IConsultationRepository → PrismaConsultationRepository       │ │
│  │  ├── IPatientRepository → PrismaPatientRepository                 │ │
│  │  ├── IPaymentRepository → PrismaPaymentRepository                 │ │
│  │  ├── IUserRepository → PrismaUserRepository                       │ │
│  │  ├── ISurgicalCaseRepository → PrismaSurgicalCaseRepository       │ │
│  │  ├── ICasePlanRepository → PrismaCasePlanRepository               │ │
│  │  ├── INotificationService → EmailNotificationService              │ │
│  │  ├── IAuditService → ConsoleAuditService                          │ │
│  │  ├── AppointmentMapper                                            │ │
│  │  ├── chargeSheetService                                           │ │
│  │  └── resolveConsultationServiceId                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         DOMAIN LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Consultation Entity                                               │ │
│  │  ├── ConsultationState                                             │ │
│  │  ├── ConsultationOutcomeType                                       │ │
│  │  ├── PatientDecision                                               │ │
│  │  ├── ConsultationNotes (Value Object)                              │ │
│  │  ├── ConsultationDuration (Value Object)                           │ │
│  │  └── DomainException                                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ConsultationWorkflowState                                         │ │
│  │  ├── ConsultationWorkflowState (enum)                              │ │
│  │  ├── ConsultationWorkflowAction (enum)                             │ │
│  │  ├── ConsultationWorkflowContext (interface)                       │ │
│  │  ├── VALID_TRANSITIONS                                             │ │
│  │  ├── getNextState                                                  │ │
│  │  ├── canPerformAction                                              │ │
│  │  └── createInitialContext                                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ API Routes              │  │ Server Actions                       │  │
│  │ ├── POST /start         │  │ ├── getConsultationsForHub           │  │
│  │ └── POST /complete      │  │ ├── initiateSurgicalCase             │  │
│  │         │               │  │ ├── updateConsultationOutcome        │  │
│  │         ▼               │  │ └── updateCompletedConsultationNotes │  │
│  │ StartConsultationUseCase│  └─────────────────────────────────────┘  │
│  │ CompleteConsultation    │                                             │
│  │ UseCase                 │                                             │
│  └───────────┬─────────────┘                                             │
│              │                                                          │
│  ┌───────────▼───────────────────────────────────────────────────────┐ │
│  │  Repositories                                                      │ │
│  │  ├── PrismaAppointmentRepository                                   │ │
│  │  ├── PrismaConsultationRepository                                  │ │
│  │  ├── PrismaPatientRepository                                       │ │
│  │  ├── PrismaPaymentRepository                                       │ │
│  │  ├── PrismaUserRepository                                          │ │
│  │  ├── PrismaSurgicalCaseRepository                                  │ │
│  │  └── PrismaCasePlanRepository                                      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  API Client Library                                                │ │
│  │  ├── consultationApi                                              │ │
│  │  │   ├── getConsultation                                          │ │
│  │  │   ├── saveDraft                                                │ │
│  │  │   └── getPatientConsultationHistory                            │ │
│  │  ├── doctorApi                                                    │ │
│  │  │   ├── startConsultation                                        │ │
│  │  │   ├── completeConsultation                                     │ │
│  │  │   ├── getAppointment                                           │ │
│  │  │   ├── getPatient                                               │ │
│  │  │   └── getTodayAppointments                                     │ │
│  │  └── apiClient (global singleton)                                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Dependency Matrix

### Presentation → Application

| Presentation Component | Application Dependency |
|------------------------|------------------------|
| ConsultationSessionPageOptimized | None (delegates to Context) |
| PatientInfoSidebar | None (pure presentation) |
| ConsultationSessionHeader | None (pure presentation) |
| ConsultationWorkspaceOptimized | None (delegates to Context) |
| ConsultationQueuePanel | None (delegates to callbacks) |
| StartConsultationDialog | doctorApi.startConsultation |
| CompleteConsultationDialog | doctorApi.completeConsultation |

### Presentation → Domain

| Presentation Component | Domain Dependency |
|------------------------|-------------------|
| ConsultationSessionPageOptimized | Role |
| ConsultationSessionHeader | ConsultationState, Role |
| ConsultationWorkspaceOptimized | None |
| ConsultationQueuePanel | AppointmentStatus |
| StartConsultationDialog | Role |
| CompleteConsultationDialog | None |
| PatientInfoSidebar | ConsultationOutcomeType, ConsultationState |

### Presentation → Infrastructure

| Presentation Component | Infrastructure Dependency |
|------------------------|---------------------------|
| ConsultationSessionPageOptimized | useAuth (depends on AuthContext) |
| ConsultationSessionHeader | None |
| ConsultationQueuePanel | doctorApi |
| StartConsultationDialog | doctorApi, useAuth |
| CompleteConsultationDialog | doctorApi |

### Context → Application

| Context Export | Application Dependency |
|----------------|------------------------|
| loadAppointment | doctorApi, consultationApi, apiClient |
| startConsultation | doctorApi |
| saveDraft | useSaveConsultationDraft (React Query mutation) |
| completeConsultation | updateCompletedConsultationNotes (server action) |

### Context → Domain

| Context Export | Domain Dependency |
|----------------|-------------------|
| loadAppointment | AppointmentStatus, ConsultationState |
| startConsultation | ConsultationState |
| Derived: isActive | ConsultationState, AppointmentStatus |
| Derived: isReadOnly | ConsultationState, AppointmentStatus |
| Derived: canComplete | AppointmentStatus |

### Context → Infrastructure

| Context Export | Infrastructure Dependency |
|----------------|---------------------------|
| loadAppointment | doctorApi, consultationApi, apiClient |
| startConsultation | doctorApi |
| saveDraft | useSaveConsultationDraft → consultationApi → apiClient |
| completeConsultation | updateCompletedConsultationNotes (server action) |

### Use Cases → Domain

| Use Case | Domain Dependency |
|----------|-------------------|
| StartConsultationUseCase | AppointmentStatus, ConsultationState, Consultation, ConsultationNotes, DomainException, AppointmentStateTransitionService |
| CompleteConsultationUseCase | ConsultationOutcomeType, PatientDecision, ConsultationNotes, DomainException |

### Use Cases → Infrastructure

| Use Case | Infrastructure Dependency |
|----------|---------------------------|
| StartConsultationUseCase | PrismaAppointmentRepository, PrismaConsultationRepository, ConsoleAuditService, db (Prisma) |
| CompleteConsultationUseCase | PrismaAppointmentRepository, PrismaConsultationRepository, PrismaPatientRepository, PrismaPaymentRepository, PrismaUserRepository, PrismaSurgicalCaseRepository, PrismaCasePlanRepository, EmailNotificationService, ConsoleAuditService, db |

### Use Cases → Application

| Use Case | Application Dependency |
|----------|------------------------|
| StartConsultationUseCase | StartConsultationDto, AppointmentResponseDto, AppointmentMapper |
| CompleteConsultationUseCase | CompleteConsultationDto, AppointmentResponseDto, AppointmentMapper, ScheduleAppointmentDto |

---

## 3. Circular Dependency Analysis

### No Circular Dependencies Detected

The module maintains clean unidirectional dependencies:

- Presentation → Application → Domain (downward)
- Presentation → Infrastructure (via API clients)
- Infrastructure → Domain (repositories, services)
- Application → Domain + Infrastructure (use cases)

The only "cross-cutting" dependency is `db` (PrismaClient) being imported directly in use cases and API routes, which is consistent with the chosen architecture pattern.

---

## 4. External Dependencies

### 4.1 React Ecosystem
- `react` — Core (useState, useEffect, useMemo, useCallback, useRef, useContext, useReducer, Suspense, dynamic)
- `next/navigation` — Router (useRouter)
- `@tanstack/react-query` — Server state (useQuery, useQueryClient, useMutation)

### 4.2 UI Libraries
- `lucide-react` — Icons
- `framer-motion` — Animations (ConsultationQueuePanel)
- `sonner` — Toast notifications
- `date-fns` — Date formatting
- `lodash` — Debounce utility
- shadcn/ui — Button, Dialog, Tabs, Skeleton, Badge, Textarea, Label, Avatar

### 4.3 Backend
- `@prisma/client` — ORM
- Next.js API Routes (route handlers)
- Next.js Server Actions
- JWT authentication (custom middleware)

---

## 5. Internal Module Dependencies

### 5.1 Consultation Module Depends On

| Module | Files Used |
|--------|------------|
| Auth | `lib/auth/server-auth`, `hooks/patient/useAuth`, `lib/auth/middleware` |
| Patient | `lib/api/doctor` (getPatient), patient DTOs |
| Appointment | `lib/api/doctor`, appointment DTOs, AppointmentStatus enum |
| Doctor | `lib/api/doctor`, doctor DTOs, useDoctorDashboard hook |
| Billing | `hooks/consultation/useAppointmentBilling` (for completion dialog) |
| Surgical | SurgicalCase, CasePlan repositories (for completion), surgical case DTOs |
| Notification | EmailNotificationService, in-app notification logic |
| Routing | Next.js App Router, next/link, next/navigation |

### 5.2 Other Modules Depend On Consultation

| Module | Relationship |
|--------|--------------|
| Dashboard | Displays consultation status on appointment cards |
| Queue | Consults are initiated from queue |
| Surgical Planning | Case plans created from completed consultations |
| Billing | Billing records created from completed consultations |
| Notifications | Patient/frontdesk notifications triggered on completion |

---

## 6. File Dependency Graph (Detailed)

```
app/doctor/consultations/session/[appointmentId]/page.tsx
├── contexts/ConsultationContext
│   ├── hooks/consultation/useConsultation
│   │   └── lib/api/consultation
│   ├── hooks/consultation/useSaveConsultationDraft
│   │   └── lib/api/consultation
│   ├── hooks/consultation/usePatientConsultationHistory
│   │   └── lib/api/consultation
│   ├── hooks/doctor/useDoctorDashboard
│   │   └── lib/api/doctor
│   ├── lib/api/doctor
│   ├── consultationApi
│   ├── apiClient
│   ├── useAuth
│   ├── updateCompletedConsultationNotes
│   └── domain/*
├── components/consultation/PatientInfoSidebar
│   └── application/dtos/*
├── components/consultation/ConsultationSessionHeader
│   └── hooks/consultation/useConsultationTimer
├── components/consultation/ConsultationWorkspaceOptimized
│   └── contexts/ConsultationContext (circular at runtime, resolved via props)
├── components/consultation/ConsultationQueuePanel
│   ├── contexts/AuthContext (via useAuth)
│   └── lib/api/doctor
├── components/doctor/StartConsultationDialog
│   ├── lib/api/doctor
│   └── useAuth
└── components/consultation/CompleteConsultationDialog
    ├── lib/api/doctor
    ├── contexts/ConsultationContext
    └── hooks/consultation/useAppointmentBilling

app/api/consultations/[id]/start/route.ts
├── StartConsultationUseCase
│   ├── IAppointmentRepository → PrismaAppointmentRepository
│   │   └── domain/interfaces/repositories/IAppointmentRepository
│   ├── IConsultationRepository → PrismaConsultationRepository
│   │   └── domain/interfaces/repositories/IConsultationRepository
│   ├── IAuditService → ConsoleAuditService
│   ├── AppointmentStateTransitionService
│   └── domain/entities/Consultation
├── JwtMiddleware
└── domain/exceptions/DomainException

app/api/consultations/[id]/complete/route.ts
├── CompleteConsultationUseCase
│   ├── [Same repository pattern as start]
│   ├── additional: PrismaPatientRepository
│   ├── additional: PrismaPaymentRepository
│   ├── additional: PrismaUserRepository
│   ├── additional: PrismaSurgicalCaseRepository
│   ├── additional: PrismaCasePlanRepository
│   ├── INotificationService → EmailNotificationService
│   └── ScheduleAppointmentDto
├── JwtMiddleware
└── domain/exceptions/DomainException
```

---

## 7. Shared Dependencies

### 7.1 API Client Singleton
All HTTP requests flow through `lib/api/client.ts` (`apiClient`), which provides:
- Token injection
- 401 refresh flow
- Cache-busting
- Retry logic

This is the **only** HTTP transport layer for the consultation module.

### 7.2 Auth Context
`hooks/patient/useAuth` provides authentication state to multiple components. The actual `AuthContext` is shared across the entire application.

### 7.3 React Query Client
`useQueryClient` is shared between:
- `ConsultationContext` (cache invalidation)
- `useSaveConsultationDraft` (mutation cache)
- `useDoctorTodayAppointments` (query cache)

---

## 8. Dependency Strengths

### 8.1 Clean Layering
- Domain has zero framework dependencies
- Application layer depends only on interfaces
- Infrastructure provides concrete implementations

### 8.2 Centralized Data Access
- All API calls go through typed client methods
- All data flows through ConsultationContext

### 8.3 No Circular Dependencies
- Strict top-down dependency flow
- Context is the integration point

---

## 9. Dependency Weaknesses

### 9.1 Context as God Object
`ConsultationContext` imports from 15+ files and is imported by 10+ files. It is the primary integration point.

### 9.2 Direct Prisma Access
API routes and server actions bypass the clean architecture and access `db` directly.

### 9.3 Mixed Client/Server Imports
The context mixes client-side hooks (`useQuery`) with server actions (`updateCompletedConsultationNotes`), creating a hybrid boundary.

### 9.4 Large Component Dependencies
`CompleteConsultationDialog` depends on billing hooks and context, making it hard to test or reuse independently.

---

## 10. Summary

The dependency structure follows Clean Architecture principles with clear layer boundaries. The main integration point is `ConsultationContext`, which coordinates between React Query, server actions, and UI components. Dependencies flow strictly downward from Presentation → Application → Domain, with Infrastructure bridging the gap to the database and API.

The module has no circular dependencies and maintains good separation of concerns at the architectural level. The primary complexity is concentrated in the ConsultationContext, which acts as the central orchestrator.
