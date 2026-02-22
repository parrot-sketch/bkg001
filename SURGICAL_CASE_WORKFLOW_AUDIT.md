# Surgical Case Workflow Audit

**Date:** 2025-01-XX  
**Scope:** Complete patient journey from consultation to surgery  
**Focus:** Workflow gaps, status transitions, and architectural improvements

---

## Executive Summary

The current surgical case workflow has **several critical gaps** and **unclear status transitions**. The "ready" status is ambiguous, theater booking is disconnected from the workflow, and the nurse domain lacks clear organization. This audit identifies these issues and proposes a comprehensive architectural redesign.

**Key Findings:**
- ⚠️ **"Ready" status is ambiguous** — unclear what it means and when it's necessary
- 🔴 **Theater booking is disconnected** — no clear workflow integration
- ⚠️ **Nurse domain is fragmented** — inventory mixed with clinical workflows
- 🔴 **Missing status transitions** — gaps between pre-op → theater → intra-op
- ⚠️ **No scheduling workflow** — unclear who schedules and when

---

## 1. Current Workflow Analysis

### 1.1 Consultation → Surgical Plan Flow

**Current Flow:**
1. **Consultation** (Appointment)
   - Patient books appointment → `PENDING` → `SCHEDULED` → `CHECKED_IN` → `IN_CONSULTATION`
   - Doctor completes consultation → `COMPLETED`
   - If procedure recommended → SurgicalCase created with `DRAFT` status

2. **Surgical Plan Creation** (Doctor)
   - Doctor creates/updates `CasePlan`
   - Fills: procedure plan, anesthesia plan, risk factors, consents, images
   - Updates `CasePlan.readiness_status`:
     - `INCOMPLETE` → `IN_PROGRESS` → `READY`
   - Updates `CasePlan.ready_for_surgery` (boolean)

3. **Doctor Marks Ready** (`/api/doctor/surgical-cases/[id]/mark-ready`)
   - **Current Logic:** Transitions case from `PLANNING` → `READY_FOR_SCHEDULING`
   - **Requirements:**
     - CasePlan.readiness_status = `READY`
     - CasePlan.ready_for_surgery = `true`
   - **Issue:** This endpoint exists but may not be used in UI

**Status:** `SurgicalCase.status` = `DRAFT` → `PLANNING` → `READY_FOR_SCHEDULING`

### 1.2 Pre-Op Ward Checklist Flow

**Current Flow:**
1. **Nurse Pre-Op Checklist** (Nurse)
   - Nurse accesses `/nurse/ward-prep/[id]/checklist`
   - Completes pre-op ward checklist form
   - Finalizes checklist → `ClinicalFormResponse.status` = `FINAL`

2. **Nurse Marks Ready** (`/api/nurse/pre-op/[id]` PATCH)
   - Nurse updates `CasePlan.readiness_status` = `READY`
   - Sets `CasePlan.ready_for_surgery` = `true`
   - **Dual Readiness Check:**
     - If nurse form is `FINAL` AND doctor plan is complete → Auto-transition to `READY_FOR_SCHEDULING`
     - Otherwise, case stays in current status

**Status:** `SurgicalCase.status` = `READY_FOR_SCHEDULING` (if both ready)

### 1.3 Theater Booking Flow

**Current Implementation:**
- `TheaterBooking` model exists with:
  - `surgical_case_id` (unique, one-to-one)
  - `theater_id`
  - `start_time`, `end_time`
  - `status`: `PROVISIONAL` → `CONFIRMED` → `COMPLETED` → `CANCELLED`
  - Concurrency lock mechanism (`locked_by`, `locked_at`, `version`)

**Critical Gap:** 
- ❌ **No API endpoint found for creating theater bookings**
- ❌ **No UI workflow for booking theater**
- ❌ **No integration with `READY_FOR_SCHEDULING` status**
- ❌ **Unclear who creates booking (Admin? Scheduler? Doctor?)**

### 1.4 Intra-Op Flow

**Current Flow:**
1. **Intra-Op Record** (Nurse)
   - Nurse accesses `/nurse/intra-op-cases/[caseId]/record`
   - Completes intra-op record form
   - Finalizes → `ClinicalFormResponse.status` = `FINAL`

**Status Transition:**
- ❌ **No automatic status transition from `SCHEDULED` → `IN_THEATER`**
- ❌ **No link between theater booking and intra-op record**
- ❌ **Unclear when case moves to `IN_THEATER` status**

---

## 2. Status Machine Analysis

### 2.1 SurgicalCase Status Enum

```typescript
enum SurgicalCaseStatus {
  DRAFT              // Initial state after consultation
  PLANNING           // Doctor is creating surgical plan
  READY_FOR_SCHEDULING  // Both doctor and nurse ready
  SCHEDULED          // Theater booked
  IN_PREP            // Patient in pre-op ward
  IN_THEATER         // Surgery in progress
  RECOVERY           // Post-op recovery
  COMPLETED          // Case complete
}
```

### 2.2 Current Status Transitions

| From | To | Trigger | Who | Issue |
|------|-----|---------|-----|-------|
| `DRAFT` | `PLANNING` | CasePlan created | Doctor | ✅ Clear |
| `PLANNING` | `READY_FOR_SCHEDULING` | Both ready | System | ⚠️ Ambiguous |
| `READY_FOR_SCHEDULING` | `SCHEDULED` | Theater booked | ? | 🔴 **MISSING** |
| `SCHEDULED` | `IN_PREP` | Pre-op checklist started | ? | 🔴 **MISSING** |
| `IN_PREP` | `IN_THEATER` | Surgery starts | ? | 🔴 **MISSING** |
| `IN_THEATER` | `RECOVERY` | Intra-op finalized | ? | 🔴 **MISSING** |
| `RECOVERY` | `COMPLETED` | Recovery finalized | ? | 🔴 **MISSING** |

### 2.3 Critical Gaps

1. **No `SCHEDULED` transition** — Theater booking doesn't update case status
2. **No `IN_PREP` transition** — Pre-op checklist doesn't trigger status change
3. **No `IN_THEATER` transition** — Intra-op record doesn't trigger status change
4. **No `RECOVERY` transition** — Recovery record doesn't trigger status change

---

## 3. "Ready" Status Analysis

### 3.1 What Does "Ready" Mean?

**Current Implementation:**
- `CasePlan.readiness_status` = `READY` (enum)
- `CasePlan.ready_for_surgery` = `true` (boolean)
- `SurgicalCase.status` = `READY_FOR_SCHEDULING`

**Issues:**
1. **Ambiguous Meaning:**
   - Does "ready" mean ready for scheduling? Ready for surgery? Ready for pre-op?
   - The name `READY_FOR_SCHEDULING` suggests scheduling, but workflow is unclear

2. **Dual Readiness:**
   - Doctor readiness: `CasePlan.ready_for_surgery = true`
   - Nurse readiness: Pre-op checklist `FINAL`
   - Both required for `READY_FOR_SCHEDULING`

3. **Is It Necessary?**
   - **YES** — Ensures both doctor and nurse have completed their pre-surgery tasks
   - **BUT** — The status name and workflow need clarification

### 3.2 Recommendation

**Rename and Clarify:**
- `READY_FOR_SCHEDULING` → `READY_FOR_THEATER_BOOKING`
- Meaning: "Both doctor planning and nurse pre-op checklist complete, ready to book theater"

**Or Better:**
- Keep `READY_FOR_SCHEDULING` but add clear workflow:
  - `READY_FOR_SCHEDULING` → Admin/Scheduler books theater → `SCHEDULED`

---

## 4. Theater Booking Workflow Gap

### 4.1 Current State

**What Exists:**
- ✅ `TheaterBooking` model with concurrency locks
- ✅ Theater model with availability
- ✅ Status enum: `PROVISIONAL`, `CONFIRMED`, `COMPLETED`, `CANCELLED`

**What's Missing:**
- ❌ **No API endpoint** for creating theater bookings
- ❌ **No UI** for booking theater
- ❌ **No integration** with surgical case status
- ❌ **No workflow** from `READY_FOR_SCHEDULING` → `SCHEDULED`

### 4.2 Who Should Book Theater?

**Options:**
1. **Admin/Scheduler** (Recommended)
   - Views cases in `READY_FOR_SCHEDULING`
   - Books theater based on surgeon availability
   - Confirms booking → Case status → `SCHEDULED`

2. **Doctor**
   - Doctor books own theater time
   - Less ideal (doctors shouldn't manage scheduling)

3. **System (Auto)**
   - Auto-book based on surgeon preferences
   - Complex, requires scheduling algorithm

**Recommendation:** Admin/Scheduler role with dedicated UI

### 4.3 Required Implementation

**New API Endpoint:**
```
POST /api/admin/theater-bookings
Body: {
  surgical_case_id: string
  theater_id: string
  start_time: DateTime
  end_time: DateTime
}
```

**Workflow:**
1. Admin views cases with `READY_FOR_SCHEDULING`
2. Selects case → Books theater → Creates `TheaterBooking`
3. System updates `SurgicalCase.status` → `SCHEDULED`
4. System updates `TheaterBooking.status` → `CONFIRMED`

---

## 5. Nurse Domain Organization

### 5.1 Current Nurse Responsibilities

**Clinical Workflows:**
1. **Pre-Op Ward Checklist** (`/nurse/ward-prep/[id]/checklist`)
2. **Intra-Op Record** (`/nurse/intra-op-cases/[caseId]/record`)
3. **Recovery Record** (implied, not yet implemented)

**Non-Clinical:**
4. **Inventory Management** (medications, supplies)

### 5.2 Issues

**Fragmentation:**
- Nurse domain mixes clinical and inventory
- No clear separation of concerns
- Inventory should be separate domain

**Missing Workflows:**
- ❌ No nurse dashboard showing all pre-op cases
- ❌ No workflow for transitioning patient to theater
- ❌ No recovery workflow integration

### 5.3 Recommendation

**Reorganize Nurse Domain:**
```
/nurse/
  ├── dashboard/              # Overview of all nurse tasks
  ├── pre-op/
  │   ├── cases/             # List of pre-op cases
  │   └── [id]/checklist/    # Pre-op checklist (existing)
  ├── intra-op/
  │   ├── cases/             # List of intra-op cases
  │   └── [id]/record/       # Intra-op record (existing)
  ├── recovery/
  │   ├── cases/             # List of recovery cases
  │   └── [id]/record/       # Recovery record
  └── inventory/              # Separate inventory domain
      ├── medications/
      └── supplies/
```

---

## 6. Patient Journey: Pre-Op → Theater → Intra-Op

### 6.1 Current Flow (Broken)

```
READY_FOR_SCHEDULING
  ↓ (Manual? Missing?)
SCHEDULED
  ↓ (Missing transition)
IN_PREP (Pre-op checklist)
  ↓ (Missing transition)
IN_THEATER (Intra-op record)
  ↓ (Missing transition)
RECOVERY
  ↓ (Missing transition)
COMPLETED
```

### 6.2 Proposed Flow

```
READY_FOR_SCHEDULING
  ↓ (Admin books theater)
SCHEDULED
  ↓ (Day of surgery: Nurse starts pre-op checklist)
IN_PREP
  ↓ (Nurse completes pre-op, patient ready for theater)
  ↓ (Nurse/Admin: "Patient ready for theater")
READY_FOR_THEATER
  ↓ (Patient enters theater, surgery starts)
IN_THEATER
  ↓ (Nurse finalizes intra-op record)
RECOVERY
  ↓ (Nurse finalizes recovery record)
COMPLETED
```

### 6.3 Required Status Transitions

**New Status:**
- `READY_FOR_THEATER` — Patient in pre-op, checklist complete, ready to enter theater

**Transitions:**
1. `SCHEDULED` → `IN_PREP`
   - **Trigger:** Nurse starts pre-op checklist
   - **Who:** Nurse
   - **When:** Day of surgery, patient arrives

2. `IN_PREP` → `READY_FOR_THEATER`
   - **Trigger:** Pre-op checklist finalized
   - **Who:** System (auto)
   - **When:** Checklist status = `FINAL`

3. `READY_FOR_THEATER` → `IN_THEATER`
   - **Trigger:** Nurse/Admin marks "Patient in theater"
   - **Who:** Nurse or Admin
   - **When:** Patient physically enters theater

4. `IN_THEATER` → `RECOVERY`
   - **Trigger:** Intra-op record finalized
   - **Who:** System (auto)
   - **When:** Intra-op form status = `FINAL`

5. `RECOVERY` → `COMPLETED`
   - **Trigger:** Recovery record finalized
   - **Who:** System (auto)
   - **When:** Recovery form status = `FINAL`

---

## 7. Architectural Recommendations

### 7.1 Status Transition Service

**Create:** `SurgicalCaseStatusTransitionService`

```typescript
class SurgicalCaseStatusTransitionService {
  async transitionToScheduled(caseId: string, bookingId: string): Promise<void>
  async transitionToInPrep(caseId: string): Promise<void>
  async transitionToReadyForTheater(caseId: string): Promise<void>
  async transitionToInTheater(caseId: string): Promise<void>
  async transitionToRecovery(caseId: string): Promise<void>
  async transitionToCompleted(caseId: string): Promise<void>
}
```

**Benefits:**
- Centralized status transition logic
- Audit trail for all transitions
- Validation before transitions
- Event emission for notifications

### 7.2 Theater Booking Service

**Create:** `TheaterBookingService`

```typescript
class TheaterBookingService {
  async createBooking(caseId: string, theaterId: string, startTime: Date, endTime: Date): Promise<TheaterBooking>
  async confirmBooking(bookingId: string): Promise<void>
  async cancelBooking(bookingId: string, reason: string): Promise<void>
  async checkAvailability(theaterId: string, startTime: Date, endTime: Date): Promise<boolean>
}
```

**Integration:**
- Creates `TheaterBooking`
- Updates `SurgicalCase.status` → `SCHEDULED`
- Emits events for notifications

### 7.3 Nurse Workflow Service

**Create:** `NurseWorkflowService`

```typescript
class NurseWorkflowService {
  async startPreOpChecklist(caseId: string): Promise<void>  // SCHEDULED → IN_PREP
  async completePreOpChecklist(caseId: string): Promise<void>  // IN_PREP → READY_FOR_THEATER
  async markPatientInTheater(caseId: string): Promise<void>  // READY_FOR_THEATER → IN_THEATER
  async completeIntraOpRecord(caseId: string): Promise<void>  // IN_THEATER → RECOVERY
  async completeRecoveryRecord(caseId: string): Promise<void>  // RECOVERY → COMPLETED
}
```

---

## 8. Implementation Priority

### 8.1 P0 (Critical - Blocking)

1. **Theater Booking API & UI**
   - Create booking endpoint
   - Admin UI for booking theater
   - Status transition: `READY_FOR_SCHEDULING` → `SCHEDULED`

2. **Status Transition Service**
   - Centralized transition logic
   - Auto-transitions based on form completion

3. **Pre-Op → Theater Transition**
   - `IN_PREP` status when checklist started
   - `READY_FOR_THEATER` when checklist finalized
   - `IN_THEATER` when patient enters theater

### 8.2 P1 (High Priority)

4. **Nurse Dashboard**
   - Unified view of all nurse tasks
   - Filter by status (pre-op, intra-op, recovery)

5. **Recovery Workflow**
   - Recovery record form
   - Status transition: `RECOVERY` → `COMPLETED`

6. **Workflow Notifications**
   - Notify when case ready for next step
   - Notify when theater booking confirmed

### 8.3 P2 (Medium Priority)

7. **Inventory Separation**
   - Move inventory to separate domain
   - Keep nurse domain focused on clinical workflows

8. **Status Renaming**
   - `READY_FOR_SCHEDULING` → `READY_FOR_THEATER_BOOKING` (optional)

---

## 9. Questions to Answer

1. **Who schedules theater?** Admin? Scheduler? Doctor?
2. **When does patient move to pre-op?** Day of surgery? Night before?
3. **Who marks patient "in theater"?** Nurse? Admin? Automatic?
4. **What triggers recovery?** Intra-op finalized? Manual trigger?
5. **Is `READY_FOR_SCHEDULING` necessary?** Or can we go directly to `SCHEDULED`?

---

## 10. Conclusion

The current surgical case workflow has **significant gaps** that prevent a smooth patient journey. The main issues are:

1. **Missing theater booking workflow** — No way to book theater from UI
2. **Missing status transitions** — Gaps between pre-op, theater, intra-op, recovery
3. **Ambiguous "ready" status** — Unclear meaning and necessity
4. **Fragmented nurse domain** — Clinical and inventory mixed

**Recommended Next Steps:**
1. Implement theater booking API & UI
2. Create status transition service
3. Add missing status transitions
4. Reorganize nurse domain
5. Add recovery workflow

This will create a **comprehensive, well-documented patient journey** from consultation to surgery completion.

---

**Document Status:** Ready for Implementation  
**Reviewed By:** [Pending]  
**Approved By:** [Pending]
