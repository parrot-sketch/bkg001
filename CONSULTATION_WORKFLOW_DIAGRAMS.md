# Consultation Workflow - Visual Architecture

## Current State: Two Disconnected Workflows

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PATIENT SIDE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Patient logs in → Views dashboard → Clicks "Request Consultation" │
│                                                                     │
│  /patient/consultations/request                                    │
│  ├─ 7-step booking form                                            │
│  ├─ Select service/doctor/date/time                               │
│  └─ Submit → Creates Appointment                                  │
│            └─ status: PENDING                                     │
│            └─ consultation_request_status: SUBMITTED              │
│                                                                    │
│  Patient sees: "Your request has been submitted"                  │
│                                                                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓↓↓
        ╔════════════════════════════════════════════════════════╗
        ║  DATA FLOWS TO APPOINTMENT TABLE (In Database)         ║
        ║  ┌──────────────────────────────────────────────────┐  ║
        ║  │ Appointment {                                    │  ║
        ║  │   id: uuid                                       │  ║
        ║  │   patient_id: ← Links back to patient           │  ║
        ║  │   doctor_id: ...                                 │  ║
        ║  │   status: PENDING                                │  ║
        ║  │   consultation_request_status: SUBMITTED ✓       │  ║
        ║  │   created_at: NOW                                │  ║
        ║  │   ...                                            │  ║
        ║  │ }                                                │  ║
        ║  └──────────────────────────────────────────────────┘  ║
        ╚════════════════════════════════════════════════════════╝
                              ↓↓↓
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTDESK WORKFLOWS (TWO SEPARATE PATHS)       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PATH 1: /frontdesk/patients (Patient Listing)                    │
│  ────────────────────────────────────────────                     │
│  ├─ Lists all patients                                            │
│  ├─ Shows: Name, contact, last visit                             │
│  ├─ Actions: View Profile, Schedule Appointment                  │
│  │                                                               │
│  │  ❌ MISSING:                                                  │
│  │  ├─ Does NOT show consultation_request_status                │
│  │  ├─ Does NOT indicate pending consultation                  │
│  │  ├─ Does NOT link to consultation review                    │
│  │  └─ Does NOT provide consultation actions                   │
│  │                                                               │
│  └─ Result: User doesn't know patient has pending inquiry       │
│                                                                │
│                                                                │
│  PATH 2: /frontdesk/consultations (Consultation Management)     │
│  ────────────────────────────────────────────────────────      │
│  ├─ Lists all consultation requests (from appointments)        │
│  ├─ Shows: By status (New, Awaiting Info, Approved)           │
│  ├─ Filtered by: useConsultationsByStatus hook                │
│  │                                                              │
│  │  ✅ WORKS WELL:                                             │
│  │  ├─ Shows all pending consultations                        │
│  │  ├─ Provides status filtering                              │
│  │  ├─ Has review dialog                                      │
│  │  ├─ Allows approve/request-info/reject actions            │
│  │  └─ Updates appointment status correctly                  │
│  │                                                              │
│  │  ❌ BUT ISOLATED:                                           │
│  │  ├─ Doesn't link back to patient view                     │
│  │  ├─ No patient profile context                            │
│  │  ├─ Separated from patient management workflow            │
│  │  └─ User must hop pages for full context                  │
│  │                                                              │
│  └─ Result: Consultation management works, but feels separate │
│                                                                │
└─────────────────────────────────────────────────────────────────────┘

PROBLEM: User jumps between two pages to understand complete context
```

---

## Proposed State: Integrated Consultation Visibility

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTDESK INTEGRATED VIEW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PRIMARY ENTRY: /frontdesk/patients (Patient Management)          │
│  ────────────────────────────────────────────────────────────     │
│  ├─ Lists all patients                                            │
│  ├─ Shows: Name, contact, last visit                             │
│  │                                                               │
│  │  ✅ NEW - Consultation Visibility:                           │
│  │  ├─ 📋 Badge if has pending consultation                    │
│  │  │  ├─ "Pending Review" (blue) ← SUBMITTED                 │
│  │  │  ├─ "Awaiting Info" (yellow) ← NEEDS_MORE_INFO          │
│  │  │  ├─ "Approved" (green) ← APPROVED/SCHEDULED             │
│  │  │  └─ Shows submission date                               │
│  │  │                                                          │
│  │  └─ Action Buttons:                                        │
│  │     ├─ View Profile (existing)                            │
│  │     ├─ Schedule Appointment (existing)                   │
│  │     └─ [NEW] View Consultation (if has pending)          │
│  │        └─ Links to consultations page, pre-filtered      │
│  │                                                            │
│  └─ Result: Complete patient picture at a glance             │
│                                                                │
│                                                                │
│  SECONDARY ENTRY: /frontdesk/consultations (Workflow View)       │
│  ─────────────────────────────────────────────────────────     │
│  ├─ Lists consultation requests by status                      │
│  ├─ Shows: Patient + procedure + status                        │
│  ├─ Same review interface as before                           │
│  │                                                             │
│  │  ✅ IMPROVED INTEGRATION:                                  │
│  │  ├─ Click patient name → View full patient profile        │
│  │  ├─ Profile shows all consultations for that patient      │
│  │  ├─ Can review consultation inline from patient profile   │
│  │  └─ Better context switching                             │
│  │                                                             │
│  └─ Result: Workflows feel connected                         │
│                                                                │
│                                                                │
│  DETAILED VIEW: /frontdesk/patient/[patientId]                │
│  ─────────────────────────────────────────────               │
│  ├─ Personal Information (existing)                           │
│  │                                                             │
│  │  ✅ NEW - Consultation History Section:                    │
│  │  ├─ Timeline of all consultations                         │
│  │  ├─ Status badge for each                                │
│  │  ├─ Dates: Submitted → Reviewed → Scheduled             │
│  │  ├─ Review notes/reason if available                    │
│  │  └─ [Inline] Review button (if status is reviewable)   │
│  │       └─ Opens ReviewConsultationDialog                  │
│  │       └─ After action, stays on patient profile          │
│  │                                                            │
│  ├─ Medical Records (existing)                               │
│  │                                                             │
│  └─ Quick Links (existing)                                   │
│                                                                │
│  Result: Full patient context - profile + consultation history │
│                                                                │
└─────────────────────────────────────────────────────────────────────┘

BENEFIT: User gets complete picture without page-hopping
```

---

## Data Flow Diagram

```
                    PATIENT SIDE
                    ─────────────

Patient Account
     │
     └─→ Patient Dashboard
              │
              └─→ "Request Consultation"
                     │
                     ▼
         /patient/consultations/request
         (7-step booking form)
                     │
                     ├─ Select service
                     ├─ Select doctor
                     ├─ Preferred date/time
                     ├─ Medical info
                     └─ Review & Submit
                     │
                     ▼
         API: POST /api/consultations/submit
                     │
                     ▼
         SubmitConsultationRequestUseCase
                     │
                     ├─ Validate patient exists
                     ├─ Create appointment with:
                     │  ├─ status: PENDING
                     │  ├─ consultation_request_status: SUBMITTED
                     │  └─ created_at: NOW
                     │
                     └─ Notify frontdesk
                     │
                     ▼
         Patient sees: "Request submitted"


              DATABASE (Appointments Table)
              ──────────────────────────────

Appointment Record Created:
┌─────────────────────────────────┐
│ id: UUID                        │
│ patient_id: References Patient  │◄────────┐
│ doctor_id: Selected by patient  │         │
│ appointment_date: NULL (yet)    │         │
│ appointment_time: NULL (yet)    │         │
│ status: PENDING                 │         │
│ consultation_request_status:    │         │
│   SUBMITTED ✓                   │         │
│ created_at: NOW                 │         │
│ reviewed_by: NULL (yet)         │         │
│ reviewed_at: NULL (yet)         │         │
│ review_notes: NULL (yet)        │         │
└─────────────────────────────────┘         │
                                             │
         ┌───────────────────────────────────┘
         │
         ▼

              FRONTDESK SIDE
              ──────────────

Option A: Via Patient Listing
──────────────────────────────
Frontdesk: Navigate to /frontdesk/patients
                │
                ├─ Load: getAllPatients()
                │        (includes consultation_request_status)
                │
                ├─ See: Patient rows with consultation badges
                │       "📋 Pending Review"
                │
                ├─ Click: "View Consultation" button
                │
                └─→ /frontdesk/consultations?patientId=X

Option B: Via Patient Profile
──────────────────────────────
Frontdesk: Navigate to /frontdesk/patient/[patientId]
                │
                ├─ Load: Patient full data + consultations
                │
                ├─ See: Consultation History section
                │       ├─ Submission date
                │       ├─ Status badge
                │       └─ [Review] button
                │
                ├─ Click: [Review] button
                │
                └─→ ReviewConsultationDialog opens
                    (inline on same page)

Option C: Via Consultations Page
────────────────────────────────
Frontdesk: Navigate to /frontdesk/consultations
                │
                ├─ Load: useConsultationsByStatus(statuses)
                │        (same as before)
                │
                ├─ See: Consultation list by status
                │
                ├─ Click: "Review Request"
                │
                └─→ ReviewConsultationDialog opens


         Frontdesk Takes Action: Review Consultation Request
         ──────────────────────────────────────────────────

ReviewConsultationDialog
├─ Shows: Patient details + procedure + concern
│
└─ Three Actions:
   │
   ├─ ✅ APPROVE (with date/time proposed)
   │   │
   │   ▼
   │   API: POST /api/consultations/:id/review
   │   { action: 'approve', proposedDate, proposedTime }
   │   │
   │   ▼
   │   ReviewConsultationRequestUseCase
   │   │
   │   ├─ Validate using ConsultationRequestWorkflow.validateApproval()
   │   ├─ Update appointment:
   │   │  ├─ consultation_request_status: APPROVED
   │   │  ├─ appointment_date: proposedDate
   │   │  ├─ appointment_time: proposedTime
   │   │  └─ reviewed_by: frontdeskUserId
   │   │
   │   └─ Notify patient: "Your request approved!"
   │
   ├─ ❓ REQUEST INFO (with questions)
   │   │
   │   ▼
   │   consultation_request_status: NEEDS_MORE_INFO
   │   review_notes: Questions from frontdesk
   │   │
   │   └─ Notify patient: "Please provide more info..."
   │
   └─ ❌ REJECT (with reason)
       │
       ▼
       consultation_request_status: CANCELLED
       review_notes: Reason for unsuitability
       │
       └─ Notify patient: "Request not approved..."


           RESULT VISIBILITY
           ─────────────────

Patient Listing (after action):
│
├─ Consultation status updated
│
├─ Badge changes:
│  ├─ "Pending Review" → "Approved" (if approved)
│  ├─ "Pending Review" → "Awaiting Info" (if needs info)
│  └─ "Pending Review" → Hidden (if rejected)
│
└─ Next time frontdesk views patient, sees updated status

Patient Profile (if viewed):
│
├─ Consultation History shows:
│  ├─ Submitted: Jan 25 10:00 AM
│  ├─ Status: Approved ✓
│  ├─ Reviewed: Jan 25 2:00 PM
│  ├─ Proposed Date: Jan 28, 2026
│  └─ Proposed Time: 10:00 AM
│
└─ Shows full timeline of consultation

Consultations Page (after action):
│
├─ Consultation moved to appropriate bucket
│  ├─ "New Requests" → Removes
│  ├─ "Approved" → Adds if approved
│  └─ "Awaiting Info" → Adds if needs info
│
└─ List auto-refreshes via React Query
```

---

## Integration Implementation Map

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 1: Patient List Consultation Indicators (2-4 hours)   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Changes:                                                   │
│  ├─ getAllPatients() service                               │
│  │  └─ Load: consultation_request_status                   │
│  │                                                          │
│  ├─ Patient listing UI                                     │
│  │  ├─ Add: Consultation status badge                      │
│  │  ├─ Add: "View Consultation" button/link               │
│  │  └─ Condition: Only if has active consultation         │
│  │                                                          │
│  └─ Link format:                                           │
│     └─ /frontdesk/consultations?patientId={patientId}     │
│                                                              │
│  Components Affected:                                       │
│  ├─ FrontdeskPatientsPage.tsx                             │
│  ├─ getAllPatients service                                │
│  └─ New: ConsultationBadge component (optional)           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
          ▼▼▼ THEN PROCEED TO PHASE 2 ▼▼▼
┌──────────────────────────────────────────────────────────────┐
│  PHASE 2: Patient Profile Consultation History (3-5 hours)  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Changes:                                                   │
│  ├─ Patient profile page                                   │
│  │  └─ Add: Consultation Requests section                  │
│  │                                                          │
│  ├─ New component: PatientConsultationHistory              │
│  │  ├─ Timeline of consultations                          │
│  │  ├─ Status badge for each                              │
│  │  ├─ Dates + review notes                               │
│  │  └─ Inline [Review] button (if status reviewable)      │
│  │                                                          │
│  └─ ReviewConsultationDialog integration                  │
│     └─ Pass: patientId for context                        │
│                                                              │
│  Components Affected:                                       │
│  ├─ FrontdeskPatientProfile.tsx                           │
│  ├─ New: PatientConsultationHistory.tsx                   │
│  └─ Modified: ReviewConsultationDialog.tsx (context)      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Navigation Flows (After Integration)

```
WORKFLOW 1: Patient List → Consultation Review
──────────────────────────────────────────────

Frontdesk on Patient List Page
    │
    ├─ Sees patient with badge: "📋 Pending Review"
    │
    ├─ Clicks: "View Consultation" button
    │
    └─→ Navigates to: /frontdesk/consultations?patientId=X
           │
           └─ Consultations page filters by this patient
              │
              ├─ Shows: Patient's pending consultation
              │
              ├─ Clicks: "Review Request"
              │
              └─→ ReviewConsultationDialog opens
                 │
                 ├─ Frontdesk reviews details
                 │
                 ├─ Chooses action (approve/request-info/reject)
                 │
                 └─→ API call updates consultation status
                    │
                    └─ Dialog closes, list refreshes


WORKFLOW 2: Patient Profile → Inline Consultation Review
────────────────────────────────────────────────────────

Frontdesk on Patient List Page
    │
    ├─ Clicks: "View Profile"
    │
    └─→ Patient Profile Page loaded
           │
           ├─ Shows: Personal info + Medical Records
           │
           ├─ Scrolls down to: Consultation History section
           │
           ├─ Sees: Timeline of all consultations
           │
           ├─ Finds: Pending consultation
           │
           ├─ Clicks: [Review] button (inline)
           │
           └─→ ReviewConsultationDialog opens
              │
              ├─ Frontdesk reviews details
              │
              ├─ Chooses action
              │
              └─→ API call updates status
                 │
                 └─ Dialog closes, page reloads
                    └─ Timeline updates to show new status


WORKFLOW 3: Consultations Page → Patient Details
─────────────────────────────────────────────────

Frontdesk on Consultations Page
    │
    ├─ Sees: List of pending consultations
    │
    ├─ Clicks: Patient name (NEW - bidirectional link)
    │
    └─→ Patient Profile Page loaded
           │
           └─ Shows: Full patient context + consultation timeline
```

---

## Summary

**Current:** Patient and Consultation workflows are separate  
**Proposed:** Integrated visibility across patient management pages  
**Data:** Already exists, just needs display integration  
**Effort:** 1-1.5 days for full implementation  
**Benefit:** Significantly improved UX for frontdesk users  

