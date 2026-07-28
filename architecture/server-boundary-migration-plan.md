# Server Boundary Migration Plan

## Purpose
Define an incremental, revertible migration strategy from the current client-side architecture to the Server Component boundary architecture.

---

## 1. Migration Principles

1. **No big bang:** Each PR is independently deployable
2. **Each PR < 1 day:** Small, focused changes
3. **Each PR is revertible:** Can roll back without data loss
4. **Production-safe:** No breaking changes to UI behavior
5. **Bundle-measurable:** Validate client bundle reduction at each step
6. **Testable:** Existing tests continue to pass

---

## 2. Migration Phases

### Phase 1: Infrastructure Preparation (PR 1)

**Goal:** Create Composition Root factory without changing runtime behavior.

**Changes:**
1. Create `infrastructure/composition/ConsultationSessionFactory.ts`
   - Implements full object graph construction
   - Exposes `createConsultationSession(config)` returning `{ services, initialSession, restoredDraft, invalidationInstructions }`
2. Create `lib/session-serializer.ts`
   - `serializeSessionData(session: SessionData): SerializedSessionData`
   - `serializeUser(user): SerializedUser`
   - `deserializeSessionData(data): SessionData`

**Files changed:** 2 new files, 0 modified  
**LOC added:** ~150  
**Bundle impact:** 0 (factory is in Infrastructure, never imported by client yet)

**Validation:**
- `infrastructure/composition/ConsultationSessionFactory.ts` compiles
- `lib/session-serializer.ts` compiles
- No client bundle change

**Risk:** NONE — pure addition, no runtime change

---

### Phase 2: Server Actions (PR 2)

**Goal:** Create Server Actions for all session mutations without changing caller code.

**Changes:**
1. Create `actions/doctor/consultation-session.ts`
   - `initializeSession(appointmentId)`
   - `startSession(appointmentId, doctorId)`
   - `completeSession(consultationId)`
   - `resumeSession(consultationId)`
   - `cancelCompletion()`
   - `switchToPatient(fromId, toId)`
   - `advanceQueue(doctorId, userId)`
   - `sendHeartbeat(consultationId)`
   - `pauseSession()`
   - `resumePausedSession()`
   - `saveDraft(params)`
   - `saveCompletedNotes(params)`
   - `updateConsultationOutcome(params)`
2. Each action imports `ConsultationSessionFactory`, creates services, calls SessionService, returns serialized result.

**Files changed:** 1 new file, 0 modified  
**LOC added:** ~300  
**Bundle impact:** 0 (Server Actions are never imported by client in this PR)

**Validation:**
- Server Actions compile
- Each action can be invoked from a test page
- Return values match expected shapes

**Risk:** LOW — new code, old code unchanged

---

### Phase 3: Client Shell (PR 3) — THE CRITICAL PR

**Goal:** Introduce `ConsultationRoomClient` as the client entry point.

**Changes:**
1. Create `ConsultationRoomClient.tsx`:
   ```tsx
   'use client';
   
   export function ConsultationRoomClient({
     initialSession,
     user,
     restoredDraft,
   }: ConsultationRoomClientProps) {
     return (
       <SessionProvider initialSession={initialSession} user={user} restoredDraft={restoredDraft}>
         <DocumentationProvider initialNotes={initialSession.notes} isCompleted={...}>
           <PatientContextProvider
             patient={initialSession.patient}
             appointment={initialSession.appointment}
             vitals={initialSession.vitals}
             isLoading={false}
             error={null}
           >
             <QueueContextProvider doctorId={initialSession.doctorId} currentAppointmentId={...}>
               <TimerContextProvider startedAt={...} slotStartTime={...} slotDurationMinutes={...}>
                 <DialogProvider>
                   <BillingProvider existingBilling={...}>
                     {children}
                   </BillingProvider>
                 </DialogProvider>
               </TimerContextProvider>
             </QueueContextProvider>
           </PatientContextProvider>
         </DocumentationProvider>
       </SessionProvider>
     );
   }
   ```
2. Modify `page.tsx`:
   - Remove `'use client'`
   - Import `createConsultationSession` and `serializeSessionData`
   - Call factory and initialize session server-side
   - Render `ConsultationRoomClient` with serialized props
3. SessionProvider accepts `initialSession` but still falls back to `initialAppointmentId` for backward compatibility.

**Files changed:** 1 new, 1 modified  
**LOC delta:** +40 / -5

**Compatibility:** 
- `ConsultationProvider` still works with `initialAppointmentId`
- `page.tsx` uses new pattern
- Old consumers of `ConsultationProvider` continue to work

**Validation:**
- `page.tsx` renders without `'use client'`
- Consultation room looks identical
- No runtime errors
- Bundle analysis shows reduced client imports

**Risk:** MEDIUM — changes the entry point. Revertible by re-adding `'use client'`.

---

### Phase 4: SessionProvider Migration (PR 4)

**Goal:** Remove service construction from SessionProvider, replace with Server Actions.

**Changes:**
1. Modify `SessionProvider.tsx`:
   - Change props from `initialAppointmentId` to `initialSession`, `user`, `restoredDraft`
   - Remove all `useMemo` service construction
   - Remove imports of Application/Domain/Infrastructure modules
   - Initialize all state from `initialSession` props
   - Replace `sessionService.method()` calls with Server Action calls
   - Remove `workflowEngineRef` (no engine in client)
2. Modify `DocumentationProvider.tsx`:
   - Remove `draftService` prop
   - Add `onSaveDraft` callback prop
   - Replace `draftService.saveDraft()` with `onSaveDraft()` call
3. Modify `PatientContextProvider.tsx`:
   - Remove `patientApi` prop
   - Add `onRefreshPatient`, `onRefreshAppointments`, `onRefreshVitals` callback props
   - Replace `patientApi.method()` calls with callback calls

**Files changed:** 3 modified  
**LOC delta:** +30 / -60

**Bundle impact:** 51 forbidden modules removed from client bundle

**Validation:**
- `useSessionContext()` returns same shape
- `useDocumentationContext()` returns same shape
- `usePatientContext()` returns same shape
- All UI components render identically
- Mutations work via Server Actions

**Risk:** MEDIUM — changes internal implementation. Revertible by git revert.

---

### Phase 5: ConsultationProvider Migration (PR 5)

**Goal:** Update ConsultationProvider to pass new props.

**Changes:**
1. Modify `ConsultationProvider.tsx`:
   - Change props from `initialAppointmentId` to `initialSession`, `user`, `restoredDraft`
   - Pass new props to SessionProvider

**Files changed:** 1 modified  
**LOC delta:** +5 / -3

**Bundle impact:** 0 (structural change only)

**Validation:**
- `useConsultationContext()` returns same shape
- All consumers of `useConsultationContext()` work unchanged

**Risk:** LOW — thin adapter change only

---

### Phase 6: Cleanup and Verification (PR 6)

**Goal:** Remove backward-compatible fallbacks, verify architecture.

**Changes:**
1. Remove old `initialAppointmentId` prop from SessionProvider
2. Remove old `draftService` prop from DocumentationProvider
3. Remove old `patientApi` prop from PatientContextProvider
4. Remove `lib/api/patient-adapter.ts` if no longer used server-side (verify)
5. Verify no forbidden imports in client components
6. Run bundle analysis to confirm 51 modules removed

**Files changed:** 5 modified, 1 potentially deleted  
**LOC delta:** -10 / -5

**Validation:**
- Bundle analysis shows client bundle < 5,000 LOC
- No Application/Domain/Infrastructure imports in `'use client'` files
- All tests pass
- CI passes

**Risk:** LOW — cleanup only

---

## 3. Rollback Plan

### Each PR Rollback

| PR | Rollback Method | Time |
|----|-----------------|------|
| 1 | Delete new files | 5 min |
| 2 | Delete new file | 5 min |
| 3 | Re-add `'use client'` to page.tsx, revert page.tsx changes | 10 min |
| 4 | Revert SessionProvider.tsx, DocumentationProvider.tsx, PatientContextProvider.tsx | 15 min |
| 5 | Revert ConsultationProvider.tsx | 5 min |
| 6 | Restore deleted props/files from git history | 10 min |

**Total rollback time: < 1 hour**

### Data Safety

- No database schema changes
- No data migrations
- No cache invalidation strategy changes
- All mutations still execute (via Server Actions or existing code)

---

## 4. Testing Strategy

### Per-PR Validation

| PR | Tests | Manual Check |
|----|-------|--------------|
| 1 | Factory unit tests (new) | None (no runtime change) |
| 2 | Server Action unit tests (new) | Invoke each action from test page |
| 3 | Existing tests pass | Open consultation room, verify UI |
| 4 | Existing tests pass | Start consultation, save notes, switch patient |
| 5 | Existing tests pass | Verify useConsultationContext() in all consumers |
| 6 | Bundle analysis, lint | Full clinical workflow validation |

### Existing Test Continuity

| Test File | Status After Migration |
|-----------|------------------------|
| `SessionService.test.ts` | ✅ PASS — business logic unchanged |
| `DraftService.test.ts` | ✅ PASS — business logic unchanged |
| `WorkflowCoordinator.test.ts` | ✅ PASS — business logic unchanged |
| `WorkflowPipelineCertification.test.ts` | ✅ PASS — workflow logic unchanged |
| `WorkflowEventBus.test.ts` | ✅ PASS — event logic unchanged |
| UI component tests | ✅ PASS — props unchanged |
| `ConsultationProvider` tests | ✅ PASS — compatibility layer unchanged |

---

## 5. Bundle Measurement Plan

### Baseline (Current)

```bash
# Measure current client bundle
npm run build -- --analyze
# Expected: ~12,374 LOC, 51 forbidden modules
```

### After PR 3

```bash
npm run build -- --analyze
# Expected: Reduced client imports (SessionProvider still constructs services)
# Actual reduction depends on tree-shaking
```

### After PR 4

```bash
npm run build -- --analyze
# Expected: ~4,650 LOC, 0 forbidden modules
# Validation: greb for Application/Domain imports in client bundle
```

### CI Bundle Guard

```yaml
# .github/workflows/bundle-check.yml
- name: Check client bundle
  run: |
    npm run build
    BUNDLE_SIZE=$(grep -c "forbidden-module" dist/.next/server/app/... || true)
    if [ "$BUNDLE_SIZE" -gt 0 ]; then
      echo "ERROR: Forbidden modules found in client bundle"
      exit 1
    fi
```

---

## 6. Clinical Safety Validation

### Pre-Migration

| Workflow | Current Behavior | Validation Method |
|----------|------------------|-------------------|
| Start consultation | Calls SessionService.startSession | Manual + existing tests |
| Complete consultation | Calls SessionService.completeSession | Manual + existing tests |
| Switch patient | Calls SessionService.switchSession | Manual + existing tests |
| Auto-save draft | Calls DraftService.saveDraft | Manual + existing tests |
| Save notes (completed) | Calls Server Action | Manual + existing tests |

### Post-Migration

| Workflow | New Behavior | Validation Method |
|----------|--------------|-------------------|
| Start consultation | Calls Server Action → SessionService.startSession | Manual + existing tests |
| Complete consultation | Calls Server Action → SessionService.completeSession | Manual + existing tests |
| Switch patient | Calls Server Action → SessionService.switchSession | Manual + existing tests |
| Auto-save draft | Calls Server Action → DraftService.saveDraft | Manual + existing tests |
| Save notes (completed) | Calls Server Action (unchanged) | Manual |

**Key point:** SessionService business logic is UNCHANGED. Only the caller changes from direct import to Server Action.

---

## 7. Performance Validation

### Server Render Time

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Server Component render time | ~200ms | <500ms | RSC timing |
| initializeSession execution | ~300ms | <500ms | Server Action timing |
| Total TTFB | ~500ms | <1s | Lighthouse |

### Client Hydration Time

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Bundle size | ~12,374 LOC | <5,000 LOC | Bundle analyzer |
| Hydration time | ~1s | <500ms | React DevTools |
| Time to interactive | ~2s | <1s | Lighthouse |

### Mutation Latency

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Start consultation | ~100ms (direct call) | ~200ms (Server Action) | Manual timing |
| Save draft | ~100ms (direct call) | ~200ms (Server Action) | Manual timing |
| Switch patient | ~300ms (direct call) | ~400ms (Server Action) | Manual timing |

**Acceptable overhead:** +100ms per mutation due to Server Action round-trip. This is acceptable for clinical safety.

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Server Component breaks client-side auth | Low | High | Auth check stays in server, pass user info as prop |
| Hydration mismatch | Medium | Medium | Server and client use same initial state |
| Server Action latency | Medium | Medium | Show loading states, optimistic updates where safe |
| Rollback needed | Low | Low | Each PR is independently revertible |
| Existing tests fail | Medium | Low | Service tests unchanged, provider tests may need updates |
| Clinical workflow regression | Low | High | Manual validation of all workflows |
| Bundle not reduced | Low | High | Verify with bundle analysis after each PR |
| Server memory pressure | Low | Medium | Services are per-request, garbage collected |

---

## 9. Timeline

| PR | Duration | Dependencies | Rollback Complexity |
|----|----------|--------------|---------------------|
| 1: Infrastructure | 0.5 day | None | Low |
| 2: Server Actions | 0.5 day | PR 1 | Low |
| 3: Client Shell | 0.5 day | PR 1, 2 | Medium |
| 4: SessionProvider | 0.5 day | PR 3 | Medium |
| 5: ConsultationProvider | 0.25 day | PR 4 | Low |
| 6: Cleanup | 0.25 day | PR 5 | Low |

**Total: ~2.5 days of development + 0.5 day validation = 3 days**

---

## 10. Go/No-Go Criteria

### PR 1 Go Criteria
- ✅ ConsultationSessionFactory compiles
- ✅ SessionSerializer compiles
- ✅ No runtime changes

### PR 2 Go Criteria
- ✅ All Server Actions compile
- ✅ Each action returns correct shape from test invocation

### PR 3 Go Criteria
- ✅ page.tsx renders without error
- ✅ Consultation room UI looks identical
- ✅ No `'use client'` in page.tsx
- ✅ Bundle analysis shows reduced imports

### PR 4 Go Criteria
- ✅ useSessionContext returns same shape
- ✅ useDocumentationContext returns same shape
- ✅ usePatientContext returns same shape
- ✅ All UI components render identically
- ✅ Mutations work via Server Actions

### PR 5 Go Criteria
- ✅ useConsultationContext returns same shape
- ✅ All consumers of useConsultationContext() work

### PR 6 Go Criteria
- ✅ Client bundle < 5,000 LOC
- ✅ 0 forbidden modules in client bundle
- ✅ All tests pass
- ✅ CI passes
- ✅ Manual clinical workflow validation passes

---

## 11. Alternative: Big Bang Migration

**NOT RECOMMENDED** but documented for completeness.

### Approach
Implement all 6 PRs as a single PR.

### Pros
- Single review
- Complete state in one diff

### Cons
- Large, difficult to review
- Hard to debug if something breaks
- Cannot validate incrementally
- Rollback is all-or-nothing
- CI failures are harder to diagnose

### Why Incremental Is Better
- Each PR is reviewable in isolation
- Can validate bundle reduction at each step
- Can catch issues early
- Rollback is surgical
- CI gives fast feedback per PR
