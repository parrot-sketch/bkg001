# Architectural Proposal: Client-Side Availability Generation

## Problem Statement
Currently, the appointment booking flow involves redundant server round-trips:
1.  **Dashboard**: User sees "Available Doctors" (Server query).
2.  **Selection**: User clicks "Book".
3.  **Calendar**: Frontend requests `/available-dates` (Server query).
4.  **Slot View**: Frontend requests `/slots` (Server query).

This causes:
*   Redundant fetching of static configuration (Working Days, Overrides).
*   Latency for the user when switching dates.
*   High database load (as seen with the recent connection limits).

## Proposed Solution: "Smart Client" Architecture

Shift the granular slot calculation logic to the **Client (React)**, treating the Backend as a **State Provider** rather than a Calculator.

### 1. Data Structure Refactoring
We need to separate **Configuration** (Static) from **State** (Dynamic).

*   **Static Config** (Change rarely): `WorkingHours`, `Breaks`, `SlotDuration`.
*   **Semi-Static** (Change occasionally): `Overrides`, `Blocks`.
*   **Dynamic State** (Change frequently): `ExistingAppointments`.

### 2. New Workflow

#### Step 1: Pre-Fetch (Dashboard / Selection)
When a doctor is selected, fetch a comprehensive **Availability Profile** in one lightweight request:

```typescript
interface DoctorAvailabilityProfile {
  startHour: string; // "09:00"
  endHour: string;   // "17:00"
  slotDuration: number;
  workingDays: number[]; // [1, 2, 3, 4, 5] (Mon-Fri)
  overrides: OverrideDto[];
  blocks: BlockDto[];
  // NO appointments yet
}
```

#### Step 2: Client-Side Navigation
Pass this profile to the Booking Page via React State / Cache.

#### Step 3: Lightweight State Sync
When the user views a month/week:
*   Fetch **ONLY** `ExistingAppointments` (start, duration) for that range.
*   This is a tiny JSON payload compared to full slot objects.

#### Step 4: Isomorphic Calculation
Refactor `AvailabilityService.ts` to be a **Shared Library** (`@/lib/scheduler`) that runs in both Node.js and Browser.

*   **Frontend**: `scheduler.generateSlots(profile, appointments)` -> Instant UI rendering.
*   **Backend**: `scheduler.validateSlot(profile, appointments, requestedTime)` -> Security check on submit.

### 3. Implementation Steps

1.  **Decouple Service**: Refactor `AvailabilityService` to accept `AppointmentDto` interfaces instead of Backend `Appointment` entities.
2.  **Move to Shared**: Move logic to `lib/shared/availability.ts`.
3.  **API Update**: Create endpoint `/api/doctors/:id/availability-profile` (Low weight).
4.  **Frontend**: Update `BookingCalendar` to compute slots locally using the shared library.

## Benefits
*   **Zero Latency**: Clicking next/prev day is instant.
*   **DB Load Reduction**: >80% reduction in database queries (no N+1 slot calculations).
*   **Scalability**: Computation is distributed to user devices.
