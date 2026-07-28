# Deployment Validation

## Purpose

This document defines the operational requirements for every Phase 2 deployment. Each provider extraction has a deployment window with explicit monitoring, alerts, manual verification steps, and rollback triggers. All deployments must pass clinical validation before proceeding to the next extraction.

---

## Deployment Model

All Phase 2 provider extractions use **progressive rollout with feature flags**:

1. **Canary (5%)** — 1 day of production traffic
2. **Expand (25%)** — 1 day
3. **Majority (50%)** — 1 day
4. **Full (100%)** — 2 days

**Rollback condition:** Error rate exceeds threshold within any window → disable flag immediately.

**Staging validation:** Full workflow runs in staging environment before any production deployment.

---

## Deployment 1: DraftService (Week 1)

### Feature Flag

`USE_DRAFT_SERVICE`

**Default:** `false` (old path active)

### Rollout Window

| Stage | Traffic % | Duration | Success Criteria |
|-------|-----------|----------|-----------------|
| Canary | 5% | 1 day | 0 errors, draft save success rate ≥99.9% |
| Expand | 25% | 1 day | Same |
| Majority | 50% | 1 day | Same |
| Full | 100% | 2 days | Same |

### Monitoring

**Dashboards:**
- Draft save success rate (new path)
- Draft save latency (p50, p95, p99)
- localStorage write errors
- Feature flag distribution (percentage on new path)
- Error rate by endpoint

**Logs to watch:**
```
[ERROR] DraftService.autoSave failed — {error, appointmentId, correlationId}
[ERROR] DraftService.manualSave failed — {error, appointmentId, correlationId}
[WARN] Draft version conflict detected — {appointmentId, serverVersion, draftVersion}
```

### Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Draft save success rate | ≥99.9% | <99.5% |
| Draft save latency p95 | <2s | >5s |
| localStorage write errors | <0.1% | >1% |
| Version conflict rate | <0.5% | >2% |
| Auto-save trigger count | Stable per user | >2x baseline |

### Alerts

- **P2:** Draft save error rate >0.1% over 5 minutes
- **P3:** Draft save latency p95 >5s over 10 minutes
- **P3:** Version conflict rate >2% over 15 minutes

### Manual Verification

1. Log in as clinician
2. Load consultation with saved draft
3. Verify draft restored correctly (content, timestamp)
4. Modify notes, wait 3s, verify auto-save (toast notification)
5. Click manual save, verify immediate save
6. Complete consultation, verify draft removed
7. Switch to another patient, verify draft saved before switch

### Rollback Trigger

- Draft save error rate >0.1%
- Draft restoration fails for any user
- Data corruption detected (lost notes)
- localStorage quota exceeded errors

### Rollback Procedure

1. Disable `USE_DRAFT_SERVICE` flag in admin panel
2. Verify dashboard shows 0% traffic on new path within 2 minutes
3. Investigate failure logs
4. Fix issue, repeat canary phase

### Regression Focus

- Auto-save timing (3s debounce)
- Draft restoration (server vs local comparison)
- Version conflict detection (string comparison)
- localStorage backup format compatibility
- Draft cleanup on completion

### Clinical Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Patient safety | auto-save does not block UI | Never blocks user input |
| Draft recovery | Restore draft after crash | Notes identical to last save |
| Autosave | Trigger after 3s idle | Display shows "Saving..." then "Saved" |
| Performance | Draft save latency | <2s on 3G |
| Offline recovery | Save while offline | Queued for sync on reconnect |

---

## Deployment 2: SessionService (Week 1)

### Feature Flag

`USE_SESSION_SERVICE`

**Default:** `false`

### Rollout Window

| Stage | Traffic % | Duration | Success Criteria |
|-------|-----------|----------|-----------------|
| Canary | 5% | 1 day | 0 errors, session transitions 100% success |
| Expand | 25% | 1 day | Same |
| Majority | 50% | 1 day | Same |
| Full | 100% | 2 days | Same |

### Monitoring

**Dashboards:**
- Session transition success rate (start, complete, switch)
- Session transition latency
- Workflow state distribution
- Heartbeat emission rate
- Feature flag distribution

**Logs to watch:**
```
[ERROR] SessionService.start failed — {error, appointmentId, correlationId}
[ERROR] SessionService.complete failed — {error, appointmentId, correlationId}
[ERROR] SessionService.switchTo failed — {error, correlationId}
[WARN] Heartbeat missed — {doctorId, lastBeat}
[WARN] beforeunload blocked — {appointmentId, isDirty}
```

### Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Session start success rate | 100% | <99.5% |
| Session complete success rate | 100% | <99.5% |
| Session switch success rate | 100% | <99.5% |
| Heartbeat latency p99 | <100ms | >500ms |
| beforeunload accuracy | 100% (dirty=true, clean=false) | <98% |

### Alerts

- **P1:** Session start failure rate >0.5%
- **P1:** Session complete failure rate >0.5%
- **P2:** Heartbeat latency p99 >500ms
- **P3:** Workflow state machine unexpected transition

### Manual Verification

1. Start new consultation — verify session begins, state = ACTIVE
2. Modify notes, save, verify auto-save
3. Complete consultation — verify state = COMPLETED, draft cleaned, queue advanced
4. Switch patient — verify draft saved, new patient loaded
5. Reload page during active session — verify session restored
6. Close tab with unsaved changes — verify beforeunload fires
7. Close tab with saved changes — verify no warning

### Rollback Trigger

- Session start failure rate >0.5%
- Data loss on session switch (draft not saved)
- Workflow state machine enters invalid state
- Heartbeat stops for any doctor

### Rollback Procedure

1. Disable `USE_SESSION_SERVICE` flag
2. Verify old path active within 2 minutes
3. Check all active sessions still functional
4. Investigate failure logs
5. Fix issue, repeat canary

### Regression Focus

- Session lifecycle transitions
- Workflow state correctness
- Heartbeat timing and reliability
- Cache invalidation after state changes
- Queue-aware patient routing

### Clinical Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Patient safety | Session start validates prerequisites | Invalid state never starts |
| Session integrity | Complete saves draft before finalizing | No draft loss on completion |
| Queue integrity | Next patient respects priority | Same patient selected as old code |
| Audit integrity | Start/complete/switch logged | Auditor sees all events |
| Concurrent clinicians | Multiple doctors in same queue | No cross-contamination of state |

---

## Deployment 3: QueueService (Week 2)

### Feature Flag

`USE_QUEUE_SERVICE`

**Default:** `false`

### Monitoring

**Logs:**
```
[ERROR] QueueService.refresh failed — {error, correlationId}
[WARN] QueueService.nextPatient ambiguous — {candidates}
```

### Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Queue refresh success rate | ≥99.9% | <99.5% |
| Queue stale time | <65s (60s poll + buffer) | >90s |

### Rollback Trigger

- Queue display fails to load
- Wrong patient selected during advance

### Clinical Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Queue integrity | Monitoring queue panel | Same patients shown as old code |
| Patient safety | Advance queue after completion | Next patient correct per priority |
| Concurrent clinicians | Multiple doctors see correct queues | No cross-doctor data leak |

---

## Deployment 4: NotificationService (Week 2)

### Feature Flag

`USE_NOTIFICATION_SERVICE`

**Default:** `false`

### Monitoring

**Metrics:**
- Toast display success rate
- ClinicalError message readability (manual check)

### Rollback Trigger

- Toasts not displayed
- Clinical errors shown as raw error codes to users

### Clinical Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Notification integrity | Manual UI check | All toasts display correctly |
| Patient safety | Error messages | All messages user-friendly, no jargon |

---

## Deployment 5: DocumentationProvider (Week 4)

### Feature Flag

`USE_DOCUMENTATION_PROVIDER`

**Default:** `false`

### Monitoring

**Logs:**
```
[ERROR] DocumentationProvider.autoSave failed — {error, appointmentId, correlationId}
[WARN] Draft version conflict — {draftVersion, serverVersion}
```

### Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Auto-save success rate | ≥99.9% | <99.5% |
| Note render count | ≤3 per keystroke | >6 |
| Draft restoration accuracy | 100% | <100% |

### Rollback Trigger

- Notes lost during auto-save
- Auto-save triggers on wrong component changes (not just notes)
- Draft restoration fails or shows wrong content

### Clinical Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Patient safety | Notes not lost during transition | Content identical before/after |
| Draft recovery | Unsaved notes restored after crash | Full note content recovered |
| Autosave | Trigger after 3s keystroke idle | Visual "Saving..." indicator |
| Version conflict | Concurrent edit scenario | Conflict dialog shown |
| Performance | Keystroke to render latency | <100ms |

---

## Deployment 6: SessionProvider (Week 5)

### Feature Flag

`USE_SESSION_PROVIDER`

**Default:** `false`

### Monitoring

**Logs:**
```
[ERROR] SessionProvider composition failed — {missingProvider, correlationId}
[WARN] SessionProvider render count spike — {count, expected}
```

### Metrics

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Session page render time | <2s (baseline) | >3s |
| SessionProvider composition success | 100% | <99% |
| Context re-render count (per keystroke) | ≤3 | >6 |

### Rollback Trigger

- Page renders blank or incomplete
- Any provider missing from composition
- Performance regression >50%

### Clinical Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Session integrity | Full workflow on SessionProvider | Identical to old context |
| Patient safety | Start consultation flow | All state present and correct |
| Queue integrity | Complete and queue advance | Same as old code |
| Performance | React DevTools Profiler | No unnecessary re-renders |
| Offline recovery | Load session while offline | Cached data displays |

---

## Deployment 7: Remaining Providers (Weeks 3-6)

### PatientContextProvider

- **Monitoring:** Patient data load success rate, vitals accuracy
- **Clinical validation:** Patient sidebar renders correctly, all allergies/conditions visible

### TimerService + TimerProvider

- **Monitoring:** Timer accuracy, display format correctness
- **Clinical validation:** Elapsed time matches wall clock

### BillingProvider

- **Monitoring:** Billing data load success, submission success rate
- **Clinical validation:** Billing section displays correctly

### QueueProvider

- **Monitoring:** Queue polling success, panel render count
- **Clinical validation:** Queue displays correctly without documentation re-renders

### NotificationProvider

- **Monitoring:** Toast display success, error message readability
- **Clinical validation:** All notifications visible and correct

---

## Operational Readiness Checklist

Before any Phase 2 deployment to production:

- [ ] **Pre-deployment**
  - [ ] All tests pass in CI
  - [ ] Staging validation complete
  - [ ] Clinical validation checklist reviewed by clinical SME
  - [ ] Feature flag tested (both on/off paths work)
  - [ ] Monitoring dashboards configured
  - [ ] Alerts configured in PagerDuty/Slack
  - [ ] Rollback plan documented and tested
  - [ ] Deployment window approved by engineering lead

- [ ] **During deployment**
  - [ ] Canary traffic activated via feature flag
  - [ ] Dashboards monitored in real-time (first 30 minutes)
  - [ ] Error budget checked (0 errors expected in first 15 minutes)
  - [ ] Clinical smoke test performed by QA

- [ ] **Post-deployment**
  - [ ] Canary metrics reviewed (1 hour)
  - [ ] Canary expanded or rolled back based on metrics
  - [ ] Daily metrics review for 3 days
  - [ ] Clinical team notified of new provider in use
  - [ ] Retrospective scheduled if any incidents

---

## Alert Thresholds Summary

| Severity | Condition | Response Time |
|----------|-----------|--------------|
| P1 | Session start/complete failure rate >0.5% | Immediate investigation, rollback if unresolvable in 30min |
| P2 | Draft save failure rate >1%, Heartbeat latency p99 >500ms | 1 hour investigation |
| P3 | Render count spike, Queue stale >90s, Any other metric breach | Next business day |
| P4 | Monitoring gap detected, Dashboard update needed | Next sprint |

---

## Incident Response Playbook

### If error rate spikes during rollout:

1. **Detect** — Alert fires in monitoring channel
2. **Assess** — On-call engineer reviews logs and dashboards within 5 minutes
3. **Decide** — If error rate > threshold, disable feature flag
4. **Verify** — Confirm old path active and error rate drops to baseline
5. **Investigate** — Triage logs, identify root cause
6. **Fix** — Engineer fixes issue, writes postmortem
7. **Reschedule** — Plan new rollout window after fix validated

### If clinical workflow breaks:

1. **Escalate** — Immediately notify clinical lead and on-call engineering lead
2. **Rollback** — Disable feature flag immediately
3. **Validate** — Clinical team confirms workflow restored
4. **Document** — Record impact (patients affected, duration, data loss?)
5. **Prevent** — Add test case and monitoring to prevent recurrence

---

## Success Criteria for Phase 2 Deployment

The Phase 2 deployment program is successful when:

1. **Zero clinical incidents** caused by provider extraction
2. **All 7 providers** deployed behind feature flags with full observability
3. **Rollback tested** for every provider (at least once in staging)
4. **Clinical validation passed** for all workflow paths
5. **Performance maintained** (no regression >10% in any metric)
6. **ConsultationContext reduced** to 0 lines (or <100 line shim)
7. **All feature flags** have documented removal dates
