# Doctor Onboarding & Login Workflow

**Last Updated:** January 2025

## Overview

Doctors in the Nairobi Sculpt system are **pre-seeded with complete profiles** and are immediately ready to use the system. They do NOT go through a patient-style onboarding flow.

---

## Current State

### Seeded Doctors
- ✅ All doctors are seeded with `onboarding_status: 'ACTIVE'`
- ✅ Complete profiles (bio, education, focus_areas, professional_affiliations)
- ✅ Working days configured
- ✅ User accounts created and linked via `user_id`
- ✅ Ready to use the system immediately

### Onboarding Status Flow (For Future New Doctors)
```
INVITED → ACTIVATED → PROFILE_COMPLETED → ACTIVE
```

**Current Seeded Doctors:** All at `ACTIVE` status

---

## Doctor Login Flow

### Step 1: Doctor Authenticates
- Doctor logs in via `/patient/login` (shared login page)
- System validates credentials
- JWT token issued with role: `DOCTOR`

### Step 2: Role-Based Redirect
- System checks user role from JWT token
- If role === `DOCTOR` → Route to `/doctor/dashboard`
- **No patient welcome page** - doctors go straight to their dashboard

### Step 3: Doctor Dashboard
- Doctor sees:
  - Today's confirmed sessions
  - Upcoming confirmed sessions
  - Patient notes and procedure information
  - Clean, minimal interface
- **No noise** - no rejected inquiries, no drafts, no pending items

---

## Why No Onboarding for Seeded Doctors?

1. **Complete Profiles Already Exist**
   - All profile fields populated during seeding
   - Bio, education, focus areas, affiliations all set
   - No additional information needed

2. **Active Status**
   - All seeded doctors have `onboarding_status: 'ACTIVE'`
   - They can authenticate immediately
   - No activation or profile completion needed

3. **Professional Context**
   - Doctors are professionals, not patients
   - They don't need "welcome" or "onboarding" flows
   - They need immediate access to their schedule and patients

---

## Future: New Doctor Onboarding

When new doctors are invited (not seeded):

1. **Admin/Frontdesk invites doctor**
   - Doctor record created with `onboarding_status: 'INVITED'`
   - Invite token sent via email

2. **Doctor activates account**
   - Clicks invite link
   - Sets password
   - Status → `ACTIVATED`

3. **Doctor completes profile**
   - Fills required profile fields
   - Status → `PROFILE_COMPLETED`

4. **System activates**
   - Automatic transition to `ACTIVE`
   - Doctor can now log in and access dashboard

5. **First Login**
   - If `onboarding_status === 'ACTIVE'` → `/doctor/dashboard`
   - If `onboarding_status !== 'ACTIVE'` → `/doctor/activate` (complete onboarding)

---

## Technical Implementation

### Redirect Logic
**File:** `/lib/utils/auth-redirect.ts`

```typescript
// Role-based routing
case UserRole.DOCTOR:
  return getDoctorRedirect(userId);

// Doctor redirect (simplified for seeded doctors)
async function getDoctorRedirect(userId: string): Promise<string> {
  // All seeded doctors are ACTIVE - go straight to dashboard
  // For future: check onboarding_status and route to /doctor/activate if needed
  return '/doctor/dashboard';
}
```

### Login Page
**File:** `/app/(auth)/patient/login/page.tsx`

- Uses `getPostAuthRedirect(userId, userRole)`
- Extracts role from JWT token
- Routes based on role

---

## Doctor Dashboard Features

### What Doctors See:
- ✅ Today's Sessions (confirmed only)
- ✅ Upcoming Sessions (confirmed only)
- ✅ Patient Information
- ✅ Procedure Details
- ✅ Consultation Notes

### What Doctors DON'T See:
- ❌ Pending inquiries (frontdesk handles these)
- ❌ Rejected requests
- ❌ Draft appointments
- ❌ Admin clutter
- ❌ Patient welcome content

---

## Key Principles

1. **No Patient Onboarding for Doctors**
   - Doctors never see patient welcome pages
   - Doctors never see patient onboarding flows
   - Role-based routing prevents this

2. **Immediate Access**
   - Seeded doctors go straight to dashboard
   - No unnecessary steps
   - Professional, efficient experience

3. **Clean Interface**
   - Surgeon sees only confirmed sessions
   - Minimal, focused dashboard
   - No noise or distractions

4. **Future-Proof**
   - Onboarding logic exists for new doctors
   - Can be activated when needed
   - Current seeded doctors bypass it

---

## Testing

### Test Doctor Login:
1. Login with doctor credentials
2. Verify redirect to `/doctor/dashboard` (not `/portal/welcome`)
3. Verify dashboard shows only confirmed sessions
4. Verify no patient onboarding content appears

### Expected Behavior:
- ✅ Doctor → `/doctor/dashboard`
- ✅ Patient → `/patient/dashboard` or `/portal/welcome`
- ✅ Frontdesk → `/frontdesk/dashboard`
- ✅ Admin → `/admin/dashboard`
