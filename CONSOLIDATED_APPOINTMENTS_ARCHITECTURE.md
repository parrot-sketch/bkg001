# Consolidated Appointments Page - Architecture & Design

## New Single-Page Structure

Instead of two separate pages (`/doctor/appointments` and `/doctor/consultations`), consolidate into ONE unified page with intelligent sectioning.

---

## Visual Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      DOCTOR APPOINTMENTS PAGE                              │
│                        (/doctor/appointments)                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Header Row:                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Appointments  [🔔 2 active] [⏰ 8 pending] [📊 12 today]  [↻ Refresh] │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─ URGENT - Active Consultations ─────────────────────────────────────┐ │
│  │ [3 consultations in progress]                                        │ │
│  │                                                                       │ │
│  │ 💜 14:30 │ ● │ Sarah Johnson │ Rhinoplasty Follow-up     │ [Continue] │ │
│  │ 💜 14:05 │ ● │ David Smith   │ Post-Op Review (20m)      │ [Continue] │ │
│  │ 💜 13:15 │ ● │ Maria Garcia  │ Consultation              │ [Complete] │ │
│  │                                                                       │ │
│  │ Next: Review case notes, ensure all assessments complete            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─ ACTION REQUIRED - Pending Confirmations ──────────────────────────┐ │
│  │ [2 pending doctor confirmation]                                    │ │
│  │                                                                     │ │
│  │ 🟠 16:00 │ ● │ John Wilson   │ Initial Consultation       │ [Review] │ │
│  │ 🟠 16:30 │ ● │ Emma Brown    │ Procedure Discussion       │ [Review] │ │
│  │                                                                     │ │
│  │ Action: Review patient details and confirm or reschedule          │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─ NEXT UP - Checked In & Wait Queue ─────────────────────────────────┐ │
│  │ [5 patients ready for consultation]                                │ │
│  │                                                                     │ │
│  │ 🟢 15:00 │ ● │ Lisa Anderson │ Lip Augmentation          │ [Start] │ │
│  │ 🟢 15:30 │ ● │ Tom Harrison  │ Skin Rejuvenation         │ [Start] │ │
│  │ 🟢 16:00 │ ● │ Rachel White  │ Brow Lift                 │ [Start] │ │
│  │ 🟢 16:30 │ ● │ Mark Davis    │ Facelift Consultation     │ [Start] │ │
│  │ 🟢 17:00 │ ● │ Sophie Miller │ Rhinoplasty               │ [Start] │ │
│  │                                                                     │ │
│  │ Action: Start consultation when ready                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  Tab Navigation:                                                         │
│  ├─ Upcoming [12]    ├─ Past Consultations [94]   ├─ Search...   │ │
│  ├─ Scheduled [8]    ├─ Help with appointment                        │ │
│  └─ Late/NoShow [1]                                                   │ │
│                                                                            │
│  ┌─ UPCOMING APPOINTMENTS ────────────────────────────────────────────┐ │
│  │ Filters: All  |  Scheduled  |  Confirmed                          │ │
│  │ Sort: By date ↓                                                   │ │
│  │                                                                     │ │
│  │ 🗓️ Friday, March 7                                                │ │
│  │                                                                     │ │
│  │ 🔵 10:00 │ ● │ Amanda Foster │ Breast Augmentation       │ → Prep  │ │
│  │ 🔵 11:30 │ ● │ Nicole Clark  │ Tummy Tuck Consultation   │ → Chat  │ │
│  │                                                                     │ │
│  │ 🗓️ Saturday, March 8                                              │ │
│  │                                                                     │ │
│  │ 🔵 14:00 │ ● │ Jessica Lee   │ Post-Op Check             │ → Prep  │ │
│  │                                                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─ CONSULTATION HISTORY ────────────────────────────────────────────┐ │
│  │ [⬇️ Load more consultations]                                      │ |
│  │                                                                     │ │
│  │ 🗓️ Today, March 3                                                 │ │
│  │                                                                     │ │
│  │ ✅ 13:00 │ ✓ │ Robert Taylor │ Rhinoplasty Follow-up   (25 min) │ │
│  │ ✅ 12:00 │ ✓ │ Jennifer King │ Liposuction Post-Op      (18 min) │ │
│  │                                                                     │ │
│  │ 🗓️ Yesterday, March 2                                             │ │
│  │                                                                     │ │
│  │ ✅ 15:00 │ ✓ │ Michael Scott │ Facelift Consultation    (22 min) │ │
│  │ ✅ 14:00 │ ✓ │ Laura Evans   │ Breast Augmentation      (19 min) │ │
│  │                                                                     │ │
│  │ 🗓️ Earlier                                                        │ │
│  │                                                                     │ │
│  │ ✅ 122 completed consultations this month                         │ │
│  │ 📊 Average duration: 22 minutes                                   │ │
│  │                                                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Data Structure

```typescript
// Single data fetch - everything needed
const appointmentsData = await doctorApi.getAppointments(
  doctorId,
  [
    'PENDING_DOCTOR_CONFIRMATION',  // Needs action
    'SCHEDULED',                     // Upcoming
    'CONFIRMED',                     // Upcoming
    'CHECKED_IN',                    // Waiting
    'READY_FOR_CONSULTATION',        // Waiting
    'IN_CONSULTATION',               // Active
    'COMPLETED',                     // History
    'NO_SHOW',                       // History/special case
    'CANCELLED',                     // History/special case
  ].join(','),
  true
);

// Client-side categorization (no additional queries)
const categorized = {
  active: appointmentsData.filter(a => a.status === 'IN_CONSULTATION'),
  pendingConfirm: appointmentsData.filter(
    a => a.status === 'PENDING_DOCTOR_CONFIRMATION'
  ),
  checkedIn: appointmentsData.filter(
    a => a.status === 'CHECKED_IN' || 
         a.status === 'READY_FOR_CONSULTATION'
  ),
  upcoming: appointmentsData.filter(a => {
    const aptDate = new Date(a.appointmentDate);
    return isFuture(aptDate) && 
           !['IN_CONSULTATION', 'COMPLETED'].includes(a.status);
  }),
  completed: appointmentsData.filter(
    a => a.status === 'COMPLETED' ||
         a.status === 'CANCELLED' ||
         a.status === 'NO_SHOW'
  ),
};
```

### Component Structure

```
DoctorAppointmentsPage
├── Header
│   ├── Title + Stats Pills
│   └── Refresh Button
│
├─ ActiveConsultationsSection
│  ├── SectionHeader
│  ├── ConsultationList
│  │  └─ ConsultationRow (repeating)
│  └── CoachingText
│
├─ PendingConfirmationsSection
│  ├── SectionHeader
│  ├── ConfirmationList
│  │  └─ ConfirmationRow (repeating)
│  └── CoachingText
│
├─ WaitingQueueSection
│  ├── SectionHeader
│  ├── WaitingList
│  │  └─ WaitingRow (repeating)
│  └── CoachingText
│
├─ TabbedUpcomingSection
│  ├── TabBar (Today | Upcoming | Scheduled | Past)
│  ├── FilterControls
│  ├── DateGroupedList
│  │  └─ AppointmentRow (repeating)
│  └── EmptyState
│
├─ ConsultationHistorySection
│  ├── SectionHeader
│  ├── DateGroupedCompletedList
│  │  ├─ Today Group
│  │  │  └─ HistoryConsultationRow (repeating)
│  │  ├─ Yesterday Group
│  │  │  └─ HistoryConsultationRow (repeating)
│  │  └─ Earlier Group
│  │     └─ HistoryConsultationRow (repeating)
│  ├── Stats (Total, Avg Duration)
│  └── LoadMoreButton
│
└── Modals/Dialogs
    ├── ConfirmationDialog
    ├── RescheduleDialog
    └── CompleteConsultationDialog
```

---

## Key Features

### 1. Priority-Based Organization

**Top to Bottom = Most Urgent to Least Urgent**

```
Priority 1: Active Consultations (in progress)
           → Doctor MUST attend now
           → Quick "Continue" or "Complete" buttons visible

Priority 2: Pending Confirmations (needs doctor approval)
           → Doctor MUST act today (usually within 24h)
           → "Review" or action buttons visible

Priority 3: Waiting (checked-in, ready)
           → Next in line for doctor
           → "Start" button visible

Priority 4: Upcoming (scheduled, future)
           → Information, less urgent
           → View-only or minimal actions

Priority 5: History (completed)
           → Reference/archive
           → View notes, reports, etc.
```

### 2. Smart Navigation

**No More Page Jumping:**

```typescript
// All interactions stay on the same page

// Active consultation → Start session modal/dialog
handleContinueConsultation = (apt) => {
  router.push(`/doctor/consultations/${apt.id}/session`);
};

// Completed consultation → Stays on same page
// Shows in "Consultation History" section
// User doesn't get redirected to /doctor/appointments

// Pending confirmation → Inline dialog/modal
handleConfirmation = (apt) => {
  setShowConfirmationDialog(true);
  setSelectedAppointment(apt);
  // After confirmation, reload section
};
```

### 3. Single Data Source

**React Query Caching:**

```typescript
// Initial load
const { data, isLoading, refetch } = useQuery({
  queryKey: ['doctor-appointments', doctorId],
  queryFn: () => doctorApi.getAppointments(
    doctorId,
    ALL_STATUSES,
    true
  ),
  staleTime: 2 * 60 * 1000, // 2 minutes
});

// All sub-sections reference same data
// Tab changes? Use cached data
// Filter changes? Use cached data
// User navigates away? Data stays in cache
// User navigates back? Instant load
```

---

## Implementation Checklist

### Phase 1: Structure (2 hours)
- [ ] Create new `AppointmentsUnified` component
- [ ] Build `ActiveConsultationsSection`
- [ ] Build `PendingConfirmationsSection`
- [ ] Build `WaitingQueueSection`
- [ ] Build `UpcomingTabbedSection`
- [ ] Build `ConsultationHistorySection`
- [ ] Copy shared components from consultations page

### Phase 2: Integration (1.5 hours)
- [ ] Wire up data fetching
- [ ] Implement sorting logic
- [ ] Implement filtering logic
- [ ] Implement search (if needed)
- [ ] Hook up action buttons

### Phase 3: Polish (0.5 hour)
- [ ] Loading states for each section
- [ ] Empty states
- [ ] Error handling
- [ ] Animations/transitions

### Phase 4: Testing (1 hour)
- [ ] Test all workflows
- [ ] Check responsive design
- [ ] Test modals/dialogs
- [ ] Check performance

### Phase 5: Cleanup (1 hour)
- [ ] Delete `/doctor/consultations/page.tsx`
- [ ] Update sidebar
- [ ] Update links in other pages
- [ ] Delete unused components

---

## API Calls - Before vs After

### Current (Wasteful):
```
Session 1: Dashboard loads    → Query 1, Query 2
Session 2: Click Appointments → Query 3
Session 3: Click Consultations → Query 4
Total: 4 queries
```

### After Consolidation:
```
Session 1: Dashboard loads      → Query 1, Query 2
Session 2: Click Appointments  → Query 3
Session 3: Switch tabs/filters → Cached, 0 queries
Session 4: Refresh button      → Query 3 (refresh)
Total: 3-4 queries (same session doesn't query twice)
```

---

## Code Savings

| Aspect | Before | After | Saved |
|--------|--------|-------|-------|
| **Page files** | 2 | 1 | -1 |
| **Total lines** | 985 | ~700 | -285 |
| **Components** | 4 | 3-4 | ~1-2 |
| **API endpoints** | 1 (called 4x) | 1 (called 1-2x) | -2 calls |
| **Sidebar items** | 8 | 7 | -1 |

---

## User Experience Improvements

| Aspect | Current | After |
|--------|---------|-------|
| **Navigation clarity** | Confusing | Clear |
| **Page jumps** | Frequent | None |
| **Context switching** | High | Low |
| **Load time** | Slower (2 pages) | Faster (1 page) |
| **Information finding** | Hard | Easy |
| **Sidebar cognitive load** | High (2 items for same data) | Low (1 clear item) |
| **Workflow alignment** | Misaligned | Perfect |

---

## Migration Strategy

### Step 1: Feature Branch
```bash
git checkout -b feature/consolidate-appointments-consultations
```

### Step 2: Keep Old Page Working
```
/doctor/appointments → NEW unified page
/doctor/consultations → Redirect to /doctor/appointments?section=consultations
```

### Step 3: Test Both Working Together
```
Old URL still works (for backward compatibility)
New consolidated page is fully functional
Analytics show usage shift
```

### Step 4: Deprecate Old Page
```
Remove /doctor/consultations from sidebar
Keep redirect for external links
Mark old page as deprecated
```

### Step 5: Final Cleanup
```
Delete /doctor/consultations/page.tsx
Remove redirect
Update all documentation
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| **Page load time** | < 1s (was ~1.5s with two page loads) |
| **API queries per session** | 3-4 (was 4+) |
| **Click-to-action time** | < 100ms (was < 200ms due to navigation) |
| **Sidebar cognitive load** | 1 item (was 2 confusing items) |
| **Code duplication** | 0% (was ~85%) |
| **Navigation errors** | 0 (was page-jumping issues) |
| **User satisfaction** | +40% (clearer workflow) |

---

## Notes for Implementation

1. **Keep backward compatibility** - Don't break old links immediately
2. **Use React Query** - Cache data aggressively to reduce API calls  
3. **Implement keyboard shortcuts** - Power users love quick navigation
4. **Add section anchors** - #active-consultations, #pending-confirmations, etc. 
5. **Mobile-first design** - Sections should collapse on mobile
6. **Analytics** - Track which sections users engage with most
7. **Accessibility** - Section headers should be semantic (H2)
8. **Performance** - Use virtualization for large consultant history list

