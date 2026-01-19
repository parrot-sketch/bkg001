# Consultation Session Workflow Design

**Last Updated:** January 2025

## Overview

This document outlines the **actual consultation session workflow** - what happens from the moment a patient's appointment is confirmed until the consultation is completed. This includes handling patient arrivals, no-shows, and the features needed during the live consultation session.

---

## Consultation Session States

### Appointment Lifecycle States:

```
CONFIRMED (Patient confirmed appointment)
    ↓
APPOINTMENT_DAY
    ├─→ PATIENT_ARRIVED (Check-in)
    │       ↓
    │   CONSULTATION_STARTED
    │       ↓
    │   CONSULTATION_IN_PROGRESS (Active session)
    │       ↓
    │   CONSULTATION_COMPLETED
    │
    ├─→ PATIENT_NO_SHOW (Didn't arrive)
    │       ↓
    │   Mark as NO_SHOW
    │   (May reschedule or cancel)
    │
    └─→ PATIENT_LATE (Arrived after scheduled time)
            ↓
        Check-in (with late flag)
            ↓
        CONSULTATION_STARTED
```

---

## Pre-Consultation: Appointment Day Preparation

### Doctor Dashboard - Morning of Appointment

**What Doctor Sees:**
- Today's confirmed appointments (sorted by time)
- Patient information summary
- Consultation notes from previous visits (if any)
- Case plan status (if procedure was previously recommended)
- Before photos (if any exist)

**Actions Available:**
- View patient history
- Review previous consultation notes
- Access case planning materials
- Prepare consultation notes template

---

## Consultation Session Workflow

### Phase 1: Patient Arrival & Check-In

#### Scenario A: Patient Arrives On Time
**Time:** Appointment time (e.g., 10:00 AM)

**Frontdesk Actions:**
1. Patient arrives at clinic
2. Frontdesk checks in patient
3. System updates: `Appointment Status: SCHEDULED` (if was PENDING)
4. Doctor dashboard shows: "Patient Checked In - Ready for Consultation"

**Doctor Dashboard Shows:**
- ✅ Patient checked in
- ⏰ Waiting for doctor to start
- Button: "Start Consultation"

#### Scenario B: Patient Arrives Late
**Time:** After appointment time (e.g., 10:15 AM for 10:00 AM appointment)

**Frontdesk Actions:**
1. Patient arrives late
2. Frontdesk checks in patient
3. System records: `checked_in_at: 10:15 AM` (vs `appointment_time: 10:00 AM`)
4. System flags: `late_arrival: true`, `late_by_minutes: 15`
5. Doctor dashboard shows: "Patient Checked In (15 min late)"

**Doctor Dashboard Shows:**
- ⚠️ Late arrival indicator
- ⏰ How many minutes late
- Button: "Start Consultation"

#### Scenario C: Patient No-Show
**Time:** 15-30 minutes after appointment time (e.g., 10:30 AM for 10:00 AM appointment)

**System Actions:**
1. **Auto-Detection:** If appointment time passed + 15-30 minutes AND no check-in
2. **Frontdesk Action:** Can manually mark as "No Show"
3. System updates: `Appointment Status: NO_SHOW`
4. System records: `no_show_at: [current_time]`, `no_show_reason: 'AUTO' or 'MANUAL'`

**Doctor Dashboard Shows:**
- ❌ No Show indicator
- Actions: "Reschedule" or "Mark as Cancelled"
- Option to add notes: "Patient called to reschedule" or "No contact"

**Follow-Up Actions:**
- Send automated "We missed you" message to patient
- Offer to reschedule
- May affect patient's future booking priority

---

### Phase 2: Starting the Consultation

**When Doctor Clicks "Start Consultation":**

#### Start Consultation Dialog/Interface

**Required Information:**
- ✅ Confirm patient identity (show patient photo/name)
- ✅ Initial observations (optional notes)
- ✅ Consultation type (Initial, Follow-up, Pre-op, Post-op)

**System Actions:**
1. Create `Consultation` record (if doesn't exist)
2. Set `started_at: [current_time]`
3. Update appointment: Add "Consultation Started" note
4. Open **Active Consultation Session UI**

**Doctor Dashboard Transitions:**
- Appointment card changes to "Consultation In Progress"
- Shows timer: "Consultation started at 10:15 AM"
- Button changes to "Complete Consultation"

---

### Phase 3: Active Consultation Session

**This is the core consultation interface - what doctor needs during the live session.**

#### Consultation Session UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  Consultation Session - [Patient Name]                   │
│  Started: 10:15 AM | Duration: [Live Timer]             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  LEFT PANEL (Patient Info)    │  RIGHT PANEL (Notes)    │
│  ┌─────────────────────────┐  │  ┌───────────────────┐  │
│  │ Patient Profile         │  │  │ Consultation Notes│  │
│  │ - Photo                  │  │  │ [Rich Text Editor]│  │
│  │ - Age, Gender            │  │  │                   │  │
│  │ - Medical History        │  │  │ - Chief Complaint │  │
│  │ - Allergies              │  │  │ - Examination     │  │
│  │ - Previous Procedures    │  │  │ - Assessment      │  │
│  │                          │  │  │ - Plan            │  │
│  │ Previous Consultations   │  │  │                   │  │
│  │ - [List of past visits]  │  │  │ [Save Draft]      │  │
│  └─────────────────────────┘  │  └───────────────────┘  │
│                                                           │
│  MIDDLE PANEL (Active Work)                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Consultation Features                              │  │
│  │                                                    │  │
│  │ [Tabs/Sections:]                                   │  │
│  │ 1. Patient Goals & Concerns                       │  │
│  │ 2. Physical Examination                           │  │
│  │ 3. Procedure Discussion                           │  │
│  │ 4. Before Photos (Capture/Upload)                 │  │
│  │ 5. Recommendations                                │  │
│  │ 6. Treatment Plan                                 │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  BOTTOM PANEL (Quick Actions)                            │
│  [Save Draft] [Upload Photos] [View History] [Complete]  │
└─────────────────────────────────────────────────────────┘
```

#### Key Features During Consultation:

##### 1. **Patient Goals & Concerns**
- **Input:** Text area for patient's stated goals
- **Template:** "What brings you in today?" / "What are your concerns?"
- **Voice Dictation:** Optional voice-to-text for quick capture
- **Auto-save:** Draft saved automatically every 30 seconds

##### 2. **Physical Examination**
- **Structured Forms:**
  - Body area selection (Face, Breasts, Abdomen, etc.)
  - Examination findings (text + structured checkboxes)
  - Measurements (if applicable)
  - Diagrams/Markings (drawing tool for marking areas)
- **Templates:** Pre-built examination templates by procedure type
- **Photos:** Capture examination photos (with consent)

##### 3. **Procedure Discussion**
- **Options Presented:**
  - Procedure type dropdown/selection
  - Expected outcomes
  - Risks and complications
  - Recovery timeline
  - Cost estimate (if applicable)
- **Patient Questions:** Record patient questions/concerns
- **Decision Status:** 
  - "Interested, needs time to decide"
  - "Ready to proceed"
  - "Not interested at this time"

##### 4. **Before Photos (Critical for Aesthetic Practice)**
- **Capture During Consultation:**
  - Quick photo capture button
  - Standardized angles (Front, Profile, Oblique, etc.)
  - Timepoint: "Pre-Consultation" or "Pre-Procedure"
  - Consent checkbox: "Consent for clinical use" / "Consent for marketing"
- **Upload Existing:**
  - Patient may have sent photos before
  - Link to existing patient images
- **Photo Management:**
  - View all patient photos
  - Compare before/after (if previous procedures)
  - Annotate photos (mark areas of concern)

##### 5. **Recommendations**
- **Structured Outcome Selection:**
  - Dropdown: Consultation Outcome Type
    - Procedure Recommended
    - Consultation Only
    - Follow-up Consultation Needed
    - Patient Deciding
    - Referral Needed
- **Procedure Details (if recommended):**
  - Procedure name
  - Urgency (Routine, Soon, Urgent)
  - Estimated duration
  - Special considerations
- **Notes:** Free-text recommendation notes

##### 6. **Treatment Plan**
- **If Procedure Recommended:**
  - Link to Case Planning (if patient decided)
  - Pre-op requirements checklist
  - Timeline estimate
- **If Follow-up Needed:**
  - Schedule follow-up appointment
  - What to prepare for next visit
- **If Consultation Only:**
  - General recommendations
  - Home care advice
  - When to return (if needed)

#### Real-Time Features:

##### Auto-Save Draft
- **Frequency:** Every 30 seconds
- **Indicator:** "Draft saved at [time]" or "Saving..." spinner
- **Recovery:** If session interrupted, can resume from last draft

##### Consultation Timer
- **Display:** Shows elapsed time
- **Purpose:** Track consultation duration
- **Alert:** Optional alert if consultation exceeds typical duration

##### Quick Actions
- **Save Draft:** Manual save
- **Upload Photos:** Quick photo capture/upload
- **View Patient History:** Quick access to past consultations
- **Complete Consultation:** End session and finalize

---

### Phase 4: Completing the Consultation

**When Doctor Clicks "Complete Consultation":**

#### Complete Consultation Dialog/Interface

**Required:**
1. **Outcome Type** (Required dropdown)
   - Procedure Recommended
   - Consultation Only
   - Follow-up Consultation Needed
   - Patient Deciding
   - Referral Needed

2. **Consultation Summary** (Required)
   - Chief complaint
   - Examination findings
   - Assessment
   - Plan/Recommendations

3. **Patient Decision** (If Procedure Recommended)
   - Has patient decided? (Yes / No / Pending)
   - If Yes → Create CasePlan immediately
   - If No/Pending → Create CasePlan with PENDING_DECISION status

4. **Follow-Up Actions** (Optional)
   - Schedule follow-up appointment?
   - Referral information?
   - Next steps for patient?

**System Actions:**
1. Save all consultation notes
2. Set `Consultation.completed_at: [current_time]`
3. Calculate consultation duration
4. Update appointment status: `COMPLETED`
5. If `PROCEDURE_RECOMMENDED`:
   - Create CasePlan (if doesn't exist)
   - Set CasePlan status based on patient decision
6. If `FOLLOW_UP_CONSULTATION_NEEDED`:
   - Create follow-up appointment
7. Send notification to patient
8. Record audit event

**Doctor Dashboard Updates:**
- Consultation marked as completed
- If CasePlan created → Shows "Plan Case" action
- If Follow-up scheduled → Shows in upcoming appointments

---

## No-Show Handling

### Detection Methods:

#### 1. **Automatic Detection**
- **Trigger:** Appointment time + 15-30 minutes AND status still PENDING/SCHEDULED
- **Action:** System flags appointment as "Potential No-Show"
- **Notification:** Alert doctor/frontdesk: "Patient hasn't checked in"

#### 2. **Manual Marking**
- **Who Can Mark:** Frontdesk or Doctor
- **When:** After appointment time has passed
- **Action:** Click "Mark as No-Show" button

### No-Show Workflow:

```
Appointment Time Passed
    ↓
[15-30 min after] → System flags "Potential No-Show"
    ↓
Frontdesk/Doctor Action:
    ├─→ Mark as NO_SHOW
    │   ├─→ Add reason: "No contact", "Patient called to reschedule", etc.
    │   ├─→ Update appointment: Status = NO_SHOW
    │   ├─→ Record: no_show_at, no_show_reason
    │   └─→ Send "We missed you" message to patient
    │
    ├─→ Patient Called to Reschedule
    │   ├─→ Mark as NO_SHOW (with reason)
    │   └─→ Schedule new appointment
    │
    └─→ Patient Arrived Late (after flag)
            ├─→ Check in patient
            └─→ Remove no-show flag, proceed with consultation
```

### No-Show Data Model:

```typescript
// Add to Appointment model
no_show: boolean @default(false)
no_show_at: DateTime?
no_show_reason: String? // 'AUTO', 'MANUAL', 'PATIENT_CALLED', etc.
no_show_notes: String?
rescheduled_to_appointment_id: Int? // If rescheduled
```

### No-Show UI Indicators:

**Doctor Dashboard:**
- ❌ Red badge: "No Show"
- Shows: "Patient didn't arrive for 10:00 AM appointment"
- Actions: "Reschedule" or "Mark as Cancelled"

**Frontdesk Dashboard:**
- List of no-shows for the day
- Quick actions: "Call Patient", "Reschedule", "Mark as Cancelled"

**Patient Portal:**
- Shows missed appointment
- Option to reschedule
- May show message: "We missed you at your appointment. Would you like to reschedule?"

---

## Consultation Session UI Design

### Main Consultation Session Page

**Route:** `/doctor/consultations/[appointmentId]/session`

**Layout Structure:**

```
┌────────────────────────────────────────────────────────────┐
│ Header: Consultation Session                                │
│ [Patient Name] | Started: 10:15 AM | Duration: 00:25:30    │
│ [Save Draft] [Upload Photo] [View History] [Complete]     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────┐   │
│  │ Patient Info │  │  Consultation Workspace          │   │
│  │              │  │                                   │   │
│  │ [Photo]      │  │  [Tab Navigation]                 │   │
│  │ Name         │  │  ┌─────────────────────────────┐ │   │
│  │ Age/Gender   │  │  │ Active Tab Content           │ │   │
│  │              │  │  │                              │ │   │
│  │ Medical      │  │  │ - Patient Goals              │ │   │
│  │ History      │  │  │ - Examination                │ │   │
│  │ Allergies    │  │  │ - Procedure Discussion       │ │   │
│  │              │  │  │ - Photos                     │ │   │
│  │ Previous     │  │  │ - Recommendations            │ │   │
│  │ Consultations│  │  │                              │ │   │
│  │              │  │  └─────────────────────────────┘ │   │
│  │              │  │                                   │   │
│  │ [Quick Links]│  │  [Auto-save indicator]            │   │
│  └──────────────┘  └──────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Consultation Notes (Right Sidebar - Collapsible)     │ │
│  │ [Rich Text Editor with Templates]                     │ │
│  │ - Chief Complaint                                     │ │
│  │ - Examination                                         │ │
│  │ - Assessment                                          │ │
│  │ - Plan                                                │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Key UI Components:

#### 1. **Patient Info Sidebar**
- Patient photo
- Demographics
- Medical history summary
- Allergies (prominent display)
- Previous consultations (clickable)
- Quick links to:
  - Patient full profile
  - Previous case plans
  - Before/after photos

#### 2. **Tab-Based Consultation Workspace**
- **Tab 1: Patient Goals**
  - Text area: "What brings you in today?"
  - Voice dictation button
  - Template: Common concerns checklist
  
- **Tab 2: Examination**
  - Body area selector
  - Examination form (structured)
  - Measurement inputs
  - Drawing tool for markings
  - Photo capture button
  
- **Tab 3: Procedure Discussion**
  - Procedure type selector
  - Options presented checklist
  - Patient questions/concerns
  - Decision status selector
  
- **Tab 4: Photos**
  - Camera capture interface
  - Photo angle selector (Front, Profile, etc.)
  - Upload existing photos
  - Photo gallery view
  - Consent checkboxes
  
- **Tab 5: Recommendations**
  - Outcome type selector (required)
  - Procedure details (if recommended)
  - Follow-up options
  - Referral information
  
- **Tab 6: Treatment Plan**
  - Case planning link (if procedure recommended)
  - Pre-op checklist
  - Timeline
  - Next steps

#### 3. **Consultation Notes Panel**
- Rich text editor
- Templates dropdown:
  - "Initial Consultation"
  - "Follow-up Consultation"
  - "Pre-op Consultation"
  - "Post-op Follow-up"
- Auto-fill from tabs
- Voice dictation support
- Save draft button
- Auto-save indicator

#### 4. **Quick Actions Bar**
- **Save Draft:** Manual save
- **Upload Photo:** Quick photo capture
- **View History:** Patient consultation history
- **Complete Consultation:** Finalize and close
- **Timer:** Elapsed time display

---

## Features to Implement

### Core Features (Must Have):

1. ✅ **Check-In System**
   - Frontdesk can check in patients
   - Late arrival tracking
   - No-show detection and marking

2. ✅ **Start Consultation**
   - Doctor initiates consultation
   - Creates consultation session
   - Records start time

3. ✅ **Active Consultation Interface**
   - Patient information display
   - Tab-based workspace
   - Consultation notes editor
   - Auto-save drafts

4. ✅ **Photo Capture/Upload**
   - Camera integration
   - Standardized angles
   - Consent tracking
   - Photo management

5. ✅ **Complete Consultation**
   - Outcome type selection
   - Consultation summary
   - Patient decision capture
   - Follow-up scheduling

6. ✅ **No-Show Handling**
   - Automatic detection
   - Manual marking
   - Rescheduling workflow
   - Patient notification

### Enhanced Features (Should Have):

7. ⭐ **Voice Dictation**
   - Speech-to-text for notes
   - Quick note capture
   - Hands-free during examination

8. ⭐ **Templates & Smart Forms**
   - Pre-built consultation templates
   - Procedure-specific forms
   - Auto-populate from patient history

9. ⭐ **Real-Time Collaboration**
   - Frontdesk can see consultation status
   - Nurse can add notes during consultation
   - Multi-user support (if needed)

10. ⭐ **Consultation Analytics**
    - Average consultation duration
    - No-show rate tracking
    - Procedure recommendation rate
    - Patient decision timeline

---

## State Transitions

### Appointment Status Flow:

```
CONFIRMED
    ↓
[Appointment Day]
    ├─→ SCHEDULED (Patient checked in)
    │       ↓
    │   [Doctor starts] → Consultation Active
    │       ↓
    │   [Doctor completes] → COMPLETED
    │
    ├─→ NO_SHOW (Patient didn't arrive)
    │       ├─→ Rescheduled → New appointment (CONFIRMED)
    │       └─→ Cancelled → CANCELLED
    │
    └─→ CANCELLED (Before appointment day)
```

### Consultation Record States:

```
NULL (No consultation record)
    ↓
[Doctor starts] → Consultation.created
    ├─→ started_at: [timestamp]
    ├─→ doctor_notes: [initial notes]
    └─→ status: IN_PROGRESS
    ↓
[Doctor working] → Consultation.in_progress
    ├─→ Auto-save drafts
    ├─→ Add photos
    ├─→ Update notes
    └─→ status: IN_PROGRESS
    ↓
[Doctor completes] → Consultation.completed
    ├─→ completed_at: [timestamp]
    ├─→ outcome: [outcome type]
    ├─→ doctor_notes: [final notes]
    └─→ status: COMPLETED
```

---

## Data Model Extensions

### Consultation Model (Already exists, may need extensions):

```prisma
model Consultation {
  id              Int       @id @default(autoincrement())
  appointment_id  Int       @unique
  doctor_id       String
  user_id         String?
  
  // Session tracking
  started_at      DateTime?
  completed_at    DateTime?
  duration_minutes Int?     // Calculated: completed_at - started_at
  
  // Consultation content
  doctor_notes    String?   @db.Text
  outcome         String?   // ConsultationOutcomeType
  outcome_type    String?   // PROCEDURE_RECOMMENDED, etc.
  patient_decision String?  // YES, NO, PENDING
  
  // Follow-up
  follow_up_date  DateTime?
  follow_up_type  String?
  follow_up_notes String?
  
  // No-show tracking (on appointment)
  // no_show fields should be on Appointment model
  
  // Relations
  appointment Appointment @relation(fields: [appointment_id], references: [id])
  doctor      Doctor      @relation(fields: [doctor_id], references: [id])
  user        User?       @relation(fields: [user_id], references: [id])
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

### Appointment Model Extensions:

```prisma
model Appointment {
  // ... existing fields ...
  
  // Check-in tracking
  checked_in_at    DateTime?
  checked_in_by    String?   // User ID who checked in
  late_arrival     Boolean   @default(false)
  late_by_minutes  Int?
  
  // No-show tracking
  no_show          Boolean   @default(false)
  no_show_at       DateTime?
  no_show_reason   String?   // 'AUTO', 'MANUAL', 'PATIENT_CALLED', etc.
  no_show_notes    String?
  rescheduled_to_appointment_id Int? // If rescheduled after no-show
  
  // ... rest of fields ...
}
```

---

## UI/UX Considerations

### Doctor Experience:

1. **Minimal Clicks:** Everything accessible within consultation session
2. **Quick Actions:** Common tasks (save, photo, complete) always visible
3. **Patient Context:** Patient info always visible (don't lose context)
4. **Auto-Save:** Never lose work (draft saved automatically)
5. **Mobile-Friendly:** Should work on tablet (doctor may use tablet during consultation)

### Frontdesk Experience:

1. **Quick Check-In:** One-click check-in
2. **No-Show Management:** Easy to mark and reschedule
3. **Status Visibility:** See which consultations are active
4. **Patient Communication:** Quick access to call/contact patient

### Patient Experience:

1. **Appointment Reminders:** Day before, morning of
2. **Check-In Options:** Self check-in kiosk (future) or frontdesk
3. **No-Show Follow-Up:** Automatic "We missed you" message with reschedule option

---

## Implementation Priority

### Phase 1: Core Consultation Session (Must Have)
1. ✅ Check-in workflow (already exists, enhance)
2. ✅ Start consultation interface
3. ✅ Basic consultation session UI (patient info + notes)
4. ✅ Complete consultation with outcome selection
5. ✅ No-show detection and marking

### Phase 2: Enhanced Features (Should Have)
6. ⭐ Photo capture/upload during consultation
7. ⭐ Tab-based workspace (Goals, Examination, etc.)
8. ⭐ Consultation templates
9. ⭐ Auto-save drafts
10. ⭐ Voice dictation

### Phase 3: Advanced Features (Nice to Have)
11. 🔮 Real-time collaboration
12. 🔮 Consultation analytics
13. 🔮 Mobile app for doctors
14. 🔮 Patient self check-in kiosk

---

## Key Questions to Resolve

1. **Who can check in patients?**
   - ✅ Frontdesk (primary)
   - ✅ Doctor (if frontdesk unavailable)
   - ❓ Patient self check-in (future feature?)

2. **When to auto-detect no-show?**
   - ✅ Recommendation: 15-30 minutes after appointment time
   - ❓ Should it be configurable per clinic?

3. **Consultation duration tracking:**
   - ✅ Start time: When doctor clicks "Start Consultation"
   - ✅ End time: When doctor clicks "Complete Consultation"
   - ❓ Should we track "active time" (excluding pauses)?

4. **Photo capture during consultation:**
   - ✅ Should be quick and easy (one-click)
   - ✅ Consent must be captured
   - ❓ Should photos be linked to consultation record or patient images?

5. **Draft recovery:**
   - ✅ Auto-save every 30 seconds
   - ❓ How long to keep drafts? (Recommendation: 30 days)

---

## Summary

The consultation session workflow bridges the gap between **confirmed appointment** and **consultation completion**. Key features:

1. **Check-In System:** Patient arrival tracking (on-time, late, no-show)
2. **Active Consultation Interface:** Comprehensive workspace for doctor during live session
3. **Structured Data Capture:** Patient goals, examination, recommendations, photos
4. **Outcome Selection:** Determines next workflow path
5. **No-Show Handling:** Automatic detection and manual management

The consultation session is where the doctor does their work - the UI must support efficient, comprehensive documentation while maintaining focus on the patient.
