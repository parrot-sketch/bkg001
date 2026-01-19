# Consultation Session UI Design

**Last Updated:** January 2025

## Overview

This document outlines the design for the Consultation Session UI - a clinical workstation interface for doctors during live patient consultations. The design prioritizes zero cognitive overload, always-visible patient context, zero data loss risk, and minimal interaction cost.

---

## 1. Component Tree Diagram

```
ConsultationSessionPage (/doctor/consultations/[appointmentId]/session)
│
├── ConsultationSessionHeader
│   ├── PatientName
│   ├── ConsultationTimer (started_at → now)
│   ├── AutoSaveIndicator (saving | saved | error)
│   └── QuickActionsBar
│       ├── SaveDraftButton
│       ├── UploadPhotoButton
│       ├── ViewHistoryButton
│       └── CompleteConsultationButton
│
├── ConsultationSessionLayout (3-column grid)
│   │
│   ├── LEFT PANEL: PatientInfoSidebar (sticky, always visible)
│   │   ├── PatientProfileCard
│   │   │   ├── PatientPhoto
│   │   │   ├── PatientName
│   │   │   ├── AgeGender
│   │   │   └── FileNumber
│   │   │
│   │   ├── MedicalInfoCard
│   │   │   ├── AllergiesSection (prominent if exists)
│   │   │   ├── MedicalConditions
│   │   │   └── MedicalHistory
│   │   │
│   │   ├── PreviousConsultationsCard
│   │   │   └── ConsultationHistoryList
│   │   │       └── ConsultationHistoryItem[]
│   │   │
│   │   └── QuickLinksCard
│   │       ├── ViewFullProfileLink
│   │       ├── ViewCasePlansLink
│   │       └── ViewBeforeAfterPhotosLink
│   │
│   ├── MIDDLE PANEL: ConsultationWorkspace (main content area)
│   │   │
│   │   ├── ConsultationTabs (tab navigation)
│   │   │   ├── Tab: PatientGoals
│   │   │   │   ├── GoalsTextArea
│   │   │   │   ├── ConcernsChecklist
│   │   │   │   └── VoiceDictationButton (optional)
│   │   │   │
│   │   │   ├── Tab: Examination
│   │   │   │   ├── BodyAreaSelector
│   │   │   │   ├── ExaminationForm
│   │   │   │   ├── MeasurementsInput
│   │   │   │   └── PhotoCaptureButton
│   │   │   │
│   │   │   ├── Tab: ProcedureDiscussion
│   │   │   │   ├── ProcedureTypeSelector
│   │   │   │   ├── OptionsPresentedChecklist
│   │   │   │   ├── PatientQuestionsTextArea
│   │   │   │   └── DecisionStatusSelector
│   │   │   │
│   │   │   ├── Tab: Photos
│   │   │   │   ├── CameraCaptureInterface
│   │   │   │   ├── PhotoAngleSelector
│   │   │   │   ├── PhotoGallery
│   │   │   │   └── ConsentCheckboxes
│   │   │   │
│   │   │   ├── Tab: Recommendations
│   │   │   │   ├── OutcomeTypeSelector (required)
│   │   │   │   ├── ProcedureDetailsForm (conditional)
│   │   │   │   ├── FollowUpOptions
│   │   │   │   └── ReferralInfoForm (conditional)
│   │   │   │
│   │   │   └── Tab: TreatmentPlan
│   │   │       ├── CasePlanningLink (conditional)
│   │   │       ├── PreOpChecklist
│   │   │       ├── TimelineDisplay
│   │   │       └── NextStepsTextArea
│   │   │
│   │   └── ConsultationNotesPanel (collapsible, right side)
│   │       ├── NotesEditor (rich text)
│   │       ├── TemplateSelector
│   │       ├── AutoFillFromTabsButton
│   │       └── VoiceDictationButton
│   │
│   └── RIGHT PANEL: ConsultationNotesSidebar (optional, collapsible)
│       └── ConsultationNotesEditor
│           ├── RichTextEditor
│           ├── TemplateDropdown
│           ├── Sections:
│           │   ├── ChiefComplaint
│           │   ├── Examination
│           │   ├── Assessment
│           │   └── Plan
│           └── AutoSaveIndicator
│
└── CompleteConsultationDialog (modal)
    ├── OutcomeTypeSelector (required)
    ├── ConsultationSummaryTextArea (required)
    ├── PatientDecisionSelector (conditional)
    ├── FollowUpSchedulingForm (optional)
    └── SubmitButton
```

---

## 2. State Management Strategy

### 2.1 State Architecture

**Principle:** UI state must reflect backend state machines. No frontend-invented workflow rules.

### 2.2 State Sources

#### Primary State (Server State)
- **Appointment State**: Fetched from `/api/appointments/:id`
  - `status`: PENDING | SCHEDULED | COMPLETED | CANCELLED
  - `checked_in_at`: DateTime | null
  - `late_arrival`: boolean
  - `note`: string | null

- **Consultation State**: Fetched from `/api/consultations/:id` (if exists)
  - `started_at`: DateTime | null
  - `completed_at`: DateTime | null
  - `doctor_notes`: string | null
  - `outcome_type`: ConsultationOutcomeType | null
  - `patient_decision`: PatientDecision | null

- **Patient State**: Fetched from `/api/patients/:patientId`
  - Patient demographics, medical history, allergies

#### Derived State (Computed from Server State)
- **Consultation Status**: Computed from Consultation model
  - `NOT_STARTED`: `started_at === null`
  - `IN_PROGRESS`: `started_at !== null && completed_at === null`
  - `COMPLETED`: `completed_at !== null`

- **Can Start Consultation**: 
  - `appointment.status === SCHEDULED && consultation.started_at === null`

- **Can Complete Consultation**:
  - `consultation.started_at !== null && consultation.completed_at === null`

#### Local UI State (Optimistic Updates)
- **Form State**: Local form inputs (patient goals, examination notes, etc.)
  - Debounced auto-save to server
  - Optimistic updates for immediate feedback
  - Rollback on save failure

- **UI State**: Tab selection, sidebar collapse, dialog open/close
  - Pure client-side, no server sync needed

### 2.3 State Management Library

**React Query (TanStack Query)** for server state:
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication
- Error retry logic

**React useState/useReducer** for local UI state:
- Form inputs
- UI interactions
- Modal states

### 2.4 State Flow

```
┌─────────────────────────────────────────────────────────┐
│ Server State (Source of Truth)                          │
│ - Appointment                                           │
│ - Consultation                                          │
│ - Patient                                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ React Query fetches & caches
                  ▼
┌─────────────────────────────────────────────────────────┐
│ React Query Cache (Client-side cache)                   │
│ - useQuery('appointment', ...)                         │
│ - useQuery('consultation', ...)                        │
│ - useQuery('patient', ...)                              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Components read from cache
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Component State (Derived + Local)                       │
│ - Derived: consultationStatus, canStart, canComplete    │
│ - Local: form inputs, tab selection, UI state            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ User interactions trigger mutations
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Mutations (React Query useMutation)                     │
│ - startConsultation()                                   │
│ - saveConsultationDraft()                               │
│ - completeConsultation()                                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Optimistic updates + server sync
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Server State (Updated)                                  │
│ - Backend validates state machine transitions           │
│ - Returns updated state                                 │
└─────────────────────────────────────────────────────────┘
```

### 2.5 State Validation Rules

**Frontend Validation (UX):**
- Disable "Start Consultation" if `appointment.status !== SCHEDULED`
- Disable "Complete Consultation" if `consultation.started_at === null`
- Show warnings for unsaved changes before navigation

**Backend Validation (Source of Truth):**
- Backend enforces state machine transitions
- Frontend must handle validation errors gracefully
- Never bypass backend validation

---

## 3. Data Fetching Strategy

### 3.1 Data Fetching Principles

1. **Single Source of Truth**: All data comes from backend APIs
2. **Optimistic Updates**: Update UI immediately, sync with server in background
3. **Auto-refresh**: Poll for state changes during active consultation
4. **Error Recovery**: Retry failed requests, show user-friendly errors
5. **Network Resilience**: Handle slow/failing networks gracefully

### 3.2 API Endpoints

#### Existing APIs
- `GET /api/appointments/:id` - Get appointment details
- `POST /api/consultations/:id/start` - Start consultation
- `POST /api/consultations/:id/complete` - Complete consultation
- `GET /api/patients/:patientId` - Get patient details

#### New APIs Needed
- `GET /api/consultations/:id` - Get consultation details (if exists)
- `PUT /api/consultations/:id/draft` - Save consultation draft notes
- `GET /api/patients/:patientId/consultations` - Get patient consultation history

### 3.3 Fetching Strategy

#### Initial Load
```typescript
// Parallel fetching for faster load
const appointmentQuery = useQuery({
  queryKey: ['appointment', appointmentId],
  queryFn: () => doctorApi.getAppointment(appointmentId),
  staleTime: 0, // Always fresh
});

const consultationQuery = useQuery({
  queryKey: ['consultation', appointmentId],
  queryFn: () => consultationApi.getConsultation(appointmentId),
  enabled: !!appointmentId, // Only fetch if appointment exists
  staleTime: 0,
});

const patientQuery = useQuery({
  queryKey: ['patient', patientId],
  queryFn: () => doctorApi.getPatient(patientId),
  enabled: !!patientId,
  staleTime: 5 * 60 * 1000, // 5 minutes (patient data changes less frequently)
});
```

#### Auto-refresh During Active Consultation
```typescript
// Poll for state changes every 30 seconds during active consultation
const consultationQuery = useQuery({
  queryKey: ['consultation', appointmentId],
  queryFn: () => consultationApi.getConsultation(appointmentId),
  enabled: isConsultationActive,
  refetchInterval: 30000, // 30 seconds
  refetchIntervalInBackground: true,
});
```

#### Auto-save Draft
```typescript
// Debounced auto-save (every 30 seconds or on blur)
const saveDraftMutation = useMutation({
  mutationFn: (notes: string) => 
    consultationApi.saveDraft(appointmentId, { doctorNotes: notes }),
  onSuccess: () => {
    // Invalidate queries to refetch
    queryClient.invalidateQueries(['consultation', appointmentId]);
  },
});

// Debounce auto-save
const debouncedSave = useMemo(
  () => debounce((notes: string) => {
    saveDraftMutation.mutate(notes);
  }, 30000), // 30 seconds
  [saveDraftMutation]
);
```

### 3.4 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Component Mount                                         │
│ - appointmentId from route params                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Parallel Data Fetching                                  │
│ - GET /api/appointments/:id                            │
│ - GET /api/consultations/:id (if exists)               │
│ - GET /api/patients/:patientId                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ React Query Cache                                       │
│ - Cached appointment, consultation, patient data        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Component Renders                                        │
│ - Shows loading state while fetching                    │
│ - Shows error state if fetch fails                      │
│ - Shows consultation UI when data loaded                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ User edits form
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Auto-save Triggered (debounced)                         │
│ - PUT /api/consultations/:id/draft                      │
│ - Optimistic update in UI                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Success
                  ▼
┌─────────────────────────────────────────────────────────┐
│ State Updated                                            │
│ - Query cache invalidated                                │
│ - UI reflects saved state                                │
└─────────────────────────────────────────────────────────┘
```

### 3.5 Error Handling in Data Fetching

- **Network Errors**: Show retry button, auto-retry with exponential backoff
- **Validation Errors**: Show inline error messages, highlight invalid fields
- **Server Errors**: Show user-friendly error message, log details for debugging
- **Timeout Errors**: Show "Connection slow" indicator, allow manual retry

---

## 4. Error Handling Strategy

### 4.1 Error Categories

#### 4.1.1 Network Errors
- **Slow Network**: Show loading indicator, allow cancellation
- **Network Failure**: Show retry button, preserve form state
- **Timeout**: Show timeout message, allow manual retry

#### 4.1.2 Validation Errors
- **State Machine Violations**: 
  - Example: "Cannot start consultation: Appointment not checked in"
  - Show error message, disable action button
- **Required Field Missing**: 
  - Highlight field, show inline error
- **Invalid Data Format**: 
  - Show format requirements, highlight field

#### 4.1.3 Server Errors
- **500 Internal Server Error**: 
  - Show generic error, log details
  - Preserve form state, allow retry
- **403 Forbidden**: 
  - Show "Access denied" message
  - Redirect to appropriate page
- **404 Not Found**: 
  - Show "Consultation not found" message
  - Redirect to appointments list

### 4.2 Error Handling Patterns

#### 4.2.1 Optimistic Updates with Rollback
```typescript
const mutation = useMutation({
  mutationFn: saveDraft,
  onMutate: async (newNotes) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['consultation', appointmentId]);
    
    // Snapshot previous value
    const previousConsultation = queryClient.getQueryData(['consultation', appointmentId]);
    
    // Optimistically update
    queryClient.setQueryData(['consultation', appointmentId], (old) => ({
      ...old,
      doctor_notes: newNotes,
    }));
    
    return { previousConsultation };
  },
  onError: (err, newNotes, context) => {
    // Rollback on error
    queryClient.setQueryData(['consultation', appointmentId], context.previousConsultation);
    toast.error('Failed to save draft. Please try again.');
  },
  onSuccess: () => {
    toast.success('Draft saved');
  },
});
```

#### 4.2.2 Retry Logic
```typescript
const query = useQuery({
  queryKey: ['consultation', appointmentId],
  queryFn: fetchConsultation,
  retry: 3, // Retry 3 times
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  onError: (error) => {
    if (error instanceof NetworkError) {
      toast.error('Network error. Retrying...');
    }
  },
});
```

#### 4.2.3 Error Boundaries
```typescript
// Top-level error boundary for consultation session
<ErrorBoundary
  fallback={<ConsultationErrorFallback />}
  onError={(error, errorInfo) => {
    // Log error to error tracking service
    logError(error, errorInfo);
  }}
>
  <ConsultationSessionPage />
</ErrorBoundary>
```

### 4.3 User-Facing Error Messages

#### Network Errors
- **Slow Network**: "Connection is slow. Please wait..."
- **Network Failure**: "Unable to connect. Click to retry."
- **Timeout**: "Request timed out. Please try again."

#### Validation Errors
- **State Machine**: "Cannot perform this action. The consultation state has changed."
- **Required Field**: "This field is required."
- **Invalid Format**: "Please enter a valid [format]."

#### Server Errors
- **500 Error**: "An error occurred. Your changes have been saved locally. Please refresh the page."
- **403 Forbidden**: "You don't have permission to perform this action."
- **404 Not Found**: "Consultation not found. It may have been deleted."

### 4.4 Error Recovery

#### Auto-save Failure
1. Show error indicator in auto-save status
2. Keep form state in local storage as backup
3. Show "Retry Save" button
4. On page reload, attempt to restore from local storage

#### State Mismatch
1. Detect when server state differs from local state
2. Show "State has changed" dialog
3. Offer to reload or merge changes
4. Prevent data loss by preserving local changes

#### Network Interruption
1. Queue failed mutations
2. Retry automatically when network recovers
3. Show "Reconnecting..." indicator
4. Notify user when reconnected

---

## 5. Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create consultation session page route
- [ ] Set up React Query for data fetching
- [ ] Create API client methods for consultation endpoints
- [ ] Implement error boundaries
- [ ] Create base layout components

### Phase 2: Patient Context
- [ ] Patient info sidebar component
- [ ] Medical history display
- [ ] Previous consultations list
- [ ] Quick links to patient resources

### Phase 3: Consultation Workspace
- [ ] Tab navigation component
- [ ] Patient goals tab
- [ ] Examination tab
- [ ] Procedure discussion tab
- [ ] Recommendations tab
- [ ] Treatment plan tab

### Phase 4: Notes & Auto-save
- [ ] Consultation notes editor
- [ ] Auto-save implementation (debounced)
- [ ] Auto-save indicator
- [ ] Draft recovery on page load

### Phase 5: Complete Consultation
- [ ] Complete consultation dialog
- [ ] Outcome type selection
- [ ] Patient decision capture
- [ ] Follow-up scheduling

### Phase 6: Polish & Error Handling
- [ ] Network error handling
- [ ] State validation
- [ ] Loading states
- [ ] Error messages
- [ ] Accessibility improvements

---

## Summary

The Consultation Session UI is designed to be a clinical workstation that:
1. **Reflects backend state machines** - No frontend-invented logic
2. **Always shows patient context** - Patient info always visible
3. **Prevents data loss** - Auto-save with recovery
4. **Handles network issues gracefully** - Retry logic, optimistic updates
5. **Minimizes cognitive load** - Clear layout, minimal clicks

The implementation follows a phased approach, starting with core infrastructure and building up to the full consultation workspace.
