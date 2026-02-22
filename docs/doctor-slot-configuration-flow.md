# Doctor Slot Configuration & Generation Flow

## Overview

This document explains how doctors configure their availability and how the system generates bookable time slots from that configuration.

---

## 1. Doctor Schedule Setup (UI Flow)

### Entry Point
- **Page**: `/doctor/schedule` (`app/doctor/schedule/page.tsx`)
- **Component**: `ScheduleTabs` (`components/doctor/schedule/ScheduleTabs.tsx`)

### Setup Banner
When a doctor has no schedule configured, they see a banner in `ScheduleCalendarView`:
```typescript
// components/doctor/schedule/ScheduleCalendarView.tsx:328-358
{hasNoSchedule && (
  <div className="bg-amber-50 ...">
    <p>Weekly schedule not configured</p>
    <p>Set up your availability so patients and staff can book appointments.</p>
    <Button onClick={onSetupScheduleClick}>Set Up Schedule</Button>
  </div>
)}
```

Clicking "Set Up Schedule" switches to the **"Weekly Schedule"** tab.

---

## 2. Weekly Schedule Configuration

### UI Component
- **Component**: `ScheduleSettingsPanel` (`components/doctor/schedule/ScheduleSettingsPanel.tsx`)
- **Features**:
  - Drag-and-drop calendar interface (react-big-calendar)
  - Click to add availability windows
  - Drag to move or resize slots
  - Quick presets (9-5 Mon-Fri, Morning, Afternoon, etc.)
  - Slot types: CLINIC, SURGERY, ADMIN

### Data Structure
Doctors configure **weekly recurring availability templates**:
- Each slot has:
  - `dayOfWeek`: 0 (Sunday) to 6 (Saturday)
  - `startTime`: "09:00" (HH:mm format)
  - `endTime`: "17:00"
  - `type`: "CLINIC" | "SURGERY" | "ADMIN"

### Saving to Database
When doctor clicks "Save Changes":
```typescript
// app/actions/schedule.ts:169-214
export async function updateAvailability(data) {
  // 1. Find or create AvailabilityTemplate
  let template = await tx.availabilityTemplate.findFirst({
    where: { doctor_id: doctorId, name: templateName }
  });
  
  if (!template) {
    template = await tx.availabilityTemplate.create({
      data: { doctor_id: doctorId, name: templateName, is_active: true }
    });
  }
  
  // 2. Clear existing slots (full refresh)
  await tx.availabilitySlot.deleteMany({
    where: { template_id: template.id }
  });
  
  // 3. Create new slots
  await tx.availabilitySlot.createMany({
    data: slots.map(slot => ({
      template_id: template.id,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      slot_type: slot.type || 'CLINIC'
    }))
  });
}
```

**Database Tables**:
- `AvailabilityTemplate`: Stores the template (one per doctor, can have multiple but only one `is_active`)
- `AvailabilitySlot`: Stores individual time windows (day + start/end time + type)

---

## 3. Slot Configuration (Advanced Settings)

### SlotConfiguration Model
```prisma
model SlotConfiguration {
  id               String   @id @default(uuid())
  doctor_id        String   @unique
  default_duration Int      @default(30)  // Appointment duration in minutes
  buffer_time      Int      @default(0)   // Buffer between appointments
  slot_interval    Int      @default(15)  // How often to generate slots
}
```

**Defaults**:
- `default_duration`: 30 minutes
- `buffer_time`: 0 minutes
- `slot_interval`: 15 minutes

**Note**: Currently, there's no UI to configure these settings. They use defaults or can be set via database directly.

---

## 4. Slot Generation (Runtime)

### Use Case
When frontdesk or patient wants to book an appointment:
- **Use Case**: `GetAvailableSlotsForDateUseCase` (`application/use-cases/GetAvailableSlotsForDateUseCase.ts`)
- **Service**: `AvailabilityService.getAvailableSlots()` (`domain/services/AvailabilityService.ts`)

### Generation Process

#### Step 1: Load Doctor's Availability
```typescript
// GetAvailabilitySlotsForDateUseCase.ts:81-85
const availability = await this.availabilityRepository.getDoctorAvailability(dto.doctorId);
// Returns: { workingDays, sessions, slotConfiguration, overrides, blocks, breaks }
```

#### Step 2: Get Slot Configuration
```typescript
// GetAvailableSlotsForDateUseCase.ts:87-99
const slotConfig = availability.slotConfiguration || {
  defaultDuration: 30,
  bufferTime: 0,
  slotInterval: 15,
};
```

#### Step 3: Get Existing Appointments
```typescript
// GetAvailableSlotsForDateUseCase.ts:108-125
const doctorAppointments = await this.appointmentRepository.findByDoctor(
  dto.doctorId,
  { startDate, endDate }
);
// Filter out CANCELLED and COMPLETED appointments
```

#### Step 4: Generate Slots
```typescript
// GetAvailableSlotsForDateUseCase.ts:147-156
const slots = AvailabilityService.getAvailableSlots(
  requestDate,           // The date to generate slots for
  availability.workingDays,  // From AvailabilityTemplate
  availability.sessions,     // From AvailabilitySlot (mapped to sessions)
  overrides,                 // Date-specific overrides
  blocks,                    // Blocked periods
  availability.breaks,       // Recurring breaks
  dateAppointments,          // Existing appointments
  slotConfig                 // Duration, interval, buffer
);
```

---

## 5. AvailabilityService.getAvailableSlots() Logic

### Resolution Priority (Highest to Lowest)
1. **ScheduleBlock** (explicit unavailable) - Blocks entire day or time range
2. **AvailabilityOverride** (custom hours or blocking) - Overrides template for specific dates
3. **ScheduleSession** (weekly recurring sessions) - From `AvailabilitySlot` table
4. **AvailabilityBreak** (recurring breaks) - Lunch breaks, etc.

### Slot Generation Algorithm

```typescript
// AvailabilityService.ts:61-215
static getAvailableSlots(date, workingDays, sessions, overrides, blocks, breaks, existingAppointments, slotConfig) {
  // 1. Check if day is blocked (highest priority)
  if (dateBlock && !dateBlock.startTime) return [];
  
  // 2. Check if override blocks this date
  if (dateOverride?.isBlocked) return [];
  
  // 3. Find working day for this date
  const workingDay = workingDays.find(wd => wd.day === dayOfWeek && wd.isAvailable);
  if (!workingDay) return [];
  
  // 4. Get sessions for this working day (from AvailabilitySlot)
  const daySessions = sessions.filter(s => s.workingDayId === workingDay.id);
  
  // 5. Generate slots for each session
  for (const session of finalSessions) {
    const sessionSlots = this.generateSlotsForTimeRange(
      sessionStart,
      sessionEnd,
      slotConfig,
      breaks,
      dayOfWeek,
      existingAppointments,
      session.sessionType
    );
    allSlots.push(...sessionSlots);
  }
  
  // 6. Filter to only available slots
  return allSlots.filter(slot => slot.isAvailable);
}
```

### generateSlotsForTimeRange() Details

```typescript
// AvailabilityService.ts:220-321
private static generateSlotsForTimeRange(startTime, endTime, slotConfig, breaks, dayOfWeek, existingAppointments, sessionType) {
  const slots: AvailableSlot[] = [];
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    // Create slot with defaultDuration
    const slotEnd = new Date(currentTime);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotConfig.defaultDuration);
    
    // Check conflicts:
    // 1. Breaks
    const conflictsWithBreak = dayBreaks.some(br => /* overlap check */);
    
    // 2. Existing appointments (including buffer)
    const appointmentFootprint = slotConfig.defaultDuration + slotConfig.bufferTime;
    const conflictsWithAppointment = existingAppointments.some(apt => /* overlap check */);
    
    const isAvailable = !conflictsWithBreak && !conflictsWithAppointment;
    
    slots.push({
      startTime: currentTime,
      endTime: slotEnd,
      duration: slotConfig.defaultDuration,
      isAvailable,
      sessionType
    });
    
    // Advance by slotInterval + bufferTime
    const advance = slotConfig.slotInterval + slotConfig.bufferTime;
    currentTime.setMinutes(currentTime.getMinutes() + advance);
  }
  
  return slots;
}
```

### Example Generation

**Doctor Configuration**:
- Monday: 09:00 - 17:00 (CLINIC)
- Slot Configuration: `defaultDuration: 30`, `slotInterval: 15`, `bufferTime: 0`

**Generated Slots for Monday, 2024-01-15**:
```
09:00 - 09:30 (available)
09:15 - 09:45 (available)
09:30 - 10:00 (available)
09:45 - 10:15 (available)
10:00 - 10:30 (available)
... (continues every 15 minutes until 16:30)
16:30 - 17:00 (available)
```

**If 10:00 slot is booked**:
```
09:00 - 09:30 (available)
09:15 - 09:45 (available)
09:30 - 10:00 (available)
09:45 - 10:15 (available)
10:00 - 10:30 (isAvailable: false) ← Booked
10:15 - 10:45 (isAvailable: false) ← Overlaps with booked slot
10:30 - 11:00 (available)
... (continues)
```

---

## 6. Frontend Booking Flow

### Step 3: DateTimePicker
When frontdesk selects a doctor and date:
```typescript
// components/appointments/AppointmentBookingForm.tsx
// Step3DateTimePicker fetches available slots via:
const { data: slots } = useQuery({
  queryKey: ['available-slots', doctorId, selectedDate],
  queryFn: () => frontdeskApi.getAvailableSlots(doctorId, selectedDate)
});
```

### API Route
```typescript
// app/api/appointments/available-slots/route.ts
// Calls: GetAvailableSlotsForDateUseCase.execute()
// Which calls: AvailabilityService.getAvailableSlots()
```

---

## 7. Key Files Summary

| File | Purpose |
|------|---------|
| `app/doctor/schedule/page.tsx` | Schedule management page |
| `components/doctor/schedule/ScheduleTabs.tsx` | Tab switcher (Calendar / Weekly Schedule) |
| `components/doctor/schedule/ScheduleCalendarView.tsx` | Calendar view with setup banner |
| `components/doctor/schedule/ScheduleSettingsPanel.tsx` | Weekly template editor (drag-and-drop) |
| `app/actions/schedule.ts` | Server actions (updateAvailability, getDoctorSchedule) |
| `application/use-cases/GetAvailableSlotsForDateUseCase.ts` | Orchestrates slot generation |
| `domain/services/AvailabilityService.ts` | Core slot generation algorithm |
| `infrastructure/database/repositories/PrismaAvailabilityRepository.ts` | Database queries for availability |

---

## 8. Data Flow Diagram

```
Doctor Setup:
  UI (ScheduleSettingsPanel)
    ↓
  updateAvailability() action
    ↓
  Database: AvailabilityTemplate + AvailabilitySlot
    ↓
  (Template stored as weekly recurring pattern)

Booking Time:
  Frontend requests slots for date
    ↓
  GetAvailableSlotsForDateUseCase
    ↓
  Load: Template, Config, Appointments, Blocks, Overrides
    ↓
  AvailabilityService.getAvailableSlots()
    ↓
  Generate slots from template
    ↓
  Filter by conflicts (appointments, breaks, blocks)
    ↓
  Return available slots to frontend
```

---

## 9. Important Notes

1. **Template-Based**: Doctors configure a **weekly template**, not individual dates. The system applies this template to any future date.

2. **Slot Interval vs Duration**:
   - `slotInterval`: How often to generate slots (e.g., every 15 minutes)
   - `defaultDuration`: How long each appointment lasts (e.g., 30 minutes)
   - If `slotInterval < defaultDuration`, slots will overlap (allowing back-to-back bookings)

3. **Filtering**: Only `CLINIC` type slots are shown in booking UI (surgery slots are excluded).

4. **Active Template**: Only one `AvailabilityTemplate` per doctor can be `is_active: true` at a time.

5. **No UI for SlotConfiguration**: Currently, `defaultDuration`, `bufferTime`, and `slotInterval` use defaults or must be set via database.

---

## 10. Future Enhancements

- [ ] UI to configure `SlotConfiguration` (duration, interval, buffer)
- [ ] Support for multiple templates (e.g., "Summer Schedule", "Winter Schedule")
- [ ] Break time configuration UI
- [ ] Override UI (temporary schedule changes)
- [ ] Block time UI (leave, surgery, etc.)
