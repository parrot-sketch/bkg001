# Visit Entity Analysis - Clinical Data Model

## Current Implementation

### "Visit" as a Derived Value

**Current State:**
- `lastVisit` is **NOT a stored entity** - it's a **derived/computed value**
- Calculated from: `patient.appointments[0]?.appointment_date` where:
  - Appointments are filtered to `status = 'COMPLETED'`
  - Ordered by `appointment_date DESC`
  - Takes the most recent completed appointment date

**Where It's Used:**
- `PatientProfileHero` - Shows last visit date
- `FrontdeskPatientSidebar` - Displays in patient summary
- `getPatientFullDataById` - Returns lastVisit in patient data
- `/api/frontdesk/patients` - Includes lastVisit in patient list

**Calculation Logic:**
```typescript
// From utils/services/patient.ts
const lastVisit = patient.appointments[0]?.appointment_date || null;
// Where appointments are filtered to COMPLETED and ordered DESC
```

## Data Entity Relationships

### Current Clinical Workflow Entities

1. **Appointment** (Scheduled Time Slot)
   - Purpose: Represents a scheduled time slot
   - Status: PENDING → SCHEDULED → CHECKED_IN → IN_CONSULTATION → COMPLETED
   - Fields: `appointment_date`, `time`, `status`, `type`
   - Relationship: 1:1 with Consultation

2. **Consultation** (Clinical Encounter)
   - Purpose: Represents the actual clinical encounter
   - Fields: `started_at`, `completed_at`, `outcome`, `chief_complaint`, `assessment`, `plan`
   - Relationship: 1:1 with Appointment
   - Created: When consultation starts
   - Completed: When consultation ends

3. **MedicalRecord** (Clinical Documentation)
   - Purpose: Stores clinical documentation
   - Fields: `treatment_plan`, `prescriptions`, `lab_request`, `notes`
   - Relationship: 1:1 with Appointment
   - Contains: Diagnoses, LabTests, VitalSigns

### Workflow Sequence

```
1. Appointment Created (status: PENDING/SCHEDULED)
   ↓
2. Patient Checks In (status: CHECKED_IN)
   ↓
3. Consultation Starts (Consultation.created, status: IN_CONSULTATION)
   ↓
4. Clinical Documentation (MedicalRecord, Diagnoses, VitalSigns)
   ↓
5. Consultation Completed (Consultation.completed_at set, status: COMPLETED)
   ↓
6. lastVisit = Most recent COMPLETED appointment date (derived)
```

## Visit vs Consultation Analysis

### What is a "Visit"?

**Clinical Definition:**
- A **visit** is a patient's physical presence at the clinic for a clinical encounter
- In aesthetic surgery, a visit typically includes:
  - Initial consultation
  - Follow-up consultations
  - Pre-operative visits
  - Post-operative visits
  - Procedure visits (surgery day)

**Current System:**
- Visit = Completed Appointment with Consultation
- One visit = One appointment = One consultation (1:1:1 relationship)

### Visit vs Consultation

| Aspect | Visit | Consultation |
|--------|-------|--------------|
| **Definition** | Patient's physical presence at clinic | Clinical encounter with doctor |
| **Scope** | Broader - includes check-in, waiting, consultation, checkout | Narrower - just the clinical interaction |
| **Duration** | Entire time at clinic (check-in to checkout) | Just the doctor-patient interaction |
| **Current System** | Derived from COMPLETED appointments | Stored entity (Consultation model) |
| **Update Trigger** | When appointment status → COMPLETED | When consultation ends |

## Current Update Mechanism

### Does Consultation Completion Update Visit?

**Answer: Indirectly, Yes**

1. **When Consultation Completes:**
   - `CompleteConsultationUseCase` sets:
     - `Appointment.status = COMPLETED`
     - `Consultation.completed_at = now()`
     - `Appointment.consultation_ended_at = now()`

2. **When lastVisit Updates:**
   - `lastVisit` is **recalculated** on every query
   - It queries: `appointments WHERE status = 'COMPLETED' ORDER BY appointment_date DESC LIMIT 1`
   - So when a new appointment completes, it automatically becomes the new `lastVisit`

3. **No Direct Update:**
   - There's no explicit "update lastVisit" step
   - It's always derived from current data
   - This is actually **good** - no data synchronization issues

## Should Visit Be a Separate Entity?

### Arguments FOR Separate Visit Entity

1. **Multi-Encounter Visits**
   - Patient might see multiple doctors in one visit
   - Multiple consultations in one physical visit
   - Current system: 1 appointment = 1 consultation = 1 visit

2. **Visit-Level Data**
   - Visit reason/chief complaint
   - Visit duration (check-in to checkout)
   - Visit type (initial, follow-up, emergency)
   - Visit location/room

3. **Clinical Reporting**
   - Visit statistics
   - Patient visit history
   - Visit-based billing

4. **Aesthetic Surgery Context**
   - Surgery day = one visit, multiple procedures
   - Pre-op visit = separate from surgery visit
   - Post-op visits = follow-up care

### Arguments AGAINST (Keep as Derived)

1. **Current System Works**
   - 1:1 relationship (appointment = visit = consultation)
   - No data synchronization issues
   - Simpler data model

2. **Derived is More Accurate**
   - Always reflects current state
   - No stale data
   - No update logic needed

3. **Aesthetic Surgery Reality**
   - Most visits are single-encounter
   - Appointment already tracks visit date/time
   - Consultation tracks clinical encounter

4. **Performance**
   - Derived value is fast (indexed query)
   - No extra table joins
   - No additional writes

## Clinical Importance in Aesthetic Surgery

### Why Visit Tracking Matters

1. **Patient Journey Tracking**
   - Initial consultation → Treatment planning → Surgery → Post-op care
   - Each stage is a visit
   - Critical for continuity of care

2. **Treatment Timeline**
   - Time between visits (healing periods)
   - Follow-up scheduling
   - Treatment progression

3. **Clinical Decision Making**
   - "Last visit was 2 weeks ago" - healing progress
   - "First visit 3 months ago" - treatment timeline
   - Visit frequency patterns

4. **Billing & Revenue**
   - Visit-based billing
   - Package deals (multiple visits)
   - Follow-up visit pricing

5. **Patient Retention**
   - Visit frequency metrics
   - Patient engagement
   - Treatment completion rates

6. **Regulatory Compliance**
   - Visit documentation requirements
   - Audit trails
   - Clinical records per visit

## Recommendation

### Current System is Appropriate (Keep as Derived)

**Reasoning:**
1. **1:1 Relationship Works**: In aesthetic surgery, one appointment = one visit = one consultation is the norm
2. **No Data Sync Issues**: Derived value always accurate
3. **Simpler Architecture**: Less complexity, easier maintenance
4. **Performance**: Fast queries, no extra joins

### When to Consider Visit Entity

**Only if these scenarios become common:**
1. Multi-encounter visits (patient sees multiple doctors in one visit)
2. Visit-level billing (billing per visit, not per appointment)
3. Complex visit types (surgery day with multiple procedures)
4. Visit-level reporting requirements

### Enhancement: Better Visit Tracking

**Without creating a new entity, we can enhance:**

1. **Visit Type Calculation**
   ```typescript
   // Derive visit type from appointment
   visitType = appointment.type === 'Initial Consultation' ? 'INITIAL' : 'FOLLOW_UP'
   ```

2. **Visit Duration**
   ```typescript
   // Calculate from check-in to consultation end
   visitDuration = consultation.completed_at - appointment.checked_in_at
   ```

3. **Visit History**
   ```typescript
   // Query all completed appointments as visit history
   visitHistory = appointments.filter(a => a.status === 'COMPLETED')
   ```

4. **Visit Statistics**
   ```typescript
   // Calculate from appointments
   totalVisits = completedAppointments.length
   lastVisit = completedAppointments[0]?.appointment_date
   firstVisit = completedAppointments[completedAppointments.length - 1]?.appointment_date
   ```

## Proposed Enhancement

### Add Visit Calculation Service

Create a service that calculates visit-related metrics without storing a separate entity:

```typescript
class VisitCalculationService {
  // Calculate last visit
  static getLastVisit(patientId: string): Date | null
  
  // Calculate visit history
  static getVisitHistory(patientId: string): VisitSummary[]
  
  // Calculate visit statistics
  static getVisitStats(patientId: string): VisitStats
  
  // Calculate visit type
  static getVisitType(appointment: Appointment): VisitType
}
```

This keeps the system simple while providing visit-level insights.
