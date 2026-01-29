# Enterprise Scheduling System Design

## Overview

This document describes the evolution from simple weekly availability to an enterprise-grade scheduling system capable of supporting complex healthcare operations.

## Architecture Principles

1. **Layered Priority Resolution**: Overrides > Blocks > Weekly Template
2. **Multiple Sessions Per Day**: Doctors can define multiple time blocks per day
3. **Explicit Blocking**: First-class support for unavailable periods
4. **Domain-Driven**: All availability logic in domain services
5. **Backward Compatible**: Existing weekly schedules continue to work

## Data Model

### Current Models (Preserved)
- `WorkingDay`: Base weekly schedule (one entry per day)
- `AvailabilityOverride`: Date-specific custom hours or blocking
- `AvailabilityBreak`: Recurring breaks within a day
- `SlotConfiguration`: Appointment slot settings

### New Models

#### 1. ScheduleSession
**Purpose**: Multiple time sessions per working day

```prisma
model ScheduleSession {
  id           String     @id @default(uuid())
  working_day_id Int      // Links to WorkingDay
  start_time   String     // HH:mm
  end_time     String     // HH:mm
  session_type String?    // "Clinic", "Ward Rounds", "Teleconsult", "Surgery", etc.
  max_patients Int?       // Optional: max appointments per session
  notes        String?    // Optional notes
  
  working_day WorkingDay @relation(fields: [working_day_id], references: [id], onDelete: Cascade)
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  @@index([working_day_id])
  @@index([start_time, end_time])
}
```

**Example**:
- Monday: 08:00-11:00 (Clinic), 14:00-17:00 (Consultations)
- Tuesday: 10:00-13:00 (Ward rounds), 18:00-20:00 (Teleconsult)

#### 2. ScheduleBlock
**Purpose**: Explicit unavailable periods (leave, surgery, admin, emergency)

```prisma
model ScheduleBlock {
  id          String   @id @default(uuid())
  doctor_id   String
  start_date  DateTime // Start of block period
  end_date    DateTime // End of block period
  start_time  String?  // HH:mm - if null, entire day blocked
  end_time    String?  // HH:mm - if null, entire day blocked
  block_type  String   // "LEAVE", "SURGERY", "ADMIN", "EMERGENCY", "CONFERENCE", etc.
  reason      String?  // Human-readable reason
  created_by  String   // User ID who created the block
  
  doctor Doctor @relation(fields: [doctor_id], references: [id], onDelete: Cascade)
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  @@index([doctor_id])
  @@index([start_date, end_date])
  @@index([doctor_id, start_date, end_date])
}
```

**Examples**:
- Full day: `start_date=2026-02-14, end_date=2026-02-14, start_time=null, end_time=null` (Conference)
- Partial: `start_date=2026-02-15, end_date=2026-02-15, start_time=09:00, end_time=13:00` (Surgery)
- Range: `start_date=2026-03-01, end_date=2026-03-07` (Leave)

### Updated Models

#### WorkingDay (Enhanced)
- Remains the base structure
- Now supports multiple sessions via `ScheduleSession` relation
- Backward compatible: if no sessions exist, use `start_time`/`end_time` as single session

## Resolution Logic

### Priority Order (Highest to Lowest)

1. **ScheduleBlock** (Explicit unavailable)
   - If date falls within a block period → No availability
   - If time falls within a block time range → No availability for that time

2. **AvailabilityOverride** (Custom hours for specific date)
   - If `isBlocked=true` → No availability
   - If `isBlocked=false` with custom hours → Use override hours instead of weekly

3. **ScheduleSession** (Weekly recurring sessions)
   - Multiple sessions per day
   - Apply breaks within each session

4. **AvailabilityBreak** (Recurring breaks)
   - Applied within sessions
   - Excludes time from available slots

### Resolution Algorithm

```
For a given date:
1. Check ScheduleBlock → If blocked, return empty
2. Check AvailabilityOverride → If custom hours, use them; if blocked, return empty
3. Get day of week → Find WorkingDay
4. Get ScheduleSessions for that day → If none, fallback to start_time/end_time
5. For each session:
   - Generate slots within session time
   - Exclude breaks
   - Exclude existing appointments
6. Return combined available slots
```

## Domain Services

### AvailabilityService (New)

```typescript
class AvailabilityService {
  /**
   * Get available slots for a specific date
   * Resolves all layers: blocks, overrides, sessions, breaks, appointments
   */
  static getAvailableSlots(
    doctorId: string,
    date: Date,
    existingAppointments: Appointment[],
    slotConfig: SlotConfiguration
  ): AvailableSlot[]
  
  /**
   * Get availability calendar for a date range
   * Returns which dates have availability
   */
  static getAvailabilityCalendar(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): AvailabilityCalendarDay[]
  
  /**
   * Check if a specific time slot is available
   */
  static isSlotAvailable(
    doctorId: string,
    date: Date,
    time: string,
    duration: number
  ): { isAvailable: boolean; reason?: string }
}
```

## API Routes

### Weekly Schedule
- `POST /api/doctors/me/schedule/weekly` - Set weekly schedule with sessions
- `GET /api/doctors/me/schedule/weekly` - Get weekly schedule

### Overrides
- `POST /api/doctors/me/schedule/override` - Create date override (custom hours)
- `DELETE /api/doctors/me/schedule/override/:id` - Remove override

### Blocks
- `POST /api/doctors/me/schedule/block` - Create block period
- `DELETE /api/doctors/me/schedule/block/:id` - Remove block

### Calendar
- `GET /api/doctors/me/schedule/calendar?startDate=...&endDate=...` - Get availability calendar

## Backward Compatibility

### Migration Strategy

1. **Existing WorkingDay data**: Preserved as-is
2. **No sessions**: System treats `start_time`/`end_time` as single session
3. **Existing overrides**: Continue to work (now clearly "custom hours" not "blocks")
4. **Existing breaks**: Continue to work within sessions

### Compatibility Layer

```typescript
// If no ScheduleSessions exist for a WorkingDay, create virtual session
function getSessionsForDay(workingDay: WorkingDay, sessions: ScheduleSession[]) {
  if (sessions.length === 0) {
    // Backward compatibility: use start_time/end_time as single session
    return [{
      startTime: workingDay.startTime,
      endTime: workingDay.endTime,
      sessionType: null,
    }];
  }
  return sessions;
}
```

## Example Flows

### Flow 1: Weekly Only
```
Monday: 09:00-17:00 (single session, backward compatible)
→ Available: 09:00-17:00 (minus breaks, minus appointments)
```

### Flow 2: Weekly + Multiple Sessions
```
Monday:
  - Session 1: 08:00-11:00 (Clinic)
  - Session 2: 14:00-17:00 (Consultations)
→ Available: 08:00-11:00, 14:00-17:00 (minus breaks, minus appointments)
```

### Flow 3: Weekly + Override
```
Weekly: Monday 09:00-17:00
Override: 2026-02-14, custom hours 12:00-16:00
→ 2026-02-14 available: 12:00-16:00 (override takes precedence)
→ Other Mondays: 09:00-17:00 (weekly template)
```

### Flow 4: Weekly + Block
```
Weekly: Monday 09:00-17:00
Block: 2026-02-14 (full day, LEAVE)
→ 2026-02-14 available: [] (block takes precedence)
→ Other Mondays: 09:00-17:00 (weekly template)
```

### Flow 5: Override Replacing Weekly
```
Weekly: Monday 09:00-17:00
Override: 2026-02-14, isBlocked=false, 12:00-16:00
→ 2026-02-14 available: 12:00-16:00 (override replaces weekly)
```

### Flow 6: Full Day Unavailable
```
Weekly: Monday 09:00-17:00
Block: 2026-02-14, full day, block_type=CONFERENCE
→ 2026-02-14 available: [] (block makes entire day unavailable)
```

## Future Extensibility

This design supports:
- **Department-wide scheduling**: Add `department_id` to blocks/overrides
- **Multiple locations**: Add `location_id` to sessions
- **Shared theatre resources**: Add `resource_id` to blocks
- **On-call rotations**: Add `rotation_id` to blocks
- **Max patients per session**: Already in `ScheduleSession.max_patients`
- **Session types**: Already in `ScheduleSession.session_type`

## Implementation Phases

### Phase 1: Schema & Domain (This PR)
- Add `ScheduleSession` model
- Add `ScheduleBlock` model
- Update domain interfaces
- Create `AvailabilityService`

### Phase 2: Repository & Use Cases
- Implement repository methods
- Create use cases for managing schedules
- Update existing use cases to use new service

### Phase 3: API Routes
- Add new API endpoints
- Update existing endpoints

### Phase 4: UI Components
- Calendar view for schedule management
- Session editor
- Block manager
