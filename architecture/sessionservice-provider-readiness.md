# SessionService Provider Readiness

## Purpose

Determine whether SessionProvider, DocumentationProvider, QueueProvider, and PatientContextProvider extraction can safely begin given the current implementation state of SessionService.

---

## 1. Overall Readiness

**NOT READY.**

SessionService exists as a well-designed, isolated Application Service, but it is **unreachable from production code**. No Provider can be extracted over an unreachable service.

---

## 2. Provider-by-Provider Assessment

### 2.1 SessionProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 8/10 | SessionService public API is complete and typed |
| Adapter Availability | 5/10 | SessionOperationsShim exists but is not wired; LegacySessionOperations is frozen |
| Test Coverage | 2/10 | 14 unit tests; zero integration tests with Presentation |
| Behavioral Parity | 0/10 | No parity tests; ConsultationContext untouched |
| Dependency Readiness | 6/10 | SessionService ✅; DraftService ✅; DraftStorage ✅; Feature flag exists but unused |
| Migration Path Clarity | 3/10 | Shim pattern is clear but not activated |
| **Overall** | **4/10** | **BLOCKED** |

**Primary blockers:**
1. SessionService is not consumed by any production code
2. ConsultationContext session methods are untouched at 380 lines
3. No integration tests validate behavioral parity
4. `completeSession` has an architectural defect (direct API call)

**Estimated time to ready:** 3-4 days (CUT OVER + REMOVE + parity validation)

### 2.2 DocumentationProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 2/10 | ConsultationApi covers draft saving; no dedicated documentation operations |
| Adapter Availability | 2/10 | HttpConsultationApi covers partial surface |
| Test Coverage | 2/10 | Adapter tests only; zero documentation workflow tests |
| Behavioral Parity | 1/10 | Notes/outcome/decision state still in ConsultationContext |
| Dependency Readiness | 3/10 | DraftStorage ✅; DraftService ✅; SOAPNote ❌ |
| Migration Path Clarity | 2/10 | No entity migration path from ConsultationNotes to SOAPNote |
| **Overall** | **2/10** | **BLOCKED** |

**Primary blockers:**
1. Notes/outcome/decision state is still in ConsultationContext
2. No SOAPNote entity migration path
3. Auto-save debounce is still in ConsultationContext

**Dependency on SessionService:** NONE. DocumentationProvider extracts notes/outcome/decision state. It does not depend on SessionService being wired.

**Estimated time to ready:** 2-3 days of independent work

### 2.3 QueueProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 4/10 | QueueApi port exists; QueuePatient DTO has API-specific fields |
| Adapter Availability | 4/10 | HttpQueueApi exists with 6 tests |
| Test Coverage | 4/10 | Adapter contract tests pass |
| Behavioral Parity | 2/10 | Queue filtering is inline in ConsultationContext |
| Dependency Readiness | 3/10 | QueueApi ✅; QueueFilter ❌ |
| Migration Path Clarity | 3/10 | Clear port migration; DTO cleanup needed |
| **Overall** | **3/10** | **BLOCKED** |

**Primary blockers:**
1. QueuePatient DTO is in Domain layer but API-shaped
2. No QueueFilter policy object
3. Queue filtering logic is inline in ConsultationContext

**Dependency on SessionService:** NONE. QueueProvider can proceed independently.

**Estimated time to ready:** 2 days of independent work

### 2.4 PatientContextProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 4/10 | PatientApi port exists |
| Adapter Availability | 4/10 | HttpPatientApi exists with 3 methods and tests |
| Test Coverage | 3/10 | Adapter contract tests; zero with real patient data |
| Behavioral Parity | 2/10 | Patient data loading is inline in ConsultationContext |
| Dependency Readiness | 3/10 | PatientApi ✅; PatientSnapshot VO ❌ |
| Migration Path Clarity | 3/10 | Straightforward port migration |
| **Overall** | **3/10** | **BLOCKED** |

**Primary blockers:**
1. No PatientSnapshot value object
2. Patient data loading is inline in ConsultationContext

**Dependency on SessionService:** NONE. PatientContextProvider can proceed independently.

**Estimated time to ready:** 1-2 days of independent work

### 2.5 TimerProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 1/10 | No TimerApi port |
| Adapter Availability | 1/10 | No timer adapter |
| Test Coverage | 0/10 | No timer tests |
| Behavioral Parity | 2/10 | Heartbeat interval and auto-save timer in ConsultationContext |
| Dependency Readiness | 1/10 | TimerDuration VO ❌ |
| Migration Path Clarity | 1/10 | No port, no adapter, no service |
| **Overall** | **1/10** | **BLOCKED** |

**Primary blockers:**
1. No TimerApi port
2. No TimerDuration value object
3. Timer logic is embedded in ConsultationContext

**Dependency on SessionService:** SessionService.sendHeartbeat exists and owns the API call. The interval management (30s timer) still sits in ConsultationContext. TimerProvider must extract the interval logic independently.

**Estimated time to ready:** 2-3 days of port + service + VO creation

### 2.6 BillingProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 0/10 | No BillingApi port |
| Adapter Availability | 0/10 | No billing adapter |
| Test Coverage | 0/10 | No billing tests |
| Behavioral Parity | 2/10 | Billing logic is in CompleteConsultationDialog |
| Dependency Readiness | 1/10 | BillingApi ❌; BillingService ❌ |
| Migration Path Clarity | 0/10 | No interface, no adapter, no service |
| **Overall** | **1/10** | **BLOCKED** |

**Dependency on SessionService:** NONE. Billing is triggered after session completion.

**Estimated time to ready:** 3-4 days of full port + service creation

### 2.7 NotificationProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 0/10 | No NotificationApi port |
| Adapter Availability | 0/10 | No notification adapter |
| Test Coverage | 0/10 | No notification tests |
| Behavioral Parity | 2/10 | Toasts via sonner in ConsultationContext |
| Dependency Readiness | 1/10 | NotificationApi ❌; NotificationService ❌ |
| Migration Path Clarity | 0/10 | No interface, no adapter, no service |
| **Overall** | **1/10** | **BLOCKED** |

**Dependency on SessionService:** NONE. Toasts are UI concerns in Presentation Layer.

**Estimated time to ready:** 2-3 days of event-based architecture

---

## 3. Cross-Provider Dependency Graph (Current)

```
SessionProvider ◄── SessionService ❌ (not wired)
SessionProvider ◄── DraftService ✅
SessionProvider ◄── DraftStorage ✅
SessionProvider ◄── Feature Flag ❌ (not consumed)

DocumentationProvider ◄── DraftService ✅
DocumentationProvider ◄── DraftStorage ✅
DocumentationProvider ◄── SOAPNote ❌

PatientContextProvider ◄── PatientApi ✅
PatientContextProvider ◄── PatientSnapshot ❌

QueueProvider ◄── QueueApi ✅
QueueProvider ◄── QueueFilter ❌

TimerProvider ◄── SessionService.sendHeartbeat ✅
TimerProvider ◄── TimerApi ❌
TimerProvider ◄── TimerDuration ❌

BillingProvider ◄── BillingApi ❌
BillingProvider ◄── BillingService ❌

NotificationProvider ◄── NotificationApi ❌
NotificationProvider ◄── EventBus ❌
```

### Key Insight

The only provider genuinely blocked by SessionService is **SessionProvider itself**. All other providers have independent blockers unrelated to SessionService. The dependency chain is:

```
ConsultationContext (926 lines)
  └── must shrink to ~220 lines
       └── requires SessionService cutover
            └── requires SessionService architectural fixes
                 └── requires integration tests
                      └── SessionProvider becomes viable
```

---

## 4. Parallel Extraction Strategy

Since DocumentationProvider, QueueProvider, PatientContextProvider, BillingProvider, and NotificationProvider are all independently blocked, they can be extracted in parallel once their own prerequisites are met. This does NOT require SessionProvider to complete first.

### Safe Parallel Tracks

| Track | Provider | Blocker | Independent? |
|-------|---------|---------|-------------|
| A | PatientContextProvider | PatientSnapshot VO | Yes |
| B | QueueProvider | QueuePatient DTO + QueueFilter | Yes |
| C | DocumentationProvider | SOAPNote entity + auto-save extraction | Yes |
| D | BillingProvider | BillingApi + BillingService | Yes |
| E | NotificationProvider | NotificationApi + EventBus | Yes |
| F | TimerProvider | TimerApi + TimerDuration | Yes |
| G | SessionProvider | SessionService wiring + ConsultationContext shrink | No — requires SessionService cutover |

### Critical Path

```
PR-A05-03: SessionService cutover + ConsultationContext shrink (~3-4 days)
  └── SessionProvider extraction becomes viable
```

All other Provider extractions can proceed on parallel tracks without waiting for SessionProvider.

---

## 5. Feature Flag Impact

The `NEXT_PUBLIC_USE_SESSION_SERVICE` feature flag is currently registered but **never consumed in production code**. This means:

1. **No runtime risk**: The flag defaults to `false`, and no code path checks it.
2. **No dead code**: The flag definition and shim are inert but not harmful.
3. **No configuration drift**: The flag does not appear in `.env.example` or deployment configs.

When cutover begins, the flag will be:
1. Set to `true` in `.env.local` for staging
2. Validated with parity tests
3. Promoted to production
4. Removed after ConsultationContext is fully extracted

---

## 6. Recommendation

**Provider extraction CANNOT begin safely until PR-A05-03 completes the SessionService CUT OVER and ConsultationContext REMOVE phases.**

However, **6 of 7 Providers have independent blockers** and can begin their own extraction work in parallel:

| Provider | Can Start Now? | First Milestone |
|----------|---------------|----------------|
| SessionProvider | ❌ | PR-A05-03 (SessionService cutover) |
| DocumentationProvider | ✅ | Create SOAPNote entity + DraftService integration |
| QueueProvider | ✅ | Refactor QueuePatient DTO + create QueueFilter |
| PatientContextProvider | ✅ | Create PatientSnapshot VO |
| TimerProvider | ✅ | Create TimerApi port + TimerDuration VO |
| BillingProvider | ✅ | Create BillingApi port + BillingService |
| NotificationProvider | ✅ | Create NotificationApi port + event bus |

**Next Step:** Proceed with PR-A05-03 (SessionService cutover) as the critical-path blocker. Launch parallel Provider extraction tracks for all other providers that have unblocked prerequisites.
