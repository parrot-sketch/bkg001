# Consultation Room: Quick Reference & Implementation Status

## Current State (Before Fixes)

```
✅ = Implemented & Working
❌ = Missing / Not Implemented  
🟡 = Partially Working
```

### Core Features

| Feature | Status | Priority | Risk |
|---------|--------|----------|------|
| **Patient Booking** | ✅ | — | ✅ SAFE |
| **Doctor Confirmation** | ✅ | — | ✅ SAFE |
| **Patient Check-In** | ✅ | — | ✅ SAFE |
| **Queue Management** | ✅ | — | ✅ SAFE |
| **Start Consultation** | ✅ | — | 🟡 NEEDS P0 |
| **Documentation (Tabs)** | ✅ | — | 🟡 NEEDS P1 |
| **Auto-Save (Drafts)** | ✅ | — | ✅ FIXED |
| **Complete Consultation** | ✅ | — | 🟡 NEEDS P0 |

### Consultation Room Features

| Feature | Status | Code | Priority | Issue |
|---------|--------|------|----------|-------|
| Elapsed Timer | ✅ | `ConsultationSessionHeader.tsx:66` | P1 | No slot awareness |
| Remaining Time | ❌ | — | **P0** | User can overrun slots |
| Slot Duration Warnings | ❌ | — | **P0** | No UX feedback |
| Session Timeout | ❌ | — | **P0** | Abandoned sessions |
| Heartbeat/Activity Monitor | ❌ | — | **P0** | Can't detect disconnect |
| Queue Switching | ✅ | `ConsultationQueuePanel.tsx` | **P1** | No save confirmation |
| Patient Switch Safety | 🟡 | `contexts/ConsultationContext.tsx` | **P1** | Draft loss possible |
| Auto-Heal Stale Sessions | ✅ | `StartConsultationUseCase.ts:67` | P2 | Only on next start |

---

## Root Cause Analysis: Why These Issues Exist

### Issue #1: Session Timeout

**Root Cause**: Session lifecycle was designed for "normal exit" only
- ✅ What works: Doctor completes → cleans up
- ❌ What's missing: Doctor closes tab → ???

**Why it happened**: 
- Single-page app assumption (user finishes before leaving)
- No timeout concept in healthcare workflows traditionally
- Focus on the happy path during initial development

**Fix Strategy**: 
- Add heartbeat mechanism (doctor still there?)
- Add auto-cleanup for stale sessions (door left open)
- Add recovery modal for reconnection

---

### Issue #2: Slot Duration Unawareness

**Root Cause**: Timer was treated as "stopwatch" not "schedule constraint"

```
Initial Implementation:
  Timer = elapsed_time_since_start
  
What's needed:
  Timer = (remaining_time_in_slot) or (overrun_time)
```

**Why it happened**:
- Timer is independent of appointment schedule
- Slot duration lives in `appointment` record
- Header doesn't receive appointment context originally
- UI focused on "show elapsed", not "enforce schedule"

**Fix Strategy**:
- Pass `slot_duration` and `slot_start_time` to header component
- Calculate `remaining_time = slot_end_time - now`
- Add visual warnings and progressbar

---

### Issue #3: Queue Switch Without Safety

**Root Cause**: Queue was added as afterthought, switching was "just load new appointment"

```
Current:
  Click "Next Patient"
    ↓
  Load patient data
    ↓
  Lose context of previous patient
  
Safe version:
  Click "Next Patient"
    ↓
  Show "Save notes first?" modal
    ↓
  Wait for auto-save
    ↓
  Then load new patient
```

**Why it happened**:
- Queue panel is optional/collapsible
- Switch logic was simple (just navigate)
- No explicit sync point for data

**Fix Strategy**:
- Add confirmation modal
- Block switch until save completes
- Audit log doctor switches

---

## Implementation Phases

### PHASE 0: Analysis & Planning ✅ 
- [x] Senior review completed
- [x] Root causes identified
- [x] Implementation guide written
- [x] Current status: ~1-2 weeks to implement P0

### PHASE 1: Session Timeout (P0)
**Estimated Effort**: 3-4 days
**Risk**: Medium (touches core session logic)

Task breakdown:
```
Backend:
  [ ] Create heartbeat endpoint (2 hours)
  [ ] Create cleanup service (3 hours)
  [ ] Add database migration (1 hour)
  [ ] Create cron job / task scheduler (2 hours)
  
Frontend:
  [ ] Add heartbeat interval to context (2 hours)
  [ ] Add recovery modal (3 hours)
  [ ] Update UI on abandoned session (1 hour)
  
Testing:
  [ ] Unit tests (2 hours)
  [ ] E2E tests (3 hours)
  
Total: ~19 hours = 2.4 days
```

### PHASE 2: Slot Duration Timer (P0)
**Estimated Effort**: 2-3 days
**Risk**: Low (UI enhancement, no state changes)

Task breakdown:
```
Frontend:
  [ ] Update timer component props (1 hour)
  [ ] Calculate remaining time (2 hours)
  [ ] Add warning UI (2 hours)
  [ ] Add overrun indicator (1 hour)
  [ ] Update consumer components (1 hour)
  
Testing:
  [ ] Unit tests for timer logic (2 hours)
  [ ] E2E timer behavior (2 hours)
  
Documentation:
  [ ] Update doctor training materials (1 hour)
  
Total: ~12 hours = 1.5 days
```

### PHASE 3: Queue Switch Safety (P1)
**Estimated Effort**: 2 days
**Risk**: Low (enhances existing feature)

Task breakdown:
```
Frontend:
  [ ] Create confirmation modal (2 hours)
  [ ] Update switch logic with save (2 hours)
  [ ] Update context to wait for save (1 hour)
  [ ] Add toasts/feedback (1 hour)
  
Backend:
  [ ] No backend changes needed
  
Testing:
  [ ] Happy path E2E (2 hours)
  [ ] Failure cases (1 hour)
  
Total: ~9 hours = 1.1 days
```

---

## Code Locations Quick Reference

### Core Components

```
Consultation Context (State Management)
├─ File: contexts/ConsultationContext.tsx
├─ Key functions:
│   ├─ startConsultation() — line 414
│   ├─ saveDraft() — line 465
│   ├─ completeConsultation() — line 520
│   ├─ switchToPatient() — [needs update]
│   └─ Auto-save effect — line 569
├─ Issues:
│   ├─ No heartbeat mechanism
│   ├─ No inactivity detection
│   └─ switchToPatient doesn't wait for save

Consultation Session Page (Layout)
├─ File: app/doctor/consultations/[appointmentId]/session/page.tsx
├─ Key components:
│   ├─ ConsultationSessionHeader (timer)
│   ├─ PatientInfoSidebar (patient data)
│   ├─ ConsultationWorkspaceOptimized (tabs)
│   └─ ConsultationQueuePanel (queue)
├─ Issues:
│   └─ Doesn't pass slot_duration to header

Consultation Session Header (Timer)
├─ File: components/consultation/ConsultationSessionHeader.tsx
├─ Lines: 66-87 (current timer logic)
├─ Issues:
│   ├─ No remaining time calculation
│   ├─ No slot duration awareness
│   ├─ No warnings or limits
│   └─ No visual overrun indicator

Start Consultation Use Case
├─ File: application/use-cases/StartConsultationUseCase.ts
├─ Key feature: Auto-heal stale sessions (lines 67-106)
├─ Good: Prevents duplicate active consultations
├─ Bad: Only runs when starting NEW consultation

Consultation Queue Panel
├─ File: components/consultation/ConsultationQueuePanel.tsx
├─ Issues:
│   ├─ switchToPatient() called with NO confirmation
│   ├─ Doesn't wait for unsaved changes
│   └─ No safety UX

Rich Text Editor (Fixed)
├─ File: components/consultation/RichTextEditor.tsx
├─ Status: ✅ FIXED autosave debounce issue
├─ Lines: 40-90 (ref-based tracking)
├─ How it works:
│   ├─ isInternalUpdateRef tracks prop changes
│   ├─ onUpdate skips onChange when ref is true
│   └─ Prevents duplicate calls per keystroke
```

---

## Database Schema (Relevant)

```sql
-- Appointment (existing fields)
CREATE TABLE "Appointment" (
  id INT PRIMARY KEY,
  status TEXT, -- SCHEDULED, CHECKED_IN, IN_CONSULTATION, COMPLETED
  appointment_date TIMESTAMP,
  time TEXT,
  slot_start_time TIMESTAMP, -- When slot begins
  slot_duration INT, -- in minutes (e.g., 30)
  duration_minutes INT, -- ACTUAL time spent (set after completion)
  checked_in_at TIMESTAMP,
  consultation_started_at TIMESTAMP, -- Deprecated? (use consultation.started_at)
  consultation_ended_at TIMESTAMP,
  doctor_id INT,
  -- ... other fields
);

-- Consultation (existing fields)
CREATE TABLE "Consultation" (
  id INT PRIMARY KEY,
  appointment_id INT,
  doctor_id INT,
  user_id INT,
  state TEXT, -- NOT_STARTED, IN_PROGRESS, COMPLETED, ABANDONED (NEW)
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_minutes INT,
  outcome_type TEXT,
  patient_decision TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP, -- UPDATE THIS on heartbeat
  -- ... other fields
);

-- NEEDS: Add last_activity_at for heartbeat tracking
-- ALTER TABLE "Consultation" ADD COLUMN last_activity_at TIMESTAMP DEFAULT NOW();
```

---

## API Endpoints to Create/Update

### NEW: Heartbeat Endpoint

```
POST /api/consultations/{id}/heartbeat
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "lastActivity": "2026-03-03T15:32:45.123Z",
    "timeoutIn": 300  // seconds
  }
}
```

### NEW: Cleanup Service Endpoint (Internal)

```
POST /api/admin/consultations/cleanup-abandoned (Admin only)

Response:
{
  "success": true,
  "data": {
    "cleaned": 3,
    "details": [...]
  }
}
```

### UPDATE: Query Consultation

```
GET /api/consultations/{id}

Add to response:
{
  ...
  "state": "IN_PROGRESS",
  "lastActivity": "2026-03-03T15:32:45.123Z",  // NEW
  "isAbandoned": false,  // NEW
  "timeSinceActivity": 125  // seconds, NEW
}
```

---

## Deployment Checklist

Before deploying each phase:

### Pre-Deployment
- [ ] Code reviewed (2 reviewers)
- [ ] Tests passing (unit + E2E)
- [ ] Database migration tested on staging
- [ ] Performance tested (no query regressions)
- [ ] Audit logging verified

### Deployment
- [ ] Announce downtime (if needed)
- [ ] Deploy backend first
- [ ] Run migrations
- [ ] Deploy frontend
- [ ] Monitor error rates for 1 hour
- [ ] Smoke test via demo account

### Post-Deployment
- [ ] Collect doctor feedback
- [ ] Monitor metrics (see below)
- [ ] Check for any tickets/complaints
- [ ] Update runbooks if needed

---

## Metrics to Monitor

```
Session Health:
  - Abandoned consultation count (target: <1%)
  - Avg time to abandon detection (target: <5 min)
  - Doctor re-connect rate (target: >80%)

Schedule Compliance:
  - Avg slot overrun time (target: <3 min)
  - % consultatiosn exceeding slot (target: <20%)
  - Schedule accuracy (target: >90%)

Queue Performance:
  - Avg wait time (target: <15 min)
  - Queue throughput (target: 4+ patients/hour/doctor)
  - Avg consultation duration (track for variance)

Auto-Save Reliability:
  - Auto-save success rate (target: >99%)
  - Data loss incidents (target: 0)
  - Failed save recovery rate (target: >95%)
```

---

## Known Limitations (Will Not Fix Yet)

1. **No real-time connection tracking** via WebSocket
   - Using polling (heartbeat every 30s) instead
   - Good enough for LAN, may lag on poor connection

2. **Cleanup is once-per-night, not instantaneous**
   - Abandoned consulting can "block" for up to 24 hours in worst case
   - Acceptable because: auto-heal on next login mitigates

3. **No "extend session" capability**
   - Doctor must complete and restart for different patient
   - Can add in PHASE 4 if needed

4. **No inter-doctor session handoff**
   - If doctor must transfer to colleague, must complete consultation
   - Complex feature, defer to PHASE 4

---

## Team Assignment

| Role | Task | Days | Dependencies |
|------|------|------|--------------|
| Backend Engineer | Heartbeat endpoint | 2 | None |
| Backend Engineer | Cleanup service | 1.5 | Heartbeat endpoint |
| Backend Engineer | Database migration | 0.5 | None (parallel) |
| Database DBA | Migration review & test | 1 | None (parallel) |
| Frontend Engineer | Timer component update | 1 | None |
| Frontend Engineer | Recovery modal | 1.5 | Backend heartbeat |
| Frontend Engineer | Queue switch confirmation | 1 | None |
| QA Engineer | E2E tests | 2 | All features |
| Devops | CI/CD updates for cron job | 1 | Cleanup service |

**Total duration**: ~2 weeks (parallel work) if 2-3 engineers

---

## References & Related Docs

- [Full Senior Review](./CONSULTATION_ROOM_SENIOR_REVIEW.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE_SESSION_TIMEOUT_SLOT_DURATION.md)
- [Auto-Save Fix Summary](./AUTOSAVE_FIX_COMPREHENSIVE.md)
- [Consultation Workflow](./CONSULTATION_WORKFLOW_INTEGRATION_ANALYSIS.md) (if exists)

---

## FAQ

**Q: Will this break existing consultations?**
A: No. All changes are backward compatible. Existing active consultations will continue working until they are completed or abandoned.

**Q: What happens if a doctor loses connection briefly?**
A: Heartbeat is checked every 30 seconds. A 30-second blip won't trigger cleanup. Session is only marked abandoned after 60 minutes of zero activity.

**Q: Can doctors override the slot duration warning?**
A: Yes. We show warnings but don't prevent doctors from continuing. They can work overtime, but it's logged in audit trail.

**Q: Will patients see these changes?**
A: No. These are doctor-side features only. Patients see no change in their appointment experience.

**Q: How do we test the timeout feature without waiting 60 minutes?**
A: In dev/staging, set `STALE_THRESHOLD_MINUTES=1` for quick testing.

