# SessionService Test Plan

## Purpose

This document defines the complete testing strategy for SessionService. It specifies unit tests, integration tests, workflow tests, rollback tests, deterministic replay tests, failure recovery tests, and performance tests with estimated coverage.

---

## 1. Test Strategy Overview

| Test Type | Scope | Estimated Tests | Coverage Target |
|-----------|-------|-----------------|-----------------|
| Unit tests | SessionService methods | 60+ | ≥90% branches |
| Parity tests | Legacy vs Service | 30+ | 100% methods |
| Shim tests | SessionOperationsShim routing | 15+ | 100% branches |
| Workflow tests | Coordinator integration | 20+ | 100% transitions |
| Rollback tests | Flag toggle + cleanup | 5+ | 100% scenarios |
| Deterministic replay | Idempotency | 10+ | 100% methods |
| Failure recovery | Error mapping | 25+ | 100% error codes |
| Integration tests | End-to-end session lifecycle | 10+ | 100% happy paths |
| Performance tests | Latency baseline | 5+ | p95 < 500ms |

**Total estimated tests: 180+**

---

## 2. Unit Tests

### 2.1 SessionService.test.ts

**Location:** `tests/unit/application/services/SessionService.test.ts`

**Scope:** Test each public method in isolation with mocked dependencies.

#### initializeSession

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Happy path | Valid appointment, no consultation exists | `SessionResult<SessionInitializationResult>` with READY state |
| Consultation exists | Appointment has IN_PROGRESS consultation | Returns ACTIVE state |
| Appointment completed | Appointment status = COMPLETED | Returns READY (read-only) |
| Appointment cancelled | Appointment status = CANCELLED | Returns READY (read-only) |
| Network error | API throws | `SessionResult` with NETWORK_ERROR, retryable=true |
| Not found | 404 response | `SessionResult` with NOT_FOUND |
| Draft newer than server | LocalStorage draft timestamp > server updatedAt | Draft restored |
| Draft older than server | LocalStorage draft timestamp < server updatedAt | Draft discarded |
| Invalid appointment ID | ID = 0 or negative | `SessionResult` with VALIDATION_FAILED |
| Concurrent load | Two simultaneous loads for same appointment | Both succeed with identical results |
| Partial data failure | Tier 1 succeeds, Tier 2 fails | Returns partial data with error |

#### startSession

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Happy path | Valid CHECKED_IN appointment | `SessionResult` with ACTIVE state |
| Already in progress | Consultation already exists | `SessionResult` with ACTIVE, toast message |
| Not found | Invalid appointment ID | `SessionResult` with NOT_FOUND |
| Permission denied | 403 response | `SessionResult` with AUTH_REQUIRED |
| Network error | API timeout | `SessionResult` with NETWORK_ERROR, retryable |
| Invalid status | Appointment is COMPLETED | `SessionResult` with VALIDATION_FAILED |

#### resumeSession

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Happy path | Valid IN_PROGRESS consultation | `SessionResult` with ACTIVE state |
| Not found | Invalid consultation ID | `SessionResult` with NOT_FOUND |
| Not in progress | Consultation is COMPLETED | `SessionResult` with VALIDATION_FAILED |
| Network error | API timeout | `SessionResult` with NETWORK_ERROR |

#### completeSession

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Happy path | Valid ACTIVE consultation | `SessionResult<SessionCompletionResult>` |
| Draft dirty | Unsaved changes exist | `SessionResult` with CLINICAL_VIOLATION |
| Guard rejection | WorkflowEngine rejects transition | `SessionResult` with STATE_CONFLICT |
| Not in progress | Consultation is NOT_STARTED | `SessionResult` with VALIDATION_FAILED |
| Network error | API timeout | `SessionResult` with NETWORK_ERROR |

#### cancelCompletion

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Happy path | Workflow state = COMPLETING | `SessionResult<SessionData>` with ACTIVE state |
| Wrong state | Workflow state = ACTIVE | `SessionResult` with STATE_CONFLICT |
| Wrong state | Workflow state = LOADING | `SessionResult` with STATE_CONFLICT |

#### pauseSession / resumePausedSession

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Happy path pause | State = ACTIVE | `SessionResult<void>` with state = PAUSED |
| Wrong state pause | State = LOADING | `SessionResult` with STATE_CONFLICT |
| Happy path resume | State = PAUSED | `SessionResult<void>` with state = ACTIVE |
| Wrong state resume | State = COMPLETED | `SessionResult` with STATE_CONFLICT |

#### switchSession

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Happy path | From dirty, to valid | `SessionResult<SessionSwitchResult>` with draft saved |
| Draft save fails | DraftService returns error | `SessionResult` with CLINICAL_VIOLATION |
| To not found | Invalid to-appointment | `SessionResult` with NOT_FOUND |
| Same appointment | fromId === toId | `SessionResult` with VALIDATION_FAILED |
| Network error | API timeout | `SessionResult` with NETWORK_ERROR |

#### advanceQueue

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Next patient exists | Queue has CHECKED_IN appointment | `SessionResult<SessionInitializationResult>` with next session |
| No next patient | Queue empty | `SessionResult` with null data |
| Network error | API timeout | `SessionResult` with NETWORK_ERROR |
| Invalid doctor | No appointments for doctor | `SessionResult` with NOT_FOUND |

#### sendHeartbeat

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Happy path | Valid consultation ID | `SessionResult<void>` |
| Network error | API timeout | `SessionResult<void>` (swallowed) |
| Not found | 404 response | `SessionResult` with NOT_FOUND, transitions to ERROR |
| Consultation completed | Consultation already COMPLETED | `SessionResult` with NOT_FOUND |

---

### 2.2 LegacySessionOperations.test.ts

**Scope:** Verify frozen legacy copy matches current ConsultationContext behavior.

| Test Case | Description |
|-----------|-------------|
| initializeSession parity | Same inputs → same outputs as original |
| startConsultation parity | Same inputs → same outputs as original |
| completeConsultation parity | Same inputs → same outputs as original |
| switchToPatient parity | Same inputs → same outputs as original |
| sendHeartbeat parity | Same inputs → same outputs as original |

---

### 2.3 SessionOperationsShim.test.ts

**Scope:** Verify shim routing logic.

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Flag OFF → legacy | `USE_SESSION_SERVICE = false` | Delegates to LegacySessionOperations |
| Flag ON → service | `USE_SESSION_SERVICE = true` | Delegates to SessionService |
| Service fails | Service returns error | Shim returns same error |
| Legacy fails | Legacy returns error | Shim returns same error |
| Both succeed | Same inputs | Identical `SessionResult` |
| Constructor wiring | Shim created with dependencies | Both service and legacy accessible |

---

## 3. Behavioral Parity Tests

### 3.1 SessionService.parity.test.ts

**Scope:** Prove SessionService produces identical behavior to legacy path.

```typescript
describe('SessionService behavioral parity', () => {
  const scenarios = [
    { name: 'initializeSession valid appointment', args: [1] },
    { name: 'initializeSession completed appointment', args: [2] },
    { name: 'startSession valid', args: [1, 'doctor-1', 'user-1'] },
    { name: 'completeSession dirty', args: [1] },
    // ... one scenario per method × error mode
  ];

  scenarios.forEach(({ name, args }) => {
    it(name, async () => {
      const legacyResult = await legacyOps[name.split(' ')[0]](...args);
      const serviceResult = await sessionService[name.split(' ')[0]](...args);
      expect(serviceResult).toEqual(legacyResult);
    });
  });
});
```

**Coverage:** 30+ scenarios covering all methods and failure modes.

---

## 4. Workflow Integration Tests

### 4.1 WorkflowPipelineCertification.test.ts (extend)

**Scope:** Verify SessionService integrates correctly with WorkflowCoordinator.

| Test Case | SessionService Method | Workflow Command | Expected Transition |
|-----------|----------------------|-----------------|---------------------|
| Initialize → READY | `initializeSession(validId)` | `INITIALIZE_CONSULTATION` | IDLE → READY |
| Initialize → ACTIVE | `initializeSession(inProgressId)` | `INITIALIZE_CONSULTATION` | IDLE → ACTIVE |
| Start → ACTIVE | `startSession(checkedInId, ...)` | `START_CONSULTATION` | READY → ACTIVE |
| Complete → TRANSITIONING | `completeSession(activeId)` | `COMPLETE_CONSULTATION` | COMPLETING → TRANSITIONING |
| Cancel → ACTIVE | `cancelCompletion()` | `CANCEL_CONSULTATION` | COMPLETING → ACTIVE |
| Pause → PAUSED | `pauseSession()` | `PAUSE_CONSULTATION` | ACTIVE → PAUSED |
| Resume → ACTIVE | `resumePausedSession()` | `RESUME_CONSULTATION` | PAUSED → ACTIVE |
| Switch → LOADING | `switchSession(from, to)` | `SWITCH_PATIENT` | any → LOADING |
| Advance queue | `advanceQueue(doctorId)` | `ADVANCE_QUEUE` | TRANSITIONING → LOADING/COMPLETED |

**All 338 existing workflow tests must continue to pass.**

---

## 5. Rollback Tests

### 5.1 Rollback instant

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Flag toggle OFF | Disable `USE_SESSION_SERVICE` during validation | Shim routes to legacy, no errors |
| Flag toggle ON | Enable flag during cutover | Shim routes to service, no errors |
| Shim removal | Delete shim after cutover | ConsultationContext calls service directly, no errors |
| Service removal | Revert PR branch entirely | Codebase returns to pre-PR-A05 state |

---

## 6. Deterministic Replay Tests

### 6.1 Replay.test.ts

**Scope:** Verify SessionService produces identical results for identical inputs.

```typescript
describe('SessionService deterministic replay', () => {
  it('initializeSession produces identical results on replay', async () => {
    const result1 = await service.initializeSession(1);
    // Replay: reset state, call again
    const result2 = await service.initializeSession(1);
    expect(result1).toEqual(result2);
  });

  // ... one test per method
});
```

**All 10 methods must be tested.**

---

## 7. Failure Recovery Tests

### 7.1 Recovery.test.ts

**Scope:** Verify SessionService handles infrastructure failures gracefully.

| Test Case | Failure | Recovery Mechanism | Expected Behavior |
|-----------|---------|-------------------|-------------------|
| Network timeout | API call hangs | Timeout + retry | Returns NETWORK_ERROR, retryable=true |
| 404 on load | Appointment deleted | Return NOT_FOUND | Presentation navigates away |
| 403 on start | Permission revoked | Return AUTH_REQUIRED | Presentation redirects to login |
| Draft conflict | Version mismatch | Return CONFLICT | Presentation shows conflict UI |
| Coordinator unavailable | WorkflowEngine down | Return STATE_CONFLICT | Session still loads, workflow in ERROR |
| Partial data | Tier 2 fails | Return partial SessionData | Presentation shows partial data with error |
| Concurrent switch | Two switch requests | Serialize via promise chain | Only second switch succeeds |

---

## 8. Integration Tests

### 8.1 SessionLifecycle.test.ts

**Scope:** End-to-end session lifecycle with real (or in-memory) infrastructure.

| Test Case | Steps | Expected Outcome |
|-----------|-------|-----------------|
| Full lifecycle | Load → Start → Pause → Resume → Complete | Session completes successfully |
| Load → Switch → Load | Load A → Switch to B | Session B loads, draft A saved |
| Load → Complete | Load → Start → Complete | Session completes, cache invalidated |
| Load → Cancel complete | Load → Start → Open complete → Cancel | Returns to ACTIVE |
| Resume existing | Load IN_PROGRESS consultation | Returns ACTIVE without API call |
| Queue advance | Complete → Advance → Next patient | Loads next session |
| Queue advance last | Complete → Advance → No next | Returns null, session complete |

---

## 9. Performance Tests

### 9.1 Performance.test.ts

**Scope:** Establish latency baselines for SessionService operations.

| Operation | Target p95 | Measurement Method |
|-----------|------------|-------------------|
| `initializeSession` | < 500ms | Mock API responses, measure wall time |
| `startSession` | < 300ms | Mock API responses, measure wall time |
| `completeSession` | < 400ms | Mock API response, measure wall time |
| `switchSession` | < 600ms | Mock save + load, measure wall time |
| `sendHeartbeat` | < 200ms | Mock POST, measure wall time |

**Baseline recorded for comparison after optimization.**

---

## 10. Coverage Targets

| Layer | Target | Enforcement |
|-------|--------|-------------|
| SessionService | ≥90% lines | vitest --coverage |
| SessionService | ≥90% branches | vitest --coverage |
| LegacySessionOperations | 100% copy verification | Manual review + parity tests |
| SessionOperationsShim | 100% branches | vitest --coverage |
| Integration tests | 100% happy paths | Manual review |

---

## 11. Test Execution Order

1. **Unit tests** (fast, isolated) — run on every commit
2. **Parity tests** (flag ON vs OFF) — run in CI for both flag states
3. **Workflow tests** — run full workflow suite (338 tests)
4. **Rollback tests** — run before cutover
5. **Deterministic replay** — run before cutover
6. **Failure recovery** — run before cutover
7. **Integration tests** — run in staging environment
8. **Performance tests** — run after staging deployment

---

## 12. CI Configuration

```yaml
# .github/workflows/sessionservice-tests.yml
name: SessionService Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npx vitest run tests/unit/application/services/SessionService.test.ts

  parity-tests-legacy:
    runs-on: ubuntu-latest
    env:
      USE_SESSION_SERVICE: "false"
    steps:
      - run: npx vitest run tests/unit/application/services/SessionService.parity.test.ts

  parity-tests-service:
    runs-on: ubuntu-latest
    env:
      USE_SESSION_SERVICE: "true"
    steps:
      - run: npx vitest run tests/unit/application/services/SessionService.parity.test.ts

  shim-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npx vitest run tests/unit/application/shim/SessionOperationsShim.test.ts

  workflow-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npx vitest run tests/unit/application/orchestrators/ tests/unit/domain/workflows/

  full-suite:
    runs-on: ubuntu-latest
    steps:
      - run: npx vitest run
```
