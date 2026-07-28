# Application Layer Readiness

## Executive Summary

The Application Layer design is **complete and ready for implementation**. All required services, use cases, commands, queries, and DTOs have been specified with direct mappings from the current `ConsultationContext` monolith. The design is backward compatible, incrementally adoptable, and aligned with the approved architecture.

**However, the implementation cannot begin until the prerequisites identified in `phase-2-readiness.md` are resolved.**

---

## 1. Prerequisite Checklist

### 1.1 Must-Have Before Application Layer Implementation

| Prerequisite | Status | Effort | Owner |
|-------------|--------|--------|-------|
| `ClinicalErrorCode` enum | ✅ Done | — | P1-003 |
| `ClinicalError` type | ✅ Done | — | P1-003 |
| `ConsultationApi` port | ✅ Done | — | P1-006 |
| `PatientApi` port | ✅ Done | — | P1-007 |
| `QueueApi` port | ✅ Done | — | P1-008 |
| `DraftStorage` interface | ✅ Done | — | P1-005 |
| `LocalStorageDraftStorage` adapter | ✅ Done | — | P1-005 |
| `query-config.ts` | ✅ Done | — | P1-004 |
| `adapter-utils.ts` | ✅ Done | — | P1-009 |
| Feature flag system | ❌ Missing | 1 day | Infrastructure |
| Compatibility shim prototype | ❌ Missing | 2 days | Application |
| `DraftService` interface | ❌ Not designed yet | 0.5 days | Application (this document) |
| `SessionService` interface | ❌ Not designed yet | 0.5 days | Application (this document) |
| `QueueService` interface | ❌ Not designed yet | 0.5 days | Application (this document) |

### 1.2 Blockers

| Blocker | Impact | Resolution |
|---------|--------|------------|
| No feature flags | Cannot safely rollout new Application Layer behind flags | Implement `lib/feature-flags.ts` |
| No shim pattern | Cannot maintain backward compatibility during extraction | Build `ConsultationContext.shim.ts` |
| No behavioral parity tests | Cannot verify new services match old behavior | Write tests before extraction |

---

## 2. Implementation Sequence

### Week 0: Prerequisites (3 days)

**Day 1-2: Feature Flags**
```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_DRAFT_SERVICE: 'use_draft_service',
  USE_SESSION_SERVICE: 'use_session_service',
  USE_QUEUE_SERVICE: 'use_queue_service',
  USE_NOTIFICATION_SERVICE: 'use_notification_service',
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  // Implementation: localStorage, cookie, or server-side config
}
```

**Day 3: Shim Pattern**
```typescript
// contexts/ConsultationContext.shim.ts
// Wraps new services behind the old context interface
// Allows gradual migration: old code uses context, new code uses services
```

### Week 1: DraftService + SessionService (5 days)

**Day 1-2: DraftService**
- Create `application/services/DraftService.ts`
- Extract auto-save debouncing from ConsultationContext lines 590-693
- Extract draft restoration from ConsultationContext lines 476-497
- Write unit tests for DraftService
- Wire into ConsultationContext via feature flag

**Day 3-4: SessionService**
- Create `application/services/SessionService.ts`
- Extract heartbeat from ConsultationContext lines 847-870
- Extract workflow state from ConsultationContext reducer
- Extract session lifecycle (initialize, start, complete, switch) from ConsultationContext lines 394-584, 725-789, 791-810
- Write unit tests for SessionService
- Wire into ConsultationContext via feature flag

**Day 5: Commands + Queries**
- Create `application/commands/StartConsultationCommand.ts`
- Create `application/queries/GetConsultationQuery.ts`
- Create `application/dto/consultation/` request/response types
- Wire commands into SessionService

### Week 2: QueueService + NotificationService (5 days)

**Day 1-2: QueueService**
- Create `application/services/QueueService.ts`
- Extract queue filtering from ConsultationContext lines 364-370
- Extract queue routing from ConsultationContext lines 760-782
- Write unit tests

**Day 3: NotificationService**
- Create `application/services/NotificationService.ts`
- Extract all toast calls from ConsultationContext
- Create `formatClinicalError` helper

**Day 4-5: AuditService + Commands**
- Create `application/services/AuditService.ts`
- Create remaining commands: `SaveDraftCommand`, `CompleteConsultationCommand`, `SwitchPatientCommand`, `AdvanceQueueCommand`
- Write tests

### Week 3: PatientContextProvider + TimerService (5 days)

**Day 1-2: PatientContextProvider**
- Extract patient data loading from ConsultationContext
- Create `PatientContextProvider`
- Wire patient data into SessionService

**Day 3: TimerService**
- Create `application/services/TimerService.ts`
- Extract session timing logic
- Create `TimerProvider`

**Day 4-5: Integration + Behavioral Parity Tests**
- Write end-to-end tests verifying new services match old ConsultationContext behavior
- Test all 11 use cases against current implementation
- Verify no regressions in existing tests

### Week 4: Provider Extraction Preparation (5 days)

**Day 1-2: Shim Validation**
- Validate `ConsultationContext.shim.ts` with all providers
- Run production traffic through shim
- Fix any discrepancies

**Day 3-4: Feature Flag Rollout**
- Enable DraftService flag for 10% of users
- Monitor for errors
- Roll out to 100%

**Day 5: SessionProvider Extraction**
- Extract SessionProvider from ConsultationContext
- Wire all components to SessionProvider
- Remove old context code

---

## 3. Critical Path

```
Feature Flags (3 days)
    │
    ▼
DraftService (2 days)
    │
SessionService (2 days)
    │
QueueService (2 days)
    │
NotificationService (1 day)
    │
AuditService (1 day)
    │
PatientContextProvider (2 days)
    │
TimerProvider (1 day)
    │
DocumentationProvider (depends on DraftService)
    │
BillingProvider (depends on BillingApi)
    │
NotificationProvider (depends on NotificationApi + event bus)
    │
Phase 3: Documentation Context
```

**Shortest path to first provider extraction:** Feature flags → DraftService → SessionService → SessionProvider = **~10 days**

---

## 4. Risk Assessment

### 4.1 High Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Behavioral parity tests reveal hidden coupling in ConsultationContext | HIGH | HIGH | Write tests before extraction; fix gaps first |
| Draft debouncing behavior differs between old and new implementation | MEDIUM | HIGH | Test edge cases (rapid typing, save during completion) |
| Heartbeat interval conflicts with new SessionService lifecycle | MEDIUM | MEDIUM | Extract heartbeat early; validate timing |
| Auto-save and manual save have overlapping triggers | MEDIUM | MEDIUM | Document trigger precedence; test both paths |

### 4.2 Medium Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Queue filtering logic has edge cases not covered by current tests | MEDIUM | MEDIUM | Add tests for queue edge cases before extraction |
| NotificationService toast calls miss some existing toast locations | LOW | MEDIUM | Grep for all `toast.` calls; map to service |
| CQRS `commands/` and `queries/` directories add unnecessary complexity | LOW | LOW | Start with flat `use-cases/`; restructure if needed |

### 4.3 Low Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| New service files increase bundle size | LOW | LOW | Tree-shake unused services |
| Feature flag overhead slows development | LOW | LOW | Remove flags after full rollout |

---

## 5. Open Questions

| Question | Decision Needed | Impact |
|----------|----------------|--------|
| Should `ConsultationNotes` be renamed to `SOAPNote`? | Yes — before DocumentationProvider | Affects DraftService and all note-handling code |
| Should `VitalsData` be extracted from `application/dtos/` to a shared location? | No — keep in Application DTOs | Low impact |
| Should the `commands/` and `queries/` directories be created in Week 1 or later? | Defer to Week 3 | Low impact |
| Should `PatientService` be created or should PatientContextProvider use `PatientApi` directly? | Use `PatientApi` directly for now | Low impact |
| Is `TimerProvider` a separate provider or should it be part of `SessionProvider`? | Separate for now — can merge later | Low impact |

---

## 6. Success Criteria

The Application Layer implementation is successful when:

1. **All 11 use cases** pass behavioral parity tests against current ConsultationContext logic
2. **All 7 application services** have unit tests covering their core responsibilities
3. **ConsultationContext delegates** to at least one new service for all 5 high-priority responsibilities
4. **Feature flags** allow toggling between old and new implementations
5. **No regressions** in existing 1274 unit tests + 10 frontend tests
6. **TypeScript** compiles without errors
7. **Bundle size** does not increase by more than 5KB gzipped

---

## 7. Design Readiness Verdict

**READY FOR IMPLEMENTATION**

The Application Layer design is:
- **Complete**: All 11 use cases, 7 services, directory structure, and DTO ownership are specified
- **Justified**: Every design decision traces back to observed behavior in ConsultationContext or the approved architecture
- **Incremental**: Services can be extracted one at a time without breaking existing code
- **Backward compatible**: ConsultationContext shim preserves the old interface during migration
- **Testable**: Every service and use case has clear test requirements derived from current behavior

**Next action:** Implement the prerequisites (feature flags, shim pattern), then begin DraftService extraction.
