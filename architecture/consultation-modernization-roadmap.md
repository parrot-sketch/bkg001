# Consultation Module — Modernization Roadmap
## 1. Overview
This roadmap defines an 8-phase incremental modernization of the Consultation Module from its current monolithic architecture to the target bounded-context, provider-based architecture. Each phase is independently deployable, maintains backward compatibility, and includes rollback strategy. Total estimated duration: 20-24 weeks.
## 2. Guiding Principles
- **Patient Safety First**: No migration step may disrupt clinical workflows, auto-save, or draft restoration.
- **Incremental Delivery**: Each phase delivers value and can be deployed independently.
- **Backward Compatibility**: All changes maintain the existing API surface and UI behavior.
- **Low Deployment Risk**: Feature flags enable instant rollback; canary deployments limit blast radius.
- **Testability**: Every phase includes automated tests; no phase proceeds without passing acceptance criteria.
## 3. Phase Dependencies
```
Phase 1 (Foundations) ──┬──▶ Phase 2 (App Layer) ──┬──▶ Phase 3 (Documentation)
                       │                          │
                       ├──▶ Phase 4 (Patient) ─────┘
                       │
                       ├──▶ Phase 5 (Queue) ───────┴──▶ Phase 6 (Session)
                       │
                       ├──▶ Phase 7 (Extensions)
                       │
                       └──▶ Phase 8 (Observability) (can run in parallel with any phase)
```
## 4. Phase Details
### Phase 1: Architectural Foundations (Weeks 1-3)
**Objective**: Extract infrastructure adapters, storage interface, and shared kernel without changing behavior.
**Scope**:
- Create QUERY_CONFIG with centralized cache policies
- Create DraftStorage interface + LocalStorageDraftStorage implementation
- Create API adapters (ConsultationApi, PatientApi, QueueApi, BillingApi, NotificationApi, AuditApi) wrapping existing clients
- Create ClinicalErrorCode enum and ClinicalError type
- Create Shared Kernel types (PatientId, AppointmentId, ConsultationId, DoctorId)
**Deployability**: Yes — adapters are internal; no consumer-facing changes
**Backward Compatibility**: Yes — old apiClient/doctorApi/consultationApi remain; adapters are additive
**Rollback**: Remove adapter imports; revert to old clients
**Success Criteria**:
- All API adapters return identical responses to old clients
- DraftStorage preserves exact localStorage key format and timestamp logic
- QUERY_CONFIG applied to 0% of queries (validated but unused)
**Milestones**:
- Week 1: API adapters + contract tests passing
- Week 2: DraftStorage + localStorage tests passing
- Week 3: Shared kernel + QUERY_CONFIG
### Phase 2: Frontend Application Layer (Weeks 4-7)
**Objective**: Extract use cases and application services from ConsultationContext.
**Scope**:
- Create InitializeSession, StartConsultation, ResumeConsultation, CompleteConsultation, SaveDraft, RestoreDraft, SwitchPatient, AdvanceQueue, LoadPatientHistory use cases
- Create DraftService, SessionService, QueueService, AuditService, NotificationService application services
- ConsultationContext delegates to new use cases/services
**Deployability**: Yes — context shim preserves old interface
**Backward Compatibility**: Yes — context continues to expose same actions
**Rollback**: Context reverts to inline logic; use cases remain unused
**Success Criteria**:
- All 9 use cases pass behavioral parity tests against current context logic
- All 5 application services unit tested
- Context delegates to new use cases for at least 1 flow (start consultation)
**Milestones**:
- Week 4: InitializeSession + SaveDraft use cases
- Week 5: StartConsultation + CompleteConsultation use cases
- Week 6: SwitchPatient + AdvanceQueue + LoadPatientHistory use cases
- Week 7: Application services (DraftService, SessionService, QueueService)
### Phase 3: Documentation Context (Weeks 8-11)
**Objective**: Extract DocumentationProvider and notes state from ConsultationContext.
**Scope**:
- Create DocumentationProvider with notes, outcomeType, patientDecision, draftStatus, dirtyFields, version, activeTab
- Create SOAPNote domain entity
- Create Draft domain entity + NoteVersion value object
- DocumentationProvider owns auto-save logic
- ConsultationContext shim reads from DocumentationProvider
**Deployability**: Yes — feature flag controls whether components use old or new provider
**Backward Compatibility**: Yes — ConsultationContext continues to provide same notes state
**Rollback**: Disable feature flag; all components read from ConsultationContext shim
**Success Criteria**:
- All SOAP tabs render identically with new provider
- Auto-save triggers within 3s of last keystroke
- Draft restoration works correctly
- Version conflict detection works
- Render count on notes change reduced from 6+ to 3 components
**Milestones**:
- Week 8: DocumentationProvider + SOAPNote entity + unit tests
- Week 9: Auto-save + DraftService integration
- Week 10: Outcome/patient decision in DocumentationProvider
- Week 11: Feature flag rollout; parallel validation; cutover
### Phase 4: Patient Context (Weeks 12-14)
**Objective**: Extract PatientContextProvider and patient state from ConsultationContext.
**Scope**:
- Create PatientContextProvider with patient, vitals, allergies, conditions, consultationHistory, selectedHistoryId
- Create VitalsSnapshot value object
- Migrate PatientInfoSidebar to consume PatientContextProvider
- Migrate consultation history modal
**Deployability**: Yes — feature flag controls provider usage
**Backward Compatibility**: Yes — ConsultationContext shim delegates patient reads
**Rollback**: Disable feature flag; sidebar reads from ConsultationContext
**Success Criteria**:
- Patient sidebar renders identically with new provider
- Vitals display with warning indicators works
- Consultation history modal opens/closes correctly
- No render regression on patient switch
**Milestones**:
- Week 12: PatientContextProvider + VitalsSnapshot + unit tests
- Week 13: Sidebar migration + visual regression tests
- Week 14: History modal migration; feature flag rollout
### Phase 5: Queue Context (Weeks 15-17)
**Objective**: Extract QueueContextProvider and queue state from ConsultationContext.
**Scope**:
- Create QueueContextProvider with todayAppointments, waitingQueue, isCollapsed, switchingState, selectedForSwitch
- Create QueueFilter domain policy
- Migrate ConsultationQueuePanel and sub-components
- Migrate patient switching logic
**Deployability**: Yes — feature flag controls provider usage
**Backward Compatibility**: Yes — ConsultationContext shim delegates queue reads
**Rollback**: Disable feature flag; queue panel reads from ConsultationContext
**Success Criteria**:
- Queue panel renders identically with new provider
- Background polling continues at 30s interval
- Patient switching saves draft before navigation
- Queue display updates on polling without documentation re-renders
**Milestones**:
- Week 15: QueueContextProvider + QueueFilter + unit tests
- Week 16: QueuePanel migration + sub-components
- Week 17: Switching logic; feature flag rollout
### Phase 6: Session Provider (Weeks 18-20)
**Objective**: Extract SessionProvider and remaining session state from ConsultationContext.
**Scope**:
- Create SessionProvider with appointment, patient, consultation, doctorId, workflowState, loadingState, error
- Create SessionWorkflow state machine class
- Migrate ConsultationSessionPageOptimized to compose all providers
- Remove queue, patient, documentation state from ConsultationContext
**Deployability**: Yes — feature flag controls provider usage
**Backward Compatibility**: Yes — ConsultationContext remains as full fallback shim
**Rollback**: Disable feature flag; page reads from ConsultationContext
**Success Criteria**:
- Session page renders identically with new provider composition
- Workflow transitions match current behavior exactly
- Start/resume/complete flows work correctly
- Render count reduced by 50%+ on all major interactions
- ConsultationContext is reduced to <100 lines (shim only)
**Milestones**:
- Week 18: SessionProvider + SessionWorkflow + unit tests
- Week 19: Page composition migration + visual regression
- Week 20: ConsultationContext shim reduction; feature flag rollout
### Phase 7: Extension Framework (Weeks 21-22)
**Objective**: Implement extension registry and capability slots.
**Scope**:
- Create ExtensionRegistry in Shared Kernel
- Define extension slot locations in SOAPWorkspace, Sidebar, Header, Queue
- Register 2 pilot plugins (AI Clinical Assistant, Voice Dictation stubs)
- Implement ExtensionContext with permission-gated mutators
**Deployability**: Yes — feature flag disables all extensions
**Backward Compatibility**: Yes — core workspace works without any plugins
**Rollback**: Disable feature flag; no plugins loaded
**Success Criteria**:
- ExtensionRegistry registers/unregisters plugins correctly
- Plugins receive permission-gated ExtensionContext
- Plugin failure does not crash core UI
- Pilot plugins render in declared slots
- Slot ordering respects weight property
**Milestones**:
- Week 21: ExtensionRegistry + slot infrastructure + unit tests
- Week 22: Pilot plugins + plugin failure isolation tests
### Phase 8: Performance Optimization & Observability (Weeks 23-24)
**Objective**: Optimize rendering, add structured logging, metrics, and persistent audit.
**Scope**:
- Implement OpenTelemetry spans on use cases and services
- Replace ConsoleAuditService with persistent AuditApi
- Add structured logging with correlation IDs
- Optimize bundle splitting for feature modules
- Add render cascade monitoring
**Deployability**: Yes — each component is independently flaggable
**Backward Compatibility**: Yes — observability is additive only
**Rollback**: Disable feature flags individually
**Success Criteria**:
- All use cases emit OpenTelemetry spans
- Audit events persist to event store
- Structured logs include correlation IDs
- Bundle size increase <5% for feature modules
- No render regression after optimization
**Milestones**:
- Week 23: OpenTelemetry + structured logging
- Week 24: Audit store + bundle optimization
## 5. Milestone Summary
| Week | Phase | Key Deliverable | Deployable | Rollback Ready |
|------|-------|-----------------|------------|----------------|
| 3 | Phase 1 | Infrastructure adapters | Yes | Yes |
| 7 | Phase 2 | Use cases + services | Yes | Yes |
| 11 | Phase 3 | DocumentationProvider | Yes | Yes |
| 14 | Phase 4 | PatientContextProvider | Yes | Yes |
| 17 | Phase 5 | QueueContextProvider | Yes | Yes |
| 20 | Phase 6 | SessionProvider | Yes | Yes |
| 22 | Phase 7 | Extension framework | Yes | Yes |
| 24 | Phase 8 | Observability platform | Yes | Yes |
## 6. Parallel Execution Opportunities
- Phase 1 (Foundations) and Phase 8 (Observability) can overlap partially
- Phase 3 (Documentation) and Phase 4 (Patient) have minimal coupling and can be overlapped with careful integration
- Domain layer formalization (new entities, VOs, state machines) can proceed in parallel with any phase
- ADR review and approval can happen during Phase 1-2
## 7. Risk Mitigation Timeline
| Risk | Mitigation Phase | Detection |
|-------|------------------|-----------|
| Data corruption during notes migration | Phase 3 — dual-write period | Parallel run comparison tests |
| Provider synchronization failures | Phase 6 — event bus implementation | Event handler coverage reports |
| Render regression | Phase 6 — React DevTools Profiler | CI render count measurement |
| Completion workflow failure | Phase 2 — extract use cases first | Behavioral parity tests |
| Legacy notes parsing failure | Phase 3 — LegacyNotesAdapter | Legacy parse test suite |
