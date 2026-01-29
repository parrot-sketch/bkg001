# Frontdesk Module - Comprehensive Code Audit & Refactoring Plan

**Date:** January 25, 2026  
**Scope:** Frontdesk user features and functionality  
**Focus:** Design pattern compliance, code quality, redundancy, and clean code principles

---

## 📋 Executive Summary

### Overall Assessment: **7.5/10 - GOOD with areas for improvement**

| Category | Score | Status | Notes |
|----------|-------|--------|-------|
| Architecture | 8/10 | ✅ Good | Follows modular monolith pattern |
| Code Organization | 7/10 | ⚠️ Good | Some logic placement issues |
| Clean Code | 6.5/10 | ⚠️ Fair | Several opportunities to simplify |
| Error Handling | 7/10 | ⚠️ Good | Could be more consistent |
| Type Safety | 8.5/10 | ✅ Good | TypeScript well utilized |
| Performance | 8/10 | ✅ Good | React Query well implemented |
| Testing | 5/10 | ❌ Needs Work | Limited test coverage |

### Key Findings

**Strengths:** ✅
- Proper use of React Query for data fetching
- Clean separation of concerns (pages, components, APIs)
- Good TypeScript usage with DTOs
- Modern Next.js patterns (server actions, hooks)
- Use cases properly implemented

**Issues Identified:** ⚠️
- **Logic duplication** across consultation and appointment workflows
- **Manual state management** in some components that should use hooks
- **Inconsistent API usage** (doctorApi vs frontdeskApi)
- **Weak boundary enforcement** between modules
- **Complex dialogs** doing too much business logic
- **Magic numbers and strings** not extracted to constants

---

## 🔍 Detailed Findings

### 1. **Inconsistent API Usage (CRITICAL)**

#### Issue: CheckInDialog uses wrong API
```tsx
// ❌ WRONG: CheckInDialog.tsx (line 35)
const response = await doctorApi.checkInPatient(appointment.id, frontdeskUserId);

// ✅ CORRECT: Should be frontdeskApi
const response = await frontdeskApi.checkInPatient(appointment.id, frontdeskUserId);
```

**Why this matters:**
- Violates module boundaries (frontdesk using doctor API)
- Confusing for future developers
- Breaks logical cohesion
- Testing becomes harder (mocking wrong API)

**Impact:** Medium - Works but violates architecture

**Fix:**
```tsx
// Correct method exists in frontdeskApi
const response = await frontdeskApi.checkInPatient(appointment.id, frontdeskUserId);
```

---

### 2. **Logic Duplication: Consultation Filtering (HIGH)**

#### Issue: Status filtering logic repeated across multiple pages

**Current State:**
```tsx
// ❌ consultations/page.tsx - Lines 65-73
const newInquiries = filteredAppointments.filter(
  apt => apt.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED || 
         apt.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW
).length;

// ❌ dashboard/page.tsx - Lines 60-65 (SAME LOGIC)
const newInquiries = pendingConsultations.filter(
  apt => apt.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
         apt.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW,
).length;

// ❌ REPEATED AGAIN: Lines 68-71 for awaitingClarification
// ❌ REPEATED AGAIN: Lines 75-78 for awaitingScheduling
```

**Root Cause:** Business logic not abstracted to utility functions

**Refactoring:**
```typescript
// Create: utils/consultation-filters.ts
export const ConsultationFilters = {
  isNewInquiry: (apt: AppointmentResponseDto): boolean =>
    apt.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
    apt.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW,

  isAwaitingClarification: (apt: AppointmentResponseDto): boolean =>
    apt.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO,

  isAwaitingScheduling: (apt: AppointmentResponseDto): boolean =>
    apt.consultationRequestStatus === ConsultationRequestStatus.APPROVED,
};

// Usage:
const newInquiries = pendingConsultations.filter(ConsultationFilters.isNewInquiry).length;
const awaitingClarification = pendingConsultations.filter(ConsultationFilters.isAwaitingClarification).length;
const awaitingScheduling = pendingConsultations.filter(ConsultationFilters.isAwaitingScheduling).length;
```

**Impact:** High - Repeated in 3+ places

---

### 3. **Manual State Management in Components (MEDIUM)**

#### Issue: Consultation page uses manual useState/useEffect instead of React Query

**Current State:**
```tsx
// ❌ consultations/page.tsx - Lines 27-45
const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
const [loading, setLoading] = useState(true);
const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
const [showReviewDialog, setShowReviewDialog] = useState(false);

useEffect(() => {
  if (isAuthenticated && user) {
    loadConsultations();
  }
}, [isAuthenticated, user, statusParam]);

const loadConsultations = async () => {
  try {
    setLoading(true);
    const statuses = statusParam === 'ALL' 
      ? [...]
      : statusParam.split(',').map(s => s.trim());
    
    const response = await frontdeskApi.getConsultationsByStatus(statuses);
    // ... manual state updates
  }
};
```

**Problem:** Dashboard uses React Query (good), but consultations page uses manual fetch pattern (inconsistent)

**Refactoring:**
```typescript
// Create hook: hooks/consultations/useConsultationsByStatus.ts
export function useConsultationsByStatus(statuses: string[], enabled = true) {
  return useQuery({
    queryKey: ['consultations', 'status', statuses.join(',')],
    queryFn: async () => {
      const response = await frontdeskApi.getConsultationsByStatus(statuses);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load consultations');
      }
      return response.data;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    retry: 2,
    refetchOnWindowFocus: true,
    enabled,
  });
}

// Use in page:
export default function FrontdeskConsultationsPage() {
  const { statusParam } = useConsultationStatusParams();
  const statuses = statusParam.split(',');
  
  const { data: appointments = [], isLoading } = useConsultationsByStatus(
    statuses,
    isAuthenticated
  );
}
```

**Impact:** Medium - Works, but inconsistent with dashboard pattern

---

### 4. **Complex Dialog Components Doing Too Much (MEDIUM)**

#### Issue: ReviewConsultationDialog has too many responsibilities

**Current State:** 357 lines, handles:
- Form state management (5 fields)
- Validation logic (3 different validations)
- API calls
- Conditional rendering (12+ places)
- Error handling

```tsx
// ❌ Too many responsibilities in one component
export function ReviewConsultationDialog({
  open,
  onClose,
  onSuccess,
  appointment,
  frontdeskUserId,
}: ReviewConsultationDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation logic
  const handleSubmit = async () => {
    if (!selectedAction) { ... }
    if (selectedAction === 'approve') { ... }
    if (selectedAction === 'needs_more_info') { ... }
    if (selectedAction === 'reject') { ... }
    // ... submit logic
  };

  // Complex conditional rendering
  return <Dialog>
    {/* 3 action buttons with different conditions */}
    {/* Form with multiple fields */}
  </Dialog>
}
```

**Refactoring:**
```typescript
// Split into smaller components:

// 1. ReviewConsultationDialog (Container - 80 lines)
export function ReviewConsultationDialog({ ... }: Props) {
  const [selectedAction, setSelectedAction] = useState<ReviewAction | null>(null);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <ReviewConsultationForm
        appointment={appointment}
        selectedAction={selectedAction}
        onActionChange={setSelectedAction}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
}

// 2. ReviewConsultationForm (Presentational - 120 lines)
export function ReviewConsultationForm({ ... }: Props) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  
  return <form>...</form>
}

// 3. ReviewActionButtons (Presentational - 40 lines)
export function ReviewActionButtons({ ... }: Props) {
  return (
    <div className="flex gap-2">
      <ActionButton action="approve">Accept</ActionButton>
      <ActionButton action="needs_more_info">Request Info</ActionButton>
      <ActionButton action="reject">Not Suitable</ActionButton>
    </div>
  );
}

// 4. ReviewValidation (Logic - 60 lines)
export const ReviewValidation = {
  validateApprove: (date: string, time: string) => { ... },
  validateNeedsMoreInfo: (notes: string) => { ... },
  validateReject: (notes: string) => { ... },
}
```

**Impact:** Medium - Makes testing hard, harder to maintain

---

### 5. **Weak Module Boundaries (HIGH)**

#### Issue: CheckInDialog imports from doctorApi

```tsx
// ❌ components/frontdesk/CheckInDialog.tsx (line 7)
import { doctorApi } from '@/lib/api/doctor';

// This violates module boundary:
// Frontdesk module ← should not depend on Doctor module API
```

**All API Usage in Frontdesk Module:**
```
✅ frontdeskApi - Correct (primary API for frontdesk)
✅ doctor components - OK (shared UI components)
❌ doctorApi - WRONG (should not use doctor-specific API)
```

**Why This Matters:**
- If doctor API changes, frontdesk breaks
- Unclear responsibility (should frontdesk use frontdesk API?)
- Testing becomes complex (need to mock wrong API)
- Future developers confused about which API to use

**Refactoring:**
```typescript
// ALL frontdesk operations should use frontdeskApi
// /lib/api/frontdesk.ts should have ALL methods:
export const frontdeskApi = {
  // Appointments
  getTodayAppointments: () => { ... },
  getAppointmentsByDate: (date) => { ... },
  checkInPatient: (appointmentId, userId) => { ... },  // ← Move from doctorApi
  
  // Consultations
  getConsultationsByStatus: (statuses) => { ... },
  reviewConsultation: (id, action, options) => { ... },
  
  // Patients
  searchPatients: (query) => { ... },
  createPatient: (dto) => { ... },
  getPatient: (id) => { ... },
  
  // Doctors
  getDoctorsAvailability: (startDate, endDate) => { ... },
};

// Use consistently:
const response = await frontdeskApi.checkInPatient(...); // ✅ Correct
```

**Impact:** High - Architecture violation

---

### 6. **Magic Strings & Numbers Not Extracted (MEDIUM)**

#### Issue: Status values, limits, and strings hardcoded throughout

**Current State:**
```tsx
// ❌ dashboard/page.tsx - Line 42
const expectedPatients = todayAppointments.length;
const checkedInPatients = todayAppointments.filter(
  (apt) => apt.status === AppointmentStatus.SCHEDULED,  // ← String enum OK
).length;

// ❌ appointments/page.tsx - Line 51
todayAppointments.slice(0, 10).map(...)  // ← Magic number 10

// ❌ consultations/page.tsx - Line 65
statusParam === 'ALL'  // ← Magic string 'ALL'
statusParam.split(',').map(s => s.trim())  // ← Magic string ','
```

**Refactoring:**
```typescript
// Create: lib/constants/frontdesk.ts
export const FRONTDESK_CONFIG = {
  APPOINTMENTS: {
    MAX_DISPLAYED_ON_DASHBOARD: 10,
    CACHE_STALE_TIME_MS: 1000 * 30,
  },
  CONSULTATIONS: {
    FILTER_SEPARATOR: ',',
    ALL_STATUSES_FILTER: 'ALL',
  },
};

// Use throughout:
todayAppointments.slice(0, FRONTDESK_CONFIG.APPOINTMENTS.MAX_DISPLAYED_ON_DASHBOARD)
statusParam === FRONTDESK_CONFIG.CONSULTATIONS.ALL_STATUSES_FILTER
```

**Impact:** Low-Medium - Code clarity and maintainability

---

### 7. **Inconsistent Error Handling (MEDIUM)**

#### Issue: Different error handling patterns across components

**Pattern 1 - With fallback:**
```tsx
// ✅ dashboard/page.tsx - Lines 44-50
const { 
  data: todayAppointments = [],  // Default to empty array
  isLoading: loadingAppointments 
} = useTodayAppointments(isAuthenticated && !!user);
```

**Pattern 2 - Manual error handling:**
```tsx
// ⚠️ consultations/page.tsx - Lines 52-60
const loadConsultations = async () => {
  try {
    // ... API call
    if (response.success && response.data) {
      setAppointments(response.data);
    } else {
      toast.error('Failed to load consultations');
      setAppointments([]); // Manual fallback
    }
  } catch (error) {
    toast.error('An error occurred while loading consultations');
    setAppointments([]);
  }
};
```

**Pattern 3 - Conditional error reporting:**
```tsx
// ⚠️ AvailableDoctorsPanel.tsx - Lines 62-73
if (response.success && response.data) {
  setDoctorsAvailability(response.data);
} else if (!response.success) {
  if (response.error && !response.error.includes('Authentication')) {
    toast.error(response.error || 'Failed to load doctor availability');
  }
  setDoctorsAvailability([]);
}
```

**Inconsistency:** Different approaches to the same problem

**Refactoring:**
```typescript
// Standardize error handling:
// Create: lib/utils/error-handling.ts
export const handleApiError = {
  silently: (error: unknown) => {
    console.error('API Error:', error);
  },
  
  withToast: (error: unknown, defaultMessage: string) => {
    const message = error instanceof Error ? error.message : defaultMessage;
    toast.error(message);
  },
  
  withFallback: <T,>(
    error: unknown,
    defaultMessage: string,
    fallbackValue: T
  ): T => {
    handleApiError.withToast(error, defaultMessage);
    return fallbackValue;
  },
};

// Use consistently:
const { data = [], isLoading, error } = useConsultationsByStatus(...);
if (error) {
  return handleApiError.withToast(error, 'Failed to load consultations');
}
```

**Impact:** Medium - Consistency and maintainability

---

### 8. **Type Safety Issues (LOW-MEDIUM)**

#### Issue: Some DTOs missing or loosely typed

**Current State:**
```tsx
// ✅ Good - Proper DTOs
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

// ⚠️ Weak - Using 'any' or partial types
const appointment: AppointmentResponseDto
// But sometimes accessing properties that might not exist:
appointment.patientId?.toLowerCase()  // Optional chaining suggests uncertainty
```

**Issue:** Some properties are optional when they shouldn't be

**Refactoring:**
```typescript
// Ensure all required properties are non-optional in DTOs:
export interface AppointmentResponseDto {
  id: number;
  patientId: string;      // ← Should be non-optional
  doctorId: string;       // ← Should be non-optional
  status: AppointmentStatus;
  consultationRequestStatus?: ConsultationRequestStatus;
  // ... etc
}

// Then remove optional chaining where not needed:
apt.patientId.toLowerCase()  // ✅ No optional chaining needed
```

**Impact:** Low - Type safety improvement

---

### 9. **Performance Issues (LOW)**

#### Issue: Unnecessary re-renders in AvailableDoctorsPanel

```tsx
// ❌ AvailableDoctorsPanel.tsx - Line 36
const loadDoctorsAvailability = useCallback(async () => {
  // ... lots of logic inside
  // But then used in useEffect with many dependencies
}, [viewDate, isAuthenticated, user, authLoading]);

// ❌ Too many dependencies causing frequent re-calls
useEffect(() => {
  if (!authLoading && isAuthenticated && user) {
    loadDoctorsAvailability();
  }
}, [authLoading, isAuthenticated, user, loadDoctorsAvailability]);
```

**Issue:** Callback recreated on each render, causing useEffect to re-run

**Refactoring:**
```tsx
// Use React Query instead of manual useState/useCallback:
export function AvailableDoctorsPanel({ selectedDate }: Props) {
  const { user, isAuthenticated } = useAuth();
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  // ✅ Simpler, automatic dependency management
  const { data: doctorsAvailability = [], isLoading } = useDoctorAvailability(
    viewDate,
    isAuthenticated && !!user
  );

  // No manual useEffect, no useCallback mess
  return (
    <Card>
      {isLoading ? <LoadingState /> : <DoctorsList doctors={doctorsAvailability} />}
    </Card>
  );
}

// Create hook: hooks/doctors/useDoctorAvailability.ts
export function useDoctorAvailability(viewDate: Date, enabled: boolean) {
  const startOfWeek = useMemo(() => {
    const date = new Date(viewDate);
    date.setDate(viewDate.getDate() - viewDate.getDay() + 1);
    return date;
  }, [viewDate]);

  return useQuery({
    queryKey: ['doctors', 'availability', startOfWeek.toISOString()],
    queryFn: () => frontdeskApi.getDoctorsAvailability(startOfWeek, endOfWeek),
    enabled,
  });
}
```

**Impact:** Low - But improves maintainability and performance

---

### 10. **Workflow Clarity Issues (MEDIUM)**

#### Issue: Consultation workflow state transitions not clearly bounded

**Current Flow (Implicit):**
```
Patient submits inquiry
  ↓
Frontdesk sees in dashboard (new inquiries count)
  ↓
Frontdesk clicks "Review" → ReviewConsultationDialog
  ↓
Frontdesk chooses: Approve | Request More Info | Reject
  ↓
Status changes: SUBMITTED → (APPROVED | NEEDS_MORE_INFO | CANCELLED)
  ↓
If APPROVED: Can schedule session
```

**Problem:** Workflow not explicitly modeled

**Refactoring:**
```typescript
// Create: domain/workflows/ConsultationRequestWorkflow.ts
export class ConsultationRequestWorkflow {
  /**
   * Consultation request lifecycle:
   * 
   * SUBMITTED (Patient submits)
   *   ↓ Frontdesk action needed
   * NEEDS_MORE_INFO (Request clarification)
   *   ↓ Patient provides info
   * PENDING_REVIEW (Waiting for review)
   *   ↓ Frontdesk action
   * ├─→ APPROVED (Ready to schedule)
   * │     ↓ Schedule appointment
   * │     → SCHEDULED
   * │     → CONFIRMED
   * │
   * └─→ REJECTED (Not suitable)
   */

  static canReview(status: ConsultationRequestStatus): boolean {
    return [
      ConsultationRequestStatus.SUBMITTED,
      ConsultationRequestStatus.PENDING_REVIEW,
      ConsultationRequestStatus.NEEDS_MORE_INFO,
    ].includes(status);
  }

  static canSchedule(status: ConsultationRequestStatus): boolean {
    return status === ConsultationRequestStatus.APPROVED;
  }

  static validTransitions(
    from: ConsultationRequestStatus,
    action: 'approve' | 'needs_more_info' | 'reject'
  ): ConsultationRequestStatus {
    const transitions: Record<
      ConsultationRequestStatus,
      Record<string, ConsultationRequestStatus>
    > = {
      [ConsultationRequestStatus.SUBMITTED]: {
        approve: ConsultationRequestStatus.APPROVED,
        needs_more_info: ConsultationRequestStatus.NEEDS_MORE_INFO,
        reject: ConsultationRequestStatus.CANCELLED,
      },
      // ... etc
    };

    return transitions[from][action];
  }
}

// Use in ReviewConsultationDialog:
const canSchedule = ConsultationRequestWorkflow.canSchedule(
  appointment.consultationRequestStatus
);
```

**Impact:** Medium - Clarity and maintainability

---

## 📊 Summary of Issues by Category

| Category | Count | Severity | Effort |
|----------|-------|----------|--------|
| Logic Duplication | 4 | HIGH | Medium |
| API Misuse | 1 | CRITICAL | Low |
| State Management | 2 | MEDIUM | Medium |
| Component Design | 3 | MEDIUM | High |
| Module Boundaries | 1 | HIGH | Low |
| Constants/Config | 3 | MEDIUM | Low |
| Error Handling | 2 | MEDIUM | Medium |
| Type Safety | 2 | LOW | Low |
| Performance | 2 | LOW | Low |
| Documentation | 3 | LOW | Low |

---

## 🎯 Refactoring Roadmap

### Phase 1: Critical Issues (1-2 days)
- [ ] Fix CheckInDialog API usage (doctorApi → frontdeskApi)
- [ ] Extract consultation filter logic to utility
- [ ] Create consultation status filter constants
- [ ] Document module boundaries (what each module can access)

### Phase 2: Important Issues (3-5 days)
- [ ] Convert consultations page to React Query pattern
- [ ] Split ReviewConsultationDialog into smaller components
- [ ] Standardize error handling across frontdesk module
- [ ] Create ConsultationRequestWorkflow domain object

### Phase 3: Nice-to-Have (5-7 days)
- [ ] Extract magic numbers to constants
- [ ] Convert AvailableDoctorsPanel to React Query
- [ ] Improve type safety in DTOs
- [ ] Add comprehensive unit tests

### Phase 4: Optimization (Ongoing)
- [ ] Performance monitoring and optimization
- [ ] Add integration tests
- [ ] Document workflows and architecture

---

## ✅ Immediate Action Items

### High Priority

**1. Fix API Inconsistency (15 minutes)**
```tsx
// File: components/frontdesk/CheckInDialog.tsx
// Change line 35 from:
const response = await doctorApi.checkInPatient(appointment.id, frontdeskUserId);
// To:
const response = await frontdeskApi.checkInPatient(appointment.id, frontdeskUserId);
```

**2. Create Consultation Filter Utilities (30 minutes)**
```typescript
// Create: utils/consultation-filters.ts
// Move filtering logic here and import in both dashboard and consultations pages
```

**3. Document Module Boundaries (1 hour)**
```
Create: /docs/frontdesk-module-boundaries.md
- What frontdesk can access
- What's off-limits
- Why module separation matters
```

### Medium Priority

**4. Standardize React Query Usage (2 hours)**
```typescript
// Create hook: hooks/consultations/useConsultationsByStatus.ts
// Update consultations page to use it
```

**5. Extract Consultation Workflow (2 hours)**
```typescript
// Create: domain/workflows/ConsultationRequestWorkflow.ts
// Update dialog and pages to use it
```

---

## 📈 Clean Code Compliance Checklist

| Principle | Status | Notes |
|-----------|--------|-------|
| Single Responsibility | ⚠️ 6/10 | ReviewConsultationDialog does too much |
| DRY (Don't Repeat Yourself) | ⚠️ 5/10 | Status filtering repeated 3+ times |
| KISS (Keep It Simple) | ⚠️ 6/10 | Some components too complex |
| Meaningful Names | ✅ 8/10 | Variables and functions well-named |
| Comment Clarity | ✅ 8/10 | Good use of JSDoc and inline comments |
| Error Handling | ⚠️ 6/10 | Inconsistent patterns |
| Testing | ❌ 3/10 | No unit tests found for frontdesk module |
| Type Safety | ✅ 8/10 | Good TypeScript usage |
| Performance | ✅ 8/10 | React Query well implemented |
| Maintainability | ⚠️ 6.5/10 | Some complexity high, boundaries unclear |

---

## 🚀 Next Steps

1. **This Sprint:** Fix critical API issue + extract filter logic
2. **Next Sprint:** Refactor state management + split complex components
3. **Planning:** Add comprehensive test coverage
4. **Ongoing:** Monitor and optimize based on user feedback

---

## 📚 References

- Clean Code (Robert C. Martin)
- Module boundaries: `MODULAR_MONOLITH_ARCHITECTURE_ANALYSIS.md`
- Frontdesk feature map: `FRONTDESK_USER_FEATURE_MAP.md`
- Current issue tracking: Use GitHub Issues or Jira

