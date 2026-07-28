# Property Mapping Table

## Executive Summary

This table maps every property exposed by the legacy `ConsultationContext` to its current implementation source. It serves as the definitive reference for the compatibility façade reconstruction.

**Date:** 2026-07-25  
**Status:** COMPLETE

---

## 1. State Properties Mapping

| Legacy Path | Legacy Type | Current Source | Current Path | Mapping Type |
|-------------|-------------|----------------|--------------|--------------|
| `state.workflow.state` | `ConsultationWorkflowState` | SessionProvider | `workflowState` | 🔁 Renamed + Nested |
| `state.workflow.error` | `string \| null` | SessionProvider | `error` | 🔁 Renamed + Nested |
| `state.workflow.isDirty` | `boolean` | DocumentationProvider | `isDirty` | 🔁 Renamed + Nested |
| `state.workflow.appointmentId` | `number \| null` | SessionProvider | `appointment?.id` | ⚠ Requires Mapping |
| `state.workflow.patientId` | `string \| null` | SessionProvider | `patient?.id` | ⚠ Requires Mapping |
| `state.workflow.consultationId` | `number \| null` | SessionProvider | `consultation?.id` | ⚠ Requires Mapping |
| `state.workflow.lastSavedAt` | `Date \| null` | DocumentationProvider | `lastSavedAt` | ⚠ Requires Mapping + Type Convert |
| `state.appointment` | `AppointmentResponseDto \| null` | SessionProvider | `appointment` | ✅ Exact Match |
| `state.patient` | `PatientResponseDto \| null` | SessionProvider | `patient` | ✅ Exact Match |
| `state.vitals` | `VitalsData \| null` | SessionProvider | `vitals` | ✅ Exact Match |
| `state.consultation` | `ConsultationResponseDto \| null` | SessionProvider | `consultation` | ✅ Exact Match |
| `state.doctorId` | `string \| null` | SessionProvider | `doctorId` | ✅ Exact Match |
| `state.notes` | `StructuredNotes` | DocumentationProvider | `notes` | ✅ Exact Match |
| `state.outcomeType` | `ConsultationOutcomeType \| null` | DocumentationProvider | `outcomeType` | ✅ Exact Match |
| `state.patientDecision` | `PatientDecision \| null` | DocumentationProvider | `patientDecision` | ✅ Exact Match |
| `state.isLoading` | `boolean` | SessionProvider | `isLoading` | ✅ Exact Match |
| `state.isSaving` | `boolean` | DocumentationProvider | `isSaving` | ✅ Exact Match |
| `state.showCompleteDialog` | `boolean` | DialogProvider | `isCompleteDialogOpen` | 🔁 Renamed |
| `state.showStartDialog` | `boolean` | DialogProvider | `isStartDialogOpen` | 🔁 Renamed |
| `state.autoSaveStatus` | `'idle' \| 'saving' \| 'saved' \| 'error'` | DocumentationProvider | `autoSaveStatus` | ✅ Exact Match |

### 1.1 Mapping Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Property name and type match exactly |
| 🔁 | Property name or nesting has changed |
| ⚠ | Requires transformation or derivation |

---

## 2. Computed Properties Mapping

| Legacy Property | Legacy Type | Current Source | Calculation | Mapping Type |
|-----------------|-------------|----------------|-------------|--------------|
| `isActive` | `boolean` | SessionProvider | `!completed && consultation.state === IN_PROGRESS` | ✅ Exact Match |
| `isReadOnly` | `boolean` | SessionProvider | `completed || consultation.state === COMPLETED` | ✅ Exact Match |
| `canSave` | `boolean` | Derived | `docs.isDirty` | ⚠ Derived |
| `canComplete` | `boolean` | Derived | `isActive && !isSaving` | ⚠ Derived |
| `waitingQueue` | `AppointmentResponseDto[]` | QueueProvider | Filtered from today's appointments | ✅ Exact Match |
| `refetchQueue` | `() => Promise<unknown>` | QueueProvider | React Query refetch function | ✅ Exact Match |
| `isQueueRefetching` | `boolean` | QueueProvider | React Query isRefetching | ✅ Exact Match |
| `loadWaitingQueue` | `() => void` | QueueProvider | Triggers queue data load | ✅ Exact Match |

---

## 3. Actions Mapping

| Legacy Action | Legacy Signature | Current Source | Current Signature | Mapping Type |
|---------------|------------------|----------------|------------------|--------------|
| `loadAppointment` | `(id: number) => Promise<void>` | SessionProvider | `initializeSession(id)` | 🔁 Renamed |
| `startConsultation` | `() => Promise<void>` | SessionProvider | `startConsultation()` | ✅ Exact Match |
| `closeStartDialog` | `() => void` | DialogProvider | `closeStartDialog()` | ✅ Exact Match |
| `saveDraft` | `() => Promise<void>` | DocumentationProvider | `saveDraft()` | ✅ Exact Match |
| `saveNotes` | `() => Promise<void>` | DocumentationProvider | `saveNotes()` | ✅ Exact Match |
| `updateNotes` | `(field, value) => void` | DocumentationProvider | `updateNotes(field, value)` | ✅ Exact Match |
| `setOutcome` | `(outcome) => void` | DocumentationProvider | `setOutcome(outcome)` | ✅ Exact Match |
| `setPatientDecision` | `(decision) => void` | DocumentationProvider | `setPatientDecision(decision)` | ✅ Exact Match |
| `openCompleteDialog` | `() => void` | DialogProvider | `openCompleteDialog()` | ✅ Exact Match |
| `closeCompleteDialog` | `() => void` | DialogProvider | `closeCompleteDialog()` | ✅ Exact Match |
| `completeConsultation` | `(redirectPath?: string) => Promise<void>` | SessionProvider | `completeSession(redirectPath?)` | 🔁 Renamed |
| `switchToPatient` | `(appointmentId: number) => void` | SessionProvider | `switchToPatient(id)` | ⚠ Return type changed |
| `goToSurgeryPlanning` | `() => void` | SessionProvider | `goToSurgeryPlanning()` | ✅ Exact Match |

### 3.1 Action Compatibility Notes

- `setOutcome` has identical side effect: sets `PatientDecision.YES` when outcome is `PROCEDURE_RECOMMENDED`
- `switchToPatient` return type changed from `void` to `Promise<void>` due to provider modernization. Consumers do not use the return value.
- `completeConsultation` delegates to `SessionService.completeSession` which provides equivalent behavior with cache invalidation

---

## 4. Type Conversions

| Legacy Type | Provider Type | Conversion | Location |
|-------------|---------------|------------|----------|
| `Date \| null` (lastSavedAt) | `string \| null` | `new Date(string)` or `null` | ConsultationContext |
| `string` (workflow.state) | `ConsultationWorkflowState` enum | Direct assignment (enum is string) | ConsultationContext |
| `number \| null` (appointmentId) | `AppointmentResponseDto?.id` | `?? null` fallback | ConsultationContext |
| `string \| null` (patientId) | `PatientResponseDto?.id` | `?? null` fallback | ConsultationContext |
| `number \| null` (consultationId) | `ConsultationResponseDto?.id` | `?? null` fallback | ConsultationContext |

---

## 5. Default Values

| Property | Legacy Default | Current Default | Match? |
|----------|---------------|----------------|--------|
| `state.workflow.state` | `IDLE` (or `LOADING` if appointmentId) | `IDLE` (or `LOADING` if appointmentId) | ✅ |
| `state.workflow.error` | `null` | `null` | ✅ |
| `state.workflow.isDirty` | `false` | `false` | ✅ |
| `state.workflow.appointmentId` | `null` (or appointmentId) | `null` (or appointmentId) | ✅ |
| `state.workflow.patientId` | `null` | `null` | ✅ |
| `state.workflow.consultationId` | `null` | `null` | ✅ |
| `state.workflow.lastSavedAt` | `null` | `null` | ✅ |
| `state.appointment` | `null` | `null` | ✅ |
| `state.patient` | `null` | `null` | ✅ |
| `state.vitals` | `null` | `null` | ✅ |
| `state.consultation` | `null` | `null` | ✅ |
| `state.doctorId` | `null` | `null` | ✅ |
| `state.notes` | `{}` | `{}` | ✅ |
| `state.outcomeType` | `null` | `null` | ✅ |
| `state.patientDecision` | `null` | `null` | ✅ |
| `state.isLoading` | `false` | `false` | ✅ |
| `state.isSaving` | `false` | `false` | ✅ |
| `state.showCompleteDialog` | `false` | `false` | ✅ |
| `state.showStartDialog` | `false` | `false` | ✅ |
| `state.autoSaveStatus` | `'idle'` | `'idle'` | ✅ |
| `isActive` | `false` | `false` | ✅ |
| `isReadOnly` | `false` | `false` | ✅ |
| `canSave` | `false` | `false` | ✅ |
| `canComplete` | `false` | `false` | ✅ |
| `waitingQueue` | `[]` | `[]` | ✅ |
| `isQueueRefetching` | `false` | `false` | ✅ |

---

## 6. Certification

**Status:** COMPLETE

All 20 state properties, 8 computed properties, and 13 actions have been mapped and verified. The compatibility façade correctly reconstructs the complete legacy API contract.
