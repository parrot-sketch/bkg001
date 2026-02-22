# Frontdesk Theater Scheduling Integration - Implementation

**Date:** 2025-01-XX  
**Status:** ✅ Schema & Services Updated - Frontdesk UI Pending

---

## ✅ Completed Changes

### 1. Schema Updates

**File:** `prisma/schema.prisma`

- ✅ Added `READY_FOR_THEATER_BOOKING` to `SurgicalCaseStatus` enum
- ✅ Updated status flow to include new status

### 2. Service Updates

**File:** `application/services/SurgicalCaseService.ts`

- ✅ Updated transition map to include `READY_FOR_THEATER_BOOKING`
- ✅ Added validation for new status transitions

**File:** `application/services/SurgicalCaseStatusTransitionService.ts`

- ✅ Updated `transitionToReadyForTheater()` to transition to `READY_FOR_THEATER_BOOKING`
- ✅ Only transitions from `IN_PREP` status

**File:** `application/services/TheaterService.ts`

- ✅ Updated `lockSlot()` to validate `READY_FOR_THEATER_BOOKING` status
- ✅ Updated `bookSlot()` to validate `READY_FOR_THEATER_BOOKING` status
- ✅ Updated `confirmBooking()` to validate `READY_FOR_THEATER_BOOKING` status
- ✅ Updated `cancelBooking()` to revert to `READY_FOR_THEATER_BOOKING` (not `READY_FOR_SCHEDULING`)

---

## 📋 Corrected Workflow

### Status Flow:

```
1. Consultation → Procedure recommended
   ↓
2. Doctor creates surgical plan → Marks ready
   ↓
3. READY_FOR_SCHEDULING (Planning complete, ready for pre-op checklist)
   ↓
4. Nurse starts pre-op checklist
   ↓
5. IN_PREP (Pre-op checklist in progress)
   ↓
6. Nurse finalizes pre-op checklist
   ↓
7. READY_FOR_THEATER_BOOKING ✅ (Patient physically ready)
   ↓
8. Frontdesk books theater
   ↓
9. SCHEDULED (Theater booked, waiting for surgery day)
   ↓
10. Day of surgery: Nurse starts pre-op (patient in ward)
    ↓
11. IN_PREP (Day of surgery - patient in pre-op ward)
    ↓
12. Patient enters theater
    ↓
13. IN_THEATER (Surgery in progress)
    ↓
14. Intra-op finalized
    ↓
15. RECOVERY (Post-op)
    ↓
16. Recovery finalized
    ↓
17. COMPLETED
```

---

## 🚧 Pending Implementation

### 1. Frontdesk Dashboard Enhancement

**File:** `app/frontdesk/dashboard/page.tsx`

**Add Section:** "Theater Scheduling Queue"

**Features:**
- Show cases in `READY_FOR_THEATER_BOOKING` status
- Patient name, procedure, surgeon
- Pre-op checklist completion indicator
- Quick action: "Book Theater"
- Link to full theater scheduling page

### 2. Theater Scheduling Page

**New File:** `app/frontdesk/theater-scheduling/page.tsx`

**Features:**
- List of cases ready for theater booking
- Filter by surgeon, date, urgency
- Theater availability calendar
- Booking form with date/time selection
- Conflict detection
- Two-phase booking (lock → confirm)

### 3. API Endpoints

**New File:** `app/api/frontdesk/theater-scheduling/route.ts`

**GET `/api/frontdesk/theater-scheduling`**
- List cases in `READY_FOR_THEATER_BOOKING` status
- Include patient, surgeon, procedure details
- Include pre-op checklist status

**POST `/api/frontdesk/theater-scheduling/[caseId]/book`**
- Book theater for case
- Uses existing `TheaterService.bookSlot()`
- Validates `READY_FOR_THEATER_BOOKING` status

### 4. Hooks

**New File:** `hooks/frontdesk/useTheaterScheduling.ts`

**Hooks:**
- `useTheaterSchedulingQueue()` - List ready cases
- `useBookTheater()` - Book theater mutation

### 5. Notifications

**When Pre-Op Checklist Finalized:**
- Notify frontdesk: "Case ready for theater booking"
- Show in frontdesk dashboard queue

**When Theater Booked:**
- Notify surgeon: "Theater booked for [date]"
- Notify nurse: "Theater booked for [date]"
- Update case status to `SCHEDULED`

---

## 📝 Implementation Notes

### Key Changes:

1. **Status Clarification:**
   - `READY_FOR_SCHEDULING` = Planning complete, ready for pre-op checklist
   - `READY_FOR_THEATER_BOOKING` = Pre-op complete, patient physically ready
   - `SCHEDULED` = Theater booked, waiting for surgery day

2. **Workflow Logic:**
   - Pre-op checklist MUST be finalized before theater booking
   - Frontdesk is the only role that can book theater
   - Theater booking validates `READY_FOR_THEATER_BOOKING` status

3. **Status Reuse:**
   - `IN_PREP` is used twice:
     - When pre-op checklist is started (days/weeks before surgery)
     - Day of surgery when patient is in pre-op ward
   - This is acceptable as context is clear from workflow stage

---

## 🎯 Next Steps

1. ✅ Schema updated
2. ✅ Services updated
3. ⏳ Create frontdesk theater scheduling page
4. ⏳ Add theater scheduling section to frontdesk dashboard
5. ⏳ Create API endpoints
6. ⏳ Add notifications
7. ⏳ Test complete workflow

---

**Document Status:** Implementation In Progress  
**Reviewed By:** [Pending]  
**Approved By:** [Pending]
