# Clinical Realism Audit & Refinement Plan

**Date:** January 2025  
**Phase:** Clinical Workflow Refinement  
**Goal:** Transform system from "generic scheduling app" to "surgeon's clinical assistant"

---

## Executive Summary

This audit identifies where the current implementation feels "software-driven" rather than "clinic-driven" and proposes concrete refinements to make the system feel like it understands how an aesthetic surgery clinic actually operates.

**Core Mental Model:**
- This is a **surgeon's personal clinical assistant**
- This is a **front-desk surgical coordinator**
- This is a **medico-legal documentation system**
- This is a **consultation intelligence system**

**NOT:**
- A generic scheduling app
- A hospital EHR clone
- A startup admin panel

---

## 1. Workflow Mismatches Identified

### 1.1 Consultation Flow Issues

**Current State:**
- Doctor sees appointments in generic list
- No indication of "consultation readiness" before starting
- No assistant-prepared brief
- Doctor must dig through patient data to understand context
- Tabs feel like developer grouping, not clinical workflow

**Problems:**
1. ❌ **No Readiness Check**: Doctor can start consultation without knowing if patient completed intake, uploaded photos, or provided medical history
2. ❌ **No Clinical Summary**: Doctor must read through all patient data to understand primary concern
3. ❌ **Generic Language**: "Appointments", "Notes", "Status" - doesn't sound like clinical terminology
4. ❌ **Equal-Weight Inputs**: All tabs treated equally, no visual hierarchy for critical decisions
5. ❌ **No Assistant Context**: Frontdesk can't prepare a brief for the surgeon

**Real Clinic Behavior:**
- Assistant reviews patient file before consultation
- Assistant flags missing information (photos, intake forms)
- Assistant prepares brief: "Patient wants nose job, previously declined filler, anxious about cost"
- Surgeon sees one-glance summary before entering room
- Surgeon focuses on clinical thinking, not data entry

### 1.2 Role Boundary Issues

**Current State:**
- Frontdesk can review consultation requests ✅
- Frontdesk can check in patients ✅
- Frontdesk can see appointments ✅
- But: No clear distinction between what frontdesk prepares vs what surgeon does

**Problems:**
1. ❌ **No Preparation Layer**: Frontdesk can't add "assistant notes" that surgeon sees
2. ❌ **No Readiness Indicators**: Frontdesk can't mark "patient file ready" or "missing photos"
3. ❌ **Unclear Responsibilities**: UI doesn't communicate "who does what"
4. ❌ **Surgeon Can Do Everything**: Surgeon can check in patients, which is assistant's job

**Real Clinic Behavior:**
- Assistant prepares patient files
- Assistant collects missing information
- Assistant adds context notes for surgeon
- Surgeon reviews prepared file, then focuses on clinical work
- Clear separation: logistics (assistant) vs clinical (surgeon)

### 1.3 UI/UX Issues

**Current State:**
- Generic form fields
- Equal-weight tabs
- No visual hierarchy
- Software terminology ("Status", "Notes", "Appointments")

**Problems:**
1. ❌ **No Visual Hierarchy**: Critical decisions (recommendations, treatment plan) look same as data entry
2. ❌ **Generic Labels**: "Patient Goals" instead of "Chief Complaint"
3. ❌ **Too Many Textareas**: Everything is free text, no structured clinical thinking
4. ❌ **No Clinical Summary**: Surgeon must read everything to understand patient

**Real Clinic Behavior:**
- Surgeon sees summary first: "Primary concern: Nose shape, dorsal hump"
- Critical decisions are visually prominent
- Clinical language throughout
- Structured thinking (Chief Complaint → Examination → Assessment → Plan)

---

## 2. Proposed Refinements

### 2.1 Consultation Readiness Indicators

**Concept:** First-class "preparedness" tracking

**Indicators:**
- ✅/⚠️ **Intake Complete**: Patient completed intake form
- ✅/❌ **Photos Uploaded**: Patient uploaded before photos
- ✅/⚠️ **Medical History Complete**: Medical history provided
- ✅/❌ **Consent Acknowledged**: Required consents signed
- ✅/⚠️ **Assistant Brief Prepared**: Frontdesk added preparation notes

**Where It Appears:**
1. **Frontdesk Dashboard**: Shows which appointments need preparation
2. **Doctor Dashboard**: Shows readiness status before starting consultation
3. **Consultation Session**: Readiness banner at top if missing items
4. **Patient Info Sidebar**: Readiness indicators visible during consultation

**Impact:**
- Surgeon knows if patient is prepared
- Assistant knows what to collect
- Reduces consultation failures due to missing information

### 2.2 Clinical Summary Layer

**Concept:** One-glance consultation brief for surgeon

**Components:**
1. **Primary Concern Summary**
   - "Primary concern: Nose shape, dorsal hump"
   - "Previously declined filler, now considering surgical option"
   
2. **Patient Context**
   - "Uploaded 3 photos yesterday"
   - "First-time patient"
   - "Referred by Dr. Smith"

3. **Assistant-Prepared Brief**
   - "Patient anxious, price-sensitive"
   - "Wants to discuss recovery timeline"
   - "Has questions about scarring"

4. **Readiness Status**
   - Visual indicators for intake, photos, history, consent

**Where It Appears:**
- **Doctor Dashboard**: Before starting consultation
- **Consultation Session Header**: Always visible during consultation
- **Patient Info Sidebar**: Top section

**Impact:**
- Surgeon understands patient context immediately
- Reduces cognitive load
- Feels like real clinical workflow

### 2.3 Role-Aware Behavior

**Frontdesk (Assistant) Experience:**
- ✅ Review incoming consultation requests
- ✅ Approve/reschedule on surgeon's behalf
- ✅ Prepare patient files
- ✅ Collect missing information
- ✅ Add assistant notes for surgeon
- ✅ Mark file as "ready for consultation"
- ❌ Cannot finalize medico-legal decisions
- ❌ Cannot edit surgeon notes
- ❌ Cannot complete consultation

**Surgeon (Doctor) Experience:**
- ✅ See assistant-prepared brief
- ✅ See readiness indicators
- ✅ Focus on clinical thinking
- ✅ Make medico-legal decisions
- ✅ Finalize consultation notes
- ❌ Should not check in patients (assistant's job)
- ❌ Should not prepare files (assistant's job)

**UI Changes:**
- Different dashboards per role
- Clear "who does what" messaging
- Permission-based affordances
- Assistant can't see "Complete Consultation" button

### 2.4 UI Evolution: Form → Workstation

**Current (Form-like):**
- Equal tabs
- Generic labels
- No hierarchy
- Everything is input

**Proposed (Workstation-like):**
- **Header Section**: Clinical summary (always visible)
- **Primary Workspace**: Structured clinical thinking
  - Chief Complaint (prominent)
  - Examination (structured)
  - Assessment (decision-focused)
  - Plan (action-oriented)
- **Secondary Workspace**: Supporting information
  - Photos
  - Procedure discussion
  - Treatment plan
- **Visual Hierarchy**: Critical decisions are prominent
- **Clinical Language**: "Chief Complaint" not "Patient Goals"

---

## 3. Implementation Plan

### Phase 1: Readiness Indicators (High Impact)

**Data Model:**
- Add `consultation_readiness` to Appointment or Consultation
- Track: intake_complete, photos_uploaded, medical_history_complete, consent_acknowledged
- Add `assistant_prepared_brief` field

**UI Components:**
1. ReadinessIndicator component
2. ReadinessBadge component
3. ReadinessBanner component

**Where:**
- Frontdesk dashboard
- Doctor dashboard
- Consultation session header
- Patient info sidebar

### Phase 2: Clinical Summary Layer (High Impact)

**Components:**
1. ConsultationSummaryHeader component
   - Primary concern
   - Patient context
   - Assistant brief
   - Readiness status

**Where:**
- Doctor dashboard (before consultation)
- Consultation session (always visible)

### Phase 3: Role Refinement (Medium Impact)

**Changes:**
1. Frontdesk cannot access "Complete Consultation"
2. Frontdesk can add "assistant notes"
3. Doctor sees assistant notes prominently
4. Clear role messaging in UI

### Phase 4: UI Language & Hierarchy (Medium Impact)

**Changes:**
1. Rename "Patient Goals" → "Chief Complaint"
2. Make Recommendations tab more prominent
3. Add visual hierarchy to tabs
4. Use clinical terminology throughout

---

## 4. Success Criteria

A senior plastic surgeon or clinic manager reviewing this system should say:

✅ "This actually feels like it understands how our clinic runs."

**Specific Checks:**
1. ✅ Surgeon sees patient context immediately
2. ✅ Surgeon knows if patient is prepared
3. ✅ Assistant can prepare files for surgeon
4. ✅ Clear role boundaries
5. ✅ Clinical language throughout
6. ✅ Critical decisions are prominent
7. ✅ No cognitive overload
8. ✅ Feels like clinical workflow, not software

---

## 5. Implementation Priority

### Must Have (Implement First):
1. **Consultation Readiness Indicators** - Prevents consultation failures
2. **Clinical Summary Layer** - Reduces cognitive load
3. **Role-Aware Behavior** - Establishes workflow boundaries

### Should Have (Implement Second):
4. **UI Language Refinement** - Clinical terminology
5. **Visual Hierarchy** - Critical decisions prominent
6. **Assistant Brief System** - Frontdesk can prepare context

### Nice to Have (Future):
7. **Structured Clinical Thinking** - Templates for common procedures
8. **Photo Readiness Tracking** - Specific photo requirements per procedure
9. **Automated Readiness Checks** - System flags missing items

---

## 6. Risk Mitigation

**Risk:** Changes feel like "more buttons" instead of workflow improvement

**Mitigation:**
- Every change must answer: "Does this make surgeon's job easier?"
- Focus on reducing cognitive load, not adding features
- Test with real workflow scenarios

**Risk:** Over-engineering the readiness system

**Mitigation:**
- Start simple: boolean flags for key items
- Don't invent complex workflows
- Keep it clinic-driven, not software-driven

---

## Next Steps

1. ✅ Complete audit (this document)
2. ⏳ Implement Readiness Indicators
3. ⏳ Implement Clinical Summary Layer
4. ⏳ Refine Role Boundaries
5. ⏳ Refine UI Language & Hierarchy
6. ⏳ Test with real workflow scenarios
