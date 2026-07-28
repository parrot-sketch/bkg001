# Provider Readiness Matrix

## Assessment Date

2026-07-22

## Overall Readiness: NOT READY

No provider can be safely extracted until the prerequisites in `phase-2-readiness.md` are completed.

---

## Provider Details

### SessionProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 3/10 | `ConsultationApi` port exists with `loadConsultation` and `saveConsultationDraft` |
| Adapter Availability | 3/10 | `HttpConsultationApi` exists but is not consumed by any production code |
| Test Coverage | 2/10 | Adapter has 8 contract tests; zero integration tests with ConsultationContext |
| Behavioral Parity | 1/10 | No shim prototype exists; ConsultationContext monolith untouched at 1004 lines |
| Dependency Readiness | 2/10 | DraftStorage ✅; SessionService ❌; feature flags ❌ |
| Migration Path Clarity | 1/10 | No shim pattern, no feature flags, no rollback mechanism |
| **Overall** | **2/10** | **BLOCKED** |

**Blockers:**
1. No `SessionService` interface in Application Layer
2. No feature flag system for incremental rollout
3. No `ConsultationContext.shim.ts` prototype for backward compatibility
4. ConsultationContext monolith has no extraction plan validated
5. Session state machine (`SessionWorkflow`) not implemented as explicit class

**Dependencies:**
- `ConsultationApi` ✅
- `DraftStorage` ✅
- `SessionService` ❌
- Feature flags ❌
- Shim pattern ❌

**Migration Risk:** HIGH — SessionProvider is the most complex provider and the core of the Consultation module. Extraction without shims or feature flags risks breaking all consultation workflows.

---

### DocumentationProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 2/10 | ConsultationApi has `saveConsultationDraft` but no dedicated documentation operations |
| Adapter Availability | 2/10 | `HttpConsultationApi` covers draft saving; SOAP notes endpoints not audited |
| Test Coverage | 2/10 | Adapter tests exist; zero tests for documentation workflow |
| Behavioral Parity | 1/10 | No SOAPNote entity alignment with existing `ConsultationNotes` VO |
| Dependency Readiness | 2/10 | DraftStorage ✅; DraftService ❌; SOAPNote ❌ |
| Migration Path Clarity | 1/10 | No entity migration path defined |
| **Overall** | **2/10** | **BLOCKED** |

**Blockers:**
1. No `SOAPNote` entity — blueprint requires it; codebase uses `ConsultationNotes` VO instead
2. No `DraftService` interface
3. No dedicated documentation API operations (separate from consultation)
4. Auto-save logic embedded in ConsultationContext (lines 820-845) with no extraction path

**Dependencies:**
- `ConsultationApi` (partial) ✅
- `DraftStorage` ✅
- `DraftService` ❌
- `SOAPNote` entity ❌
- Auto-save infrastructure ❌

**Migration Risk:** HIGH — DocumentationProvider depends on the most complex domain entity alignment (ConsultationNotes → SOAPNote) and the most delicate behavior (auto-save with debouncing and conflict resolution).

---

### PatientContextProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 4/10 | `PatientApi` port exists with `loadPatient`, `loadPatientAppointments`, `loadUpcomingAppointments` |
| Adapter Availability | 4/10 | `HttpPatientApi` exists with 3 methods implemented and 6 tests |
| Test Coverage | 3/10 | Adapter contract tests exist; zero tests with actual patient data |
| Behavioral Parity | 2/10 | No `PatientSnapshot` VO; patient data loaded inline in ConsultationContext |
| Dependency Readiness | 3/10 | PatientApi ✅; PatientSnapshot ❌; feature flags ❌ |
| Migration Path Clarity | 3/10 | Straightforward port migration; no complex state to preserve |
| **Overall** | **3/10** | **BLOCKED** |

**Blockers:**
1. No `PatientSnapshot` value object
2. No `PatientContextService` interface
3. Feature flags not implemented
4. Patient data loading is inline in ConsultationContext (lines 419-420) without service abstraction

**Dependencies:**
- `PatientApi` ✅
- `PatientSnapshot` VO ❌
- Feature flags ❌

**Migration Risk:** MEDIUM — Patient data loading is relatively isolated. The main risk is the missing `PatientSnapshot` VO which may require data-shape changes.

---

### QueueContextProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 4/10 | `QueueApi` port exists with `loadQueue` |
| Adapter Availability | 4/10 | `HttpQueueApi` exists with 6 tests |
| Test Coverage | 4/10 | Adapter contract tests cover success, 401, 403, 404, network error |
| Behavioral Parity | 2/10 | `QueuePatient` DTO is API-shaped and in wrong layer |
| Dependency Readiness | 3/10 | QueueApi ✅; QueueFilter policy ❌; feature flags ❌ |
| Migration Path Clarity | 3/10 | Clear port migration; DTO cleanup required |
| **Overall** | **3/10** | **BLOCKED** |

**Blockers:**
1. `QueuePatient` DTO is in Domain layer (`domain/interfaces/services/QueueApi.ts`) but contains API-specific fields
2. No `QueueFilter` policy object
3. `useDoctorQueue` uses raw `fetch` — not yet migrated to QueueApi
4. Feature flags not implemented

**Dependencies:**
- `QueueApi` ✅
- `QueuePatient` refactor ❌
- `QueueFilter` policy ❌
- Feature flags ❌

**Migration Risk:** MEDIUM — The queue data shape mismatch creates a hidden coupling that must be resolved before extraction. The port interface itself is clean.

---

### TimerProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 1/10 | No TimerApi port exists |
| Adapter Availability | 1/10 | No timer adapter exists |
| Test Coverage | 0/10 | No timer tests beyond frontend infrastructure |
| Behavioral Parity | 2/10 | Timer logic is inline in ConsultationContext (lines 847-860 heartbeat, `useConsultationTimer.ts` exists) |
| Dependency Readiness | 1/10 | TimerDuration VO ❌; SessionService ❌ |
| Migration Path Clarity | 1/10 | No port, no adapter, no service |
| **Overall** | **1/10** | **BLOCKED** |

**Blockers:**
1. No `TimerApi` port
2. No `TimerDuration` value object
3. No `SessionService` interface
4. Timer logic is embedded in ConsultationContext and `useConsultationTimer.ts` hook
5. Heartbeat is raw `fetch` in ConsultationContext (line 854)

**Dependencies:**
- TimerApi port ❌
- TimerDuration VO ❌
- SessionService ❌

**Migration Risk:** HIGH — Timer is deeply embedded in ConsultationContext with no abstraction layer. Requires full port + service + VO creation before extraction.

---

### BillingProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 0/10 | No BillingApi port exists |
| Adapter Availability | 0/10 | No billing adapter exists |
| Test Coverage | 0/10 | No billing port tests |
| Behavioral Parity | 2/10 | Billing logic in ConsultationContext (lines 93-119, completion flow) |
| Dependency Readiness | 1/10 | BillingApi ❌; BillingService ❌ |
| Migration Path Clarity | 0/10 | No interface, no adapter, no service |
| **Overall** | **1/10** | **BLOCKED** |

**Blockers:**
1. No `BillingApi` port
2. No `BillingService` interface
3. Billing data is loaded inline in ConsultationContext (`apiClient.get` for vitals, billing mutation at completion)
4. `BillingTab` component is tightly coupled to ConsultationContext via `onSaveDraft` callback

**Dependencies:**
- BillingApi port ❌
- BillingService ❌
- Appointment billing DTOs (partially exist in Application DTOs) ⚠️

**Migration Risk:** HIGH — Billing is partially implemented but entirely un-abstracted. Requires full port + service + adapter creation.

---

### NotificationProvider

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Interface Availability | 0/10 | No NotificationApi port exists |
| Adapter Availability | 0/10 | No notification adapter exists |
| Test Coverage | 0/10 | No notification port tests |
| Behavioral Parity | 2/10 | Toasts via `sonner` in ConsultationContext; `MockNotificationService` exists in infrastructure |
| Dependency Readiness | 1/10 | NotificationApi ❌; NotificationService ❌; Event bus ❌ |
| Migration Path Clarity | 0/10 | No interface, no adapter, no service |
| **Overall** | **1/10** | **BLOCKED** |

**Blockers:**
1. No `NotificationApi` port
2. No `NotificationService` interface
3. No event bus infrastructure (`shared-kernel/events/` is placeholder)
4. Toast notifications are direct `sonner` calls in ConsultationContext and components
5. `MockNotificationService` exists in Infrastructure but has no Domain interface

**Dependencies:**
- NotificationApi port ❌
- NotificationService ❌
- Event bus ❌
- NotificationDomainEvent (Shared Kernel) ❌

**Migration Risk:** HIGH — Notifications are scattered across multiple components without any abstraction. Requires full event-based architecture.

---

## 2. Summary Table

| Provider | Score | Status | Blockers Count | Primary Blocker |
|----------|-------|--------|----------------|----------------|
| SessionProvider | 2/10 | BLOCKED | 5 | No feature flags, no shim, no SessionService |
| DocumentationProvider | 2/10 | BLOCKED | 4 | No SOAPNote entity, no DraftService |
| PatientContextProvider | 3/10 | BLOCKED | 4 | No PatientSnapshot VO, no feature flags |
| QueueContextProvider | 3/10 | BLOCKED | 4 | QueuePatient DTO in wrong layer, no QueueFilter |
| TimerProvider | 1/10 | BLOCKED | 5 | No TimerApi, no TimerDuration VO, no SessionService |
| BillingProvider | 1/10 | BLOCKED | 3 | No BillingApi, no BillingService |
| NotificationProvider | 1/10 | BLOCKED | 4 | No NotificationApi, no event bus |

---

## 3. Cross-Provider Dependencies

```
SessionProvider ◄── ConsultationApi ✅
SessionProvider ◄── DraftStorage ✅
SessionProvider ◄── SessionService ❌
SessionProvider ◄── Feature Flags ❌

DocumentationProvider ◄── ConsultationApi ✅
DocumentationProvider ◄── DraftStorage ✅
DocumentationProvider ◄── SOAPNote ❌
DocumentationProvider ◄── DraftService ❌

PatientContextProvider ◄── PatientApi ✅
PatientContextProvider ◄── PatientSnapshot ❌

QueueContextProvider ◄── QueueApi ✅
QueueContextProvider ◄── QueueFilter ❌

TimerProvider ◄── TimerApi ❌
TimerProvider ◄── TimerDuration ❌
TimerProvider ◄── SessionService ❌

BillingProvider ◄── BillingApi ❌
BillingProvider ◄── BillingService ❌

NotificationProvider ◄── NotificationApi ❌
NotificationProvider ◄── EventBus ❌
NotificationProvider ◄── NotificationService ❌
```

**Key insight:** Three providers (Session, Documentation, Timer) depend on `SessionService` and `DraftService`, which do not exist. These application services must be created before any of these three providers can be extracted. This is the critical path for Phase 2.
