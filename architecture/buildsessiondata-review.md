# buildSessionData() Review

## Executive Summary

Audit of the `buildSessionData()` private method in `SessionService`. Determines whether it has become a God DTO anti-pattern and provides recommendations on whether the DTO should be split.

**Date:** 2026-07-25  
**Status:** AUDIT COMPLETE

---

## 1. Method Signature

```typescript
private buildSessionData(
  appointment: SessionData['appointment'],
  patient: SessionData['patient'],
  consultation: SessionData['consultation'],
  doctorId: string,
  workflowState: ConsultationWorkflowState,
  isDirty: boolean,
  notes: StructuredNotes = {},
  outcomeType: ConsultationOutcomeType | null = null,
  patientDecision: PatientDecision | null = null,
): SessionData
```

**Location:** `application/services/SessionService.ts` line 621  
**Visibility:** Private  
**Call Sites:** 3
- `initializeSession()` — all fields explicitly passed
- `startSession()` — all fields explicitly passed
- `resumeSession()` — all fields explicitly passed
- `cancelCompletion()` — inline object literal (does NOT use `buildSessionData`)
- `switchSession()` — delegates to `initializeSession()`
- `advanceQueue()` — delegates to `initializeSession()`

---

## 2. Required Fields (Must be provided, no default)

| Parameter | Type | Required | Source |
|-----------|------|----------|--------|
| `appointment` | `SessionData['appointment']` | Yes | `doctorApi.getAppointment()` |
| `patient` | `SessionData['patient']` | Yes | `patientApi.loadPatient()` |
| `consultation` | `SessionData['consultation']` | Yes | `consultationApi.loadConsultation()` |
| `doctorId` | `string` | Yes | `doctorApi.getDoctorByUserId()` or `consultation.doctorId` |
| `workflowState` | `ConsultationWorkflowState` | Yes | `WorkflowCoordinator.execute()` |
| `isDirty` | `boolean` | Yes | Draft service restore result |

**Count:** 6 required parameters

---

## 3. Optional Fields (Have defaults)

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| `notes` | `StructuredNotes` | `{}` | Consultation record or draft restore |
| `outcomeType` | `ConsultationOutcomeType \| null` | `null` | Consultation record |
| `patientDecision` | `PatientDecision \| null` | `null` | Consultation record |

**Count:** 3 optional parameters with safe defaults

---

## 4. Derived Fields (Computed inside buildSessionData)

| Field | Value | Computation |
|-------|-------|-------------|
| `vitals` | `null` | Hardcoded `null`. NOT fetched in `startSession`/`resumeSession` because patient doesn't change. |
| `draftAvailable` | `false` | Hardcoded `false`. SessionService doesn't track draft availability after init. |

**Count:** 2 derived/hardcoded fields

---

## 5. Presentation-Only Fields (Should NOT be in SessionData)

| Field | Current Location | Correct Owner | Issue |
|-------|-----------------|---------------|-------|
| `showCompleteDialog` | `DialogProvider` | `DialogProvider` | Not in SessionData — correct |
| `showStartDialog` | `DialogProvider` | `DialogProvider` | Not in SessionData — correct |
| `canSave` | `ConsultationContext` | Derived from `docs.isDirty` | Not in SessionData — correct |
| `canComplete` | `ConsultationContext` | Derived from `isActive && !isSaving` | Not in SessionData — correct |

**Assessment:** No presentation-only fields are leaking into SessionData.

---

## 6. God DTO Assessment

### 6.1 Criteria Evaluation

| Criterion | Score | Evidence |
|-----------|-------|----------|
| Number of fields | ✅ 11 fields | Modest count for a session state carrier |
| Number of owners | ✅ 2-3 owners | SessionService (orchestration), DocumentationProvider (docs), WorkflowCoordinator (state machine) |
| Field volatility | ✅ Low | Fields change infrequently; core schema is stable |
| Consumer coupling | ✅ Low | Only `SessionProvider` consumes SessionData to initialize child providers |
| Single responsibility | ✅ Yes | SessionData represents "what a consultation session needs to start" |

### 6.2 Verdict: NOT a God DTO

`buildSessionData()` is a **session state constructor**. It aggregates data from multiple sources (APIs, coordinator, draft service) into a single immutable snapshot that `SessionProvider` uses to initialize the consultation room.

A God DTO would:
- Carry UI state (dialogs, form dirty flags)
- Carry transient cache state
- Be mutated by multiple subsystems
- Have 20+ fields from unrelated domains

`SessionData` has none of these characteristics.

---

## 7. Field Classification Summary

| Field | Classification | Owner | Required in buildSessionData |
|-------|---------------|-------|------------------------------|
| `appointment` | Core session | SessionService | Yes |
| `patient` | Core session | SessionService | Yes |
| `vitals` | Core session | SessionService | Derived (null) |
| `consultation` | Core session | SessionService | Yes |
| `doctorId` | Core session | SessionService | Yes |
| `workflowState` | Lifecycle | WorkflowCoordinator | Yes |
| `isDirty` | Session metadata | DraftService | Yes |
| `draftAvailable` | Session metadata | DraftService | Derived (false) |
| `notes` | Documentation | DocumentationProvider | Optional (initial value) |
| `outcomeType` | Documentation | DocumentationProvider | Optional (initial value) |
| `patientDecision` | Documentation | DocumentationProvider | Optional (initial value) |

---

## 8. Recommendations

### 8.1 Do NOT split SessionData

`SessionData` is appropriately scoped. It carries the minimal state required to bootstrap a consultation session. Splitting it would:
- Add unnecessary indirection
- Complicate `SessionProvider` initialization
- Create artificial boundaries between fields that are always needed together

### 8.2 Do NOT move documentation fields out

`notes`, `outcomeType`, and `patientDecision` belong in `SessionData` as **initial values**. The pattern is:
1. `SessionService` reads them from the consultation record during initialization
2. Passes them through `SessionData` to `SessionProvider`
3. `SessionProvider` passes them to `DocumentationProvider` as initial state
4. `DocumentationProvider` owns and manages them thereafter

This is read-through, not ownership duplication.

### 8.3 Document the ownership contract

Add a JSDoc comment to `SessionData` and `buildSessionData()` clarifying:
- Which fields are "session orchestration" (owned by SessionService)
- Which fields are "documentation initial values" (owned by DocumentationProvider, read by SessionService)
- Which fields are "derived" (hardcoded in buildSessionData)

---

## 9. Certification

**Status:** AUDIT COMPLETE

- `buildSessionData()` is NOT a God DTO
- SessionData has 11 fields with clear ownership boundaries
- 3 documentation fields are appropriately passed as initial values with safe defaults
- No presentation-only fields leak into the DTO
- **Recommendation: No structural changes needed**
