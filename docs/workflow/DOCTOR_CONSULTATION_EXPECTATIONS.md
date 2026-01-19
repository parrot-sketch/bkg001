# What a Doctor Should Expect After Consultation is Confirmed & Scheduled

**Date:** January 2025  
**Audience:** Surgeons using the system

---

## Overview

After a consultation request has been reviewed by the frontdesk assistant and scheduled, here's what you (the surgeon) should expect to see on your appointments page.

---

## On Your Appointments Page (`/doctor/appointments`)

### For Each Scheduled Consultation, You Will See:

#### 1. **Appointment Details**
- **Date & Time**: Clear display of when the consultation is scheduled
- **Type**: Consultation type (e.g., "Initial Consultation", "Follow-up")
- **Status**: SCHEDULED (green badge)

#### 2. **Patient Information**
- **Patient Name**: Full name (not just ID)
- **File Number**: Patient's file number if available
- **Patient Photo**: If available

#### 3. **Primary Concern** (NEW)
- **What the patient wants**: Extracted from appointment notes or consultation request
- **Example**: "Patient wants rhinoplasty, concerned about dorsal hump"
- Displayed in a prominent blue box for quick scanning

#### 4. **Assistant Brief** (NEW - If Available)
- **Frontdesk-prepared notes**: Context the assistant gathered
- **Example**: "Patient anxious about recovery time, price-sensitive, has questions about scarring"
- Displayed in amber box if assistant added notes
- Helps you understand patient context before entering the room

#### 5. **Consultation Readiness Indicators** (NEW)
Visual indicators showing if patient file is ready:
- ✅ **Intake Complete**: Patient completed intake form
- ✅ **Photos Uploaded**: Patient uploaded before photos
- ✅ **Medical History Complete**: Medical history provided
- ✅ **Consent Acknowledged**: Required consents signed

**If all green**: Patient file is fully prepared, ready for consultation  
**If any red/amber**: Missing items - review before starting consultation

#### 6. **Quick Actions**
- **Check In**: If patient hasn't arrived yet (usually assistant's job)
- **Start Consultation**: Opens consultation session workspace
  - Button shows "Start Consultation" if ready
  - Button shows "Start Consultation (Review File)" if not fully ready
- **Complete Consultation**: If consultation already started

---

## What This Means for Your Workflow

### Before Consultation:
1. **Review the appointment card** - See patient name, primary concern, assistant brief
2. **Check readiness indicators** - Know if patient file is complete
3. **If not ready**: You'll see what's missing (photos, intake, etc.)
4. **Click "Start Consultation"** - Opens full consultation session

### During Consultation:
- Full consultation workspace with:
  - Patient info sidebar (always visible)
  - Clinical summary at top
  - Readiness indicators
  - Tab-based workspace for documentation

### After Consultation:
- Complete consultation workflow
- Create case plans if procedure recommended
- Schedule follow-ups if needed

---

## Key Improvements for Surgeons

### ✅ **Immediate Context**
- See patient name and primary concern immediately
- No need to click through to find basic information

### ✅ **Preparation Status**
- Know if patient file is ready before starting
- See what's missing if not ready

### ✅ **Assistant Context**
- See assistant-prepared brief if available
- Understand patient context (anxious, price-sensitive, etc.)

### ✅ **Clinical Language**
- Uses "Primary Concern" not "Patient Goals"
- Feels like clinical documentation

### ✅ **Visual Hierarchy**
- Critical information (readiness, primary concern) is prominent
- Easy to scan multiple appointments quickly

---

## Example: What You'll See

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Monday, January 15, 2025          [SCHEDULED]      │
│ ⏰ 10:00 AM • Initial Consultation                      │
├─────────────────────────────────────────────────────────┤
│ 👤 Sarah Johnson (File: P-2025-001)                    │
│                                                          │
│ 📄 Primary Concern                                      │
│ Patient wants rhinoplasty, concerned about dorsal       │
│ hump. Previously declined filler, now considering      │
│ surgical option.                                         │
│                                                          │
│ ⚠️ Assistant Brief                                       │
│ Patient anxious about recovery time, price-sensitive.  │
│ Has questions about scarring.                           │
│                                                          │
│ ✅ Ready  [Intake ✅] [Photos ✅] [History ✅] [Consent ✅]│
│                                                          │
│ [Start Consultation]                                    │
└─────────────────────────────────────────────────────────┘
```

---

## If Patient File Not Ready

You'll see:
```
⚠️ Not Ready  [Intake ✅] [Photos ❌] [History ✅] [Consent ✅]

⚠️ Patient file not fully prepared. Review missing items 
   before consultation.

[Start Consultation (Review File)]
```

This tells you:
- Photos are missing
- You can still start, but should be aware of missing items
- Assistant should collect photos before consultation

---

## Navigation Flow

1. **Dashboard** (`/doctor`) → See today's appointments summary
2. **Appointments** (`/doctor/appointments`) → See all scheduled consultations with full context
3. **Click "Start Consultation"** → Opens consultation session (`/doctor/consultations/[id]/session`)
4. **During Session** → Full clinical workspace with patient context
5. **Complete** → Return to appointments list

---

## What's Different from Before

### Before:
- ❌ Only saw patient ID (not name)
- ❌ No indication of patient readiness
- ❌ No primary concern visible
- ❌ No assistant context
- ❌ Generic "Start Consultation" button

### Now:
- ✅ See patient name immediately
- ✅ See readiness status at a glance
- ✅ See primary concern prominently
- ✅ See assistant brief if available
- ✅ Button indicates if file needs review

---

## Summary

After a consultation is confirmed and scheduled, you (the surgeon) will see:

1. **Clear appointment details** (date, time, type)
2. **Patient information** (name, file number)
3. **Primary concern** (what patient wants)
4. **Assistant brief** (context from frontdesk)
5. **Readiness indicators** (is patient file ready?)
6. **Quick actions** (start consultation, check in)

This gives you everything you need to know before entering the consultation room, reducing cognitive load and helping you prepare effectively.

---

## Questions?

If you don't see expected information:
- Check that frontdesk has reviewed and scheduled the consultation
- Verify patient has completed intake forms
- Check that assistant has added notes if needed
- Contact frontdesk if patient file appears incomplete
