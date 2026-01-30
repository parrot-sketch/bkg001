---
description: detailed workflow for booking an appointment starting from the frontdesk dashboard
---

# Appointment Booking Workflow: From Dashboard to Confirmation

This document details the logical flow, data structures, and function calls involved in booking an appointment, starting from the "Available Doctors" card on the Frontdesk Dashboard.

## 1. Entry Point: Frontdesk Dashboard
**User Action:** Front Desk user sees the **Available Doctors** panel and clicks "Book Appointment" on a doctor's card.

*   **Component:** `components/frontdesk/AvailableDoctorsPanel.tsx`
*   **Data Source:** Fetches doctor availability via `frontdeskApi.getDoctorsAvailability`.
*   **Action:** Navigation to booking page.
    ```typescript
    <Link href={`/frontdesk/appointments/new?doctorId=${doctor.doctorId}`}>
        Book Appointment
    </Link>
    ```
*   **Data Passed:** `doctorId` (via URL Query Parameter).

## 2. Booking Page Initialization
**User Action:** The booking page loads with the selected doctor pre-selected.

*   **Page:** `app/frontdesk/appointments/new/page.tsx`
*   **Wrapper:** `NewAppointmentWrapper` reads `searchParams`.
*   **Component:** `components/appointments/AppointmentBookingForm.tsx`
*   **Initialization Logic:**
    1.  `initialDoctorId` prop is received.
    2.  `useEffect` triggers `loadSpecificDoctor(initialDoctorId)`.
    3.  `useEffect` auto-advances step: `if (initialDoctorId) setCurrentStep(2)`.

## 3. Step 1: Patient Selection
**User Action:** User searches and selects a patient.
*   **Component:** `PatientCombobox.tsx`
*   **State:** Updates `formData.patientId` and `selectedPatient`.

## 4. Step 2: Doctor Selection (Skipped if pre-selected)
**User Action:** (If not pre-selected) User selects a doctor.
*   **State:** Updates `formData.doctorId`.

## 5. Step 3: Date & Time Selection (The Core Logic)
**User Action:** User selects a Date, then picks a Time Slot.

### 5.1 Fetching Available Dates
*   **Hook:** `useDoctorAvailableDates`
*   **API:** `GET /api/doctors/{id}/available-dates`
*   **Logic:** Returns dates with at least one open slot.

### 5.2 Fetching Slots (Real-time Availability)
*   **Hook:** `useAvailableSlots`
*   **API:** `GET /api/doctors/{id}/slots?date=YYYY-MM-DD`
*   **Backend Route:** `app/api/doctors/[id]/slots/route.ts`
*   **Use Case:** `GetAvailableSlotsForDateUseCase`
    1.  **Validate Doctor:** Checks existence.
    2.  **Get Configuration:** Fetches `WorkingDay`s, `SlotConfiguration` (default 30 mins).
    3.  **Fetch Existing Appointments:** Queries `Appointment` table for the specific date.
    4.  **Calculate Slots:** `AvailabilityService.getAvailableSlots()` merges working hours, subtracts breaks/existing appointments.
    5.  **Return:** `AvailableSlotResponseDto[]` (startTime, endTime, isAvailable).

## 6. Step 4: Review & Submission
**User Action:** User selects "Type", enters "Notes", and clicks "Confirm Booking".

*   **Function:** `handleSubmit()` in `AppointmentBookingForm`.
*   **API Call:** `POST /api/appointments`

### 6.1 Backend Processing (`app/api/appointments/route.ts`)
1.  **Auth:** Verifies user permissions.
2.  **Resolution:** Resolves `patientId` (if user is Patient role).
3.  **Delegate:** Calls `ScheduleAppointmentUseCase.execute()`.

### 6.2 Core Business Logic (`ScheduleAppointmentUseCase.ts`)
1.  **Validation:** Checks Patient/Doctor existence, future date.
2.  **Availability Check (Phase 3 Enhancement):**
    *   Calls `ValidateAppointmentAvailabilityUseCase`.
    *   **Crucial Alignment:** Uses `slot_duration` (default 30m) to check for conflicts using index-optimized queries on `scheduled_at`.
3.  **Conflict Check (Double Booking):**
    *   `appointmentRepository.hasConflict()` checks strictly for exact time match.
4.  **Transaction Execution:**
    *   **Save Basic:** `appointmentRepository.save()` (writes to `Appointment` table).
    *   **Phase 1 Code Update:** Explicitly updates the new schema fields:
        ```typescript
        await tx.appointment.update({
             where: { id: id },
             data: {
                 scheduled_at: appointmentDateWithTime, // TIMESTAMP for indexing
                 slot_start_time: dto.time,
                 slot_duration: appointmentDuration,
                 duration_minutes: appointmentDuration,
                 // ... other audit fields
             }
        });
        ```
5.  **Notifications:** Sends Email (Patient) and In-App (Doctor).
6.  **Audit:** Records `CREATE` event.

## 7. Data Structure Alignment

| Concept | Frontend (Form) | API DTO | Domain Entity | Database (Prisma) |
| :--- | :--- | :--- | :--- | :--- |
| **Doctor** | `doctorId` (string) | `doctorId` | `doctor_id` | `doctor_id` (FK) |
| **Patient** | `patientId` (string) | `patientId` | `patient_id` | `patient_id` (FK) |
| **Date** | `appointmentDate` (string YYYY-MM-DD) | `appointmentDate` (ISO) | `appointmentDate` (Date) | `appointment_date` (DateTime) |
| **Time** | `selectedSlot` (string HH:mm) | `time` (string HH:mm) | `time` (string) | `time` (String) |
| **Start Time** | *Calculated* | *Calculated* | *Implicit* | `scheduled_at` (DateTime) **[NEW]** |

### Logical Alignment Notes
*   **`scheduled_at` vs `appointment_date` + `time`:** The system currently maintains *both*. `appointment_date` (midnight) + `time` (string) is the legacy source of truth. `scheduled_at` (full timestamp) is the **Phase 1** optimization for efficient indexing and querying.
*   **Ensuring Alignment:** The `ScheduleAppointmentUseCase` guarantees these are kept in sync by writing both within the same transaction.

## 8. Potential Issues & Fixes
*   **Schema Drift:** If `scheduled_at` is missing in DB (as seen in Prod), the transaction will fail. (Fix: Apply Migration `20260130100000_fix_prod_columns`).
*   **Slot Mismatch:** If `AvailabilityService` logic differs from `ValidateAppointmentAvailabilityUseCase`, a user might see a slot as "Available" but fail to book it. Both must use the exact same `SlotConfiguration`.
