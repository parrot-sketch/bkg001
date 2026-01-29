# Frontdesk Workflow Reframing - Actual vs. Assumed

## Critical Clarification

**What we ASSUMED:**
- System manages patient inquiries (consultation requests)
- Frontdesk reviews inquiries and makes decisions
- Workflow: Inquiries → Review → Approval → Scheduling

**What ACTUALLY happens:**
- Inquiries managed by **external website** (completely separate system)
- This system deals with **existing patients + walk-ins only**
- Workflow: Patient Arrives → Intake (if new) → Schedule with Doctor
- Frontdesk's job: **Intake management + Consultation scheduling**

---

## Actual Frontdesk Workflow (Current Reality)

```
Daily Patient Flow at Facility:

Patient Arrives
│
├─ EXISTING PATIENT?
│  ├─ Yes → Look up in system (search on Patients page)
│  │         → Verify appointment or book new consultation
│  │         → Route to appropriate doctor
│  │
│  └─ No (First-time/Walk-in)
│     → INTAKE PROCESS (NEW)
│     │  ├─ Frontdesk hands device to patient
│     │  ├─ Patient fills intake form privately
│     │  ├─ System saves patient record
│     │  └─ Patient returns device to frontdesk
│     │
│     └─ Frontdesk confirms data → Books consultation

Doctor Schedule
│
├─ Check available slots (Frontdesk needs to see this)
├─ Check doctor availability
├─ Confirm with patient
└─ Book consultation slot
    │
    └─ Patient goes to doctor
       │
       └─ Doctor consults
          └─ Post-consultation follow-up
```

---

## What the Dashboard Should Enable

### Current Dashboard Status:

✅ **Good:**
- Doctor availability (with week grid) - NEEDED for booking consultations
- Today's schedule overview - NEEDED to see who's already booked
- Patient search (via Patients page) - NEEDED to find existing patients
- Status metrics - NICE to have

❌ **Missing/Unclear:**
- **Patient intake flow** - How to register new walk-in patients
- **Quick booking workflow** - How to book a consultation once patient is ready
- **Connection between pieces** - How intake → patient search → doctor booking flow together

---

## The Patient Intake Challenge & Solution

### Current State (Paper Forms)
```
Patient walks in → Frontdesk hands paper form → Patient fills form → Frontdesk enters into system
Problems:
- Paper-based (outdated)
- Frontdesk sees sensitive info (privacy concern)
- Manual data entry (errors, time-consuming)
- High-profile clients uncomfortable with frontdesk access
```

### Proposed Solution (Digital Private Intake)
```
Patient walks in → Frontdesk initiates intake → 
Frontdesk hands device (tablet/phone) to patient → 
Patient fills intake form PRIVATELY on device → 
Patient returns device to frontdesk → 
Frontdesk confirms/verifies info → 
System creates patient record

Benefits:
✅ Digital (modern, searchable, secure)
✅ Private (patient fills directly, frontdesk doesn't see)
✅ Fast (no manual transcription)
✅ Professional (appeals to high-profile clients)
✅ Secure (data not handled by staff)
✅ Compliant (privacy by design)
```

---

## Required Features for This Workflow

### 1. Patient Intake Form (Patient-Facing)
```
✅ NEEDED: Digital form patients can fill on device
├─ Personal information (name, contact, etc.)
├─ Medical history (allergies, previous surgeries, etc.)
├─ Aesthetic concerns/goals
├─ Photography consent
├─ Insurance information (if applicable)
└─ Privacy acknowledgment

DESIGN REQUIREMENTS:
- Large, readable text (tablet-first)
- Simple, intuitive navigation
- Reassuring messaging about privacy
- Confirmation screen
- No frontdesk interference possible
- Accessible from a unique link/QR code
```

### 2. New Patient Registration (Frontdesk Backend)
```
✅ NEEDED: Frontdesk receives/confirms submitted intake
├─ Review submitted intake data
├─ Verify information
├─ Confirm patient identity if needed
├─ Create patient record
├─ Print summary if needed (for patient)
└─ Route patient to next step (doctor scheduling)

LOCATION: /frontdesk/patients/register (new flow)
```

### 3. Quick Consultation Booking (Frontdesk)
```
✅ NEEDED: Once patient is in system, book consultation
├─ Select doctor from available list
├─ See doctor's schedule/availability
├─ Select available time slot
├─ Confirm with patient
└─ Create appointment

LOCATION: Dashboard (quick action) or Patients page (patient detail)
```

### 4. Today's Schedule (Current)
```
✅ GOOD: Dashboard shows today's appointments
├─ Patient name
├─ Doctor assigned
├─ Time slot
├─ Status (arriving, in consultation, completed)
└─ Quick actions (check-in, notes)

STATUS: Working as intended
```

### 5. Doctor Availability (Current)
```
✅ GOOD: Dashboard shows doctor availability
├─ Week view with working days
├─ Quick "Book" button
├─ Status (working, off, current day highlighted)

STATUS: Working as intended
PURPOSE: Frontdesk can see who's available to book consultations
```

---

## Revised Dashboard Purpose

**NOT:** Consultation inquiry management
**IS:** Quick-access command center for:
1. **Patient intake** (register new walk-ins)
2. **Consultation scheduling** (book with available doctors)
3. **Appointment overview** (see today's schedule)
4. **Patient access** (find existing patients)

---

## Proposed Dashboard Navigation & Flow

### Current Issues:
```
"Today's Schedule" section
├─ Shows 12 appointments
└─ [View All] → /frontdesk/appointments
   Problem: Doesn't help with primary workflow
```

### Better Flow:
```
DASHBOARD (Assistant Console)

┌─────────────────────────────────────────┐
│ QUICK ACTIONS (What to do right now)   │
├─────────────────────────────────────────┤
│ ▶ New Walk-in Patient                  │
│   → Initiate intake, hand device       │
│                                         │
│ ▶ Register Intake Form                 │
│   → Patient completed intake, now what │
│                                         │
│ ▶ Book Consultation                    │
│   → Patient selected, ready to book    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ TODAY'S STATUS (Current snapshot)      │
├─────────────────────────────────────────┤
│ Sessions: 12 | Arrived: 9 | Awaiting: 3│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ DOCTOR AVAILABILITY (For booking)      │
├─────────────────────────────────────────┤
│ [Doctor Cards with week grid]           │
│ [Book button on each card]              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ TODAY'S SCHEDULE (What's happening)    │
├─────────────────────────────────────────┤
│ [Compact appointment rows]              │
│ 08:00 • Sarah → Dr. Sarah [COMPLETED] │
│ 09:00 • Maria → Dr. Chen [PENDING]    │
│ ... (12 items, showing what matters)   │
└─────────────────────────────────────────┘

SIDEBAR NAVIGATION
├─ Dashboard (here)
├─ Patients (search/manage existing)
├─ Intake Pending (new registrations waiting)
└─ Schedule/Sessions (detailed view)
```

---

## What Needs to Be Built/Modified

### Priority 1: Patient Intake Form (NEW)
**Status:** ❌ Not yet built
**What:** Digital form for patient to fill privately
**Where:** `/patient/intake?token=xyz` (frontdesk generates link/QR)
**Features:**
- Personal info section
- Medical history
- Aesthetic goals
- Photography consent
- Privacy notice
- Confirmation page
- Submit button
- Success screen

**Design:** Tablet-friendly, large text, reassuring tone

### Priority 2: Intake Registration Flow (NEW)
**Status:** ❌ Not yet built
**What:** Backend process to handle submitted intakes
**Where:** `/frontdesk/intake/pending` (new dashboard view)
**Features:**
- List of pending intakes
- Review submitted data
- Verify/edit if needed
- Create patient record
- Route to scheduling

### Priority 3: Quick Booking Flow (MODIFY)
**Status:** ⚠️ Partially exists
**What:** Simplify booking a consultation
**Where:** Dashboard → Doctor card [Book] button
**Features:**
- Select patient (search or pre-filled)
- Select doctor (already showing availability)
- Select time slot
- Confirm
- Done

### Priority 4: Clean Up Dashboard (MODIFY)
**Status:** ⚠️ Good but needs clarity
**What:** Remove "View All" button, add intake/booking quick actions
**Changes:**
- Remove "View All Appointments" button
- Add "New Walk-in" action card
- Add "Register Intake" action card  
- Add "Book Consultation" action card
- Keep everything else

---

## Workflow Step-by-Step

### Scenario 1: Walk-in Patient (First Time)

```
Step 1: Patient Arrives
- Frontdesk: "Welcome! Let me register you."
- Frontdesk opens: Dashboard → [New Walk-in Patient]
- System: Generates unique intake link/QR code

Step 2: Patient Completes Intake
- Frontdesk: Hands tablet to patient
- Patient: Scans QR code or taps link
- Patient: Fills intake form privately
  ├─ Name, contact, address
  ├─ Medical history
  ├─ Aesthetic concerns
  ├─ Goals/expectations
  └─ Photography consent
- Patient: Reviews and submits
- System: Stores in "Pending Intakes"

Step 3: Frontdesk Confirms Registration
- Frontdesk: Reviews submitted intake
- Frontdesk: Verifies with patient ("Is this correct?")
- Frontdesk: Confirms/edits info if needed
- System: Creates patient record

Step 4: Book Consultation
- Frontdesk: "Which doctor would you like to consult?"
- Patient: "Dr. Sarah please"
- Frontdesk: Opens Dashboard → Available Doctors
- Frontdesk: Clicks [Book] on Dr. Sarah's card
- System: Shows available time slots
- Frontdesk: Selects slot with patient
- System: Creates appointment
- Frontdesk: "You're all set! 10:00 AM with Dr. Sarah"

Step 5: Patient Consults
- Patient goes to doctor
- Doctor reviews patient file (from intake)
- Doctor conducts consultation
```

### Scenario 2: Returning Patient

```
Step 1: Patient Arrives
- Frontdesk: "Welcome back! Let me check you in."
- Frontdesk: Dashboard → Search Patients
- Frontdesk: Types patient name
- System: Finds patient record

Step 2: Check Appointment Status
- Frontdesk: Views patient profile
- Shows: Previous appointments, next scheduled
- Patient: "I'd like to book another consultation"

Step 3: Book Consultation
- Frontdesk: [Book New Consultation] button
- Opens booking interface
- Selects doctor (patient picks)
- Selects available time
- Confirms appointment

Step 4: Done
- Patient goes to doctor
```

---

## Updated Dashboard Purpose Statement

**Not:** "Consultation Inquiry Management"
**Is:** "Daily Assistant Console"

**Primary Functions:**
1. **Intake New Patients** - Handle walk-ins with privacy
2. **Schedule Consultations** - Book patients with available doctors
3. **Monitor Today** - See what's scheduled and status
4. **Access Patients** - Find and manage existing patient records

**Secondary Functions:**
- Doctor availability reference
- Quick stats
- Check-in management

---

## Key Design Principles for This Workflow

### 1. Privacy First
- Patient intake is private (patient-only access)
- Frontdesk doesn't see sensitive health details until necessary
- Design maintains professional confidentiality

### 2. Efficiency
- Minimal steps to intake new patient
- Minimal steps to book consultation
- No redundant screens

### 3. Clarity
- Clear visual flow showing "what to do next"
- Obvious buttons for primary actions
- No hidden features

### 4. Context
- Dashboard shows what matters: today's schedule + availability for booking
- Each action is a step in the actual workflow
- No redundant pages

---

## Summary of Changes Needed

| Feature | Current | Status | Action |
|---------|---------|--------|--------|
| Patient intake form | Paper | ❌ | Build digital patient-facing form |
| Intake registration | Manual entry | ❌ | Build frontdesk backend process |
| Doctor availability | ✅ Panel shows it | ✅ | Keep, maybe enhance |
| Schedule overview | ✅ Shows today | ✅ | Keep, remove "View All" button |
| Quick booking | Implicit | ⚠️ | Clarify "Book" flow from doctor card |
| Patient search | ✅ Exists | ✅ | Keep and enhance |
| Walk-in registration | Not obvious | ⚠️ | Add clear quick action to dashboard |
| Intake confirmation | Not obvious | ⚠️ | Add quick action to dashboard |

---

## Next Steps

1. **Build Patient Intake Form** (highest priority)
   - Design: Privacy-first, patient-facing
   - Mobile/tablet-optimized
   - Includes all necessary medical info

2. **Build Intake Registration Flow** (high priority)
   - Frontdesk receives submitted intakes
   - Reviews and creates patient record
   - Routes to scheduling

3. **Clarify Dashboard Actions** (medium priority)
   - Add "New Walk-in" action
   - Add "Register Intake" action
   - Remove "View All" redundancy
   - Clarify "Book Consultation" flow

4. **Connect the Workflow** (medium priority)
   - Make sure each step flows naturally to the next
   - Test with actual frontdesk user
   - Verify privacy and efficiency

---

**Key Insight:** This is not an enquiry management system. It's a daily operational system for intake + scheduling. The design should reflect that reality, not the consultation workflow that exists on the external website.
