# Layer Integrity Remediation

## Scope

This document defines the remediation steps for Layer Integrity violations. Only **LI-001** (Domain → Application circular dependency) is resolved in this PR. All other violations are deferred to subsequent PRs.

---

## Remediation: LI-001 — Remove Application DTO Imports from Domain Ports

### Root Cause

`ConsultationApi` and `PatientApi` Domain interfaces imported Application Layer DTOs as return types. This created a circular dependency: Application Services import Domain interfaces, which import Application DTOs.

### Target Owner

Domain Layer (`domain/interfaces/services/`)

### Migration Approach

**Files modified:**
- `domain/interfaces/services/ConsultationApi.ts`
- `domain/interfaces/services/PatientApi.ts`
- `application/dtos/ConsultationResponseDto.ts` (no change needed)
- `application/dtos/SaveConsultationDraftDto.ts` (no change needed)
- `application/dtos/PatientConsultationHistoryDto.ts` (no change needed)
- `application/dtos/PatientResponseDto.ts` (no change needed)
- `application/dtos/AppointmentResponseDto.ts` (no change needed)
- `application/services/DraftService.ts` (update to use port types directly)
- `lib/api/consultation.ts` (update to map API responses to port types)
- `lib/api/patient.ts` (update to map API responses to port types)
- `lib/api/consultation-adapter.ts` (update to map API responses to port types)
- `lib/api/patient-adapter.ts` (update to map API responses to port types)
- `hooks/consultation/useConsultation.ts` (update imports)
- `hooks/consultation/useSaveConsultationDraft.ts` (update imports)
- `hooks/consultation/usePatientConsultationHistory.ts` (update imports)
- `contexts/ConsultationContext.tsx` (update imports)

**Step 1: Define inline types in Domain ports**

`ConsultationApi.ts` and `PatientApi.ts` currently import 5 DTO types from Application Layer. We replace these imports with inline interfaces defined directly in the port files.

ConsultationApi port types needed:
- `ConsultationResponse` — replaces `ConsultationResponseDto`
- `SaveConsultationDraftResponse` — replaces `ConsultationResponseDto` in save method
- `PatientConsultationHistory` — replaces `PatientConsultationHistoryDto`

PatientApi port types needed:
- `PatientResponse` — replaces `PatientResponseDto`
- `AppointmentResponse` — replaces `AppointmentResponseDto`

These inline types must contain exactly the fields needed by the port methods. They mirror the Application DTOs but live in the Domain port.

**Step 2: Update ConsultationApi.ts**

Remove:
```typescript
import type { ConsultationResponseDto } from '@/application/dtos/ConsultationResponseDto';
import type { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import type { PatientConsultationHistoryDto } from '@/application/dtos/PatientConsultationHistoryDto';
```

Add inline types:
```typescript
export interface ConsultationResponse {
  readonly id: number;
  readonly appointmentId: number;
  readonly doctorId: string;
  readonly userId?: string;
  readonly state: ConsultationState;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly durationMinutes?: number;
  readonly notes?: {
    readonly fullText: string;
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };
  readonly outcomeType?: ConsultationOutcomeType;
  readonly patientDecision?: PatientDecision;
  readonly followUp?: {
    readonly date?: Date;
    readonly type?: string;
    readonly notes?: string;
  };
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly photoCount?: number;
  readonly hasMarketingConsentPhotos?: boolean;
  readonly hasCasePlan?: boolean;
  readonly casePlanId?: number;
}
```

Update method signatures:
```typescript
loadConsultation(appointmentId: number): Promise<ConsultationOutcome<ConsultationResponse | null>>;
saveConsultationDraft(appointmentId: number, dto: SaveConsultationDraftParams): Promise<ConsultationOutcome<ConsultationResponse>>;
loadPatientConsultationHistory(patientId: string): Promise<ConsultationOutcome<PatientConsultationHistory>>;
```

Define `SaveConsultationDraftParams` inline:
```typescript
export interface SaveConsultationDraftParams {
  readonly doctorId: string;
  readonly notes: {
    readonly rawText?: string;
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };
  readonly outcomeType?: ConsultationOutcomeType;
  readonly patientDecision?: PatientDecision;
  readonly versionToken?: string;
}
```

**Step 3: Update PatientApi.ts**

Remove:
```typescript
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
```

Add inline types:
```typescript
export interface PatientResponse {
  readonly id: string;
  readonly fileNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly dateOfBirth: Date;
  readonly age: number;
  readonly gender: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappPhone?: string;
  readonly address?: string;
  readonly occupation?: string;
  readonly maritalStatus?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactNumber?: string;
  readonly relation?: string;
  readonly hasPrivacyConsent: boolean;
  readonly hasServiceConsent: boolean;
  readonly hasMedicalConsent: boolean;
  readonly bloodGroup?: string;
  readonly allergies?: string;
  readonly medicalConditions?: string;
  readonly medicalHistory?: string;
  readonly insuranceProvider?: string;
  readonly insuranceNumber?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly profileImage?: string;
  readonly colorCode?: string;
  readonly lastVisitDate?: string;
  readonly assignedAt?: Date | null;
  readonly visitCount?: number;
}
```

Update method signatures:
```typescript
loadPatient(patientId: string): Promise<PatientOutcome<PatientResponse>>;
loadPatientAppointments(patientId: string): Promise<PatientOutcome<AppointmentResponse[]>>;
loadUpcomingAppointments(patientId: string): Promise<PatientOutcome<AppointmentResponse[]>>;
```

**Important:** `PatientResponseDto`, `AppointmentResponseDto`, `ConsultationResponseDto`, `SaveConsultationDraftDto`, and `PatientConsultationHistoryDto` remain in the Application Layer unchanged. Adapters map between API responses (which may match the DTOs exactly) and the port types.

### Rollback

`git revert <PR-commit>` restores original imports and interface signatures. Adapter mocks remain valid because they use the same field shapes.

### Testing

1. **TypeScript compilation:** `tsc --noEmit --skipLibCheck` must pass.
2. **Unit tests:** All 1,274 unit tests pass.
3. **Frontend tests:** All 10 frontend tests pass.
4. **Circular dependency check:** `madge` reports zero cycles.
5. **Grep verification:** Zero `application/dtos/` imports in `domain/interfaces/services/`.

### Risk

**Medium.** Changing port interface signatures requires updating all consumers in the same PR. However, the changes are additive (rename types, no field changes). Behavioral parity is preserved because the field shapes are identical.

### Verification Commands

```bash
# TypeScript
npx tsc --noEmit --skipLibCheck

# Tests
npm run test:unit
npm run test:frontend

# Circular dependencies
npx madge --circular src/

# Grep verification
grep -r "from '@/application/dtos/" domain/interfaces/services/ || echo "PASS: zero imports"
```

---

## Deferred Remediation

### LI-002: Presentation → Infrastructure (hooks)

**Decision:** Deferred to PR-A02.
**Rationale:** Hooks are thin wrappers around `consultationApi`. Removing the adapter import requires creating Application Use Cases, which is a broader architectural change.

### LI-003: Presentation → Infrastructure (localStorage)

**Decision:** Deferred to PR-A04 (DocumentationProvider extraction).
**Rationale:** `LocalStorageDraftStorage` instantiation in ConsultationContext is only a violation in the context of provider ownership. No Provider exists yet.

### LI-004: Domain → Prisma

**Decision:** Deferred to PR-A06.
**Rationale:** Systemic issue affecting 13 files. Requires type-by-type migration to inline Domain types. Out of scope for a single Layer Integrity PR.

### LI-005: Application → Prisma

**Decision:** Deferred to PR-A07+.
**Rationale:** Application Layer direct DB access is a separate architectural concern from the Domain circular dependency.

### LI-006: Presentation → Infrastructure (ConsultationContext)

**Decision:** Deferred to PR-A02+.
**Rationale:** ConsultationContext contains 1,019 lines of business logic that calls Infrastructure directly. Refactoring it to use Application Services requires SessionService, DoctorApi, and other services that do not yet exist.

---

## PR Completion Criteria

This PR is complete when:
- [ ] `domain/interfaces/services/ConsultationApi.ts` has zero `application/dtos/` imports
- [ ] `domain/interfaces/services/PatientApi.ts` has zero `application/dtos/` imports
- [ ] All consumers compile with inline port types
- [ ] TypeScript passes
- [ ] All unit tests pass
- [ ] All frontend tests pass
- [ ] `madge` reports zero circular dependencies
- [ ] All deferred violations are documented in `layer-integrity-audit.md`
