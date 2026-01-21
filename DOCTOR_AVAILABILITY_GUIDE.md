# Doctor Availability Scheduling Guide

## Overview

The system includes a robust scheduling feature that allows doctors to manage their availability. This document explains the database structure, API endpoints, and how doctors can set their schedules.

## Database Structure

### Core Models

#### 1. `WorkingDay` Model
Stores recurring weekly availability for doctors:
- `doctor_id`: Links to Doctor
- `day`: Day of week (Monday, Tuesday, etc.)
- `start_time`: Start time (HH:mm format, e.g., "09:00")
- `end_time`: End time (HH:mm format, e.g., "17:00")
- `is_available`: Boolean flag

#### 2. `AvailabilityOverride` Model
Handles one-off exceptions:
- `doctor_id`: Links to Doctor
- `start_date`: Start of override period
- `end_date`: End of override period
- `is_blocked`: true = unavailable, false = available (overrides blocked days)
- `reason`: Optional reason for override

#### 3. `AvailabilityBreak` Model
Defines breaks within working days:
- `doctor_id`: Links to Doctor
- `working_day_id`: Optional - specific working day
- `day_of_week`: Optional - applies to all instances of this day (e.g., every Monday)
- `start_time`: Break start (HH:mm)
- `end_time`: Break end (HH:mm)
- `reason`: Optional reason

#### 4. `SlotConfiguration` Model
Configures how time slots are generated:
- `doctor_id`: Links to Doctor (unique)
- `default_duration`: Default appointment duration in minutes (default: 30)
- `buffer_time`: Minutes between appointments (default: 0)
- `slot_interval`: Interval for generating slots (default: 15 minutes)

### Relationships

```
Doctor (1) ──< (Many) WorkingDay
Doctor (1) ──< (Many) AvailabilityOverride
Doctor (1) ──< (Many) AvailabilityBreak
Doctor (1) ──< (1) SlotConfiguration
```

## API Endpoints

### 1. Get My Availability
**Endpoint**: `GET /api/doctors/me/availability`

**Authentication**: Required (DOCTOR role)

**Response**:
```json
{
  "success": true,
  "data": {
    "doctorId": "uuid",
    "workingDays": [
      {
        "id": 1,
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "17:00",
        "isAvailable": true
      }
    ],
    "overrides": [],
    "breaks": [],
    "slotConfiguration": {
      "defaultDuration": 30,
      "bufferTime": 0,
      "slotInterval": 15
    }
  }
}
```

### 2. Set My Availability
**Endpoint**: `PUT /api/doctors/me/availability`

**Authentication**: Required (DOCTOR role)

**Request Body**:
```json
{
  "workingDays": [
    {
      "day": "Monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isAvailable": true,
      "breaks": [
        {
          "startTime": "13:00",
          "endTime": "14:00",
          "reason": "Lunch break"
        }
      ]
    },
    {
      "day": "Tuesday",
      "startTime": "09:00",
      "endTime": "17:00",
      "isAvailable": true
    }
  ],
  "slotConfiguration": {
    "defaultDuration": 30,
    "bufferTime": 15,
    "slotInterval": 15
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "doctorId": "uuid",
    "workingDays": [...],
    "overrides": [],
    "breaks": [...],
    "slotConfiguration": {...}
  },
  "message": "Doctor availability updated successfully"
}
```

## Use Cases

### 1. `GetMyAvailabilityUseCase`
- Retrieves doctor's complete availability configuration
- Includes working days, overrides, breaks, and slot configuration
- Used by: Doctor dashboard, availability management UI

### 2. `SetDoctorAvailabilityUseCase`
- Updates doctor's availability
- Validates input (time formats, day names, etc.)
- Creates/updates/deletes working days as needed
- Updates slot configuration
- Logs audit events
- Used by: Doctor availability settings page

### 3. `GetAvailableSlotsForDateUseCase`
- Generates available time slots for a specific date
- Considers:
  - Working days
  - Breaks
  - Overrides (blocked/available)
  - Existing appointments
  - Slot configuration (duration, interval, buffer)
- Used by: Front desk scheduling, patient booking

### 4. `ValidateAppointmentAvailabilityUseCase`
- Validates if a specific appointment slot is available
- Checks all availability rules before booking
- Used by: Appointment scheduling

## How Doctors Set Their Schedule

### Current Status

**Backend**: ✅ Complete
- API endpoints implemented
- Use cases implemented
- Database models in place
- Validation and business logic complete

**Frontend**: ❌ Missing
- No UI page for doctors to set availability
- No integration in doctor dashboard
- No availability management component

### Implementation Needed

#### 1. Create Doctor Availability Page
**Location**: `app/doctor/availability/page.tsx`

**Features**:
- Display current availability
- Form to set working days (Monday-Sunday)
- Time pickers for start/end times
- Toggle for each day (available/unavailable)
- Break management (add/remove breaks per day)
- Slot configuration settings
- Save button that calls `PUT /api/doctors/me/availability`

#### 2. Add Navigation Link
**Location**: `components/doctor/DoctorSidebar.tsx`

Add to `navItems`:
```typescript
{
  name: 'Availability',
  href: '/doctor/availability',
  icon: Calendar,
}
```

#### 3. Create Availability Management Component
**Location**: `components/doctor/DoctorAvailabilityForm.tsx`

**Features**:
- Reusable form component
- Day-by-day configuration
- Break management UI
- Slot configuration inputs
- Real-time validation
- Loading states
- Success/error feedback

### Example Implementation Flow

1. **Doctor navigates to `/doctor/availability`**
2. **Page loads current availability** via `GET /api/doctors/me/availability`
3. **Doctor edits schedule**:
   - Toggle days on/off
   - Set start/end times
   - Add breaks (e.g., lunch 13:00-14:00)
   - Configure slot settings
4. **Doctor clicks "Save"**
5. **Form validates and calls** `PUT /api/doctors/me/availability`
6. **Success**: Toast notification, form updates
7. **Error**: Display error message

### Data Flow

```
Doctor UI
  ↓
PUT /api/doctors/me/availability
  ↓
SetDoctorAvailabilityUseCase
  ↓
PrismaAvailabilityRepository
  ↓
Database (WorkingDay, SlotConfiguration, etc.)
  ↓
GetAvailableSlotsForDateUseCase (uses updated data)
  ↓
Front Desk / Patient Booking (sees new availability)
```

## Integration Points

### 1. Appointment Scheduling
When front desk or patients book appointments:
- `GetAvailableSlotsForDateUseCase` queries doctor's availability
- Only shows slots within working hours
- Excludes breaks and blocked overrides
- Respects slot configuration (duration, interval, buffer)

### 2. Front Desk Dashboard
Front desk can view all doctors' availability:
- `GET /api/doctors/availability?date=YYYY-MM-DD`
- Shows available slots across all doctors
- Used for scheduling consultations

### 3. Patient Booking
Patients see real-time availability:
- `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
- Only available slots are shown
- Prevents double-booking

## Best Practices

1. **Set Default Schedule**: Doctors should set their recurring weekly schedule first
2. **Use Overrides Sparingly**: For one-off changes (holidays, conferences)
3. **Configure Breaks**: Add lunch breaks and other regular breaks
4. **Set Slot Configuration**: Match appointment types to slot durations
5. **Regular Updates**: Update availability when schedule changes

## Next Steps

1. ✅ Backend complete
2. ❌ Create `/app/doctor/availability/page.tsx`
3. ❌ Create `components/doctor/DoctorAvailabilityForm.tsx`
4. ❌ Add navigation link in `DoctorSidebar`
5. ❌ Test end-to-end flow
6. ❌ Add to doctor onboarding flow
