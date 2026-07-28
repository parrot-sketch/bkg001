# Architecture Scorecard v1

## Scoring Methodology

Each category is scored 1–10:

| Score | Meaning |
|-------|---------|
| 1-3 | Critical deficiency; blocks progress |
| 4-5 | Significant gaps; requires immediate attention |
| 6-7 | Solid foundation with known issues |
| 8-9 | Strong implementation; minor refinements only |
| 10 | Exemplary; no actionable improvements |

**Certification Threshold:** Overall weighted average ≥ 7.5/10 with no category below 6/10.

**Current Status:** NOT CERTIFIED — Weighted average: 4.6/10. Multiple categories below 6/10.

---

## 1. Documentation Completeness

**Score: 8/10**

**Strengths:**
- 51 architecture documents cover strategy, design, execution, and review
- 5 approved ADRs document key decisions with context and consequences
- Execution plan, deployment validation, and implementation checklists exist
- DraftService certification and post-implementation review are thorough

**Gaps:**
- `architecture-baseline-v1.md` did not exist before this certification
- `architecture-invariants.md` did not exist before this certification
- `implementation-guardrails.md` did not exist before this certification
- Some documents contradict each other (see consistency audit)
- Migration architecture v1 (scattered flags) and v2 (shim-first) both exist — v1 should be deprecated

**Improvements needed:**
1. Deprecate `consultation-migration-strategy.md` in favor of `migration-architecture-v2.md`
2. Add cross-references between related documents
3. Create single source of truth for each concern (eliminate duplication)

---

## 2. Consistency & Coherence

**Score: 3/10**

**Strengths:**
- Core concepts (providers, Application Services, Clean Architecture) are consistently named across most documents

**Gaps:**
- 12 contradictions identified in consistency audit (see audit report)
- Critical: ConsultationContext size documented as 976 lines in ADRs but is 1,019 lines in code
- Critical: `StructuredNotes` duplicated across 3 locations
- Critical: Triple-write pattern for notes contradicts ADR-003
- Medium: Workflow state machine exists but is bypassed
- Medium: Version conflict detection duplicated in 2 files
- Medium: Full-text formatting has 3 different implementations
- Low: Feature flag naming convention inconsistent (_SERVICE vs _PROVIDER)

**Improvements needed:**
1. Resolve all 6 CRITICAL contradictions before Phase 2
2. Update all ADRs and documents to reference actual line counts
3. Consolidate duplicated types and business logic
4. Enforce state machine usage in production code

---

## 3. Layering & Dependency Direction

**Score: 4/10**

**Strengths:**
- Shared Kernel has zero upper-layer imports
- Shared Kernel is correctly a leaf module
- Adapters implement ports without circular deps at the Infrastructure level

**Gaps:**
- Circular dependency: `ConsultationApi` (Domain) → Application DTOs → `ConsultationApi`
- Presentation Layer directly imports Infrastructure: `useSaveConsultationDraft.ts` imports `consultationApi`; `ConsultationContext.tsx` imports `doctorApi`, `consultationApi`, `apiClient`, `LocalStorageDraftStorage`
- Infrastructure adapters import Application DTOs (violation of intended direction)
- Application Layer (DraftService) imports from Domain Layer, which creates the cycle via DTO imports

**Improvements needed:**
1. Move `ConsultationResponseDto` and `SaveConsultationDraftDto` to Shared Kernel or define generic result types in Domain interface
2. Rewire Presentation Layer to consume ports through Application Layer only
3. Remove Infrastructure imports from hooks and contexts

---

## 4. State Ownership

**Score: 4/10**

**Strengths:**
- ADR-003 defines 6 state categories clearly
- React Query is correctly used for server state
- DraftStorage interface exists for persistence state

**Gaps:**
- Triple-write pattern for notes (reducer + React Query + localStorage) violates ADR-003
- Notes exist in 3 places simultaneously with no clear single source of truth
- `ConsultationContext` owns session, notes, patient, queue, timer, and UI state — all in one reducer
- DraftService writes to localStorage while ConsultationContext also writes to localStorage

**Improvements needed:**
1. Define single source of truth for notes (DocumentationProvider or DraftService, not both)
2. Make React Query cache the authoritative server state; localStorage is backup only
3. Split ConsultationContext reducer into provider-specific reducers

---

## 5. Clinical Workflow Support

**Score: 3/10**

**Strengths:**
- Error taxonomy includes consultation-specific codes
- DraftStorage preserves existing draft restore behavior
- Queue polling policy documented

**Gaps:**
- No Application Services orchestrating clinical workflows except DraftService
- State machine (`ConsultationWorkflowState`) exists but is bypassed — direct reducer mutations
- No clinical domain entities (Draft, SOAPNote, PatientSnapshot)
- TimerProvider not implemented — session timing has no domain abstraction
- SessionService does not exist — core session orchestration is inline in ConsultationContext
- Auto-save, heartbeat, and draft restoration are inline effects, not testable services

**Improvements needed:**
1. Implement SessionService with validated state transitions
2. Implement SOAPNote entity aligned with blueprint
3. Implement TimerProvider
4. Enforce state machine usage in all reducers

---

## 6. Extraction Readiness

**Score: 2/10**

**Strengths:**
- DraftService has been extracted and is architecturally sound (in isolation)
- Shim-first replacement pattern is defined in v2 documents
- Provider strategy is well-designed on paper

**Gaps:**
- 0 of 7 planned providers implemented
- DraftService extraction used scattered flags (not shim-first), creating dual paths
- ConsultationContext grew from 1004 to 1019 lines after "extraction"
- Compatibility shim does not exist
- 4 feature flags scattered across ConsultationContext instead of centralized
- No extraction has reduced ConsultationContext complexity
- Legacy code is not frozen in a LegacyOperations class — it remains active

**Improvements needed:**
1. Implement actual shim for DraftService; remove scattered flags
2. Prove extraction reduces ConsultationContext size before proceeding to SessionService
3. Create SessionService as the next extraction target

---

## 7. Testing

**Score: 7/10**

**Strengths:**
- 1,274 unit tests + 10 frontend tests pass
- Frontend test infrastructure is production-quality
- Adapter contract tests exist for all 3 ports
- Shared Kernel has dedicated unit tests
- DraftService has 18 unit tests covering all methods

**Gaps:**
- No behavioral parity tests for ConsultationContext
- No integration tests verifying adapter ↔ backend contract
- Missing 429 rate-limit mapping tests
- No tests verify shim routing behavior
- No visual regression tests for provider extraction

**Improvements needed:**
1. Add behavioral parity tests before Phase 2
2. Add integration tests for adapters
3. Add shim routing tests
4. Add 429 mapping tests

---

## 8. Error Handling

**Score: 7/10**

**Strengths:**
- ClinicalErrorCode enum covers 30 codes across 7 categories
- ClinicalError type is well-designed with recoverable, retryable, severity
- All adapters map HTTP status codes consistently
- DraftStorage maps errors to ClinicalError taxonomy

**Gaps:**
- ConsultationContext still uses raw error strings in many places
- Version conflict detection logic duplicated
- No error logging or reporting infrastructure
- DraftService error handling is good but not integrated into ConsultationContext error flow

**Improvements needed:**
1. Migrate ConsultationContext to use ClinicalErrorCode enum
2. Centralize version conflict detection
3. Add error logging infrastructure

---

## 9. Caching

**Score: 6/10**

**Strengths:**
- query-config.ts defines canonical policies
- Invalidation triggers documented
- Polling interval defined (60s for queue)

**Gaps:**
- Policies not adopted by production code
- Polling interval discrepancy: blueprint says 30s, implementation says 60s
- No cache warming strategy
- React Query keys may diverge from query-config factories

**Improvements needed:**
1. Reconcile 30s vs 60s polling
2. Adopt query-config policies in production code
3. Validate key shape consistency

---

## 10. Storage Abstraction

**Score: 6/10**

**Strengths:**
- DraftStorage interface decouples consumers from localStorage
- LocalStorageDraftStorage preserves existing key format
- Corrupt draft handling matches existing behavior

**Gaps:**
- DraftStorage interface over-engineered (6 methods vs needed 3)
- ConsultationContext still uses raw localStorage
- Draft serialization lives in Shared Kernel but lacks tests
- DraftService and ConsultationContext both write to localStorage simultaneously

**Improvements needed:**
1. Simplify DraftStorage interface
2. Wire LocalStorageDraftStorage into ConsultationContext or remove raw localStorage
3. Add serialization tests

---

## 11. Extensibility

**Score: 4/10**

**Strengths:**
- Port interfaces are stable and business-oriented
- Adapters can be swapped
- DraftStorage supports future backends

**Gaps:**
- Event bus is placeholder only
- Extension registry per ADR-005 does not exist
- Feature flags exist but are inconsistent
- No plugin or middleware pattern for provider composition

**Improvements needed:**
1. Implement event bus interface
2. Implement extension registry
3. Deprecate inconsistent feature flags

---

## 12. Maintainability

**Score: 3/10**

**Strengths:**
- Ports and adapters are small, focused files
- Error mapping is centralized
- Documentation is thorough on new components

**Gaps:**
- ConsultationContext monolith is 1,019 lines with no effective decomposition
- DraftService extraction increased context size rather than decreasing it
- 5 Shared Kernel directories are empty placeholders
- Three duplicate outcome type families
- Adapter files are verbose

**Improvements needed:**
1. Implement shim-first replacement to actually shrink ConsultationContext
2. Remove or populate Shared Kernel placeholders
3. Unify outcome types

---

## 13. Overall Scorecard

| Category | Score | Trend | Certification |
|----------|-------|-------|--------------|
| Documentation Completeness | 8/10 | ↑ Good | ✅ Pass |
| Consistency & Coherence | 3/10 | ↓ 12 contradictions | 🔴 Block |
| Layering & Dependency Direction | 4/10 | → Circular dependency | 🔴 Block |
| State Ownership | 4/10 | → Triple-write | 🔴 Block |
| Clinical Workflow Support | 3/10 | ↓ No workflow abstractions | 🔴 Block |
| Extraction Readiness | 2/10 | ↓ Context growing | 🔴 Block |
| Testing | 7/10 | ↑ Solid foundation | ✅ Pass |
| Error Handling | 7/10 | ↑ Strong taxonomy | ✅ Pass |
| Caching | 6/10 | → Not adopted | 🟡 Warn |
| Storage Abstraction | 6/10 | → Functional | 🟡 Warn |
| Extensibility | 4/10 | ↓ Placeholders only | 🔴 Block |
| Maintainability | 3/10 | ↓ Monolith growing | 🔴 Block |

**Weighted Average: 4.6/10**

**Certification Threshold:** 7.5/10 minimum, no category below 6/10
**Actual Result:** 5 categories below 6/10, weighted average 4.6/10

---

## 14. Blockers Summary

### Must Fix Before Certification (6 items)

1. **CRITICAL:** Circular dependency: `ConsultationApi` (Domain) imports Application DTOs
2. **CRITICAL:** `StructuredNotes` / `ConsultationNotes` duplication across 3 layers
3. **CRITICAL:** ConsultationContext is 1,019 lines and growing — shim target not met
4. **HIGH:** Triple-write pattern for notes violates ADR-003
5. **HIGH:** Workflow state machine bypassed — reducer directly mutates state
6. **HIGH:** Version conflict detection + full-text formatting duplicated

### Should Fix Before Phase 2 (4 items)

7. Feature flag naming convention inconsistency
8. Direct Infrastructure imports in Presentation Layer
9. DraftService dual-path increases complexity rather than reducing it
10. Missing behavioral parity tests

### Can Fix During Phase 2 (4 items)

11. Empty Shared Kernel placeholders
12. Query-config policies not adopted
13. Event bus placeholder
14. Extension registry missing

---

## 15. Certification Pathways

### Pathway A: Full Certification (Recommended)

1. Fix all 6 BLOCKER issues
2. Resolve all 4 SHOULD-FIX issues
3. Re-run consistency audit
4. Re-score all categories
5. Certify if all categories ≥ 7/10 and weighted average ≥ 7.5/10

**Estimated effort:** 2-3 weeks of architectural work

### Pathway B: Conditional Certification

Certify with explicit conditions:
1. Blockers 1-3 must be fixed before Phase 2
2. Blockers 4-6 must have tickets created with target dates
3. Phase 2 cannot begin until all blockers resolved
4. Re-certification required after each blocker is resolved

**Risk:** Phase 2 may begin while architecture is still inconsistent, compounding errors

---

## Final Verdict

**NOT CERTIFIED**

The Consultation Module modernization architecture has significant inconsistencies that prevent safe forward progress. The DraftService extraction, while functionally correct, violated multiple architectural invariants and did not achieve its stated goal of reducing complexity. Six blocking issues must be resolved before Phase 2 implementation can proceed.

**Do not implement SessionService, QueueService, or any Provider extraction until the 6 blockers are resolved and the architecture is re-certified.**
