# Doctor Drag-and-Drop Scheduling UI Design

## Overview
Enhance the doctor scheduling page to treat appointment requests as draggable events/tasks, allowing doctors to easily schedule appointments by dragging them onto their calendar.

## Current State
- Frontdesk books appointments with proposed time
- Appointments are created with `PENDING_DOCTOR_CONFIRMATION` status
- Doctor receives notification
- Doctor must manually confirm/cancel/reschedule via form

## Proposed Enhancement

### 1. Appointment Request Queue
**Location:** Doctor Dashboard → "Appointment Requests" panel

**Display:**
- List of appointments with `PENDING_DOCTOR_CONFIRMATION` status
- Each item shows:
  - Patient name + avatar
  - Proposed date/time (or "No time proposed")
  - Appointment type
  - Reason (if provided)
  - Source (Frontdesk/Patient/Admin)
  - Alternative slots (if proposed time unavailable)
  - Age indicator (how long pending)

**Visual Design:**
- Card-based layout
- Color-coded by urgency (new = blue, older = amber)
- Drag handle icon on left
- Quick actions: Confirm, Reject, View Details

### 2. Calendar View with Drag-and-Drop
**Location:** Doctor Dashboard → "My Schedule" tab

**Features:**
- **Calendar Grid:**
  - Week/Month view toggle
  - Shows existing appointments (confirmed)
  - Shows availability slots (from doctor's schedule)
  - Shows blocks/overrides (grayed out)

- **Drag-and-Drop:**
  - Drag appointment request from queue → drop on calendar slot
  - Visual feedback:
    - Valid drop zones highlighted (green)
    - Invalid drop zones (red) - conflicts, blocks, outside availability
    - Preview of appointment details while dragging

- **Drop Behavior:**
  - If dropped on valid slot:
    - Auto-allocate that slot
    - Update appointment status to `SCHEDULED`
    - Send confirmation notification to patient
    - Remove from request queue
  
  - If dropped on invalid slot:
    - Show error message
    - Suggest nearest available slots
    - Allow doctor to choose alternative

- **Alternative Slot Suggestions:**
  - If proposed time unavailable, show "Suggested Slots" panel
  - Doctor can drag from suggestions or click to auto-schedule

### 3. Quick Actions
**Inline Actions (on calendar):**
- Click appointment → Quick actions menu:
  - Reschedule (opens time picker)
  - Cancel
  - View patient details
  - Add notes

**Bulk Actions:**
- Select multiple requests → Bulk confirm/reject
- Filter by date range, patient, type

### 4. Technical Implementation

#### Components Needed:
1. `AppointmentRequestQueue.tsx`
   - Fetches pending appointments
   - Draggable cards
   - Uses `react-beautiful-dnd` or `@dnd-kit/core`

2. `DoctorScheduleCalendar.tsx`
   - Calendar grid (week/month view)
   - Drop zones for appointments
   - Visual indicators for availability

3. `AppointmentCard.tsx`
   - Draggable appointment card
   - Shows patient info, time, reason

4. `SlotDropZone.tsx`
   - Individual calendar slot
   - Handles drop events
   - Validates availability

#### API Endpoints:
- `GET /api/doctor/appointments/pending` - Get pending requests
- `POST /api/doctor/appointments/[id]/confirm` - Confirm appointment
- `POST /api/doctor/appointments/[id]/reschedule` - Reschedule to new time
- `POST /api/doctor/appointments/[id]/reject` - Reject appointment

#### State Management:
- React Query for fetching pending appointments
- Local state for drag-and-drop
- Optimistic updates for better UX

### 5. Constraints to Maintain

#### Database Constraints:
- ✅ `@@unique([doctor_id, scheduled_at])` - Prevents double booking
- ✅ All existing indexes maintained
- ✅ Foreign key constraints preserved

#### Business Rules:
- ✅ Appointment date cannot be in the past
- ✅ No double booking (enforced by unique constraint)
- ✅ Patient conflicts checked (same patient, same day)
- ✅ Availability validation (working hours, blocks, overrides)
- ✅ Status transitions: `PENDING_DOCTOR_CONFIRMATION` → `SCHEDULED` or `CANCELLED`

### 6. User Flow

**Scenario 1: Proposed Time Available**
1. Frontdesk books appointment → `PENDING_DOCTOR_CONFIRMATION`
2. Doctor sees request in queue
3. Doctor drags request to proposed time slot
4. System validates → Auto-confirms → `SCHEDULED`
5. Patient notified

**Scenario 2: Proposed Time Unavailable**
1. Frontdesk books appointment → `PENDING_DOCTOR_CONFIRMATION`
2. System calculates alternative slots → Included in response
3. Doctor sees request with "Alternative Slots" panel
4. Doctor drags to alternative slot OR clicks "Use Alternative"
5. System validates → Auto-confirms → `SCHEDULED`
6. Patient notified

**Scenario 3: Doctor Customizes Time**
1. Doctor sees request
2. Doctor drags to different slot (not proposed, not alternative)
3. System validates new time
4. If valid → Confirm → `SCHEDULED`
5. If invalid → Show error + suggest nearest slots

### 7. Visual Design Mockup

```
┌─────────────────────────────────────────────────────────┐
│  Doctor Dashboard - My Schedule                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │ Appointment      │  │  Calendar View           │   │
│  │ Requests         │  │  [Week View] [Month]     │   │
│  │                  │  │                          │   │
│  │ ┌──────────────┐ │  │  Mon  Tue  Wed  Thu  Fri│   │
│  │ │ 👤 John Doe  │ │  │  9:00 [──] [──] [──] [──]│   │
│  │ │ 📅 Feb 25    │ │  │  9:30 [──] [──] [──] [──]│   │
│  │ │ ⏰ 10:00 AM   │ │  │  10:00[──] [──] [──] [──]│   │
│  │ │ 📝 Follow-up │ │  │  10:30[──] [──] [──] [──]│   │
│  │ │ [Drag]       │ │  │  11:00[──] [──] [──] [──]│   │
│  │ └──────────────┘ │  │                          │   │
│  │                  │  │  Drop zones highlighted  │   │
│  │ ┌──────────────┐ │  │  when dragging           │   │
│  │ │ 👤 Jane Doe  │ │  │                          │   │
│  │ │ 📅 Feb 26    │ │  │                          │   │
│  │ │ ⏰ No time   │ │  │                          │   │
│  │ │ 📝 Checkup   │ │  │                          │   │
│  │ │ [Drag]       │ │  │                          │   │
│  │ └──────────────┘ │  │                          │   │
│  └──────────────────┘  └──────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 8. Implementation Phases

**Phase 1: Foundation**
- [ ] Create `AppointmentRequestQueue` component
- [ ] Fetch pending appointments API endpoint
- [ ] Display requests in list format

**Phase 2: Drag-and-Drop**
- [ ] Install drag-and-drop library (`@dnd-kit/core`)
- [ ] Make appointment cards draggable
- [ ] Create calendar drop zones
- [ ] Implement drop validation

**Phase 3: Auto-Scheduling**
- [ ] API endpoint for confirming via drag-drop
- [ ] Optimistic updates
- [ ] Error handling for invalid drops

**Phase 4: Enhancements**
- [ ] Alternative slots panel
- [ ] Bulk actions
- [ ] Calendar view improvements
- [ ] Mobile responsive design

### 9. Benefits

1. **Faster Scheduling:** Drag-and-drop is faster than form-based confirmation
2. **Visual Context:** Doctor sees their schedule while scheduling
3. **Better UX:** Intuitive interaction model
4. **Reduced Errors:** Visual validation prevents invalid scheduling
5. **Flexibility:** Doctor can easily customize times

### 10. Notes

- Maintain all existing appointment constraints
- Ensure backward compatibility with form-based confirmation
- Mobile: Fallback to tap-to-select (no drag on mobile)
- Accessibility: Keyboard navigation support
- Performance: Virtualize long lists of requests
