# Compatibility Mapping Matrix

## Executive Summary

This matrix maps every legacy ConsultationContext property to its current implementation source. It serves as the definitive reference for the compatibility façade reconstruction.

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
| `state.workflow.lastSavedAt` | `Date \| null` | DocumentationProvider | `lastSavedAt` | 🔁 Renamed + Nested |
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
| `state.autoSaveStatus` | `'idle' | 'saving' | 'saved' | 'error'` | DocumentationProvider | `autoSaveStatus` | ✅ Exact Match |

---

## 2. Computed Properties Mapping

| Legacy Property | Legacy Type | Current Source | Current Path | Mapping Type |
|-----------------|-------------|----------------|--------------|--------------|
| `isActive` | `boolean` | SessionProvider | `isActive` | ✅ Exact Match |
| `isReadOnly` | `boolean` | SessionProvider | `isReadOnly` | ✅ Exact Match |
| `canSave` | `boolean` | DocumentationProvider | `isDirty` | ⚠ Requires Mapping |
| `canComplete` | `boolean` | Derived | `isActive && !isSaving` | ⚠ Derived |
| `waitingQueue` | `AppointmentResponseDto[]` | QueueProvider | `waitingQueue` | ✅ Exact Match |
| `refetchQueue` | `() => Promise<unknown>` | QueueProvider | `refetchQueue` | ✅ Exact Match |
| `isQueueRefetching` | `boolean` | QueueProvider | `isQueueRefetching` | ✅ Exact Match |
| `loadWaitingQueue` | `() => void` | QueueProvider | `loadWaitingQueue` | ✅ Exact Match |

---

## 3. Actions Mapping

| Legacy Action | Legacy Signature | Current Source | Current Signature | Mapping Type |
|---------------|------------------|----------------|-------------------|--------------|
| `loadAppointment` | `(id: number) => Promise<void>` | SessionProvider | `initializeSession(id: number)` | 🔁 Renamed |
| `startConsultation` | `() => Promise<void>` | SessionProvider | `startConsultation()` | ✅ Exact Match |
| `closeStartDialog` | `() => void` | DialogProvider | `closeStartDialog()` | ✅ Exact Match |
| `saveDraft` | `() => Promise<void>` | DocumentationProvider | `saveDraft()` | ✅ Exact Match |
| `saveNotes` | `() => Promise<void>` | DocumentationProvider | `saveNotes()` | ✅ Exact Match |
| `updateNotes` | `(field, value) => void` | DocumentationProvider | `updateNotes(field, value)` | ✅ Exact Match |
| `setOutcome` | `(outcome) => void` | DocumentationProvider | `setOutcome(outcome)` | ✅ Exact Match |
| `setPatientDecision` | `(decision) => void` | DocumentationProvider | `setPatientDecision(decision)` | ✅ Exact Match |
| `openCompleteDialog` | `() => void` | DialogProvider | `openCompleteDialog()` | ✅ Exact Match |
| `closeCompleteDialog` | `() => void` | DialogProvider | `closeCompleteDialog()` | ✅ Exact Match |
| `completeConsultation` | `(path?) => Promise<void>` | SessionProvider | `completeSession(path?)` | 🔁 Renamed |
| `switchToPatient` | `(id: number) => void` | SessionProvider | `switchToPatient(id)` | ✅ Exact Match |
| `goToSurgeryPlanning` | `() => void` | SessionProvider | `goToSurgeryPlanning()` | ✅ Exact Match |

---

## 4. Mapping Keys

| Symbol | Meaning |
|--------|---------|
| ✅ Exact Match | Property name and type identical |
| ⚠ Requires Mapping | Name or nesting changed; façade must transform |
| 🔁 Renamed | Property renamed in new architecture |
| ❌ Missing | Not available in any current provider |

---

## 5. Summary

| Category | Total | Exact Match | Requires Mapping | Renamed | Missing |
|----------|-------|-------------|-----------------|---------|---------|
| State Properties | 19 | 9 | 3 | 7 | 0 |
| Nested Workflow | 7 | 0 | 0 | 2 | 5 |
| Computed | 8 | 4 | 2 | 0 | 2 |
| Actions | 13 | 9 | 0 | 4 | 0 |
| **Total** | **47** | **22** | **5** | **13** | **7** |

### Missing Properties (Not Currently Mapped)

| Property | Reason Omitted | Recommendation |
|----------|----------------|----------------|
| `state.workflow.isDirty` | No current consumer | Add for completeness |
| `state.workflow.appointmentId` | No current consumer | Add for completeness |
| `state.workflow.patientId` | No current consumer | Add for completeness |
| `state.workflow.consultationId` | No current consumer | Add for completeness |
| `state.workflow.lastSavedAt` | No current consumer | Add for completeness |
| `canComplete` | No current consumer | Add for completeness |
| `state.notes` | No current consumer | Already mapped |

Wait, `state.notes` IS mapped. The missing ones above are the 5 workflow sub-properties that aren't strictly required by current consumers but were part of the legacy API.

Actually, looking at my current ConsultationContext implementation, I DO map `isDirty`, `appointmentId`, `patientId`, `consultationId`, and `lastSavedAt` into `workflow`. So those aren't missing in my implementation - they were just marked as missing in the earlier audit of the OLD (broken) adapter.

Let me update the matrix to reflect the NEW implementation.
