# Consultation Workflow Analysis: Patient List to Frontdesk Actions

**Date:** January 25, 2026  
**Status:** Workflow analysis and recommendations for integration improvement

---

## Executive Summary

The consultation workflow has **disconnected entry points**. Patients can initiate consultation inquiries through the patient-facing booking form (`/patient/consultations/request`), but frontdesk users on the patient listing page (`/frontdesk/patients`) have **no direct action** to initiate or reference consultations. The workflow exists but is fragmented.

**Key Finding:** The missing link is that frontdesk cannot easily see which patients have pending consultations or take consultation-related actions from the patient listing page.

---

## Current Workflow Architecture

### 1. Complete Workflow Flow (End-to-End)

```
┌──────────────────────────────────────────────────────────────────┐
│ PATIENT SIDE                                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Step 1: Patient logs in                                          │
│    ↓                                                              │
│ Step 2: Patient navigates to /patient/consultations/request      │
│    ↓                                                              │
│ Step 3: Patient completes 7-step booking form                    │
│    ├─ Step 1: Select service/procedure                           │
│    ├─ Step 2: Select preferred doctor                            │
│    ├─ Step 3: Preferred date selection                           │
│    ├─ Step 4: Preferred time window                              │
│    ├─ Step 5: Additional information                             │
│    ├─ Step 6: Review request                                     │
│    └─ Step 7: Submit request                                     │
│    ↓                                                              │
│ Step 4: API Call - POST /api/consultations/submit                │
│    ├─ UseCase: SubmitConsultationRequestUseCase                  │
│    └─ Creates: Appointment with                                  │
│       ├─ status: PENDING                                         │
│       └─ consultation_request_status: SUBMITTED                  │
│    ↓                                                              │
│ Step 5: Patient sees confirmation                                │
│    └─ Message: "Your inquiry has been submitted.                │
│       We will review and contact you shortly."                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ FRONTDESK SIDE (Entry Point 1: Consultations Page)              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Step 1: Frontdesk navigates to /frontdesk/consultations          │
│    ↓                                                              │
│ Step 2: React Query hook loads consultations by status           │
│    ├─ Hook: useConsultationsByStatus()                           │
│    └─ Shows: SUBMITTED, PENDING_REVIEW, NEEDS_MORE_INFO, etc.    │
│    ↓                                                              │
│ Step 3: Frontdesk sees list of consultation requests             │
│    ├─ New Requests (SUBMITTED, PENDING_REVIEW) - NEW COUNT       │
│    ├─ Awaiting Clarification (NEEDS_MORE_INFO)                   │
│    └─ Awaiting Scheduling (APPROVED)                             │
│    ↓                                                              │
│ Step 4: Frontdesk clicks "Review Request" on a consultation      │
│    ↓                                                              │
│ Step 5: ReviewConsultationDialog opens with details              │
│    ├─ Shows: Patient info, procedure, concern description        │
│    └─ Provides three action buttons:                             │
│       ├─ ✅ Accept for Scheduling (approve)                      │
│       │  ├─ Requires: Proposed date + time                       │
│       │  ├─ Optional: Assistant brief for surgeon                │
│       │  └─ Creates: Appointment date/time scheduled             │
│       │                                                          │
│       ├─ ❓ Request Clarification (needs_more_info)              │
│       │  ├─ Requires: Questions for patient (10+ chars)          │
│       │  └─ Sends: Patient notification with questions           │
│       │                                                          │
│       └─ ❌ Mark as Not Suitable (reject)                        │
│          ├─ Requires: Reason for unsuitability (10+ chars)       │
│          └─ Cancels: Appointment                                 │
│    ↓                                                              │
│ Step 6: API Call - POST /api/consultations/:id/review            │
│    ├─ UseCase: ReviewConsultationRequestUseCase                  │
│    ├─ Updates: consultation_request_status                       │
│    └─ Sends: Patient notification                                │
│    ↓                                                              │
│ Step 7: Dialog closes, list refreshes                            │
│    └─ Consultation moved to appropriate status bucket            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## The Disconnection Problem

### Entry Point 1: `/frontdesk/consultations` ✅
**Status:** WORKS - Consultations page shows all consultation requests by status

- Shows: New inquiries, awaiting clarification, awaiting scheduling
- Actions: Review each consultation request
- Workflow: Complete and functional

### Entry Point 2: `/frontdesk/patients` ❌
**Status:** DISCONNECTED - No consultation-related actions on patient listing

**Current Patient Listing Actions:**
```
Patient Row Actions:
├─ View Profile
└─ Schedule Appointment
```

**Missing Actions:**
```
What's NOT available:
├─ ❌ See if patient has pending consultations
├─ ❌ Direct link to patient's consultation requests
├─ ❌ One-click review of patient's consultation status
└─ ❌ Quick action to manage patient's inquiry
```

---

## Problem Analysis

### Why Is It Disconnected?

1. **Workflow Organization**
   - Patient listing (`/frontdesk/patients`) focuses on patient database/directory
   - Consultation requests (`/frontdesk/consultations`) is a workflow/tasks page
   - These are treated as separate concerns, not integrated

2. **Information Hierarchy**
   - Patient listing doesn't fetch consultation data
   - Consultation page doesn't cross-reference patient listing
   - No bidirectional linking between the two

3. **User Mental Model Mismatch**
   - Frontdesk user thinks: "Show me all patients" (patient listing)
   - System shows: "Patients + their appointments"
   - Frontdesk also thinks: "Show me all inquiries needing review" (consultations page)
   - But these are separate pages with separate workflows

4. **Missing Context**
   - Patient listing shows appointments, not consultation inquiries
   - No indicator that a patient has a pending consultation
   - No quick nav from patient to their consultation inquiry

---

## Current Data Model Relationship

```
Patient
├─ id
├─ first_name
├─ last_name
├─ email
├─ phone
└─ appointments (has many)
    └─ Appointment
        ├─ id
        ├─ patient_id ← Links to Patient
        ├─ doctor_id
        ├─ appointment_date
        ├─ appointment_time
        ├─ status ← AppointmentStatus (PENDING, SCHEDULED, etc.)
        └─ consultation_request_status ← ConsultationRequestStatus
                                         (SUBMITTED, PENDING_REVIEW, 
                                          NEEDS_MORE_INFO, APPROVED, 
                                          SCHEDULED, CONFIRMED, CANCELLED)
```

**Key Finding:** Consultations are stored as Appointments with `consultation_request_status` field. Patient listing loads `appointments` but doesn't filter by consultation status.

---

## Workflow State Diagrams

### Patient's Consultation Request Journey

```
Patient Submits
    ↓
┌─────────────────────────────────────────────┐
│ SUBMITTED / PENDING_REVIEW                  │
│ Status: "Under Review"                      │
│ Frontdesk sees: New Inquiries bucket        │
└─────────────────────────────────────────────┘
    ↓
FRONTDESK REVIEWS
    ↓
    ├─→ APPROVE ─→ ┌─────────────────┐
    │              │ APPROVED        │
    │              │ Scheduled Date: │
    │              │ Set by Frontdesk│
    │              └─────────────────┘
    │                  ↓
    │              PATIENT CONFIRMS
    │                  ↓
    │              ┌─────────────────┐
    │              │ CONFIRMED       │
    │              │ Ready for Doctor│
    │              └─────────────────┘
    │                  ↓
    │              DOCTOR SEES IT
    │
    ├─→ REQUEST INFO ─→ ┌──────────────────┐
    │                   │ NEEDS_MORE_INFO  │
    │                   │ Patient must     │
    │                   │ respond with     │
    │                   │ clarification    │
    │                   └──────────────────┘
    │                        ↓
    │                   PATIENT RESPONDS
    │                        ↓
    │                   Back to SUBMITTED
    │
    └─→ REJECT ─→ ┌──────────────────┐
                  │ CANCELLED        │
                  │ Appointment      │
                  │ terminated       │
                  └──────────────────┘
```

---

## Where Disconnection Happens

### Scenario 1: Frontdesk User Story
```
User: "I need to check all patients and see who has pending consultations"

Current Experience:
1. Go to /frontdesk/patients
2. See patient list with name, contact, last visit
3. Click on patient → View Profile
4. See patient details and appointment history
5. No indication of consultation request status
6. Need to manually go to /frontdesk/consultations to search for this patient
7. Find their consultation request there
8. Take action

Problem: Requires jumping between two pages, no integrated view
```

### Scenario 2: Frontdesk Finding Patients with Pending Consultations
```
Current Experience:
1. Go to /frontdesk/consultations
2. See consultation requests only
3. Click "Review Request" to see patient details
4. If need to add an appointment, must navigate to /frontdesk/appointments
5. Cannot easily see patient's full profile
6. Cannot see if patient has other appointments

Problem: Consultation view is disconnected from patient context
```

### Scenario 3: A Patient Just Called
```
User: "Patient called saying they submitted a consultation request.
       Let me look them up in the patient list to help them."

Current Experience:
1. Go to /frontdesk/patients
2. Search for patient by name
3. Find patient
4. View their profile
5. No indication of consultation request status
6. Must manually go to /frontdesk/consultations page
7. Search for their request there

Problem: Cannot get full context from patient listing
```

---

## Data Currently in Patient Listing

### What IS Loaded:
```
Patient data:
├─ First name, last name
├─ Gender, age
├─ Email, phone
├─ Address
├─ File number
├─ Last visit date
└─ Appointments array (only loaded with specific medical_records)
```

### What's NOT Loaded/Shown:
```
Consultation-specific data:
├─ ❌ Pending consultations count
├─ ❌ Consultation request status (SUBMITTED, NEEDS_MORE_INFO, etc.)
├─ ❌ Proposed date/time from frontdesk
├─ ❌ Review notes or status
└─ ❌ Last consultation activity date
```

---

## Recommended Improvements

### Option 1: Add Consultation Indicator to Patient Listing (Light Enhancement)

**Changes:**
1. Load consultation-specific data in patient listing
2. Show badge/indicator if patient has pending consultation
3. Add "View Consultation" action button

**Implementation:**
```
Patient Row:
├─ View Profile button
├─ Schedule Appointment button
└─ [NEW] View Consultation button (only if consultation_request_status != null)

Badge:
├─ "📋 Pending Review" (SUBMITTED, PENDING_REVIEW)
├─ "❓ Awaiting Info" (NEEDS_MORE_INFO)
├─ "✅ Approved" (APPROVED)
└─ "🔄 Scheduled" (SCHEDULED)
```

**Pro:** Quick visibility without changing flow  
**Con:** Still separate pages, mental model not unified

---

### Option 2: Create Integrated Patient-Consultation View (Medium Enhancement)

**Changes:**
1. Add consultation section to patient profile page
2. Show patient's consultation history
3. Allow inline review actions for that patient's consultations

**Implementation:**
```
Patient Profile Page:
├─ Personal Information
├─ [NEW] Consultation Requests section
│   ├─ List of all consultations (past and pending)
│   ├─ Status badge for each
│   ├─ Inline "Review" button if status reviewable
│   └─ Quick action to propose appointment date/time
├─ Medical Records
└─ Quick Links (existing)
```

**Pro:** Full patient context in one place  
**Con:** Patient profile page becomes larger

---

### Option 3: Dedicated "Patient + Consultation" View (Major Enhancement)

**Changes:**
1. Create new unified dashboard/search view
2. Shows patients filtered by consultation status
3. Allows bulk actions on multiple consultations

**Implementation:**
```
New Page: /frontdesk/consultations/manage

Left Sidebar (Filter):
├─ Status filter
│  ├─ New Requests (SUBMITTED, PENDING_REVIEW)
│  ├─ Awaiting Info (NEEDS_MORE_INFO)
│  ├─ Approved (APPROVED)
│  └─ Scheduled (SCHEDULED)
├─ Date range filter
└─ Doctor filter

Main Area:
├─ Patient cards with:
│  ├─ Patient name + avatar
│  ├─ Consultation status
│  ├─ Procedure of interest
│  ├─ Request date
│  ├─ Inline actions (Review, Approve, Schedule)
│  └─ Related appointments
└─ Pagination
```

**Pro:** Purpose-built for consultation management  
**Con:** Requires new page, potentially duplicates consultation list view

---

## Recommended Approach: **Option 1 + Option 2**

### Phase 1: Add Consultation Indicators to Patient Listing (Light)
**Effort:** 2-4 hours  
**Impact:** Quick visibility of who has pending consultations

1. **Modify patient listing query**
   - Load consultation_request_status with appointment data
   - Filter to show most recent consultation per patient

2. **Add visual indicator**
   - Badge showing consultation status
   - Only show if patient has pending/active consultation

3. **Add "View Consultation" link**
   - Goes directly to consultation in the consultations page
   - Pre-filters by this patient

4. **Example UI:**
   ```
   Patient Row:
   ├─ Avatar + Name + Contact
   ├─ Status: 📋 Pending Review (if applicable)
   ├─ Buttons:
   │  ├─ View Profile
   │  ├─ Schedule Appointment
   │  └─ [NEW] View Consultation (if has pending)
   └─ Last Activity: Consultation submitted 2 hours ago
   ```

### Phase 2: Add Consultation Section to Patient Profile (Medium)
**Effort:** 4-6 hours  
**Impact:** Full context when viewing patient

1. **Add consultation history section**
   - Timeline of all consultations
   - Shows status, dates, notes
   - Allows inline actions if reviewable

2. **Inline review capability**
   - Open ReviewConsultationDialog from patient profile
   - After action, stay on patient profile
   - Clearer workflow context

3. **Quick linking**
   - From patient profile to related appointments
   - From consultation to patient profile
   - Bidirectional context

---

## Implementation Plan

### What Needs to Change

#### 1. Patient Listing Page
**File:** `app/frontdesk/patients/page.tsx`

```tsx
// Current: Loads basic patient + appointment data
// Needed: Also load consultation_request_status

// Add to query:
appointments: {
  where: {
    consultation_request_status: { not: null } // Get consultations
  },
  select: {
    consultation_request_status: true,
    reviewed_at: true,
    appointment_date: true,
    appointment_time: true
  }
}

// Add to UI:
// - Consultation status badge
// - Consultation link/button
// - Last consultation activity date
```

#### 2. Patient Profile Page
**File:** `app/frontdesk/patient/[patientId]/page.tsx`

```tsx
// Add new section: Consultation Requests
// Show:
// - List of consultations with statuses
// - Timeline view
// - Inline review button (if reviewable)
// - Related appointments for each

// Add component: <PatientConsultationHistory />
```

#### 3. Consultation Status Helper
**File:** Create `utils/consultation-helpers.ts` (or add to existing)

```tsx
// Helper functions:
export function getConsultationBadgeColor(status: ConsultationRequestStatus)
export function getConsultationBadgeLabel(status: ConsultationRequestStatus)
export function getLastConsultationDate(patient: PatientWithConsultations)
export function hasActiveConsultation(patient: PatientWithConsultations)
```

---

## Current Implementation Status

### What Already Works ✅
- Patient consultation request submission (7-step form)
- Frontdesk consultation review page with filtering
- Consultation request workflow and status transitions
- ReviewConsultationDialog with workflow validation
- React Query hooks for consultation data
- Consultation status constants

### What's Missing ❌
- Consultation visibility in patient listing
- Bidirectional navigation between patient and consultation
- Integrated patient-consultation context view
- Consultation history timeline on patient profile
- Consultation status indicators/badges

### Data Already Available ✅
- `Appointment` records store consultation_request_status
- Patient queries already have appointments relationship
- All status enums and constants defined
- All validation logic in ConsultationRequestWorkflow

### No Breaking Changes Needed ✅
- Existing workflows remain unchanged
- Just adding visibility and navigation
- Pure UI enhancement
- Backend APIs stay the same

---

## Quick Integration Points

### Add Consultation Indicator to Patient Row

```tsx
// In patient listing table row:
{(() => {
  const consultation = patient?.appointments?.find(apt =>
    apt?.consultation_request_status != null
  );
  
  if (!consultation) return null;
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline">
        {getConsultationStatusLabel(consultation.consultation_request_status)}
      </Badge>
      <Link href={`/frontdesk/consultations?patientId=${patient.id}`}>
        <Button size="sm" variant="ghost">
          View
        </Button>
      </Link>
    </div>
  );
})()}
```

### Add Consultation History to Patient Profile

```tsx
// In patient profile:
{patient?.appointments?.filter(apt => apt.consultation_request_status)?.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Consultation Requests</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {patient.appointments
          .filter(apt => apt.consultation_request_status)
          .map(consultation => (
            <ConsultationRequestCard
              key={consultation.id}
              consultation={consultation}
              onReview={() => showReviewDialog(consultation)}
            />
          ))}
      </div>
    </CardContent>
  </Card>
)}
```

---

## Benefits of Integration

### For Frontdesk Users
1. **Better Context** - See patient's consultation status alongside their info
2. **Faster Workflow** - Jump from patient to consultation without separate page
3. **More Information** - Understand patient's journey at a glance
4. **Reduced Friction** - One integrated view instead of hopping between pages

### For System Architecture
1. **Clearer Workflows** - Patient inquiry journey visible end-to-end
2. **Better UX** - Consistent navigation patterns
3. **Easier Maintenance** - Clear relationship between patient and consultation
4. **Scalable** - Easy to add more patient-consultation features later

---

## Next Steps

### Immediate (Today)
- [x] Analyze workflow disconnection
- [x] Identify missing integration points
- [x] Document recommendations

### Short Term (Next Sprint)
- [ ] Implement Option 1: Add consultation indicators to patient listing
- [ ] Add consultation history to patient profile page
- [ ] Test workflows end-to-end
- [ ] Get user feedback

### Medium Term (Future)
- [ ] Consider unified consultation management dashboard
- [ ] Add consultation search functionality
- [ ] Add consultation bulk actions
- [ ] Add consultation analytics

---

## Summary

**The Workflow Issue:** Patient listing page (`/frontdesk/patients`) doesn't show consultation request status or provide consultation-related actions, while consultation requests are managed on a separate page (`/frontdesk/consultations`). This creates a fragmented experience.

**The Solution:** Integrate consultation visibility into patient listing and patient profile pages. No workflow changes needed—just better UI integration and navigation.

**Effort:** 2-3 days for full implementation  
**Impact:** High (significantly improves frontdesk UX and workflow clarity)

---

**Document Created:** January 25, 2026
