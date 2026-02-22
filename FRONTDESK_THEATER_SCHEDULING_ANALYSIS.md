# Frontdesk Theater Scheduling Integration - Analysis

**Date:** 2025-01-XX  
**Critical Question:** Who schedules theater and when?

---

## Current Workflow Analysis

### Current Flow (INCORRECT):

```
1. Consultation → Procedure recommended
   ↓
2. Doctor creates surgical plan → Marks ready
   ↓
3. READY_FOR_SCHEDULING (Both doctor & nurse ready)
   ↓
4. ❓ Theater booking happens here? (WRONG - patient not physically ready)
   ↓
5. SCHEDULED
   ↓
6. Pre-op ward checklist (day of surgery)
```

**Problem:** Theater is being booked BEFORE pre-op checklist is done. This is wrong because:
- Patient might not be physically ready
- Pre-op checklist might reveal issues
- We don't know when patient will be available

---

## Correct Workflow (Proposed)

### Correct Flow:

```
1. Consultation → Procedure recommended
   ↓
2. Doctor creates surgical plan → Marks ready
   ↓
3. READY_FOR_SCHEDULING (Doctor planning complete, but NOT ready for theater yet)
   ↓
4. Nurse does pre-op ward checklist → Finalizes
   ↓
5. ✅ READY_FOR_THEATER_BOOKING (NEW STATUS - Patient physically ready)
   ↓
6. Frontdesk schedules theater → SCHEDULED
   ↓
7. Day of surgery → IN_PREP → IN_THEATER → RECOVERY → COMPLETED
```

---

## Key Insights

### 1. "Ready" Has Two Meanings

**Current Confusion:**
- `READY_FOR_SCHEDULING` = Doctor planning complete
- But this doesn't mean patient is ready for theater!

**Solution:**
- `READY_FOR_SCHEDULING` = Planning complete, ready for pre-op checklist
- `READY_FOR_THEATER_BOOKING` = Pre-op complete, patient physically ready

### 2. When Should Theater Be Booked?

**Answer: AFTER pre-op checklist is finalized**

**Reasoning:**
- Pre-op checklist confirms patient is physically ready
- Pre-op checklist confirms all preparations are done
- Pre-op checklist confirms patient understands procedure
- Only then can we confidently schedule theater

### 3. Who Should Book Theater?

**Answer: FRONTDESK**

**Reasoning:**
- Frontdesk already handles appointment scheduling
- Frontdesk coordinates with surgeon availability
- Frontdesk can see theater availability
- Frontdesk handles patient communication
- Frontdesk is the scheduling coordinator

---

## Proposed Status Flow

### New Status: `READY_FOR_THEATER_BOOKING`

**Purpose:** Indicates patient is physically ready and pre-op checklist is complete.

**Transition:**
- `READY_FOR_SCHEDULING` → Pre-op checklist finalized → `READY_FOR_THEATER_BOOKING`
- `READY_FOR_THEATER_BOOKING` → Frontdesk books theater → `SCHEDULED`

### Updated Status Machine:

```
DRAFT
  ↓ (Doctor creates plan)
PLANNING
  ↓ (Doctor marks ready)
READY_FOR_SCHEDULING  ← Planning complete, ready for pre-op checklist
  ↓ (Nurse starts pre-op checklist)
IN_PREP
  ↓ (Pre-op checklist finalized)
READY_FOR_THEATER_BOOKING  ← NEW: Patient physically ready
  ↓ (Frontdesk books theater)
SCHEDULED
  ↓ (Day of surgery: Nurse starts pre-op)
IN_PREP (again - day of surgery prep)
  ↓ (Patient enters theater)
IN_THEATER
  ↓ (Intra-op finalized)
RECOVERY
  ↓ (Recovery finalized)
COMPLETED
```

**Wait - there's a conflict:** `IN_PREP` is used twice!

**Solution:** Use different status or clarify:
- `READY_FOR_THEATER_BOOKING` = Pre-op checklist done, waiting for theater booking
- `SCHEDULED` = Theater booked, waiting for surgery day
- `IN_PREP` = Day of surgery, patient in pre-op ward

---

## Frontdesk Integration Points

### 1. Frontdesk Dashboard Enhancement

**Add Section:** "Theater Scheduling Queue"

**Shows:**
- Cases in `READY_FOR_THEATER_BOOKING` status
- Patient name, procedure, surgeon
- Pre-op checklist completion status
- Quick action: "Book Theater"

### 2. Theater Booking Page

**New Page:** `/frontdesk/theater-scheduling`

**Features:**
- List of cases ready for theater booking
- Theater availability calendar
- Surgeon availability
- Conflict detection
- Booking form with date/time selection

### 3. Workflow Integration

**When Pre-Op Checklist Finalized:**
- Auto-transition: `IN_PREP` → `READY_FOR_THEATER_BOOKING`
- Notify frontdesk (notification)
- Show in frontdesk dashboard queue

**When Frontdesk Books Theater:**
- Create `TheaterBooking` record
- Auto-transition: `READY_FOR_THEATER_BOOKING` → `SCHEDULED`
- Notify surgeon and nurse
- Update case status

---

## Implementation Plan

### Phase 1: Status Refinement

1. **Clarify Status Meanings:**
   - `READY_FOR_SCHEDULING` = Planning complete, ready for pre-op
   - `READY_FOR_THEATER_BOOKING` = Pre-op complete, ready for theater

2. **Update Status Transitions:**
   - Pre-op finalized → `READY_FOR_THEATER_BOOKING` (not `SCHEDULED`)
   - Frontdesk books theater → `SCHEDULED`

### Phase 2: Frontdesk Integration

3. **Frontdesk Dashboard:**
   - Add "Theater Scheduling" section
   - Show cases ready for booking
   - Quick action buttons

4. **Theater Booking Page:**
   - New page for frontdesk
   - Theater availability view
   - Booking form
   - Conflict detection

5. **API Endpoints:**
   - `GET /api/frontdesk/theater-scheduling` - List ready cases
   - `POST /api/frontdesk/theater-scheduling/[caseId]/book` - Book theater

### Phase 3: Workflow Automation

6. **Auto-Transitions:**
   - Pre-op finalized → `READY_FOR_THEATER_BOOKING`
   - Theater booked → `SCHEDULED`

7. **Notifications:**
   - Notify frontdesk when case ready for booking
   - Notify surgeon/nurse when theater booked

---

## Questions to Answer

1. **Should we add `READY_FOR_THEATER_BOOKING` status?**
   - OR: Keep `READY_FOR_SCHEDULING` but add flag `ready_for_theater_booking`?
   - OR: Use `IN_PREP` differently (pre-op checklist vs day-of-surgery prep)?

2. **When does `IN_PREP` status apply?**
   - Option A: Only day-of-surgery (patient in pre-op ward)
   - Option B: When pre-op checklist is started (current implementation)
   - Option C: Both (need different statuses)

3. **Should frontdesk see all surgical cases?**
   - Only `READY_FOR_THEATER_BOOKING` cases?
   - Or all cases for context?

---

## Recommended Solution

### Option 1: Add New Status (Recommended)

**Status Flow:**
```
READY_FOR_SCHEDULING (planning complete)
  ↓
IN_PREP (pre-op checklist started)
  ↓
READY_FOR_THEATER_BOOKING (pre-op finalized) ← NEW
  ↓
SCHEDULED (theater booked)
  ↓
IN_PREP (day of surgery - patient in ward) ← Reuse status
  ↓
IN_THEATER
```

**Pros:**
- Clear separation of concerns
- Explicit workflow state
- Easy to query "ready for booking"

**Cons:**
- One more status to manage
- Status name is long

### Option 2: Use Flag (Alternative)

**Keep existing statuses, add flag:**
```
READY_FOR_SCHEDULING (planning complete)
  ↓
IN_PREP (pre-op checklist started)
  ↓
IN_PREP + ready_for_theater_booking = true (pre-op finalized)
  ↓
SCHEDULED (theater booked)
```

**Pros:**
- Fewer statuses
- Flexible

**Cons:**
- Less explicit
- Harder to query
- Flag can get out of sync

**Recommendation:** Option 1 (new status)

---

## Frontdesk Role in Surgical Workflow

### Current Frontdesk Responsibilities:
- ✅ Patient registration
- ✅ Appointment scheduling
- ✅ Check-in management
- ✅ Billing & payments

### New Responsibilities (Proposed):
- ✅ Theater scheduling
- ✅ Surgical case coordination
- ✅ Surgeon availability coordination
- ✅ Patient communication for surgery dates

### Frontdesk Dashboard Enhancements:

1. **Theater Scheduling Queue**
   - Cases ready for theater booking
   - Quick booking actions
   - Calendar view

2. **Surgical Cases Overview**
   - All surgical cases by status
   - Filter by surgeon, date, status
   - Quick actions

3. **Theater Calendar**
   - View theater availability
   - See booked slots
   - Book new slots

---

## Implementation Priority

### P0 (Critical):
1. ✅ Add `READY_FOR_THEATER_BOOKING` status
2. ✅ Update pre-op finalization → transition to `READY_FOR_THEATER_BOOKING`
3. ✅ Create frontdesk theater scheduling page
4. ✅ Update theater booking → transition to `SCHEDULED`

### P1 (High Priority):
5. Add frontdesk dashboard section for theater scheduling
6. Add notifications when case ready for booking
7. Add theater availability calendar

---

## Conclusion

**Current Problem:** Theater booking happens too early (before pre-op checklist).

**Solution:** 
1. Pre-op checklist must be finalized FIRST
2. Then case becomes `READY_FOR_THEATER_BOOKING`
3. Frontdesk schedules theater
4. Case becomes `SCHEDULED`

**Frontdesk Integration:**
- Frontdesk should handle theater scheduling
- Add theater scheduling queue to dashboard
- Create dedicated theater booking page
- Integrate with existing appointment scheduling workflow

This ensures **patient is physically ready** before theater is booked, and **frontdesk coordinates** the scheduling process.

---

**Document Status:** Analysis Complete - Ready for Implementation  
**Reviewed By:** [Pending]  
**Approved By:** [Pending]
