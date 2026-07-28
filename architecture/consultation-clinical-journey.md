# Consultation Module — Clinical Journey

## 1. End-to-End Clinician Journey

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    DOCTOR CLINICAL JOURNEY MAP                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  [1] AUTHENTICATION                                                          ║
║       │                                                                       ║
║       ▼                                                                       ║
║  [2] QUEUE VISIBILITY                                                        ║
║       │                                                                       ║
║       ▼                                                                       ║
║  [3] PATIENT SELECTION                                                       ║
║       │                                                                       ║
║       ▼                                                                       ║
║  [4] SESSION INITIATION                                                      ║
║       │                                                                       ║
║       ▼                                                                       ║
║  [5] WORKSPACE LOADING                                                       ║
║       │                                                                       ║
║       ├─────────────────────────────────────────────────────────┐             ║
║       │                                                         │             ║
║       ▼                                                         ▼             ║
║  [6A] PATIENT CONTEXT              [6B] CLINICAL DOCUMENTATION   │             ║
║       │                                                         │             ║
║       ▼                                                         │             ║
║  [7A] HISTORY REVIEW                [7B] SOAP NOTE ENTRY        │             ║
║       │                                                         │             ║
║       │                    ┌────────────┴────────────┐          │             ║
║       │                    │                           │          │             ║
║       │                    ▼                           ▼          │             ║
║       │            [8A] OUTCOME SELECTION    [8B] DRAFT SAVE  │          │             ║
║       │                    │                           │          │             ║
║       │                    └────────────┬──────────────┘          │             ║
║       │                                     │                        │             ║
║       │                                     ▼                        │             ║
║       │                    [9] CONSULTATION COMPLETION               │             ║
║       │                                     │                        │             ║
║       │                                     ▼                        │             ║
║       │                    [10] BUSINESS OUTCOMES                    │             ║
║       │                    ├── Billing                               │             ║
║       │                    ├── Surgical Case                        │             ║
║       │                    └── Notifications                        │             ║
║       │                                     │                        │             ║
║       │                                     ▼                        │             ║
║       │                    [11] QUEUE PROGRESSION                    │             ║
║       │                    ├── Load next patient                    │             ║
║       │                    └── Navigate to hub                      │             ║
║       │                                                              │             ║
║       └─────────────────────────────────────────────────────────────┘             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Journey Step Detail

### Step 1: Authentication
**Capabilities:** Authentication & Authorization  
**Entry Point:** Application load  
**User Action:** Log in with credentials  
**System Response:**
- JWT token issued
- AuthContext populated
- Role verified (DOCTOR)
- Redirect to `/doctor/dashboard` or `/doctor/consultations/session/:id`

**Capability Transitions:**
- Before: Unauthenticated
- After: Authenticated, session active

---

### Step 2: Queue Visibility
**Capabilities:** Queue Management  
**Entry Point:** Doctor dashboard or consultation hub  
**User Action:** View today's appointments  
**System Response:**
- `useDoctorTodayAppointments` fetches appointments
- Background polling keeps data fresh
- Queue panel displays waiting/in-consultation patients

**Capability Transitions:**
- Doctor aware of patient flow
- Identifies next patient to consult

---

### Step 3: Patient Selection
**Capabilities:** Queue Management  
**Entry Point:** Queue panel patient card  
**User Action:** Click "Begin Consultation" or "Continue"  
**System Response:**
- If dirty: PatientSwitchConfirmation modal shown
- If clean or confirmed: `router.push` to session page

**Capability Transitions:**
- From: Queue browsing
- To: Session initiation

---

### Step 4: Session Initiation
**Capabilities:** Consultation Session Management, Authentication & Authorization, Doctor Assignment Validation  
**Entry Point:** StartConsultationDialog or direct queue action  
**User Action:** Submit optional pre-session notes, confirm start  
**System Response:**
- `doctorApi.startConsultation(dto)`
- `POST /api/consultations/:id/start`
- Backend validates auth, assignment, state transition
- Appointment → `IN_CONSULTATION`
- Consultation → `IN_PROGRESS`
- PatientQueue → `IN_CONSULTATION`

**Capability Transitions:**
- From: Queue
- To: Active consultation room

---

### Step 5: Workspace Loading
**Capabilities:** Consultation Session Management, Draft Restoration (Session Recovery)  
**Entry Point:** Session page mount  
**User Action:** Wait for data to load  
**System Response:**
- `ConsultationProvider` mounts
- `loadAppointment(appointmentId)` triggered
- Tier 1: Parallel fetch appointment, doctor, consultation
- Tier 2: Parallel fetch patient, vitals
- Draft restoration from localStorage
- Workflow state → `ACTIVE` or `READY`
- 3-column workspace renders

**Capability Transitions:**
- From: Loading
- To: Ready or Active

**Parallel Capability Activation:**
- Patient Profile Review (left panel)
- Queue Management (right panel)
- Timer & Session Duration Tracking (header)

---

### Step 6A: Patient Context (Parallel Track)
**Capabilities:** Patient Profile Review, Consultation History Review, Previous Consultation Reference (Modal)  
**Entry Point:** Left sidebar auto-render  
**User Action:** Review patient demographics, vitals, history  
**System Response:**
- Patient identity rendered
- Vitals displayed with warnings
- Allergies, conditions, contact shown
- Previous consultations listed (up to 8)
- Click → modal with full details

**Capability Transitions:**
- Ongoing throughout consultation
- Non-blocking, reference-only

---

### Step 6B: Clinical Documentation (Parallel Track)
**Capabilities:** Clinical Documentation, Draft Management (Auto-Save)  
**Entry Point:** Workspace tabs  
**User Action:** Enter SOAP notes in tabs  
**System Response:**
- Each keystroke → `UPDATE_NOTE_FIELD` dispatch
- Debounced 3-second auto-save
- Draft persisted to server + localStorage
- Auto-save indicator updates

**Capability Transitions:**
- Ongoing throughout consultation
- Background auto-save continuous

---

### Step 7A: History Review (On-Demand)
**Capabilities:** Consultation History Review  
**Entry Point:** Click history card in sidebar  
**User Action:** Click previous consultation  
**System Response:**
- Modal overlay renders
- Shows date, doctor, outcome, duration, notes summary, photos, case plan
- Link to full appointment details

**Capability Transitions:**
- From: Active consultation
- To: Reference mode (modal)
- Back: Active consultation (modal close)

**Non-Blocking:** Current consultation session remains active

---

### Step 7B: SOAP Note Entry (Primary Activity)
**Capabilities:** Clinical Documentation  
**Entry Point:** Subjective, Objective, Assessment, Plan tabs  
**User Action:** Type clinical notes  
**System Response:**
- Tab content updates
- Notes stored in `state.notes`
- `workflow.isDirty` set to true
- Auto-save triggered after 3s

**Capability Transitions:**
- Continuous throughout session
- Transitions to Outcome Management in Plan tab

---

### Step 8A: Outcome Selection
**Capabilities:** Outcome Management  
**Entry Point:** Plan tab outcome selector  
**User Action:** Select outcome type from dropdown  
**System Response:**
- `setOutcome(outcomeType)` dispatched
- If `PROCEDURE_RECOMMENDED` → `patientDecision` auto-set to `YES`
- Otherwise → `patientDecision` cleared to `null`
- Outcome persisted via draft save

**Capability Transitions:**
- From: Documentation
- To: Completion preparation

**Decision Point:**
- `PROCEDURE_RECOMMENDED` + `YES` → triggers Surgical Case Initiation on completion
- `PROCEDURE_RECOMMENDED` + `NO/PENDING` → no surgical case
- `CONSULTATION_ONLY` → no surgical case
- `FOLLOW_UP_CONSULTATION_NEEDED` → no surgical case
- `REFERRAL_NEEDED` → no surgical case

---

### Step 8B: Draft Save (Background)
**Capabilities:** Draft Management (Auto-Save), Draft Management (Manual Save), Version Conflict Recovery  
**Entry Point:** Debounce timer or manual Save button  
**User Action:** None (auto) or click Save (manual)  
**System Response:**
- `saveDraft()` called
- `useSaveConsultationDraft` mutation
- Optimistic update to React Query cache
- `PUT /appointments/:id/consultation/draft`
- On success: localStorage backup, clear dirty flag
- On version conflict: rollback, refetch, reconcile

**Capability Transitions:**
- Continuous safety net
- No user-facing transition

---

### Step 9: Consultation Completion
**Capabilities:** Consultation Completion, Outcome Management  
**Entry Point:** "Complete" button in header  
**User Action:** Click Complete → confirm in dialog → review summary → click Finalize  
**System Response:**
- `CompleteConsultationDialog` opens
- Advisory warnings checked
- Documentation checklist verified
- Summary editor available (editable)
- Billing summary displayed
- On confirm: `doctorApi.completeConsultation(dto)`
- `POST /api/consultations/:id/complete`

**Backend Execution:**
1. Finalize consultation record
2. Merge notes, set outcome
3. Update appointment → `COMPLETED`
4. Set `consultation_ended_at`, `consultation_duration`
5. Optionally schedule follow-up
6. Create billing + payment (UNPAID)
7. If `PROCEDURE_RECOMMENDED + YES`:
   - Create `SurgicalCase`
   - Create `CasePlan`
8. Send email to patient
9. Send in-app notifications to frontdesk/nurses
10. Update `PatientQueue`, `DoctorPatientAssignment`
11. Audit log

**Capability Transitions:**
- From: Active consultation
- To: Terminal state (completed)

---

### Step 10: Business Outcomes
**Capabilities:** Billing Creation, Surgical Case Initiation, Notification Dispatch, Audit & Compliance Logging  
**Entry Point:** Completion backend processing  
**User Action:** None (system-initiated)  
**System Response:**
- Billing record created with UNPAID status
- If applicable: SurgicalCase + CasePlan created
- Email notification sent to patient
- In-app notifications to frontdesk/nurses
- Audit event recorded

**Capability Transitions:**
- All triggered simultaneously on completion

---

### Step 11: Queue Progression & Auto-Routing
**Capabilities:** Queue Progression & Auto-Routing, Patient Switching  
**Entry Point:** Post-completion context handler  
**User Action:** None (automatic)  
**System Response:**
- Aggressive cache invalidation (7 query keys)
- localStorage draft cleared
- Context state reset
- Find next patient:
  - Priority 1: `IN_CONSULTATION` appointment (resume)
  - Priority 2: `CHECKED_IN` or `READY_FOR_CONSULTATION` appointment
- If found: `loadAppointment(nextPatient.id)` → new session
- If none: `router.push('/doctor/consultations')`

**Capability Transitions:**
- From: Completed consultation
- To: Next patient session OR hub

---

## 3. Alternate Journey Paths

### 3.1 Resume Existing Consultation
```
Queue → Continue Button
    ↓
POST /start (idempotent)
    ↓
Existing IN_CONSULTATION returned
    ↓
Workspace loads with existing notes
    ↓
Continue documentation
    ↓
Complete (same as primary flow)
```

### 3.2 Consultation Already Completed (Read-Only)
```
Direct navigation to session page
    ↓
Appointment status = COMPLETED
    ↓
Workflow → READY (no dialogs)
    ↓
Read-only workspace (if any)
    ↓
No save, no complete, no start
```

### 3.3 Load Failure Recovery
```
Session page loads
    ↓
Data fetch fails
    ↓
ERROR state rendered
    ↓
User clicks "Try again"
    ↓
window.location.reload()
    ↓
Full retry from Step 1
```

### 3.4 Switch Patient with Unsaved Changes
```
Active consultation
    ↓
User clicks different patient in queue
    ↓
Dirty state detected
    ↓
Confirmation dialog shown
    ↓
User confirms
    ↓
saveDraft() [await]
    ↓
If save fails: log error, navigate anyway
    ↓
router.push to new patient
    ↓
New session loads (Step 4)
```

---

## 4. Decision Points

### 4.1 Start Consultation Decision
```
Appointment status?
├── SCHEDULED/PENDING/CONFIRMED → "Patient hasn't arrived yet" (block)
├── CANCELLED → "Cancelled" (block)
├── COMPLETED → "Already completed" (block)
├── NO_SHOW → "No-show" (block)
├── IN_CONSULTATION → Idempotent return (allow)
├── CHECKED_IN/READY_FOR_CONSULTATION → Allow start
```

### 4.2 Completion Decision
```
Outcome type?
├── PROCEDURE_RECOMMENDED + YES → Create SurgicalCase + CasePlan
├── PROCEDURE_RECOMMENDED + NO/PENDING → No surgical case
├── CONSULTATION_ONLY → No surgical case
├── FOLLOW_UP_CONSULTATION_NEEDED → No surgical case
└── REFERRAL_NEEDED → No surgical case

Queue status after completion?
├── IN_CONSULTATION patient exists → Resume next
├── CHECKED_IN/READY patient exists → Start next
└── None → Navigate to hub
```

### 4.3 Draft Conflict Decision
```
Draft timestamp vs Server updatedAt?
├── Draft newer → Restore draft silently
└── Draft older/equal → Discard draft
```

---

## 5. Capability Overlap Map

| Journey Step | Active Capabilities | Overlap Intensity |
|-------------|---------------------|-------------------|
| 1. Authentication | Authentication & Authorization | None |
| 2. Queue Visibility | Queue Management, Authentication | Low |
| 3. Patient Selection | Queue Management, Authentication | Low |
| 4. Session Initiation | Consultation Session Management, Auth, Doctor Assignment | Medium |
| 5. Workspace Loading | Session Management, Draft Restoration, Auth | Medium |
| 6. Parallel Tracks | Patient Profile, History, Documentation, Queue, Timer | **High** |
| 7. History Review | Consultation History, Previous Reference | Low |
| 8. Documentation | Clinical Documentation, Auto-Save, Manual Save | **High** |
| 9. Outcome Selection | Outcome Management, Draft Management | Medium |
| 10. Completion | Completion, Outcome, Billing, Surgical, Notifications, Audit | **High** |
| 11. Queue Progression | Queue Progression, Patient Switching, Session Management | Medium |

**Overlap Observations:**
- **Step 6 (Parallel Tracks)** is the highest overlap point — 5 capabilities active simultaneously
- **Step 10 (Completion)** is the second highest — 7 capabilities triggered in sequence
- **Steps 8-9 (Documentation + Outcome)** are tightly coupled and often trigger together
- **Auto-save and manual save** are redundant but complementary (auto-save is safety net, manual is explicit control)

---

## 6. Friction Points

### 6.1 High-Friction: Completion
- Multiple sequential validation steps
- Advisory warnings
- Documentation checklist
- Summary editing
- Billing review
- Confirmation required

**Clinical Rationale:** High friction is appropriate — completion is a terminal action with significant downstream effects.

### 6.2 Low-Friction: Documentation
- Instant keystroke capture
- Background auto-save
- No interruption to flow

**Clinical Rationale:** Low friction encourages complete documentation.

### 6.3 Medium-Friction: Session Start
- Optional notes entry
- Single confirmation
- Quick transition to workspace

**Clinical Rationale:** Moderate friction ensures readiness without delaying care.

---

## 7. Summary

The clinician's journey through the Consultation Module is a **hub-and-spoke** pattern centered on the active consultation workspace:

- **Hub:** Consultation workspace (3-column layout)
- **Spokes:** Patient context (left), Documentation (center), Queue (right)
- **Terminal:** Completion → routing to next patient or hub
- **Safety Nets:** Auto-save, heartbeat, version conflict recovery, error states
- **Downstream Integrations:** Billing, surgical case, notifications, audit

The journey supports both **focused single-patient encounters** and **high-throughput clinic flows** (via queue progression and patient switching). The primary tension is between **rich clinical context** (patient profile + history) and **uninterrupted documentation focus** (workspace), resolved via the collapsible sidebar pattern.
