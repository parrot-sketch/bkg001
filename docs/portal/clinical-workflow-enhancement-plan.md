# Clinical Workflow Enhancement Plan

**System:** Nairobi Sculpt Healthcare Platform  
**Goal:** Transform into a realistic, professional clinical assistant experience  
**Principle:** Few actions, clear states, strong intent, professional tone

---

## Executive Summary

This document outlines a **non-breaking enhancement** to transform the current appointment system into a proper consultation request → review → approval → scheduling workflow that mirrors real clinic operations.

**Key Philosophy:** Frontdesk = Surgeon's Personal Assistant

---

## Current State Analysis

### Existing AppointmentStatus Enum
```typescript
enum AppointmentStatus {
  PENDING = 'PENDING',        // Generic "pending"
  SCHEDULED = 'SCHEDULED',    // Checked in / confirmed
  CANCELLED = 'CANCELLED',    // Final state
  COMPLETED = 'COMPLETED',    // Final state
}
```

### Current Workflow
1. Patient books → Creates appointment with `PENDING` status
2. Frontdesk checks in → Changes to `SCHEDULED`
3. Doctor consults → Stays `SCHEDULED` or upgrades `PENDING` to `SCHEDULED`
4. Doctor completes → Changes to `COMPLETED`

### Gaps Identified
- ❌ No distinction between "request submitted" vs "pending review"
- ❌ No review/approval workflow for Frontdesk
- ❌ No "needs more info" state for clarification
- ❌ No notification system for state changes
- ❌ Frontdesk can't approve/request changes
- ❌ No patient acknowledgment/confirmation step

---

## Proposed Enhanced Workflow States

### Migration-Safe Approach
Instead of modifying the existing `AppointmentStatus` enum (which would break existing data), we introduce a new `ConsultationRequestStatus` field for consultation-specific lifecycle tracking.

### Option A: New Field (Recommended - Non-Breaking)
Add `consultation_request_status` field to `Appointment` model to track consultation lifecycle, while keeping `status` for appointment state.

```prisma
enum ConsultationRequestStatus {
  DRAFT              // Patient still filling form (portal only)
  SUBMITTED          // Patient completed intake, awaiting review
  PENDING_REVIEW     // Frontdesk reviewing
  NEEDS_MORE_INFO    // Assistant requested clarification
  APPROVED           // Assistant approved on behalf of doctor
  SCHEDULED          // Time confirmed
  CONFIRMED          // Patient acknowledged
  // Note: CANCELLED and COMPLETED use AppointmentStatus
}
```

**Benefits:**
- ✅ Non-breaking - existing `status` field continues to work
- ✅ Backward compatible - existing appointments default to `null` or `APPROVED`
- ✅ Clear separation: `status` = appointment state, `consultation_request_status` = consultation lifecycle
- ✅ Can be added incrementally

### Option B: Extend Enum (Breaking - Not Recommended)
Extend `AppointmentStatus` to include all consultation states.

**Drawbacks:**
- ❌ Requires migration of all existing data
- ❌ Breaking change for all existing queries
- ❌ Risk of data inconsistency

---

## Recommended Architecture

### Consultation Request Lifecycle
```
DRAFT (portal only, not stored)
  ↓ Patient submits
SUBMITTED → Notification to Frontdesk
  ↓ Frontdesk reviews
  ├─→ APPROVED (on behalf of doctor)
  ├─→ NEEDS_MORE_INFO (request clarification)
  └─→ CANCELLED (reject, with reason)
  
APPROVED → Frontdesk sets proposed time
  ↓ 
SCHEDULED → Notification to Patient & Doctor
  ↓ Patient acknowledges
CONFIRMED → Notification to Doctor
  ↓
[Appointment continues with AppointmentStatus]
```

### Appointment Status (Existing - Unchanged)
- `PENDING` → Used for unscheduled appointments
- `SCHEDULED` → Appointment time confirmed
- `CANCELLED` → Appointment cancelled
- `COMPLETED` → Consultation completed

---

## Implementation Plan

### Phase 1: Data Model Enhancement (Non-Breaking)

#### 1.1 Add ConsultationRequestStatus Enum
**File:** `prisma/schema.prisma`

```prisma
enum ConsultationRequestStatus {
  SUBMITTED
  PENDING_REVIEW
  NEEDS_MORE_INFO
  APPROVED
  SCHEDULED
  CONFIRMED
}

model Appointment {
  // ... existing fields ...
  
  // New field - nullable for backward compatibility
  consultation_request_status ConsultationRequestStatus?
  
  // Optional: Track who approved/reviewed
  reviewed_by    String?  // User ID (Frontdesk)
  reviewed_at    DateTime?
  
  // Optional: Store reason for needs_more_info
  review_notes   String?
  
  // ... rest of fields ...
  
  @@index([consultation_request_status])
  @@index([reviewed_by])
}
```

#### 1.2 Migration Strategy
```sql
-- Migration: Add new fields with default NULL
ALTER TABLE "Appointment" 
ADD COLUMN "consultation_request_status" "ConsultationRequestStatus",
ADD COLUMN "reviewed_by" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP,
ADD COLUMN "review_notes" TEXT;

-- Set default status for existing appointments
UPDATE "Appointment" 
SET "consultation_request_status" = 'APPROVED' 
WHERE "consultation_request_status" IS NULL 
  AND "status" IN ('PENDING', 'SCHEDULED');
```

#### 1.3 Update Domain Enum
**File:** `domain/enums/ConsultationRequestStatus.ts` (new)

```typescript
export enum ConsultationRequestStatus {
  SUBMITTED = 'SUBMITTED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  NEEDS_MORE_INFO = 'NEEDS_MORE_INFO',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
}

// Helper functions
export function isConsultationRequestModifiable(
  status: ConsultationRequestStatus
): boolean {
  return [
    ConsultationRequestStatus.SUBMITTED,
    ConsultationRequestStatus.PENDING_REVIEW,
    ConsultationRequestStatus.NEEDS_MORE_INFO,
  ].includes(status);
}

export function isConsultationRequestConfirmed(
  status: ConsultationRequestStatus
): boolean {
  return status === ConsultationRequestStatus.CONFIRMED;
}
```

---

### Phase 2: Notification System Architecture

#### 2.1 Notification Model (Leverage Existing)
**File:** `prisma/schema.prisma` (check if exists)

The schema already has `NotificationType` and `NotificationStatus` enums. We'll use them.

#### 2.2 Event-Driven Notification Service
**File:** `domain/services/NotificationService.ts` (new)

```typescript
interface NotificationEvent {
  type: 'consultation_submitted' | 'consultation_approved' | 
        'consultation_needs_info' | 'consultation_scheduled' |
        'consultation_confirmed' | 'consultation_cancelled';
  appointmentId: number;
  recipientRole: Role;
  recipientId?: string;
  metadata?: Record<string, any>;
}

interface INotificationService {
  sendNotification(event: NotificationEvent): Promise<void>;
}
```

#### 2.3 Notification Rules
| Event | Recipient | Channel | Tone |
|-------|-----------|---------|------|
| Consultation Submitted | Frontdesk | In-app + Email | "New consultation request requires review" |
| Approved | Patient | In-app + Email | "Your consultation request has been approved" |
| Needs More Info | Patient | In-app + Email | "We need additional information to proceed" |
| Scheduled | Patient + Doctor | In-app + Email + SMS | "Your consultation is scheduled for [date/time]" |
| Confirmed | Doctor | In-app | "Patient confirmed consultation for [date/time]" |

---

### Phase 3: Role-Based UI Enhancements

#### 3.1 Patient Portal

**Current:** Submits form → Creates PENDING appointment  
**Enhanced:** Submits form → Creates SUBMITTED consultation request

**New Features:**
- Status tracking page (`/patient/consultations/requests`)
- View status: "Under Review", "Approved", "Needs More Info"
- Respond to "Needs More Info" requests
- Confirm scheduled consultations
- Upload documents when requested

**Components:**
- `ConsultationRequestCard` - Shows request status
- `ResponseDialog` - For responding to requests
- `ConfirmationCard` - For confirming scheduled consultations

#### 3.2 Frontdesk Dashboard (Assistant Console)

**Mental Model:** Surgeon's Personal Assistant

**New Section:** "Consultation Requests" (replaces generic "Appointments")

**Key Actions:**
1. **Review Queue** - List of SUBMITTED requests
   - Show patient name, service, reason
   - Quick actions: Approve | Request Info | Reject
2. **Needs Response** - Requests waiting for patient response
3. **Schedule Approvals** - APPROVED requests awaiting time assignment
4. **Today's Schedule** - CONFIRMED consultations for today

**UI Principles:**
- No admin clutter - only assistant-relevant actions
- Clear visual hierarchy (urgent → normal)
- Quick action buttons (minimize clicks)
- Professional tone

**Components:**
- `ConsultationRequestReviewCard` - Shows request with action buttons
- `ApproveDialog` - Set proposed time/date
- `RequestInfoDialog` - Add notes for patient
- `ScheduleDialog` - Finalize schedule

#### 3.3 Doctor Dashboard

**Mental Model:** Protected from noise

**Filters:**
- Only show: CONFIRMED + SCHEDULED appointments
- Hide: DRAFT, SUBMITTED, PENDING_REVIEW, NEEDS_MORE_INFO

**UI:**
- Clear schedule view
- "Upcoming Today" - CONFIRMED consultations
- "This Week" - All confirmed consultations

**Principle:** Doctor never sees unconfirmed requests

---

### Phase 4: Use Cases Implementation

#### 4.1 Submit Consultation Request
**File:** `application/use-cases/SubmitConsultationRequestUseCase.ts` (new)

```typescript
class SubmitConsultationRequestUseCase {
  async execute(dto: SubmitConsultationRequestDto) {
    // Create appointment with consultation_request_status = SUBMITTED
    // Trigger notification to Frontdesk
    // Return appointment ID
  }
}
```

#### 4.2 Review Consultation Request
**File:** `application/use-cases/ReviewConsultationRequestUseCase.ts` (new)

```typescript
class ReviewConsultationRequestUseCase {
  async execute(dto: ReviewConsultationRequestDto) {
    // Update consultation_request_status
    // Set reviewed_by, reviewed_at
    // If APPROVED: Set proposed time
    // If NEEDS_MORE_INFO: Set review_notes
    // Trigger notification to Patient
    // Return updated appointment
  }
}
```

#### 4.3 Confirm Scheduled Consultation
**File:** `application/use-cases/ConfirmConsultationUseCase.ts` (new)

```typescript
class ConfirmConsultationUseCase {
  async execute(dto: ConfirmConsultationDto) {
    // Update consultation_request_status = CONFIRMED
    // Update appointment status = SCHEDULED
    // Trigger notification to Doctor
    // Return confirmed appointment
  }
}
```

---

## Migration & Rollout Strategy

### Step 1: Add Schema Fields (Non-Breaking)
- Add `consultation_request_status` (nullable)
- Add `reviewed_by`, `reviewed_at`, `review_notes` (nullable)
- Existing appointments default to `APPROVED`

### Step 2: Update Backend Logic
- New consultation requests → `SUBMITTED`
- Existing PENDING appointments → Work as before (status = PENDING)
- New review/approval use cases

### Step 3: Update UI Gradually
- Patient portal: Show consultation request status
- Frontdesk: Add "Consultation Requests" section (alongside existing appointments)
- Doctor: Filter by `CONFIRMED` (unchanged experience)

### Step 4: Notification System
- Implement in-app notifications first
- Add email notifications (optional)
- SMS notifications (future)

---

## Success Metrics

### Qualitative
- ✅ Frontdesk feels like managing surgeon's day, not admin system
- ✅ Doctor only sees confirmed, meaningful consultations
- ✅ Patient always knows what's happening
- ✅ Clinic manager: "This feels like our clinic operates"

### Quantitative
- Request-to-confirmation time reduced
- Patient response rate to "Needs More Info" increases
- Doctor time protected (fewer unconfirmed interruptions)

---

## Technical Constraints

### Must Respect
- ✅ Existing Prisma schema (extend, don't break)
- ✅ Existing AppointmentStatus enum (keep for backward compatibility)
- ✅ Existing role-based access control
- ✅ TypeScript strict mode
- ✅ Clean architecture layers

### Must Avoid
- ❌ Breaking existing appointments
- ❌ Changing AppointmentStatus enum
- ❌ Duplicating logic
- ❌ Admin-style UI clutter

---

## Next Steps

1. **Review & Approval** - Get stakeholder buy-in on workflow
2. **Schema Design** - Finalize `ConsultationRequestStatus` enum values
3. **Migration Script** - Write safe migration for existing data
4. **Prototype** - Build Frontdesk review UI
5. **Test** - Ensure backward compatibility

---

## Open Questions

1. Should `DRAFT` status be stored in DB or only in portal state?
   - **Recommendation:** Portal state only (not stored)

2. Should we track "rejection" reason separately from `CANCELLED`?
   - **Recommendation:** Use `CANCELLED` + `review_notes` for reason

3. Email/SMS notification priority?
   - **Recommendation:** In-app first, email second, SMS future

---

**Status:** Ready for Review  
**Last Updated:** Current  
**Next Review:** After stakeholder feedback