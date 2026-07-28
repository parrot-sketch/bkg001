# Rollback Validation

## Purpose
Validate that every migration PR can be reverted safely and quickly, with clear rollback triggers, steps, and expected runtime behavior.

---

## 1. Rollback Principles

| Principle | Enforcement |
|-----------|-------------|
| Each PR is independently revertible | No cross-PR dependencies that make rollback complex |
| No database migrations | Rollback never requires data recovery |
| No cache invalidation strategy changes | Old clients continue to work during rollback |
| Service logic unchanged | SessionService tests continue to pass |
| Provider APIs backward compatible | Existing UI components continue to work |

---

## 2. PR-by-PR Rollback Analysis

### PR 1: Infrastructure Preparation

**Changes:**
- Create `infrastructure/composition/ConsultationSessionFactory.ts`
- Create `lib/session-serializer.ts`

**Rollback trigger:** Factory has implementation bug that cannot be fixed quickly.

**Rollback steps:**
1. Delete `infrastructure/composition/ConsultationSessionFactory.ts`
2. Delete `lib/session-serializer.ts`
3. Commit

**Time:** 5 minutes

**Runtime behavior after rollback:**
- Current page.tsx continues to work (factory was never imported yet)
- No user-facing change
- No data loss

**Risk:** NONE — pure addition, no runtime change

---

### PR 2: Server Actions

**Changes:**
- Create `actions/doctor/consultation-session.ts`

**Rollback trigger:** Server Action compilation errors or runtime errors in testing.

**Rollback steps:**
1. Delete `actions/doctor/consultation-session.ts`
2. Commit

**Time:** 5 minutes

**Runtime behavior after rollback:**
- Current page.tsx continues to work (Server Actions not yet imported)
- No user-facing change
- No data loss

**Risk:** NONE — new code, old code unchanged

---

### PR 3: Client Shell + Server Component

**Changes:**
- Create `ConsultationRoomClient.tsx`
- Modify `page.tsx`: remove `'use client'`, add server initialization
- SessionProvider accepts `initialSession` prop but falls back to `initialAppointmentId`

**Rollback trigger:** page.tsx renders incorrectly, hydration mismatch, or Server Component errors.

**Rollback steps:**
1. Revert `page.tsx` to original (re-add `'use client'`, remove server init)
   ```bash
   git checkout HEAD~1 -- app/doctor/consultations/session/[appointmentId]/page.tsx
   ```
2. Delete `ConsultationRoomClient.tsx`
3. Revert SessionProvider prop change (if already done in PR 3)
4. Commit

**Time:** 10 minutes

**Runtime behavior after rollback:**
- User sees original client-side page
- All existing functionality works
- Consultations load via client-side `initializeSession()`
- No data loss

**Risk:** LOW — revert to known-working state

### PR 4: SessionProvider Migration

**Changes:**
- SessionProvider: remove service construction, receive `initialSession` prop
- DocumentationProvider: remove `draftService` prop, add `onSaveDraft` callback
- PatientContextProvider: remove `patientApi` prop, add refresh callbacks

**Rollback trigger:** Provider behavior differs from original, mutations fail, or UI breaks.

**Rollback steps:**
1. Revert `SessionProvider.tsx`
2. Revert `DocumentationProvider.tsx`
3. Revert `PatientContextProvider.tsx`
4. Revert `page.tsx` prop changes (if not already reverted in PR 3)
5. Revert `ConsultationRoomClient.tsx` (if created in PR 3)
6. Commit

**Time:** 15 minutes

**Runtime behavior after rollback:**
- User sees original client-side page with service construction in SessionProvider
- All mutations work via direct SessionService calls
- No data loss
- DraftService continues to work

**Risk:** MEDIUM — reverts multiple files, but returns to known-working state

### PR 5: ConsultationProvider Migration

**Changes:**
- Modify `ConsultationProvider.tsx`: change props from `initialAppointmentId` to `initialSession`/`user`/`restoredDraft`

**Rollback trigger:** `useConsultationContext()` consumers break.

**Rollback steps:**
1. Revert `ConsultationProvider.tsx`
2. Revert `SessionProvider.tsx` (if not already reverted)
3. Revert `page.tsx` if needed
4. Commit

**Time:** 5 minutes

**Runtime behavior after rollback:**
- `useConsultationContext()` continues to work
- All consumers of `useConsultationContext()` work unchanged
- If PR 4 is already reverted, everything works identically to pre-migration

**Risk:** LOW — thin adapter change only

### PR 6: Cleanup

**Changes:**
- Remove backward-compatible props (`initialAppointmentId`, `draftService`, `patientApi`)
- Remove unused imports
- Delete unused adapter files if applicable

**Rollback trigger:** Accidentally removed code that's still needed.

**Rollback steps:**
1. Restore deleted props from git history
   ```bash
   git checkout HEAD~1 -- providers/session/SessionProvider.tsx
   git checkout HEAD~1 -- providers/documentation/DocumentationProvider.tsx
   git checkout HEAD~1 -- providers/patient/PatientContextProvider.tsx
   ```
2. Restore deleted files if needed
3. Commit

**Time:** 10 minutes

**Runtime behavior after rollback:**
- Same as after PR 5 rollback
- Backward-compatible props are restored
- All functionality works

**Risk:** LOW — cleanup only, can restore from git

---

## 3. Rollback Timeline

```
PR 1 broken?
  └─ Delete 2 files (5 min)
  └─ No runtime impact

PR 2 broken?
  └─ Delete 1 file (5 min)
  └─ No runtime impact

PR 3 broken?
  └─ Revert page.tsx + delete client shell (10 min)
  └─ Returns to client-side architecture

PR 4 broken?
  └─ Revert 3 provider files (15 min)
  └─ Returns to client-side architecture

PR 5 broken?
  └─ Revert 1 file (5 min)
  └─ May still need PR 4 revert

PR 6 broken?
  └─ Restore props from git (10 min)
  └─ Same as PR 5 state
```

**Total rollback time from any broken state: < 30 minutes.**

---

## 4. Data Safety During Rollback

### Database State

| Operation | Data Impact | Rollback Risk |
|-----------|-------------|---------------|
| Server Actions | Same as current API routes | None — mutations succeed or fail identically |
| Draft saves | Same DraftService behavior | None — drafts saved or not saved identically |
| Consultation state transitions | Same SessionService behavior | None — workflow transitions identical |
| Consultation completion | Same completeSession behavior | None — redirect path identical |

### Client State

| State | Rollback Impact |
|-------|-----------------|
| React state in providers | Cleared on page reload (expected) |
| React Query cache | Cleared on page reload (expected) |
| localStorage tokens | NOT touched by migration |
| Cookies | NOT touched by migration |

### Cache State

| Cache | Rollback Impact |
|-------|-----------------|
| React Query | Client-side only, cleared on reload |
| Next.js cache | Server Actions call `revalidatePath()` — same as current API routes |
| CDN cache | Same cache headers as current |

---

## 5. Rollback Decision Tree

```
Migration issue detected
  │
  ├─ Issue in PR 1 or 2?
  │   └─ Delete new files. Continue with PR 3 using old code.
  │
  ├─ Issue in PR 3 (page.tsx)?
  │   └─ Revert page.tsx. Re-apply PR 1+2 fixes after debugging.
  │
  ├─ Issue in PR 4 (providers)?
  │   └─ Revert providers. Re-apply PR 1+2+3 fixes after debugging.
  │
  ├─ Issue in PR 5 (ConsultationProvider)?
  │   └─ Revert ConsultationProvider. Continue.
  │
  └─ Issue in PR 6 (cleanup)?
      └─ Restore from git. Continue.
```

**Every rollback returns to a known-working state without data loss.**

---

## 6. Smoke Tests for Rollback Validation

### After Any Rollback, Run:

1. **Authentication:**
   - Open `/doctor/consultations/session/123` while logged out
   - Expected: "Authentication required" UI
   - Open while logged in
   - Expected: Consultation room loads

2. **Consultation Loading:**
   - Open valid appointment ID
   - Expected: Patient data, appointment data, consultation data visible
   - Open invalid appointment ID
   - Expected: Error UI

3. **Start Consultation:**
   - Click "Start Consultation"
   - Expected: Consultation starts, UI shows active state

4. **Note Editing:**
   - Edit a note field
   - Expected: `isDirty = true`, auto-save triggers after 3s
   - Expected: `lastSavedAt` updates after save

5. **Complete Consultation:**
   - Click "Complete Consultation"
   - Expected: Redirect to `/doctor/consultations`

6. **Queue:**
   - Advance queue
   - Expected: Loads next patient or shows empty queue

7. **Back Button:**
   - Navigate back to dashboard
   - Expected: Dashboard loads

**If all 7 smoke tests pass, rollback is successful.**

---

## 7. Rollback Communication Plan

### Internal Communication

| Audience | Message | Timing |
|----------|---------|--------|
| Engineering team | "Rolling back PR-N due to [issue]" | Immediately |
| QA team | "Please re-run smoke tests after rollback" | After rollback |
| Product | "Consultation room may experience brief interruption" | Before migration |
| Support | "Known issue: consultation room loading delay" | If user-facing impact |

### User-Facing Communication

**No user-facing communication needed for normal rollback.**

If rollback causes visible error:
```typescript
// Temporary error boundary
<ErrorBoundary fallback={<ConsultationErrorScreen />}>
  <ConsultationRoomClient ... />
</ErrorBoundary>
```

---

## 8. Emergency Rollback Procedure

### If Production Issue Occurs

1. **Detect:** Monitoring alerts or user reports
2. **Assess:** Determine which PR introduced the issue
3. **Decide:** Rollback vs. hotfix
4. **Execute:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
5. **Verify:** Deploy rollback, run smoke tests
6. **Communicate:** Notify stakeholders
7. **Post-mortem:** Analyze root cause, plan fix

### Rollback SLA

| Metric | Target |
|--------|--------|
| Detection time | < 5 minutes |
| Rollback decision | < 10 minutes |
| Rollback execution | < 15 minutes |
| Verification | < 5 minutes |
| **Total time to recovery** | **< 35 minutes** |

---

## 9. Conclusion

**Every migration PR can be reverted safely and quickly.**

| PR | Rollback Time | Data Risk | Runtime Risk |
|----|---------------|-----------|--------------|
| 1: Infrastructure | 5 min | None | None |
| 2: Server Actions | 5 min | None | None |
| 3: Client Shell | 10 min | None | Low |
| 4: SessionProvider | 15 min | None | Medium |
| 5: ConsultationProvider | 5 min | None | Low |
| 6: Cleanup | 10 min | None | Low |

**No rollback requires database recovery, cache invalidation, or data migration.**

**All rollbacks return to the known-working client-side architecture.**
