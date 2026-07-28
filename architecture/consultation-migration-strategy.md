# Consultation Module — Migration Strategy
## 1. Overview
This document defines the detailed migration strategy for transforming the Consultation Module from its current monolithic ConsultationContext architecture to the target bounded-context, provider-based architecture. The strategy prioritizes clinical safety, incremental delivery, backward compatibility, and low deployment risk.
## 2. Core Strategy: Strangler Fig with Dual-Write
The migration uses the Strangler Fig pattern: new providers are created alongside the existing ConsultationContext. Consumers are gradually migrated from the old context to new providers. When all consumers of a slice are migrated, that slice is removed from ConsultationContext. A dual-write period with automated comparison ensures zero data loss.
## 3. Provider Migration Strategy
### 3.1 Migration Order and Rationale
| Order | Provider | Rationale |
|-------|----------|-----------|
| 1 | DocumentationProvider | Most isolated logic (notes, outcomes, auto-save); fewest cross-provider dependencies |
| 2 | PatientContextProvider | Few consumers (sidebar, history modal); clear data boundaries |
| 3 | QueueContextProvider | Clear UI boundary (queue panel); self-contained polling logic |
| 4 | TimerProvider | Self-contained (timer + heartbeat); minimal state |
| 5 | BillingProvider | Only used in completion dialog; low risk |
| 6 | NotificationProvider | Cross-cutting but simple; toast-based feedback |
| 7 | SessionProvider | Absorbs remaining state; orchestrates others; extracted last to minimize coupling |
### 3.2 Extraction Pattern
For each provider, follow this 4-week cycle:
**Week 1: Scaffold**
- Create provider directory structure
- Create provider with initial state shape matching current context slice
- Write unit tests for initial state and actions
**Week 2: Logic Migration**
- Move reducer logic from ConsultationContext to provider
- Move side effects (useEffect) from context to provider
- Write integration tests comparing old vs new behavior
**Week 3: Consumer Migration**
- Migrate 1-2 consumers to new provider
- Run parallel comparison in staging
- Fix any divergence
**Week 4: Cutover**
- Migrate remaining consumers
- Enable feature flag for new provider
- Run canary deployment (10% → 50% → 100%)
- Monitor for 1 sprint; remove old slice from ConsultationContext
### 3.3 Backward Compatibility Shim
ConsultationContext remains as a delegating shim during extraction:
```tsx
function ConsultationContext({ children }) {
  // Old path preserved
  const [legacyState, legacyDispatch] = useReducer(legacyReducer, legacyInitial);
  
  // New providers created by children
  const session = useSession();
  const documentation = useDocumentation();
  const patient = usePatientContext();
  const queue = useQueue();
  const timer = useTimer();
  const billing = useBilling();
  const notifications = useNotifications();
  
  // Shim merges new values into legacy shape for unconsumed consumers
  const shimValue = useMemo(() => ({
    ...legacyState,
    appointment: session?.appointment ?? legacyState.appointment,
    patient: patient?.patient ?? legacyState.patient,
    consultation: session?.consultation ?? legacyState.consultation,
    notes: documentation?.notes ?? legacyState.notes,
    outcomeType: documentation?.outcomeType ?? legacyState.outcomeType,
    patientDecision: documentation?.patientDecision ?? legacyState.patientDecision,
    waitingQueue: queue?.waitingQueue ?? legacyState.waitingQueue,
    workflow: session?.workflowState ?? legacyState.workflow,
    // ...
  }), [legacyState, session, documentation, patient, queue]);
  
  return (
    <ConsultationContext.Provider value={shimValue}>
      {children}
    </ConsultationContext.Provider>
  );
}
```
### 3.4 Provider Communication
Cross-provider communication uses two mechanisms:
1. **Event Bus (Shared Kernel)**: For reactive cross-cutting concerns (session started → start timer, notes updated → update suggestions)
2. **React Query Shared Read Model**: For server-derived data accessed by multiple providers (consultation, patient, queue)
Providers must NOT import each other directly. All cross-provider communication goes through the event bus or React Query cache.
## 4. State Migration Strategy
### 4.1 State Classification and Migration Rules
| State Category | Current Location | Target Location | Migration Rule |
|---------------|------------------|-----------------|----------------|
| Server State | ConsultationContext reducer | React Query cache via provider | Move React Query keys to provider; invalidate on mutation |
| Client State | ConsultationContext reducer | Provider reducer | Extract reducer logic; preserve action types |
| Form State | Component useState | Component useState | No change; document convention |
| UI State | ConsultationContext + components | Component useState | Lift to components; remove from context |
| Session State | localStorage (ad-hoc) | DraftStorage adapter | Wrap localStorage calls; preserve key format |
### 4.2 Notes State Migration (Highest Risk)
Notes exist in three places: reducer (working copy), React Query cache (optimistic update), localStorage (crash recovery). The target is: reducer = single source of truth; React Query = draft metadata only; localStorage = backup only.
**Migration Steps:**
1. Create DocumentationProvider with new notes reducer
2. Run dual-write: old path writes to old reducer; new path writes to new reducer
3. After each debounced save, compare old and new reducer state
4. If divergence: log diff; investigate in staging
5. After 1 sprint of zero divergence: enable new path for reads
6. Old path continues as background writer for 1 sprint
7. Remove old path from ConsultationContext
**Validation:**
- Parallel run comparison tests (automated)
- Draft restoration tests (localStorage timestamp vs server updatedAt)
- Version conflict simulation tests
- Crash recovery tests (browser reload with unsaved notes)
### 4.3 Draft Metadata Migration
Draft metadata (version, lastSavedAt, saveStatus) currently lives in React Query cache via optimistic updates. Target: lives in DocumentationProvider state; React Query cache stores only draft metadata for cross-provider sharing.
**Migration Steps:**
1. Create Draft domain entity with version, savedAt, status, conflictCount
2. Move draft metadata from React Query cache to DocumentationProvider
3. Preserve optimistic update behavior via DraftService
4. Update any cross-provider reads to use DocumentationProvider instead of React Query
### 4.4 Workflow State Migration
The ConsultationWorkflowState enum and VALID_TRANSITIONS map are extracted into explicit SessionWorkflow and DocumentationWorkflow classes.
**Migration Steps:**
1. Create SessionWorkflow class with states: IDLE, LOADING, READY, ACTIVE, COMPLETING, TRANSITIONING, ERROR
2. Implement transition methods: load(), start(), complete(), reset(), retry()
3. Write exhaustive transition tests (every state × every action)
4. Replace reducer workflow logic with SessionWorkflow method calls
5. Keep ConsultationWorkflowState enum as canonical source during transition
6. Remove enum after all consumers use classes
## 5. Workflow Migration Strategy
### 5.1 Session Workflow Migration
Current: reducer handles workflow transitions imperatively.
Target: SessionWorkflow class with declarative transition table.
**Steps:**
1. Extract SessionWorkflow class with same VALID_TRANSITIONS logic
2. Add transition validation to each method
3. Replace reducer SET_WORKFLOW_STATE with SessionWorkflow.transition()
4. Add workflow state to React DevTools display for debugging
### 5.2 Documentation Workflow Migration
Current: notes dirty state and save status are ad-hoc in reducer.
Target: DocumentationWorkflow class with explicit save lifecycle states.
**Steps:**
1. Create DocumentationWorkflow with states: IDLE, EDITING, SAVING, SAVED, ERROR, CONFLICT
2. Implement save lifecycle methods
3. Replace ad-hoc draftStatus in reducer with DocumentationWorkflow
### 5.3 Completion Cascade Migration
Current: CompleteConsultationUseCase handles 12 backend steps in one method.
Target: Same orchestration but extracted to use case with explicit sub-step boundaries.
**Steps:**
1. Extract CompleteConsultation use case from ConsultationContext
2. Break into sub-steps: validate, finalize, update appointment, create billing, create surgical case, send notifications, update queue, audit
3. Each sub-step has explicit error handling and rollback
4. Use case remains in Application Layer; backend delegation unchanged
5. SessionProvider calls use case on complete action
### 5.4 Queue Progression Migration
Current: Queue progression logic is in ConsultationContext.completeConsultation().
Target: AdvanceQueue use case in Application Layer; QueueProvider owns queue state.
**Steps:**
1. Extract AdvanceQueue use case
2. Move queue filtering and next-patient selection to QueueProvider
3. SessionProvider emits SESSION_COMPLETED event
4. QueueProvider listens for event and calls AdvanceQueue
5. AdvanceQueue returns next patient or null
6. SessionProvider handles routing
## 6. Data Loading Migration Strategy
### 6.1 Current Loading Flow
```
loadAppointment(appointmentId)
  → SET_LOADING(true)
  → SET_WORKFLOW_STATE(LOADING)
  → Tier 1: Promise.all([getAppointment, getDoctor, getConsultation])
  → Tier 2: Promise.all([getPatient, getVitals])
  → SET_DATA({ appointment, patient, vitals, doctorId })
  → SET_CONSULTATION(consultation)
  → Restore notes, outcome, patientDecision
  → Check localStorage draft
  → Determine workflow state
  → SET_LOADING(false)
```
### 6.2 Target Loading Flow
```
InitializeSession use case
  → SessionProvider: SET_WORKFLOW_STATE(LOADING)
  → QueryClient prefetch: appointment, doctor, consultation (parallel)
  → QueryClient prefetch: patient, vitals (parallel, enabled by appointment)
  → SessionProvider: SET_DATA
  → DocumentationProvider: restore notes, outcome, patientDecision
  → DraftStorage.restoreDraft()
  → SessionProvider: determine workflow state
  → SessionProvider: SET_WORKFLOW_STATE(READY/ACTIVE)
```
### 6.3 Migration Steps
1. Create InitializeSession use case with same parallel loading logic
2. Move loading orchestration from ConsultationContext to InitializeSession
3. SessionProvider owns workflow state during loading
4. DocumentationProvider owns notes restoration
5. DraftStorage adapter handles localStorage restoration
## 7. React Query Migration Strategy
### 7.1 Query Key Standardization
Current: ad-hoc keys like `['consultation', appointmentId]`, `['doctor', doctorId, 'appointments']`.
Target: QUERY_CONFIG with factory functions: `consultationKey(id)`, `patientKey(id)`, `queueKey(doctorId)`.
**Steps:**
1. Create QUERY_CONFIG with all query key factories
2. Migrate hooks one by one to use QUERY_CONFIG
3. Update all invalidateQueries calls to use QUERY_CONFIG keys
4. Add CI lint rule to prevent ad-hoc query keys
### 7.2 Cache Policy Standardization
Current: inline staleTime/gcTime per hook.
Target: explicit policies per data type with rationale.
| Data Type | Policy | Rationale |
|-----------|--------|-----------|
| Appointment | stale-while-revalidate, 5min stale | Frequently updated by other users |
| Patient | cache-first, 15min stale | Changes rarely during consultation |
| Vitals | cache-first, 10min stale | Read-only during session |
| Consultation | network-only, staleTime 0 | Critical accuracy; frequently mutated |
| Consultation History | cache-first, 5min stale | Infrequent changes |
| Queue | background polling, 30s interval, offlineFirst | Real-time operational view |
| Billing | cache-first, 5min stale | Loaded once on completion |
## 8. Backend Contract Stability
All backend contracts (API routes, use cases, repositories) remain unchanged during frontend modernization. The migration is purely client-side. This ensures:
- No database migration required
- No API versioning needed
- No downstream module changes required
- Backend rollback independent of frontend
## 9. Rollback Matrix
| Phase | Rollback Trigger | Rollback Action | Rollback Time |
|-------|------------------|-----------------|---------------|
| Phase 1 | Adapter response mismatch | Remove adapter; revert to old client | <5 min |
| Phase 2 | Use case behavioral divergence | Context delegates to old inline logic | <10 min |
| Phase 3 | Notes corruption detected | Disable feature flag; context provides old path | <5 min |
| Phase 4 | Patient data missing | Disable feature flag; context provides old path | <5 min |
| Phase 5 | Queue display broken | Disable feature flag; context provides old path | <5 min |
| Phase 6 | Workflow stuck | Disable feature flag; context shim active | <5 min |
| Phase 7 | Plugin crashes core | Disable feature flag; no plugins loaded | <2 min |
| Phase 8 | Observability overhead | Disable feature flag individually per component | <2 min |
## 10. Validation Gates
Before proceeding to the next phase, the following gates must be passed:
1. **Unit Test Gate**: All new unit tests pass; coverage target met (90% for domain/infrastructure, 80% for application)
2. **Integration Test Gate**: All integration tests pass; behavioral parity verified
3. **Visual Regression Gate**: No visual differences detected in critical paths (session page, sidebar, queue, completion dialog)
4. **Performance Gate**: Render count target met; no bundle size regression >5%
5. **Clinical Review Gate**: Clinical team confirms no workflow disruption in staging
6. **Canary Gate**: 24-hour canary with error rate <0.1% and no clinical incident reports
