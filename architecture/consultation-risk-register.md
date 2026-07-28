# Consultation Module — Risk Register
## 1. Overview
This risk register identifies technical and clinical risks associated with modernizing the Consultation Module. Each risk is assessed for probability, impact, severity, and includes mitigation, detection, contingency, and ownership.
## 2. Risk Assessment Scale
### Probability
- **Very Low**: <10% chance of occurrence
- **Low**: 10-30% chance
- **Medium**: 30-60% chance
- **High**: 60-90% chance
- **Very High**: >90% chance
### Impact
- **Very Low**: No user-facing effect; easy to fix
- **Low**: Minor UI issue; quick workaround available
- **Medium**: Feature degraded; workaround requires effort
- **High**: Feature unavailable; data at risk
- **Very High**: Clinical safety incident; regulatory impact
### Severity = Probability × Impact
- **Low**: Acceptable; monitor
- **Medium**: Plan mitigation before proceeding
- **High**: Block migration until mitigated
- **Critical**: Immediate action required; migration blocked
## 3. Risk Register
### R001: Data Corruption During Notes Migration
- **Description**: Migration from triple-write notes (reducer + React Query + localStorage) to single-source-of-truth in DocumentationProvider may lose data if dual-write period has undetected divergence.
- **Probability**: Medium
- **Impact**: High
- **Severity**: High
- **Mitigation:
  - Dual-write period with automated comparison after each save
  - Feature flag enables instant rollback to old path
  - Parallel run in staging with production data snapshot
  - Data integrity checksums on draft payload
- **Detection Strategy**:
  - Automated divergence tests comparing old vs new path outputs
  - Production logging of write failures and state mismatches
  - Manual spot-checks during canary deployment
- **Contingency Plan**:
  - Disable feature flag immediately
  - Revert to ConsultationContext shim
  - No data loss because old path continues writing to same stores
  - Investigate divergence in staging before retry
- **Owner**: Frontend Lead
### R002: Lost Drafts During localStorage Migration
- **Description**: Introduction of DraftStorage adapter may lose existing drafts if key format or timestamp logic changes.
- **Probability**: Low
- **Impact**: High
- **Severity**: Medium
- **Mitigation:
  - DraftStorage adapter preserves exact same key format: `consultation-draft-${appointmentId}`
  - Timestamp comparison logic preserved exactly
  - Restoration tested against production localStorage snapshot
  - Graceful fallback: if localStorage fails, React Query cache retains last server-confirmed draft
- **Detection Strategy**:
  - Draft restoration test suite with 100+ production data samples
  - Staging validation with real localStorage data
  - Quota-exceeded error handling tests
- **Contingency Plan**:
  - Restore from React Query cache (server draft)
  - Inform user to re-enter unsaved notes
  - Log localStorage failure for investigation
- **Owner**: Frontend Lead
### R003: Queue Inconsistencies During Provider Extraction
- **Description**: Extracting QueueContextProvider may cause queue polling or filtering to drift from current behavior.
- **Probability**: Low
- **Impact**: Medium
- **Severity**: Medium
- **Mitigation:
  - QueueContextProvider uses identical React Query key and polling interval
  - QueueFilter policy preserves exact current filtering logic
  - Queue display snapshot tests against current UI
- **Detection Strategy**:
  - Visual regression tests for queue panel
  - Polling interval monitoring in production
  - Queue count discrepancy alerts
- **Contingency Plan**:
  - Revert to ConsultationContext queue logic via shim
  - No data loss because queue is server-fetched
- **Owner**: Frontend Lead
### R004: Workflow Regression (Session Stuck in LOADING or ERROR)
- **Description**: Extracting SessionWorkflow state machine may introduce invalid transitions or missing states.
- **Probability**: Low
- **Impact**: High
- **Severity**: Medium
- **Mitigation:
  - Exhaustive transition tests covering all state × action combinations
  - SessionWorkflow class validated against current VALID_TRANSITIONS map
  - Error recovery action (retry) tested for each terminal error state
  - Feature flag enables instant fallback to context reducer
- **Detection Strategy**:
  - Workflow state coverage report (100% required)
  - Error boundary tracking in production
  - Session stuck duration monitoring (>30s in LOADING = alert)
- **Contingency Plan**:
  - Execute retry() action which triggers window.location.reload()
  - Fallback to ConsultationWorkflowState reducer in context shim
  - Rollback provider extraction via feature flag
- **Owner**: Frontend Lead
### R005: Performance Degradation During Provider Extraction
- **Description**: Additional provider nesting and event bus subscriptions may increase render time or bundle size.
- **Probability**: Medium
- **Impact**: Medium
- **Severity**: Medium
- **Mitigation:
  - Render count measurement in CI for every PR touching providers
  - Bundle size budget enforced per phase (<5% increase allowed)
  - React DevTools Profiler audits before and after each provider extraction
  - Canary deployment with Core Web Vitals monitoring
- **Detection Strategy**:
  - CI render count regression tests
  - Lighthouse CI for performance budgets
  - Real User Monitoring (RUM) for session page load time
- **Contingency Plan**:
  - Revert provider that caused regression
  - Optimize context value memoization
  - Reduce lazy-loaded component count
- **Owner**: Frontend Lead
### R006: Provider Synchronization Failures
- **Description**: Event bus may drop events or subscriptions may not fire during cross-provider communication.
- **Probability**: Low
- **Impact**: Medium
- **Severity**: Low
- **Mitigation:
  - Event bus implementation with subscription tracking and error boundaries
  - Missed event detection via event counter per subscription
  - React Query as fallback shared read model for critical data
  - Comprehensive event handler coverage tests
- **Detection Strategy**:
  - Event handler coverage report in CI
  - Production event drop rate monitoring
  - Subscription leak detection
- **Contingency Plan**:
  - Direct React Query reads as fallback for missed events
  - Subscription re-sync on provider mount
  - Event bus implementation review and fix
- **Owner**: Frontend Lead
### R007: Context Divergence (Old vs New Path)
- **Description**: During dual-write period, old and new paths may produce different state due to timing or logic differences.
- **Probability**: Medium
- **Impact**: High
- **Severity**: High
- **Mitigation:
  - Dual-write validation layer that logs every divergence
  - Automated divergence tests run on every build
  - Feature flag ensures new path is opt-in only
  - Staging environment runs both paths with comparison for 1 sprint before cutover
- **Detection Strategy**:
  - Divergence test suite (must pass 100%)
  - Production divergence logs reviewed daily during canary
  - Automated alert on divergence rate >0.1%
- **Contingency Plan**:
  - Disable feature flag immediately
  - Investigate divergence in isolated staging environment
  - Fix divergence before retrying cutover
  - No data loss because old path remains source of truth
- **Owner**: Frontend Lead
### R008: Plugin Compatibility Breakage
- **Description**: Extension framework plugins may crash core UI or leak memory.
- **Probability**: Low
- **Impact**: Medium
- **Severity**: Low
- **Mitigation:
  - Plugin sandboxing with try-catch around all plugin event handlers
  - Plugin lifecycle management (initialize, activate, deactivate, cleanup)
  - Permission-gated ExtensionContext prevents unauthorized state access
  - Dependency validation at registration time
- **Detection Strategy**:
  - Plugin error logs monitored in production
  - Core UI health checks (heartbeat) run independently of plugins
  - Memory leak detection for plugin lifecycle leaks
- **Contingency Plan**:
  - Disable failing plugin via feature flag
  - Plugin deactivation triggers cleanup of all subscriptions, intervals, WebSocket connections
  - Core UI continues without plugin
- **Owner**: Platform Lead
### R009: Cache Invalidation Regression
- **Description**: Changing React Query keys or cache policies may cause stale data after completion, start, or switch.
- **Probability**: Low
- **Impact**: High
- **Severity**: Medium
- **Mitigation:
  - Completion flow tested with aggressive cache invalidation
  - Query key audit before and after migration
  - Stale data detection in production via data freshness timestamps
  - Cache invalidation logic preserved exactly from current implementation
- **Detection Strategy**:
  - Cache hit/miss ratio monitoring
  - Stale data detection tests in CI
  - Production data freshness alerts
- **Contingency Plan**:
  - Manual cache invalidation fallback in SessionProvider
  - Revert to old query keys via feature flag
  - Emergency queryClient.invalidateQueries() as bridge fix
- **Owner**: Frontend Lead
### R010: Clinical Data Loss During State Migration
- **Description**: State migration may inadvertently delete or corrupt clinical data.
- **Probability**: Very Low
- **Impact**: Very High
- **Severity**: Medium
- **Mitigation:
  - No migration modifies server-side data directly; all changes via existing APIs
  - Database backup before each production deployment
  - Data integrity checksums on consultation notes before/after migration
  - Migration runs only on client state; server state untouched
- **Detection Strategy**:
  - Database audit log review
  - Clinical data integrity checks post-migration
  - Manual verification of consultation records in staging
- **Contingency Plan**:
  - Rollback to previous deployment
  - Restore from database backup if needed
  - Incident response per clinical data compromise policy
- **Owner**: Backend Lead
### R011: Patient Switching Failure During QueueProvider Extraction
- **Description**: Patient switching may fail to save draft or navigate correctly.
- **Probability**: Low
- **Impact**: Medium
- **Severity**: Low
- **Mitigation:
  - Switching flow tested with dirty and clean states
  - Draft save before navigation preserved exactly
  - Save failure handling (log error, navigate anyway) preserved
- **Detection Strategy**:
  - Switching flow tests in CI
  - Error toast monitoring in production
  - Draft save success rate monitoring
- **Contingency Plan**:
  - Revert to context switching logic via shim
  - No data loss because draft save attempted via both paths
- **Owner**: Frontend Lead
### R012: Heartbeat Failure During TimerProvider Extraction
- **Description**: Session heartbeat may stop during TimerProvider extraction.
- **Probability**: Low
- **Impact**: Medium
- **Severity**: Low
- **Mitigation:
  - Heartbeat endpoint unchanged
  - TimerProvider uses identical 30-second interval logic
  - Heartbeat success rate monitored in production
- **Detection Strategy**:
  - Heartbeat success rate monitoring
  - Session timeout alerts from backend
  - Backend abandoned session cleanup monitoring
- **Contingency Plan**:
  - Revert to context heartbeat logic via shim
  - No clinical impact because heartbeat is fire-and-forget infrastructure
- **Owner**: Frontend Lead
### R013: Completion Side-Effect Failure
- **Description**: Completion workflow may fail to create billing, surgical case, or notifications.
- **Probability**: Very Low
- **Impact**: Very High
- **Severity**: Medium
- **Mitigation:
  - Backend unchanged during frontend migration
  - CompleteConsultation use case delegates to existing backend use case
  - Completion flow tested end-to-end in staging with production-like data
  - Billing creation verification in staging
- **Detection Strategy**:
  - Completion success rate monitoring
  - Billing record creation verification
  - Surgical case creation verification
  - Notification delivery monitoring
- **Contingency Plan**:
  - Revert to context completion logic via shim
  - Backend rollback if backend changes are ever introduced
  - Manual billing/surgical case creation if automated creation fails
- **Owner**: Backend Lead
### R014: Legacy Notes Parsing Failure
- **Description**: LegacyNotesAdapter may fail to parse legacy full-text notes correctly.
- **Probability**: Low
- **Impact**: Medium
- **Severity**: Low
- **Mitigation:
  - LegacyNotesAdapter preserves exact regex logic from current implementation
  - Parsing tested against full production dataset
  - Graceful fallback: display fullText if structured parsing fails
- **Detection Strategy**:
  - Legacy parse test suite with production data samples
  - Parse failure rate monitoring
  - User feedback on missing notes content
- **Contingency Plan**:
  - Fall back to fullText display
  - Inform user that notes are in legacy format
  - Fix adapter regex and redeploy
- **Owner**: Frontend Lead
### R015: Feature Flag Configuration Error
- **Description**: Incorrect feature flag configuration may disable critical paths or enable unstable ones.
- **Probability**: Low
- **Impact**: High
- **Severity**: Medium
- **Mitigation:
  - Feature flags default to ON (old path); new path is opt-in only
  - Feature flag validation in CI (must have explicit default)
  - Pre-deployment checklist includes flag verification
  - Emergency flag override process documented
- **Detection Strategy**:
  - Feature flag audit in CI
  - Production flag state monitoring
  - Deployment checklist sign-off
- **Contingency Plan**:
  - Emergency flag override by DevOps
  - Hotfix deployment to correct flag state
  - Rollback to previous deployment if needed
- **Owner**: DevOps
## 4. Risk Heat Map
```
Impact
Very High │ R010          │
High      │ R001    R007  │ R009
Medium    │ R003 R005 R006│ R008 R013
Low       │ R002 R004 R011│ R012 R014 R015
          └──────────────┴──────────────
           Very Low  Low  Medium  High  Probability
```
## 5. Risk Mitigation Timeline
| Phase | Primary Risks Addressed | New Risks Introduced |
|-------|------------------------|----------------------|
| Phase 1 | R009 (cache config), R015 (flags) | None |
| Phase 2 | R007 (divergence), R013 (completion) | R006 (event bus) |
| Phase 3 | R001 (notes corruption), R002 (draft loss), R014 (legacy parsing) | R005 (performance) |
| Phase 4 | R003 (queue), R011 (switching) | None |
| Phase 5 | R011 (switching), R012 (heartbeat) | None |
| Phase 6 | R004 (workflow), R005 (performance), R006 (sync) | R007 (divergence) |
| Phase 7 | R008 (plugins) | None |
| Phase 8 | R009 (observability gaps) | None |
