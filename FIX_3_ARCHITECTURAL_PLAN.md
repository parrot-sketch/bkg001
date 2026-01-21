# Fix 3 – Architectural Plan (No Code Yet)

**Objective:** Separate "Consultation Request" flow from "Booking" flow to align UI behavior with system logic and user mental models.

---

## EXECUTIVE SUMMARY

### What Already Exists (✅ Correct)
- **Backend:** Two separate endpoints and use cases already implemented correctly
  - `POST /api/consultations/submit` → `SubmitConsultationRequestUseCase` (preferences only)
  - `POST /api/appointments` → `ScheduleAppointmentUseCase` (specific date/time with availability)
- **Frontend:** Some components already use correct flow
  - `app/patient/consultations/request/page.tsx` → Uses `SubmitConsultationRequestUseCase` ✅
  - `components/patient/StepByStepBooking.tsx` → Uses `SubmitConsultationRequestUseCase` ✅

### What Needs Fixing (❌ Incorrect)
- **Frontend:** Two components call wrong endpoints
  - `components/forms/book-appointment.tsx` → Calls `createNewAppointment()` → `ScheduleAppointmentUseCase` (should be consultation request)
  - `components/patient/ScheduleAppointmentDialog.tsx` → Calls `patientApi.scheduleAppointment()` → `ScheduleAppointmentUseCase` (should be consultation request)

### What Needs Creating (🆕 New)
- **Frontend:** New component for direct booking with availability
  - `components/patient/BookAppointmentDialog.tsx` → Uses `ScheduleAppointmentUseCase` with availability API

### Key Insight
**Backend is already correct.** The problem is frontend components routing to wrong endpoints. Fix is primarily frontend refactoring.

---

## 1. TWO DISTINCT USER FLOWS (Patient Mental Model)

### Flow A: Consultation Request (Express Interest)
**Patient Intent:** "I'm interested in a procedure, tell me more"

**User Journey:**
1. Patient selects procedure of interest
2. Patient selects preferred surgeon (optional)
3. Patient describes their concern/goals
4. Patient provides preferred date range (e.g., "Next week") and time preference (e.g., "Morning")
5. **NO specific date/time selection**
6. Submit → "We'll review and contact you"
7. Front desk reviews → Schedules specific time → Patient confirms

**Outcome:** Appointment created with `consultation_request_status: SUBMITTED`, `status: PENDING`

**Mental Model:** "I'm asking about a procedure" (like a contact form, not a booking)

---

### Flow B: Direct Booking (Immediate Scheduling)
**Patient Intent:** "I want to book a specific time slot now"

**User Journey:**
1. Patient selects surgeon
2. Patient selects specific date
3. System shows available time slots (from `/api/doctors/:id/slots`)
4. Patient selects available slot
5. Patient provides procedure type and notes
6. Submit → Immediate confirmation

**Outcome:** Appointment created with `status: SCHEDULED`, no `consultation_request_status`

**Mental Model:** "I'm booking an appointment" (like a calendar booking)

---

## 2. COMPONENT ANALYSIS (Reuse vs Replace)

### Components That Currently Mix Both Flows

**A. `components/forms/book-appointment.tsx`**
- **Current:** Asks for specific date/time, calls `createNewAppointment` → `ScheduleAppointmentUseCase`
- **Problem:** Button says "Request Consultation" but asks for specific booking details
- **Decision:** **REPLACE** → Split into two components:
  - `components/forms/RequestConsultationForm.tsx` (no date/time, uses `SubmitConsultationRequestUseCase`)
  - `components/forms/BookAppointmentForm.tsx` (with availability, uses `ScheduleAppointmentUseCase`)

**B. `components/patient/ScheduleAppointmentDialog.tsx`**
- **Current:** Asks for specific date/time, calls `patientApi.scheduleAppointment`
- **Problem:** Dialog title says "Request Consultation" but requires specific booking
- **Decision:** **REPLACE** → Split into two dialogs:
  - `components/patient/RequestConsultationDialog.tsx` (preferences only)
  - `components/patient/BookAppointmentDialog.tsx` (availability-based booking)

**C. `components/patient/StepByStepBooking.tsx`**
- **Current:** 7-step process, asks for `preferredDate` and `timePreference` (correct!)
- **Problem:** None - this already implements Consultation Request flow correctly
- **Decision:** **KEEP** (already correct, just verify it uses `SubmitConsultationRequestUseCase`)

**D. `app/patient/consultations/request/page.tsx`**
- **Current:** Uses `SubmitConsultationRequestUseCase` correctly
- **Problem:** None - this is the correct Consultation Request flow
- **Decision:** **KEEP** (no changes needed)

---

## 3. ROUTES (Existing vs New)

### Existing Routes (Keep As-Is)
- `/patient/consultations/request` → Consultation Request flow (no date/time selection)
- `/patient/appointments` → View appointments (both requests and bookings)

### New Routes (If Needed)
- **Option A:** Keep existing routes, change component behavior based on context
- **Option B:** Add `/patient/appointments/book` for direct booking
- **Decision:** **Option A** (minimal route changes)
  - `/patient/consultations/request` → Consultation Request (already exists, correct)
  - Reuse existing appointment creation endpoints, route to correct use case based on form data

### Route Mapping
```
Consultation Request:
  /patient/consultations/request → POST /api/consultations/submit → SubmitConsultationRequestUseCase ✅
  /portal/book-consultation → POST /api/consultations/submit → SubmitConsultationRequestUseCase ✅
  components/forms/book-appointment.tsx → POST /api/consultations/submit (needs fix)
  components/patient/ScheduleAppointmentDialog.tsx → POST /api/consultations/submit (needs fix)

Direct Booking:
  components/patient/BookAppointmentDialog.tsx → POST /api/appointments → ScheduleAppointmentUseCase (new component)
  Front desk scheduling → POST /api/appointments → ScheduleAppointmentUseCase ✅
```

---

## 4. CHANGES BY LAYER

### Frontend Only

**A. Component Refactoring:**

1. **`components/forms/book-appointment.tsx`** (Currently calls `createNewAppointment` → `ScheduleAppointmentUseCase`)
   - **Current:** Asks for specific `appointment_date` and `time` (lines 197-214)
   - **Remove:** Date/time input fields (lines 197-214)
   - **Add:** `preferredDate` (date range picker) and `timePreference` dropdown ("Morning", "Afternoon", "Evening")
   - **Add:** `concernDescription` textarea (required)
   - **Change:** Call `patientApi.submitConsultationRequest()` instead of `createNewAppointment()`
   - **Update:** Button text already says "Request Consultation" (✅ correct)
   - **Update:** Form title already says "Request Consultation" (✅ correct)
   - **Keep:** Doctor selection, procedure type, notes

2. **`components/patient/ScheduleAppointmentDialog.tsx`** (Currently calls `patientApi.scheduleAppointment` → `POST /api/appointments`)
   - **Current:** Asks for specific `appointmentDate` and `time` (lines 49-60)
   - **Remove:** Specific date/time inputs
   - **Add:** `preferredDate` (date range) and `timePreference` dropdown
   - **Add:** `concernDescription` textarea (required)
   - **Change:** Call `patientApi.submitConsultationRequest()` instead of `patientApi.scheduleAppointment()`
   - **Update:** Dialog title to "Request Consultation" (currently says "Schedule Appointment")

3. **New Component: `components/patient/BookAppointmentDialog.tsx`** (For direct booking with availability)
   - **Add:** Doctor selection
   - **Add:** Date picker → Fetches `/api/doctors/:id/slots?date=YYYY-MM-DD` when date selected
   - **Add:** Time slot selector (shows available slots from API)
   - **Add:** Real-time slot validation
   - **Add:** Procedure type, notes
   - **Use:** `patientApi.scheduleAppointment()` → `POST /api/appointments` → `ScheduleAppointmentUseCase`

**B. Availability Integration (For Booking Flow Only):**
- When user selects doctor + date in `BookAppointmentDialog`:
  1. Fetch `/api/doctors/:id/slots?date=YYYY-MM-DD`
  2. Display slots as selectable buttons: "10:00 AM - 10:30 AM"
  3. Disable unavailable slots (gray out)
  4. Show "No availability" message if empty slots array
  5. On slot selection → Use `slot.startTime` for appointment `time` field

**C. UI/UX Changes:**
- Consultation Request forms: Remove specific date/time, add "Preferred Date" and "Time Preference" (Morning/Afternoon/Evening)
- Booking forms: Show availability calendar with slot selector
- Clear labels: "Request Consultation" (preferences) vs "Book Appointment" (specific slot)

---

### Backend Only

**A. Current State (✅ Already Correct):**
- `POST /api/consultations/submit` → `SubmitConsultationRequestUseCase` (✅ correct, no changes)
- `POST /api/appointments` → `ScheduleAppointmentUseCase` (✅ correct, no changes)
- Both use cases already implement correct logic

**B. Action File Update:**
- `app/actions/appointment.ts` → `createNewAppointment()`
  - **Current:** Always calls `ScheduleAppointmentUseCase` (line 59)
  - **Decision:** **DEPRECATE** this action for patient use
  - **Reason:** Components should call API endpoints directly (`/api/consultations/submit` or `/api/appointments`)
  - **Alternative:** If keeping, add detection logic:
    - If `time` is specific (e.g., "10:00 AM") → `ScheduleAppointmentUseCase`
    - If `time` is preference (e.g., "Morning") → `SubmitConsultationRequestUseCase`
  - **Recommendation:** Remove usage from `components/forms/book-appointment.tsx`, use API directly

**C. Validation (✅ Already Correct):**
- `ScheduleAppointmentUseCase` already validates availability via `ValidateAppointmentAvailabilityUseCase` (✅ done)
- `SubmitConsultationRequestUseCase` already handles `preferredDate` and `timePreference` (✅ done)
- **No backend changes needed** - use cases and endpoints already correct

---

### Shared Types/Statuses

**A. DTOs (No Changes):**
- `SubmitConsultationRequestDto` - Already supports `preferredDate` and `timePreference` (not specific time)
- `ScheduleAppointmentDto` - Already requires specific `appointmentDate` and `time`

**B. Status Enums (No Changes):**
- `ConsultationRequestStatus` - Already exists (SUBMITTED, APPROVED, SCHEDULED, etc.)
- `AppointmentStatus` - Already exists (PENDING, SCHEDULED, etc.)

**C. Type Guards (New - Helper Functions):**
- `isConsultationRequest(dto)` - Checks if DTO has preferences vs specific time
- `isDirectBooking(dto)` - Checks if DTO has specific date/time

---

## 5. AVAILABILITY INTEGRATION

### How `/api/doctors/:id/slots` Plugs Into Booking Flow

**Current State:**
- Endpoint exists: `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
- Returns: `AvailableSlotResponseDto[]` with `startTime`, `endTime`, `duration`, `isAvailable`

**Integration Points:**

**A. Booking Dialog Component:**
```typescript
// When user selects doctor + date:
1. User selects doctor → Load doctor list
2. User selects date → Fetch `/api/doctors/${doctorId}/slots?date=${selectedDate}`
3. Display available slots as selectable buttons
4. User selects slot → Use slot.startTime for appointment
5. Submit → ScheduleAppointmentUseCase (already validates availability)
```

**B. Real-Time Validation:**
- Fetch slots when date changes
- Show loading state while fetching
- Disable unavailable dates in date picker (optional enhancement)
- Show "No availability" message if empty slots array

**C. Slot Display:**
- Format: "10:00 AM - 10:30 AM" (from `startTime` and `endTime`)
- Visual: Green = available, Gray = unavailable
- Disable: Already booked slots

---

## 6. WHY THIS MATTERS

### Mental Model Alignment
- **Current:** Patient sees "Request Consultation" but form asks for specific booking → Confusion
- **After Fix:** "Request Consultation" = preferences only, "Book Appointment" = specific slot → Clear

### Workflow Correctness
- **Current:** Consultation requests can bypass availability → Double booking risk
- **After Fix:** Only direct bookings use availability → Requests go through review → Safe

### Status Semantics
- **Current:** Appointment with `consultation_request_status: SUBMITTED` but specific date/time → Ambiguous
- **After Fix:** SUBMITTED = preferences only, SCHEDULED = specific booking → Clear semantics

### Navigation Clarity
- **Current:** Same form for both flows → User doesn't know which flow they're in
- **After Fix:** Distinct entry points → User knows if they're requesting vs booking

### Clinical Professionalism
- **Current:** Looks like patients can self-book any time → Unprofessional
- **After Fix:** Requests go through review, bookings respect availability → Professional workflow

---

## 7. IMPLEMENTATION STRATEGY

### Phase 1: Fix Consultation Request Components
1. **`components/forms/book-appointment.tsx`**
   - Remove date/time inputs (lines 197-214)
   - Add `preferredDate` (date picker, optional) and `timePreference` dropdown
   - Add `concernDescription` textarea (required)
   - Change: `createNewAppointment()` → `patientApi.submitConsultationRequest()`
   - Map form data to `SubmitConsultationRequestDto`

2. **`components/patient/ScheduleAppointmentDialog.tsx`**
   - Remove specific `appointmentDate` and `time` inputs
   - Add `preferredDate` and `timePreference` dropdown
   - Add `concernDescription` textarea (required)
   - Change: `patientApi.scheduleAppointment()` → `patientApi.submitConsultationRequest()`
   - Update dialog title to "Request Consultation"

3. **Verify existing correct implementations:**
   - `app/patient/consultations/request/page.tsx` (✅ already correct)
   - `components/patient/StepByStepBooking.tsx` (✅ already correct)

### Phase 2: Create Direct Booking Component
1. **Create `components/patient/BookAppointmentDialog.tsx`**
   - Doctor selection
   - Date picker → On date change, fetch `/api/doctors/:id/slots?date=YYYY-MM-DD`
   - Slot selector (display available slots from API response)
   - Procedure type, notes
   - Submit → `patientApi.scheduleAppointment()` → `POST /api/appointments`

2. **Availability Integration:**
   - Create hook: `hooks/useAvailableSlots.ts` (fetches slots, handles loading/error)
   - Display slots as buttons: "10:00 AM - 10:30 AM"
   - Disable unavailable slots
   - Show loading state while fetching
   - Show "No availability" if empty

### Phase 3: Update Entry Points
1. **Dashboard buttons:**
   - "Request Consultation" → Opens `ScheduleAppointmentDialog` (now consultation request)
   - "Book Appointment" (if needed) → Opens `BookAppointmentDialog` (new component)

2. **Front desk scheduling:**
   - Already uses `ScheduleAppointmentUseCase` (✅ correct)
   - Ensure front desk components use availability API when scheduling

### Phase 4: Validation & Testing
1. **Consultation Request Flow:**
   - ✅ No specific date/time required
   - ✅ Uses `preferredDate` and `timePreference`
   - ✅ Creates appointment with `consultation_request_status: SUBMITTED`

2. **Booking Flow:**
   - ✅ Requires specific date/time from available slots
   - ✅ Validates availability before creating appointment
   - ✅ Creates appointment with `status: SCHEDULED`

3. **End-to-End Testing:**
   - Test consultation request submission → Front desk review → Scheduling
   - Test direct booking with availability → Immediate confirmation
   - Test edge cases (no availability, double booking prevention)

---

## 8. RISK MITIGATION

### Risk: Breaking Existing Consultation Requests
- **Mitigation:** Keep `SubmitConsultationRequestUseCase` unchanged, only route components correctly

### Risk: Availability API Not Ready
- **Mitigation:** API already exists and tested, just needs UI integration

### Risk: User Confusion During Transition
- **Mitigation:** Clear labels, distinct entry points, help text explaining difference

### Risk: Front Desk Workflow Disruption
- **Mitigation:** Front desk can still schedule via `ScheduleAppointmentUseCase` (no changes needed)

---

## 9. SUCCESS CRITERIA

After Fix 3:
- ✅ Consultation Request forms have NO specific date/time selection
- ✅ Booking forms show real-time availability
- ✅ No component mixes both flows
- ✅ All bookings validate against availability
- ✅ Status semantics are clear (SUBMITTED vs SCHEDULED)
- ✅ User mental model matches system behavior

---

**Status:** Architectural plan complete. Ready for implementation approval.
