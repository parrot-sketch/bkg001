# Consultation Module — Testing Strategy
## 1. Overview
This testing strategy defines the validation approach for every modernization phase. It covers unit tests, integration tests, workflow tests, clinical scenario tests, regression tests, performance tests, accessibility tests, and end-to-end tests. Each phase has specific test requirements, acceptance criteria, and exit criteria.
## 2. Testing Principles
- **Patient Safety First**: No test suite is complete without clinical scenario validation.
- **Behavioral Parity**: Every new component or provider must produce identical output to the old implementation.
- **Regression Prevention**: CI pipeline blocks merges if any critical test fails.
- **Testability by Design**: New code is written to be testable; no untestable side effects.
- **Shift Left**: Tests are written before implementation (TDD for domain and application layers).
## 3. Test Infrastructure
### 3.1 Tools
| Test Type | Tool | Configuration |
|-----------|------|---------------|
| Unit tests | Jest + ts-jest | --coverage; 90% threshold for domain/infra, 80% for app |
| Integration tests | Jest + React Testing Library | jsdom environment; msw for API mocking |
| Workflow tests | Jest + custom assertions | State machine transition matrix |
| Clinical scenario tests | Playwright | Chromium; baseURL: staging environment |
| Regression tests | Playwright + Percy | Visual snapshot baseline |
| Performance tests | Lighthouse CI + React DevTools Profiler | Performance budget enforcement |
| Accessibility tests | jest-axe + manual audit | WCAG 2.1 AA compliance |
| Contract tests | Pact | Provider contract verification |
### 3.2 Test Organization
```
__tests__/
├── unit/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Consultation.test.ts
│   │   │   ├── SOAPNote.test.ts
│   │   │   └── Draft.test.ts
│   │   ├── value-objects/
│   │   │   ├── VitalsSnapshot.test.ts
│   │   │   ├── NoteVersion.test.ts
│   │   │   └── AppointmentSlot.test.ts
│   │   ├── enums/
│   │   │   ├── ConsultationState.test.ts
│   │   │   └── OutcomeType.test.ts
│   │   ├── workflows/
│   │   │   ├── SessionWorkflow.test.ts
│   │   │   └── DocumentationWorkflow.test.ts
│   │   └── policies/
│   │       ├── CanStartConsultation.test.ts
│   │       └── RequiresCasePlanning.test.ts
│   ├── infrastructure/
│   │   ├── api/
│   │   │   ├── ConsultationApi.test.ts
│   │   │   ├── PatientApi.test.ts
│   │   │   └── DraftStorage.test.ts
│   │   └── services/
│   │       ├── DraftService.test.ts
│   │       └── SessionService.test.ts
│   └── application/
│       ├── use-cases/
│       │   ├── InitializeSession.test.ts
│       │   ├── StartConsultation.test.ts
│       │   ├── SaveDraft.test.ts
│       │   └── CompleteConsultation.test.ts
│       └── services/
│           ├── DraftService.test.ts
│           ├── SessionService.test.ts
│           └── QueueService.test.ts
├── integration/
│   ├── providers/
│   │   ├── DocumentationProvider.test.tsx
│   │   ├── PatientContextProvider.test.tsx
│   │   ├── QueueContextProvider.test.tsx
│   │   ├── SessionProvider.test.tsx
│   │   └── TimerProvider.test.tsx
│   ├── components/
│   │   ├── SOAPWorkspace.test.tsx
│   │   ├── PatientSidebar.test.tsx
│   │   ├── QueuePanel.test.tsx
│   │   └── CompletionDialog.test.tsx
│   └── workflows/
│       ├── session-lifecycle.test.tsx
│       ├── auto-save-flow.test.tsx
│       └── completion-cascade.test.tsx
├── workflow/
│   ├── state-machine-transitions.test.ts
│   └── orchestration-sequences.test.ts
├── clinical/
│   ├── start-document-complete.test.ts
│   ├── switch-patient-with-draft.test.ts
│   ├── resume-in-progress.test.ts
│   └── version-conflict-recovery.test.ts
├── regression/
│   ├── session-page-snapshot.test.ts
│   ├── sidebar-snapshot.test.ts
│   ├── queue-snapshot.test.ts
│   └── completion-snapshot.test.ts
└── performance/
    ├── render-count.test.ts
    └── bundle-size.test.ts
```
## 4. Phase Test Requirements
### Phase 1: Architectural Foundations
**Unit Tests:**
- API adapters return identical responses to old clients
- DraftStorage preserves exact localStorage behavior
- QUERY_CONFIG produces correct cache keys
- ClinicalErrorCode enum values are correct
**Contract Tests:**
- ConsultationApi matches backend OpenAPI spec
- PatientApi matches backend OpenAPI spec
- QueueApi matches backend OpenAPI spec
**Acceptance Criteria:**
- All adapters pass contract tests
- DraftStorage passes localStorage simulation tests
- QUERY_CONFIG keys match current ad-hoc keys
**Exit Criteria:**
- 90% unit coverage for adapters and storage
- 100% contract test pass rate
- Staging validation: no API response differences detected
### Phase 2: Frontend Application Layer
**Unit Tests:**
- Each use case produces identical outputs to current context logic
- DraftService debounce timing is exactly 3000ms
- SessionService heartbeat interval is exactly 30000ms
- QueueService filtering logic matches current useMemo
**Integration Tests:**
- StartConsultation use case + SessionProvider integration
- CompleteConsultation use case + SessionProvider integration
- SaveDraft use case + DraftService integration
**Workflow Tests:**
- InitializeSession: IDLE → LOADING → READY/ACTIVE
- StartConsultation: READY → ACTIVE
- CompleteConsultation: ACTIVE → COMPLETING → TRANSITIONING
**Acceptance Criteria:**
- All 9 use cases pass behavioral parity tests against current context
- All 5 application services unit tested
- Context delegates to use cases for at least start and save flows
**Exit Criteria:**
- 80% integration coverage for use cases
- 0 behavioral regressions in start, save, complete flows
- Context shim passes all existing consumer tests
### Phase 3: Documentation Context
**Unit Tests:**
- SOAPNote entity validation
- Draft entity version increment
- NoteVersion value object comparison
- DocumentationWorkflow state transitions
**Integration Tests:**
- DocumentationProvider renders SOAPWorkspace correctly
- Auto-save triggers within 3s of last keystroke
- Draft restoration from localStorage
- Version conflict detection and rollback
**Parallel Run Tests:**
- Old path and new path produce identical notes state after 100 random typing sequences
- Old path and new path produce identical draft saves after 50 save operations
- Old path and new path handle version conflicts identically
**Regression Tests:**
- Session page snapshot matches baseline
- SOAP tab switching snapshot matches baseline
- Completion dialog snapshot matches baseline
**Performance Tests:**
- Typing in subjective tab causes <3 re-renders (down from 6+)
- Auto-save timing within 3s ± 500ms
**Acceptance Criteria:**
- All SOAP tabs render identically with new provider
- Auto-save, manual save, draft restoration, version conflict all work
- Render count reduced from 6+ to 3 on notes change
**Exit Criteria:**
- 90% unit coverage for DocumentationProvider and domain objects
- 100% parallel run comparison pass
- 0 visual regressions in critical documentation paths
- Canary: 24 hours with <0.1% error rate
### Phase 4: Patient Context
**Unit Tests:**
- VitalsSnapshot warning flag logic
- PatientSnapshot demographic formatting
- ConsultationHistoryItem mapping
**Integration Tests:**
- PatientContextProvider loads patient and vitals correctly
- PatientSidebar renders all 8 sections identically
- Consultation history modal opens with correct data
**Regression Tests:**
- Patient sidebar snapshot matches baseline
- History modal snapshot matches baseline
- Vitals warning indicators snapshot matches baseline
**Acceptance Criteria:**
- Patient data displays identically with new provider
- Vitals warning thresholds match current implementation
- History modal interaction works correctly
**Exit Criteria:**
- 90% unit coverage for PatientContextProvider and VOs
- 0 visual regressions in sidebar and history modal
- Canary: 24 hours with <0.1% error rate
### Phase 5: Queue Context
**Unit Tests:**
- QueueFilter excludes current appointment correctly
- QueueFilter includes CHECKED_IN and READY_FOR_CONSULTATION
- NextPatientRouter prioritizes IN_CONSULTATION over waiting
**Integration Tests:**
- QueueContextProvider polls at correct interval
- QueuePanel renders waiting and in-consultation patients
- Patient switching saves draft before navigation
- Switch confirmation dialog appears when dirty
**Regression Tests:**
- Queue panel snapshot matches baseline
- Queue footer statistics snapshot matches baseline
- Collapsed rail snapshot matches baseline
**Performance Tests:**
- Queue polling does not cause documentation re-renders
**Acceptance Criteria:**
- Queue display identical with new provider
- Background polling continues at 30s interval
- Patient switching preserves drafts correctly
**Exit Criteria:**
- 90% unit coverage for QueueContextProvider and policies
- Queue polling detached from documentation re-renders
- 0 switching failures in staging
- Canary: 24 hours with <0.1% error rate
### Phase 6: Session Provider
**Unit Tests:**
- SessionWorkflow transition coverage: 100% (all states × all actions)
- SessionProvider derived values (isActive, isReadOnly, canComplete) match current logic
**Integration Tests:**
- SessionProvider composes all child providers correctly
- Session page renders with new provider composition
- Start/resume/complete flows work end-to-end
- Error recovery (retry) works correctly
**Regression Tests:**
- Full session page snapshot matches baseline
- Header snapshot matches baseline
- Start dialog snapshot matches baseline
- Completion dialog snapshot matches baseline
**Performance Tests:**
- Typing in notes causes <3 re-renders (down from 6+)
- Timer tick causes <2 re-renders (down from 6+)
- Queue poll causes 2 re-renders (unchanged)
- Session start causes <4 re-renders (down from 6+)
**Acceptance Criteria:**
- Session page renders identically with new provider composition
- All workflow transitions match current behavior
- ConsultationContext reduced to <100 lines (shim only)
**Exit Criteria:**
- 100% SessionWorkflow transition coverage
- 50%+ render count reduction on all major interactions
- 0 behavioral regressions in critical paths
- Canary: 48 hours with <0.1% error rate
### Phase 7: Extension Framework
**Unit Tests:**
- ExtensionRegistry registers/unregisters plugins correctly
- Plugin dependency validation rejects missing dependencies
- ExtensionContext permission gates block unauthorized access
- Plugin failure does not crash registry
**Integration Tests:**
- Pilot plugins render in declared slots
- Slot ordering respects weight property
- Plugin lifecycle hooks (initialize, activate, deactivate) fire correctly
- Plugin event subscriptions receive events
**Plugin Failure Tests:**
- Plugin throwing in initialize does not crash core UI
- Plugin throwing in event handler does not crash other plugins
- Plugin with circular dependency fails registration cleanly
**Acceptance Criteria:**
- ExtensionRegistry loads and activates plugins correctly
- Plugins render in UI slots
- Plugin errors are isolated
**Exit Criteria:**
- 90% registry coverage
- 0 core UI crashes from plugin failures
- 2+ pilot plugins integrated successfully
### Phase 8: Performance & Observability
**Unit Tests:**
- OpenTelemetry span generation for all use cases
- Audit event persistence to event store
- Structured log format validation
- Correlation ID propagation across services
**Integration Tests:**
- Use case spans appear in Jaeger/Tempo
- Audit events queryable in event store
- Log correlation enables tracing a request across services
**Performance Tests:**
- Span overhead <2% per request
- Bundle size increase <5% for feature modules
- Session page load time <2s on 3G
**Acceptance Criteria:**
- All use cases emit spans
- Audit events persist and are queryable
- Structured logs include correlation IDs
**Exit Criteria:**
- 100% use case span coverage
- 100% audit event integrity
- 0 performance regressions
## 5. Clinical Scenario Test Suite
These tests simulate real clinical workflows and must pass before any production deployment.
| Scenario | Steps | Expected Outcome |
|----------|-------|------------------|
| Start and Document | 1. Doctor starts consultation<br>2. Enters SOAP notes<br>3. Waits for auto-save<br>4. Manually saves<br>5. Completes consultation | All notes persisted; billing created; surgical case created if indicated; email sent |
| Resume In-Progress | 1. Doctor clicks Continue on IN_CONSULTATION appointment<br>2. Notes are restored<br>3. Doctor continues editing | Workspace loads with existing notes; no error; idempotent behavior |
| Switch Patient with Draft | 1. Doctor enters notes (dirty)<br>2. Clicks different patient in queue<br>3. Confirms switch<br>4. Draft saves<br>5. New patient loads | Draft saved before navigation; new patient data loaded; no data loss |
| Crash Recovery | 1. Doctor enters notes<br>2. Auto-save fires<br>3. Browser crashes<br>4. Browser reloads<br>5. Notes restored | Notes restored from localStorage silently; no toast; no data loss |
| Version Conflict | 1. Tab A enters notes and saves<br>2. Tab B enters notes and saves<br>3. Tab B detects version conflict<br>4. Tab B refetches and reconciles | Tab B notes updated to server version; no crash; user can continue editing |
| Queue Progression | 1. Doctor completes consultation<br>2. Next patient in queue exists<br>3. System loads next patient | Next patient loaded automatically; cache cleared; no stale data |
| Queue Progression (No Queue) | 1. Doctor completes consultation<br>2. No patients in queue<br>3. System routes to hub | Navigation to /doctor/consultations hub |
| Previous Consultation Reference | 1. Doctor clicks history card in sidebar<br>2. Modal opens with details<br>3. Doctor closes modal | Modal opens without interrupting consultation; closes cleanly |
| Draft Older Than Server | 1. Doctor has old draft in localStorage<br>2. Server has newer consultation.updatedAt<br>3. Consultation loads | LocalStorage draft discarded; server notes displayed |
| Heartbeat Maintenance | 1. Consultation is active for 5 minutes<br>2. Heartbeat sent every 30s<br>3. Session does not timeout | Session remains active; no timeout warning |
## 6. Definition of Done
A modernization phase is considered complete when:
1. All required unit tests pass with target coverage
2. All integration tests pass
3. All regression tests pass (0 visual differences)
4. All clinical scenario tests pass
5. Performance benchmarks met (render counts, load time)
6. Clinical team review passed in staging
7. Canary deployment passed (24-48 hours, <0.1% error rate)
8. Documentation updated (inline comments, architecture docs)
9. Feature flag tested (enable/disable both paths)
10. Rollback plan verified in staging
