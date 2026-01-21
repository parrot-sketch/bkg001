# Patient Consultation Workflow Audit & Redesign

**Date:** January 2025  
**Type:** Critical Product Audit  
**Scope:** Patient-side consultation request flow

---

## Executive Summary

The current patient consultation flow incorrectly frames clinical operations as marketing "inquiries." This creates conceptual confusion, poor user experience, and misalignment with real aesthetic clinic operations.

**Core Problem:** The system mixes **website marketing concepts** (inquiries, lead capture) with **clinical operations** (consultation requests, appointments, scheduling).

---

## Part 1: Critical Audit Findings

### 1.1 Terminology Confusion

#### Current State:
- **Page Title:** "Submit an Inquiry"
- **URL:** `/portal/book-consultation`
- **Status Labels:** "Inquiry Received", "Under Review"
- **Success Message:** "Your consultation request has been received"

#### Problems:
1. **"Inquiry" is a marketing/website term** - The client website already handles inquiries. This is not an inquiry system.
2. **Inconsistent naming** - The UI says "inquiry" but the backend creates `ConsultationRequestStatus.SUBMITTED` and `Appointment` entities.
3. **Patient confusion** - Patients may think they're submitting a generic website form, not a clinical consultation request.

#### Why This Matters:
- **Medico-legal clarity** - Clinical requests need clear, unambiguous language.
- **User mental model** - Patients should understand they're engaging with clinical operations, not marketing.
- **Operational clarity** - Staff need to clearly distinguish website enquiries from clinical requests.

---

### 1.2 Step-by-Step Flow Analysis

#### Current 7-Step Flow:

**Step 1: Identity**
- **Current:** "Let's get started" / "Confirm your information"
- **Problem:** User is already logged in - why collect identity again? This is redundant.
- **Issue:** Feels like a marketing funnel, not a clinical intake.

**Step 2: Reason for Visit**
- **Current:** "What brings you in?" with service cards
- **Problem:** 
  - Marketing copy ("What brings you in?")
  - Service cards with "Learn more" links to website
  - Mixes sales language with clinical intent
- **Issue:** This is clinical documentation, not a sales pitch.

**Step 3: Preferred Doctor**
- **Current:** "Select a surgeon" (required)
- **Problem:** Actually creates an appointment with doctor, but labeled as "preference"
- **Issue:** Confusion between "preference" (soft) vs "assignment" (hard).

**Step 4: Appointment Request**
- **Current:** "When would you like to visit?"
- **Problem:** Uses "preferred date" language, but backend creates Appointment with PENDING status
- **Issue:** Misleads patient - this isn't a confirmed appointment yet.

**Step 5: Basic Medical Safety**
- **Current:** "A few safety questions"
- **Problem:** 
  - These questions are critical clinical intake, not "a few" casual questions
  - Should be part of proper intake, not a marketing step
- **Issue:** Minimizes clinical importance.

**Step 6: Consent**
- **Current:** "Final details" with multiple consents
- **Problem:** Consents are medico-legally critical but framed as "final details"
- **Issue:** Undermines legal importance.

**Step 7: Confirmation**
- **Current:** "Review Your Inquiry"
- **Problem:** Still calls it "inquiry"
- **Issue:** Reinforces wrong conceptual model.

---

### 1.3 Conceptual Model Violations

#### The System Actually Does:
1. Creates an `Appointment` entity with `AppointmentStatus.PENDING`
2. Sets `consultation_request_status = SUBMITTED`
3. Sends notification to Frontdesk for review
4. Requires frontdesk approval before scheduling

#### What Patients Think It Does:
1. Submit a generic "inquiry" (like website contact form)
2. Wait for someone to "get back to them"
3. Maybe get scheduled later

#### The Gap:
- **System:** Clinical consultation request workflow
- **UI Language:** Marketing inquiry flow
- **Result:** Misaligned expectations and poor UX

---

### 1.4 When Does a User Become a "Patient"?

**Current State:**
- User signs up → Creates User account
- Patient profile exists separately (optional)
- Consultation request creates Appointment even without full patient profile

**Problem:**
- No clear boundary between "User" and "Patient"
- Consultation requests require patient profile to exist, but profile completion is optional
- Creates confusion about when clinical records begin

**Clinical Reality:**
- A "patient" is someone who has requested or received clinical services
- Patient records begin with first clinical interaction
- Profile completion can happen incrementally, but patient identity should be established at first consultation request

---

### 1.5 Workflow Stage Confusion

**What Should Be Clear:**
- **Request Stage:** Patient expresses intent → System creates consultation request
- **Review Stage:** Frontdesk reviews → Approves/Requests more info
- **Scheduling Stage:** Frontdesk schedules appointment → Patient confirms
- **Intake Stage:** Patient completes intake forms before appointment
- **Consultation Stage:** Live clinical consultation happens

**Current Problems:**
- Steps 1-6 mix request, intake, and consent collection
- No clear separation between "request" and "intake"
- Medical safety questions collected during request (wrong stage)
- Profile data collected during request (should be separate)

---

## Part 2: Redesigned Conceptual Model

### 2.1 Clear Stage Separation

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: CONSULTATION REQUEST                               │
│ ─────────────────────────────────────────────────────────── │
│ Purpose: Patient expresses clinical intent                  │
│ When: Patient wants to see a surgeon                        │
│ What: Basic intent, preferred surgeon, date preference      │
│ Result: Consultation request created (SUBMITTED)            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: FRONTDESK REVIEW                                   │
│ ─────────────────────────────────────────────────────────── │
│ Purpose: Clinical team evaluates request                    │
│ When: After request submission                              │
│ What: Review patient info, approve or request clarification │
│ Result: APPROVED or NEEDS_MORE_INFO                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: SCHEDULING                                         │
│ ─────────────────────────────────────────────────────────── │
│ Purpose: Assign confirmed appointment                       │
│ When: After approval                                        │
│ What: Frontdesk schedules appointment, patient confirms     │
│ Result: SCHEDULED → CONFIRMED                               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: PRE-CONSULTATION INTAKE                            │
│ ─────────────────────────────────────────────────────────── │
│ Purpose: Collect clinical intake data                       │
│ When: After appointment confirmed, before consultation      │
│ What: Medical history, safety screening, consents           │
│ Result: Patient file ready for consultation                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 5: CONSULTATION                                       │
│ ─────────────────────────────────────────────────────────── │
│ Purpose: Live clinical consultation                         │
│ When: At scheduled appointment time                         │
│ What: Surgeon conducts consultation, documents findings     │
│ Result: Consultation completed, outcome documented          │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Terminology Correction

| Current (Wrong) | Corrected |
|-----------------|-----------|
| "Submit an Inquiry" | "Request a Consultation" |
| "Inquiry Received" | "Request Submitted" or "Request Received" |
| "What brings you in?" | "What would you like to discuss?" |
| "When would you like to visit?" | "Preferred Consultation Date" |
| "A few safety questions" | "Medical Screening" |
| "Final details" | "Consent & Acknowledgment" |
| "Review Your Inquiry" | "Review Your Request" |

---

### 2.3 When User Becomes Patient

**Clear Boundary:**
- **User:** Has authenticated account
- **Patient:** Has submitted first consultation request OR has been registered as patient by frontdesk

**Implication:**
- First consultation request creates Patient record if it doesn't exist
- User authentication is separate from patient registration
- Patient identity begins with first clinical intent

---

### 2.4 Corrected Step Flow

#### Consultation Request (Request Stage Only)

**Step 1: Clinical Intent**
- "What would you like to discuss?"
- Primary concern/area of interest
- No service cards with marketing links
- Clinical language only

**Step 2: Surgeon Selection**
- "Select your preferred surgeon"
- Clear: "Our team will confirm availability"
- Required field

**Step 3: Preferred Date & Time**
- "Preferred Consultation Date"
- "Time Preference"
- Clear: "We will confirm the exact time after review"

**Step 4: Additional Context**
- Optional notes
- Any specific questions or concerns

**Step 5: Consent & Acknowledgment**
- Contact consent
- Privacy consent
- Acknowledgment: "This is a consultation request, not a confirmed appointment"

**Step 6: Review & Submit**
- Review all entered information
- Submit consultation request

**What Moves OUT:**
- Identity collection (already known from login)
- Medical safety questions (belongs in intake stage)
- Full medical history (belongs in intake stage)

---

## Part 3: Concrete Recommendations

### 3.1 Route & Naming Changes

#### Current Routes:
```
/portal/book-consultation  → "Submit an Inquiry"
```

#### Proposed Routes:
```
/patient/consultations/request  → "Request a Consultation"
/patient/consultations          → "My Consultation Requests"
```

#### Component Naming:
- `BookConsultationPage` → `RequestConsultationPage`
- `submitConsultationRequest` → `createConsultationRequest` (backend already correct)

---

### 3.2 UI Text Changes

#### Page Header:
**Current:**
```tsx
<h1>Submit an Inquiry</h1>
<p>Share your preferences and we'll guide you through the next steps</p>
```

**Corrected:**
```tsx
<h1>Request a Consultation</h1>
<p>Tell us what you'd like to discuss with our surgical team</p>
```

#### Step Labels:
**Current:** "Step X of 7"  
**Corrected:** "Step X of 6" (after removing identity step)

#### Status Labels:
**Current:** Uses "Inquiry Received"  
**Corrected:** Use `getConsultationRequestStatusLabel()` which already has correct labels (but needs UI update)

---

### 3.3 Domain Model Gaps

#### Current State:
- ✅ `ConsultationRequestStatus` enum exists and is well-designed
- ✅ `Appointment` entity has `consultation_request_status` field
- ✅ State machine transitions are correct

#### No New Domain Concepts Needed:
The backend model is actually correct. The problem is purely:
1. **UI/UX terminology** (calling it "inquiry")
2. **Step composition** (mixing request with intake)
3. **User mental model** (marketing vs clinical)

---

### 3.4 Implementation Priority

#### Phase 1: Critical (Immediate)
1. ✅ Rename page title: "Submit an Inquiry" → "Request a Consultation"
2. ✅ Update all UI text to use clinical language
3. ✅ Remove identity collection step (Step 1)
4. ✅ Remove medical safety questions (move to intake)

#### Phase 2: Important (Next)
5. ✅ Update route: `/portal/book-consultation` → `/patient/consultations/request`
6. ✅ Create separate intake flow (post-scheduling)
7. ✅ Update status display components to use clinical language

#### Phase 3: Polish (Later)
8. ✅ Update email templates
9. ✅ Update notification text
10. ✅ Update dashboard labels

---

## Part 4: Implementation Example

See `CONSULTATION_REQUEST_REFACTOR.md` for concrete code changes.

---

## Conclusion

The current system correctly implements a consultation request workflow at the backend level. The critical failure is in **user experience and terminology**, where marketing language ("inquiry") is used instead of clinical language ("consultation request").

**Fix Priority:** HIGH  
**Complexity:** LOW (mostly text changes)  
**Impact:** HIGH (clarity, trust, legal defensibility)

---

**Next Steps:**
1. Review and approve this audit
2. Implement Phase 1 changes
3. User test the corrected flow
4. Roll out remaining phases
