# Consultation Use Cases

## Use Case Inventory

| Use Case | Category | Input DTO | Output DTO | Service | Ports | ConsultationContext Lines |
|----------|----------|-----------|------------|---------|-------|--------------------------|
| `InitializeSession` | Command | `InitializeSessionRequest` | `InitializeSessionResponse` | SessionService | ConsultationApi, PatientApi, QueueApi | 394-534 |
| `StartConsultation` | Command | `StartConsultationRequest` | `StartConsultationResponse` | SessionService, AuditService | ConsultationApi | 536-584 |
| `ResumeConsultation` | Command | `ResumeConsultationRequest` | `ResumeConsultationResponse` | SessionService, DraftService | ConsultationApi, DraftStorage | 476-497 |
| `CompleteConsultation` | Command | `CompleteConsultationRequest` | `CompleteConsultationResponse` | SessionService, DraftService, QueueService, AuditService | ConsultationApi, QueueApi | 725-789 |
| `SaveDraft` | Command | `SaveDraftRequest` | `SaveDraftResponse` | DraftService | ConsultationApi, DraftStorage | 590-629, 631-693 |
| `RestoreDraft` | Query | `RestoreDraftRequest` | `RestoreDraftResponse` | DraftService | DraftStorage | 476-497 |
| `SwitchPatient` | Command | `SwitchPatientRequest` | `SwitchPatientResponse` | SessionService, DraftService, QueueService | ConsultationApi | 791-810 |
| `AdvanceQueue` | Command | `AdvanceQueueRequest` | `AdvanceQueueResponse` | QueueService, SessionService | QueueApi, ConsultationApi | 760-782 |
| `LoadPatientHistory` | Query | `LoadPatientHistoryRequest` | `LoadPatientHistoryResponse` | — | PatientApi | 338-351 |
| `LoadPatientVitals` | Query | `LoadPatientVitalsRequest` | `LoadPatientVitalsResponse` | — | PatientApi | 418-442 |
| `RefreshQueue` | Query | `RefreshQueueRequest` | `RefreshQueueResponse` | QueueService | QueueApi | 372-377 |

---

## Use Case Specifications

### 3.1 InitializeSession

**Category:** Command

**Description:** Load all data required for a consultation session: appointment, patient, vitals, consultation record, and doctor info. Determine initial workflow state.

**Input:**
```typescript
interface InitializeSessionRequest {
  appointmentId: number;
  userId: string;
}
```

**Output:**
```typescript
interface InitializeSessionResponse {
  appointment: AppointmentResponseDto;
  patient: PatientResponseDto;
  vitals: VitalsData | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string;
  workflowState: ConsultationWorkflowState;
  notes: StructuredNotes | null;
  outcomeType: ConsultationOutcomeType | null;
  patientDecision: PatientDecision | null;
}
```

**Steps:**
1. Fetch appointment via `ConsultationApi.loadConsultation` (note: this returns consultation, not appointment — needs correction)
2. Fetch doctor via `PatientApi` or `ConsultationApi`
3. Fetch patient via `PatientApi.loadPatient`
4. Fetch vitals via `PatientApi` or dedicated vitals endpoint
5. Fetch consultation record via `ConsultationApi.loadConsultation`
6. Fetch consultation history via `ConsultationApi.loadPatientConsultationHistory`
7. Determine workflow state from appointment status + consultation state
8. Restore draft if newer than server (via `DraftService.restoreDraft`)
9. Parse legacy notes if needed
10. Return fully hydrated session data

**Maps from ConsultationContext:**
- Lines 394-534 (`loadAppointment`) — entire function
- Lines 338-351 (consultation history effect) — history loading
- Lines 476-497 (draft restoration) — via DraftService

**Error handling:**
- `APPOINTMENT_NOT_FOUND` → `ConsultationFailure`
- `PATIENT_NOT_FOUND` → `ConsultationFailure`
- `NETWORK_UNAVAILABLE` → `ConsultationFailure` (recoverable)

---

### 3.2 StartConsultation

**Category:** Command

**Description:** Transition an appointment from CHECKED_IN/READY_FOR_CONSULTATION to IN_CONSULTATION. Creates or updates the consultation record.

**Input:**
```typescript
interface StartConsultationRequest {
  appointmentId: number;
  doctorId: string;
  userId: string;
  doctorNotes?: string;
}
```

**Output:**
```typescript
interface StartConsultationResponse {
  appointment: AppointmentResponseDto;
  consultation: ConsultationResponseDto;
}
```

**Steps:**
1. Validate appointment status (CHECKED_IN or READY_FOR_CONSULTATION)
2. Call `ConsultationApi.saveConsultationDraft` or dedicated start endpoint
3. Refresh consultation data
4. Set workflow state to ACTIVE
5. Close start dialog
6. Invalidate doctor/appointments queries
7. Emit `CONSULTATION_STARTED` audit event
8. Show success notification

**Maps from ConsultationContext:**
- Lines 536-584 (`startConsultation`)
- Lines 572-574 (`invalidateQueries`)
- Line 576 (`toast.success`)

**Business rules:**
- Appointment must be CHECKED_IN or READY_FOR_CONSULTATION
- "Already started" is not an error — proceed to workspace
- Doctor ID must match appointment's doctor

---

### 3.3 ResumeConsultation

**Category:** Command

**Description:** Resume a previously active consultation. Differs from StartConsultation in that the consultation already exists in IN_PROGRESS state.

**Input:**
```typescript
interface ResumeConsultationRequest {
  appointmentId: number;
}
```

**Output:**
```typescript
interface ResumeConsultationResponse {
  consultation: ConsultationResponseDto;
  restoredDraft: DraftRecord<StructuredNotes> | null;
}
```

**Steps:**
1. Load consultation via `ConsultationApi.loadConsultation`
2. If consultation exists and is IN_PROGRESS, set workflow state to ACTIVE
3. Attempt draft restoration via `DraftService.restoreDraft`
4. Return consultation data + restored draft

**Maps from ConsultationContext:**
- Lines 454-473 (consultation hydration + notes restoration)
- Lines 513-516 (IN_CONSULTATION branch)

**Note:** This is a simplified version of `InitializeSession` for cases where the appointment is already IN_CONSULTATION and we just need to resume the session.

---

### 3.4 CompleteConsultation

**Category:** Command

**Description:** Finalize a consultation session. Record outcome, patient decision, clear drafts, invalidate caches, and route to next patient or hub.

**Input:**
```typescript
interface CompleteConsultationRequest {
  appointmentId: number;
  outcomeType: ConsultationOutcomeType;
  patientDecision?: PatientDecision;
  billingItems?: BillingItem[]; // future
  notes?: StructuredNotes; // final notes
}
```

**Output:**
```typescript
interface CompleteConsultationResponse {
  appointment: AppointmentResponseDto;
  consultation: ConsultationResponseDto;
  nextAction: 'queue-advance' | 'navigate-hub';
  nextAppointmentId?: number;
}
```

**Steps:**
1. Clear pending auto-save timer
2. Set workflow state to TRANSITIONING
3. Save final notes if dirty (via `DraftService.manualSave`)
4. Clear localStorage draft backup
5. Clear all related React Query caches
6. Determine next action:
   a. Find next patient in consultation or waiting queue
   b. If found: return `queue-advance` with next appointment ID
   c. If not found: return `navigate-hub` with redirect path
7. Emit `CONSULTATION_COMPLETED` audit event
8. Show success notification

**Maps from ConsultationContext:**
- Lines 725-789 (`completeConsultation`)
- Lines 750-756 (`invalidateQueries`)
- Lines 760-782 (queue-aware routing)

**Business rules:**
- Consultation must be IN_PROGRESS
- Appointment must not be COMPLETED or CANCELLED
- If next patient exists in queue, auto-advance

---

### 3.5 SaveDraft

**Category:** Command

**Description:** Persist consultation notes to backend and localStorage. Handles both auto-save and manual save.

**Input:**
```typescript
interface SaveDraftRequest {
  appointmentId: number;
  doctorId: string;
  notes: {
    rawText: string;
    structured: StructuredNotes;
  };
  outcomeType?: ConsultationOutcomeType;
  patientDecision?: PatientDecision;
}
```

**Output:**
```typescript
interface SaveDraftResponse {
  consultation: ConsultationResponseDto;
  saveStatus: SaveStatus;
  version: string;
}
```

**Steps:**
1. Validate notes are dirty (skip if unchanged)
2. Call `ConsultationApi.saveConsultationDraft`
3. On success: update optimistic cache, clear dirty state, backup to localStorage
4. On version conflict: rollback optimistic update, refetch, notify user
5. On other error: notify user, set save status to error
6. Emit `DRAFT_SAVED` audit event

**Maps from ConsultationContext:**
- Lines 590-629 (`saveDraft`) → auto-save path
- Lines 631-693 (`saveNotes`) → manual save path
- Lines 611-617, 675-681 (localStorage backup) → via DraftService

**Business rules:**
- Consultation must be IN_PROGRESS
- Appointment must not be COMPLETED
- Version conflicts are not retried

---

### 3.6 RestoreDraft

**Category:** Query

**Description:** Load a previously saved draft from localStorage and determine if it is newer than the server version. If newer, return the draft for restoration.

**Input:**
```typescript
interface RestoreDraftRequest {
  appointmentId: number;
  serverUpdatedAt: Date;
}
```

**Output:**
```typescript
interface RestoreDraftResponse {
  draft: DraftRecord<StructuredNotes> | null;
  wasRestored: boolean;
}
```

**Steps:**
1. Load draft from localStorage via `DraftStorage.loadDraft`
2. Compare draft timestamp to server `updatedAt`
3. If draft is newer, return draft data
4. If draft is older or equal, remove draft and return null
5. If draft is corrupt, remove draft and return null
6. If draft is missing, return null

**Maps from ConsultationContext:**
- Lines 476-497 (draft restoration logic)

**Business rules:**
- Draft timestamp must be strictly greater than server `updatedAt` to be restored
- Corrupt drafts are deleted immediately
- No toast shown on successful restore (auto-save indicator shows "Restored")

---

### 3.7 SwitchPatient

**Category:** Command

**Description:** Navigate from the current patient's session to another patient's session. Saves current draft before switching.

**Input:**
```typescript
interface SwitchPatientRequest {
  currentAppointmentId: number;
  nextAppointmentId: number;
}
```

**Output:**
```typescript
interface SwitchPatientResponse {
  success: boolean;
  saved: boolean;
}
```

**Steps:**
1. Clear pending auto-save timer
2. If session is dirty, save draft via `DraftService.manualSave`
3. Navigate to next appointment session page
4. Emit `PATIENT_SWITCHED` audit event

**Maps from ConsultationContext:**
- Lines 791-810 (`switchToPatient`)

**Business rules:**
- If dirty state exists, draft must be saved before switching
- Navigation proceeds even if draft save fails (draft is not critical)

---

### 3.8 AdvanceQueue

**Category:** Command

**Description:** Move from the current patient's session to the next patient in the queue. This is a specialized `SwitchPatient` that automatically selects the next patient.

**Input:**
```typescript
interface AdvanceQueueRequest {
  currentAppointmentId: number;
  clinicianId: string;
}
```

**Output:**
```typescript
interface AdvanceQueueResponse {
  nextAppointmentId: number | null;
  nextPatientName: string | null;
  action: 'advance' | 'hub';
}
```

**Steps:**
1. Save current draft if dirty
2. Query queue for next patient (IN_CONSULTATION first, then CHECKED_IN/READY_FOR_CONSULTATION)
3. If next patient found:
   a. Navigate to their session
   b. Return `advance` action
4. If no next patient:
   a. Return `hub` action with redirect path
5. Emit `QUEUE_ADVANCED` audit event

**Maps from ConsultationContext:**
- Lines 760-782 (queue-aware routing in `completeConsultation`)

**Business rules:**
- Priority: IN_CONSULTATION > CHECKED_IN > READY_FOR_CONSULTATION
- Exclude current appointment from queue search
- Navigation is handled by Presentation Layer based on returned action

---

### 3.9 LoadPatientHistory

**Category:** Query

**Description:** Load past consultations for the current patient.

**Input:**
```typescript
interface LoadPatientHistoryRequest {
  patientId: string;
}
```

**Output:**
```typescript
interface LoadPatientHistoryResponse {
  consultations: PatientConsultationHistoryItemDto[];
}
```

**Steps:**
1. Call `ConsultationApi.loadPatientConsultationHistory`
2. Return consultation list

**Maps from ConsultationContext:**
- Lines 338-351 (`usePatientConsultationHistory` hook + effect)

---

### 3.10 LoadPatientVitals

**Category:** Query

**Description:** Load patient vitals for the current appointment.

**Input:**
```typescript
interface LoadPatientVitalsRequest {
  patientId: string;
  appointmentId: number;
}
```

**Output:**
```typescript
interface LoadPatientVitalsResponse {
  vitals: VitalsData | null;
}
```

**Steps:**
1. Call vitals endpoint (via `PatientApi` or dedicated endpoint)
2. Map raw vitals response to `VitalsData` shape
3. Return vitals data

**Maps from ConsultationContext:**
- Lines 418-442 (vitals fetching + mapping)

**Note:** The current code uses `apiClient.get<any[]>(`/patients/${apt.patientId}/vitals?appointmentId=${appointmentId}`)`. This endpoint should be formalized in a future `VitalsApi` port.

---

### 3.11 RefreshQueue

**Category:** Query

**Description:** Trigger a manual refresh of the clinician's queue.

**Input:**
```typescript
interface RefreshQueueRequest {
  clinicianId: string;
}
```

**Output:**
```typescript
interface RefreshQueueResponse {
  queue: QueueEntry[];
}
```

**Steps:**
1. Call `QueueApi.loadQueue`
2. Return queue data
3. Invalidate related React Query caches

**Maps from ConsultationContext:**
- Lines 372-377 (`loadWaitingQueue`)

---

## Use Case Dependencies

```
InitializeSession
    ├── SessionService.initialize
    ├── PatientApi (load patient, vitals)
    ├── ConsultationApi (load consultation, history)
    └── DraftService.restoreDraft

StartConsultation
    ├── SessionService.start
    ├── ConsultationApi
    └── AuditService

ResumeConsultation
    ├── SessionService.resume
    ├── ConsultationApi
    └── DraftService.restoreDraft

CompleteConsultation
    ├── SessionService.complete
    ├── DraftService.clearDraft
    ├── QueueService.getNextPatient
    ├── ConsultationApi
    ├── QueueApi
    └── AuditService

SaveDraft
    ├── DraftService.autoSave / manualSave
    ├── ConsultationApi
    ├── DraftStorage
    └── AuditService

RestoreDraft
    ├── DraftService.restoreDraft
    └── DraftStorage

SwitchPatient
    ├── SessionService.switchTo
    ├── DraftService.manualSave
    └── QueueService

AdvanceQueue
    ├── QueueService.getNextPatient
    ├── SessionService
    ├── ConsultationApi
    └── QueueApi

LoadPatientHistory
    └── ConsultationApi

LoadPatientVitals
    └── PatientApi (or future VitalsApi)

RefreshQueue
    └── QueueService
```
