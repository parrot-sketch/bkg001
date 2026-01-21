# Pre/Post-op Workflow Analysis

## Current Implementation Issues

### 1. Immediate Error
- **Problem**: Using `AppointmentStatus.CONFIRMED` which doesn't exist in enum
- **Enum Values**: `PENDING`, `SCHEDULED`, `CANCELLED`, `COMPLETED`
- **Fix**: Replace `CONFIRMED` with `SCHEDULED` or `PENDING`

### 2. Conceptual Mismatch
- **Current Logic**: Shows appointments with status SCHEDULED/CONFIRMED as "pre-op"
- **Reality**: Pre-op and post-op are **care workflows**, not appointment statuses
- **Correct Model**: Should use `CareNote` with `note_type: PRE_OP` or `POST_OP`

## Database Schema Analysis

### Pre/Post-op Related Models

#### 1. `CareNote` Model
```prisma
model CareNote {
  id             Int
  patient_id     String
  nurse_user_id  String
  appointment_id Int?
  note_type      CareNoteType // PRE_OP, POST_OP, GENERAL
  note           String
  recorded_at    DateTime
}
```
**Purpose**: Actual pre/post-op care documentation by nurses

#### 2. `CasePlan` Model
```prisma
model CasePlan {
  id                Int
  appointment_id    Int
  doctor_id         String
  patient_id        String
  readiness_status  String? // READY, NOT_READY, PENDING
  procedure_plan    String? @db.Text
  risk_assessment   String? @db.Text
  pre_op_notes      String? @db.Text
  special_instructions String? @db.Text
}
```
**Purpose**: Surgical case planning by doctors (pre-op planning)

#### 3. `SurgicalOutcome` Model
```prisma
model SurgicalOutcome {
  id              Int
  appointment_id  Int
  patient_id      String
  doctor_id       String
  procedure_type  String
  outcome_status  String? // EXCELLENT, GOOD, SATISFACTORY, NEEDS_REVISION, COMPLICATION
  notes           String? @db.Text
  follow_up_required Boolean @default(false)
}
```
**Purpose**: Post-op outcome tracking

#### 4. `NurseAssignment` Model
```prisma
model NurseAssignment {
  id             Int
  patient_id     String
  nurse_user_id  String
  appointment_id Int?
  assigned_at    DateTime
  assigned_by    String?
  notes          String?
}
```
**Purpose**: Assign nurses to patients for pre/post-op care

## Correct Workflow Understanding

### Pre-operative Workflow

**What it should be:**
1. **Doctor Planning Phase**:
   - Doctor creates `CasePlan` for surgical appointment
   - Sets `readiness_status` (READY, NOT_READY, PENDING)
   - Documents `procedure_plan`, `risk_assessment`, `pre_op_notes`
   - Special instructions for surgery

2. **Nurse Care Phase**:
   - Nurse assigned via `NurseAssignment`
   - Nurse records `CareNote` with `note_type: PRE_OP`
   - Nurse records `VitalSign` measurements
   - Prepares patient for surgery

**What the admin should see:**
- Appointments with `CasePlan` but `readiness_status != READY` (pending planning)
- Appointments with `readiness_status = READY` but no recent `CareNote` (needs nurse care)
- Appointments scheduled for surgery (status: SCHEDULED, upcoming date)

### Post-operative Workflow

**What it should be:**
1. **Immediate Post-op**:
   - Appointment status: `COMPLETED`
   - `SurgicalOutcome` created by doctor
   - `CareNote` with `note_type: POST_OP` by nurse
   - `VitalSign` monitoring

2. **Follow-up Care**:
   - `PatientImage` at timepoints (ONE_WEEK_POST_OP, ONE_MONTH_POST_OP, etc.)
   - Ongoing `CareNote` entries
   - `SurgicalOutcome` updates

**What the admin should see:**
- Completed appointments with `SurgicalOutcome` (recent surgeries)
- Patients needing follow-up care (no recent care notes)
- Patients with complications (`outcome_status = COMPLICATION`)

## Current Implementation Gaps

### ❌ What's Missing

1. **No CasePlan Integration**:
   - Admin page doesn't check `CasePlan` readiness
   - No visibility into surgical planning status

2. **No CareNote Integration**:
   - Not querying `CareNote` table
   - Not showing which patients need care documentation

3. **No SurgicalOutcome Integration**:
   - Not tracking post-op outcomes
   - No complication alerts

4. **No NurseAssignment Integration**:
   - Not showing nurse assignments
   - No visibility into care team

5. **Oversimplified Logic**:
   - Pre-op = "upcoming appointments" (wrong)
   - Post-op = "completed appointments" (incomplete)

### ✅ What Exists in Database

- `CareNote` model with PRE_OP/POST_OP types
- `CasePlan` model for surgical planning
- `SurgicalOutcome` model for outcomes
- `NurseAssignment` model for care team
- `VitalSign` model for monitoring
- `PatientImage` model for timepoint tracking

## Proposed Correct Implementation

### Pre-op Query Logic

**Should query:**
1. Appointments with upcoming dates (status: SCHEDULED)
2. **AND** either:
   - No `CasePlan` exists (needs planning)
   - `CasePlan.readiness_status != READY` (needs planning completion)
   - `CasePlan.readiness_status = READY` but no recent `CareNote` (needs nurse care)

**Should display:**
- Patient name, file number
- Appointment date/time
- Doctor name
- Case plan status (if exists)
- Last care note date (if exists)
- Nurse assignment status

### Post-op Query Logic

**Should query:**
1. Appointments with status: COMPLETED
2. **AND** either:
   - Has `SurgicalOutcome` (recent surgery)
   - No recent `CareNote` with `note_type: POST_OP` (needs follow-up)
   - `SurgicalOutcome.outcome_status = COMPLICATION` (needs attention)

**Should display:**
- Patient name, file number
- Surgery date
- Procedure type
- Outcome status
- Last care note date
- Follow-up required flag

## Action Plan

### Phase 1: Fix Immediate Error
1. Replace `AppointmentStatus.CONFIRMED` with `AppointmentStatus.SCHEDULED`
2. Fix both pre-op and post-op endpoints

### Phase 2: Correct Workflow Implementation
1. Update pre-op endpoint to query `CasePlan` and `CareNote`
2. Update post-op endpoint to query `SurgicalOutcome` and `CareNote`
3. Add proper filtering logic based on care workflow state

### Phase 3: Enhanced Admin UI
1. Show case plan status
2. Show care note status
3. Show nurse assignments
4. Show outcome status
5. Add action buttons (assign nurse, view case plan, etc.)

### Phase 4: Integration Points
1. Link to doctor case planning pages
2. Link to nurse care note pages
3. Link to patient surgical outcome pages
4. Add workflow status indicators

## CaseReadinessStatus Enum

```prisma
enum CaseReadinessStatus {
  NOT_STARTED
  PENDING_LABS
  PENDING_CONSENT
  PENDING_REVIEW
  READY
}
```

**Workflow Progression:**
1. `NOT_STARTED` - No case plan created yet
2. `PENDING_LABS` - Waiting for lab results
3. `PENDING_CONSENT` - Waiting for patient consent
4. `PENDING_REVIEW` - Doctor needs to review
5. `READY` - Patient ready for surgery

## Current System State

### ✅ What Works
- Nurse can record `CareNote` with PRE_OP/POST_OP types
- Nurse can record `VitalSign`
- Database models exist for full workflow
- Nurse UI has dialogs for care notes and vitals

### ❌ What's Broken
- Admin pre/post-op page shows wrong data (just appointments)
- Admin endpoints use wrong status enum (`CONFIRMED` doesn't exist)
- No integration with `CasePlan` model
- No integration with `SurgicalOutcome` model
- No visibility into care workflow state

## Recommended Implementation Strategy

### Option 1: Simple (Current Approach - Fixed)
**For Admin Overview:**
- Pre-op: Upcoming appointments (SCHEDULED/PENDING) with future dates
- Post-op: Completed appointments from last 30 days

**Pros:**
- Simple to implement
- Works immediately
- Shows all relevant appointments

**Cons:**
- Doesn't show care workflow state
- Doesn't distinguish surgical vs consultation appointments
- No visibility into readiness status

### Option 2: Workflow-Aware (Recommended)
**For Admin Overview:**
- Pre-op: 
  - Appointments with `CasePlan` where `readiness_status != READY`
  - OR appointments scheduled for surgery (type = "Procedure") without `CasePlan`
- Post-op:
  - Completed appointments with `SurgicalOutcome`
  - OR completed appointments without recent `CareNote` (needs follow-up)

**Pros:**
- Shows actual workflow state
- Highlights patients needing attention
- Integrates with existing models

**Cons:**
- More complex queries
- Requires joins to multiple tables
- May show fewer patients (only those in workflow)

### Option 3: Comprehensive (Future)
**For Admin Overview:**
- Pre-op Dashboard:
  - Needs Planning: Appointments without `CasePlan`
  - Needs Review: `CasePlan` with `readiness_status = PENDING_REVIEW`
  - Needs Labs: `CasePlan` with `readiness_status = PENDING_LABS`
  - Needs Consent: `CasePlan` with `readiness_status = PENDING_CONSENT`
  - Ready for Surgery: `CasePlan` with `readiness_status = READY`
- Post-op Dashboard:
  - Recent Surgeries: Completed with `SurgicalOutcome` (last 30 days)
  - Needs Follow-up: No recent `CareNote`
  - Complications: `SurgicalOutcome.outcome_status = COMPLICATION`

**Pros:**
- Complete visibility
- Actionable insights
- Supports workflow management

**Cons:**
- Most complex
- Requires significant refactoring
- May be overkill for current needs

## Immediate Fix (Applied)

✅ Fixed `AppointmentStatus.CONFIRMED` → `AppointmentStatus.SCHEDULED` in pre-op endpoint

## Next Steps

1. **Decide on approach** (Option 1, 2, or 3)
2. **Update post-op endpoint** (if needed)
3. **Enhance admin UI** to show workflow state
4. **Add filtering** by appointment type (surgical vs consultation)
5. **Add action buttons** (view case plan, assign nurse, etc.)
