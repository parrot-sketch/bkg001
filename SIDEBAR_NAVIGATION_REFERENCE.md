# Doctor Sidebar Navigation - Complete Reference Guide

## Current URL Structure & Routes

### Appointments Pages
```
/doctor/appointments
├── page.tsx (619 lines)
│   ├── HEAD: Doctor Appointments page
│   ├── Shows: All appointment statuses (Today/Upcoming/Past)
│   ├── Fetches: ALL_ACTIVE_STATUSES query
│   └── Routes to: /doctor/appointments/[appointmentId]
│
└── /doctor/appointments/[appointmentId]
    └── Details page (implied, checks for status)

/doctor/appointments/[appointmentId]
└── Derived component (from appointment context)
    ├── Can be:
    │   ├─ Confirmation dialog
    │   ├─ Review screen
    │   └─ Details view
    └── Back link: /doctor/appointments
```

### Consultations Pages
```
/doctor/consultations
├── page.tsx (366 lines)
│   ├── HEAD: Doctor Consultations page
│   ├── Shows: IN_CONSULTATION + COMPLETED only
│   ├── Fetches: CONSULTATION_STATUSES query
│   └── Routes to: /doctor/consultations/[appointmentId]
│
├── /doctor/consultations/[appointmentId]
│   └── Creates redirect:
│       ├── If active (IN_CONSULTATION):
│       │   └─ → /doctor/consultations/[id]/session
│       └── If completed:
│           └─ → /doctor/appointments/[id]  ❌ NAVIGATES AWAY
│
└── /doctor/consultations/[appointmentId]/session
    ├── page.tsx (consultation session UI)
    ├── Shows: Active consultation workspace
    ├── Allows: Notes, actions, completion
    └── On complete → /doctor/appointments/[id]
```

### Sidebar Navigation
```
DoctorSidebar.tsx (lines 13-39)
└── navItems array:
    ├── Dashboard → /doctor/dashboard
    ├── Appointments → /doctor/appointments  ← APPOINTMENTS LIST
    ├── Availability → /doctor/schedule
    ├── Consultation Room → /doctor/consultations  ← CONSULTATIONS LIST (REDUNDANT)
    ├── Surgical Cases → /doctor/surgical-cases
    ├── My Patients → /doctor/patients
    ├── Consent Templates → /doctor/consents/templates
    └── My Profile → /doctor/profile
```

---

## Current Navigation Problems

### Problem 1: User Path Confusion

```
User thinks: "I want to see my consultations"
Options:
  A) Click "Appointments" → See all appointments, some are consultations
  B) Click "Consultation Room" → See only consultations

Result: User doesn't know which to choose
        Both show consultations, different filtering
        Path A has more context
        Path B is narrower view
```

### Problem 2: The Bounce-Back Bug

```
User: Clicks "Consultation Room" sidebar
  ↓
Page: /doctor/consultations loads
  ↓
User: Sees completed consultation, clicks it
  ↓
Code: Checks if active...
      if (isActive) → /doctor/consultations/[id]/session
      else → /doctor/appointments/[id]  ❌
  ↓
User: Suddenly on "Appointments" page (via /doctor/appointments/[id])
  ↓
User: "Wait, I was just on Consultation Room... why am I on Appointments now?"
```

### Problem 3: API Query Wastage

```
Doctor's Typical Session:

1. Open dashboard
   └─ Queries: 2 (today + upcoming)

2. Click "Appointments"
   └─ Query: 1 (all active statuses)

3. Click "Consultation Room"  
   └─ Query: 1 (consultation statuses only)

4. Back to "Appointments"
   └─ Query: 1 (same as step 2, no cache)

5. Refresh page
   └─ Query: 1 (dashboard + appointments)

TOTAL: 6 queries serving essentially 2 views
REDUNDANCY: 80%
```

---

## Proposed New URL Structure

### After Consolidation (Option 1 - Recommended)

```
/doctor/appointments (UNIFIED)
├── page.tsx (merged, ~700 lines)
│   ├── HEAD: Appointments & Consultations
│   ├── Shows: ALL statuses, organized by priority
│   │   ├─ Active consultations (top)
│   │   ├─ Pending actions
│   │   ├─ Checked in / waiting
│   │   ├─ Upcoming appointments
│   │   └─ Consultation history
│   ├── Fetches: Single query with ALL_STATUSES
│   ├── State: Single data state, multiple views generated from it
│   └── Routes to: /doctor/consultations/[appointmentId]/session (for active)
│
└── /doctor/consultations/[appointmentId]/session
    └── Unchanged
        ├── Shows: Active consultation workspace
        └── On complete → Stays on unified page (no redirect)
```

### Sidebar Navigation (After)

```
DoctorSidebar.tsx (UPDATED)
└── navItems array:
    ├── Dashboard → /doctor/dashboard
    ├── Appointments → /doctor/appointments  ← UNIFIED (Appointments + Consultations)
    ├── Availability → /doctor/schedule
    ├── Surgical Cases → /doctor/surgical-cases
    ├── My Patients → /doctor/patients
    ├── Consent Templates → /doctor/consents/templates
    └── My Profile → /doctor/profile

(Removed: "Consultation Room" - no longer needed)
```

---

## Data Flow Comparison

### Current (Fragmented)

```
Dashboard (queries 1-2)
  │
  ├─→ Today Appointments
  │    └─ useDoctorTodayAppointments()
  │
  └─→ Upcoming Appointments  
       └─ useDoctorUpcomingAppointments()

                    ↓

Appointments Page (query 3)
  │
  └─→ doctorApi.getAppointments(
       user.id,
       ALL_ACTIVE_STATUSES,
       true
     )
  └─ Filters result by status/date client-side
  └─ Displays in tabs

                    ↓

Consultations Page (query 4)
  │
  └─→ doctorApi.getAppointments(
       user.id,
       CONSULTATION_STATUSES,  ← SAME ENDPOINT
       true
     )
  └─ Filters result to 2 statuses only
  └─ Displays in different grouping

PROBLEMS:
✗ Same endpoint called twice per session
✗ Different filtering on client (could be combined)
✗ No cache reuse between pages
✗ Data duplication multiplied
```

### Proposed (Unified)

```
Dashboard (queries 1-2)
  │
  ├─→ Today Appointments
  │    └─ useDoctorTodayAppointments()
  │
  └─→ Upcoming Appointments
       └─ useDoctorUpcomingAppointments()

                    ↓

Appointments Page (query 3) ← SINGLE ENDPOINT
  │
  └─→ doctorApi.getAppointments(
       user.id,
       ALL_STATUSES,
       true
     )
  └─ Query result cached by React Query
  └─ Multiple views generated from same data:
     ├─ Active consultations section
     ├─ Pending confirmations section
     ├─ Waiting queue section
     ├─ Upcoming appointments tabs
     └─ Consultation history section

                    ↓

User Navigates Within Page
  │
  └─→ Tab switch / Filter change / Section scroll
      └─ All use CACHED data
      └─ No new queries

BENEFITS:
✓ Single query per session (unless refresh)
✓ Intelligent data reuse
✓ React Query cache effective
✓ Fast section switching
✓ Unified context
```

---

## Link References & Dependencies

### Pages Linking to Appointments:
```
/doctor/dashboard (line 321)
  └─ Link href="/doctor/appointments"

/doctor/patients/[patientId]/case-plans (line 328)
  └─ onClick={() => router.push(`/doctor/appointments`)}

Dashboard widgets
  └─ Multiple references to /doctor/appointments

API responses
  └─ Contains consultation callback routes
```

### Pages Linking to Consultations:

```
/doctor/consultations/[appointmentId]/session/page-legacy.tsx (lines 109, 451, 474)
  └─ router.push('/doctor/appointments')
  └─ [Already redirects away from consultations page!]

/doctor/appointments/page.tsx (line 598)
  └─ onClick={() => router.push(`/doctor/consultations/${appointment.id}/session`)}
```

---

## Backward Compatibility Strategy

### Phase 1: Prepare (same day)
```
✓ Create new unified page at /doctor/appointments
✓ Keep old /doctor/consultations/page.tsx temporarily
✓ Deploy both versions
```

### Phase 2: Redirect (1 week)
```
✓ Update sidebar to point to /doctor/appointments only
✓ Keep /doctor/consultations redirect to /doctor/appointments
✓ All old links automatically work
✓ Users gradually migrate to new page
```

### Phase 3: Cleanup (after 1 week)
```
✓ Verify no traffic to old consultations page
✓ Remove /doctor/consultations/page.tsx
✓ Remove redirect
✓ Delete unused components
```

| Phase | Action | User Impact | Traffic |
|-------|--------|-------------|---------|
| **Phase 1** | New page exists | None | 0% on new page |
| **Phase 2** | Old redirects | Seamless | 100% migrate |
| **Phase 3** | Old deleted | None (already migrated) | New page only |

---

## Testing Navigation Paths

After consolidation, verify these paths work:

```
NAVIGATION:
✓ Sidebar "Appointments" → /doctor/appointments (unified page)
✓ Sidebar "Dashboard" → Links to appointments present
✓ Sidebar "My Patients" → Case plan links to appointments

ACTION BUTTONS:
✓ [Start Consultation] → /doctor/consultations/[id]/session
✓ [Complete Consultation] → Dialog, stays on page
✓ [Review] (pending) → Dialog, stays on page
✓ [Check In] → Checks in, stays on page

HISTORY:
✓ Click completed consultation → Stays on same page
✓ Completed count accurate → Shows in history section
✓ Time-based grouping → Today/Yesterday/Earlier

FILTERS:
✓ Tab switches → No page navigation
✓ Status filter → No page navigation
✓ Search query → No page navigation
```

---

## Migration Checklist

- [ ] Create feature branch
- [ ] Build unified page component
- [ ] Copy section components
- [ ] Merge data fetching logic
- [ ] Implement section organization
- [ ] Wire up all action buttons
- [ ] Test all navigation flows
- [ ] Test responsive design
- [ ] Update sidebar.tsx
- [ ] Add redirect from /consultations → /appointments
- [ ] Deploy to staging
- [ ] QA all paths
- [ ] Deploy to production
- [ ] Monitor for 1 week
- [ ] Remove old consultations page
- [ ] Update documentation
- [ ] Close tickets

---

## Reference Files

| File | Lines | Purpose | Action |
|------|-------|---------|--------|
| `/doctor/appointments/page.tsx` | 619 | Main appointments | KEEP + EXTEND |
| `/doctor/consultations/page.tsx` | 366 | Consultation view | CONSOLIDATE |
| `/components/doctor/DoctorSidebar.tsx` | 91 | Navigation | UPDATE (remove 1 item) |
| `/doctor/dashboard/page.tsx` | 415 | Dashboard | No changes needed |
| `/doctor/consultations/[id]/session/` | - | Session page | KEEP (referenced) |

---

## Quick Reference

### Current State
```
Sidebar: 8 items (Appointments + Consultation Room redundant)
Routes: 10+ appointments/consultation related routes
Queries: 4+ per session (wasteful)
Code: 985 lines total (duplicate)
UX: Confusing navigation
```

### After Consolidation  
```
Sidebar: 7 items (clean, no redundancy)
Routes: 6-7 appointments/consultation routes (focused)
Queries: 2-3 per session (optimized)
Code: ~700 lines (no duplication)
UX: Clear, priority-based organization
```

---

## Summary

The consolidation transforms the doctor's navigation from **confusing multi-page wandering** into a **clear, unified workflow** that matches the actual appointment lifecycle.

**Before:** "Where do I find consultations?" (Two places, which one?)  
**After:** "All my appointments are here, organized by what needs action." (One place, clear priority)
