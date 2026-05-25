# Doctor Onboarding Workflow - Design Document

## Overview

This document outlines the complete onboarding workflow for doctors, covering password setup and availability configuration. The workflow ensures that new doctors complete essential setup before accessing the full system.

---

## Database Schema Analysis

### Key Entities

#### User Model
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password_hash String
  role          Role     // DOCTOR
  status        Status   @default(ACTIVE)
  first_name    String?
  last_name     String?
  last_login_at DateTime?
}
```

#### Doctor Model
```prisma
model Doctor {
  id                  String                   @id @default(uuid())
  user_id             String                   @unique
  email               String                   @unique
  first_name          String
  last_name           String
  specialization      String
  license_number      String                   @unique
  phone               String
  department          String?
  availability_status String?                  @default("AVAILABLE")
  type                JOBTYPE                  @default(FULL)
  onboarding_status   DoctorOnboardingStatus   @default(INVITED)
  invited_at          DateTime?
  invited_by          String?
  activated_at        DateTime?
  profile_completed_at DateTime?
  availability_templates AvailabilityTemplate[]
  availability_overrides AvailabilityOverride[]
  schedule_blocks     ScheduleBlock[]
  slot_configuration  SlotConfiguration?
}
```

#### Supporting Models for Availability

```prisma
model AvailabilityTemplate {
  id          String           @id @default(uuid())
  doctor_id   String
  name        String
  is_active   Boolean          @default(false)
  slots       AvailabilitySlot[]
}

model AvailabilitySlot {
  id             String @id @default(uuid())
  template_id    String
  day_of_week    Int    // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time     String // "09:00"
  end_time       String // "17:00"
  slot_type      String? @default("CLINIC")
  max_patients   Int?
}

model SlotConfiguration {
  id              String @id @default(uuid())
  doctor_id       String @unique
  default_duration Int    @default(30) // minutes
  buffer_time     Int    @default(0)  // minutes between slots
  slot_interval   Int    @default(15) // minimum interval
}
```

### Onboarding Status Enum
```prisma
enum DoctorOnboardingStatus {
  INVITED        // Doctor invited, hasn't set password
  PASSWORD_SET   // Password set, needs availability setup
  AVAILABLE_SET  // Availability configured
  COMPLETED      // Onboarding fully complete
}
```

---

## Workflow Design

### Step 1: Password Setup (First Login)

**Trigger:** Doctor clicks invitation link with temporary password

**Flow:**
```
1. Doctor receives invitation email with temporary password
2. Doctor logs in at /login with temporary credentials
3. System detects: onboarding_status = INVITED
4. Redirect to /doctor/onboarding/password
5. Doctor sets new password:
   - Current password validation
   - New password + confirmation
   - Password strength requirements
6. API: PUT /api/doctors/me/onboarding/password
   - Validates current password
   - Hashes and updates password_hash
   - Updates onboarding_status = PASSWORD_SET
7. Redirect to availability setup
```

**API Endpoint:**
```
PUT /api/doctors/me/onboarding/password
{
  "currentPassword": "temp_password",
  "newPassword": "new_secure_password"
}
```

### Step 2: Availability Setup

**Trigger:** After password is set

**Flow:**
```
1. Redirect to /doctor/onboarding/availability
2. Show availability configuration form:
   
   A. Slot Configuration (per-appointment settings):
      - Default duration (15/30/45/60 min)
      - Buffer time between slots
      - Minimum interval
   
   B. Weekly Schedule Template:
      For each day (Mon-Sun):
        - Toggle day ON/OFF
        - If ON: set start_time, end_time
        - Set slot_type (CLINIC, SURGERY, CONSULTATION)
        - Set max_patients per slot
   
   C. Override Dates (optional):
      - Add specific date ranges
      - Mark as blocked or with custom hours
   
3. Save configuration:
   - Creates/updating AvailabilityTemplate
   - Creates SlotConfiguration if not exists
   - Updates onboarding_status = AVAILABLE_SET
   
4. Redirect to dashboard
```

**API Endpoints:**
```
GET /api/doctors/me/onboarding/availability
# Returns current template (if any) and slot config

PUT /api/doctors/me/onboarding/availability
{
  "slotConfig": {
    "default_duration": 30,
    "buffer_time": 5,
    "slot_interval": 15
  },
  "slots": [
    { "day_of_week": 1, "start_time": "09:00", "end_time": "17:00", "slot_type": "CLINIC", "max_patients": 20 },
    { "day_of_week": 2, "start_time": "09:00", "end_time": "17:00", "slot_type": "CLINIC", "max_patients": 20 },
    // ... etc
  ]
}

PATCH /api/doctors/me/onboarding/complete
# Finalizes onboarding, sets status = COMPLETED
```

---

## UI Component Design

### 1. Onboarding Layout Wrapper

```
/app/doctor/onboarding/
├── layout.tsx              # Protected layout with progress indicator
├── password/
│   └── page.tsx           # Password change form
├── availability/
│   └── page.tsx           # Availability configuration wizard
└── complete/
    └── page.tsx           # Success/confirmation page
```

### 2. Password Setup Page

**Components:**
- Current Password Input (required)
- New Password Input with strength meter
- Confirm Password Input
- Password requirements checklist:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one number
  - At least one special character
- Submit Button
- Skip option (with warning)

### 3. Availability Setup Wizard

**Step 1: Slot Configuration Card**
```
┌─────────────────────────────────────┐
│ Slot Duration                         │
│ [ 30 ] minutes ▼                      │
│                                       │
│ Buffer Between Slots                  │
│ [ 5 ] minutes                         │
│                                       │
│ Slot Interval                         │
│ [ 15 ] minutes ▼                      │
└─────────────────────────────────────┘
```

**Step 2: Weekly Schedule Grid**
```
┌─────────────────────────────────────┐
│        Weekly Schedule                │
│ ┌─────┬───────────┬───────────┬───────┐│
│ │Day  │ Working?  │ Hours     │ Max   ││
│ ├─────┼───────────┼───────────┼───────┤│
│ │Mon  │ [ON]      │ 09:00-17:00│ [20] ││
│ │Tue  │ [ON]      │ 09:00-17:00│ [20] ││
│ │Wed  │ [ON]      │ 09:00-17:00│ [20] ││
│ │Thu  │ [ON]      │ 09:00-17:00│ [20] ││
│ │Fri  │ [ON]      │ 09:00-17:00│ [20] ││
│ │Sat  │ [OFF]     │ —         │ —    ││
│ │Sun  │ [OFF]     │ —         │ —    ││
│ └─────┴───────────┴───────────┴───────┘│
└─────────────────────────────────────┘
```

**Step 3: Date Overrides (Optional)**
```
┌─────────────────────────────────────┐
│       Date Overrides                  │
│ [+] Add Override                      │
│                                       │
│ From: [2024-12-25]  To: [2024-12-25] │
│ Type: [Blocked] ▼  [Custom Hours]     │
│ (Blocked dates are unavailable)       │
└─────────────────────────────────────┘
```

---

## Routing Logic

### Dashboard Protection Hook

```typescript
// hooks/use-doctor-onboarding-guard.ts
export function useDoctorOnboardingGuard() {
  const { user } = useAuth();
  const { data: doctor } = useDoctorProfile();
  const router = useRouter();

  useEffect(() => {
    if (!user || !doctor) return;

    const status = doctor.onboarding_status;

    // Protect dashboard access during onboarding
    if (status === 'INVITED' || status === 'PASSWORD_SET') {
      router.replace('/doctor/onboarding/password');
    } else if (status === 'AVAILABLE_SET') {
      router.replace('/doctor/onboarding/availability');
    } else if (status === 'COMPLETED') {
      // Allow normal dashboard access
    }
  }, [user, doctor, router]);
}
```

### Middleware Protection

```typescript
// middleware.ts - Add to existing middleware
if (pathname.startsWith('/doctor') && 
    !pathname.startsWith('/doctor/onboarding')) {
  const doctor = await getDoctorProfile(userId);
  if (doctor?.onboarding_status !== 'COMPLETED') {
    return NextResponse.redirect('/doctor/onboarding/password');
  }
}
```

---

## API Endpoints Specification

### 1. Password Update

```
PUT /api/doctors/me/onboarding/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 8 chars)"
}

Response:
{
  "success": true,
  "data": {
    "onboardingStatus": "PASSWORD_SET"
  }
}
```

### 2. Get Availability Configuration

```
GET /api/doctors/me/onboarding/availability
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "slotConfiguration": {
      "default_duration": 30,
      "buffer_time": 5,
      "slot_interval": 15
    },
    "availabilityTemplate": {
      "name": "Standard Week",
      "is_active": true,
      "slots": [
        {
          "day_of_week": 1,
          "start_time": "09:00",
          "end_time": "17:00",
          "slot_type": "CLINIC",
          "max_patients": 20
        }
      ]
    }
  }
}
```

### 3. Save Availability Configuration

```
PUT /api/doctors/me/onboarding/availability
Authorization: Bearer <token>
Content-Type: application/json

{
  "slotConfig": {
    "default_duration": 30,
    "buffer_time": 5,
    "slot_interval": 15
  },
  "slots": [...]
}

Response:
{
  "success": true,
  "data": {
    "onboardingStatus": "AVAILABLE_SET"
  }
}
```

### 4. Complete Onboarding

```
PATCH /api/doctors/me/onboarding/complete
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "onboardingStatus": "COMPLETED"
  }
}
```

---

## Validation Rules

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*, etc.)

### Availability Validation
- At least one day must be enabled for scheduling
- Start time must be before end time
- Slot duration must be multiple of slot_interval
- Buffer time cannot exceed slot duration

---

## Testing Plan

### Unit Tests
- [ ] Password validation (strength, matching)
- [ ] Availability slot time validation
- [ ] Onboarding status transitions

### Integration Tests
- [ ] Password update flow
- [ ] Availability save and retrieve
- [ ] Onboarding guard middleware

### E2E Tests
- [ ] Complete onboarding flow as new doctor
- [ ] Dashboard access blocked during onboarding
- [ ] Skip options behavior

---

## Future Enhancements

1. **Multiple Templates**: Allow doctors to create multiple availability templates (e.g., "Summer Hours", "Surgery Rotation")

2. **Recurring Overrides**: Support weekly/monthly override patterns

3. **Integration Testing**: Add appointment slot previews

4. **Notification Settings**: Include notification preferences in onboarding

5. **Emergency Contact**: Add backup contact information collection

---

## Implementation Checklist

### Backend (API)
- [ ] Create password update endpoint
- [ ] Create availability GET endpoint
- [ ] Create availability PUT endpoint
- [ ] Create onboarding complete endpoint
- [ ] Add onboarding status to doctor queries

### Frontend
- [ ] Create onboarding layout
- [ ] Create password page
- [ ] Create availability wizard
- [ ] Add onboarding guard hook
- [ ] Add progress indicator

### Testing
- [ ] API unit tests
- [ ] Frontend component tests
- [ ] E2E flow test