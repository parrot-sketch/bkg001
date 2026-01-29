# Consultation Workflow Journey Map
## Current State vs Desired State

**Date:** January 23, 2025  
**Purpose:** Comprehensive mapping of the end-to-end consultation workflow from patient request to billing, identifying gaps and required implementations.

---

## 🎯 Executive Summary

### What Exists Today
✅ **Consultation Session Workstation** - Full clinical UI for live consultations  
✅ **Consultation State Machine** - NOT_STARTED → IN_PROGRESS → COMPLETED  
✅ **Draft Saving** - Auto-save with version safety  
✅ **Start/Complete APIs** - Doctor-only endpoints with proper auth  
✅ **Notification Service** - Email infrastructure (Resend/SMTP/Mock)  
✅ **Billing Primitives** - Payment and PatientBill entities exist  

### Critical Gaps
❌ **Navigation Flow** - Doctor doesn't auto-navigate to session after starting  
❌ **Billing Integration** - Consultation fee not automatically created on completion  
❌ **Notification Triggers** - Notifications exist but not fully wired to all workflow steps  
❌ **Frontdesk Consultation Management** - UI exists but needs simplification (in progress)  

---

## 📋 Detailed Journey Map

### **Phase 1: Patient Submits Consultation Request**

#### Current State
1. **Patient Action:** Submits consultation request via patient portal
2. **System Action:** Creates appointment with status `PENDING` (consultation request status)
3. **Notification:** ❌ **NOT IMPLEMENTED** - Patient should receive confirmation email
4. **Frontdesk Visibility:** Request appears in `/frontdesk/consultation-requests` (complex UI - being simplified)

**Current Implementation:**
- Route: `POST /api/consultations` (via `SubmitConsultationRequestUseCase`)
- Creates `Appointment` with `status: PENDING`
- Stores patient's medical info, photos, consent flags
- **Gap:** No notification sent to patient

#### Desired State
1. **Patient Action:** Submits consultation request
2. **System Action:** 
   - Creates appointment with status `PENDING`
   - **Sends email notification** to patient: "Your consultation request has been received"
   - **Sends email notification** to frontdesk: "New consultation request from [Patient Name]"
3. **Frontdesk Visibility:** Request appears in simplified, mobile-optimized UI

**Required Changes:**
- ✅ Wire `INotificationService.sendEmail()` in `SubmitConsultationRequestUseCase`
- ✅ Create email templates for patient confirmation and frontdesk alert
- ✅ Update frontdesk UI (in progress)

---

### **Phase 2: Frontdesk Reviews & Schedules**

#### Current State
1. **Frontdesk Action:** Reviews request in `/frontdesk/consultation-requests`
2. **Actions Available:**
   - "Approve" → Requires `proposedDate` + `proposedTime` → Sets appointment status to `SCHEDULED`
   - "Request More Info" → Sets status to `NEEDS_MORE_INFO`
   - "Reject" → Sets status to `REJECTED`
3. **System Action:** Updates appointment via `POST /api/consultations/:id/review`
4. **Notification:** ✅ **PARTIALLY IMPLEMENTED** - Uses `ReviewConsultationRequestUseCase` which calls `notificationService.sendEmail()`

**Current Implementation:**
- Route: `POST /api/consultations/:id/review`
- Use Case: `ReviewConsultationRequestUseCase`
- **Notification:** ✅ Sends email to patient when approved/rejected/needs more info
- **Gap:** Doctor not notified when appointment is scheduled

#### Desired State
1. **Frontdesk Action:** Reviews request in simplified UI
2. **Actions Available:**
   - "Schedule Consultation" → Opens dialog to select date/time → Sets status to `SCHEDULED` (or `CONFIRMED` if doctor already confirmed)
   - "Request Clarification" → Opens dialog to request info → Sets status to `NEEDS_MORE_INFO`
   - "Decline Request" → Opens dialog with reason → Sets status to `REJECTED`
3. **System Action:**
   - Updates appointment status
   - **Sends email to patient:** "Your consultation has been scheduled for [Date] at [Time]"
   - **Sends email to doctor:** "New consultation scheduled: [Patient Name] on [Date] at [Time]"
4. **Appointment Status:** `SCHEDULED` or `CONFIRMED` (if doctor already confirmed)

**Required Changes:**
- ✅ Update frontdesk UI (in progress - new components created)
- ✅ Add doctor notification in `ReviewConsultationRequestUseCase`
- ✅ Consider renaming status `SCHEDULED` → `CONFIRMED` when doctor confirms

---

### **Phase 3: Doctor Confirms/Schedules (Alternative Path)**

#### Current State
1. **Doctor Action:** Views appointments in `/doctor/appointments`
2. **Actions Available:**
   - "Start Consultation" → Opens `StartConsultationDialog` → Calls `POST /api/consultations/:id/start`
   - **Gap:** Doctor cannot propose alternative date/time before starting
3. **System Action:** 
   - Creates `Consultation` entity with state `IN_PROGRESS`
   - Updates appointment status to `SCHEDULED` (if not already)
4. **Navigation:** ❌ **BROKEN** - After starting, doctor stays on appointments page (should navigate to session)

**Current Implementation:**
- Route: `POST /api/consultations/:id/start`
- Use Case: `StartConsultationUseCase`
- Creates `Consultation` with state `IN_PROGRESS`
- **Gap:** No navigation to session page after start
- **Gap:** Doctor cannot propose alternative date before starting

#### Desired State
1. **Doctor Action:** Views appointments in `/doctor/appointments`
2. **Actions Available:**
   - "Confirm & Schedule" → Opens dialog to confirm or propose alternative date → Sets status to `CONFIRMED`
   - "Start Consultation" → Only available if status is `CONFIRMED` or `SCHEDULED` → Navigates to `/doctor/consultations/:appointmentId/session`
3. **System Action:**
   - Creates `Consultation` entity with state `IN_PROGRESS`
   - **Sends email to patient:** "Dr. [Name] has confirmed your consultation for [Date] at [Time]"
   - **Sends email to frontdesk:** "Dr. [Name] has confirmed consultation for [Patient Name]"
4. **Navigation:** ✅ **FIXED** - Auto-navigates to session page after start

**Required Changes:**
- ✅ Fix navigation in `StartConsultationDialog` → `router.push('/doctor/consultations/${appointmentId}/session')`
- ✅ Fix navigation in `ConsultationSessionPage` → Remove `window.location.reload()`, use React Query invalidation
- ✅ Add "Confirm & Schedule" action for doctor (new dialog component)
- ✅ Add doctor notification in `StartConsultationUseCase`

---

### **Phase 4: Live Consultation Session**

#### Current State
1. **Doctor Action:** Works in `/doctor/consultations/:appointmentId/session`
2. **UI Components:**
   - `ConsultationSessionHeader` - Timer, auto-save status, quick actions
   - `PatientInfoSidebar` - Patient details, history, photos
   - `ConsultationWorkspace` - Tabbed interface (Chief Complaint, Examination, Procedure Discussion, Photos, Assessment & Plan, Treatment Plan)
3. **Draft Saving:** ✅ **IMPLEMENTED** - Auto-saves every 30 seconds via `useSaveConsultationDraft`
4. **Version Safety:** ✅ **IMPLEMENTED** - Optimistic locking with version tokens

**Current Implementation:**
- Page: `app/doctor/consultations/[appointmentId]/session/page.tsx`
- Hook: `useConsultation` - Polls every 30s if active
- Hook: `useSaveConsultationDraft` - Auto-saves with version conflict handling
- Route: `PUT /api/consultations/:id/draft`
- **Gap:** No billing UI in session

#### Desired State
1. **Doctor Action:** Works in session (same as current)
2. **UI Components:** Same as current + **Billing Section** in workspace tabs
3. **Draft Saving:** Same as current
4. **Billing:** ✅ **NEW** - Doctor can add consultation fee during session (optional, can be done after completion)

**Required Changes:**
- ✅ Add "Billing" tab to `ConsultationWorkspace`
- ✅ Create `BillingTab` component for consultation fee entry
- ✅ Create API endpoint: `POST /api/consultations/:id/billing` (or integrate into complete endpoint)

---

### **Phase 5: Complete Consultation**

#### Current State
1. **Doctor Action:** Clicks "Complete Consultation" → Opens `CompleteConsultationDialog`
2. **Required Fields:**
   - Outcome Type (Procedure Recommended, Consultation Only, Follow-Up Needed, etc.)
   - Patient Decision (if Procedure Recommended)
   - Consultation Summary (required)
3. **System Action:**
   - Updates appointment status to `COMPLETED`
   - Updates consultation state to `COMPLETED`
   - Stores outcome in appointment notes
   - **Sends email to patient:** ✅ **IMPLEMENTED** - "Your consultation has been completed"
   - **Gap:** No billing creation
   - **Gap:** No payment tracking

**Current Implementation:**
- Route: `POST /api/consultations/:id/complete`
- Use Case: `CompleteConsultationUseCase`
- **Notification:** ✅ Sends email to patient
- **Billing:** ❌ Not integrated

#### Desired State
1. **Doctor Action:** Clicks "Complete Consultation" → Opens enhanced dialog
2. **Required Fields:** Same as current + **Consultation Fee** (optional, can be added later by frontdesk)
3. **System Action:**
   - Updates appointment status to `COMPLETED`
   - Updates consultation state to `COMPLETED`
   - **Creates PatientBill** for consultation fee (if provided)
   - **Creates Payment record** (if fee paid immediately)
   - **Sends email to patient:** "Your consultation has been completed. Consultation fee: [Amount]"
   - **Sends email to frontdesk:** "Consultation completed for [Patient Name]. Fee: [Amount]"
4. **Billing Visibility:** Frontdesk can view and update billing in patient profile

**Required Changes:**
- ✅ Add consultation fee field to `CompleteConsultationDialog`
- ✅ Create `CreateConsultationBillUseCase` (or integrate into `CompleteConsultationUseCase`)
- ✅ Wire billing creation in `CompleteConsultationUseCase`
- ✅ Update email templates to include billing info
- ✅ Create frontdesk UI for viewing/updating consultation bills

---

### **Phase 6: Post-Consultation Billing (Frontdesk/Doctor)**

#### Current State
1. **Frontdesk/Doctor Action:** Can access billing via patient profile
2. **System Action:** Uses `addNewBill()` and `generateBill()` in `app/actions/medical.ts`
3. **Gap:** Billing not automatically linked to consultation completion
4. **Gap:** No clear UI flow for "consultation fee" vs "procedure fee"

**Current Implementation:**
- Actions: `app/actions/medical.ts` - `addNewBill()`, `generateBill()`
- Entities: `Payment`, `PatientBill` (Prisma schema)
- **Gap:** No consultation-specific billing workflow

#### Desired State
1. **Frontdesk/Doctor Action:** 
   - Can add consultation fee during completion (doctor)
   - Can add/update consultation fee after completion (frontdesk/doctor)
   - Can mark fee as paid (frontdesk)
2. **System Action:**
   - Creates `PatientBill` with type `CONSULTATION_FEE`
   - Links bill to appointment/consultation
   - Tracks payment status
   - **Sends email to patient:** "Consultation fee invoice: [Amount]. Payment due: [Date]"
3. **Billing UI:** 
   - Patient profile shows consultation bills
   - Frontdesk can update payment status
   - Doctor can view billing history

**Required Changes:**
- ✅ Create `CreateConsultationBillUseCase` (foundational layer)
- ✅ Create `UpdateConsultationBillUseCase` (foundational layer)
- ✅ Create API endpoints: `POST /api/consultations/:id/billing`, `PUT /api/bills/:id`
- ✅ Create frontdesk billing UI component
- ✅ Wire notifications for billing updates

---

## 🔔 Notification Requirements

### Current Notification Implementation
- ✅ `INotificationService` interface exists
- ✅ `EmailNotificationService` implements Resend/SMTP/Mock
- ✅ Email templates exist: `consultationRequestReceivedTemplate`, `appointmentBookedTemplate`, `consultationCompletedTemplate`
- ✅ Notifications wired in: `ReviewConsultationRequestUseCase`, `CompleteConsultationUseCase`

### Missing Notifications
1. ❌ **Patient:** "Your consultation request has been received" (on submit)
2. ❌ **Frontdesk:** "New consultation request from [Patient Name]" (on submit)
3. ❌ **Doctor:** "New consultation scheduled: [Patient Name] on [Date]" (when frontdesk schedules)
4. ❌ **Patient:** "Dr. [Name] has confirmed your consultation" (when doctor confirms)
5. ❌ **Frontdesk:** "Dr. [Name] has confirmed consultation" (when doctor confirms)
6. ❌ **Patient:** "Consultation fee invoice: [Amount]" (when bill created)
7. ❌ **Patient:** "Payment received: [Amount]" (when payment recorded)

### Required Changes
- ✅ Add notification calls in `SubmitConsultationRequestUseCase`
- ✅ Add doctor notification in `ReviewConsultationRequestUseCase`
- ✅ Add notifications in `StartConsultationUseCase`
- ✅ Add billing notifications in `CreateConsultationBillUseCase`
- ✅ Create email templates for all missing notifications

---

## 💰 Billing Requirements

### Current Billing Implementation
- ✅ `Payment` entity exists (Prisma schema)
- ✅ `PatientBill` entity exists (Prisma schema)
- ✅ Server actions: `addNewBill()`, `generateBill()` in `app/actions/medical.ts`
- ❌ No consultation-specific billing workflow
- ❌ No automatic bill creation on consultation completion

### Required Billing Implementation

#### Foundational Layer (Use Cases)
1. **`CreateConsultationBillUseCase`**
   - Input: `appointmentId`, `consultationId`, `amount`, `description`, `createdBy`
   - Creates `PatientBill` with type `CONSULTATION_FEE`
   - Links bill to appointment and consultation
   - Sends notification to patient
   - Returns `PatientBillResponseDto`

2. **`UpdateConsultationBillUseCase`**
   - Input: `billId`, `amount?`, `status?`, `updatedBy`
   - Updates bill amount or status
   - Sends notification if status changes
   - Returns `PatientBillResponseDto`

3. **`RecordConsultationPaymentUseCase`**
   - Input: `billId`, `amount`, `paymentMethod`, `paidBy`
   - Creates `Payment` record
   - Updates bill status to `PAID` (if fully paid)
   - Sends notification to patient
   - Returns `PaymentResponseDto`

#### API Endpoints
1. `POST /api/consultations/:id/billing` - Create consultation bill
2. `PUT /api/bills/:id` - Update bill
3. `POST /api/bills/:id/payment` - Record payment

#### UI Components
1. **`BillingTab`** (in `ConsultationWorkspace`)
   - Shows consultation fee
   - Allows doctor to add/update fee during session
   - Mobile-optimized

2. **`ConsultationBillingCard`** (in patient profile)
   - Shows consultation bills
   - Allows frontdesk to update payment status
   - Mobile-optimized

---

## 🚀 Implementation Priority

### **P0: Critical Fixes (Immediate)**
1. ✅ **Fix database connection errors** - Add `withRetry` to `getAllPatients` (DONE)
2. ✅ **Fix doctor navigation** - Auto-navigate to session after start
3. ✅ **Fix session page reload** - Use React Query invalidation instead of `window.location.reload()`

### **P1: Core Workflow (This Sprint)**
1. ✅ **Update frontdesk consultation UI** - Simplify and mobile-optimize (IN PROGRESS)
2. ✅ **Add doctor confirmation flow** - "Confirm & Schedule" dialog
3. ✅ **Wire missing notifications** - Patient submission, doctor scheduling, doctor confirmation
4. ✅ **Create billing use cases** - `CreateConsultationBillUseCase`, `UpdateConsultationBillUseCase`

### **P2: Billing Integration (Next Sprint)**
1. ✅ **Add billing to completion dialog** - Consultation fee field
2. ✅ **Create billing API endpoints** - POST/PUT for bills and payments
3. ✅ **Create billing UI components** - `BillingTab`, `ConsultationBillingCard`
4. ✅ **Wire billing notifications** - Invoice sent, payment received

### **P3: Enhancements (Future)**
1. ✅ **Doctor can propose alternative dates** - Before starting consultation
2. ✅ **Real-time notifications** - WebSocket or polling for live updates
3. ✅ **Billing analytics** - Revenue tracking, outstanding payments dashboard

---

## 📊 State Transitions

### Appointment Status Flow
```
PENDING (consultation request)
  ↓ [Frontdesk approves]
SCHEDULED
  ↓ [Doctor confirms] OR [Doctor starts]
CONFIRMED (optional intermediate state)
  ↓ [Doctor starts consultation]
IN_PROGRESS (consultation state, not appointment status)
  ↓ [Doctor completes]
COMPLETED
```

### Consultation State Flow
```
NOT_STARTED
  ↓ [Doctor starts]
IN_PROGRESS
  ↓ [Doctor completes]
COMPLETED
```

### Billing Flow
```
[Consultation Completed]
  ↓ [Doctor/Frontdesk adds fee]
BILL_CREATED
  ↓ [Payment recorded]
PAID
```

---

## 🔍 Technical Notes

### Navigation Fix
**Current:**
```typescript
// In StartConsultationDialog onSuccess
handleConsultationSuccess() {
  setShowStartDialog(false);
  loadAppointments(); // ❌ Stays on appointments page
}
```

**Desired:**
```typescript
// In StartConsultationDialog onSuccess
handleConsultationSuccess() {
  setShowStartDialog(false);
  router.push(`/doctor/consultations/${appointmentId}/session`); // ✅ Navigate to session
}
```

### Session Page Reload Fix
**Current:**
```typescript
// In ConsultationSessionPage
handleConsultationStarted() {
  setShowStartDialog(false);
  window.location.reload(); // ❌ Full page reload
}
```

**Desired:**
```typescript
// In ConsultationSessionPage
const queryClient = useQueryClient();
handleConsultationStarted() {
  setShowStartDialog(false);
  queryClient.invalidateQueries(['consultation', appointmentId]); // ✅ React Query refetch
}
```

### Billing Integration Point
**Option 1:** Add to `CompleteConsultationUseCase`
- Pros: Single transaction, atomic operation
- Cons: Couples billing to completion logic

**Option 2:** Separate `CreateConsultationBillUseCase` called after completion
- Pros: Separation of concerns, can be called independently
- Cons: Requires two API calls or orchestration

**Recommendation:** Option 2 (separate use case) for flexibility, but allow passing `consultationFee` in `CompleteConsultationDto` for convenience.

---

## ✅ Success Criteria

### Phase 1: Navigation & Notifications
- [ ] Doctor auto-navigates to session after starting
- [ ] All workflow steps send appropriate notifications
- [ ] Email templates created for all notification types

### Phase 2: Billing Foundation
- [ ] `CreateConsultationBillUseCase` implemented
- [ ] `UpdateConsultationBillUseCase` implemented
- [ ] API endpoints created and tested
- [ ] Billing linked to consultations in database

### Phase 3: Billing UI
- [ ] `BillingTab` added to consultation workspace
- [ ] `ConsultationBillingCard` added to patient profile
- [ ] Frontdesk can update payment status
- [ ] Mobile-optimized billing UI

### Phase 4: End-to-End Testing
- [ ] Patient submits request → Frontdesk schedules → Doctor confirms → Doctor starts → Doctor completes → Bill created → Payment recorded
- [ ] All notifications sent correctly
- [ ] All state transitions validated
- [ ] Mobile UI tested on real devices

---

## 📝 Next Steps

1. **Immediate:** Fix database connection errors (DONE)
2. **Today:** Fix doctor navigation to session page
3. **Today:** Wire missing notifications in use cases
4. **This Week:** Create billing use cases and API endpoints
5. **This Week:** Add billing UI to consultation workspace
6. **Next Week:** End-to-end testing and mobile optimization

---

**Document Status:** Living document - update as implementation progresses.  
**Last Updated:** January 23, 2025
