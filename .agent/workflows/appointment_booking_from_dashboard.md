---
description: detailed workflow for booking an appointment starting from the frontdesk dashboard
---

# Appointment Booking Workflow: Unified Inline Modal (REDESIGNED)

This document details the **redesigned** logical flow for booking an appointment. The workflow has been consolidated from a multi-page/multi-component system into a single, cohesive **inline modal** experience powered by a global Zustand store.

---

## 1. Unified Global State

**Hook:** `useBookAppointmentStore`
**Location:** `hooks/frontdesk/useBookAppointmentStore.ts`

The booking flow is now triggered via a global store, allowing any component to open the booking tool without manual prop drilling or routing.

```typescript
const { openBookingDialog } = useBookAppointmentStore();

// Example: Trigger from anywhere
openBookingDialog({
  patientId: "optional-id",
  doctorId: "optional-id",
  source: AppointmentSource.FRONTDESK_SCHEDULED,
  bookingChannel: BookingChannel.DASHBOARD
});
```

---

## 2. Integrated Entry Points

| Entry Point | Component | Context Provided |
| :--- | :--- | :--- |
| **Dashboard Quick Action** | `app/frontdesk/dashboard/page.tsx` | None (Starts at Step 1: Doctor) |
| **Available Doctors Panel** | `components/frontdesk/AvailableDoctorsPanel.tsx` | `doctorId` (Enters Step 2: Patient) |
| **Patient Registry** | `app/frontdesk/patients/page.tsx` | `patientId` (Enters Step 1: Doctor) |
| **Patient Profile (Sidebar)** | `components/patient/FrontdeskPatientSidebar.tsx` | `patientId` (Enters Step 1: Doctor) |
| **Patient Profile (Appts)** | `components/patient/PatientAppointmentsPanel.tsx` | `patientId` (Enters Step 1: Doctor) |
| **Appointments Header** | `app/frontdesk/appointments/components/AppointmentsHeader.tsx` | `patientId` (if filtered) |

---

## 3. The Unified Booking Form Flow

**Component:** `components/appointments/AppointmentBookingForm.tsx`

The wizard has been reordered to be **Doctor-First**, aligning with frontdesk mental models and dashboard quick-booking.

### Step 1: Doctor Selection (REPLACED DROPDOWN WITH CARDS)
- **UI:** A modern grid of doctor cards featuring specialization and profile snippets.
- **Logic:** If `initialDoctorId` is provided (e.g., from Available Doctors panel), this step can be locked or pre-selected.

### Step 2: Patient Selection
- **UI:** `PatientCombobox` with real-time search and an elegant "Selected Patient" info card.
- **Logic:** This step is **automatically skipped** if `initialPatientId` is provided (e.g., when booking from a patient's profile), jumping directly to Date/Time.

### Step 3: Date & Time Selection
- **UI:** Interactive calendar integrated with a time-slot grid.
- **Logic:** Fetches real-time availability via `useDoctorAvailableDates` and `useAvailableSlots`.

### Step 4: Review & Confirm
- **UI:** Final summary of the booking details (Doctor, Patient, Time, Type).
- **Action:** Clicks "Confirm Booking" to trigger the `scheduleAppointment` API.

---

## 4. Logical Step-Skipping (Smart Wizard)

The `AppointmentBookingForm` uses intelligent logic to minimize clicks:

1. **If Patient + Doctor pre-selected:** Jumps directly to **Step 3 (Date & Time)**.
2. **If Patient pre-selected:** Starts at **Step 1 (Doctor)** -> Skips **Step 2 (Patient)** -> Goes to **Step 3 (Date & Time)**.
3. **If Doctor pre-selected:** Starts at **Step 2 (Patient)** -> Goes to **Step 3 (Date & Time)**.
4. **Default:** Step 1 (Doctor) -> Step 2 (Patient) -> Step 3 (Date & Time) -> Step 4 (Review).

---

## 5. Technical Requirements

- **Icons:** `Stethoscope` (Doctor), `User` (Patient), `Calendar` (Date & Time), `FileText` (Review).
- **Terminology:** Always use "Doctor" instead of "Provider/Surgeon".
- **Modal Component:** `BookAppointmentDialog` wrapping `AppointmentBookingForm`.
- **Validation:** `canProceed()` ensures each step has its required identifier before advancing.
