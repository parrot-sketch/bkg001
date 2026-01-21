# Critical Workflow Audit & Redesign Guide

**Date:** January 2025  
**Auditor Role:** Senior Product Engineer, UX Architect, Health-Tech Systems Designer  
**System Type:** Clinical-Grade Healthcare System (Aesthetic Surgery EHR)

---

## Executive Summary

This system has **fundamental workflow breaks** that prevent it from functioning as a professional clinical system. Core issues include incorrect terminology, broken state management, missing redirects, inconsistent CTAs, and workflows that feel like marketing funnels instead of clinical operations.

**Critical Failures:**
1. Profile save leaves user stranded on same page with no clear next action
2. Consultation booking uses marketing language ("inquiry") instead of clinical terminology
3. Navigation logic is inconsistent across doctor listings
4. No clear boundary between user account and patient record
5. Missing post-action redirects cause user confusion

**Fix Priority:** CRITICAL - These break core clinical workflows.

---

## Section 1: Critical Workflow Issues Found

### Issue 1.1: Profile Save Leaves User in Limbo

**Location:** `app/patient/profile/page.tsx` (lines 157-254)

**Problem:**
After saving profile (create or update), the user remains on the same page with:
- No redirect to confirm success contextually
- `isEditing` state remains `false` (correct) but form state remains visible
- No clear indication of "what's next"
- "Skip" button reference mentioned but not implemented (causes confusion if user expects it)

**Code Evidence:**
```typescript
// Line 215-219: Profile created successfully
if (response.success && response.data) {
  setPatient(response.data);
  setIsCreating(false);
  setIsEditing(false);
  toast.success('Profile created successfully');
  // ❌ NO REDIRECT - user stays on form page
}
```

**Impact:**
- User completes critical onboarding step but has no guidance
- Confusion: "Did it save? What do I do now?"
- Poor clinical system UX - should feel like progression, not stagnation

**Why This Matters:**
In clinical systems, completing a profile is a milestone. Users should be:
1. Redirected to dashboard (most common)
2. Or shown clear next action (e.g., "Request Consultation" CTA)
3. Or redirected to appointment booking if that was their intent

---

### Issue 1.2: "Submit an Inquiry" vs Clinical Consultation Request

**Location:** `app/portal/book-consultation/page.tsx` (line 433)

**Problem:**
- Page title: "Submit an Inquiry"
- Backend creates: `ConsultationRequestStatus.SUBMITTED` appointment
- UI language: Marketing/inquiry language
- System behavior: Clinical consultation request workflow

**Semantic Mismatch:**
| UI Says | System Does | Should Say |
|---------|-------------|------------|
| "Submit an Inquiry" | Creates consultation request with SUBMITTED status | "Request a Consultation" |
| "Share your preferences" | Collects clinical intake data | "Tell us what you'd like to discuss" |
| "Inquiry received" | Consultation request in review | "Request submitted" |

**Impact:**
- Patient mental model is wrong (thinks it's a website form)
- Staff confusion (frontdesk sees "inquiry" but it's clinical request)
- Legal/medico-legal risk (unclear what was requested)

**Why This Matters:**
"Inquiry" = marketing lead capture. "Consultation Request" = clinical intent. These are legally and operationally different.

---

### Issue 1.3: Consultation CTA Inconsistency

**Locations:**
- `app/portal/doctors/page.tsx` - Doctor listing cards
- `app/portal/doctors/[id]/page.tsx` - Individual doctor profile
- `app/patient/dashboard/page.tsx` - Patient dashboard
- `components/portal/ConsultationCTA.tsx` - Reusable component

**Problem:**
- Doctor listing: "Request Consultation" button
- Doctor profile: "Request Consultation" button
- Patient dashboard: "Book Consultation" button
- Component label logic: Sometimes "Request", sometimes "Book"

**Code Evidence:**
```typescript
// app/portal/doctors/page.tsx:192
<Button>Request Consultation</Button>

// app/patient/dashboard/page.tsx:218
href="/portal/book-consultation"  // Uses "Book" in href

// components/portal/ConsultationCTA.tsx:77
return doctorId ? 'Request Consultation' : 'Book Consultation';
```

**Impact:**
- Inconsistent user experience
- Unclear terminology ("Book" implies instant scheduling vs "Request" implies review needed)
- Navigation confusion

**Why This Matters:**
Clinical systems need consistent, precise language. "Request" is correct (requires review). "Book" is wrong (implies instant confirmation).

---

### Issue 1.4: No Post-Action State Management

**Location:** Multiple pages

**Problem:**
After key actions (save profile, submit consultation request), the system doesn't:
1. Redirect to logical next page
2. Update navigation state
3. Show contextual success screens
4. Clear form state appropriately

**Examples:**
- Profile save: Stays on form (Issue 1.1)
- Consultation submit: Redirects to dashboard (good) but no clear "what's next"
- Registration completion: Redirects to `/patient` but unclear state

**Impact:**
- User confusion at every step
- Feels like a broken funnel, not a clinical system

---

### Issue 1.5: User vs Patient Boundary Unclear

**Location:** System-wide

**Problem:**
- User account exists (authentication)
- Patient record exists separately
- No clear point where "User" becomes "Patient"
- Profile completion is optional but required for some actions

**Current Behavior:**
- User can log in without patient profile
- User can "request consultation" but system requires patient profile
- Error message: "Patient profile not found. Please complete your profile first."
- But no clear guidance on where to complete it

**Impact:**
- Users get stuck in error loops
- Unclear onboarding flow
- No clear "patient record" vs "user account" distinction

---

### Issue 1.6: Routing Structure Doesn't Reflect Clinical Workflow

**Current Routes:**
```
/portal/book-consultation       # Consultation request (incorrectly named)
/portal/doctors                 # Doctor listing
/portal/doctors/[id]            # Doctor profile
/patient/profile                # Patient profile (editing)
/patient/dashboard              # Patient dashboard
```

**Problems:**
- `/portal/` namespace suggests public marketing site
- `/patient/` suggests authenticated patient area
- No `/patient/consultations/` route for managing requests
- Booking flow in `/portal/` but patient actions in `/patient/`

**Impact:**
- Confusing URL structure
- Doesn't reflect clinical workflow hierarchy

---

## Section 2: Corrected Ideal Patient Journey

### Journey 1: New Patient - Complete Onboarding & Request Consultation

**Corrected Flow:**
```
1. User signs up
   → Redirected to: /patient/profile (create mode)

2. User completes profile
   → Save profile
   → Redirected to: /patient/dashboard
   → Dashboard shows: "Profile Complete" success state
   → Clear CTA: "Request Consultation" button

3. User clicks "Request Consultation"
   → Navigate to: /patient/consultations/request
   → OR: /patient/consultations/request?doctorId=xyz (if from doctor profile)

4. User completes consultation request form
   → Submit request
   → Redirected to: /patient/consultations
   → Shows: "Request submitted" confirmation
   → Shows: Request status (SUBMITTED → PENDING_REVIEW)

5. User waits for frontdesk review
   → Can view request status at: /patient/consultations
   → Can see: Status updates (APPROVED, NEEDS_MORE_INFO, etc.)

6. Frontdesk approves & schedules
   → Appointment appears in: /patient/appointments
   → User can confirm appointment

7. Pre-consultation intake (if needed)
   → Link from appointment details
   → Complete intake forms
   → Return to appointment view

8. Consultation day
   → Check-in → Consultation → Completion
```

### Journey 2: Existing Patient - Request Another Consultation

**Corrected Flow:**
```
1. User logs in
   → Redirected to: /patient/dashboard

2. User clicks "Request Consultation"
   → Navigate to: /patient/consultations/request
   → Profile data pre-filled (if exists)
   → Skip profile steps (already complete)

3. Complete consultation request
   → Submit
   → Redirected to: /patient/consultations
   → Shows new request in list

4. Same as Journey 1, steps 5-8
```

### Journey 3: Patient Discovers Doctor → Requests Consultation

**Corrected Flow:**
```
1. User browses: /portal/doctors (or /doctors)
   → Public/authenticated doctor listing

2. User clicks doctor profile
   → Navigate to: /portal/doctors/[id]
   → Shows: "Request Consultation" button

3. User clicks "Request Consultation"
   → If not authenticated: Redirect to login → return here
   → If authenticated: Navigate to /patient/consultations/request?doctorId=[id]
   → Doctor pre-selected in form

4. Complete request → Same as Journey 2
```

---

## Section 3: UI/UX Behavior Fixes (Specific, Actionable)

### Fix 3.1: Profile Save Redirect Logic

**File:** `app/patient/profile/page.tsx`

**Current Code (lines 215-219):**
```typescript
if (response.success && response.data) {
  setPatient(response.data);
  setIsCreating(false);
  setIsEditing(false);
  toast.success('Profile created successfully');
  // ❌ NO REDIRECT
}
```

**Fixed Code:**
```typescript
if (response.success && response.data) {
  setPatient(response.data);
  setIsCreating(false);
  setIsEditing(false);
  toast.success('Profile created successfully');
  
  // Redirect to dashboard after successful save
  router.push('/patient/dashboard');
}
```

**For Updates:**
```typescript
if (response.success && response.data) {
  setPatient(response.data);
  setIsEditing(false);
  toast.success('Profile updated successfully');
  
  // Option 1: Stay on page (if user is reviewing/editing)
  // Option 2: Redirect to dashboard (if coming from onboarding)
  // Decision: Check if there's a `returnTo` query param
  const returnTo = searchParams?.get('returnTo');
  if (returnTo) {
    router.push(returnTo);
  } else {
    // Stay on profile page but exit edit mode
    // User can see their updated profile
  }
}
```

---

### Fix 3.2: Remove "Skip" Button Confusion

**File:** `app/patient/profile/page.tsx`

**Problem:** User mentioned "Skip" button remains active, but code shows no Skip button. This suggests:
1. User expects a Skip option
2. Or there's a Skip button elsewhere (e.g., in onboarding flow)

**Action:**
- Audit entire onboarding flow for Skip buttons
- If Skip exists: Make it clear where it leads
- If Skip doesn't exist: Remove any references/expectations
- Better: Don't allow skipping critical profile data

**Recommendation:**
- Profile creation should be mandatory for clinical operations
- No Skip button on profile form
- If user needs to exit: "Cancel" button → redirects to dashboard (creates minimal profile) or logout

---

### Fix 3.3: Consultation CTA Consistency

**Files:**
- `components/portal/ConsultationCTA.tsx`
- `app/portal/doctors/page.tsx`
- `app/portal/doctors/[id]/page.tsx`
- `app/patient/dashboard/page.tsx`

**Standardize to:**
```typescript
// ALL CTAs should say "Request Consultation"
// NO "Book Consultation" (implies instant scheduling, which is wrong)

// components/portal/ConsultationCTA.tsx
const getDefaultLabel = () => {
  if (label) return label;
  // Always use "Request Consultation" - consistent terminology
  return 'Request Consultation';
};
```

**Update All References:**
- Dashboard: "Request Consultation" (not "Book")
- Doctor listing: "Request Consultation" ✓ (already correct)
- Doctor profile: "Request Consultation" ✓ (already correct)

---

### Fix 3.4: Consultation Request Page Naming

**File:** `app/portal/book-consultation/page.tsx`

**Change Route:**
```
/portal/book-consultation  →  /patient/consultations/request
```

**Update All Links:**
- Dashboard CTAs
- Doctor profile CTAs
- Navigation menus
- Components using this route

**Why:**
- `/patient/` namespace = authenticated patient area
- `/consultations/` = consultation management section
- `/request` = specific action (request a consultation)
- Matches clinical workflow structure

---

### Fix 3.5: Post-Submission Redirect

**File:** `app/portal/book-consultation/page.tsx` (line 364-366)

**Current:**
```typescript
if (response.success && response.data) {
  toast.success('Your consultation request has been submitted...');
  const redirectTo = returnTo || '/patient/dashboard';
  router.push(redirectTo);
}
```

**Fixed:**
```typescript
if (response.success && response.data) {
  toast.success('Your consultation request has been submitted. Our clinical team will review it and contact you shortly.');
  
  // Always redirect to consultation requests page (not dashboard)
  router.push('/patient/consultations');
  
  // Dashboard redirect is confusing - user wants to see their request status
}
```

**Create New Page:** `/patient/consultations/page.tsx`
- Lists all consultation requests
- Shows status of each
- Clear status labels
- Links to appointment details when scheduled

---

### Fix 3.6: Doctor Profile CTA Route

**File:** `app/portal/doctors/[id]/page.tsx` (lines 214, 358)

**Current:**
```typescript
href={`/portal/book-consultation?doctorId=${doctor.id}`}
```

**Fixed:**
```typescript
href={`/patient/consultations/request?doctorId=${doctor.id}`}
```

**Also Handle Authentication:**
```typescript
// If user not authenticated, redirect to login first
const handleRequestConsultation = () => {
  if (!isAuthenticated) {
    router.push(`/patient/login?returnTo=/patient/consultations/request?doctorId=${doctor.id}`);
  } else {
    router.push(`/patient/consultations/request?doctorId=${doctor.id}`);
  }
};
```

---

## Section 4: Naming and Semantics Corrections

### 4.1 Terminology Mapping

| Current (Wrong) | Corrected | Context |
|-----------------|-----------|---------|
| "Submit an Inquiry" | "Request a Consultation" | Page title |
| "Book Consultation" | "Request Consultation" | Button labels |
| "Inquiry" | "Consultation Request" | Status labels |
| "Share your preferences" | "Tell us what you'd like to discuss" | Form description |
| "What brings you in?" | "What would you like to discuss?" | Form field |
| "When would you like to visit?" | "Preferred Consultation Date" | Date field |
| "A few safety questions" | "Medical Screening" | Section header |
| "Final details" | "Consent & Acknowledgment" | Section header |

### 4.2 Route Naming

| Current | Corrected | Reason |
|---------|-----------|--------|
| `/portal/book-consultation` | `/patient/consultations/request` | Clinical namespace, clear action |
| `/patient/profile` | `/patient/profile` | ✓ Keep (correct) |
| `/patient/dashboard` | `/patient/dashboard` | ✓ Keep (correct) |
| (missing) | `/patient/consultations` | New: List all requests |
| (missing) | `/patient/consultations/[id]` | New: View request details |

### 4.3 Component Naming

| Current | Corrected |
|---------|-----------|
| `BookConsultationPage` | `RequestConsultationPage` |
| `ConsultationCTA` | ✓ Keep (correct) |
| `submitConsultationRequest` | ✓ Keep (correct - backend API) |

---

## Section 5: Technical Implementation Recommendations

### 5.1 Routing Structure

**New Route Hierarchy:**
```
/patient/
  ├── dashboard                    # Main patient dashboard
  ├── profile                      # Profile management
  ├── consultations/               # Consultation management section
  │   ├── request                  # New consultation request
  │   ├── [id]                     # View specific request
  │   └── page.tsx                 # List all requests
  ├── appointments/                # Appointment management
  │   ├── [id]                     # View appointment details
  │   └── page.tsx                 # List all appointments
  └── medical-records/             # Medical records (future)

/portal/
  ├── doctors                      # Public/authenticated doctor listing
  └── doctors/[id]                 # Public/authenticated doctor profile
```

**Implementation:**
- Move consultation request page to `/patient/consultations/request`
- Create consultation requests list page
- Update all navigation links
- Add route guards (auth required for `/patient/*`)

---

### 5.2 State Management Fixes

**Profile Save State:**
```typescript
// After successful save, clear editing state AND redirect
const handleSave = async () => {
  // ... save logic ...
  
  if (response.success) {
    // Clear form state
    setIsEditing(false);
    setIsCreating(false);
    
    // Update patient data
    setPatient(response.data);
    
    // Redirect based on context
    if (isCreating) {
      // New profile → redirect to dashboard (onboarding complete)
      router.push('/patient/dashboard');
    } else {
      // Update → check if returnTo exists
      const returnTo = searchParams.get('returnTo');
      if (returnTo) {
        router.push(returnTo);
      }
      // Otherwise stay on profile (user reviewing)
    }
  }
};
```

**Consultation Request State:**
```typescript
// After submission, redirect to requests list
const handleSubmit = async () => {
  // ... submit logic ...
  
  if (response.success) {
    toast.success('Consultation request submitted successfully');
    
    // Always redirect to requests list
    router.push('/patient/consultations');
  }
};
```

---

### 5.3 Authentication Guards

**Add Route Guards:**
```typescript
// middleware.ts or page-level checks
export function requireAuth(route: string) {
  // Check if user is authenticated
  // If not, redirect to login with returnTo param
  // If yes, allow access
}
```

**Apply to:**
- `/patient/*` routes (all require auth)
- `/patient/consultations/request` (especially important)
- Doctor profile → consultation request flow

---

### 5.4 Component State Logic

**ConsultationCTA Component:**
```typescript
// Standardize label logic
const getDefaultLabel = () => {
  // Always return "Request Consultation"
  // Remove conditional logic that creates inconsistency
  return label || 'Request Consultation';
};

// Standardize route
const buildBookingUrl = () => {
  const baseUrl = '/patient/consultations/request';
  // ... add query params ...
  return url;
};
```

---

### 5.5 Error Handling Improvements

**Profile Save Errors:**
```typescript
// Clear error messages
if (!response.success) {
  // Check error type
  if (response.error?.includes('Patient profile not found')) {
    // Guide user to create profile
    toast.error('Please complete your profile first');
    router.push('/patient/profile');
  } else {
    toast.error(response.error || 'Failed to save profile');
  }
}
```

**Consultation Request Errors:**
```typescript
// Handle missing profile gracefully
if (response.error?.includes('Patient profile not found')) {
  toast.error('Please complete your profile before requesting a consultation');
  router.push('/patient/profile?returnTo=/patient/consultations/request');
}
```

---

## Section 6: High-Impact Changes (Immediate Professionalism)

### Change 6.1: Fix Profile Save Redirect (5 minutes)
**Impact:** HIGH  
**Effort:** LOW  
**File:** `app/patient/profile/page.tsx`

Add redirect after successful save:
```typescript
if (response.success && response.data) {
  // ... existing code ...
  router.push('/patient/dashboard');
}
```

---

### Change 6.2: Standardize "Request Consultation" Terminology (15 minutes)
**Impact:** HIGH  
**Effort:** LOW  
**Files:** All CTA components

Replace all "Book Consultation" with "Request Consultation"

---

### Change 6.3: Update Consultation Request Page Title (2 minutes)
**Impact:** MEDIUM  
**Effort:** LOW  
**File:** `app/portal/book-consultation/page.tsx`

Change:
```tsx
<h1>Request a Consultation</h1>  // Already done in previous refactor
```

---

### Change 6.4: Create Consultation Requests List Page (30 minutes)
**Impact:** HIGH  
**Effort:** MEDIUM  
**File:** New: `app/patient/consultations/page.tsx`

Basic implementation:
- Fetch user's consultation requests
- Display in list with status
- Link to request details
- Show status labels using `getConsultationRequestStatusLabel()`

---

### Change 6.5: Update Post-Submission Redirect (2 minutes)
**Impact:** HIGH  
**Effort:** LOW  
**File:** `app/portal/book-consultation/page.tsx`

Change redirect target:
```typescript
router.push('/patient/consultations');  // Instead of dashboard
```

---

### Change 6.6: Update Doctor Profile CTA Routes (5 minutes)
**Impact:** MEDIUM  
**Effort:** LOW  
**File:** `app/portal/doctors/[id]/page.tsx`

Update hrefs:
```typescript
href={`/patient/consultations/request?doctorId=${doctor.id}`}
```

---

## Implementation Priority

### Phase 1: Critical Fixes (Do First)
1. ✅ Profile save redirect (Change 6.1)
2. ✅ Standardize terminology (Change 6.2)
3. ✅ Post-submission redirect (Change 6.5)

### Phase 2: Route Restructure (Next)
4. Create consultation requests list page (Change 6.4)
5. Move route from `/portal/book-consultation` to `/patient/consultations/request`
6. Update all navigation links

### Phase 3: Polish (Later)
7. Add authentication guards
8. Improve error handling
9. Add loading states
10. Add success confirmation screens

---

## Conclusion

This system has a **solid backend** but **broken frontend workflows**. The fixes are straightforward but critical for clinical system usability. Priority should be on:

1. **Correct redirects** (user always knows where they are)
2. **Consistent terminology** (clinical language throughout)
3. **Clear navigation** (logical route structure)
4. **Proper state management** (no user confusion)

Most fixes are **low-effort, high-impact** changes that will immediately improve professionalism.

---

**Next Steps:**
1. Review this audit
2. Approve Phase 1 fixes
3. Implement in order
4. Test user journeys
5. Deploy incrementally
