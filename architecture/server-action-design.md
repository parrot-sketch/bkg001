# Server Action Design

## Purpose
Define every Server Action required for the consultation room, including input, output, failure model, optimistic behavior, and rollback.

---

## 1. Server Action Catalog

All Server Actions live in: `actions/doctor/consultation-session.ts`

Each action follows this pattern:
1. Verify authentication
2. Create Composition Root (or reuse shared factory)
3. Call SessionService method
4. Serialize result
5. Return structured response

---

## 2. Action: initializeSession

### Purpose
Initialize a new consultation session. Called on initial page load (server-side) and when switching patients.

### Input

```typescript
{
  appointmentId: number;
}
```

### Output

```typescript
{
  success: true;
  data: {
    session: SessionData;
    restoredDraft: boolean;
    invalidationInstructions: InvalidationInstruction[];
  };
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Invalid appointmentId | INVALID_INPUT | Show error, retry |
| Missing user | MISSING_REQUIRED_FIELD | Re-authenticate |
| Appointment not found | APPOINTMENT_NOT_FOUND | Show error, offer refresh |
| Doctor not found | PATIENT_NOT_FOUND | Show error, log |
| Patient not found | PATIENT_NOT_FOUND | Show error, offer refresh |
| Workflow execution fails | INVALID_WORKFLOW_TRANSITION | Show error, retry |
| Network unavailable | NETWORK_UNAVAILABLE | Show error, retry |

### Optimistic Behavior

**None.** This action should complete before the UI renders. Server Component blocks render until this resolves.

### Rollback

**Not applicable.** This is the initial state setup. If it fails, the error UI is shown.

### Notes

- This is primarily called from the Server Component, NOT from client
- Client may call it for consultation switching (via advanceQueue or switchToPatient)
- Returns full session state for client hydration

---

## 3. Action: startSession

### Purpose
Start an active consultation from READY state.

### Input

```typescript
{
  appointmentId: number;
  doctorId: string;
}
```

### Output

```typescript
{
  success: true;
  data: SessionData;
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Invalid appointmentId | INVALID_INPUT | Show error |
| Missing doctorId | MISSING_REQUIRED_FIELD | Show error |
| Appointment not found | APPOINTMENT_NOT_FOUND | Show error, refresh queue |
| Consultation already in progress | INVALID_INPUT | Auto-recover: reload consultation, return session |
| Workflow transition fails | INVALID_WORKFLOW_TRANSITION | Show error, retry |
| Network unavailable | NETWORK_UNAVAILABLE | Show error, retry |

### Optimistic Behavior

Client can optimistically show consultation as ACTIVE while the action runs. If it fails, revert to READY state.

```typescript
// SessionProvider
const startConsultation = startActionTransition(async () => {
  // Optimistic update
  setWorkflowState(ConsultationWorkflowState.ACTIVE);
  
  const result = await startSessionAction({ appointmentId, doctorId });
  if (result.success) {
    // Replace all state with result
    setAppointment(result.data.appointment);
    // ...
  } else {
    // Rollback
    setWorkflowState(ConsultationWorkflowState.READY);
    toast.error(toErrorMessage(result.error));
  }
});
```

### Rollback

On failure, restore previous workflow state. Previous appointment, patient, consultation data remains unchanged.

---

## 4. Action: resumeSession

### Purpose
Resume an in-progress consultation.

### Input

```typescript
{
  consultationId: number;
}
```

### Output

```typescript
{
  success: true;
  data: SessionData;
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Invalid consultationId | INVALID_INPUT | Show error |
| Consultation not found | SESSION_NOT_FOUND | Show error, return to queue |
| Consultation not in progress | VALIDATION_ERROR | Show error, cannot resume |
| Workflow transition fails | INVALID_WORKFLOW_TRANSITION | Show error, retry |
| Network unavailable | NETWORK_UNAVAILABLE | Show error, retry |

### Optimistic Behavior

Client can optimistically set workflow state to ACTIVE.

### Rollback

On failure, restore previous workflow state.

---

## 5. Action: completeSession

### Purpose
Complete the current consultation and transition to COMPLETED state.

### Input

```typescript
{
  consultationId: number;
}
```

### Output

```typescript
{
  success: true;
  data: {
    completedAppointmentId: number;
    clearedLocalStorage: boolean;
    invalidationInstructions: InvalidationInstruction[];
    redirectPath: string;
  };
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Invalid consultationId | INVALID_INPUT | Show error |
| Consultation not found | SESSION_NOT_FOUND | Show error |
| Consultation not in progress | VALIDATION_ERROR | Show error |
| Workflow transition fails | INVALID_WORKFLOW_TRANSITION | Show error, retry |
| Draft discard fails | (wrapped) | Warn user, continue completion |
| Network unavailable | NETWORK_UNAVAILABLE | Show error, retry |

### Optimistic Behavior

Client shows completion dialog/confirmation. On success, navigates to redirect path. On failure, stays on consultation with error toast.

### Rollback

If completion fails, consultation remains IN_PROGRESS. No state changes applied.

### Side Effects

- Discards draft
- Invalidates query cache (appointments, consultations, billing)
- Redirects to `/doctor/consultations`

---

## 6. Action: cancelCompletion

### Purpose
Cancel a pending completion and return to ACTIVE or READY state.

### Input

```typescript
{}
```

### Output

```typescript
{
  success: true;
  data: SessionData;
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Workflow transition fails | INVALID_WORKFLOW_TRANSITION | Show error, retry |
| Network unavailable | NETWORK_UNAVAILABLE | Show error, retry |

### Optimistic Behavior

Client closes the complete dialog immediately.

### Rollback

If action fails, dialog reopens on next render.

---

## 7. Action: switchToPatient

### Purpose
Switch from current consultation to a different appointment.

### Input

```typescript
{
  fromAppointmentId: number;
  toAppointmentId: number;
}
```

### Output

```typescript
{
  success: true;
  data: {
    fromAppointmentId: number;
    toAppointmentId: number;
    draftSaved: boolean;
    nextSession: SessionInitializationResult | null;
  };
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Same appointment | INVALID_INPUT | Ignore |
| Workflow transition fails | INVALID_WORKFLOW_TRANSITION | Stay on current patient |
| Next session init fails | (nested error) | Stay on current patient, show error |
| Network unavailable | NETWORK_UNAVAILABLE | Stay on current patient, show error |

### Optimistic Behavior

Client shows loading state during switch. On success, replaces all session state. On failure, no state change.

### Rollback

If `nextSession` is null, client clears all session state (no patient loaded). User sees queue view.

---

## 8. Action: advanceQueue

### Purpose
Advance to the next patient in the queue.

### Input

```typescript
{
  doctorId: string;
  userId: string;
}
```

### Output

```typescript
{
  success: true;
  data: SessionInitializationResult | null; // null = queue empty
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Missing userId | MISSING_REQUIRED_FIELD | Show error |
| Workflow transition fails | INVALID_WORKFLOW_TRANSITION | Stay on current patient |
| Next session init fails | (nested error) | Stay on current patient, show error |
| Queue empty | (no failure — returns null) | Show empty queue state |

### Optimistic Behavior

Client shows "Advancing..." state. On success, either switches to next patient or shows empty queue.

### Rollback

If `data` is null, client clears session state. If error, no state change.

---

## 9. Action: sendHeartbeat

### Purpose
Send periodic heartbeat to keep consultation session alive.

### Input

```typescript
{
  consultationId: number;
}
```

### Output

```typescript
{
  success: true;
  data: undefined;
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Invalid consultationId | INVALID_INPUT | Stop heartbeat, show warning |
| Consultation not found | SESSION_NOT_FOUND | Stop heartbeat, show error |
| Network unavailable | NETWORK_UNAVAILABLE | Log, retry on next interval |

### Optimistic Behavior

**None.** Heartbeat is fire-and-forget. Failure is logged but not shown to user.

### Rollback

**Not applicable.** Heartbeat has no side effects on client state.

---

## 10. Action: pauseSession

### Purpose
Pause the current consultation.

### Input

```typescript
{}
```

### Output

```typescript
{
  success: true;
  data: undefined;
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Workflow transition fails | INVALID_WORKFLOW_TRANSITION | Show error, stay active |
| Network unavailable | NETWORK_UNAVAILABLE | Show error, retry |

### Optimistic Behavior

Client can show paused state immediately.

---

## 11. Action: resumePausedSession

### Purpose
Resume a paused consultation.

### Input

```typescript
{}
```

### Output

```typescript
{
  success: true;
  data: undefined;
} | {
  success: false;
  error: SessionError;
}
```

### Failure Model

| Failure | Code | Recovery |
|---------|------|----------|
| Workflow transition fails | INVALID_WORKFLOW_TRANSITION | Show error, stay paused |
| Network unavailable | NETWORK_UNAVAILABLE | Show error, retry |

### Optimistic Behavior

Client can show active state immediately.

---

## 12. Action: saveDraft

### Purpose
Auto-save or manual save of consultation notes.

### Input

```typescript
{
  consultationId: number;
  doctorId: string;
  notes: StructuredNotes;
  outcomeType?: ConsultationOutcomeType;
  patientDecision?: PatientDecision;
}
```

### Output

```typescript
{
  success: true;
  data: {
    version: string; // ETag or version timestamp
  };
} | {
  success: false;
  error: string;
}
```

### Failure Model

| Failure | Recovery |
|---------|----------|
| Consultation not found | Show error, stop auto-save |
| Unauthorized | Show error, re-authenticate |
| Validation error | Show error, keep isDirty=true |
| Network error | Keep isDirty=true, retry on next auto-save |
| Conflict (version mismatch) | Show conflict UI, offer merge |

### Optimistic Behavior

Client sets `isSaving=true` immediately. On success, sets `isDirty=false` and `lastSavedAt=version`. On failure, sets `isSaving=false` and shows error.

### Auto-Save Behavior

```typescript
// DocumentationProvider
useEffect(() => {
  if (!state.isDirty || !consultationId || !doctorId) return;
  
  const timeout = setTimeout(() => {
    saveDraftAction({
      consultationId,
      doctorId,
      notes: state.notes,
      outcomeType: state.outcomeType ?? undefined,
      patientDecision: state.patientDecision ?? undefined,
    }).then(result => {
      if (result.success) {
        dispatch({ type: 'SET_LAST_SAVED', payload: result.data.version });
        dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' });
      } else {
        dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
      }
    });
  }, 3000);
  
  return () => clearTimeout(timeout);
}, [state.isDirty, state.notes, consultationId, doctorId]);
```

---

## 13. Action: saveCompletedNotes

### Purpose
Update notes on a completed consultation (bypasses IN_PROGRESS restriction).

### Input

```typescript
{
  consultationId: number;
  doctorId: string;
  chiefComplaint?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}
```

### Output

```typescript
{
  success: true;
} | {
  success: false;
  error: string;
}
```

### Failure Model

| Failure | Recovery |
|---------|----------|
| Consultation not found | Show error |
| Unauthorized | Show error |
| Validation error | Show error |
| Network error | Show error, retry |

### Optimistic Behavior

Client sets `isSaving=true` immediately.

---

## 14. Action: updateConsultationOutcome

### Purpose
Update consultation outcome from Hub view.

### Input

```typescript
{
  consultationId: number;
  outcomeType: ConsultationOutcomeType;
  outcome?: string;
}
```

### Output

```typescript
{
  success: true;
} | {
  success: false;
  error: string;
}
```

### Failure Model

| Failure | Recovery |
|---------|----------|
| Consultation not found | Show error |
| Unauthorized | Show error |
| Network error | Show error, retry |

### Optimistic Behavior

Client updates local outcomeType immediately, reconciles with server response.

---

## 15. Shared Infrastructure

### Composition Root in Server Actions

Server Actions need access to `ConsultationSessionFactory`. Options:

**Option A: Import factory directly**
```typescript
import { createConsultationSession } from '@/infrastructure/composition/ConsultationSessionFactory';

export async function startSession({ appointmentId, doctorId }: Params) {
  const user = await getCurrentUser();
  const session = createConsultationSession({ appointmentId, user });
  return session.sessionService.startSession(appointmentId, doctorId, user.id);
}
```

**Option B: Pass pre-built services from Server Component**
```typescript
// Server Component passes services to client shell
// Client shell passes to Server Actions via... (not possible directly)
```

**Option A is correct.** Each Server Action constructs its own Composition Root. The factory is lightweight (no DB connections, no heavy initialization). The overhead is acceptable for the clarity it provides.

### Authentication

All Server Actions must verify the caller is the same doctor who owns the appointment.

```typescript
export async function startSession({ appointmentId, doctorId }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') {
    return { success: false, error: makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ...) };
  }
  // ... proceed
}
```

---

## 16. Error Handling Strategy

### Structured Error Response

All Server Actions return:

```typescript
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: {
      code: ClinicalErrorCode;
      message: string;
      category: ClinicalErrorCategory;
      recoverable: boolean;
      retryable: boolean;
    }};
```

### Client Error Handling

SessionProvider wraps each Server Action call:

```typescript
const executeAction = async <T>(
  action: () => Promise<ActionResult<T>>,
  onSuccess: (data: T) => void
) => {
  try {
    const result = await action();
    if (result.success) {
      onSuccess(result.data);
    } else {
      toast.error(result.error.message || 'Action failed');
      if (result.error.retryable) {
        // Show retry button
      }
    }
  } catch (error) {
    toast.error('Unexpected error occurred');
  }
};
```

### Toast Messages

| Action | Success Message | Failure Message |
|--------|-----------------|-----------------|
| startSession | "Consultation started" | "Failed to start consultation" |
| completeSession | "Consultation completed" | "Failed to complete consultation" |
| resumeSession | "Consultation resumed" | "Failed to resume consultation" |
| switchToPatient | "Switched to next patient" | "Failed to switch patient" |
| advanceQueue | "Advanced to next patient" | "Failed to advance queue" |
| saveDraft | "Draft saved" | "Failed to save draft" |
| saveCompletedNotes | "Notes updated" | "Failed to save notes" |
