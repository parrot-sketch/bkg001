# Patient View Guide: Where to Find Consultation Information

## Overview

This document explains where patients can find information about their consultation inquiries and sessions in the system.

---

## Where Patients See Consultation Information

### 1. **Patient Dashboard** (`/patient/dashboard`)

**What's Shown:**
- Quick stats: Upcoming appointments count, Pending count
- Upcoming appointments (first 5)
- Link to "View All" appointments

**What Patients See:**
- ✅ All appointments with consultation request status
- ✅ Approved consultations (with "Accepted for Scheduling" status)
- ✅ Scheduled consultations (with "Session Proposed" status)
- ✅ Confirmed sessions
- ✅ Pending inquiries

**Location:** Main landing page after login

---

### 2. **Patient Appointments Page** (`/patient/appointments`)

**What's Shown:**
- **Upcoming Sessions** section:
  - All active consultations (SUBMITTED, PENDING_REVIEW, APPROVED, SCHEDULED, CONFIRMED, NEEDS_MORE_INFO)
  - Status indicators with colors
  - Action buttons based on status
  - Review notes from frontdesk
  
- **Session History** section:
  - Completed sessions
  - Cancelled appointments

**Status Display:**
- **Inquiry Received** (SUBMITTED) - Yellow
- **Under Review** (PENDING_REVIEW) - Yellow
- **Clarification Required** (NEEDS_MORE_INFO) - Orange
- **Accepted for Scheduling** (APPROVED) - Teal ⭐ **NEW**
- **Session Proposed** (SCHEDULED) - Blue
- **Confirmed** (CONFIRMED) - Green

**Action Buttons:**
- **Provide Clarification** - When status is NEEDS_MORE_INFO
- **Confirm Session** - When status is SCHEDULED
- **Info Message** - When status is APPROVED (shows "Our team will contact you shortly")

**Location:** Navigation menu → "Appointments" or "Your Inquiries"

---

## Status Flow for Patients

### What Patients See at Each Stage:

1. **After Submitting Inquiry:**
   - Status: "Inquiry Received" or "Under Review"
   - Location: `/patient/appointments` → "Upcoming Sessions"
   - Message: "Your inquiry has been received. Our team will review it shortly."

2. **After Frontdesk Approves:**
   - Status: "Accepted for Scheduling" ⭐
   - Location: `/patient/appointments` → "Upcoming Sessions"
   - Message: "Your inquiry has been accepted. We will contact you shortly to schedule your session."
   - **Note:** Patient sees this but cannot take action yet (frontdesk schedules)

3. **After Frontdesk Schedules:**
   - Status: "Session Proposed"
   - Location: `/patient/appointments` → "Upcoming Sessions"
   - Message: "A session time has been proposed. Please confirm if this works for you."
   - **Action:** "Confirm Session" button appears

4. **After Patient Confirms:**
   - Status: "Confirmed"
   - Location: `/patient/appointments` → "Upcoming Sessions"
   - Message: "Your session has been confirmed. We look forward to meeting with you."
   - **Note:** Doctor can now see this session

5. **If Clarification Needed:**
   - Status: "Clarification Required"
   - Location: `/patient/appointments` → "Upcoming Sessions"
   - Message: "We would like to gather a bit more information..."
   - **Action:** "Provide Clarification" button appears

---

## Notifications

### Email Notifications (Currently Implemented)

✅ **Patient receives email when:**
- Inquiry is approved: "Your consultation request has been approved..."
- Clarification needed: "We need additional information..."
- Inquiry rejected: "We regret to inform you..."

### In-App Notifications (Not Currently Implemented)

❌ **In-app notifications are NOT implemented yet**

**Future Enhancement:**
- Badge on "Appointments" menu item showing count of items needing attention
- Toast notifications when status changes
- Notification center for all updates

---

## What Patients Should Do

### When Status is "Accepted for Scheduling" (APPROVED):

1. **Patient sees:** Status badge and info message
2. **Patient action:** Wait for frontdesk to schedule
3. **What happens:** Frontdesk will set a date/time and status becomes "Session Proposed"
4. **Patient then:** Can confirm the proposed session

### When Status is "Session Proposed" (SCHEDULED):

1. **Patient sees:** Status badge, proposed date/time, "Confirm Session" button
2. **Patient action:** Click "Confirm Session" button
3. **What happens:** Status becomes "Confirmed", doctor can see it
4. **Patient then:** Session is locked in, doctor is notified

### When Status is "Clarification Required" (NEEDS_MORE_INFO):

1. **Patient sees:** Status badge, review notes with questions, "Provide Clarification" button
2. **Patient action:** Click "Provide Clarification", answer questions
3. **What happens:** Status goes back to "Under Review"
4. **Patient then:** Frontdesk reviews again

---

## Troubleshooting

### "I don't see my approved consultation"

**Check:**
1. Go to `/patient/appointments` (not just dashboard)
2. Look in "Upcoming Sessions" section
3. Check if status shows "Accepted for Scheduling"
4. If not visible, check browser console for errors

### "I didn't receive an email notification"

**Possible reasons:**
1. Email might be in spam folder
2. Email service might be using mock/console logging (check server logs)
3. Email address might be incorrect

**Check:**
- Server console logs for email sending attempts
- Patient profile for correct email address

---

## Summary

**Where to find consultation information:**
- ✅ **Dashboard** (`/patient/dashboard`) - Overview and quick stats
- ✅ **Appointments Page** (`/patient/appointments`) - Full details and actions

**What to look for:**
- Status badges with colors
- Action buttons when action is needed
- Review notes from frontdesk
- Proposed dates/times when scheduled

**Key Status:**
- **APPROVED** = Accepted, waiting for scheduling (no action needed yet)
- **SCHEDULED** = Session proposed, needs confirmation (click "Confirm Session")
- **CONFIRMED** = Locked in, doctor can see it
