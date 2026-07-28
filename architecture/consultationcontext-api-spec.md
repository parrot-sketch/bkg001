# ConsultationContext API Specification

## Executive Summary

This document specifies the complete public API of `ConsultationContext` as a compatibility façade. It defines the exact contract that must be preserved to ensure zero consumer modifications.

**Status:** SPECIFICATION (pre-implementation baseline)  
**Date:** 2026-07-25

---

## 1. Context Interface

```typescript
interface ConsultationContextValue {
  state: ConsultationProviderState;
  isActive: boolean;
  isReadOnly: boolean;
  canSave: boolean;
  canComplete: boolean;
  waitingQueue: AppointmentResponseDto[];
  refetchQueue: () => Promise<unknown>;
  isQueueRefetching: boolean;
  loadWaitingQueue: () => void;
  loadAppointment: (appointmentId: number) => Promise<void>;
  startConsultation: () => Promise<void>;
  closeStartDialog: () => void;
  saveDraft: () => Promise<void>;
  saveNotes: () => Promise<void>;
  updateNotes: (field: keyof StructuredNotes, value: string) => void;
  setOutcome: (outcome: ConsultationOutcomeType) => void;
  setPatientDecision: (decision: PatientDecision | null) => void;
  openCompleteDialog: () => void;
  closeCompleteDialog: () => void;
  completeConsultation: (redirectPath?: string) => Promise<void>;
  switchToPatient: (appointmentId: number) => void;
  goToSurgeryPlanning: () => void;
}
```

---

## 2. State Object

### 2.1 Root State

| Property | Type | Nullable | Default | Source |
|----------|------|----------|---------|--------|
| `workflow` | `ConsultationWorkflowContext` | No | — | SessionProvider + DocumentationProvider |
| `appointment` | `AppointmentResponseDto` | Yes | `null` | SessionProvider |
| `patient` | `PatientResponseDto` | Yes | `null` | SessionProvider |
| `vitals` | `VitalsData` | Yes | `null` | SessionProvider |
| `consultation` | `ConsultationResponseDto` | Yes | `null` | SessionProvider |
| `doctorId` | `string` | Yes | `null` | SessionProvider |
| `notes` | `StructuredNotes` | No | `{}` | DocumentationProvider |
| `outcomeType` | `ConsultationOutcomeType` | Yes | `null` | DocumentationProvider |
| `patientDecision` | `PatientDecision` | Yes | `null` | DocumentationProvider |
| `isLoading` | `boolean` | No | `false` | SessionProvider |
| `isSaving` | `boolean` | No | `false` | DocumentationProvider |
| `showCompleteDialog` | `boolean` | No | `false` | DialogProvider |
| `showStartDialog` | `boolean` | No | `false` | DialogProvider |
| `autoSaveStatus` | `'idle' | 'saving' | 'saved' | 'error'` | No | `'idle'` | DocumentationProvider |

### 2.2 Nested Workflow Object

```typescript
interface ConsultationWorkflowContext {
  state: string;                    // ConsultationWorkflowState enum value
  error: string | null;             // Error message or null
  isDirty: boolean;                 // Has unsaved changes
  appointmentId: number | null;     // Current appointment ID
  patientId: string | null;         // Current patient ID
  consultationId: number | null;    // Current consultation ID
  lastSavedAt: Date | null;         // Last save timestamp
}
```

---

## 3. Computed Properties

| Property | Type | Source | Derivation |
|----------|------|--------|------------|
| `isActive` | `boolean` | SessionProvider | `!completed && consultation.state === IN_PROGRESS` |
| `isReadOnly` | `boolean` | SessionProvider | `completed || consultation.state === COMPLETED` |
| `canSave` | `boolean` | DocumentationProvider | `docs.isDirty` |
| `canComplete` | `boolean` | Derived | `isActive && !docs.isSaving` |

---

## 4. Queue Properties

| Property | Type | Source | Derivation |
|----------|------|--------|------------|
| `waitingQueue` | `AppointmentResponseDto[]` | QueueProvider | Filtered appointments |
| `refetchQueue` | `() => Promise<unknown>` | QueueProvider | Direct passthrough |
| `isQueueRefetching` | `boolean` | QueueProvider | Direct passthrough |
| `loadWaitingQueue` | `() => void` | QueueProvider | Direct passthrough |

---

## 5. Actions

| Action | Signature | Source | Notes |
|--------|-----------|--------|-------|
| `loadAppointment` | `(appointmentId: number) => Promise<void>` | SessionProvider | Maps to `initializeSession` |
| `startConsultation` | `() => Promise<void>` | SessionProvider | Maps to `startConsultation` |
| `closeStartDialog` | `() => void` | DialogProvider | Direct passthrough |
| `saveDraft` | `() => Promise<void>` | DocumentationProvider | Direct passthrough |
| `saveNotes` | `() => Promise<void>` | DocumentationProvider | Direct passthrough |
| `updateNotes` | `(field: keyof StructuredNotes, value: string) => void` | DocumentationProvider | Direct passthrough |
| `setOutcome` | `(outcome: ConsultationOutcomeType) => void` | DocumentationProvider | Direct passthrough |
| `setPatientDecision` | `(decision: PatientDecision | null) => void` | DocumentationProvider | Direct passthrough |
| `openCompleteDialog` | `() => void` | DialogProvider | Direct passthrough |
| `closeCompleteDialog` | `() => void` | DialogProvider | Direct passthrough |
| `completeConsultation` | `(redirectPath?: string) => Promise<void>` | SessionProvider | Maps to `completeSession` |
| `switchToPatient` | `(appointmentId: number) => void` | SessionProvider | Direct passthrough |
| `goToSurgeryPlanning` | `() => void` | SessionProvider | Direct passthrough |

---

## 6. Consumer Contract

### 6.1 page.tsx

```typescript
const {
  state,
  isActive,
  isReadOnly,
  startConsultation,
  closeStartDialog,
  openCompleteDialog,
  closeCompleteDialog,
  completeConsultation,
  switchToPatient,
} = useConsultationContext();

// Accesses:
// state.workflow.error
// state.workflow.state (implicit via isActive/isReadOnly)
// state.consultation
// state.doctorId
// state.appointment (via queue.loadWaitingQueue dependency)
```

### 6.2 ConsultationWorkspaceOptimized

```typescript
const {
  state,
  isActive,
  isReadOnly,
  openCompleteDialog,
} = useConsultationContext();

// Accesses:
// state.consultation
// state.notes (via docs)
// state.outcomeType (via docs)
// state.patientDecision (via docs)
```

---

## 7. Backward Compatibility Guarantees

1. **No breaking changes** — All legacy properties exist with identical types
2. **No consumer modifications** — Existing destructuring patterns work unchanged
3. **No runtime errors** — All nested paths are explicitly reconstructed
4. **No silent failures** — Missing values return `null` or empty collections, never `undefined`
