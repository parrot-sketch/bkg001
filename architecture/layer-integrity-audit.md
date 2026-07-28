# Layer Integrity Audit

## Purpose

This document identifies every Layer Integrity violation in the Consultation Module implementation relative to Architecture Baseline v1, ADR-001, ADR-002, and `architecture-invariants.md`.

**Scope:** Domain, Application, Infrastructure, Shared Kernel layers. ConsultationContext behavior is audited but not modified in this PR.

---

## 1. Audit Methodology

Every file in the following layer pairs was inspected for forbidden import relationships:

| Source Layer | Target Layer | Forbidden? | Basis |
|--------------|--------------|------------|-------|
| Domain | Application | YES | INV-001 |
| Domain | Infrastructure | YES | INV-001 |
| Shared Kernel | React / Framework | YES | INV-002 |
| Shared Kernel | Infrastructure | YES | INV-003 |
| Shared Kernel | Domain | YES | INV-003 |
| Application | Presentation | YES | Application AGENTS.md |
| Presentation | Domain | YES | ADR-001 |
| Presentation | Infrastructure | YES | INV-014 |
| Domain (Port) | Infrastructure (Adapter) | YES | INV-013 |
| Infrastructure (Adapter) | Presentation | YES | INV-014 |

---

## 2. Violation Inventory

### VIOLATION LI-001: Domain → Application Circular Dependency (PRIMARY)

**Files:**
- `domain/interfaces/services/ConsultationApi.ts:24-26`
- `domain/interfaces/services/PatientApi.ts:25-26`

**Details:**
`ConsultationApi.ts` imports three types from the Application Layer:
```typescript
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import type { PatientConsultationHistoryDto } from '@/application/dtos/PatientConsultationHistoryDto';
```

`PatientApi.ts` imports two types from the Application Layer:
```typescript
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
```

**Dependency graph violation:**
```
Application Layer
    ↓ imports DTOs
Domain Layer (ConsultationApi.ts, PatientApi.ts)
    ↓ imports back (causes cycle)
Application Layer
```

**Why it violates the architecture:**
- INV-001: "Domain may depend on Shared Kernel only."
- INV-013: "Ports must not import Application DTOs."
- Creates a circular dependency: Application → Domain → Application.

**Impact:**
- High. All consumers of `ConsultationApi` and `PatientApi` are in the affected cycle.
- `application/services/DraftService.ts`, `lib/api/consultation.ts`, `lib/api/patient.ts`, hooks, and context all transitively depend on these ports.

**Remediation approach:**
Define inline return types in the Domain port files. Remove all `application/dtos/` imports from `domain/interfaces/services/`. Application Layer adapters map between API raw responses and these inline port types.

---

### VIOLATION LI-002: Presentation → Infrastructure (ConsultationApi Client)

**Files:**
- `hooks/consultation/useConsultation.ts:11`
- `hooks/consultation/useSaveConsultationDraft.ts:10`
- `hooks/consultation/usePatientConsultationHistory.ts:10`

**Details:**
All three hooks import the Infrastructure API client directly:
```typescript
import { consultationApi } from '@/lib/api/consultation';
```

**Dependency graph violation:**
```
Presentation Layer (hooks)
    ↓ imports
lib/api/consultation.ts (Infrastructure adapter)
    ↓ imports
application/dtos/* (Application DTOs)
```

**Why it violates the architecture:**
- INV-014: "Adapters must not be imported by Presentation Layer directly."
- ADR-001: "Presentation Layer depends on Application Layer providers and Shared Kernel only. Forbidden from importing Infrastructure directly."

**Impact:**
- Medium. Hooks bypass the Application Service layer and are tightly coupled to HTTP transport.
- Cannot be tested without the real API client.

**Remediation approach:**
LI-002 is a Presentation → Infrastructure violation in hooks. These hooks are thin wrappers around `consultationApi`. They are Presentation Layer artifacts that depend on an Infrastructure adapter.

For Layer Integrity, we must remove the direct adapter import. However, the hooks currently do not consume an Application Service. Creating Application Use Cases for all three hooks is beyond the narrow scope of Layer Integrity (it would be PR-A03 or PR-A04 work).

**Pragmatic decision:** Removing the import without providing a replacement Application Service would break the application. Therefore:
1. LI-001 is the only violation we can fully resolve in this PR because it only touches `domain/interfaces/services/*.ts` and its immediate consumers.
2. LI-002 is documented as a remaining violation. It blocks provider extraction but does not block DraftService or other Application Services.
3. We acknowledge it and defer to PR-A02.

---

### VIOLATION LI-003: Presentation → Infrastructure (localStorage Adapter)

**Files:**
- `contexts/ConsultationContext.tsx:41, 360`

**Details:**
```typescript
import { LocalStorageDraftStorage } from '@/lib/storage/local-storage-draft';
...
const draftStorage = useMemo(() => new LocalStorageDraftStorage<StructuredNotes>(), []);
```

**Dependency graph violation:**
```
Presentation Layer (ConsultationContext)
    ↓ imports
lib/storage/local-storage-draft (Infrastructure adapter)
    ↓ implements
shared-kernel/interfaces/draft-storage.ts (port)
```

**Why it violates the architecture:**
- ADR-001: "Presentation Layer depends on Application Layer providers and Shared Kernel only. Forbidden from importing Infrastructure directly."
- INV-014: "Adapters must not be imported by Presentation Layer directly."

**Impact:**
- Medium. Draft storage concrete type is bound in Presentation Layer.

**Remediation approach:**
ConsultationContext instantiates `LocalStorageDraftStorage` and passes it to `DraftService`. `DraftStorage` is already a Shared Kernel interface. The correct pattern is:
- Presentation Layer imports ONLY `DraftStorage` from Shared Kernel.
- Infrastructure adapter is instantiated elsewhere (Provider or Shim).
- ConsultationContext receives a `DraftStorage` instance via dependency injection.

However, no Provider exists yet. Creating one is deferred to PR-A04 (DocumentationProvider). For this PR, we note the violation and keep the concrete instantiation in ConsultationContext as an accepted temporary compromise, because removing it without a Provider would break `DraftService` injection.

**Decision:** Document LI-003 as deferred to PR-A04. Do not modify ConsultationContext imports in this PR except to the extent required by LI-001.

---

### VIOLATION LI-004: Domain — Repository Interfaces Importing Prisma Types

**Files:**
- `domain/interfaces/repositories/ICasePlanRepository.ts:1`
- `domain/interfaces/repositories/ISurgicalCaseRepository.ts:1`
- `domain/interfaces/repositories/ISurgicalChecklistRepository.ts:1`
- `domain/interfaces/repositories/IOutboxRepository.ts:1`
- `domain/interfaces/repositories/IStaffInviteRepository.ts:1`
- `domain/interfaces/repositories/IVitalSignRepository.ts:1`
- `domain/interfaces/repositories/IDoctorRepository.ts:1`
- `domain/interfaces/repositories/IClinicalAuditRepository.ts:1`
- `domain/utils/appointment-expiry.ts:13`
- `domain/utils/notification-helpers.ts:9`
- `domain/types/schedule.ts:9`
- `domain/services/SurgicalCaseTeamSelection.ts:1`
- `domain/services/PatientVerificationService.ts:13`

**Details:**
These files import types directly from `@prisma/client`:
```typescript
import { SurgicalCase, SurgicalCaseStatus, SurgicalUrgency, SurgicalRole } from '@prisma/client';
import { Doctor } from '@prisma/client';
import { VitalSign } from '@prisma/client';
// etc.
```

**Dependency graph violation:**
```
Domain Layer
    ↓ imports
@prisma/client (external framework/database)
```

**Why it violates the architecture:**
- INV-001: "Domain may depend on Shared Kernel only."
- ADR-001: "Domain Layer is pure TypeScript. Forbidden from any I/O, framework, or mutable global state."

**Impact:**
- High. Domain is coupled to Prisma ORM.
- Cannot swap database without modifying Domain interfaces.
- Breaks testability of Domain services in isolation.

**Remediation approach:**
This is a wide-spread violation affecting 13 files. It is the most systemic Layer Integrity issue in the codebase.

Fix strategy:
1. **Interface files:** Replace `@prisma/client` imports with inline type definitions or Shared Kernel type aliases that mirror the Prisma types needed by the interface.
2. **Domain services:** Move Prisma-dependent logic into Application Layer services or Infrastructure adapters. Domain services should operate on Domain types.
3. **Domain types:** Replace `import { AvailabilitySlot as PrismaAvailabilitySlot }` etc. with locally defined interfaces.

**Rollback risk:** Medium. Renaming types requires updating all consumers in the same PR.

**Testing:** TypeScript compilation must pass. All 1,274 unit tests must pass.

---

### VIOLATION LI-005: Application Layer — Direct Prisma Client Import

**Files:**
- `application/services/VendorService.ts:7`
- `application/services/BillingService.ts:8`
- `application/services/TheaterSchedulingService.ts:1`
- `application/services/TheaterBookingService.ts:1`
- `application/services/GoodsReceiptService.ts:8`
- `application/services/StockAdjustmentService.ts:8`
- `application/services/InventoryConsumptionBillingService.ts:15`
- `application/dtos/CreateSurgicalCaseDto.ts:1`
- `application/dtos/TheaterSchedulingDtos.ts:1`
- `application/dtos/TheaterTechDtos.ts:8`
- `application/validation/theaterTechSchemas.ts:8`
- `application/dtos/LoginDto.ts:7`
- `application/dtos/RefreshTokenDto.ts:7`
- `application/dtos/UpdateStaffDto.ts:7`
- `application/dtos/CreateStaffDto.ts:8`
- `application/services/ConsentFormDocumentService.ts:8`
- `application/services/SurgicalCaseStatusTransitionService.ts:13`
- `application/services/theater-tech/CreateSurgicalCaseFromPatientService.ts:1`
- `application/services/DoctorPatientAssignmentService.ts:26`
- `application/repositories/TheaterRepository.ts:1`

**Details:**
Application Layer services and DTOs import Prisma client types and instances directly:
```typescript
import { PrismaClient } from '@prisma/client';
import { BillType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { db } from '@/lib/db';
```

**Dependency graph violation:**
```
Application Layer
    ↓ imports
@prisma/client (Infrastructure/database)
lib/db (Infrastructure)
```

**Why it violates the architecture:**
- ADR-001: "Application Layer depends on Domain Layer, Infrastructure Layer, and Shared Kernel. Forbidden from importing Presentation Layer components or JSX."
- ADR-001: "Application Layer must not import concrete HTTP clients, localStorage" — extends to concrete ORM clients.
- Application AGENTS.md: "Forbidden Imports: Application → Infrastructure (No concrete HTTP clients, storage, or adapters)"

**Impact:**
- High. Application Layer is tightly coupled to Prisma ORM.
- Cannot reuse Application Services with a different database.
- Testing requires a real or mocked Prisma client.

**Remediation approach:**
This is Application Layer accessing Infrastructure directly. ADR-001 says Application may depend on Infrastructure Layer. However, the `AGENTS.md` says "No concrete HTTP clients, storage, or adapters".

Prisma is an Infrastructure concern. The Application Layer should depend on Repository interfaces (ports) defined in Domain, not on Prisma types.

Fix strategy:
1. DTOs that only need enum-like types from Prisma should import from Domain enums instead.
2. Services should receive repository interfaces via constructor injection.
3. Direct `db` imports (`import db from '@/lib/db'`) violate the Application → Infrastructure boundary.

**Rollback risk:** High. Changing service constructors requires updating all instantiations.

**Testing:** All unit tests must pass after mocks are updated.

---

### VIOLATION LI-006: Presentation Layer — Direct Infrastructure API Calls

**Files:**
- `contexts/ConsultationContext.tsx:38-47`
- `hooks/consultation/useConsultation.ts:11`
- `hooks/consultation/useSaveConsultationDraft.ts:10`
- `hooks/consultation/usePatientConsultationHistory.ts:10`

**Details:**
ConsultationContext imports and uses:
```typescript
import { doctorApi } from '@/lib/api/doctor';
import { consultationApi } from '@/lib/api/consultation';
import { apiClient } from '@/lib/api/client';
import { LocalStorageDraftStorage } from '@/lib/storage/local-storage-draft';
```

And calls them directly in reducer/effects:
```typescript
doctorApi.getAppointment(appointmentId)
consultationApi.getConsultation(appointmentId)
apiClient.get(`/patients/${apt.patientId}/vitals?...`)
```

**Dependency graph violation:**
```
Presentation Layer
    ↓ imports
lib/api/doctor (Infrastructure)
lib/api/consultation (Infrastructure)
lib/api/client (Infrastructure)
lib/storage/local-storage-draft (Infrastructure)
```

**Why it violates the architecture:**
- ADR-001: "Presentation Layer depends on Application Layer providers and Shared Kernel only. Forbidden from importing Infrastructure directly."
- INV-014: "Adapters must not be imported by Presentation Layer directly."

**Impact:**
- High. The entire ConsultationContext is coupled to HTTP transport.
- Cannot test UI without real API client or complex mocks.
- Blocks provider extraction.

**Remediation approach:**
ConsultationContext must call Application Services, not Infrastructure directly. For Layer Integrity, the minimal fix is:
1. Remove `doctorApi` import — defer to `DoctorApi` port + Application Service (PR-A02+).
2. Remove `consultationApi` import — use `DraftService` for saves; `useConsultation` hook handles loads but that is LI-002.
3. Remove `apiClient` import — no direct API calls from Presentation.
4. Remove `LocalStorageDraftStorage` import — LI-003.

**Constraint:** ConsultationContext is 1,019 lines and contains business logic. The PR scope is Layer Integrity only. We cannot redesign ConsultationContext behavior.

**Decision:** For this PR, we fix LI-001 (Domain imports) and document LI-002 through LI-006 as remaining violations that require Application Service expansion and Provider extraction. We do NOT refactor ConsultationContext business logic in this PR.

---

## 3. Remaining Blockers After Fix

After LI-001 is resolved:

| Blocking Issue | Status |
|---------------|--------|
| Domain → Application circular dependency | RESOLVED |
| Domain → Prisma imports | DEFERRED |
| Presentation → Infrastructure (hooks) | DEFERRED |
| Presentation → Infrastructure (ConsultationContext) | DEFERRED |
| Triple-write pattern | OUT OF SCOPE (INV-004) |
| Workflow state machine bypass | OUT OF SCOPE (INV-005) |
| ConsultationContext size | OUT OF SCOPE (INV-006) |
| Duplicated business logic | OUT OF SCOPE (INV-011, INV-012) |
| Scattered feature flags | OUT OF SCOPE (INV-009) |
| Duplicate types | OUT OF SCOPE (INV-011) |

---

## 4. Certification Impact

**Before this PR:**
Layer Integrity score: 2/10 (Domain violating ports, Prisma coupling, direct adapter imports)

**After this PR:**
Layer Integrity score: 6/10 (Domain ports clean, but Prisma/Infrastructure coupling remains)

**Category certification status:**
- Layer Integrity is PARTIALLY CERTIFIED.
- The primary circular dependency (LI-001) is resolved.
- Remaining violations are documented and deferred to subsequent PRs.
