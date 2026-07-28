# Compatibility Contract Audit

## Executive Summary

This document audits the complete legacy ConsultationContext API contract against the current post-modernization implementation. It identifies every mismatch and prescribes the exact mapping required for a faithful compatibility façade.

**Audit Date:** 2026-07-25  
**Status:** FAILED — Compatibility façade incomplete

---

## 1. Legacy API Contract (Pre-Modernization)

### 1.1 State Properties

| Path | Type | Legacy Name | Notes |
|------|------|-------------|-------|
| `state.workflow.state` | `ConsultationWorkflowState` | `workflow.state` | Nested workflow state |
| `state.workflow.error` | `string \| null` | `workflow.error` | Error message |
| `state.workflow.isDirty` | `boolean` | `workflow.isDirty` | Unsaved changes flag |
| `state.workflow.appointmentId` | `number \| null` | `workflow.appointmentId` | Current appointment |
| `state.workflow.patientId` | `number \| null` | `workflow.patientId` | Current patient |
| `state.workflow.consultationId` | `number \| null` | `workflow.consultationId` | Current consultation |
| `state.workflow.lastSavedAt` | `Date \| null` | `workflow.lastSavedAt` | Last save timestamp |
| `state.appointment` | `AppointmentResponseDto \| null` | `appointment` | Full appointment DTO |
| `state.patient` | `PatientResponseDto \| null` | `patient` | Full patient DTO |
| `state.vitals` | `VitalsData \| null` | `vitals` | Vitals data |
| `state.consultation` | `ConsultationResponseDto \| null` | `consultation` | Consultation record |
| `state.doctorId` | `string \| null` | `doctorId` | Current doctor |
| `state.notes` | `StructuredNotes` | `notes` | Local notes |
| `state.outcomeType` | `ConsultationOutcomeType \| null` | `outcomeType` | Outcome selection |
| `state.patientDecision` | `PatientDecision \| null` | `patientDecision` | Patient decision |
| `state.isLoading` | `boolean` | `isLoading` | Loading flag |
| `state.isSaving` | `boolean` | `isSaving` | Saving flag |
| `state.showCompleteDialog` | `boolean` | `showCompleteDialog` | Dialog visibility |
| `state.showStartDialog` | `boolean` | `showStartDialog` | Dialog visibility |
| `state.autoSaveStatus` | `'idle' \| 'saving' \| 'saved' \| 'error'` | `autoSaveStatus` | Autosave state |

### 1.2 Computed Properties

| Name | Type | Legacy Name | Notes |
|------|------|-------------|-------|
| `isActive` | `boolean` | `isActive` | Consultation in progress |
| `isReadOnly` | `boolean` | `isReadOnly` | Completed/cancelled |
| `canSave` | `boolean` | `canSave` | Has unsaved changes |
| `canComplete` | `boolean` | `canComplete` | Active and not saving |
| `waitingQueue` | `AppointmentResponseDto[]` | `waitingQueue` | Queue list |
| `refetchQueue` | `() => Promise<unknown>` | `refetchQueue` | Queue refresh |
| `isQueueRefetching` | `boolean` | `isQueueRefetching` | Queue loading |
| `loadWaitingQueue` | `() => void` | `loadWaitingQueue` | Queue trigger |

### 1.3 Actions

| Name | Signature | Legacy Name | Owner |
|------|-----------|-------------|-------|
| `loadAppointment` | `(id: number) => Promise<void>` | `loadAppointment` | SessionProvider |
| `startConsultation` | `() => Promise<void>` | `startConsultation` | SessionProvider |
| `closeStartDialog` | `() => void` | `closeStartDialog` | DialogProvider |
| `saveDraft` | `() => Promise<void>` | `saveDraft` | DocumentationProvider |
| `saveNotes` | `() => Promise<void>` | `saveNotes` | DocumentationProvider |
| `updateNotes` | `(field, value) => void` | `updateNotes` | DocumentationProvider |
| `setOutcome` | `(outcome) => void` | `setOutcome` | DocumentationProvider |
| `setPatientDecision` | `(decision) => void` | `setPatientDecision` | DocumentationProvider |
| `openCompleteDialog` | `() => void` | `openCompleteDialog` | DialogProvider |
| `closeCompleteDialog` | `() => void` | `closeCompleteDialog` | DialogProvider |
| `completeConsultation` | `(path?) => Promise<void>` | `completeConsultation` | SessionProvider |
| `switchToPatient` | `(id: number) => void` | `switchToPatient` | SessionProvider |
| `goToSurgeryPlanning` | `() => void` | `goToSurgeryPlanning` | SessionProvider |

### 1.4 Nested Objects Required

| Path | Required Shape |
|------|----------------|
| `state.workflow.state` | `ConsultationWorkflowState` enum value |
| `state.workflow.error` | `string \| null` |
| `state.workflow.isDirty` | `boolean` |
| `state.workflow.appointmentId` | `number \| null` |
| `state.workflow.patientId` | `number \| null` |
| `state.workflow.consultationId` | `number \| null` |
| `state.workflow.lastSavedAt` | `Date \| null` |
| `state.documentation.notes` | `StructuredNotes` (if accessed) |
| `state.billing.total` | `number` (if accessed) |

---

## 2. Current Implementation Audit

### 2.1 Current ConsultationContext (Post-PR-A07-01)

```typescript
interface ConsultationContextValue {
  state: Omit<ConsultationProviderState, 'appointment' | 'patient' | 'vitals'>;
  isActive: boolean;
  isReadOnly: boolean;
  showStartDialog: boolean;
  showCompleteDialog: boolean;
  loadAppointment: (appointmentId: number) => Promise<void>;
  startConsultation: () => Promise<void>;
  closeStartDialog: () => void;
  openCompleteDialog: () => void;
  closeCompleteDialog: () => void;
  completeConsultation: (redirectPath?: string) => Promise<void>;
  switchToPatient: (appointmentId: number) => void;
  goToSurgeryPlanning: () => void;
}
```

### 2.2 Compatibility Matrix

| Legacy Property | Current exposed? | Classification | Gap |
|-----------------|------------------|----------------|-----|
| `state.workflow.state` | ❌ | MISSING | SessionProvider exposes `workflowState`, not nested under `state.workflow` |
| `state.workflow.error` | ⚠️ | REQUIRES MAPPING | Fixed in previous change, now maps `ctx.error` |
| `state.workflow.isDirty` | ❌ | MISSING | Not exposed by SessionProvider |
| `state.workflow.appointmentId` | ❌ | MISSING | Not exposed by SessionProvider |
| `state.workflow.patientId` | ❌ | MISSING | Not exposed by SessionProvider |
| `state.workflow.consultationId` | ❌ | MISSING | Not exposed by SessionProvider |
| `state.workflow.lastSavedAt` | ❌ | MISSING | DocumentationProvider owns this |
| `state.appointment` | ⚠️ | REQUIRES MAPPING | Omitted from `state` type via `Omit<>` |
| `state.patient` | ⚠️ | REQUIRES MAPPING | Omitted from `state` type via `Omit<>` |
| `state.vitals` | ⚠️ | REQUIRES MAPPING | Omitted from `state` type via `Omit<>` |
| `state.consultation` | ⚠️ | REQUIRES MAPPING | Omitted from `state` type via `Omit<>` |
| `state.doctorId` | ⚠️ | REQUIRES MAPPING | Omitted from `state` type via `Omit<>` |
| `state.notes` | ❌ | MISSING | DocumentationProvider owns this |
| `state.outcomeType` | ❌ | MISSING | DocumentationProvider owns this |
| `state.patientDecision` | ❌ | MISSING | DocumentationProvider owns this |
| `state.isLoading` | ⚠️ | REQUIRES MAPPING | Omitted from `state` type via `Omit<>` |
| `state.isSaving` | ❌ | MISSING | DocumentationProvider owns this |
| `state.showCompleteDialog` | ✅ | EXACT MATCH | Mapped to `dialog.isCompleteDialogOpen` |
| `state.showStartDialog` | ✅ | EXACT MATCH | Mapped to `dialog.isStartDialogOpen` |
| `state.autoSaveStatus` | ❌ | MISSING | DocumentationProvider owns this |
| `isActive` | ✅ | EXACT MATCH | Direct from `ctx.isActive` |
| `isReadOnly` | ✅ | EXACT MATCH | Direct from `ctx.isReadOnly` |
| `canSave` | ❌ | MISSING | DocumentationProvider owns this |
| `canComplete` | ❌ | MISSING | Not exposed anywhere |
| `waitingQueue` | ❌ | MISSING | QueueProvider owns this |
| `refetchQueue` | ❌ | MISSING | QueueProvider owns this |
| `isQueueRefetching` | ❌ | MISSING | QueueProvider owns this |
| `loadWaitingQueue` | ❌ | MISSING | QueueProvider owns this |
| `loadAppointment` | ✅ | EXACT MATCH | Maps to `ctx.initializeSession` |
| `startConsultation` | ✅ | EXACT MATCH | Maps to `ctx.startConsultation` |
| `closeStartDialog` | ✅ | EXACT MATCH | Maps to `dialog.closeStartDialog` |
| `saveDraft` | ❌ | MISSING | DocumentationProvider owns this |
| `saveNotes` | ❌ | MISSING | DocumentationProvider owns this |
| `updateNotes` | ❌ | MISSING | DocumentationProvider owns this |
| `setOutcome` | ❌ | MISSING | DocumentationProvider owns this |
| `setPatientDecision` | ❌ | MISSING | DocumentationProvider owns this |
| `openCompleteDialog` | ✅ | EXACT MATCH | Maps to `dialog.openCompleteDialog` |
| `closeCompleteDialog` | ✅ | EXACT MATCH | Maps to `dialog.closeCompleteDialog` |
| `completeConsultation` | ✅ | EXACT MATCH | Maps to `ctx.completeSession` |
| `switchToPatient` | ✅ | EXACT MATCH | Maps to `ctx.switchToPatient` |
| `goToSurgeryPlanning` | ✅ | EXACT MATCH | Maps to `ctx.goToSurgeryPlanning` |

### 2.3 Current Consumer Access

| Consumer | Properties Accessed | Compatible? |
|----------|-------------------|-------------|
| `page.tsx` | `state.workflow.error`, `state.consultation`, `state.doctorId`, `isActive`, `isReadOnly`, `startConsultation`, `closeStartDialog`, `openCompleteDialog`, `closeCompleteDialog`, `completeConsultation`, `switchToPatient`, `goToSurgeryPlanning` | ⚠️ Partial — `state.workflow.error` fixed, but `state.appointment`, `state.patient`, `state.vitals`, `state.notes` etc. would fail if accessed |
| `ConsultationWorkspaceOptimized` | `state`, `state.consultation`, `isActive`, `isReadOnly`, `openCompleteDialog` | ⚠️ Partial — `state` is `any` cast, but nested legacy shapes missing |

---

## 3. Gap Analysis

### 3.1 Critical Gaps (Current Consumers Would Fail)

| Gap | Consumer Impact | Severity |
|------|-----------------|----------|
| `state.workflow.state` missing | Any consumer checking workflow state | HIGH |
| `state.workflow.error` missing | page.tsx error handling | HIGH |
| `state.appointment` missing | Omitted from current `state` type | MEDIUM |
| `state.patient` missing | Omitted from current `state` type | MEDIUM |
| `state.vitals` missing | Omitted from current `state` type | MEDIUM |
| `state.consultation` missing | Omitted from current `state` type | MEDIUM |
| `state.doctorId` missing | Omitted from current `state` type | MEDIUM |
| `state.isLoading` missing | Omitted from current `state` type | MEDIUM |

### 3.2 Non-Critical Gaps (No Current Consumer, But Legacy API Had Them)

| Gap | Legacy Usage | Severity |
|------|--------------|----------|
| `state.notes` | ConsultationWorkspaceOptimized (old) | LOW |
| `state.outcomeType` | Old ConsultationContext | LOW |
| `state.patientDecision` | Old ConsultationContext | LOW |
| `state.isSaving` | Old ConsultationContext | LOW |
| `state.autoSaveStatus` | Old ConsultationContext | LOW |
| `state.workflow.isDirty` | Old ConsultationContext | LOW |
| `state.workflow.appointmentId` | Old ConsultationContext | LOW |
| `state.workflow.patientId` | Old ConsultationContext | LOW |
| `state.workflow.consultationId` | Old ConsultationContext | LOW |
| `state.workflow.lastSavedAt` | Old ConsultationContext | LOW |
| `canSave` | Old ConsultationContext | LOW |
| `canComplete` | Old ConsultationContext | LOW |
| `waitingQueue` | Old page.tsx | LOW |
| `refetchQueue` | Old page.tsx | LOW |
| `isQueueRefetching` | Old page.tsx | LOW |
| `loadWaitingQueue` | Old page.tsx | LOW |
| `saveDraft` | Old ConsultationContext | LOW |
| `saveNotes` | Old ConsultationContext | LOW |
| `updateNotes` | Old ConsultationContext | LOW |
| `setOutcome` | Old ConsultationContext | LOW |
| `setPatientDecision` | Old ConsultationContext | LOW |

---

## 4. Required Fixes

### 4.1 Must Fix (Current Consumers)

1. Rebuild `state` object with full legacy nested shape
2. Map `state.workflow.state` → `ctx.workflowState`
3. Map `state.workflow.error` → `ctx.error`
4. Include `state.appointment`, `state.patient`, `state.vitals`, `state.consultation`, `state.doctorId`, `state.isLoading`
5. Add `canSave`, `canComplete` computed properties
6. Add `waitingQueue`, `refetchQueue`, `isQueueRefetching`, `loadWaitingQueue` from QueueProvider
7. Add `saveDraft`, `saveNotes`, `updateNotes`, `setOutcome`, `setPatientDecision` from DocumentationProvider
8. Add `state.notes`, `state.outcomeType`, `state.patientDecision`, `state.isSaving`, `state.autoSaveStatus` from DocumentationProvider

### 4.2 Should Fix (API Completeness)

9. Add `state.workflow.isDirty`, `state.workflow.appointmentId`, `state.workflow.patientId`, `state.workflow.consultationId`, `state.workflow.lastSavedAt`

### 4.3 Nice to Have

10. Ensure `showCompleteDialog` and `showStartDialog` are on `state` (currently top-level)
