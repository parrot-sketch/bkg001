# Workflow Audit Implementation Specification

**Status:** Implementation Ready  
**Date:** January 2025  
**Based On:** `CRITICAL_WORKFLOW_AUDIT.md`

---

## Section 1: File Audit List

### Files Requiring Route Changes (7 files)
1. `app/patient/profile/page.tsx` - Profile save redirect
2. `app/portal/book-consultation/page.tsx` - Post-submission redirect
3. `components/portal/ConsultationCTA.tsx` - Base URL route
4. `app/patient/dashboard/page.tsx` - Dashboard CTA href
5. `app/portal/doctors/[id]/page.tsx` - Doctor profile CTAs (2 instances)
6. `app/portal/doctors/page.tsx` - Doctor listing CTAs
7. `components/portal/DoctorCard.tsx` - Doctor card CTA

### Files Requiring Terminology Changes (6 files)
1. `app/portal/book-consultation/page.tsx` - Page title (already fixed, verify)
2. `components/portal/ConsultationCTA.tsx` - Default label logic
3. `app/patient/dashboard/page.tsx` - Action card title
4. `app/page.tsx` - Homepage CTAs (2 instances)
5. `app/portal/welcome/page.tsx` - Welcome page CTA text
6. `components/forms/book-appointment.tsx` - Success message

### Files Requiring New Routes (1 file)
1. `app/patient/consultations/page.tsx` - **NEW FILE** - Consultation requests list

### Files Requiring Route Move (1 file)
1. `app/portal/book-consultation/page.tsx` → `app/patient/consultations/request/page.tsx` - **MOVE FILE**

### Files Requiring Redirect Logic (2 files)
1. `components/new-patient.tsx` - Redirect after profile creation
2. `app/patient/profile/page.tsx` - Redirect logic refinement

### Files With Broken Flows (0 files - identified, need fixes)
- All broken flows are addressed by route/redirect fixes above

---

## Section 2: Per-File Fixes

### Fix 2.1: Profile Save Redirect

**File:** `app/patient/profile/page.tsx`  
**Lines:** 215-241  
**Issue:** No redirect after profile creation/update. User stays on form page.

**Current Code:**
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
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

// Add at top of component
const router = useRouter();
const searchParams = useSearchParams();

// In handleSave, after successful save:
if (response.success && response.data) {
  setPatient(response.data);
  setIsCreating(false);
  setIsEditing(false);
  toast.success('Profile created successfully');
  
  // Redirect based on context
  if (isCreating) {
    // New profile → redirect to dashboard (onboarding complete)
    router.push('/patient/dashboard');
  } else {
    // Update → check if returnTo exists
    const returnTo = searchParams?.get('returnTo');
    if (returnTo) {
      router.push(returnTo);
    }
    // Otherwise stay on profile (user reviewing their profile)
  }
}
```

**For Update Path (lines 238-241):**
```typescript
if (response.success && response.data) {
  setPatient(response.data);
  setIsEditing(false);
  toast.success('Profile updated successfully');
  
  // Check for returnTo parameter
  const returnTo = searchParams?.get('returnTo');
  if (returnTo) {
    router.push(returnTo);
  }
  // Stay on profile page (user can see updated info)
}
```

---

### Fix 2.2: Consultation Request Post-Submission Redirect

**File:** `app/portal/book-consultation/page.tsx`  
**Lines:** 366-371  
**Issue:** Redirects to dashboard instead of consultation requests list.

**Current Code:**
```typescript
if (response.success && response.data) {
  toast.success('Your consultation request has been submitted...');
  const redirectTo = returnTo || '/patient/dashboard';
  router.push(redirectTo);
}
```

**Fixed Code:**
```typescript
if (response.success && response.data) {
  toast.success('Your consultation request has been submitted. Our clinical team will review it and contact you shortly.');
  
  // Always redirect to consultation requests list
  router.push('/patient/consultations');
}
```

**Remove:** `returnTo` logic for consultation submissions (they should always go to requests list)

---

### Fix 2.3: ConsultationCTA Component Route

**File:** `components/portal/ConsultationCTA.tsx`  
**Lines:** 43, 76  
**Issues:** 
1. Uses `/portal/book-consultation` instead of `/patient/consultations/request`
2. Returns "Book Consultation" when no doctorId

**Current Code:**
```typescript
const buildBookingUrl = () => {
  const baseUrl = '/portal/book-consultation';
  // ...
};

const getDefaultLabel = () => {
  if (label) return label;
  if (doctorId) {
    return 'Request Consultation';
  }
  return 'Book Consultation';  // ❌ WRONG
};
```

**Fixed Code:**
```typescript
const buildBookingUrl = () => {
  const baseUrl = '/patient/consultations/request';
  const params = new URLSearchParams();
  
  if (doctorId) {
    params.append('doctorId', doctorId);
  }
  if (serviceId) {
    params.append('serviceId', serviceId);
  }
  
  // Preserve context - add returnTo parameter based on current path
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/patient/')) {
      params.append('returnTo', currentPath);
    }
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

const getDefaultLabel = () => {
  // Always use "Request Consultation" - consistent terminology
  return label || 'Request Consultation';
};
```

**Update Comment at top:**
```typescript
/**
 * ConsultationCTA Component
 * 
 * Reusable component for consistent "Request Consultation" CTAs
 * across the portal. Ensures all booking actions use the same styling and routing.
 * 
 * Variants:
 * - "primary": Main CTA (teal button)
 * - "secondary": Secondary CTA (outline button)
 * - "link": Text link style
 * 
 * Features:
 * - Preserves context (doctorId, serviceId) in booking URL
 * - Consistent "Request Consultation" label
 * - Mobile-optimized sizing
 */
```

---

### Fix 2.4: Patient Dashboard CTA

**File:** `app/patient/dashboard/page.tsx`  
**Lines:** 215-220  
**Issues:**
1. Title says "Book Consultation" instead of "Request Consultation"
2. href uses `/portal/book-consultation` instead of `/patient/consultations/request`

**Current Code:**
```typescript
<ActionCard
  title="Book Consultation"
  description="Schedule a consultation with our surgeons"
  icon={Calendar}
  href="/portal/book-consultation"
  primary
/>
```

**Fixed Code:**
```typescript
<ActionCard
  title="Request Consultation"
  description="Submit a consultation request for review"
  icon={Calendar}
  href="/patient/consultations/request"
  primary
/>
```

---

### Fix 2.5: Doctor Profile CTAs

**File:** `app/portal/doctors/[id]/page.tsx`  
**Lines:** 214, 358  
**Issues:** Uses `/portal/book-consultation` instead of `/patient/consultations/request`

**Current Code (line 214):**
```typescript
<Link
  href={`/portal/book-consultation?doctorId=${doctor.id}`}
  className="flex-1 sm:flex-none"
>
```

**Current Code (line 358):**
```typescript
<Link
  href={`/portal/book-consultation?doctorId=${doctor.id}`}
  className="flex-1"
>
```

**Fixed Code (both instances):**
```typescript
<Link
  href={`/patient/consultations/request?doctorId=${doctor.id}`}
  className="flex-1 sm:flex-none"  // Keep original className
>
```

**Also add authentication check:**
```typescript
// Add at top of component
import { useAuth } from '@/hooks/patient/useAuth';

// Inside component
const { isAuthenticated } = useAuth();

// Create handler function
const handleRequestConsultation = () => {
  if (!isAuthenticated) {
    router.push(`/patient/login?returnTo=/patient/consultations/request?doctorId=${doctor.id}`);
  } else {
    router.push(`/patient/consultations/request?doctorId=${doctor.id}`);
  }
};

// Update button to use handler instead of direct Link
<Button
  onClick={handleRequestConsultation}
  className="w-full sm:w-auto h-11 bg-teal-500 hover:bg-teal-600 text-white"
>
  <Calendar className="h-4 w-4 mr-2" />
  Request Consultation
</Button>
```

---

### Fix 2.6: Doctor Listing CTAs

**File:** `app/portal/doctors/page.tsx`  
**Line:** 189  
**Issue:** Uses `/portal/book-consultation` instead of `/patient/consultations/request`

**Current Code:**
```typescript
<Link
  href={`/portal/book-consultation?doctorId=${doctor.id}`}
  className="block"
>
```

**Fixed Code:**
```typescript
<Link
  href={`/patient/consultations/request?doctorId=${doctor.id}`}
  className="block"
>
```

---

### Fix 2.7: DoctorCard Component CTA

**File:** `components/portal/DoctorCard.tsx`  
**Line:** 101  
**Issue:** Uses `/portal/book-consultation` instead of `/patient/consultations/request`

**Current Code:**
```typescript
<Link href={`/portal/book-consultation?doctorId=${doctor.id}`} className="block">
```

**Fixed Code:**
```typescript
<Link href={`/patient/consultations/request?doctorId=${doctor.id}`} className="block">
```

---

### Fix 2.8: Homepage CTAs

**File:** `app/page.tsx`  
**Lines:** 39, 67, 213  
**Issues:** Uses "Book Consultation" terminology (marketing language acceptable on homepage, but should be consistent)

**Current Code (line 39):**
```typescript
<Button size="sm" className="bg-brand-primary hover:bg-brand-primary/90 text-white">Book Consultation</Button>
```

**Current Code (line 67):**
```typescript
<Button size="lg" className="w-full sm:w-auto px-8 bg-brand-primary hover:bg-brand-primary/90 text-white border-0">
  Book Your Consultation
```

**Current Code (line 213):**
```typescript
<Button size="lg" className="px-8 bg-brand-primary hover:bg-brand-primary/90 text-white border-0">
  Book Consultation
```

**Decision:** Homepage is marketing-facing, "Book" is acceptable, but route should still point to correct path if user is authenticated. Since homepage CTAs go to `/patient/register`, they will be redirected appropriately. **NO CHANGE NEEDED** - Homepage can use marketing language.

---

### Fix 2.9: Welcome Page CTA

**File:** `app/portal/welcome/page.tsx`  
**Lines:** 73, 83-86  
**Issues:**
1. Uses `/portal/book-consultation` route
2. Says "Submit an Inquiry" instead of "Request Consultation"

**Current Code:**
```typescript
<Link
  href="/portal/book-consultation"
  className="group relative overflow-hidden..."
>
  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
    Submit an Inquiry
  </h3>
  <p className="text-sm text-gray-600 mb-6 flex-grow leading-relaxed">
    Share your preferences for a consultation with our expert surgeons
  </p>
```

**Fixed Code:**
```typescript
<Link
  href="/patient/consultations/request"
  className="group relative overflow-hidden..."
>
  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
    Request Consultation
  </h3>
  <p className="text-sm text-gray-600 mb-6 flex-grow leading-relaxed">
    Submit a consultation request for review by our clinical team
  </p>
```

---

### Fix 2.10: New Patient Component Redirect

**File:** `components/new-patient.tsx`  
**Line:** 79  
**Issue:** Redirects to `/patient` instead of `/patient/dashboard`

**Current Code:**
```typescript
if (res?.success) {
  toast.success(res.msg);
  form.reset();
  router.push("/patient");
}
```

**Fixed Code:**
```typescript
if (res?.success) {
  toast.success(res.msg);
  form.reset();
  router.push("/patient/dashboard");
}
```

---

### Fix 2.11: Create Consultation Requests List Page

**File:** `app/patient/consultations/page.tsx` - **NEW FILE**  
**Purpose:** List all consultation requests for the authenticated patient

**Implementation:**
```typescript
'use client';

/**
 * Patient Consultation Requests Page
 * 
 * Lists all consultation requests submitted by the patient.
 * Shows request status and allows viewing details.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { patientApi } from '@/lib/api/patient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, FileText, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { getConsultationRequestStatusLabel } from '@/domain/enums/ConsultationRequestStatus';

export default function PatientConsultationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadConsultationRequests();
    }
  }, [isAuthenticated, user]);

  const loadConsultationRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await patientApi.getAppointments(user.id);

      if (response.success && response.data) {
        // Filter for consultation requests (have consultation_request_status)
        const consultationRequests = response.data.filter(
          (apt) => apt.consultationRequestStatus !== undefined && apt.consultationRequestStatus !== null
        );
        setRequests(consultationRequests);
      }
    } catch (error) {
      console.error('Error loading consultation requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: ConsultationRequestStatus | undefined) => {
    if (!status) return null;

    const configs: Record<ConsultationRequestStatus, { className: string; icon: any }> = {
      [ConsultationRequestStatus.SUBMITTED]: {
        className: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: FileText,
      },
      [ConsultationRequestStatus.PENDING_REVIEW]: {
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: Clock,
      },
      [ConsultationRequestStatus.NEEDS_MORE_INFO]: {
        className: 'bg-orange-50 text-orange-700 border border-orange-200',
        icon: AlertCircle,
      },
      [ConsultationRequestStatus.APPROVED]: {
        className: 'bg-green-50 text-green-700 border border-green-200',
        icon: CheckCircle2,
      },
      [ConsultationRequestStatus.SCHEDULED]: {
        className: 'bg-teal-50 text-teal-700 border border-teal-200',
        icon: Calendar,
      },
      [ConsultationRequestStatus.CONFIRMED]: {
        className: 'bg-green-100 text-green-800 border border-green-300',
        icon: CheckCircle2,
      },
    };

    return configs[status];
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your consultation requests</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading consultation requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">My Consultation Requests</h1>
          <p className="text-sm text-gray-600 mt-1">View and track your consultation requests</p>
        </div>
        <Link href="/patient/consultations/request">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Calendar className="h-4 w-4 mr-2" />
            Request Consultation
          </Button>
        </Link>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No consultation requests</h3>
            <p className="text-sm text-gray-600 mb-6">You haven't submitted any consultation requests yet.</p>
            <Link href="/patient/consultations/request">
              <Button className="bg-teal-600 hover:bg-teal-700">
                Request Consultation
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const statusConfig = getStatusConfig(request.consultationRequestStatus);
            const StatusIcon = statusConfig?.icon;

            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{request.type}</CardTitle>
                      <CardDescription className="mt-1">
                        {request.appointmentDate && format(new Date(request.appointmentDate), 'MMMM d, yyyy')} at {request.time}
                      </CardDescription>
                    </div>
                    {statusConfig && request.consultationRequestStatus && (
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusConfig.className}`}>
                        {StatusIcon && <StatusIcon className="h-3 w-3" />}
                        {getConsultationRequestStatusLabel(request.consultationRequestStatus)}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {request.note && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{request.note}</p>
                  )}
                  <Link href={`/patient/appointments/${request.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

### Fix 2.12: Move Consultation Request Page

**Action:** Move file from old location to new location

**Current:** `app/portal/book-consultation/page.tsx`  
**New:** `app/patient/consultations/request/page.tsx`

**Steps:**
1. Create directory: `app/patient/consultations/request/`
2. Move file to new location
3. Update all internal route references if any

**Note:** Next.js will handle the route change automatically once file is moved.

---

### Fix 2.13: Book Appointment Form Success Message

**File:** `components/forms/book-appointment.tsx`  
**Line:** 88  
**Issue:** Uses "inquiry" terminology

**Current Code:**
```typescript
toast.success("Your inquiry has been submitted. We will review it and contact you shortly.");
```

**Fixed Code:**
```typescript
toast.success("Your consultation request has been submitted. Our clinical team will review it and contact you shortly.");
```

---

## Section 3: Remaining Architectural Gaps

### Gap 3.1: Missing Consultation Requests List Route

**Status:** Will be created (Fix 2.11)  
**Impact:** HIGH - Users need to see their request status after submission

### Gap 3.2: Route Authentication Guards

**Status:** Not implemented  
**Impact:** MEDIUM - Unauthenticated users could access patient routes

**Recommendation:**
```typescript
// middleware.ts or page-level
export function requireAuth(route: string) {
  // Check authentication
  // Redirect to login if not authenticated
  // Preserve returnTo param
}
```

**Apply to:**
- `/patient/*` routes
- `/patient/consultations/*` routes

### Gap 3.3: Consultation Request Details Page

**Status:** Not implemented  
**Impact:** LOW - Users can view details from appointments list for now

**Future:** `/patient/consultations/[id]/page.tsx` for detailed request view

### Gap 3.4: Profile Save ReturnTo Parameter Support

**Status:** Partially implemented  
**Impact:** LOW - Nice-to-have for better UX

**Current:** Only handles basic redirect  
**Future:** Support returnTo query param for deep linking

---

## Section 4: Verification Checklist

### Route Changes
- [ ] `/portal/book-consultation` → `/patient/consultations/request` (file moved)
- [ ] All references to `/portal/book-consultation` updated
- [ ] New route `/patient/consultations` created (list page)
- [ ] All CTAs point to correct routes

### Terminology Changes
- [ ] All "Book Consultation" → "Request Consultation"
- [ ] All "Submit an Inquiry" → "Request Consultation"
- [ ] All "Inquiry" → "Consultation Request" (in UI context)
- [ ] Success messages use correct terminology

### Redirect Behavior
- [ ] Profile creation → redirects to `/patient/dashboard`
- [ ] Profile update → stays on profile (or uses returnTo)
- [ ] Consultation submission → redirects to `/patient/consultations`
- [ ] New patient component → redirects to `/patient/dashboard`

### Component Behavior
- [ ] ConsultationCTA always says "Request Consultation"
- [ ] ConsultationCTA uses correct route
- [ ] Doctor profile CTAs handle authentication
- [ ] Dashboard action card uses correct title and route

### User Flows
- [ ] New user → sign up → profile → dashboard → request consultation → see request list
- [ ] Existing user → login → dashboard → request consultation → see request list
- [ ] User → doctor profile → request consultation → redirected to login if not authenticated
- [ ] User → complete profile → redirected to dashboard
- [ ] User → submit consultation → redirected to requests list

### Edge Cases
- [ ] User not authenticated tries to access `/patient/consultations/request`
- [ ] User completes profile from consultation request flow
- [ ] User submits consultation without profile (should error gracefully)
- [ ] User has multiple consultation requests (all shown in list)

---

## Implementation Order

### Phase 1: Critical Redirects (15 minutes)
1. Fix profile save redirect (`app/patient/profile/page.tsx`)
2. Fix consultation submission redirect (`app/portal/book-consultation/page.tsx`)
3. Fix new patient component redirect (`components/new-patient.tsx`)

### Phase 2: Route Updates (20 minutes)
4. Update ConsultationCTA base URL
5. Update all dashboard/doctor CTAs
6. Move consultation request page file

### Phase 3: Terminology (10 minutes)
7. Update all "Book Consultation" → "Request Consultation"
8. Update welcome page text
9. Update book appointment form message

### Phase 4: New Features (30 minutes)
10. Create consultation requests list page
11. Update navigation to include requests link

### Phase 5: Testing (30 minutes)
12. Test all user flows
13. Verify all redirects work
14. Check terminology consistency

---

## Notes

- Homepage (`app/page.tsx`) can keep "Book" language (marketing-facing)
- Authentication guards can be added in Phase 5+ if needed
- Consultation request details page is future enhancement
- All changes are backward-compatible (old routes can redirect if needed)

---

## Post-Implementation Tasks

1. Update documentation
2. Update API documentation if routes are documented
3. Test with real user accounts
4. Monitor error logs for broken routes
5. Add redirects from old routes if needed for backward compatibility
