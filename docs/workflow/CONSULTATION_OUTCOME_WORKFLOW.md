# Consultation Outcome Workflow Design

**Last Updated:** January 2025

## Overview

The consultation is the entry point for all patient journeys. However, **not every consultation leads to a procedure**. This document outlines how consultation outcomes should branch into different workflows based on realistic clinical scenarios.

---

## Consultation Completion: The Decision Point

When a doctor completes a consultation, they need to capture:

1. **Clinical Assessment** - What was discussed, examined, analyzed
2. **Recommendation** - What the doctor recommends next
3. **Patient Decision** - Whether patient wants to proceed (may be pending)
4. **Next Steps** - What action should be taken

---

## Consultation Outcome Types

### 1. **PROCEDURE_RECOMMENDED** ✅ → Leads to Case Planning
**Scenario:** Doctor examined patient, recommended a procedure (e.g., rhinoplasty, breast augmentation, liposuction)

**Characteristics:**
- Patient is a good candidate
- Procedure is appropriate
- Patient interested but decision may be pending
- Requires pre-surgical planning

**Next Workflow Steps:**
1. ✅ Create **CasePlan** record (linked to appointment/patient)
2. ✅ Initialize readiness status: `NOT_STARTED` or `PENDING_REVIEW`
3. ✅ Add to **Theatre Schedule View** (shows as "Needs Planning")
4. ✅ Doctor dashboard shows: "Plan Case" action
5. ⏳ Wait for patient decision (may need consent/signing)
6. 📋 Once decided: Full case planning workflow begins

**What Happens:**
- Case Plan workspace becomes accessible
- Doctor can document procedure plan, risk factors, pre-op notes
- System tracks readiness (labs, consent, imaging)
- Once "READY" → Appears in theatre schedule for surgery day
- Post-surgery → Moves to post-op monitoring workflow

---

### 2. **CONSULTATION_ONLY** ✅ → No Procedure, Just Discussion
**Scenario:** Patient came for advice, doesn't need/want procedure, or not a candidate

**Characteristics:**
- No procedure recommended
- Patient questions answered
- May provide general advice/recommendations
- Appointment is complete, no follow-up needed

**Next Workflow Steps:**
1. ✅ Consultation marked as complete
2. ✅ No case plan created
3. ✅ No theatre scheduling needed
4. ✅ May create general notes/records
5. ✅ Patient may book another consultation in future if needed

**What Happens:**
- Consultation closed
- Patient can see completed consultation in history
- System tracks this as "consultation-only" outcome
- No case planning or surgical workflow triggered

---

### 3. **FOLLOW_UP_CONSULTATION_NEEDED** ⏳ → Schedule Another Consult
**Scenario:** Need more time to assess, patient needs to prepare (lose weight, medical clearance), or complex case requiring multiple consultations

**Characteristics:**
- Initial assessment done but decision deferred
- Patient needs time to decide
- Additional medical workup needed
- Procedure may happen later after follow-up

**Next Workflow Steps:**
1. ✅ Schedule follow-up consultation appointment
2. ✅ Consultation marked as "First Consultation" / "Initial Assessment"
3. ⏳ Wait for follow-up consultation
4. 📋 Follow-up consultation may then lead to:
   - PROCEDURE_RECOMMENDED → Case Planning workflow
   - CONSULTATION_ONLY → Close
   - Another FOLLOW_UP_CONSULTATION_NEEDED

**What Happens:**
- New consultation appointment created (linked to original)
- Both consultations visible in patient history
- Follow-up consultation can reference initial consultation notes
- Once follow-up complete, may branch to procedure workflow

---

### 4. **PATIENT_DECIDING** ⏳ → Waiting for Patient Decision
**Scenario:** Doctor recommended procedure, gave quote/timeline, patient needs time to think

**Characteristics:**
- Procedure recommended
- Patient interested but needs time
- May need to discuss with family
- May need to arrange finances
- No immediate action required

**Next Workflow Steps:**
1. ✅ Create **CasePlan** in draft/pending state
2. ✅ Mark readiness: `PENDING_PATIENT_DECISION`
3. ✅ Doctor can prepare case plan while waiting
4. ⏳ Patient makes decision later (via portal or next visit)
5. 📋 Once patient decides "Yes":
   - Update CasePlan to active
   - Continue to full case planning workflow
6. 📋 If patient decides "No":
   - Mark case plan as `CANCELLED` or `DECLINED`
   - Archive case plan
   - Consultation remains completed

**What Happens:**
- Case Plan exists but is "pending decision"
- Doctor can prep materials while waiting
- System tracks: "Waiting for patient decision"
- Once decision made → Activates or cancels workflow

---

### 5. **REFERRAL_NEEDED** 🔄 → Refer to Another Doctor/Service
**Scenario:** Outside doctor's expertise, needs specialist, or another service required

**Characteristics:**
- Patient needs different specialist
- Procedure not available at this clinic
- Requires referral to external provider
- May come back later, or may not

**Next Workflow Steps:**
1. ✅ Record referral details (doctor, reason, contact info)
2. ✅ Consultation marked as complete with referral
3. ✅ May or may not create case plan (depends on if patient returns)
4. ⏳ Track if patient returns after referral
5. 📋 If patient returns → May branch to PROCEDURE_RECOMMENDED

**What Happens:**
- Referral information recorded
- Consultation closed with referral note
- Patient can see referral in history
- System can track referral outcomes

---

## Workflow State Machine

```
CONSULTATION (Appointment Status: SCHEDULED)
    ↓
DOCTOR COMPLETES CONSULTATION
    ↓
OUTCOME SELECTION:
    ├─→ PROCEDURE_RECOMMENDED
    │       ↓
    │   Create CasePlan (NOT_STARTED)
    │       ↓
    │   [If Patient Decided] → Case Planning Workflow
    │       ↓
    │   Theatre Schedule → Surgery → Post-Op Monitoring
    │
    ├─→ CONSULTATION_ONLY
    │       ↓
    │   Close Consultation
    │       ↓
    │   Complete (no further action)
    │
    ├─→ FOLLOW_UP_CONSULTATION_NEEDED
    │       ↓
    │   Schedule Follow-Up Appointment
    │       ↓
    │   Wait for Follow-Up → Repeat Consultation Flow
    │
    ├─→ PATIENT_DECIDING
    │       ↓
    │   Create CasePlan (PENDING_PATIENT_DECISION)
    │       ↓
    │   Wait for Patient Decision
    │       ↓
    │   [Yes] → Case Planning Workflow
    │   [No] → Archive/Cancel CasePlan
    │
    └─→ REFERRAL_NEEDED
            ↓
        Record Referral
            ↓
        Close Consultation (with referral note)
```

---

## Data Model Implications

### Consultation Outcome Entity/Enum

```typescript
enum ConsultationOutcomeType {
  PROCEDURE_RECOMMENDED = 'PROCEDURE_RECOMMENDED',      // → Case Planning
  CONSULTATION_ONLY = 'CONSULTATION_ONLY',              // → Close
  FOLLOW_UP_CONSULTATION_NEEDED = 'FOLLOW_UP_CONSULTATION_NEEDED', // → Schedule Follow-Up
  PATIENT_DECIDING = 'PATIENT_DECIDING',                // → Wait for Decision
  REFERRAL_NEEDED = 'REFERRAL_NEEDED',                  // → Record Referral
}
```

### CasePlan State Machine

```typescript
enum CasePlanStatus {
  PENDING_DECISION = 'PENDING_DECISION',        // Patient deciding
  NOT_STARTED = 'NOT_STARTED',                  // Needs planning
  IN_PLANNING = 'IN_PLANNING',                  // Doctor working on it
  PENDING_LABS = 'PENDING_LABS',                // Waiting for test results
  PENDING_CONSENT = 'PENDING_CONSENT',          // Waiting for consent
  READY = 'READY',                              // Ready for surgery
  ON_HOLD = 'ON_HOLD',                          // Temporarily paused
  CANCELLED = 'CANCELLED',                      // Patient declined/cancelled
  SURGERY_SCHEDULED = 'SURGERY_SCHEDULED',      // Surgery date set
  SURGERY_COMPLETED = 'SURGERY_COMPLETED',      // Moved to post-op
}
```

---

## Real-World Scenarios

### Scenario 1: Straightforward Procedure Recommendation
**Flow:**
1. Consultation → Doctor examines, discusses options
2. Outcome: `PROCEDURE_RECOMMENDED`
3. Patient decides immediately: "Yes, I want rhinoplasty"
4. CasePlan created → `IN_PLANNING`
5. Doctor plans case (procedure details, risks, consent)
6. Labs ordered, consent obtained
7. CasePlan → `READY`
8. Surgery scheduled → `SURGERY_SCHEDULED`
9. Surgery day → Theatre Schedule
10. Post-surgery → Post-Op Monitoring

### Scenario 2: Patient Needs Time
**Flow:**
1. Consultation → Doctor recommends breast augmentation
2. Outcome: `PROCEDURE_RECOMMENDED` with patient decision: `PENDING`
3. CasePlan created → `PENDING_DECISION`
4. Doctor can still prep materials (optional)
5. Patient decides 2 weeks later via portal: "Yes"
6. CasePlan → `IN_PLANNING` (activates)
7. Continue to case planning workflow...

### Scenario 3: Multiple Consultations
**Flow:**
1. First Consultation → `FOLLOW_UP_CONSULTATION_NEEDED`
2. Schedule follow-up in 1 month (after patient loses weight)
3. Follow-up Consultation
4. Outcome: `PROCEDURE_RECOMMENDED`
5. CasePlan created → Continue workflow...

### Scenario 4: Consultation Only (No Procedure)
**Flow:**
1. Consultation → Patient asks about Botox for wrinkles
2. Doctor explains options, provides general advice
3. Outcome: `CONSULTATION_ONLY`
4. Consultation closed
5. Patient may book procedure appointment separately in future
6. No case plan created

---

## Key Design Principles

### 1. **Flexibility**
- Not every consultation leads to surgery
- Patient may change mind
- Multiple consultations before decision is normal
- System should support all paths

### 2. **State Tracking**
- Clear visibility of where each case is in the workflow
- Doctor dashboard shows next actions needed
- Patient can see their journey status

### 3. **Non-Linear Workflows**
- Patient may need multiple consultations
- Decision can come days/weeks after consultation
- Case planning can happen while waiting for decision
- Surgery may be scheduled months in advance

### 4. **Data Integrity**
- Consultation notes always preserved
- CasePlan linked to originating consultation
- Multiple consultations can reference each other
- Post-op outcomes linked back to case plan and consultation

---

## UI/UX Implications

### Doctor Dashboard After Consultation Completion:

**When Completing Consultation:**
- Doctor selects outcome type (dropdown/radio)
- If `PROCEDURE_RECOMMENDED` → Optionally ask: "Has patient decided?"
  - Yes → Immediately create CasePlan, show "Plan Case" button
  - No/Not sure → Create CasePlan with `PENDING_DECISION`, show "Waiting for Decision"

**Dashboard Shows:**
- **Cases Needing Planning** (PROCEDURE_RECOMMENDED + decision made)
- **Waiting for Patient Decision** (PATIENT_DECIDING)
- **Ready for Surgery** (CasePlan status = READY)
- **Today's Surgeries** (SURGERY_SCHEDULED for today)

### Patient Portal:
- See consultation outcome
- If `PATIENT_DECIDING` → "Make Decision" button
- If `FOLLOW_UP_CONSULTATION_NEEDED` → See scheduled follow-up
- If `PROCEDURE_RECOMMENDED` + decision made → See case planning progress

---

## Questions to Resolve

1. **CasePlan Creation Timing:**
   - ✅ Create immediately when PROCEDURE_RECOMMENDED?
   - ✅ Or only when patient decides "Yes"?
   - **Recommendation:** Create immediately, mark as `PENDING_DECISION` if patient hasn't decided. Doctor can prep materials while waiting.

2. **Multiple Consultations:**
   - ✅ Should CasePlan link to latest consultation or all consultations?
   - **Recommendation:** Link to all related consultations (consultation chain)

3. **Follow-Up Consultation Workflow:**
   - ✅ Should follow-up consultation reference original consultation?
   - ✅ Can outcome change from original?
   - **Recommendation:** Yes, link consultations. Outcome can change (e.g., first was PATIENT_DECIDING, follow-up becomes PROCEDURE_RECOMMENDED)

4. **Cancelled/Declined Procedures:**
   - ✅ What happens to CasePlan if patient declines?
   - **Recommendation:** Mark as `CANCELLED`, keep for records, don't delete

5. **Partial Planning:**
   - ✅ Can doctor start planning case even if patient hasn't decided?
   - **Recommendation:** Yes, allow draft/save. Finalize when patient decides.

---

## Next Steps for Implementation

1. **Create ConsultationOutcomeType enum** in domain layer
2. **Extend CompleteConsultationDto** to include:
   - `outcomeType: ConsultationOutcomeType`
   - `patientDecision?: 'YES' | 'NO' | 'PENDING'`
   - `procedureRecommended?: { procedureType: string, urgency: string }`
   - `referralInfo?: { doctorName, reason, contactInfo }`
3. **Update CompleteConsultationUseCase** to:
   - Create CasePlan when `PROCEDURE_RECOMMENDED`
   - Handle different outcome types appropriately
   - Schedule follow-up if needed
   - Record referral if needed
4. **Update UI Components:**
   - Complete Consultation Dialog → Add outcome type selection
   - Doctor Dashboard → Show appropriate next actions based on outcome
   - Patient Portal → Show decision prompts if `PATIENT_DECIDING`

---

## Summary

The consultation is the **entry point**, but it branches into multiple paths:
- **Most common:** `PROCEDURE_RECOMMENDED` → Leads to Case Planning → Surgery → Post-Op
- **Some cases:** `CONSULTATION_ONLY` → Consultation ends, no further workflow
- **Complex cases:** `FOLLOW_UP_CONSULTATION_NEEDED` → Multiple consultations before decision
- **Realistic:** `PATIENT_DECIDING` → Patient needs time, system tracks decision

The key is **capturing the outcome type at consultation completion**, which then determines what workflow path to follow.
