# Consultation Review Workflow

**Last Updated:** January 2025

## Overview

This document defines the complete consultation review workflow for Nairobi Sculpt, explaining what the "review" process entails, what the frontdesk user (Surgical Assistant) is expected to do, and how the workflow connects Patient → Frontdesk → Doctor.

---

## Core Mental Model

**The Frontdesk User = Surgeon's Personal Assistant**

The frontdesk user acts as a **gatekeeper** for the surgeon's time and brand. They are not just processing requests—they are:
- **Protecting the surgeon's time** by filtering out unsuitable candidates
- **Ensuring quality** by only allowing appropriate inquiries to proceed
- **Maintaining the premium brand** by handling inquiries with discretion and professionalism
- **Personalizing the experience** by making patients feel personally handled

---

## What is "Review"?

### Definition

**Review** is the process by which the Surgical Assistant (Frontdesk) evaluates a patient's consultation inquiry to determine if it should:
1. **Proceed to scheduling** (patient is a suitable candidate)
2. **Require more information** (need clarification before deciding)
3. **Be declined** (patient is not a suitable candidate for this procedure)

### Review is NOT:
- ❌ Just clicking "approve" or "reject"
- ❌ A simple admin task
- ❌ Automatic processing

### Review IS:
- ✅ **Clinical gatekeeping** - evaluating if the inquiry is appropriate
- ✅ **Brand protection** - ensuring only suitable candidates proceed
- ✅ **Time management** - protecting the surgeon from unsuitable inquiries
- ✅ **Patient care** - ensuring patients get appropriate guidance

---

## Complete Workflow: Patient → Frontdesk → Doctor

### Phase 1: Patient Submits Inquiry

**Actor:** Patient  
**Action:** Submits consultation inquiry via 7-step process  
**System State:**
- `consultation_request_status`: `SUBMITTED` or `PENDING_REVIEW`
- `appointment_status`: `PENDING`
- Patient receives: "Your inquiry has been received. We will review it shortly."

**What Patient Provides:**
- Procedure of interest (Rhinoplasty, BBL, Liposuction, etc.)
- Preferred surgeon
- Preferred date
- Preferred time window
- Medical history (if relevant)
- Goals and expectations
- Questions or concerns

---

### Phase 2: Frontdesk Reviews Inquiry

**Actor:** Frontdesk (Surgical Assistant)  
**Action:** Reviews the inquiry and takes one of three actions

#### What Frontdesk Sees:
- Patient name and contact information
- Procedure of interest
- Preferred surgeon
- Preferred date/time preferences
- Medical history and goals (from inquiry)
- Any notes or questions from patient

#### What Frontdesk Must Evaluate:

1. **Is this procedure appropriate for this patient?**
   - Does the patient meet basic criteria?
   - Is this a realistic request?
   - Are there any red flags?

2. **Is this surgeon the right fit?**
   - Does the surgeon perform this procedure?
   - Is the surgeon available?
   - Is this within the surgeon's expertise?

3. **Do we have enough information?**
   - Is the medical history complete?
   - Are there any concerns that need clarification?
   - Do we need more details about goals/expectations?

#### Frontdesk Review Actions:

##### Action 1: **Accept for Scheduling** (`approve`)

**When to use:**
- Patient is a suitable candidate
- Procedure is appropriate
- Surgeon is available
- All information is sufficient

**What Frontdesk must provide:**
- ✅ **Proposed Date** (required)
- ✅ **Proposed Time** (required)
- Optional: Additional notes for patient

**System State Change:**
- `consultation_request_status`: `SUBMITTED`/`PENDING_REVIEW` → `APPROVED`
- `appointment_date`: Updated to proposed date
- `appointment_time`: Updated to proposed time
- `reviewed_by`: Frontdesk user ID
- `reviewed_at`: Current timestamp
- `review_notes`: Optional notes

**What Happens Next:**
- Patient receives notification: "Your inquiry has been accepted. Proposed date: [date] at [time]. Please confirm your availability."
- Status becomes `APPROVED` (ready for scheduling)
- Frontdesk can now schedule the session (status → `SCHEDULED`)

---

##### Action 2: **Request Clarification** (`needs_more_info`)

**When to use:**
- Need more medical information
- Need clarification on goals/expectations
- Need to understand patient's situation better
- Procedure might be appropriate but need more details

**What Frontdesk must provide:**
- ✅ **Review Notes** (required) - Specific questions for the patient
- Example: "Could you provide more details about your medical history? Specifically, have you had any previous surgeries?"

**System State Change:**
- `consultation_request_status`: `SUBMITTED`/`PENDING_REVIEW` → `NEEDS_MORE_INFO`
- `reviewed_by`: Frontdesk user ID
- `reviewed_at`: Current timestamp
- `review_notes`: Questions for patient

**What Happens Next:**
- Patient receives notification: "We need additional information to proceed. [Review notes/questions]"
- Patient can respond with clarification
- Status can transition back to `SUBMITTED` or `PENDING_REVIEW` after patient responds

---

##### Action 3: **Mark as Not Suitable** (`reject`)

**When to use:**
- Patient is not a suitable candidate for this procedure
- Procedure is not appropriate for patient's situation
- Medical contraindications
- Unrealistic expectations that cannot be met

**What Frontdesk must provide:**
- ✅ **Review Notes** (required) - Reason for unsuitability
- Example: "Based on your medical history, this procedure may not be suitable. We recommend consulting with your primary care physician first."

**System State Change:**
- `appointment_status`: `PENDING` → `CANCELLED`
- `consultation_request_status`: Remains as-is (or can be set to final state)
- `reviewed_by`: Frontdesk user ID
- `reviewed_at`: Current timestamp
- `review_notes`: Reason for unsuitability

**What Happens Next:**
- Patient receives notification: "We regret to inform you that your consultation request has been declined. Reason: [review notes]"
- Appointment is cancelled
- **Doctor never sees this** - it's filtered out

---

### Phase 3: Scheduling (After Approval)

**Actor:** Frontdesk  
**Action:** Schedules the session after approval

**When:** After inquiry is `APPROVED`

**What Frontdesk does:**
- Confirms proposed date/time with patient
- Sets final appointment date/time
- Updates status to `SCHEDULED`

**System State Change:**
- `consultation_request_status`: `APPROVED` → `SCHEDULED`
- `appointment_date`: Final date
- `appointment_time`: Final time
- `appointment_status`: `PENDING` or `SCHEDULED`

---

### Phase 4: Patient Confirms

**Actor:** Patient  
**Action:** Confirms the proposed session

**When:** After status is `SCHEDULED`

**What Patient does:**
- Reviews proposed date/time
- Confirms availability
- Accepts the session

**System State Change:**
- `consultation_request_status`: `SCHEDULED` → `CONFIRMED`
- `appointment_status`: `SCHEDULED` or `CONFIRMED`

**What Happens Next:**
- **Doctor can now see this session** in their dashboard
- Session appears in doctor's schedule
- Patient receives confirmation

---

### Phase 5: Doctor Sees Confirmed Session

**Actor:** Doctor (Surgeon)  
**Action:** Views and manages confirmed sessions

**What Doctor Sees:**
- ✅ **CONFIRMED** sessions
- ✅ **SCHEDULED** sessions (if applicable)
- ❌ **NOT** `SUBMITTED` inquiries
- ❌ **NOT** `PENDING_REVIEW` inquiries
- ❌ **NOT** `NEEDS_MORE_INFO` inquiries
- ❌ **NOT** `APPROVED` (not yet scheduled)
- ❌ **NOT** cancelled/rejected inquiries

**Doctor's View:**
- Today's confirmed sessions
- Upcoming confirmed sessions
- Patient information
- Procedure type
- Session notes

**Doctor's Actions:**
- Start consultation
- Complete consultation
- Add consultation notes
- Schedule follow-up

---

## Complete State Flow Diagram

```
PATIENT SUBMITS INQUIRY
    ↓
[SUBMITTED] or [PENDING_REVIEW]
    ↓
FRONTDESK REVIEWS
    ↓
    ├─→ APPROVE (with date/time)
    │       ↓
    │   [APPROVED]
    │       ↓
    │   FRONTDESK SCHEDULES
    │       ↓
    │   [SCHEDULED]
    │       ↓
    │   PATIENT CONFIRMS
    │       ↓
    │   [CONFIRMED] ← DOCTOR CAN SEE THIS
    │
    ├─→ REQUEST CLARIFICATION (with questions)
    │       ↓
    │   [NEEDS_MORE_INFO]
    │       ↓
    │   PATIENT RESPONDS
    │       ↓
    │   [SUBMITTED] or [PENDING_REVIEW]
    │       ↓
    │   (Back to review)
    │
    └─→ REJECT (with reason)
            ↓
        [CANCELLED] ← DOCTOR NEVER SEES THIS
```

---

## What Frontdesk User is Expected to Do

### Daily Responsibilities:

1. **Monitor "Assistant Console" Dashboard**
   - Check for new inquiries (`SUBMITTED`, `PENDING_REVIEW`)
   - Check for inquiries awaiting clarification (`NEEDS_MORE_INFO`)
   - Check for approved inquiries ready to schedule (`APPROVED`)

2. **Review Each Inquiry**
   - Read patient's inquiry details
   - Evaluate suitability
   - Check surgeon availability
   - Determine appropriate action

3. **Take Action**
   - **Accept** if suitable → Provide proposed date/time
   - **Request Info** if need clarification → Provide specific questions
   - **Reject** if not suitable → Provide professional reason

4. **Schedule Approved Inquiries**
   - Confirm date/time with patient
   - Set final appointment
   - Move to `SCHEDULED` status

5. **Follow Up**
   - Check on inquiries awaiting patient response
   - Re-review after patient provides clarification
   - Ensure smooth flow to confirmation

---

## Key Principles

### 1. **Gatekeeping, Not Processing**
Frontdesk is not just processing requests—they are making clinical/business decisions about suitability.

### 2. **Protect Surgeon's Time**
Only suitable, confirmed sessions reach the surgeon. No noise, no unsuitable inquiries.

### 3. **Professional Communication**
All communications (approvals, clarifications, rejections) must be:
- Professional
- Calm
- Discreet
- Helpful

### 4. **Patient Experience**
Even rejections should be handled with care:
- Provide clear reasons
- Offer alternatives if appropriate
- Maintain brand reputation

### 5. **Complete Information**
Never approve without:
- Confirmed date/time
- Surgeon availability verified
- Patient suitability confirmed

---

## Integration Points

### Patient → Frontdesk
- Patient submits inquiry
- Inquiry appears in Frontdesk dashboard
- Frontdesk reviews and takes action
- Patient receives notification

### Frontdesk → Patient
- Frontdesk approves → Patient confirms
- Frontdesk requests info → Patient responds
- Frontdesk rejects → Patient notified (with reason)

### Frontdesk → Doctor
- Only `CONFIRMED` sessions appear in doctor dashboard
- Doctor never sees rejected inquiries
- Doctor never sees pending reviews
- Doctor sees only their confirmed schedule

---

## Status Reference

| Status | Meaning | Who Sees It | Next Action |
|--------|---------|-------------|-------------|
| `SUBMITTED` | Patient just submitted | Patient, Frontdesk | Frontdesk reviews |
| `PENDING_REVIEW` | Under review | Patient, Frontdesk | Frontdesk reviews |
| `NEEDS_MORE_INFO` | Awaiting patient response | Patient, Frontdesk | Patient responds |
| `APPROVED` | Accepted, ready to schedule | Patient, Frontdesk | Frontdesk schedules |
| `SCHEDULED` | Session proposed | Patient, Frontdesk | Patient confirms |
| `CONFIRMED` | Patient confirmed | Patient, Frontdesk, **Doctor** | Doctor can start consultation |

---

## Error Prevention

### Common Mistakes to Avoid:

1. **Approving without date/time**
   - ❌ Don't approve without proposed date/time
   - ✅ Always provide specific date/time when approving

2. **Requesting info without questions**
   - ❌ Don't request clarification without specific questions
   - ✅ Always provide clear questions in review notes

3. **Rejecting without reason**
   - ❌ Don't reject without explanation
   - ✅ Always provide professional reason

4. **Skipping review**
   - ❌ Don't auto-approve all inquiries
   - ✅ Review each inquiry carefully

5. **Not following up**
   - ❌ Don't leave inquiries in `NEEDS_MORE_INFO` indefinitely
   - ✅ Follow up when patient responds

---

## Success Metrics

A well-functioning review process should result in:
- ✅ All inquiries reviewed within 24-48 hours
- ✅ Clear communication with patients
- ✅ Only suitable candidates reaching the surgeon
- ✅ Surgeon's schedule free of noise
- ✅ Professional, premium patient experience

---

## Future Enhancements

- [ ] Automated suitability scoring (AI-assisted)
- [ ] Template responses for common scenarios
- [ ] Integration with surgeon availability calendar
- [ ] Bulk review actions for similar inquiries
- [ ] Review history and analytics
