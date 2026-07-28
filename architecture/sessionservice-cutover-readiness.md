# SessionService Cutover Readiness

## Purpose

Determine whether the production code path is ready to switch from ConsultationContext inline logic to SessionService via the SessionOperationsShim feature flag.

---

## 1. Current Routing State

### Production Code Path

```
ConsultationProvider
  └── ConsultationContext (useReducer + inline methods)
       ├── loadAppointment()        # 140 lines
       ├── startConsultation()      # 50 lines
       ├── completeConsultation()   # 45 lines
       ├── switchToPatient()        # 20 lines
       ├── persistDraftBackup()     # 12 lines
       ├── heartbeat effect         # 25 lines
       └── auto-save effect         # 30 lines
```

### Shim Code Path (untouched)

```
SessionOperationsShim (created in PR-A05-02, never called)
  ├── initializeSession() → SessionService | LegacySessionOperations
  ├── startSession() → SessionService | LegacySessionOperations
  ├── resumeSession() → SessionService | LegacySessionOperations
  ├── completeSession() → SessionService | LegacySessionOperations
  ├── switchSession() → SessionService | LegacySessionOperations
  └── sendHeartbeat() → SessionService | LegacySessionOperations
```

### Feature Flag State

| Flag | Registration | Set in Production | Consumed |
|------|-------------|-------------------|----------|
| `NEXT_PUBLIC_USE_SESSION_SERVICE` | `shared-kernel/feature-flags.ts` | No | No |

---

## 2. Cutover Prerequisites

### Must Fix Before CUT OVER

| # | Prerequisite | Owner | Severity |
|---|-------------|-------|----------|
| 1 | Remove `doctorApi.completeConsultation()` from SessionService | Application | CRITICAL |
| 2 | Replace direct `DraftStorage` access with `DraftService` delegation | Application | HIGH |
| 3 | Replace string literals with `AppointmentStatus` enum | Application | MEDIUM |
| 4 | Add integration tests verifying shim delegates to service | Testing | HIGH |
| 5 | Add parity tests comparing service vs legacy behavior | Testing | HIGH |
| 6 | Verify FeatureFlag reads are zero-cost when flag is false | Infrastructure | LOW |

### Should Fix Before CUT OVER

| # | Prerequisite | Owner | Severity |
|---|-------------|-------|----------|
| 7 | Implement `closeCompleteDialog` in SessionService | Application | MEDIUM |
| 8 | Add `outcomeType` and `patientDecision` to SessionData | Application | MEDIUM |
| 9 | Add error path tests for all shim methods | Testing | MEDIUM |
| 10 | Document rollback procedure in `architecture/sessionservice-cutover-readiness.md` | Architecture | LOW |

### Nice to Have

| # | Prerequisite | Owner | Severity |
|---|-------------|-------|----------|
| 11 | Add `TIMEOUT` variant for parallel fetch operations | Application | LOW |
| 12 | Add `SessionService` constructor factory for testability | Application | LOW |

---

## 3. Cutover Procedure

### Phase 1: Wire Shim (Day 1)

1. Create `SessionOperationsShim` instance in `ConsultationProvider`:
   ```typescript
   const sessionShim = useMemo(() => new SessionOperationsShim(
     sessionService,
     legacySessionOperations,
     user,
     dispatch
   ), [user]);
   ```

2. Replace inline `loadAppointment` body with:
   ```typescript
   const result = await sessionShim.initializeSession(appointmentId);
   if (result.success) {
     // hydrate state from result.data
   } else {
     // handle error
   }
   ```

3. Set `NEXT_PUBLIC_USE_SESSION_SERVICE=false` in `.env.local`

### Phase 2: Validate Legacy Path (Day 1-2)

1. Run full test suite: `npm test`
2. Manual smoke test of consultation workflows:
   - Open appointment
   - Start consultation
   - Edit notes
   - Complete consultation
   - Switch patient
   - Navigate away with unsaved changes
3. Verify zero behavioral differences vs pre-PR-A05-02

### Phase 3: Enable Feature Flag (Day 3)

1. Set `NEXT_PUBLIC_USE_SESSION_SERVICE=true` in `.env.local`
2. Run full test suite
3. Run parity tests
4. Monitor error logs for 24 hours in staging

### Phase 4: Remove Legacy Branch (Day 4)

1. Delete `LegacySessionOperations.ts`
2. Remove legacy branch from `SessionOperationsShim`
3. Delete feature flag from `shared-kernel/feature-flags.ts`
4. Remove `LegacyInitializeResult` and `LegacyStartResult` exports
5. Run lint + typecheck + tests

### Phase 5: Extract ConsultationContext (Day 5-8)

1. Remove `loadAppointment` method
2. Remove `startConsultation` method
3. Remove `completeConsultation` method
4. Remove `switchToPatient` method
5. Remove `persistDraftBackup` method
6. Remove heartbeat effect
7. Remove auto-save effect (delegate to DraftService via SessionProvider)
8. Remove batch `SET_DATA` action (delegate to SessionProvider)
9. Remove batch note/outcome actions (delegate to DocumentationProvider)
10. Validate line count reaches ~220

### Rollback at Any Phase

```bash
# Instant rollback
echo "NEXT_PUBLIC_USE_SESSION_SERVICE=false" >> .env.local
# Or full revert
git revert HEAD
```

---

## 4. Current Blocker Summary

### BLOCKING CUT OVER

| Blocker | Why It Blocks | Fix Complexity |
|---------|--------------|----------------|
| `completeSession` makes API call | SessionService has different responsibility boundary than certified design; causes inconsistency if API fails after workflow transition | Medium (4 hours) |
| Direct `DraftStorage` access in SessionService | Cannot safely delegate to DraftService without creating dependency loop | Low (2 hours) |
| No production wiring | Shim exists but ConsultationContext never calls it | Medium (wiring + integration tests) |
| No integration tests | Cannot validate behavioral parity before enabling flag | High (1 day) |

### NOT BLOCKING CUT OVER

| Issue | Why It's Safe |
|-------|--------------|
| String literals in `determineInitialWorkflowState` | Behavior is identical to ConsultationContext; type safety improvement only |
| Missing `outcomeType`/`patientDecision` in SessionData | These are Presentation state; not required for session lifecycle |
| Shim stubs for resume/cancel/pause/advanceQueue | Feature flag defaults to false; these methods are new functionality |

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| Behavioral regression on flag enable | LOW | HIGH | Parity tests + staged rollout |
| Workflow state inconsistency after completeSession API failure | MEDIUM | HIGH | Remove API call from SessionService |
| Draft loss on session switch | LOW | MEDIUM | Validate DraftService delegation before cutover |
| Memory leak from duplicate coordinator instances | LOW | MEDIUM | Use `useMemo` in ConsultationProvider |
| Performance regression from extra abstraction layer | LOW | LOW | Benchmark parallel fetch before/after |

---

## 6. Recommendation

**CUT OVER IS NOT READY.**

PR-A05-02 successfully delivered the CREATE phase. The shim pattern, feature flag, and unit tests are in place. However:

1. **The production code path has not been touched.** ConsultationContext remains the sole implementation.
2. **SessionService violates one certified responsibility boundary** (`completeSession` API call).
3. **Integration and parity tests are missing**, making staged rollout unsafe.
4. **DraftService bypass** creates a hidden coupling that will complicate future Provider extraction.

A minimum of **2-3 additional days** of remediation and integration work is required before the feature flag can be safely enabled.
