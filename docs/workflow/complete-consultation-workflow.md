# Complete Consultation Workflow - Status & Navigation

**Date:** January 2025  
**Purpose:** Document the complete end-to-end consultation workflow with status transitions and navigation flow

---

## 🔄 Complete Workflow: Consultation Request → Confirmation

### **Flow Overview**

```
Patient Submits Request
    ↓
consultation_request_status = SUBMITTED
appointment.status = PENDING
    ↓
Frontdesk Reviews (as Doctor's PA)
    ↓
    ├─→ Approve & Schedule (proposedDate + proposedTime)
    │       ↓
    │   consultation_request_status = APPROVED (⚠️ ISSUE: Should be SCHEDULED)
    │   appointment.status = PENDING
    │       ↓
    │   Patient Confirms
    │       ↓
    │   consultation_request_status = CONFIRMED ✅
    │   appointment.status = SCHEDULED
    │
    ├─→ Request More Info
    │       ↓
    │   consultation_request_status = NEEDS_MORE_INFO
    │       ↓
    │   Patient Responds (resubmits)
    │       ↓
    │   consultation_request_status = SUBMITTED (back to review)
    │
    └─→ Reject
            ↓
        consultation_request_status = (unchanged)
        appointment.status = CANCELLED
```

---

## ⚠️ **CURRENT ISSUES & CLARIFICATIONS NEEDED**

### **Issue 1: Frontdesk Approval vs. Scheduling**

**Current Behavior:**
- Frontdesk "approves" → `consultation_request_status = APPROVED`
- Patient must then "confirm" → `consultation_request_status = CONFIRMED`

**Your Requirement:**
- When Frontdesk schedules (sets date/time), appointment should be **CONFIRMED immediately**
- Frontdesk is acting as Doctor's PA, so their scheduling = confirmation

**Question:** Should we:
- **Option A:** Remove "APPROVED" status entirely → Frontdesk "approve" directly sets `SCHEDULED` or `CONFIRMED`
- **Option B:** When Frontdesk approves with date/time → automatically set to `CONFIRMED` (skip patient confirmation)
- **Option C:** Rename workflow: "Approve" becomes "Schedule & Confirm" (one action)

---

### **Issue 2: Doctor Scheduling (as PA)**

**Your Requirement:**
- Doctor can also schedule appointments (acting as their own PA)
- When doctor schedules → `consultation_request_status = CONFIRMED` immediately

**Current State:**
- `ScheduleAppointmentUseCase` does NOT set `consultation_request_status`
- It only sets `appointment.status = PENDING`

**Needed:**
- When doctor schedules (via `/api/appointments` POST), set `consultation_request_status = CONFIRMED`
- OR: Doctor uses same review flow as frontdesk?

---

### **Issue 3: Patient Dashboard Navigation**

**Current Flow:**
1. Patient registers/logs in → `/portal/welcome`
2. If patient has profile → auto-redirects to `/patient/dashboard`
3. If no profile → stays on `/portal/welcome` (can complete profile or book consultation)

**Your Question:** 
> "When do patients go to their dashboards after they update their profile? Is that not the current patient intake?"

**Clarification Needed:**
- `/portal/profile` is **basic profile** (name, phone, optional fields) - NOT medical intake
- Patient **intake** is `/frontdesk/patient-intake` (for frontdesk to create medical records)
- After updating `/portal/profile` → should redirect to `/portal/welcome` or `/patient/dashboard`?

**Current Behavior:**
- `/portal/profile` has "Skip for Now" button → goes to `/portal/welcome`
- No auto-redirect after save (should we add?)

---

## ✅ **WHAT'S WORKING**

### **Logout Functionality**
- ✅ Logout button exists in `PatientSidebar` (bottom of sidebar)
- ✅ Uses `useAuth().logout()` which:
  - Calls API logout endpoint
  - Clears token storage
  - Redirects to `/patient/login`
- **If not visible:** Check that `PatientSidebar` is rendered in layout (it is in `/app/patient/layout.tsx`)

### **Status Transitions**
- ✅ Patient submit → `SUBMITTED`
- ✅ Frontdesk review → `APPROVED`, `NEEDS_MORE_INFO`, or `REJECTED`
- ✅ Patient confirm → `CONFIRMED`
- ✅ Status filtering works in API endpoints

---

## 📋 **REQUIRED FIXES**

### **1. Frontdesk Approval → Auto-Confirm (if scheduling)**

**Current Code:**
```typescript
// ReviewConsultationRequestUseCase.ts line 148
case 'approve':
  newConsultationStatus = ConsultationRequestStatus.APPROVED;
  // ... sets proposedDate/proposedTime
  // appointment.status = PENDING (still requires patient confirmation)
```

**Proposed Fix:**
```typescript
case 'approve':
  // If date/time provided, auto-confirm
  if (dto.proposedDate && dto.proposedTime) {
    newConsultationStatus = ConsultationRequestStatus.CONFIRMED;
    // appointment.status = SCHEDULED (no patient confirmation needed)
  } else {
    newConsultationStatus = ConsultationRequestStatus.APPROVED;
  }
```

---

### **2. Doctor Scheduling → Set CONFIRMED Status**

**Current:**
- `ScheduleAppointmentUseCase` does NOT set `consultation_request_status`
- Only sets `appointment.status = PENDING`

**Needed:**
- When doctor schedules appointment → set `consultation_request_status = CONFIRMED`
- Set `appointment.status = SCHEDULED`

---

### **3. Patient Profile Completion Redirect**

**Current:**
- `/portal/profile` saves → no redirect
- "Skip for Now" → goes to `/portal/welcome`

**Proposed:**
- After saving profile → redirect to `/portal/welcome` (or `/patient/dashboard` if profile complete)
- Keep "Skip" functionality

---

## 🗺️ **PATIENT NAVIGATION FLOW**

### **New Patient Journey**

```
1. Register/Login
   ↓
2. /portal/welcome (if no profile)
   ├─→ Complete Profile → /portal/profile → (after save) → /portal/welcome
   ├─→ Book Consultation → /portal/book-consultation
   └─→ Meet Doctors → /portal/doctors
   
3. After consultation submitted
   ↓
4. /patient/dashboard (when profile exists OR consultation submitted)
   ├─→ View appointments (with consultation_request_status)
   ├─→ View consultations
   └─→ Update profile → /patient/profile
```

### **Existing Patient Journey**

```
1. Login
   ↓
2. /patient/dashboard (auto-redirect if profile exists)
   ├─→ View appointments
   ├─→ View consultations
   └─→ Update profile
```

---

## 🎯 **IMMEDIATE ACTION ITEMS**

1. **Clarify Frontdesk "Approve" behavior:**
   - Should it auto-confirm when date/time is set?
   - Or keep two-step (approve → patient confirms)?

2. **Update ReviewConsultationRequestUseCase:**
   - If approve with date/time → `CONFIRMED` + `SCHEDULED`
   - Remove `APPROVED` status OR keep for approvals without date/time?

3. **Update ScheduleAppointmentUseCase:**
   - When doctor schedules → set `consultation_request_status = CONFIRMED`
   - Set `appointment.status = SCHEDULED`

4. **Profile redirect:**
   - After `/portal/profile` save → redirect to `/portal/welcome` or `/patient/dashboard`

5. **Verify logout visibility:**
   - Check if logout button is visible in sidebar (should be at bottom)

---

## 📝 **SUMMARY OF QUESTIONS**

1. **When Frontdesk approves with date/time → should it be `CONFIRMED` immediately?** (Yes/No)
2. **When Doctor schedules → should `consultation_request_status = CONFIRMED`?** (Yes/No)
3. **After patient updates `/portal/profile` → redirect to where?** (`/portal/welcome` or `/patient/dashboard`)
4. **Is `/portal/profile` the same as "patient intake" or different?** (Different - `/portal/profile` is basic info, `/frontdesk/patient-intake` is medical intake)

---

**Status:** Awaiting clarification on status transitions before implementing fixes.
