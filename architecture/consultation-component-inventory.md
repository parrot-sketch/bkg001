# Consultation Module — Component Inventory

## 1. Pages

### 1.1 `app/doctor/consultations/session/[appointmentId]/page.tsx`
**Purpose:** Entry point for the real-time doctor consultation room  
**Responsibility:** Authentication, layout orchestration, state initialization, loading/error/no-patient states  
**Exports:** `ConsultationSessionPageOptimized` (default)  
**Dependencies:**
- `ConsultationProvider` (context)
- `ConsultationSessionHeader` (lazy)
- `PatientInfoSidebar` (lazy)
- `ConsultationWorkspaceOptimized` (lazy)
- `ConsultationQueuePanel` (lazy)
- `StartConsultationDialog` (lazy)
- `CompleteConsultationDialog` (lazy)
- `useAuth` (hook)
- `Role` (enum)

**Consumers:** Next.js App Router (`/doctor/consultations/session/[appointmentId]`)  
**Side Effects:** Triggers `loadWaitingQueue` when appointment becomes available

---

### 1.2 `app/doctor/consultations/[consultationId]/page.tsx`
**Purpose:** Read-only server-rendered detail page for a completed consultation  
**Responsibility:** Auth, doctor ownership verification, Prisma data fetching, legacy note parsing  
**Exports:** `ConsultationDetailPage` (default)  
**Dependencies:**
- `ConsultationDetailPageContent` (client component)
- `getCurrentUser` (auth)
- `db` (Prisma)

**Consumers:** Next.js App Router (`/doctor/consultations/[consultationId]`)  
**Side Effects:** Server-side database queries only

---

## 2. Layouts

### 2.1 `app/doctor/layout.tsx`
**Purpose:** Top-level layout wrapper for all doctor dashboard routes  
**Responsibility:** Sidebar, header, auth guards, onboarding provider  
**Exports:** `DoctorLayout` (default)  
**Dependencies:**
- `DoctorSidebar`, `DoctorHeader`
- `OnboardingTourProvider`
- `useAuth`
- `useDoctorDashboard`

**Consumers:** All `/doctor/*` routes  
**Side Effects:** Redirects non-authenticated/non-doctor users

---

## 3. Contexts

### 3.1 `contexts/ConsultationContext.tsx`
**Purpose:** Single source of truth for consultation session state  
**Responsibility:** 
- Data fetching orchestration (appointment, patient, vitals, consultation, history)
- Workflow state machine (reducer)
- Auto-save with debouncing
- Heartbeat for session integrity
- Dirty state tracking
- Queue management
- Patient switching

**Exports:**
- `ConsultationProvider` (component)
- `useConsultationContext` (hook)
- `VitalsData` (interface)
- `StructuredNotes` (interface)

**State Shape (ConsultationProviderState):**
```typescript
{
  workflow: ConsultationWorkflowContext;
  appointment: AppointmentResponseDto | null;
  patient: PatientResponseDto | null;
  vitals: VitalsData | null;
  consultation: ConsultationResponseDto | null;
  doctorId: string | null;
  consultationHistory: PatientConsultationHistoryItemDto[];
  notes: StructuredNotes;
  outcomeType: ConsultationOutcomeType | null;
  patientDecision: PatientDecision | null;
  isLoading: boolean;
  isSaving: boolean;
  showCompleteDialog: boolean;
  showStartDialog: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}
```

**Actions Exposed:**
- `loadAppointment(appointmentId)`
- `startConsultation()`
- `closeStartDialog()`
- `saveDraft()`
- `saveNotes()`
- `updateNotes(field, value)`
- `setOutcome(outcome)`
- `setPatientDecision(decision)`
- `openCompleteDialog()`
- `closeCompleteDialog()`
- `completeConsultation(redirectPath?)`
- `switchToPatient(appointmentId)`
- `goToSurgeryPlanning()`

**Derived Values:**
- `isActive` — appointment IN_CONSULTATION and consultation IN_PROGRESS
- `isReadOnly` — appointment COMPLETED/CANCELLED or consultation COMPLETED
- `canSave` — `workflow.isDirty`
- `canComplete` — `isActive && !isSaving`
- `waitingQueue` — filtered today's appointments excluding current

**Dependencies:**
- React: `useReducer`, `useCallback`, `useEffect`, `useRef`, `useMemo`, `useState`
- TanStack Query: `useQueryClient`
- Hooks: `useAuth`, `useDoctorTodayAppointments`, `useConsultation`, `useSaveConsultationDraft`, `usePatientConsultationHistory`
- API: `doctorApi`, `consultationApi`, `apiClient`
- Actions: `updateCompletedConsultationNotes`
- Domain: `AppointmentStatus`, `ConsultationState`, `ConsultationOutcomeType`, `PatientDecision`, `ConsultationWorkflowState`, `ConsultationWorkflowAction`

**Consumers:**
- `ConsultationSessionPageOptimized`
- `ConsultationSessionHeader`
- `ConsultationWorkspaceOptimized`
- `ConsultationQueuePanel`
- `StartConsultationDialog`
- `CompleteConsultationDialog`

**Lifecycle:**
- Mounts with `initialAppointmentId`
- `useEffect` triggers `loadAppointment` if `initialAppointmentId && user`
- Auto-save `useEffect` runs when `isActive && isDirty`
- Heartbeat `useEffect` runs when `isActive && consultation.id`
- `beforeunload` listener warns on dirty state
- Unmount: cleans up timeouts, intervals, listeners

---

## 4. Components

### 4.1 `components/consultation/PatientInfoSidebar.tsx`
**Purpose:** Left panel displaying patient demographics, vitals, allergies, conditions, visit note, contact info, emergency contact, and previous consultations  
**Responsibility:** Present patient data in a scrollable sidebar with collapsible sections  
**Props:**
- `patient: PatientResponseDto`
- `appointment?: AppointmentResponseDto | null`
- `vitals?: VitalsData | null`
- `consultationHistory?: PatientConsultationHistoryItemDto[]`

**Internal State:** `selectedConsultation` (modal open/close)  
**Dependencies:**
- `ConsultationOutcomeType`, `getConsultationOutcomeTypeLabel`
- `ConsultationState`
- `format` from `date-fns`
- Icons from `lucide-react`

**Consumers:** `ConsultationSessionPageOptimized`  
**Renders:**
- Patient identity header
- Vitals grid with warning indicators
- Allergies alert box
- Conditions text
- Visit note
- Contact rows
- Emergency contact rows
- Previous consultations list (clickable cards)
- Modal overlay for consultation detail

---

### 4.2 `components/consultation/ConsultationSessionHeader.tsx`
**Purpose:** Top navigation bar for the consultation room  
**Responsibility:** Patient info display, status badge, timer, auto-save status, sidebar toggle, action buttons  
**Props:**
- `patientName: string`
- `consultation?: ConsultationResponseDto`
- `appointmentStatus?: string`
- `userRole: Role`
- `onSaveDraft: () => void`
- `onComplete: () => void`
- `autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error'`
- `isSaving: boolean`
- `patientSidebarCollapsed: boolean`
- `onTogglePatientSidebar: () => void`
- `slotStartTime?: Date`
- `slotDurationMinutes?: number`

**Dependencies:**
- `useConsultationTimer` hook
- `ConsultationState`, `Role`
- Icons from `lucide-react`

**Consumers:** `ConsultationSessionPageOptimized` (via Suspense)

---

### 4.3 `components/consultation/ConsultationWorkspaceOptimized.tsx`
**Purpose:** Main SOAP documentation workspace  
**Responsibility:** Tabbed interface for Subjective, Objective, Assessment, Plan; handles save and completion actions  
**Props:** None (reads from context)  
**Internal State:** `activeTab` (synced to URL via `router.replace`)  
**Dependencies:**
- `useConsultationContext`
- `StructuredNotes`
- Lazy-loaded tabs: `SubjectiveTab`, `ObjectiveTab`, `AssessmentTab`, `PlanTab`
- UI: `Tabs`, `TabsContent` from shadcn

**Consumers:** `ConsultationSessionPageOptimized`  
**Side Effects:** URL synchronization for active tab

---

### 4.4 `components/consultation/ConsultationQueuePanel.tsx`
**Purpose:** Right-side collapsible panel showing waiting queue  
**Responsibility:** Display waiting/in-consultation patients, handle patient switching with draft save confirmation  
**Props:**
- `currentAppointmentId: number`
- `currentPatientName: string`
- `currentAppointmentStatus: string`
- `doctorId?: string`
- `appointments: AppointmentResponseDto[]`
- `onSwitchPatient: (appointmentId) => void`
- `onSaveDraft: () => Promise<void>`
- `hasDrafts: boolean`
- `onRefresh: () => void`
- `isRefreshing: boolean`
- `defaultCollapsed: boolean`

**Internal State:**
- `isCollapsed` (panel visibility)
- `startingId` (loading state for patient switching)
- `switchConfirmOpen` (confirmation modal)
- `selectedForSwitch` (selected patient for switch)

**Dependencies:**
- `useAuth`
- `doctorApi`
- `useRouter`
- `toast` from `sonner`
- `AppointmentStatus`
- `framer-motion` for animations
- Sub-components: `QueueHeader`, `QueuePatientCard`, `QueueEmptyState`, `QueueFooter`, `CollapsedRail`, `PatientSwitchConfirmation`

**Consumers:** `ConsultationSessionPageOptimized`

---

### 4.5 `components/doctor/StartConsultationDialog.tsx`
**Purpose:** Modal dialog for starting a consultation with optional pre-session notes  
**Responsibility:** Collect doctor notes, submit start consultation request  
**Props:**
- `open: boolean`
- `onClose: () => void`
- `onSuccess: (appointment) => void`
- `appointment: AppointmentResponseDto`
- `doctorId: string`

**Internal State:**
- `doctorNotes` (string)
- `isSubmitting` (boolean)

**Dependencies:**
- `doctorApi.startConsultation`
- `useAuth`
- `useRouter`
- UI: Dialog components, `Avatar`
- Icons from `lucide-react`

**Consumers:** `ConsultationSessionPageOptimized`

---

### 4.6 `components/consultation/CompleteConsultationDialog.tsx`
**Purpose:** Confirmation dialog for finalizing consultation  
**Responsibility:** Advisory warnings, documentation checklist, editable summary, billing summary, completion submission  
**Props:**
- `open: boolean`
- `onClose: () => void`
- `onSuccess: (appointment) => void`
- `consultation: ConsultationResponseDto`
- `appointment: AppointmentResponseDto`
- `doctorId: string`

**Internal State:**
- `summary` (editable summary text)
- `summaryEdited` (boolean)
- `isSubmitting` (boolean)

**Dependencies:**
- `doctorApi.completeConsultation`
- `useAppointmentBilling` hook
- `useConsultationContext`
- Sub-components: `DocumentationChecklist`, `SummaryEditor`, `BillingSummary`

**Consumers:** `ConsultationSessionPageOptimized`

---

## 5. Hooks

### 5.1 `hooks/consultation/useConsultation.ts`
**Purpose:** React Query hook for fetching a single consultation record by appointment ID  
**Responsibility:** Fetch consultation with retry logic, provide derived flags  
**Exports:** `useConsultation(appointmentId)`  
**Returns:** `{ data, isLoading, error, refetch }`  
**Dependencies:**
- `useQuery` from TanStack Query
- `consultationApi.getConsultation`
- `ConsultationState`

**Consumers:** `ConsultationContext`  
**Query Key:** `['consultation', appointmentId]`  
**Stale Time:** `0` (always fresh)

---

### 5.2 `hooks/consultation/useSaveConsultationDraft.ts`
**Purpose:** React Query mutation hook for saving consultation drafts  
**Responsibility:** Optimistic updates with version conflict detection and rollback  
**Exports:** `useSaveConsultationDraft()`  
**Returns:** `{ mutateAsync, isPending, error }`  
**Dependencies:**
- `useMutation` from TanStack Query
- `consultationApi.saveDraft`
- `useQueryClient`
- `toast` from `sonner`

**Consumer:** `ConsultationContext`  
**Mutation Key:** `['save-consultation-draft']`  
**Side Effects:**
- Snapshot before mutation
- Optimistic update to React Query cache
- Rollback on error
- Version conflict detection (checks for `VERSION_CONFLICT` in error)
- Toast notifications

---

### 5.3 `hooks/consultation/usePatientConsultationHistory.ts`
**Purpose:** React Query hook for fetching patient consultation history  
**Responsibility:** Fetch timeline data for sidebar display  
**Exports:** `usePatientConsultationHistory(patientId)`  
**Returns:** `{ data, isLoading, error, refetch }`  
**Dependencies:**
- `useQuery` from TanStack Query
- `consultationApi.getPatientConsultationHistory`

**Consumers:** `ConsultationContext`  
**Query Key:** `['patient-consultations', patientId]`  
**Stale Time:** `5 * 60 * 1000` (5 minutes)

---

### 5.4 `hooks/doctor/useDoctorDashboard.ts`
**Purpose:** React Query hooks for doctor dashboard data  
**Responsibility:** Fetch today's appointments, upcoming appointments, pending confirmations  
**Exports:**
- `useDoctorTodayAppointments(doctorId, enabled, polling)`
- `useDoctorUpcomingAppointments(doctorId, enabled)`
- `useDoctorPendingConfirmations(doctorId, enabled)`

**Dependencies:**
- `useQuery` from TanStack Query
- `doctorApi`
- `AppointmentStatus`

**Consumers:** `ConsultationContext`, `DoctorLayout`, dashboard pages  
**Features:**
- Background polling (`refetchInterval`)
- `offlineFirst` network mode
- Configurable `staleTime` and `gcTime`

---

### 5.5 `hooks/patient/useAuth.ts`
**Purpose:** Thin wrapper exposing authentication state  
**Responsibility:** Expose `user`, `isAuthenticated`, `isLoading` from global `AuthContext`  
**Exports:** `useAuth()`  
**Dependencies:**
- `useAuthContext` from `../../contexts/AuthContext`
- `StoredUser`, `Role`

**Consumers:** Multiple (ConsultationContext, page components, dialogs)

---

### 5.6 `hooks/consultation/useConsultationTimer.ts`
**Purpose:** Timer hook for consultation session duration  
**Responsibility:** Track elapsed/remaining time for the consultation slot  
**Exports:** `useConsultationTimer(slotStartTime, slotDurationMinutes)`  
**Dependencies:**
- `useState`, `useEffect`, `useRef`
- `useConsultationContext` (for isActive)

**Consumers:** `ConsultationSessionHeader`  
**Side Effects:** 1-second interval for timer updates

---

## 6. DTOs

### 6.1 `application/dtos/ConsultationResponseDto.ts`
```typescript
interface ConsultationResponseDto {
  id: number;
  appointmentId: number;
  doctorId: string;
  userId?: string;
  state: ConsultationState;
  startedAt?: Date;
  completedAt?: Date;
  durationMinutes?: number;
  notes?: {
    fullText: string;
    structured?: {
      chiefComplaint?: string;
      examination?: string;
      assessment?: string;
      plan?: string;
    };
  };
  outcomeType?: ConsultationOutcomeType;
  patientDecision?: PatientDecision;
  followUp?: { date?: Date; type?: string; notes?: string };
  createdAt: Date;
  updatedAt: Date;
  photoCount?: number;
  hasMarketingConsentPhotos?: boolean;
  hasCasePlan?: boolean;
  casePlanId?: number;
}
```

### 6.2 `application/dtos/StartConsultationDto.ts`
```typescript
interface StartConsultationDto {
  appointmentId: number;
  doctorId: string;
  userId: string;
  doctorNotes?: string;
}
```

### 6.3 `application/dtos/SaveConsultationDraftDto.ts`
```typescript
interface SaveConsultationDraftDto {
  appointmentId: number;
  doctorId: string;
  notes: {
    rawText: string;
    structured: StructuredNotes;
  };
  outcomeType?: ConsultationOutcomeType;
  patientDecision?: PatientDecision;
  versionToken?: string;
}
```

### 6.4 `application/dtos/PatientConsultationHistoryItemDto.ts`
```typescript
interface PatientConsultationHistoryItemDto {
  id: number;
  appointmentId: number;
  appointmentDate: Date;
  appointmentTime: string;
  doctor: { id: string; name: string; specialization: string };
  state: ConsultationState;
  startedAt?: Date;
  completedAt?: Date;
  durationMinutes?: number;
  outcomeType?: ConsultationOutcomeType;
  patientDecision?: PatientDecision;
  notesSummary?: string;
  photoCount: number;
  hasBeforePhotos: boolean;
  hasAfterPhotos: boolean;
  hasCasePlan: boolean;
  casePlanId?: number;
  patientProceeded: boolean;
}
```

### 6.5 `application/dtos/PatientConsultationHistoryDto.ts`
```typescript
interface PatientConsultationHistoryDto {
  patientId: string;
  totalCount: number;
  consultations: PatientConsultationHistoryItemDto[];
  summary: {
    total: number;
    completed: number;
    proceduresRecommended: number;
    proceduresProceeded: number;
    totalPhotos: number;
  };
}
```

### 6.6 `application/dtos/CompleteConsultationDto.ts`
```typescript
interface CompleteConsultationDto {
  appointmentId: number;
  doctorId: string;
  outcomeType: ConsultationOutcomeType;
  patientDecision?: PatientDecision;
  followUp?: { date?: Date; type?: string; notes?: string };
  billingItems?: Array<{ description: string; amount: number }>;
  referralInfo?: { doctorName: string; reason: string };
}
```

---

## 7. Domain Models

### 7.1 `domain/entities/Consultation.ts`
**Purpose:** Rich domain entity encapsulating consultation business rules  
**Key Methods:**
- `static create()` — factory method
- `start(userId, date)` — transitions NOT_STARTED → IN_PROGRESS
- `updateNotes(notes)` — updates consultation notes
- `complete()` — transitions IN_PROGRESS → COMPLETED
- `isStarted()`, `isInProgress()`, `isCompleted()` — state checks
- `requiresCasePlanning()` — business rule for surgical workflow

**Value Objects:**
- `ConsultationNotes` — encapsulates fullText and structured notes
- `ConsultationDuration` — encapsulates duration minutes

**Immutability:** All state transitions return new instances via constructor

---

### 7.2 `domain/enums/ConsultationState.ts`
```typescript
enum ConsultationState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}
```

**Helpers:**
- `canStartConsultationFromState(state)`
- `canUpdateConsultation(state)`
- `canCompleteConsultation(state)`
- `isTerminalState(state)`

---

### 7.3 `domain/enums/ConsultationOutcomeType.ts`
```typescript
enum ConsultationOutcomeType {
  PROCEDURE_RECOMMENDED = 'PROCEDURE_RECOMMENDED',
  CONSULTATION_ONLY = 'CONSULTATION_ONLY',
  FOLLOW_UP_CONSULTATION_NEEDED = 'FOLLOW_UP_CONSULTATION_NEEDED',
  PATIENT_DECIDING = 'PATIENT_DECIDING',
  REFERRAL_NEEDED = 'REFERRAL_NEEDED'
}
```

**Helpers:**
- `getConsultationOutcomeTypeLabel(type)` — UI label
- `getConsultationOutcomeTypeDescription(type)` — UI description
- `requiresCasePlanning(type)` — business rule

---

### 7.4 `domain/enums/PatientDecision.ts`
```typescript
enum PatientDecision {
  YES = 'YES',
  NO = 'NO',
  PENDING = 'PENDING'
}
```

**Helpers:**
- `getPatientDecisionLabel(decision)`

---

### 7.5 `domain/workflows/ConsultationWorkflowState.ts`
**Purpose:** State machine for UI workflow (distinct from domain entity state)

```typescript
enum ConsultationWorkflowState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  COMPLETING = 'COMPLETING',
  TRANSITIONING = 'TRANSITIONING',
  ERROR = 'ERROR'
}
```

**Key Functions:**
- `getNextState(currentState, action)` — compute next valid state
- `canPerformAction(state, action)` — guard function
- `createInitialContext(appointmentId?)` — factory for initial context

**Valid Transitions:** Defined in `VALID_TRANSITIONS` map

---

## 8. API Client Library

### 8.1 `lib/api/consultation.ts`
```typescript
const consultationApi = {
  getConsultation(appointmentId: number): Promise<ApiResponse<ConsultationResponseDto | null>>
  saveDraft(appointmentId: number, dto: Omit<SaveConsultationDraftDto, 'appointmentId'>): Promise<ApiResponse<ConsultationResponseDto>>
  getPatientConsultationHistory(patientId: string): Promise<ApiResponse<PatientConsultationHistoryDto>>
}
```

### 8.2 `lib/api/doctor.ts` (relevant methods)
```typescript
const doctorApi = {
  startConsultation(dto: { appointmentId: number; doctorId: string; userId: string; doctorNotes?: string }): Promise<ApiResponse<AppointmentResponseDto>>
  completeConsultation(dto: CompleteConsultationDto): Promise<ApiResponse<AppointmentResponseDto>>
  getAppointment(appointmentId: number): Promise<ApiResponse<AppointmentResponseDto>>
  getPatient(patientId: string): Promise<ApiResponse<PatientResponseDto>>
  getTodayAppointments(doctorId: string): Promise<ApiResponse<AppointmentResponseDto[]>>
}
```

### 8.3 `lib/api/client.ts`
**Purpose:** Global HTTP singleton with auth, retry, cache-busting  
**Key Behaviors:**
- Cache-busting: `GET` requests append `?_t=${Date.now()}`
- 401 refresh flow with promise deduplication
- Response cloning for JSON parse retry
- Token auto-initialization from storage

---

## 9. Use Cases

### 9.1 `application/use-cases/StartConsultationUseCase.ts`
**Purpose:** Orchestrate consultation initiation  
**Steps:**
1. Auto-heal stale IN_CONSULTATION appointments (non-blocking cleanup)
2. Validate doctor assignment (allow queue-based reconciliation)
3. Validate state transition via `AppointmentStateTransitionService`
4. Update Appointment → IN_CONSULTATION
5. Create Consultation record if not exists
6. Start Consultation → IN_PROGRESS
7. Update PatientQueue → IN_CONSULTATION
8. Ensure DoctorPatientAssignment
9. Audit log
10. Return `AppointmentResponseDto`

**Recently Fixed:** Idempotent handling when appointment is already IN_CONSULTATION (returns existing data instead of 400 error)

### 9.2 `application/use-cases/CompleteConsultationUseCase.ts`
**Purpose:** Orchestrate consultation completion  
**Steps:**
1. Validate appointment not already completed/cancelled
2. Finalize Consultation record (merge notes, set outcome)
3. Update Appointment → COMPLETED with temporal fields
4. Optionally schedule follow-up
5. Create billing + payment (always created, left UNPAID)
6. If PROCEDURE_RECOMMENDED + patient YES → create SurgicalCase + CasePlan
7. Send email + in-app notifications
8. Update PatientQueue, DoctorPatientAssignment
9. Audit log

---

## 10. Repositories

### 10.1 `infrastructure/database/repositories/PrismaConsultationRepository.ts`
**Purpose:** Prisma implementation of `IConsultationRepository`  
**Methods:**
- `findById(id)`
- `findByAppointmentId(appointmentId)`
- `save(consultation)`
- `update(consultation)`
- `updateNotes(consultationId, notes)`
- `findByPatientId(patientId, limit?, offset?)`
- `findCompletedByPatientId(patientId, limit?, offset?)`

**Maps between:** Prisma `Consultation` model ↔ Domain `Consultation` entity

### 10.2 `infrastructure/database/repositories/PrismaAppointmentRepository.ts`
**Purpose:** Prisma implementation of `IAppointmentRepository`  
**Consumed by:** StartConsultationUseCase, CompleteConsultationUseCase

---

## 11. Server Actions

### 11.1 `app/actions/doctor/consultation-hub.ts`
**Purpose:** Server actions for Consultations Hub page  
**Exports:**
- `getConsultationsForHub(doctorId, startDate, endDate)` — fetch completed consultations
- `initiateSurgicalCase(consultationId, doctorId)` — create surgical case from consultation
- `updateConsultationOutcome(consultationId, doctorId, outcomeType, patientDecision)` — update outcome
- `updateCompletedConsultationNotes(consultationId, doctorId, chiefComplaint, examination, plan)` — edit notes post-completion

---

## 12. Sub-Components (Queue Panel)

### 12.1 Queue Header
Displays queue title and patient count

### 12.2 Queue Patient Card
Individual patient card with status, arrival time, late indicator, start button

### 12.3 Queue Empty State
Empty queue messaging with illustration

### 12.4 Queue Footer
Summary statistics, refresh button

### 12.5 Collapsed Rail
Vertical rail when panel is collapsed

### 12.6 PatientSwitchConfirmation
Confirmation dialog when switching patients with unsaved drafts

---

## 13. Tab Components (Workspace)

### 13.1 SubjectiveTab
Chief complaint, history of present illness, symptom details

### 13.2 ObjectiveTab
Vitals entry, physical examination findings

### 13.3 AssessmentTab
Diagnosis, differential diagnosis, clinical impression

### 13.4 PlanTab
Treatment plan, medications, follow-up instructions, outcome selection, patient decision

*Note: These tab components are lazy-loaded but were not fully audited in this discovery pass.*

---

## 14. Supporting Components

### 14.1 DocumentationChecklist (in CompleteConsultationDialog)
Checklist of required documentation items before completion

### 14.2 SummaryEditor (in CompleteConsultationDialog)
Editable textarea for doctor to customize consultation summary

### 14.3 BillingSummary (in CompleteConsultationDialog)
Display of billing items and amounts for the consultation

---

## 15. Utilities

### 15.1 `generateFullText(notes)` in ConsultationContext
Converts structured SOAP notes to full-text format for storage

### 15.2 `parseLegacyNotes(fullText)` in ConsultationContext
Parses legacy full-text notes into structured format using regex

---

## 16. Summary Statistics

| Category | Count |
|----------|-------|
| Pages | 2 |
| Layouts | 1 |
| Contexts | 1 |
| Components | 9+ |
| Sub-components | 6+ |
| Tab Components | 4 |
| Hooks | 6 |
| DTOs | 6 |
| Domain Enums | 3 |
| Domain Entity | 1 |
| Workflow Definition | 1 |
| Use Cases | 2 |
| API Routes | 2 |
| Server Actions | 4 |
| Repositories | 2 |
| API Clients | 3 |
| Utilities | 2 |
