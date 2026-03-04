# Doctor-Patients Relationship Analysis

## Current Implementation

### How "Under Doctor's Care" is Determined

A patient is considered "under a doctor's care" if there exists **at least one Appointment record** where:
- `appointment.patient_id` = patient ID
- `appointment.doctor_id` = doctor ID

**Location**: [app/api/doctors/me/patients/route.ts](app/api/doctors/me/patients/route.ts#L70-L80)

```typescript
// Find patients who have at least one appointment with this doctor
const prismaPatients = await db.patient.findMany({
  where: {
    appointments: {
      some: {
        doctor_id: doctor.id,  // ← This is the entire criteria
      },
    },
  },
  orderBy: { created_at: 'desc' },
  take: 200, // Safety limit
});
```

### Data Model

```
Doctor (1) ──────── (many) Appointment (many) ──────── (1) Patient
                  doctor_id              patient_id
```

### Key Observations

| Aspect | Current Behavior | Implication |
|--------|------------------|-------------|
| **Definition** | Any patient with ≥1 appointment to doctor | Simple, but broad |
| **Active Care** | No distinction between active/inactive | Old appointments count indefinitely |
| **Assignment** | No explicit assignment table | Purely appointment-driven |
| **Status Tracking** | No "under care" status field | Binary (has appointment or doesn't) |
| **Retention** | Patient stays in list forever | Even if dismissed/transferred |
| **Query Cost** | Single efficient query via relation | O(1) complexity |
| **Patient Limit** | 200 hardcoded | Safety cap to prevent memory issues |

---

## Problems with Current Approach

### 1. ❌ No Active Care Tracking
```
Patient History:
- Jan 2024: Saw Dr. Smith → Added to "My Patients"
- Feb 2024: No appointments
- Mar 2024: No appointments
- Today (Mar 2026): Still shows in "My Patients" even though not seen in 2 years
```

**Problem**: Indefinite presence in patient list regardless of recency

### 2. ❌ Can't Distinguish Care Phases
Missing ability to differentiate:
- **Active Care**: Currently under treatment
- **Discharged**: Completed treatment, no longer under care
- **Transferred**: Moved to another doctor
- **Inactive**: Haven't seen in 6+ months
- **Follow-up**: Awaiting next appointment

### 3. ❌ No Explicit Assignment
If doctor wants to formally accept a patient:
- Currently: Create an appointment (wrong use of Appointment)
- Ideally: Use explicit assignment record

If doctor transfers patient to colleague:
- Currently: No way to mark transition
- Patient stays in old doctor's list indefinitely

### 4. ❌ Ambiguous for Surgical Cases
In surgical context:
- Is patient "under doctor's care" because of 1 old consultation?
- What about patients seeing multiple doctors (primary + specialists)?
- Who owns the surgical case responsibility?

### 5. ❌ Difficult to Filter Overloaded Lists
A busy doctor might have 500+ patients if they've been at hospital 10+ years.
- Current UI has no filtering by date range
- No sorting by active vs inactive
- No ability to see "patients I care for" vs "patients I've ever seen"

---

## What the Current Page Shows

**Patients List** (`/doctor/patients`):
1. Displays all patients with ≥1 appointment to this doctor
2. Enriches with:
   - Appointment count (from `appointments` array length)
   - Last visit date (most recent appointment)
   - Medical allergies/conditions (from Patient entity)
3. **No indication of**: Active care status, care phase, assignment date, discharge date

**Example Data**:
```
Patient: John Smith
├─ File #: NS001
├─ Last Visit: Jan 15, 2024 (2 years ago!)
├─ Appointment Count: 3
├─ Allergies: Penicillin
└─ Status: Shows as "under doctor's care" but hasn't been seen in 2 years
```

---

## Alternative Approaches to Consider

### Option 1: Add "Active Care" Flag to Patient
```sql
ALTER TABLE Patient ADD COLUMN is_active_under_doctor BOOLEAN DEFAULT false;
ALTER TABLE Patient ADD COLUMN active_under_doctor_id STRING;
ALTER TABLE Patient ADD COLUMN care_started_at DATETIME;
ALTER TABLE Patient ADD COLUMN care_ended_at DATETIME;
```

**Pros**:
- Explicit assignment
- Can track care phases
- Simple queries
- Low migration cost

**Cons**:
- Patient can only be under one doctor's "active" care at a time
- Need manual updates when transferring

### Option 2: Create DoctorPatientAssignment Table (Recommended)
```sql
CREATE TABLE DoctorPatientAssignment (
  id UUID PRIMARY KEY,
  doctor_id STRING,
  patient_id STRING,
  assigned_date DATETIME,
  assignment_status ENUM('ACTIVE', 'DISCHARGED', 'TRANSFERRED', 'INACTIVE'),
  care_notes TEXT,
  discharged_date DATETIME,
  transferred_to_doctor_id STRING,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE(doctor_id, patient_id),
  FOREIGN KEY (doctor_id) REFERENCES Doctor(id),
  FOREIGN KEY (patient_id) REFERENCES Patient(id),
  FOREIGN KEY (transferred_to_doctor_id) REFERENCES Doctor(id)
);
```

**Schema Mapping**:
```
Doctor (1) ──── (many) DoctorPatientAssignment (many) ──── (1) Patient
           doctor_id                          patient_id
```

**Pros**:
- Explicit care transitions (assign → discharge/transfer)
- Multiple doctors can be assigned simultaneously
- Audit trail of care history
- Support for care phases
- Can query "active assignments" for clean roster
- Explicit timestamps for analytics

**Cons**:
- Requires new table
- More complex migration
- Need logic to decide when to create/update assignments

### Option 3: Use Last Appointment Date (Minimal Change)
Keep current appointment-based approach but add filtering:

```typescript
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const activePatientsIn6Months = patients.filter(p => {
  const lastVisit = patientLastVisit[p.id];
  return lastVisit && lastVisit > sixMonthsAgo;
});
```

**Pros**:
- Zero database changes
- Quick implementation
- Works immediately

**Cons**:
- Fragile (arbitrary cutoff)
- Can't handle explicit discharge
- No transfer tracking
- Ignores scheduled future appointments

---

## Recommendation

### Short Term (1-2 hours)
**Implement Option 3** as a quick fix:
- Add filter UI to show: "All Time" | "Active (6mo)" | "Active (3mo)"
- Default to "Active (6mo)" for cleaner list
- Add column showing "Last Visit" date prominently

### Medium Term (4-6 hours)
**Implement Option 2** properly:
1. Create `DoctorPatientAssignment` table in Prisma schema
2. Add migration to backfill existing appointments as assignments
3. Update API endpoint to query from assignments instead of appointments
4. Add assignment status filtering (ACTIVE, DISCHARGED, TRANSFERRED)
5. Create explicit assignment/discharge workflow

### Assignment Lifecycle
```
[Backfill] Historical Appointment
              ↓
[Explicit Assignment] Doctor assigns patient (manual or auto)
              ↓
[Active Care] Patient visible in "My Patients"
              ↓
[Discharge] Doctor marks patient as discharged
              ├─ Care Ended (still in history)
              ├─ View in "Past Patients" if needed
              └─ Hidden from active list
              ↓
[Transfer] Doctor transfers to colleague
              ├─ Original doctor: TRANSFERRED (archived)
              ├─ New doctor: ACTIVE (inherited)
              └─ Audit trail of transfer
```

---

## Current Code Locations

| Component | File | Role |
|-----------|------|------|
| **Page** | [app/doctor/patients/page.tsx](app/doctor/patients/page.tsx) | Displays patients, filtering, sorting |
| **Hook** | [hooks/doctor/useDoctorPatients.ts](hooks/doctor/useDoctorPatients.ts) | React Query wrapper for API |
| **API** | [app/api/doctors/me/patients/route.ts](app/api/doctors/me/patients/route.ts) | Backend logic fetching patients with appointments |
| **Client API** | [lib/api/doctor.ts](lib/api/doctor.ts) | HTTP client `doctorApi.getMyPatients()` |

### Data Flow
```
[Page Component]
       ↓
[useDoctorPatients hook]
       ↓
[doctorApi.getMyPatients()]
       ↓
[GET /api/doctors/me/patients]
       ↓
[Database Query]:
   SELECT * FROM Patient 
   WHERE appointments.some.doctor_id = ?
       ↓
[API Returns PatientResponseDto[]]
       ↓
[Page Renders List]
```

---

## Recommended Next Steps

1. **Clarify Business Requirements**:
   - How should "under doctor's care" be defined?
   - Should patients ever be removed from the list?
   - How long before a patient is considered "inactive"?
   - Can one patient be under multiple doctors' care simultaneously?

2. **Implement Based on Requirements**:
   - If simple time-based filtering is sufficient → **Option 3**
   - If explicit care lifecycle needed → **Option 2** (recommended)

3. **Add Features**:
   - Filter UI (Active, Inactive, Discharged)
   - Last visit prominence
   - Care status badge
   - Assignment date display

---

## Summary Table

| Question | Answer | Location | Issue |
|----------|--------|----------|-------|
| How many patients is doctor "taking care of"? | All patients with ≥1 appointment | [route.ts L70](app/api/doctors/me/patients/route.ts#L70) | No distinction between active/inactive |
| How is relationship stored? | Via Appointment.doctor_id foreign key | Schema: Appointment model | No explicit assignment table |
| When does patient appear in list? | Immediately after first appointment | Auto via relation | Can't be removed |
| When does patient disappear? | Never (indefinitely) | Current behavior | Created 2 years ago but no way to "un-assign" |
| Is there "active care" tracking? | No | N/A | Need DoctorPatientAssignment table |
| Can patient be under multiple doctors? | Yes (implicitly, via multiple appointments) | Appointments L-join | But no explicit assignment UI |

