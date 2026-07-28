# Consultation Module — Gap Analysis
## Executive Summary
### Alignment Assessment
The current Consultation Module is well-aligned with the target architecture at the Domain Layer and Infrastructure Layer, but exhibits significant gaps at the Presentation Layer and Application Layer. The module already follows Clean Architecture principles with a rich domain model, dual state machines, and clear repository boundaries. However, the monolithic ConsultationContext (976 lines), triple-write notes pattern, and lack of bounded contexts prevent scalable evolution.
### Largest Architectural Gaps
1. Monolithic Context God Object — ConsultationContext is a 976-line monolith that owns session, documentation, patient, queue, timer, and billing state. This prevents independent evolution and causes unnecessary re-renders.
2. Triple-Write Notes Pattern — Notes exist simultaneously in reducer state, React Query cache, and localStorage with no clear source of truth.
3. No Bounded Contexts — All clinical capabilities are entangled in a single context instead of being partitioned by domain boundary.
4. No Extension Architecture — The workspace has hardcoded tabs with no plugin slots, making it impossible to add AI, voice, or imaging capabilities without modifying core code.
5. Ineffective Memoization — Context value recomputes on every dispatch because the state object is in the dependency array, causing all consumers to re-render on every keystroke.
6. Mixed State Ownership — Server state, client state, form state, and session state are not clearly categorized.
7. Missing Observability — Console.log-based audit trail with no structured logging, metrics, or distributed tracing.
8. No Automated Tests — Zero test coverage identified, making refactoring risky.
### Well-Aligned Areas
- Domain Layer — Rich Consultation entity with immutable state transitions, value objects, and business rule encapsulation.
- Dual State Machines — Clean separation of ConsultationState (clinical) and ConsultationWorkflowState (UI) is correct and must be preserved.
- Repository Pattern — PrismaConsultationRepository implements IConsultationRepository with proper abstraction.
- Use Case Orchestration — StartConsultationUseCase and CompleteConsultationUseCase are proper orchestrators.
- Auto-Save Mechanism — Debounced save with optimistic updates, version conflict detection, and localStorage backup is production-grade.
- API Client Design — Typed API clients with DTOs provide compile-time safety.
- Idempotent Session Start — Handles already-in-progress sessions correctly.
### Highest Implementation Risk
1. Provider Extraction — Splitting the monolith without breaking 15+ consumers.
2. Notes State Migration — Moving from triple-write to single source of truth without data loss.
3. Cache Invalidation — Changing React Query keys or policies could cause stale data in production.
4. Completion Workflow — The 12-step backend completion cascade is high-stakes; any change risks billing, surgical case, or notification failures.
### Independent Modernization Areas
These can be modernized without touching other concerns:
- Domain entities and enums — Already pure, no changes needed.
- Repository interfaces — Already abstracted.
- API client typing — Already well-structured.
- Legacy notes parsing — Can be extracted into LegacyNotesAdapter independently.
- Draft storage — Can introduce DraftStorage interface while keeping localStorage implementation.
## Modernization Readiness Score: 62/100
Strengths (45 points): Clean domain layer, rich entities, dual state machines, repository pattern, use case orchestration, idempotent start, auto-save with crash recovery.
Gaps (25 points): Monolithic context (-10), triple-write pattern (-5), no bounded contexts (-3), no extension architecture (-3), ineffective memoization (-2), no tests (-2).
Migration Path Clarity (15 points): Target architecture is well-defined with clear provider boundaries, bounded contexts, and extension strategy.
Production Risk (13 points): 976-line context is high-risk to modify without tests; completion cascade is high-stakes; no automated regression suite.

## Section 2 — Architecture Gap Analysis

### 2.1 Presentation Layer
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Structure | Single SessionPage with 6 lazy children | SessionPage shell composing 7 providers | Monolithic page needs decomposition | High — new capabilities require core modification | High — 15+ consumers must migrate | Medium — must preserve exact rendering | High | 3-4 weeks | Strangler Fig | Visual regression; React DevTools Profiler |
| Component organization | Flat hierarchy; all components are direct children of provider | Feature-first modules (features/clinical-documentation, features/patient-context, features/queue) with atomic design | No feature boundaries; all components coupled to single context | High — parallel development blocked | Medium — file reorganization only | Low | Medium | 2 weeks | Extract Module | File structure audit |
| Extension model | Hardcoded tabs and panels | Declarative extension slots with plugin registry | Zero extensibility; adding AI/voice/imaging requires core changes | Critical — blocks all future capabilities | High — requires slot infrastructure | Low | High | 4-6 weeks | Plugin Architecture | Slot registration tests |
| State access | All components consume ConsultationContext | Components consume only providers they need | All components re-render on any state change | Medium — performance degradation on low-end devices | High — provider extraction required | Low | High | 4-6 weeks | Strangler Fig | Render count measurement |

### 2.2 Frontend Application Layer
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Use cases | 2 use cases (StartConsultation, CompleteConsultation) | 9 use cases covering full lifecycle | Missing orchestration for init, resume, save, restore, switch, advance queue | Medium — logic scattered in context | Medium — extraction from 976-line file | Low | Medium | 2-3 weeks | Extract Method | Behavioral tests per use case |
| Application services | None (logic embedded in context) | DraftService, SessionService, QueueService, AuditService, NotificationService | No separation of concerns; context does everything | High — untestable monolith | High — orchestration logic embedded | Low | Medium | 2 weeks | Extract Class | Service unit tests |
| Provider orchestration | Single context mixes data fetching, state, side effects, business logic | 7 focused providers each owning one capability cluster | Single Responsibility violated; 976-line file | High — merge conflicts; slow reviews | High — affects 15+ files | Medium | High | 4-6 weeks | Strangler Fig | Behavioral parity tests |
| State machines | Implicit in reducer | Explicit SessionWorkflow, DocumentationWorkflow, QueueWorkflow classes | State transitions hidden in reducer; hard to visualize or test | Low — behavior correct but opaque | Low — additive extraction | Very Low | Low | 1-2 weeks | Extract Class | Exhaustive transition tests |

### 2.3 Domain Layer
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Entities | Consultation with state methods and value objects | Consultation, SOAPNote, Draft, PatientSnapshot | Missing SOAPNote and Draft entities | Low — notes are plain objects | Low — additive | Very Low | Low | 1 week | Additive Refactoring | Domain unit tests |
| Value objects | ConsultationNotes, ConsultationDuration | SOAPNote, VitalsSnapshot, AppointmentSlot, TimerDuration, NoteVersion | Missing vitals, slot, timer, version VOs | Low | Low | Very Low | Low | 1 week | Additive Refactoring | VO equality tests |
| Enums | ConsultationState, ConsultationOutcomeType, PatientDecision, ConsultationWorkflowState | Same + WorkflowState, SaveStatus, NoteTab | Minor additions needed | Low | Low | Very Low | Low | 3 days | Additive Refactoring | Enum usage tests |
| State machines | ConsultationWorkflowState with VALID_TRANSITIONS | SessionWorkflow, DocumentationWorkflow, QueueWorkflow | Two UI state machines split into three explicit classes | Low — current design correct | Low | Very Low | Low | 1 week | Extract Class | Transition matrix tests |
| Policies | requiresCasePlanning, canStartConsultationFromState | CanStartConsultation, CanCompleteConsultation, RequiresCasePlanning as first-class objects | Policies are functions, not objects | Low | Low | Very Low | Low | 3 days | Extract Class | Policy rule tests |

### 2.4 Infrastructure Layer
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| API clients | doctorApi, consultationApi, global apiClient singleton | ConsultationApi, PatientApi, QueueApi, BillingApi, NotificationApi, AuditApi | Organized by consumer rather than capability | Medium — hard to extend for new modules | Medium — import reorganization | Very Low | Low | 1-2 weeks | Facade | Contract tests per adapter |
| Storage | Direct localStorage calls in context | DraftStorage interface with LocalStorageDraftStorage and future IndexedDBDraftStorage | Ad-hoc storage access scattered in context | Medium — crashes on quota exceeded unhandled | Low | Low | Low | 1 week | Adapter | Storage quota tests |
| Cache | React Query used directly | QueryClientProvider wrapper with QUERY_CONFIG policies | No centralized cache policy | Low — current behavior correct | Low | Very Low | Low | 1 week | Extract Configuration | Cache hit ratio tests |
| External adapters | None | AuthAdapter, WebSocketAdapter, VoiceDictationAdapter, AIServiceAdapter, ImagingAdapter | Missing external service abstractions | Medium — future capabilities blocked | Medium | Low | Medium | 2-3 weeks | Adapter | Adapter interface tests |
| Audit | ConsoleAuditService (development only) | Persistent AuditApi with event store | No persistent audit trail in production | High — compliance risk | Medium | Low | Medium | 2 weeks | Additive Refactoring | Audit event persistence tests |

### 2.5 Provider Architecture
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Primary provider | ConsultationContext (976 lines) | 7 focused providers | God object prevents testing, parallel development, and extension | Critical — all feature work touches this file | Critical — affects 15+ consumers | Medium — state changes must preserve exact UI | High | 4-6 weeks | Strangler Fig | Render count; behavioral parity |
| State ownership | One provider owns all state | Each provider owns one capability cluster | No isolation; every keystroke re-renders entire page | High — poor UX on low-end devices | High — requires render cascade elimination | Low | High | 4-6 weeks | Strangler Fig | React DevTools Profiler |
| Communication | Direct context consumption | Event bus + React Query shared read model | No cross-provider communication protocol | Medium — providers cannot evolve independently | Medium | Low | Medium | 2 weeks | Event Bus | Event handler tests |
| Boundary rules | No enforced boundaries | Direct import prohibition between providers | Circular dependencies possible | Medium — risk of tangled providers | Low | Low | Low | 1 week | Lint rules + code review | Dependency graph audit |

### 2.6 State Ownership
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Classification | Unclassified | Strict taxonomy: Server, Client, Form, UI, Session, Offline | No rules for where state lives | High — ambiguity leads to bugs | Medium | Medium | High | 2 weeks | Policy enforcement | State audit per category |
| Notes state | Triple-write: reducer + React Query cache + localStorage | Single source of truth in DocumentationProvider reducer; React Query for metadata only; localStorage for backup only | Ambiguous source of truth; reconciliation complexity | High — data corruption risk during concurrent editing | High | High | High | 3-4 weeks | Dual-write with read-through | Parallel run comparison; crash simulation |
| Server state | Mixed with client state in same reducer | React Query with explicit cache policies per data type | Stale data risk; cache invalidation ad-hoc | Medium | Medium | Low | Medium | 1 week | Extract Configuration | Stale data regression tests |
| Form state | Some in reducers, some in components | Always in component useState; committed on submit | Intermediate values pollute providers | Low — minor UX issues | Low | Very Low | Low | 3 days | Convention + review | Component state audit |
| Session state | Ad-hoc localStorage | DraftStorage adapter with explicit recovery semantics | No recovery contract; silent draft restoration | Medium — crash recovery edge cases | Low | Medium | Low | 1 week | Adapter | Draft restoration tests |

### 2.7 Workflow State Machines
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Domain state | ConsultationState enum with helper functions | ConsultationState preserved; formalized as domain enum | Already correct | None | None | None | None | None | None | None |
| UI workflow state | ConsultationWorkflowState with VALID_TRANSITIONS | Explicit SessionWorkflow and DocumentationWorkflow classes | Implicit in reducer; not introspectable | Low — maintenance difficulty | Low | Very Low | Low | 1-2 weeks | Extract Class | Exhaustive transition tests |
| Transition logic | Imperative in reducer | Declarative transition tables in state machine classes | Logic scattered across reducer cases | Low | Low | Very Low | Low | 1 week | Extract Class | Transition coverage report |

### 2.8 Data Loading
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Strategy | Two-tier parallel loading | Single parallel batch with explicit LoadingState per domain | Tier 2 waits for Tier 1 unnecessarily | Low — 200-400ms extra load time | Low | Very Low | Low | 3-4 days | Extract Method | Network waterfall measurement |
| Error handling | Soft-fail for consultation and vitals; hard-fail for appointment/patient | Structured ClinicalError with recovery action per failure type | Inconsistent error UX | Low — some failures silent | Low | Very Low | Low | 3 days | Additive Refactoring | Error scenario tests |

### 2.9 React Query
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Query keys | Ad-hoc strings and arrays | Centralized QUERY_CONFIG with factory functions | Inconsistent keys across hooks | Low | Low | Very Low | Low | 3 days | Extract Configuration | Cache key audit |
| Cache policies | Inline staleTime/gcTime per hook | Consistent policies per data type | No rationale for freshness requirements | Low | Low | Very Low | Low | 2 days | Extract Configuration | Stale data tests |
| Optimistic updates | Inline in useSaveConsultationDraft | OptimisticCache adapter with snapshot/rollback | Rollback logic duplicated | Low | Low | Very Low | Low | 2 days | Extract Class | Mutation rollback tests |

### 2.10 Autosave
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Implementation | Debounced useEffect in ConsultationContext | DraftService in DocumentationProvider with same debounce logic | Logic embedded in monolith | Low — auto-save works correctly | Low | Very Low | Low | 1 week | Extract Class | Debounce timing tests |
| Version safety | VERSION_CONFLICT detection in mutation error handler | NoteVersion value object with explicit conflict resolution | Reactive detection only | Low | Low | Very Low | Low | 2 days | Extract Class | Conflict simulation tests |
| Backup | Direct localStorage.setItem in context | DraftStorage adapter (localStorage now, IndexedDB future) | Quota exceeded not handled gracefully | Low — rare edge case | Low | Low | Low | 2 days | Adapter | Quota exceeded tests |

### 2.11 Queue Management
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Component | ConsultationQueuePanel with direct context access | QueuePanel consuming QueueContextProvider | Queue logic scattered in context | Medium — independent evolution blocked | Medium | Low | Medium | 2-3 weeks | Strangler Fig | Queue display snapshot tests |
| Filtering | useMemo in ConsultationContext | QueueFilter domain policy in QueueProvider | Filtering logic not reusable | Low | Low | Very Low | Low | 2 days | Extract Class | Filter unit tests |
| Polling | Fixed refetchInterval in useDoctorTodayAppointments | QueueService with configurable polling and exponential backoff | No backoff on errors | Low — minor during outages | Low | Very Low | Low | 2 days | Extract Class | Polling behavior tests |
| Switching | Mixed between QueuePanel and ConsultationContext | QueueContextProvider owns switching UX; delegates save to DraftService | Orchestration split across two layers | Medium — coordination complexity | Medium | Low | Medium | 1 week | Extract Method | Switching flow tests |

### 2.12 Patient Context
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Component | PatientInfoSidebar consuming ConsultationContext | PatientSidebar consuming PatientContextProvider | Patient data is also-ran in session context | Low — display works correctly | Medium — 8+ sections to migrate | Very Low | Medium | 2 weeks | Strangler Fig | Visual regression tests |
| Data | Mixed into ConsultationContext reducer | PatientContextProvider owns patient, vitals, allergies, conditions, history | No clear owner for patient data | Low | Medium | Very Low | Medium | 1 week | Extract Provider | Data fetching tests |
| History modal | Local state in PatientInfoSidebar | selectedHistoryId in provider; ConsultationModal component | Modal state not shareable | Low | Low | Very Low | Low | 2 days | Lift State | Modal interaction tests |

### 2.13 Clinical Documentation
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Tabs | Hardcoded in ConsultationWorkspaceOptimized | Extension slots in SOAPWorkspace with core tabs + plugin slots | No extensibility for AI, voice, templates | High — all future enhancements blocked | Medium | Medium | Medium | 3-4 weeks | Extract and Extend | Tab switching tests |
| Notes state | StructuredNotes interface in context | SOAPNote domain entity with validation | Plain object with no validation | Low | Low | Very Low | Low | 1 week | Extract Entity | Note validation tests |
| Editor | Plain text inputs | Shared NoteEditor component with extension hooks | No foundation for rich text or voice | Medium | Medium | Low | Medium | 2-3 weeks | Extract Component | Editor interaction tests |
| Outcome | Mixed into documentation state | Outcome in DocumentationProvider (later OutcomeContextProvider) | Outcome drives billing and surgical case creation | Medium — must preserve outcome lifecycle | Low | Medium | Low | 1 week | Extract Provider | Outcome transition tests |

### 2.14 Security
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Authentication | JWT with refresh flow | AuthAdapter wrapping existing JWT logic | Already functional | None | None | None | None | None | None | None |
| Authorization | Role check + doctor assignment validation | Same + permission-gated extension context | No permission model for extensions | Low — secure for current scope | Low | Very Low | Low | 1 week | Additive Refactoring | Authz test matrix |
| Input validation | Use case validation only | Shared Kernel schemas + runtime validation | No client-side schema validation | Low | Low | Very Low | Low | 3 days | Additive Refactoring | Schema validation tests |
| Audit | ConsoleAuditService | Persistent AuditApi with event store | No persistent audit in production | High — compliance risk | Medium | Low | Medium | 2 weeks | Additive Refactoring | Audit persistence tests |

### 2.15 Observability
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Logging | console.log at key transitions | Structured logging with correlation IDs | No production-grade logging | Medium — slow incident response | Medium | Very Low | Medium | 1 week | Decorator | Log output tests |
| Metrics | None | OpenTelemetry spans on use cases and state transitions | No performance visibility | Medium | Medium | Very Low | Medium | 1-2 weeks | Decorator | Span generation tests |
| Error tracking | Toast + console | ClinicalError codes with NotificationProvider routing | Unstructured errors | Low — poor UX | Low | Very Low | Low | 3 days | Additive Refactoring | Error scenario tests |

### 2.16 Error Handling
| Aspect | Current State | Target State | Gap | Business Impact | Technical Impact | Clinical Risk | Migration Complexity | Effort | Pattern | Validation |
|--------|--------------|--------------|-----|-----------------|------------------|---------------|---------------------|--------|---------|------------|
| Client errors | Soft-fail, toast notifications | Structured ClinicalError with recovery action | No typed error taxonomy | Low | Low | Very Low | Low | 3 days | Additive Refactoring | Error scenario tests |
| Version conflicts | Reactive detection after save fails | Proactive detection + merge UI (future) | Users lose work silently | Medium | Low | Medium | Low | 1 week | Additive Refactoring | Conflict simulation tests |
| Load failures | Full reload recovery | retry() action with partial retry | No graceful recovery | Low | Low | Very Low | Low | 2 days | Extract Method | Retry behavior tests |

### 2.17 Comparison Matrix
| Concern | Current Maturity | Target Maturity | Gap Severity | Migration Complexity | Clinical Risk |
|---------|------------------|-----------------|--------------|---------------------|---------------|
| Presentation Layer | 3 (Integrated) | 4 (Reusable) | High | High | Medium |
| Frontend Application Layer | 3 (Integrated) | 4 (Reusable) | High | Medium | Low |
| Domain Layer | 4 (Reusable) | 5 (Platform Ready) | Low | Low | Very Low |
| Infrastructure Layer | 3 (Integrated) | 4 (Reusable) | Medium | Low | Very Low |
| Provider Architecture | 2 (Functional) | 4 (Reusable) | Critical | High | Medium |
| State Ownership | 2 (Functional) | 4 (Reusable) | Critical | High | High |
| Workflow State Machines | 3 (Integrated) | 4 (Reusable) | Low | Low | Very Low |
| Data Loading | 3 (Integrated) | 4 (Reusable) | Low | Low | Very Low |
| React Query | 3 (Integrated) | 4 (Reusable) | Low | Low | Very Low |
| Autosave | 4 (Reusable) | 5 (Platform Ready) | Low | Low | Very Low |
| Queue Management | 3 (Integrated) | 4 (Reusable) | Medium | Medium | Low |
| Patient Context | 3 (Integrated) | 4 (Reusable) | Medium | Medium | Very Low |
| Clinical Documentation | 3 (Integrated) | 4 (Reusable) | Medium | Medium | Medium |
| Extension Architecture | 1 (Basic) | 4 (Reusable) | Critical | High | Low |
| Security | 3 (Integrated) | 4 (Reusable) | Low | Low | Very Low |
| Observability | 2 (Functional) | 4 (Reusable) | Medium | Medium | Very Low |
| Error Handling | 3 (Integrated) | 4 (Reusable) | Low | Low | Very Low |

## Section 3 — Capability Gap Analysis
| Capability | Current Maturity | Target Maturity | Classification | Required Improvements | Dependencies | Blocking Factors | Priority | Criticality | Order |
|------------|------------------|-----------------|----------------|----------------------|--------------|------------------|----------|-------------|-------|
| Authentication & Authorization | 3 | 3 | No Change Required | None | None | None | Low | High | Last |
| Doctor Assignment Validation | 3 | 3 | No Change Required | None | None | None | Low | High | Last |
| Consultation Session Management | 4 | 4 | Minor Enhancement | Extract SessionProvider; add InitializeSession use case | DocumentationProvider, QueueProvider | Provider extraction must precede | High | Critical | Phase 1 |
| Patient Profile Review | 3 | 4 | Moderate Refactoring | Extract PatientContextProvider; add VitalsSnapshot VO | SessionProvider | SessionProvider ready | Medium | High | Phase 2 |
| Consultation History Review | 3 | 4 | Moderate Refactoring | Extract to PatientContextProvider; add history DTO mapping | PatientContextProvider | Patient provider extraction | Medium | High | Phase 2 |
| Previous Consultation Reference | 2 | 3 | Minor Enhancement | Promote modal state to provider; add side-by-side comparison | PatientContextProvider | Patient provider extraction | Low | Medium | Phase 7 |
| Clinical Documentation | 3 | 4 | Major Refactoring | Extract DocumentationProvider; introduce SOAPNote entity; add extension slots | SessionProvider | SessionProvider ready | High | Critical | Phase 3 |
| Draft Management (Auto-Save) | 4 | 5 | Minor Enhancement | Extract DraftService; add DraftStorage interface | DocumentationProvider | DocumentationProvider extraction | Medium | High | Phase 3 |
| Draft Management (Manual Save) | 2 | 3 | Minor Enhancement | Keyboard shortcut; save confirmation dialog | DocumentationProvider | DocumentationProvider extraction | Low | Medium | Phase 7 |
| Draft Restoration | 3 | 4 | Moderate Refactoring | Extract RestoreDraft use case; add DraftStorage adapter | DocumentationProvider, DraftStorage | DraftStorage interface ready | Medium | High | Phase 3 |
| Version Conflict Recovery | 3 | 4 | Moderate Refactoring | Proactive conflict detection; merge UI (future) | DocumentationProvider | DocumentationProvider extraction | Medium | High | Phase 6 |
| Session Heartbeat | 2 | 3 | Minor Enhancement | Extract SessionService; add adaptive interval | TimerProvider | TimerProvider extraction | Low | Medium | Phase 1 |
| Timer & Session Duration | 2 | 3 | Minor Enhancement | Extract TimerProvider; add overtime warning | SessionProvider | SessionProvider extraction | Low | Medium | Phase 1 |
| Queue Management | 4 | 4 | Minor Enhancement | Extract QueueContextProvider; add QueueService | SessionProvider | SessionProvider extraction | Medium | Medium | Phase 4 |
| Patient Switching | 3 | 4 | Moderate Refactoring | Extract to QueueProvider; add switch history/undo (future) | QueueProvider, DraftService | QueueProvider extraction | Medium | Medium | Phase 4 |
| Outcome Management | 3 | 4 | Moderate Refactoring | Extract OutcomeContextProvider; add outcome templates (future) | DocumentationProvider | DocumentationProvider extraction | Medium | High | Phase 3 |
| Consultation Completion | 4 | 4 | Minor Enhancement | Extract CompleteConsultation use case refinements; add undo (future) | SessionProvider, DocumentationProvider | Both providers extracted | High | Critical | Phase 5 |
| Billing Creation | 3 | 4 | Minor Enhancement | Extract BillingProvider; add billing API adapter | SessionProvider | SessionProvider extraction | Medium | High | Phase 2 |
| Surgical Case Initiation | 3 | 4 | Minor Enhancement | Extract to OutcomeContextProvider; add preview before creation | OutcomeProvider | OutcomeProvider extraction | Medium | High | Phase 5 |
| Notification Dispatch | 3 | 4 | Moderate Refactoring | Extract NotificationProvider; add SMS (future); real-time push (future) | SessionProvider | SessionProvider extraction | Low | Medium | Phase 1 |
| Queue Progression & Auto-Routing | 4 | 4 | Minor Enhancement | Extract AdvanceQueue use case; add configurable routing rules | QueueProvider, SessionProvider | Both providers extracted | Medium | Medium | Phase 4 |
| Error Recovery (Load Failure) | 2 | 3 | Minor Enhancement | Add retry() action with partial retry; offline mode (future) | SessionProvider | SessionProvider extraction | Low | Medium | Phase 1 |
| Error Recovery (Version Conflict) | 3 | 4 | Moderate Refactoring | Add user notification; merge UI (future) | DocumentationProvider | DocumentationProvider extraction | Medium | High | Phase 6 |
| Audit & Compliance Logging | 3 | 4 | Major Refactoring | Replace ConsoleAuditService with persistent event store; add audit viewer | Infrastructure Layer | Event store infrastructure | Medium | High | Phase 8 |
| Legacy Data Migration | 2 | 3 | Minor Enhancement | Extract LegacyNotesAdapter; add batch migration job | DocumentationProvider | DocumentationProvider extraction | Low | Medium | Phase 8 |

## Section 4 – Dependency Impact Analysis
### 4.1 Provider Dependencies
| Provider | Consumers | Downstream Impact | Upstream Impact | Potential Regressions | Testing Scope |
|----------|-----------|-------------------|-----------------|----------------------|---------------|
| SessionProvider | Header, Sidebar, Workspace, Queue, Dialogs, Timer, Billing | All session state consumers break if API changes | React Query cache keys change | Stale appointment/patient data; incorrect workflow state | All components + 2 API routes + 2 use cases |
| DocumentationProvider | Workspace tabs, Header save button, Completion dialog | Notes editing breaks; auto-save fails; outcomes lost | Draft API responses change | Lost notes; incorrect outcomes; missing drafts | SOAP tabs + header + completion dialog + draft API |
| PatientContextProvider | Sidebar, Workspace, Completion dialog | Patient data missing; history unavailable | Patient API responses change | Missing vitals; incorrect allergies; history not loading | Sidebar + history modal + patient API |
| QueueContextProvider | Queue panel, Session routing | Queue display wrong; patient switching broken | Queue API responses change | Incorrect queue; failed patient switch | Queue panel + switching flow + queue API |
| TimerProvider | Header timer display | Timer stops or shows wrong time | Session state changes | Incorrect session duration; missing heartbeat | Header + heartbeat endpoint |
| BillingProvider | Completion dialog | Billing summary missing or incorrect | Billing API responses change | Incorrect billing display; completion blocked | Completion dialog + billing API |
| NotificationProvider | All components | Toasts missing; notifications lost | Event bus changes | Missing success/error feedback | All user-facing actions |

### 4.2 Component Dependencies
| Component | Current Provider | Target Provider | Impact |
|-----------|-----------------|----------------|--------|
| ConsultationSessionPageOptimized | ConsultationContext | SessionProvider + child providers | Low — shell becomes simpler |
| PatientInfoSidebar | ConsultationContext | PatientContextProvider | Low — prop interface unchanged |
| ConsultationSessionHeader | ConsultationContext | SessionProvider + DocumentationProvider + TimerProvider | Medium — props split across providers |
| ConsultationWorkspaceOptimized | ConsultationContext | DocumentationProvider | Low — mostly unchanged |
| ConsultationQueuePanel | ConsultationContext | QueueContextProvider | Low — prop interface preserved |
| StartConsultationDialog | ConsultationContext + doctorApi | SessionProvider + useStartConsultation | Medium — API call moves to hook |
| CompleteConsultationDialog | ConsultationContext + doctorApi + useAppointmentBilling | SessionProvider + BillingProvider + useCompleteConsultation | High — multiple provider integration |

### 4.3 API Client Dependencies
| API Client | Current Consumers | Target Consumers | Impact |
|-----------|------------------|------------------|--------|
| doctorApi | Context, dialogs, queue panel | DoctorApi adapter + useAuth | Low — wrapper maintains same methods |
| consultationApi | Context, hooks | ConsultationApi adapter | Low — same methods |
| apiClient | Context, vitals fetch, heartbeat | AuthAdapter + individual API adapters | Medium — singleton replaced |

### 4.4 React Query Dependencies
| Query Key | Current Usage | Target Usage | Impact |
|-----------|--------------|--------------|--------|
| ['consultation', appointmentId] | useConsultation hook + context | ConsultationApi + DocumentationProvider | Low — same cache entry |
| ['save-consultation-draft'] | useSaveConsultationDraft mutation | DraftService mutation | Low — same mutation |
| ['patient-consultations', patientId] | usePatientConsultationHistory | PatientApi + PatientContextProvider | Low — same cache entry |
| ['doctor', doctorId, 'appointments'] | useDoctorTodayAppointments | QueueApi + QueueContextProvider | Low — same cache entry |

### 4.5 Workflow State Dependencies
| State Machine | Current Owner | Target Owner | Impact |
|---------------|--------------|--------------|--------|
| ConsultationState (clinical) | Domain enum | Domain enum (unchanged) | None |
| ConsultationWorkflowState (UI) | ConsultationContext reducer | SessionWorkflow + DocumentationWorkflow classes | Medium — all workflow transitions must map to class methods |

## Section 5 – Migration Strategy
### 5.1 Phase Summaries
| Phase | Objective | Independently Deployable | Backward Compatible | Rollback Strategy |
|-------|-----------|------------------------|---------------------|-------------------|
| Phase 1: Architectural Foundations | Extract infrastructure adapters, storage interface, and shared kernel | Yes | Yes | Feature flag to use old/new path |
| Phase 2: Frontend Application Layer | Extract use cases and application services from context | Yes | Yes | Context shim delegates to use cases |
| Phase 3: Documentation Context | Extract DocumentationProvider and notes state | Yes | Yes | Context shim maintains old and new paths |
| Phase 4: Patient Context | Extract PatientContextProvider and patient state | Yes | Yes | Context shim delegates reads |
| Phase 5: Queue Context | Extract QueueContextProvider and queue state | Yes | Yes | Context shim delegates reads |
| Phase 6: Session Provider | Extract SessionProvider and remaining session state | Yes | Yes | Context shim is full fallback |
| Phase 7: Extension Framework | Implement extension registry and slots | Yes | Yes | Feature flag disables extensions |
| Phase 8: Performance & Observability | Optimize rendering, add logging, metrics, audit store | Yes | Yes | Feature flags for observability |

### 5.2 Key Migration Principles
1. No Big Bang — Every phase is a small, reversible change.
2. Dual-Write Period — New and old paths run in parallel; outputs compared before cutover.
3. Feature Flags — Every new capability is behind a feature flag.
4. Progressive Rollout — Canary deployment per provider; rollback if error rate increases.
5. Clinical Safety First — Auto-save, draft restoration, and completion workflows are never disrupted.

## Section 6 – Provider Migration Plan
### 6.1 Migration Order
1. DocumentationProvider — extracted first because it has the most isolated logic (notes, outcomes, auto-save)
2. PatientContextProvider — extracted second because it has few consumers (sidebar, history)
3. QueueContextProvider — extracted third because it has clear boundaries (queue panel, switching)
4. TimerProvider — extracted fourth because it is self-contained (timer + heartbeat)
5. BillingProvider — extracted fifth because it is only used in completion dialog
6. NotificationProvider — extracted sixth because it is cross-cutting but simple
7. SessionProvider — extracted last because it absorbs remaining state and orchestrates others

### 6.2 Backward Compatibility Strategy
During extraction, ConsultationContext remains as a compatibility shim. New providers are created alongside the existing context. Consumers are migrated incrementally: new consumers use new providers directly; existing consumers continue using ConsultationContext. When all consumers of a slice are migrated, that slice is removed from ConsultationContext.

### 6.3 Rollback Plan
If any phase causes clinical issues:
1. Disable feature flag for the new provider
2. All consumers fall back to ConsultationContext shim
3. No data loss because old path continues writing to same stores
4. Rollback verified in staging before production deployment

### 6.4 Completion Criteria
- All consumers of extracted provider pass behavioral parity tests
- React DevTools Profiler confirms render reduction targets met
- No regression in auto-save, draft restoration, or completion workflows
- Feature flag enables instant rollback

## Section 7 – State Migration Strategy
### 7.1 State Classification
| Category | Current Owner | Future Owner | Migration Method | Sync Requirements | Conflict Risks | Data Loss Risks | Validation | Rollback |
|----------|--------------|--------------|------------------|-------------------|----------------|-----------------|------------|----------|
| Appointment (server) | ConsultationContext reducer | SessionProvider via React Query | Extract provider; same React Query key | None | Low | Low | Appointment display tests | Context shim |
| Patient (server) | ConsultationContext reducer | PatientContextProvider via React Query | Extract provider; same React Query key | None | Low | Low | Patient display tests | Context shim |
| Vitals (server) | ConsultationContext reducer | PatientContextProvider via React Query | Extract provider; same React Query key | None | Low | Low | Vitals display tests | Context shim |
| Consultation (server) | ConsultationContext reducer | SessionProvider via React Query | Extract provider; same React Query key | None | Low | Low | Consultation display tests | Context shim |
| Notes (client) | ConsultationContext reducer + React Query cache + localStorage | DocumentationProvider reducer | Dual-write period; read-through to new source |新旧路径并行写入 | High — concurrent editing | High — notes are primary clinical artifact | Parallel run comparison; crash simulation | Context shim |
| Outcome (client) | ConsultationContext reducer | DocumentationProvider reducer | Extract with notes | None | Medium | Medium | Outcome transition tests | Context shim |
| Patient Decision (client) | ConsultationContext reducer | DocumentationProvider reducer | Extract with notes | None | Medium | Medium | Decision transition tests | Context shim |
| Workflow state (client) | ConsultationContext reducer | SessionProvider reducer | Extract state machine class | None | Low | Low | Workflow transition tests | Context shim |
| Queue (server) | ConsultationContext reducer + React Query | QueueContextProvider via React Query | Extract provider; same React Query key | None | Low | Low | Queue display tests | Context shim |
| Draft metadata (session) | localStorage + React Query cache | DraftStorage adapter + DocumentationProvider | Dual-write; read-through | Backup written to both | Low | Medium | Draft restoration tests | Context shim |
| Timer (client) | ConsultationContext reducer | TimerProvider reducer | Extract provider | None | Low | Low | Timer display tests | Context shim |
| Billing (server) | CompleteConsultationDialog hook | BillingProvider via React Query | Extract provider; same React Query key | None | Low | Low | Billing display tests | Context shim |
| UI state | ConsultationContext + components | Components (local state) | Lift to components | None | Low | Very Low | UI interaction tests | Context shim |
| Session heartbeat | ConsultationContext useEffect | TimerProvider useEffect | Extract provider | None | Low | Low | Heartbeat tests | Context shim |

### 7.2 Special Attention: Notes Migration
Notes are the highest-risk state because they exist in three places simultaneously. The migration strategy:
1. Week 1: Create DocumentationProvider with new reducer. Run old and new paths in parallel. Compare outputs after each keystroke batch (debounced).
2. Week 2: Enable new path for writes. Old path continues as backup. Compare draft saves.
3. Week 3: Enable new path for reads. Old path remains in background. Validate localStorage restoration.
4. Week 4: Remove old path from ConsultationContext. Retain shim for 1 sprint as fallback.

### 7.3 Special Attention: Drafts Migration
Draft restoration depends on localStorage timestamps vs server updatedAt. The DraftStorage adapter preserves the same key format and timestamp logic. Migration is a pure extraction with zero behavior change.

### 7.4 Special Attention: Workflow Migration
The workflow state machine transitions are preserved exactly. SessionWorkflow and DocumentationWorkflow classes implement the same VALID_TRANSITIONS logic currently in the reducer. Each transition is tested exhaustively before cutover.

### 7.5 Special Attention: Completion Migration
Completion is the highest-stakes workflow. The CompleteConsultation use case is extracted first and validated against the existing backend cascade. The context shim delegates to the new use case. Only after 1 sprint of successful production runs is the old path removed.

## Section 8 – Technical Risk Register
### 8.1 Risk Register
| ID | Description | Probability | Impact | Severity | Mitigation | Detection Strategy | Contingency Plan | Owner |
|----|-------------|-------------|--------|----------|------------|-------------------|------------------|-------|
| R001 | Data corruption during notes migration (triple-write to single-write) | Medium | High | High | Dual-write period with parallel comparison; feature flag for instant rollback | Automated comparison tests; manual spot-checks during canary | Disable feature flag; revert to old context path | Frontend Lead |
| R002 | Lost drafts during localStorage migration | Low | High | Medium | DraftStorage adapter preserves exact key format and timestamp logic; restoration tested in staging | Draft restoration test suite; staging validation | Restore from React Query cache (server draft); inform user to re-enter | Frontend Lead |
| R003 | Queue inconsistencies during provider extraction | Low | Medium | Medium | QueueContextProvider uses same React Query key and polling logic | Queue display regression tests; polling interval monitoring | Revert to ConsultationContext queue logic via shim | Frontend Lead |
| R004 | Workflow regression (session stuck in LOADING or ERROR) | Low | High | Medium | Exhaustive transition tests for SessionWorkflow; error recovery actions tested | Workflow state monitoring; error boundary tracking | Retry action in SessionProvider; fallback to context shim | Frontend Lead |
| R005 | Performance degradation during provider extraction | Medium | Medium | Medium | Render count measurement before/after; canary deployment with performance monitoring | React DevTools Profiler; Core Web Vitals | Revert provider that caused regression | Frontend Lead |
| R006 | Provider synchronization failures (event bus missed events) | Low | Medium | Low | Event bus implementation with subscription tracking; missed event detection | Event handler coverage reports | Direct React Query reads as fallback | Frontend Lead |
| R007 | Context divergence (old and new paths produce different state) | Medium | High | High | Dual-write validation layer that logs mismatches; automated divergence tests | Divergence test suite; production logging | Disable new path; investigate mismatch before retry | Frontend Lead |
| R008 | Plugin compatibility breakage during extension framework introduction | Low | Medium | Low | Plugin sandboxing with try-catch; plugin errors never crash core | Plugin error logs; core UI health checks | Disable failing plugin via feature flag | Platform Lead |
| R009 | Cache invalidation regression (stale data after completion) | Low | High | Medium | Completion flow tested with aggressive cache invalidation; query key audit | Cache hit/miss ratios; stale data detection | Manual cache invalidation fallback | Frontend Lead |
| R010 | Clinical data loss during state migration | Very Low | Very High | Medium | No migration modifies server-side data directly; all changes via existing APIs | Database audit logs; data integrity checks | Rollback to previous deployment; restore from database backup | Backend Lead |
| R011 | Patient switching failure during QueueProvider extraction | Low | Medium | Low | Switch flow tested with dirty/clean states; draft save preserved | Switching flow tests; error toast monitoring | Revert to context switching logic | Frontend Lead |
| R012 | Heartbeat failure during TimerProvider extraction | Low | Medium | Low | Heartbeat endpoint unchanged; TimerProvider uses same interval logic | Heartbeat success rate monitoring | Revert to context heartbeat logic | Frontend Lead |
| R013 | Completion side-effect failure (billing, surgical case, notifications) | Very Low | Very High | Medium | Backend unchanged during frontend migration; completion use case delegates to existing backend | Completion success rate; billing record verification | Revert to context completion logic; backend rollback if needed | Backend Lead |
| R014 | Legacy notes parsing failure during migration | Low | Medium | Low | LegacyNotesAdapter preserves exact regex logic; parsing tested against production data | Legacy parse test suite; parse failure logging | Fall back to fullText display; inform user | Frontend Lead |
| R015 | Feature flag configuration error disabling critical path | Low | High | Medium | Feature flags default to ON (old path); new path opt-in only | Feature flag audit; deployment checklist | Manual flag override; emergency deployment | DevOps |

## Section 9 – Testing Strategy
### 9.1 Test Types
| Test Type | Scope | Tools | Coverage Target | Automation |
|-----------|-------|-------|-----------------|------------|
| Unit tests | Domain entities, value objects, enums, state machines, policies, services | Jest + ts-jest | 90% line coverage | CI pipeline |
| Integration tests | Use cases, application services, provider orchestration | Jest + React Testing Library | 80% line coverage | CI pipeline |
| Workflow tests | State machine transitions, orchestration sequences | Jest + custom assertions | 100% transition coverage | CI pipeline |
| Clinical scenario tests | End-to-end clinical journeys (start, document, complete, switch) | Playwright | Critical paths only | Nightly regression |
| Regression tests | Existing functionality parity during migration | Playwright + snapshot testing | 100% critical UI | CI pipeline |
| Performance tests | Render counts, bundle size, load time | React DevTools Profiler + Lighthouse | No regression >5% | CI pipeline |
| Accessibility tests | WCAG compliance for all components | jest-axe + manual audit | WCAG 2.1 AA | CI pipeline |
| Contract tests | API adapter responses match backend contracts | Pact or custom contract tests | 100% endpoint coverage | CI pipeline |

### 9.2 Phase Test Requirements
| Phase | Required Tests | Acceptance Criteria | Exit Criteria |
|-------|----------------|---------------------|---------------|
| Phase 1: Foundations | Unit tests for adapters, storage, shared kernel; contract tests for API adapters | All adapters return identical responses to old clients | 90% unit coverage; 100% contract pass |
| Phase 2: Application Layer | Unit tests for use cases; integration tests for orchestration; behavioral parity tests vs context | All use cases produce identical side effects to current context | 80% integration coverage; 0 behavioral regressions |
| Phase 3: Documentation | Unit tests for SOAPNote, Draft, NoteVersion; integration tests for auto-save; parallel run comparison | Auto-save triggers within 3s; draft restoration works; version conflicts handled | 90% unit coverage; 0 draft losses in parallel run |
| Phase 4: Patient Context | Unit tests for PatientSnapshot, VitalsSnapshot; integration tests for history fetch; visual regression tests for sidebar | Patient data displays identically; history modal works | 90% unit coverage; 0 visual regressions |
| Phase 5: Queue Context | Unit tests for QueueFilter, NextPatientRouter; integration tests for switching flow; visual regression for queue panel | Queue polling maintains 30s interval; switching saves draft correctly | 90% unit coverage; 0 switching failures |
| Phase 6: Session Provider | Unit tests for SessionWorkflow; integration tests for start/resume/complete; render count tests | Workflow transitions match current behavior; render count reduced by 50% | 100% transition coverage; render target met |
| Phase 7: Extension Framework | Unit tests for ExtensionRegistry; integration tests for plugin lifecycle; plugin failure isolation tests | Plugins register/unregister without crashing core; slots render correctly | 90% registry coverage; 0 core crashes from plugins |
| Phase 8: Observability | Span generation tests; audit event persistence tests; log format tests | All use cases emit spans; audit events persist; errors are typed | 100% use case span coverage; audit integrity verified |

## Section 10 – Definition of Done
### 10.1 Per-Phase Definition of Done
| Phase | Technical Completion | Clinical Validation | Performance Validation | Documentation Updates | Architecture Compliance | Testing Requirements | Rollback Verification |
|-------|---------------------|--------------------|-----------------------|----------------------|-----------------------|---------------------|----------------------|
| Phase 1 | All adapters implemented; shared kernel types defined | None (infrastructure only) | Bundle size increase <5% | Adapter README; shared kernel docs | All layers respect dependency rules | Unit + contract tests pass | Feature flag disables new adapters |
| Phase 2 | All use cases extracted; application services implemented | Clinical scenario tests pass | No render regression | Use case docs; service docs | Use cases stateless; services owned by providers | Unit + integration + behavioral parity | Context shim delegates to old logic |
| Phase 3 | DocumentationProvider extracted; SOAPNote entity; DraftStorage | Draft save/restore tests pass; auto-save timing verified | Render count on notes change <3 components | DocumentationProvider docs; slot docs | Notes state single-write; localStorage backup only | Unit + integration + parallel run | Context shim provides old notes path |
| Phase 4 | PatientContextProvider extracted; VitalsSnapshot VO | Patient data display verified | No render regression on patient load | PatientContextProvider docs | Patient data owned by one provider | Unit + integration + visual regression | Context shim delegates patient reads |
| Phase 5 | QueueContextProvider extracted; QueueFilter policy | Queue polling; switching flow verified | Queue poll interval maintained at 30s | QueueContextProvider docs | Queue logic owned by one provider | Unit + integration + visual regression | Context shim delegates queue reads |
| Phase 6 | SessionProvider extracted; SessionWorkflow class | Start/resume/complete flows verified | Render count reduced 50%+ | SessionProvider docs | Session state owned by one provider | Unit + integration + 100% transition coverage | Context shim is full fallback |
| Phase 7 | ExtensionRegistry implemented; slots defined; 2 plugins integrated | Plugin failure isolation tested | Extension load time <200ms | Extension developer guide | Plugins cannot modify core state directly | Unit + integration + plugin failure tests | Feature flag disables all extensions |
| Phase 8 | OpenTelemetry spans; persistent audit store; structured logging | Audit event integrity verified | Span overhead <2% per request | Observability runbook | Observability is cross-cutting only | Span + audit + log format tests | Feature flags for each observability component |

## Section 11 – Architecture Decision Candidates
The following decisions should become Architecture Decision Records (ADRs). Detailed ADRs are produced in architecture/decisions/.

| ADR | Decision | Problem | Alternatives | Trade-offs | Consequences |
|-----|----------|---------|--------------|------------|---------------|
| ADR-001 | Adopt Frontend Clean Architecture with strict layer boundaries | Current layer boundaries are informal; domain logic leaks to presentation | Keep current informal structure; adopt feature-based slicing | Strict layering adds boilerplate vs faster feature development | Domain logic stays pure; UI changes never break business rules |
| ADR-002 | Replace monolithic ConsultationContext with 7 focused providers | 976-line context causes render cascades and blocks parallel development | Keep monolith with memoization fixes; split into 3 providers | More providers = more composition vs simpler provider graph | Render cascades eliminated; teams own independent providers |
| ADR-003 | Enforce strict state ownership taxonomy | Triple-write notes pattern creates ambiguity and data corruption risk | Keep triple-write with better reconciliation; single-write with server round-trip | Single-write eliminates ambiguity vs requires refetch after every save | Clear ownership prevents future inconsistencies; localStorage is backup only |
| ADR-004 | Make workflow state machines explicit domain objects | State transitions are hidden in reducer; impossible to visualize or exhaustively test | Keep implicit transitions in reducer; use state chart library | Explicit classes add code vs hidden logic is brittle | Every transition is testable; state machine is introspectable |
| ADR-005 | Implement extension registry with capability slots | Hardcoded tabs block all future capabilities (AI, voice, imaging) | Keep hardcoded tabs; use render props; use compound component pattern | Plugin registry adds complexity vs modification of core code | New capabilities integrate without touching core; plugin failures isolated |
