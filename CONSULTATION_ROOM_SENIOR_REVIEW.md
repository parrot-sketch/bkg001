# Senior Engineer Review: Consultation Room Architecture & Workflow

## Executive Summary

The consultation room has a **solid architectural foundation** but reveals several **critical operational blind spots** from a senior engineering perspective. The system handles the happy path well (patient checks in → doctor starts → doctor completes), but has **dangerous failure modes** when doctors disconnect mid-session, and **timing logic issues** that could cause confusion and workflow disruptions.

---

## Architecture Overview

### Current Workflow Flow

```
┌─────────────────────┐
│  Appointment Booked │  (FrontDesk/Patient)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│ Doctor Confirms/Reschedules │  (Doctor Dashboard)
└──────────┬──────────────┘
           │
           ▼
┌──────────────────────┐
│ Patient Checked In   │  (FrontDesk) → CHECKED_IN status
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│ Doctor Notified (Dashboard)  │ (via useDoctorTodayAppointments)
│ Patient Moves to Queue       │  
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ Doctor Clicks "Start" in Queue   │ (Consultation Room or Dashboard)
│ StartConsultationDialog shows    │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Consultation Begins                 │
│ - Appointment → IN_CONSULTATION     │
│ - Consultation → IN_PROGRESS        │
│ - started_at timestamp recorded     │
│ - Timer begins (elapsed time)       │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Doctor Documents (Tabs/Rich Text)    │
│ Auto-save to Draft                   │
│ (FIXED: autosave debounce issue)     │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Doctor Completes Session             │
│ Selects outcome, patient decision    │
│ Saves final notes                    │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Appointment → COMPLETED              │
│ Doctor redirected or goes to queue   │
└──────────────────────────────────────┘
```

### Key Components

| Component | Purpose | File |
|-----------|---------|------|
| **ConsultationContext** | Central state management for entire session | `contexts/ConsultationContext.tsx` |
| **ConsultationSessionPage** | Layout: sidebar + workspace + queue | `app/doctor/consultations/[id]/session/page.tsx` |
| **ConsultationWorkspaceOptimized** | Tab-based documentation interface | `components/consultation/ConsultationWorkspaceOptimized.tsx` |
| **ConsultationSessionHeader** | Timer, status, quick actions | `components/consultation/ConsultationSessionHeader.tsx` |
| **RichTextEditor** | Medical note editing (FIXED autosave) | `components/consultation/RichTextEditor.tsx` |
| **ConsultationQueuePanel** | Waiting patients list | `components/consultation/ConsultationQueuePanel.tsx` |
| **StartConsultationUseCase** | Business logic for starting | `application/use-cases/StartConsultationUseCase.ts` |

---

## Critical Issues & Risks

### 🔴 **CRITICAL ISSUE #1: Doctor Leaves Mid-Session (No Timeout/Auto-Save Guarantees)**

#### The Problem

**When a doctor closes the browser / loses connection mid-consultation:**

```
Doctor in Session
↓
[Doctor loses connection: closes tab, network failure, crash]
↓
NO AUTOMATIC SESSION RECOVERY
↓
Appointment stuck in IN_CONSULTATION status
↓
Queue can't move to next patient
↓
Patient can't move forward in system
```

#### Current Behavior

1. **No disconnect detection**: The frontend has `beforeunload` that warns about unsaved changes, but there's **no backend session tracking**
2. **No heartbeat**: There's no mechanism to detect "doctor still actively connected"
3. **No auto-complete**: Orphaned sessions remain stuck in `IN_CONSULTATION` indefinitely
4. **Queue blocked**: Next patient in queue can't start their session until stuck appointment is manually fixed

#### Evidence

From `contexts/ConsultationContext.tsx` lines 599-607:
```tsx
// Only warns about UNSAVED CHANGES — doesn't handle abandoned session
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (state.workflow.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [state.workflow.isDirty]);
```

The `StartConsultationUseCase` does have **auto-healing logic** (lines 67-106) to detect stale consultations from "old code paths," but:
- ✅ Good: Prevents duplicate active consultations
- ❌ Bad: Only kicks in when doctor tries to START a NEW consultation
- ❌ Bad: Doesn't help the stuck appointment itself

#### Senior Engineering Assessment

**Severity**: 🔴 **CRITICAL** - Production blocker

**Impact**:
- Doctor leaves → patient's appointment is permanently stuck
- Queue system breaks (downstream patient can't start)
- No audit trail of why session ended
- Manual intervention required to unstick

**Root Cause**: Session lifecycle management is **incomplete** — only covers the happy path.

#### Recommendations

1. **Add Session Heartbeat** (Backend)
   - Track `last_activity_at` on consultation record
   - Frontend sends heartbeat every 30 seconds while tab is active
   - Backend marks session as "stale" if no heartbeat for 5 minutes

2. **Add Inactivity Auto-Save** (Frontend)
   - If user hasn't typed for 60 seconds, trigger auto-save
   - Update `consultation.updated_at` as indicator of staleness

3. **Add Session Recovery Modal** (Frontend)
   - When doctor re-opens tab: "Session lost. Restore?"
   - If restored → reconnect to same appointment
   - If not restored → offer to complete or abandon

4. **Add Background Job** (Backend)
   - Daily cleanup: Mark appointments stuck in `IN_CONSULTATION` for >4 hours as `ABANDONED`
   - Create audit event for compliance
   - Alert admin/doctor

---

### 🟡 **CRITICAL ISSUE #2: Timer Logic Decoupled from Slot Duration**

#### The Problem

**The consultation timer shows elapsed time, but is NOT tied to appointment slot duration.**

```
Appointment slot: 30 minutes
Doctor starts consultation
Timer shows: "00:00", "00:01", "00:02", ...
Doctor gets no warning when exceeding slot duration
Doctor could be 60 minutes into a 30-minute slot
```

#### Current Behavior

From `ConsultationSessionHeader.tsx` lines 66-87:
```tsx
// Live timer — just elapsed time from started_at
const [now, setNow] = useState(new Date());

useEffect(() => {
  if (!startedAt) return;
  const interval = setInterval(() => setNow(new Date()), 1000);
  return () => clearInterval(interval);
}, [startedAt]);

const elapsed = useMemo(() => {
  if (!startedAt) return null;
  const diff = now.getTime() - new Date(startedAt).getTime();
  // ... formats as HH:MM:SS ...
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}, [startedAt, now]);
```

**This timer:**
- ✅ Shows time spent in session
- ❌ Doesn't show remaining time
- ❌ Doesn't warn when exceeding slot
- ❌ Doesn't prevent overrunning

#### Why This Matters

1. **Scheduling Chaos**: Doctor doesn't know they're overrunning → next patient wait time increases
2. **No Escalation**: No warning when approaching slot end
3. **No Hard Stop**: Doctor can literally spend 2 hours in a 30-minute slot
4. **Queue Impacts**: If doctor is 45 min late, 3 downstream patients are pushed back

#### Evidence

Appointment has `slot_duration` and `duration_minutes`:
- `slot_duration`: The scheduled duration (e.g., 30 min)
- `duration_minutes`: Actual time spent (set after consultation completes)

Neither is used in the timer logic.

#### Senior Engineering Assessment

**Severity**: 🟡 **HIGH** - Operational risk

**Impact**:
- Schedule breakdown
- Patient frustration (long waits)
- Doctor workflow disrupted (doesn't know they're overrunning)
- Revenue impact (over/under-booked sessions)

**Root Cause**: Timer is **disconnected from slot management** — treats it as standalone elapsed-time counter.

#### Recommendations

1. **Pass Slot Duration to Header** (Quick Win)
   ```tsx
   <ConsultationSessionHeader
     patientName={patientName}
     consultation={consultation}
     appointmentStatus={appointment?.status}
     slotDurationMinutes={appointment?.slot_duration || 30} // ADD THIS
     userRole={Role.DOCTOR}
     // ... rest
   />
   ```

2. **Show Remaining Time with Color Coding**
   ```tsx
   // Header timer display:
   // Green: 0-20 minutes remaining
   // Amber: 5-10 minutes remaining
   // Red: < 5 minutes or overrunning
   // Orange + Badge: OVERRUNNING (e.g., "+5 min")
   ```

3. **Add Soft Stop Warning** (at 90% of slot)
   ```
   TimerWarning: "You have 3 minutes remaining in this 30-minute slot.
   Complete notes and wrap up consultation."
   ```

4. **Add Hard Stop Option** (at 100% + 5 minutes)
   ```
   OverrunDialog: "Session has exceeded slot. Complete now?"
   - Complete & Move to Next
   - Extend 15 minutes (shows in schedule)
   - Continue (audit logged)
   ```

---

### 🟡 **ISSUE #3: Queue Panel UX When Switching Patients**

#### The Problem

Doctor switches patient in the queue mid-session. What happens?

```
Doctor in Session with Patient A
↓
[Clicks "Patient B" in queue]
↓
??? What happens to Patient A's consultation?
??? Does Patient A's IN_CONSULTATION appointment get cleaned up?
??? Is there a warning?
```

#### Current Behavior

From `ConsultationWorkspaceOptimized.tsx` and context:
```tsx
const handleTabChange = useCallback((tabId: string) => {
  setActiveTab(tabId);
  router.replace(`?tab=${tabId}`, { scroll: false });
}, [router]);

// But NO HANDLER for patient switching in queue
```

The `switchToPatient` function exists in context but:
- No visible prompt about unsaved work
- Might lose draft notes if not auto-saved
- Patient A's appointment might still be `IN_CONSULTATION`

#### Senior Engineering Assessment

**Severity**: 🟡 **MEDIUM** - UX risk

**Impact**:
- Data loss (unsaved notes in Patient A)
- Confusion (Patient A's appointment orphaned)
- Audit trail broken

#### Recommendations

1. **Add Pre-Switch Confirmation Dialog**
   ```
   "You have unsaved changes for [Patient A].
   - Save & Switch to [Patient B]
   - Discard & Switch
   - Cancel (stay with Patient A)"
   ```

2. **Auto-Save Before Switch**
   ```tsx
   const switchToPatient = useCallback(async (appointmentId: number) => {
     if (state.workflow.isDirty) {
       await saveDraft(); // Wait for save to complete
     }
     const response = await loadAppointment(appointmentId);
     // Now load new patient
   }, [state.workflow.isDirty, saveDraft, loadAppointment]);
   ```

3. **Mark Previous Appointment State**
   - When switching: previous appointment remains `IN_CONSULTATION`
   - Only mark `COMPLETED` when doctor explicitly completes
   - Audit log: "Doctor switched from Patient A to Patient B"

---

### 🟠 **ISSUE #4: Auto-Save Still Has Edge Cases Despite Fix**

#### Current Status

✅ **FIXED**: The auto-save debounce issue where RichTextEditor's `onChange` was firing twice per keystroke.

**Our Fix**:
- Added `isInternalUpdateRef` to RichTextEditor to skip unnecessary onChange on prop updates
- Added deduplication in ExaminationTab to prevent redundant parent notifications

❌ **Remaining Edge Case**: What if:
1. Doctor types quickly
2. Auto-save fires
3. Saves 80% of the notes to database
4. Doctor closes tab before save completes
5. Doctor reopens tab
6. Notes might be partially saved

#### Risk Assessment

**Severity**: 🟠 **MEDIUM** - Data integrity

**Current Mitigation**:
- Auto-save has 3-second debounce (enough time for most users)
- API is transactional (saves all 4 fields together)
- `beforeunload` warning discourages closing

**Better Mitigation**:
```tsx
// In saveDraft:
const saveDraftMutation = useMutation({
  mutationFn: async (data) => {
    dispatch({ type: 'SET_SAVING', payload: true });
    
    // Ensure mutation completes before allowing navigation
    const response = await consultationApi.saveDraft(data);
    
    return response;
  },
  onSuccess: () => {
    dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' });
    // Update last-saved timestamp
  },
  onError: () => {
    dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'error' });
    // Retry or alert doctor
  }
});
```

---

## Design Strengths

### ✅ **What's Working Well**

1. **Appointment State Machine** (Excellent)
   - Clear state transitions: SCHEDULED → CHECKED_IN → IN_CONSULTATION → COMPLETED
   - Business logic in `AppointmentStateTransitionService`
   - Prevents invalid transitions (e.g., can't complete if not started)

2. **Concurrency Guard** (Smart)
   - `StartConsultationUseCase` prevents doctor from having 2 active consultations
   - Auto-healing of stale appointments from old code paths
   - See lines 67-106 of `StartConsultationUseCase.ts`

3. **Tab-Based Workflow** (Good UX)
   - Structured documentation: Goals → Exam → Assessment → Plan → Billing
   - Completion indicators (✓ marks)
   - Smooth transitions with animations

4. **Context-Based State** (Clean Architecture)
   - Single source of truth in `ConsultationContext`
   - Derived values: `isActive`, `isReadOnly`, `canSave`, `canComplete`
   - Provider pattern enables clean component composition

5. **Audit Logging** (Compliance Ready)
   - Every consultation start/complete logged
   - Doctor ID, timestamp, and details recorded
   - Infrastructure ready: `ConsoleAuditService` and `AuditMiddleware`

---

## Timing/Duration Detailed Analysis

### How Slot Duration Should Work

```
Appointment created with:
  - slot_start_time: "09:00"
  - slot_duration: 30 minutes
  - appointment_date: 2026-03-03
  → Slot ends at 09:30

Doctor starts consultation at 09:05
  - consultation.started_at = 09:05
  - remaining_time = 09:30 - 09:05 = 25 minutes
  
Timer should show:
  - Elapsed: "00:00" → "24:59" ✓
  - Remaining: "25:00" → "00:00" ✓
  - Status at 25:00: "OVERRUNNING +0:01" 

Currently:
  - Elapsed: "00:00" → "24:59" ✓
  - Remaining: NOT SHOWN ❌
  - Status: NOT TRACKED ❌
```

#### Current Duration Tracking

Database schema has:
- `appointment.slot_start_time` — when slot begins
- `appointment.slot_duration` — duration in minutes
- `appointment.duration_minutes` — ACTUAL time spent (set after completion)
- `consultation.started_at` — when doctor clicked "Start"
- `consultation.completed_at` — when doctor clicked "Complete"

But the **header timer doesn't use any of this slot information** — it just calculates elapsed time since `consultation.started_at`.

---

## Recommendations Summary (Priority Order)

### 🔴 P0 (Critical - Do Immediately)

1. **Implement Session Heartbeat/Timeout**
   - Detect abandoned sessions
   - Auto-complete or mark as abandoned after inactivity
   - Add heartbeat endpoint (POST `/api/consultations/{id}/heartbeat`)
   - Track `last_activity_at` on consultation record

2. **Wire Slot Duration to Timer**
   - Pass `appointment.slot_duration` to `ConsultationSessionHeader`
   - Display remaining time (not just elapsed)
   - Show warnings at 80%, 100%, and 110% of slot

### 🟡 P1 (High - Do Next Sprint)

3. **Add Patient Switch Confirmation**
   - Modal before switching patient in queue
   - Auto-save current drafts before switch

4. **Improve Auto-Save Visibility**
   - Show "Saved at 2:34 PM" timestamp (not just indicator)
   - Show "This will auto-save in..." countdown on first keystroke
   - Add retry logic if auto-save fails

5. **Add Session Recovery**
   - Detect tab close/reload
   - Offer to restore session
   - Prevent duplicate sessions

### 🟠 P2 (Medium - Polish)

6. **Add Hard Stop at Slot End**
   - Prevent overrunning (or require explicit extension)
   - Audit log extensions
   - Escalate to scheduler if repeatedly overrunning

7. **Add Visual Overrun Indicator**
   - Red timer + badge when overrunning
   - Notification sound (optional)

8. **Improve Queue Handoff**
   - Show next patient name in queue
   - One-click jump to next (with auto-save)
   - Show "Expected start time" for queued patients

---

## Code Quality Assessment

### Architecture: 8/10
- Clean separation of concerns (Context, Components, Use Cases)
- Good use of async/await for API calls
- Type-safe DTOs and domain entities

### Error Handling: 6/10
✅ Good: DomainException hierarchy, try-catch in use cases
❌ Needs: Better error recovery, timeout handling, network resilience

### Testing: Not Visible
- No visible test files for ConsultationContext
- StartConsultationUseCase has tests (good)
- Missing: E2E tests for session lifecycle

### Documentation: 7/10
✅ Good: Detailed comments in use cases
❌ Needs: Architecture decision records, workflow diagrams

---

## Workflow Edge Cases to Consider

| Scenario | Current Behavior | Should Be | Risk |
|----------|------------------|-----------|------|
| Doctor starts session, browser crashes | Appointment stuck IN_CONSULTATION | Auto-recover or timeout | 🔴 CRITICAL |
| Doctor switches patient mid-session | Patient A still IN_CONSULTATION | Auto-complete or prompt | 🟠 MEDIUM |
| Doctor types for 5 minutes, doesn't save | Data might be stuck in 3s debounce | Confirm save before close | 🟠 MEDIUM |
| Doctor exceeds appointment time | No warning or limit | Show warning, prevent overrun | 🟡 HIGH |
| Multiple doctors load same session page | Concurrency guard prevents double-start | ✅ Working | ✅ SAFE |
| Doctor starts session 10 min late | No catch-up time | Pass `actual_start_time` to timer | 🟠 MEDIUM |
| Patient data loads slowly | Blank page, confusing UX | Show skeleton, better loading states | 🟡 MEDIUM |

---

## Integration Points (Workflow Dependencies)

```
┌──────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT LIFECYCLE                         │
└──────────────────────────────────────────────────────────────────┘

FrontDesk Dashboard
  ↓ (Books appointment)
  ├─→ Appointment.PENDING/SCHEDULED
  │
  ├─→ Notifies Doctor (useDoctorTodayAppointments)
  │
FrontDesk Intake
  ↓ (Checks patient in)
  ├─→ Appointment.CHECKED_IN
  │
  ├─→ Patient added to Queue
  │   └─→ Updates Doctor's queue panel (real-time?)
  │
Doctor Dashboard / Consultation Room
  ↓ (Clicks "Start")
  ├─→ StartConsultationUseCase.execute()
  │   ├─→ Creates/starts Consultation record
  │   ├─→ Sets consultation.started_at = NOW
  │   ├─→ Sets appointment.IN_CONSULTATION
  │   └─→ Audit log
  │
Consultation Room (Active Session)
  ├─→ Auto-save drafts (3s debounce)
  ├─→ Show elapsed timer (ISSUE: no slot aware)
  ├─→ Queue panel shows waiting patients
  │   └─→ Doctor can switch (ISSUE: no confirmation)
  │
Doctor Complete
  ├─→ CompleteConsultationUseCase.execute()
  │   ├─→ Saves final notes
  │   ├─→ Records outcome & patient decision
  │   ├─→ Sets appointment.COMPLETED
  │   ├─→ Sets consultation.completed_at = NOW
  │   ├─→ Sets appointment.duration_minutes
  │   └─→ Audit log
  │
Doctor redirected
  ├─→ Back to consultations list OR
  └─→ Load next from queue (if available)
```

---

## Production Readiness Checklist

- [ ] Session timeout mechanism
- [ ] Slot duration warning system
- [ ] Queue patient safety
- [ ] Auto-save retry logic
- [ ] Heartbeat/activity monitoring
- [ ] Load testing (what if 50 doctors in session simultaneously?)
- [ ] Network disconnection recovery
- [ ] Audit completeness verification
- [ ] HIPAA compliance review
- [ ] Data loss prevention tests
- [ ] Session restoration after browser crash
- [ ] Performance optimization (large patient records)

---

## Conclusion

**The consultation room is ~75% production-ready** with a solid architectural foundation, but requires attention to **session lifecycle management** and **timing awareness** before it's suitable for high-throughput clinical usage.

**The three biggest risks are:**
1. 🔴 Abandoned sessions blocking the queue
2. 🟡 Doctors overrunning appointment slots with no awareness
3. 🟠 Queue switching without proper handoff

**Recommend**: Implement P0 items before widespread rollout to doctors. The architecture can support these additions cleanly.

