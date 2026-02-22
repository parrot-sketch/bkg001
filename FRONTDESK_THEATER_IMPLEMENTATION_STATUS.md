# Frontdesk Theater Scheduling - Implementation Status

**Date:** 2025-01-XX  
**Status:** 🟡 In Progress (Core Complete, Testing & Enhancements Pending)

---

## ✅ Completed Implementation

### 1. API Endpoints

**Created:**
- ✅ `app/api/frontdesk/theater-scheduling/route.ts` - GET queue
- ✅ `app/api/frontdesk/theater-scheduling/[caseId]/book/route.ts` - POST lock slot
- ✅ `app/api/frontdesk/theater-scheduling/[caseId]/confirm/route.ts` - POST confirm booking
- ✅ `app/api/frontdesk/theater-scheduling/theaters/route.ts` - GET theaters with bookings

**Features:**
- Authentication & authorization (FRONTDESK/ADMIN only)
- Status validation (READY_FOR_THEATER_BOOKING)
- Zod schema validation
- Error handling
- Two-phase booking (lock → confirm)

### 2. API Client & Hooks

**Updated:**
- ✅ `lib/api/frontdesk.ts` - Added booking methods
- ✅ `hooks/frontdesk/useTheaterScheduling.ts` - Added mutations and queries

**Hooks:**
- `useTheaterSchedulingQueue()` - Fetch ready cases
- `useTheaters()` - Fetch theaters for date
- `useBookTheater()` - Lock slot mutation
- `useConfirmBooking()` - Confirm booking mutation

### 3. UI Components

**Created:**
- ✅ `app/frontdesk/theater-scheduling/page.tsx` - Queue listing page
- ✅ `app/frontdesk/theater-scheduling/[caseId]/book/page.tsx` - Booking page with calendar

**Features:**
- Calendar date selection
- Theater selection
- Time slot grid (30-min intervals, 8 AM - 6 PM)
- Conflict detection
- Two-phase booking UI
- Case information display
- Loading and error states

### 4. Dashboard Integration

**Updated:**
- ✅ `app/frontdesk/dashboard/page.tsx` - Added theater scheduling tile

---

## 🚧 Pending Implementation

### 1. Notifications (Critical)

**When Pre-Op Checklist Finalized:**
- [ ] Notify frontdesk when case becomes READY_FOR_THEATER_BOOKING
- [ ] Create in-app notification record
- [ ] Update notification service integration

**When Theater Booked:**
- [ ] Notify surgeon
- [ ] Notify nurse
- [ ] Create notification records

**Files to Update:**
- `app/api/nurse/surgical-cases/[caseId]/forms/preop-ward/finalize/route.ts`
- `app/api/frontdesk/theater-scheduling/[caseId]/confirm/route.ts`

### 2. Enhanced Filtering (Critical)

**Add to Queue Page:**
- [ ] Filter by surgeon
- [ ] Filter by urgency
- [ ] Filter by date range
- [ ] Search by patient name

**File to Update:**
- `app/frontdesk/theater-scheduling/page.tsx`

### 3. Unit Tests (Critical)

**Files to Create:**
- [ ] `tests/unit/application/services/TheaterService.test.ts`
  - Test `lockSlot()` with READY_FOR_THEATER_BOOKING validation
  - Test `confirmBooking()` status transition
  - Test `bookSlot()` validation
  - Test conflict detection
  - Test lock expiration

- [ ] `tests/unit/application/services/SurgicalCaseStatusTransitionService.test.ts`
  - Test `transitionToReadyForTheater()` method
  - Test status validation

- [ ] `tests/unit/api/frontdesk/theater-scheduling.test.ts`
  - Test GET queue endpoint
  - Test POST book endpoint
  - Test POST confirm endpoint
  - Test authorization
  - Test validation

### 4. Integration Tests (Critical)

**Files to Create:**
- [ ] `tests/integration/frontdesk-theater-booking.test.ts`
  - Test complete booking workflow
  - Test two-phase booking (lock → confirm)
  - Test status transitions
  - Test conflict prevention
  - Test notification creation

### 5. E2E Tests (Critical)

**Files to Create:**
- [ ] `tests/e2e/frontdesk/theater-scheduling.spec.ts`
  - Test frontdesk dashboard tile
  - Test queue page display
  - Test booking page calendar
  - Test slot selection
  - Test booking confirmation
  - Test status updates

---

## 📋 Implementation Checklist

### Core Functionality
- [x] API endpoints for booking
- [x] API client methods
- [x] React Query hooks
- [x] Queue listing page
- [x] Booking page with calendar
- [x] Dashboard integration

### Critical Features
- [ ] Notifications
- [ ] Enhanced filtering
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

### Nice-to-Have
- [ ] Surgeon availability overlay
- [ ] Booking history
- [ ] Cancellation workflow
- [ ] Email notifications
- [ ] SMS notifications

---

## 🎯 Next Steps (Priority Order)

1. **Add Notifications** (P0)
   - Update pre-op finalization to notify frontdesk
   - Update booking confirmation to notify surgeon/nurse

2. **Add Enhanced Filtering** (P0)
   - Add filters to queue page
   - Add search functionality

3. **Write Unit Tests** (P0)
   - TheaterService tests
   - StatusTransitionService tests
   - API endpoint tests

4. **Write Integration Tests** (P0)
   - Complete booking workflow
   - Status transition validation

5. **Write E2E Tests** (P0)
   - Frontend user flows
   - End-to-end booking process

---

## 📝 Notes

- All API endpoints follow existing patterns
- All hooks use React Query for caching
- UI follows existing design system
- Calendar uses shadcn/ui Calendar component
- Time slots are 30-minute intervals
- Two-phase booking prevents race conditions
- Status validation ensures workflow integrity

---

**Document Status:** Implementation In Progress  
**Last Updated:** 2025-01-XX
