# Consultation Request Flow Refactor

**Implementation Guide**  
**Phase 1: Critical Terminology & Flow Corrections**

---

## Summary

This document provides concrete code changes to implement the corrected consultation request workflow as outlined in `PATIENT_CONSULTATION_WORKFLOW_AUDIT.md`.

---

## Changes Overview

1. **Rename page title and terminology**
2. **Remove identity collection step** (user is already logged in)
3. **Remove medical safety questions** (belongs in intake, not request)
4. **Update step count and labels**
5. **Update success messages**

---

## File Changes

### 1. `/app/portal/book-consultation/page.tsx`

#### Change: Update Page Title
```tsx
// BEFORE:
<h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
  Submit an Inquiry
</h1>
<p className="text-sm text-gray-600 leading-relaxed">
  Share your preferences and we'll guide you through the next steps
</p>

// AFTER:
<h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
  Request a Consultation
</h1>
<p className="text-sm text-gray-600 leading-relaxed">
  Tell us what you'd like to discuss with our surgical team
</p>
```

#### Change: Remove Identity Step (Step 1)
- Remove Step 1 entirely
- Start flow at Step 2 (reason for visit)
- User identity is already known from authentication
- If patient profile exists, use that data
- If not, basic identity can be captured minimally or deferred

#### Change: Update Step 2 Language
```tsx
// BEFORE:
<h2>What brings you in?</h2>
<p>Select a service below or browse all options</p>

// AFTER:
<h2>What would you like to discuss?</h2>
<p>Tell us about your primary concern or area of interest</p>
```

#### Change: Remove Service Cards Marketing Links
```tsx
// BEFORE: Service cards with "Learn more" links to website
<Link href={websiteUrl} target="_blank">
  Learn more
</Link>

// AFTER: Remove external links during request flow
// (Service information belongs on website, not in clinical portal)
```

#### Change: Remove Medical Safety Step (Current Step 5)
- Medical safety questions belong in pre-consultation intake
- Not appropriate during initial request
- Move to separate intake flow

#### Change: Update Step Count
```tsx
// BEFORE:
const TOTAL_STEPS = 7;

// AFTER:
const TOTAL_STEPS = 6; // After removing identity and medical safety steps
// Actual steps: 1) Intent, 2) Surgeon, 3) Date/Time, 4) Notes, 5) Consent, 6) Review
```

#### Change: Update Consent Step Language
```tsx
// BEFORE:
<h2>Final details</h2>
<p>Please review and confirm the following</p>

// AFTER:
<h2>Consent & Acknowledgment</h2>
<p>Please review and confirm the following important information</p>
```

#### Change: Update Review Step
```tsx
// BEFORE:
<h2>Review Your Inquiry</h2>

// AFTER:
<h2>Review Your Consultation Request</h2>
```

#### Change: Update Success Message
```tsx
// BEFORE:
toast.success('Your consultation request has been received. Our care team will contact you shortly.');

// AFTER:
toast.success('Your consultation request has been submitted. Our clinical team will review it and contact you shortly.');
```

---

### 2. `/components/portal/ConsultationCTA.tsx`

#### Change: Update Button Label
```tsx
// No change needed - already uses "Book Consultation" or "Request Consultation"
// But ensure it routes to corrected route
```

---

### 3. Dashboard & Navigation

#### Change: Update Navigation Labels
- Change "Book Consultation" → "Request Consultation" in patient dashboard
- Update sidebar if applicable

---

## Step Flow After Refactor

### Corrected 6-Step Flow:

1. **Clinical Intent** (was Step 2)
   - What would you like to discuss?
   - Primary concern description
   - Optional: Service/area selection (no marketing links)

2. **Surgeon Selection** (was Step 3)
   - Select preferred surgeon
   - Required field
   - Clear: availability will be confirmed

3. **Preferred Date & Time** (was Step 4)
   - Preferred consultation date
   - Time preference
   - Clear: exact time confirmed after review

4. **Additional Context** (was Step 4 notes)
   - Optional notes or questions

5. **Consent & Acknowledgment** (was Step 6)
   - Contact consent
   - Privacy consent
   - Acknowledgment: request vs confirmed appointment

6. **Review & Submit** (was Step 7)
   - Review all information
   - Submit consultation request

---

## Removed Steps

### Step 1: Identity Collection
**Why Removed:**
- User is already authenticated
- Identity known from login
- Patient profile can be completed separately
- Not appropriate during request stage

### Step 5: Medical Safety Questions
**Why Removed:**
- These are clinical intake questions
- Belong in pre-consultation intake (after scheduling)
- Not appropriate during initial request
- Creates false sense of medical screening happening

**Where They Should Go:**
- Separate intake form after appointment is confirmed
- Part of pre-consultation preparation
- Linked from appointment details page

---

## Testing Checklist

- [ ] Page title shows "Request a Consultation"
- [ ] Flow starts with clinical intent (not identity)
- [ ] Step count shows 6 steps (not 7)
- [ ] No medical safety questions in request flow
- [ ] Success message uses "consultation request" not "inquiry"
- [ ] All UI text uses clinical language
- [ ] Service cards don't have marketing links
- [ ] Form submission creates appointment with SUBMITTED status
- [ ] Patient can see their request in appointments list

---

## Next Steps (Post-Phase 1)

1. Create separate intake flow for pre-consultation data collection
2. Update route structure (move from `/portal/` to `/patient/consultations/`)
3. Update email templates
4. Update frontdesk review interface labels
5. Update status display components

---

## Notes

- Backend code is correct - only UI/UX changes needed
- State machine and domain models are well-designed
- Focus is on correcting user-facing language and flow
- No database migrations required
- No API changes required
