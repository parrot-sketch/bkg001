# Visit vs Consultation - Relationship Analysis

## Current System Architecture

### Entity Relationships

```
Patient
  ↓ (1:N)
Appointment (status: COMPLETED)
  ↓ (1:1)
Consultation (completed_at set)
  ↓ (1:1)
MedicalRecord (clinical documentation)
```

### Visit Definition

**Current Implementation:**
- **Visit = Completed Appointment**
- `lastVisit` = Most recent `Appointment` where `status = 'COMPLETED'`
- **NOT a stored entity** - it's a **derived/computed value**

## How Visit is Currently Used

### 1. Calculation Logic

```typescript
// From utils/services/patient.ts and app/api/frontdesk/patients/route.ts
const lastVisit = patient.appointments
  .filter(a => a.status === 'COMPLETED')
  .sort((a, b) => b.appointment_date - a.appointment_date)[0]
  ?.appointment_date || null;
```

### 2. Where It's Displayed

- **Patient Profile Hero**: Shows "Last Visit: MMM d, yyyy"
- **Frontdesk Patient Sidebar**: Displays in patient summary card
- **Patient List**: Included in patient DTOs
- **Dashboard Statistics**: Used for patient engagement metrics

### 3. Update Mechanism

**When Consultation Completes:**
1. `CompleteConsultationUseCase.execute()` runs
2. Sets `Appointment.status = COMPLETED`
3. Sets `Consultation.completed_at = now()`
4. Sets `Appointment.consultation_ended_at = now()`

**When lastVisit Updates:**
- **Automatically** - on next query
- No explicit update needed
- Always reflects current state
- Query: `SELECT appointment_date FROM appointments WHERE patient_id = ? AND status = 'COMPLETED' ORDER BY appointment_date DESC LIMIT 1`

## Visit vs Consultation

### Conceptual Difference

| Aspect | Visit | Consultation |
|--------|-------|--------------|
| **Definition** | Patient's physical presence at clinic | Clinical encounter with doctor |
| **Scope** | Entire clinic experience (check-in → checkout) | Just doctor-patient interaction |
| **Duration** | `checked_in_at` to `consultation_ended_at` | `started_at` to `completed_at` |
| **Current Storage** | Derived from Appointment | Stored entity (Consultation model) |
| **Update Trigger** | When appointment completes | When consultation ends |

### In Aesthetic Surgery Context

**Typical Visit Flow:**
```
1. Patient arrives → Check-in (checked_in_at)
2. Waiting room
3. Consultation starts → Consultation.started_at
4. Clinical interaction (examination, discussion, planning)
5. Consultation ends → Consultation.completed_at
6. Checkout/Payment
7. Visit complete → Appointment.status = COMPLETED
```

**Visit Types in Aesthetic Surgery:**
- **Initial Consultation**: First visit, treatment planning
- **Follow-up Consultation**: Progress check, adjustments
- **Pre-operative Visit**: Pre-surgery assessment
- **Surgery Day**: Procedure visit (may have multiple procedures)
- **Post-operative Visit**: Recovery monitoring

## Does Consultation Completion Update Visit?

### Answer: Yes, Indirectly

**Flow:**
```
CompleteConsultationUseCase.execute()
  ↓
1. Consultation.completed_at = now()
  ↓
2. Appointment.status = COMPLETED
  ↓
3. Appointment.consultation_ended_at = now()
  ↓
4. Next query for lastVisit:
   - Queries: appointments WHERE status = 'COMPLETED'
   - Orders by: appointment_date DESC
   - Takes first result
   - Returns as lastVisit
```

**Key Point:**
- `lastVisit` is **always derived** from current data
- No explicit "update lastVisit" step needed
- Always accurate - no stale data risk

## Should Visit Be a Separate Entity?

### Analysis: Keep as Derived (Current Approach is Correct)

**Reasons:**

1. **1:1 Relationship Works**
   - One appointment = one visit = one consultation
   - This is the norm in aesthetic surgery
   - No need for separate entity

2. **No Data Synchronization Issues**
   - Derived value always reflects current state
   - No risk of stale data
   - No update logic needed

3. **Simpler Architecture**
   - Less complexity
   - Fewer tables to maintain
   - Easier to understand

4. **Performance**
   - Fast query (indexed on status + appointment_date)
   - No extra joins needed
   - No additional writes

5. **Aesthetic Surgery Reality**
   - Most visits are single-encounter
   - Appointment already tracks visit date/time
   - Consultation tracks clinical encounter

### When to Consider Visit Entity

**Only if these scenarios become common:**

1. **Multi-Encounter Visits**
   - Patient sees multiple doctors in one physical visit
   - Multiple consultations in one visit
   - Current: 1 appointment = 1 consultation

2. **Visit-Level Billing**
   - Billing per visit, not per appointment
   - Package deals (multiple visits)
   - Current: Billing per appointment

3. **Complex Visit Types**
   - Surgery day with multiple procedures
   - Visit-level documentation
   - Current: Appointment-level is sufficient

4. **Visit-Level Reporting**
   - Visit statistics separate from appointments
   - Visit-based analytics
   - Current: Appointment statistics work

## Clinical Importance in Aesthetic Surgery

### Why Visit Tracking Matters

1. **Patient Journey Tracking**
   ```
   Initial Consultation → Treatment Planning → 
   Pre-op Visit → Surgery → Post-op Visits
   ```
   - Each stage is a visit
   - Critical for continuity of care
   - Treatment progression tracking

2. **Treatment Timeline**
   - Time between visits (healing periods)
   - Follow-up scheduling (e.g., "2 weeks post-op")
   - Treatment progression monitoring

3. **Clinical Decision Making**
   - "Last visit was 2 weeks ago" → healing progress
   - "First visit 3 months ago" → treatment timeline
   - Visit frequency patterns → patient engagement

4. **Billing & Revenue**
   - Visit-based billing
   - Package deals (e.g., "3-visit package")
   - Follow-up visit pricing
   - Revenue per visit metrics

5. **Patient Retention**
   - Visit frequency metrics
   - Patient engagement tracking
   - Treatment completion rates
   - Return visit patterns

6. **Regulatory Compliance**
   - Visit documentation requirements
   - Audit trails per visit
   - Clinical records per visit
   - Visit-based reporting

### Aesthetic Surgery Specific Use Cases

1. **Initial Consultation**
   - First visit date tracked
   - Treatment planning initiated
   - Patient decision timeline

2. **Follow-up Visits**
   - Progress monitoring
   - Treatment adjustments
   - Healing assessment

3. **Pre-operative Visit**
   - Pre-surgery assessment
   - Final planning
   - Consent verification

4. **Surgery Day**
   - Procedure visit
   - Multiple procedures possible
   - Post-op instructions

5. **Post-operative Visits**
   - Recovery monitoring
   - Complication assessment
   - Treatment outcomes

## Recommendation

### Keep Visit as Derived Value

**Enhancement Strategy:**

1. **Create Visit Calculation Service**
   ```typescript
   class VisitCalculationService {
     // Calculate last visit
     static getLastVisit(patientId: string): Date | null
     
     // Calculate visit history
     static getVisitHistory(patientId: string): VisitSummary[]
     
     // Calculate visit statistics
     static getVisitStats(patientId: string): VisitStats
     
     // Calculate visit type from appointment
     static getVisitType(appointment: Appointment): VisitType
   }
   ```

2. **Enhance Visit Metrics**
   - Visit duration (check-in to consultation end)
   - Visit type (initial, follow-up, pre-op, post-op)
   - Visit frequency
   - Visit history timeline

3. **Add Visit-Level Queries**
   - All visits for a patient
   - Visit statistics
   - Visit-based reporting

### Benefits of Current Approach

1. **Always Accurate**: Derived from current data
2. **No Sync Issues**: No separate entity to maintain
3. **Simple**: Easy to understand and maintain
4. **Fast**: Indexed queries, no extra joins
5. **Flexible**: Can enhance without schema changes

## Conclusion

**Current system is appropriate for aesthetic surgery center:**
- Visit as derived value works well
- 1:1 relationship (appointment = visit = consultation) is the norm
- No need for separate Visit entity
- Can enhance with calculation services without schema changes

**Enhancement path:**
- Create VisitCalculationService for visit-level metrics
- Add visit type derivation
- Add visit duration calculation
- Add visit history queries
- Keep as derived - no entity needed
