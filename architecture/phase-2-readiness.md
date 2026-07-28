# Phase 2 Readiness Assessment

## Verdict: NOT READY

Phase 2 (Provider Extraction) must not begin until the prerequisites identified in `phase-1-certification.md` are resolved. The current foundation is architecturally sound at the component level but incomplete at the system level.

---

## 1. Prerequisite Checklist

### 1.1 Must-Have Before Phase 2

| Prerequisite | Status | Owner | Effort |
|-------------|--------|-------|--------|
| Feature flag system (`lib/feature-flags.ts`) | ❌ Missing | Infrastructure | 1 day |
| Compatibility shim prototype | ❌ Missing | Application | 2 days |
| BillingApi port + HttpBillingApi adapter | ❌ Missing | Infrastructure | 1 day |
| NotificationApi port + HttpNotificationApi adapter | ❌ Missing | Infrastructure | 1 day |
| AuditApi port + HttpAuditApi adapter | ❌ Missing | Infrastructure | 1 day |
| Application service interfaces (DraftService, SessionService, QueueService) | ❌ Missing | Application | 2 days |
| QueuePatient DTO refactored to Application layer | ❌ Missing | Domain/Application | 1 day |
| Adapter dependency direction corrected | ❌ Missing | Infrastructure | 1 day |

**Estimated prerequisite effort: 9 days**

### 1.2 Should-Have Before Phase 2

| Prerequisite | Status | Owner | Effort |
|-------------|--------|-------|--------|
| SOAPNote entity aligned with blueprint | ❌ Missing | Domain | 2 days |
| SOAPNote migration from ConsultationNotes | ❌ Missing | Application | 3 days |
| Unified `ApiOutcome<T>` type in Shared Kernel | ❌ Missing | Shared Kernel | 0.5 days |
| Behavioral parity tests for ConsultationContext | ❌ Missing | Testing | 3 days |
| Domain policy objects (CanStartConsultation, etc.) | ❌ Missing | Domain | 2 days |

**Estimated should-have effort: 10.5 days**

### 1.3 Nice-to-Have

| Item | Status | Notes |
|------|--------|-------|
| Identity branded types (PatientId, AppointmentId) | Placeholder only | Low risk to defer |
| Event bus interface | Placeholder only | Required for Phase 3+ |
| Extension registry | Not started | Required for ADR-005 compliance |

---

## 2. Phase 2 Dependency Graph

```
Phase 1 Complete
    │
    ├──► Feature Flags ──┐
    ├──► Shim Pattern ───┤
    ├──► BillingApi ─────┤
    ├──► NotificationApi ┤
    ├──► AuditApi ───────┤
    ├──► App Services ───┤
    ├──► DTO Refactor ───┤
    └──► Adapter Fix ────┘
         │
         ▼
    Phase 2: Provider Extraction
         │
         ├── SessionProvider (Week 1)
         ├── PatientContextProvider (Week 2)
         ├── QueueContextProvider (Week 2)
         ├── DocumentationProvider (Week 3)
         ├── TimerProvider (Week 4)
         ├── BillingProvider (Week 5)
         └── NotificationProvider (Week 6)
```

**Critical path:** Feature flags → Shim pattern → SessionProvider extraction. Everything else can proceed in parallel.

---

## 3. Risk Assessment

### 3.1 High Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ConsultationContext extraction breaks hidden coupling | HIGH | HIGH | Build shim prototype first; behavioral parity tests |
| Adapter dependency on Application DTOs causes circular deps when services are added | MEDIUM | HIGH | Fix adapter imports before Phase 2 |
| Missing feature flags prevent safe rollout | CERTAIN | HIGH | Implement before any provider migration |
| QueuePatient DTO in Domain layer entangles QueueProvider with API shape | MEDIUM | MEDIUM | Refactor before QueueProvider extraction |

### 3.2 Medium Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ConsultationNotes/SOAPNote mismatch causes data migration issues | MEDIUM | MEDIUM | Align entities before DocumentationProvider extraction |
| Unified outcome type addition causes cascade of type changes | LOW | MEDIUM | Add new type alongside existing; deprecate old |
| React Query pollingPolicy interval discrepancy (60s vs blueprint 30s) | LOW | LOW | Document decision; revisit if UX feedback demands higher freshness |

### 3.3 Low Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| File path deviations (`lib/` vs `infrastructure/`) cause developer confusion | LOW | LOW | Update path conventions in Phase 2 setup scripts |
| Barrel export inconsistency in Shared Kernel | LOW | LOW | Clean up commented-out exports in Phase 2 |

---

## 4. Recommended Phase 2 Sequence

### Week 0: Remediation (9-10 days)

**Sprint 0A — Safety Infrastructure (3 days)**
1. Implement `lib/feature-flags.ts`
2. Build `ConsultationContext.shim.ts` prototype
3. Write behavioral parity tests for ConsultationContext

**Sprint 0B — Completeness (4 days)**
4. Implement BillingApi port + HttpBillingApi adapter
5. Implement NotificationApi port + HttpNotificationApi adapter
6. Implement AuditApi port + HttpAuditApi adapter
7. Define application service interfaces (DraftService, SessionService, QueueService, AuditService, NotificationService)

**Sprint 0C — Cleanup (2 days)**
8. Refactor QueuePatient DTO to Application layer
9. Fix adapter dependency direction (remove Application DTO imports)
10. Unify `*Outcome` types → `ApiOutcome<T>` in Shared Kernel

### Week 1-6: Provider Extraction

Per the existing migration roadmap, providers can be extracted independently once prerequisites are met. The recommended order:

1. SessionProvider (safest — smallest blast radius)
2. PatientContextProvider (depends on PatientApi, already ported)
3. QueueContextProvider (depends on QueueApi, already ported)
4. DocumentationProvider (depends on SOAPNote alignment)
5. TimerProvider (depends on TimerDuration VO)
6. BillingProvider (depends on BillingApi)
7. NotificationProvider (depends on NotificationApi + event bus)

---

## 5. Conclusion

The Phase 1 implementation establishes a **valid architectural foundation** in the Shared Kernel, ports, adapters, and storage boundary. These pieces are internally consistent and demonstrably compliant with Clean Architecture principles.

However, the implementation is **not ready for provider extraction** because:
1. Safety infrastructure (feature flags, shims) is missing
2. The Application Layer is entirely absent
3. The ConsultationContext monolith is untouched
4. Three required API ports are missing

**Recommendation:** Execute Sprint 0A, 0B, and 0C as defined above before beginning any provider extraction. This adds approximately 2-3 weeks of architectural work but eliminates the highest-risk failure modes.
