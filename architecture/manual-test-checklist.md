# Manual Test Checklist

## Executive Summary

Comprehensive manual test checklist for clinical acceptance testing of the migrated consultation room.

**Date:** 2026-07-25  
**Status:** READY FOR EXECUTION  
**Estimated Duration:** 45-60 minutes  
**Tester:** Clinical + Engineering

---

## 1. Pre-Test Setup

### 1.1 Environment

- [ ] Backend running on port 3000
- [ ] Database seeded with test data
- [ ] Doctor account created: `doctor@test.com` / `password123`
- [ ] At least 3 patients in queue with status CHECKED_IN
- [ ] At least 1 completed consultation with notes
- [ ] At least 1 active consultation with notes
- [ ] Browser console open (F12)
- [ ] Network tab open
- [ ] React DevTools installed

### 1.2 Test Data Requirements

| Data Type | Count | Notes |
|-----------|-------|-------|
| Doctor users | 1+ | Must have `doctor` role |
| Patients | 5+ | With demographics |
| Appointments | 3+ | CHECKED_IN, IN_CONSULTATION, COMPLETED |
| Completed consultations | 1+ | With structured notes |
| Active consultations | 1+ | With notes and vitals |
| Billing records | 1+ | For completion dialog |

---

## 2. Scenario 1: Open Consultation (Active Patient)

### 2.1 Steps

1. Log in as doctor
2. Navigate to `/doctor/consultations/session/{activeAppointmentId}`
3. Observe loading state
4. Wait for data to load

### 2.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Loading spinner | Shows briefly | ☐ |
| Patient name | Displays in header | ☐ |
| Vitals | All fields populated (temp, BP, HR, RR, SpO2, Wt, Ht) | ☐ |
| Notes tabs | 4 tabs visible (Subjective, Objective, Assessment, Plan) | ☐ |
| Existing notes | Loaded from consultation record | ☐ |
| Timer | Shows elapsed time | ☐ |
| Queue panel | Shows waiting patients | ☐ |
| Start dialog | NOT visible | ☐ |
| Complete dialog | NOT visible | ☐ |
| Console | No errors | ☐ |

### 2.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Loading spinner | Shows briefly | | ☐ |
| Patient name | Displays in header | | ☐ |
| Vitals | All fields populated | | ☐ |
| Notes tabs | 4 tabs visible | | ☐ |
| Existing notes | Loaded from consultation | | ☐ |
| Timer | Shows elapsed time | | ☐ |
| Queue panel | Shows waiting patients | | ☐ |
| Start dialog | NOT visible | | ☐ |
| Complete dialog | NOT visible | | ☐ |
| Console | No errors | | ☐ |

---

## 3. Scenario 2: Open Consultation (New Patient)

### 3.1 Steps

1. Navigate to `/doctor/consultations/session/{newAppointmentId}`
2. Observe loading state
3. Wait for data to load

### 3.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Loading spinner | Shows briefly | ☐ |
| Start dialog | Visible (if CHECKED_IN) | ☐ |
| Workflow state | READY | ☐ |
| Notes | Empty (no existing consultation) | ☐ |
| Queue | Shows other waiting patients | ☐ |

### 3.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Loading spinner | Shows briefly | | ☐ |
| Start dialog | Visible | | ☐ |
| Workflow state | READY | | ☐ |
| Notes | Empty | | ☐ |
| Queue | Shows patients | | ☐ |

---

## 4. Scenario 3: Start Consultation

### 4.1 Steps

1. Open consultation for CHECKED_IN patient
2. Start dialog appears
3. Click "Begin Consultation"
4. Observe transition

### 4.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Dialog content | Patient info, optional notes | ☐ |
| API call | POST to start consultation | ☐ |
| Dialog closes | After success | ☐ |
| Workflow | Transitions to ACTIVE | ☐ |
| Timer | Begins counting | ☐ |
| Complete button | Appears in header | ☐ |
| Queue | Updates if needed | ☐ |

### 4.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Dialog content | Patient info visible | | ☐ |
| API call | POST success | | ☐ |
| Dialog closes | After success | | ☐ |
| Workflow | ACTIVE | | ☐ |
| Timer | Counting | | ☐ |
| Complete button | Visible | | ☐ |
| Queue | Updated | | ☐ |

---

## 5. Scenario 4: Documentation Editing

### 5.1 Steps

1. Open active consultation
2. Type in Subjective tab
3. Switch to Objective tab
4. Type in Objective tab
5. Wait for autosave
6. Click "Save Notes"
7. Refresh page

### 5.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Dirty indicator | Dot appears on tab | ☐ |
| Autosave | Status changes: idle → saving → saved → idle | ☐ |
| Manual save | Button works, shows "Notes saved" toast | ☐ |
| After refresh | Notes persist | ☐ |

### 5.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Dirty indicator | | | ☐ |
| Autosave | | | ☐ |
| Manual save | | | ☐ |
| After refresh | | | ☐ |

---

## 6. Scenario 5: Completion

### 6.1 Steps

1. Open active consultation with notes
2. Add notes to all 4 sections
3. Click "Complete"
4. Review completion dialog
5. Add optional doctor notes
6. Click "Finalize"
7. Observe redirect

### 6.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Dialog opens | CompleteConsultationDialog visible | ☐ |
| Checklist | All 4 sections marked complete | ☐ |
| Summary | Auto-generated from notes | ☐ |
| Billing | Shows existing billing if any | ☐ |
| Warnings | Shows missing data warnings | ☐ |
| API call | POST completeConsultation | ☐ |
| Success toast | "Documentation finalized" | ☐ |
| Redirect | Navigate to /doctor/consultations | ☐ |
| Draft cleanup | localStorage cleared | ☐ |

### 6.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Dialog opens | | | ☐ |
| Checklist | | | ☐ |
| Summary | | | ☐ |
| Billing | | | ☐ |
| Warnings | | | ☐ |
| API call | | | ☐ |
| Success toast | | | ☐ |
| Redirect | | | ☐ |
| Draft cleanup | | | ☐ |

---

## 7. Scenario 6: Queue Navigation

### 7.1 Steps

1. Open active consultation
2. Open queue panel
3. Click next patient in queue
4. Confirm switch
5. Observe new patient data

### 7.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Confirmation dialog | Shows current + next patient | ☐ |
| Draft save | Auto-saves current notes | ☐ |
| New patient data | Loads correctly | ☐ |
| Old notes | NOT visible | ☐ |
| Timer | Resets for new patient | ☐ |
| Queue | Updates | ☐ |

### 7.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Confirmation dialog | | | ☐ |
| Draft save | | | ☐ |
| New patient data | | | ☐ |
| Old notes | | | ☐ |
| Timer | | | ☐ |
| Queue | | | ☐ |

---

## 8. Scenario 7: Refresh Recovery

### 8.1 Steps

1. Open active consultation with notes
2. Edit notes
3. Wait for autosave
4. Refresh browser
5. Observe restored state

### 8.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Page reloads | Returns to same consultation | ☐ |
| Notes restored | Edits preserved | ☐ |
| Workflow state | Correct (ACTIVE) | ☐ |
| Timer | Correct elapsed time | ☐ |
| Queue | Same queue | ☐ |

### 8.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Page reloads | | | ☐ |
| Notes restored | | | ☐ |
| Workflow state | | | ☐ |
| Timer | | | ☐ |
| Queue | | | ☐ |

---

## 9. Scenario 8: Error Recovery

### 9.1 Steps

1. Open DevTools Network tab
2. Throttle to "Offline"
3. Try to start consultation
4. Re-enable network
5. Retry
6. Force save failure (mock API)

### 9.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Offline error | Toast: "Network unavailable" | ☐ |
| Error state | Shown to user | ☐ |
| Network restored | Can retry successfully | ☐ |
| Save error | "Retry save" button appears | ☐ |
| Workflow | Remains consistent | ☐ |

### 9.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Offline error | | | ☐ |
| Error state | | | ☐ |
| Network restored | | | ☐ |
| Save error | | | ☐ |
| Workflow | | | ☐ |

---

## 10. Scenario 9: Multiple Tabs

### 10.1 Steps

1. Open consultation in Tab A
2. Open same consultation in Tab B
3. Edit notes in Tab A
4. Wait for autosave
5. Check Tab B localStorage
6. Close Tab A
7. Verify Tab B unaffected

### 10.2 Expected Results

| Check | Expected | Pass |
|-------|----------|------|
| Both tabs load | Same consultation | ☐ |
| Draft sync | Tab B can see Tab A's draft | ☐ |
| Tab A close | Tab B continues working | ☐ |
| No crashes | Both tabs stable | ☐ |

### 10.3 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| Both tabs load | | | ☐ |
| Draft sync | | | ☐ |
| Tab A close | | | ☐ |
| No crashes | | | ☐ |

---

## 11. Console Audit

### 11.1 During All Scenarios

| Check | Expected | Pass |
|-------|----------|------|
| No TypeError | All property accesses safe | ☐ |
| No undefined access | No null/undefined crashes | ☐ |
| No React warnings | No development warnings | ☐ |
| No unhandled rejections | All promises handled | ☐ |
| No infinite renders | No maximum depth exceeded | ☐ |

### 11.2 Actual Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| No TypeError | | | ☐ |
| No undefined access | | | ☐ |
| No React warnings | | | ☐ |
| No unhandled rejections | | | ☐ |
| No infinite renders | | | ☐ |

---

## 12. Test Sign-Off

| Tester | Date | Scenarios Completed | Regressions Found | GO/NO-GO |
|--------|------|---------------------|-------------------|----------|
| | | | | |

**Overall Result:** ☐ GO ☐ GO WITH FIXES ☐ NO GO
