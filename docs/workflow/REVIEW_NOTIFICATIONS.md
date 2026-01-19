# Review Notifications Analysis

## Current Notification Status

### ✅ Patient Notifications (WORKING)

**When Frontdesk Reviews a Consultation Request:**

1. **Approve Action:**
   - ✅ Patient receives email: "Your consultation request has been approved and is ready to be scheduled. Proposed date: [date] at [time]. Please confirm your availability."
   - **Location:** `ReviewConsultationRequestUseCase.ts` lines 250-252

2. **Request More Info Action:**
   - ✅ Patient receives email: "We need additional information to proceed with your consultation request. [Review notes/questions]"
   - **Location:** `ReviewConsultationRequestUseCase.ts` lines 254-255

3. **Reject Action:**
   - ✅ Patient receives email: "We regret to inform you that your consultation request has been declined. Reason: [review notes]"
   - **Location:** `ReviewConsultationRequestUseCase.ts` lines 167-170

### ❌ Doctor Notifications (NOT IMPLEMENTED)

**Current State:**
- ❌ Doctor is **NOT** notified when frontdesk approves an inquiry
- ❌ Doctor is **NOT** notified when a session is scheduled
- ❌ Doctor is **NOT** notified when a session is confirmed

**Why?**
- The current workflow is designed to protect the surgeon's time
- Doctor only sees `CONFIRMED` sessions in their dashboard
- No notifications = no noise, no interruptions

---

## Should Doctors Be Notified?

### Arguments FOR Notifying Doctors

1. **Preparation Time**
   - Doctor should know when a session is scheduled for them
   - Allows doctor to prepare (review patient history, etc.)
   - Better coordination

2. **Professional Courtesy**
   - Doctor should be aware of their schedule
   - Transparency in the workflow

3. **Calendar Management**
   - Doctor might want to block time or adjust schedule
   - Helps with personal planning

### Arguments AGAINST Notifying Doctors (Current Model)

1. **Time Protection**
   - Surgeon's time is the product - must be protected
   - No noise, no interruptions
   - Frontdesk handles all scheduling

2. **Workflow Separation**
   - Frontdesk = gatekeeper (handles inquiries)
   - Doctor = clinician (handles confirmed sessions)
   - Clear separation of concerns

3. **Dashboard is Enough**
   - Doctor sees confirmed sessions in dashboard
   - No need for notifications if dashboard is checked regularly

---

## Recommendation

### Option 1: Notify Doctor Only on Confirmation (Recommended)

**When to notify:**
- ✅ Notify doctor when patient **confirms** the session (`CONFIRMED` status)
- ❌ Don't notify on approval (`APPROVED` status)
- ❌ Don't notify on scheduling (`SCHEDULED` status)

**Rationale:**
- Doctor only needs to know about confirmed sessions
- Maintains "no noise" principle
- Doctor can prepare once session is confirmed
- Aligns with workflow: doctor only sees confirmed sessions

**Implementation:**
- Add notification in `ConfirmConsultationUseCase` or when status changes to `CONFIRMED`
- Email: "A new session has been confirmed for [date] at [time] with [patient name]"

### Option 2: Notify Doctor on Approval (Alternative)

**When to notify:**
- ✅ Notify doctor when frontdesk approves inquiry (`APPROVED` status)
- ✅ Notify doctor when session is confirmed (`CONFIRMED` status)

**Rationale:**
- Doctor knows about upcoming sessions earlier
- More time to prepare
- Better visibility

**Trade-off:**
- More notifications = more noise
- Doctor might see inquiries that never get confirmed

---

## Current Implementation Status

### Patient Notifications ✅
- **Status:** Working
- **Location:** `ReviewConsultationRequestUseCase.ts`
- **Actions:** Approve, Request Info, Reject

### Doctor Notifications ❌
- **Status:** Not implemented
- **Recommendation:** Add notification when status becomes `CONFIRMED`
- **Location to add:** `ConfirmConsultationUseCase` or appointment status change handler

---

## Next Steps

1. ✅ **Fix status transition error** (DONE - allow SUBMITTED → APPROVED/NEEDS_MORE_INFO)
2. ⏳ **Decide on doctor notification policy**
3. ⏳ **Implement doctor notification if approved** (only on CONFIRMED status)
