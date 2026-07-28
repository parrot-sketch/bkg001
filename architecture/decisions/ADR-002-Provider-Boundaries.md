# ADR-002: Replace Monolithic ConsultationContext with Seven Focused Providers
## Status
Proposed
## Context
ConsultationContext is a 976-line React Context backed by useReducer. It owns:
- Appointment, patient, vitals, consultation data
- Notes, outcomeType, patientDecision
- Workflow state machine
- Auto-save debounce logic
- Heartbeat interval
- Queue filtering logic
- Loading, saving, dialog flags
- LocalStorage draft backup
- React Query cache invalidation
Every component that consumes any part of this state re-renders on every action. During active note editing, 6+ components re-render on every keystroke. The context is a merge conflict hotspot and is untestable as a unit.
## Decision
Replace ConsultationContext with seven focused providers:
1. **SessionProvider**: appointment, patient, consultation, doctorId, workflowState, loadingState, error
2. **DocumentationProvider**: notes, outcomeType, patientDecision, draftStatus, dirtyFields, version, activeTab
3. **PatientContextProvider**: patient, vitals, allergies, conditions, consultationHistory, selectedHistoryId
4. **QueueContextProvider**: todayAppointments, waitingQueue, isCollapsed, switchingState, selectedForSwitch
5. **TimerProvider**: elapsedSeconds, remainingSeconds, isOverdue, lastHeartbeat, heartbeatStatus
6. **BillingProvider**: billingSummary, paymentStatus, doctorFee, isLoading
7. **NotificationProvider**: toastQueue, inAppNotifications, lastNotification
Each provider has a single reason to change. Cross-provider communication happens through Shared Kernel events or React Query cache as shared read model. Providers must not import each other directly.
## Alternatives Considered
### Alternative 1: Keep Monolith with Memoization Fixes
Use useMemo with deep equality checks; split context into multiple contexts but keep single file.
**Why rejected**: Does not solve merge conflict problem. 976-line file remains difficult to navigate. Provider boundaries remain unclear.
### Alternative 2: Split into 3 Providers
SessionProvider, DocumentationProvider, and EverythingElseProvider.
**Why rejected**: EverythingElseProvider would still be a 300-line monolith containing patient, queue, timer, billing, and notifications. Insufficient decomposition.
### Alternative 3: Global State Library (Redux, Zustand)
Replace Context with Redux or Zustand for better performance.
**Why rejected**: Adds external dependency. Does not solve the architectural problem of unclear ownership. React Context with focused providers is sufficient for this use case.
## Trade-offs
- **Benefit**: Render cascades eliminated. Typing in notes re-renders only documentation-related components (3 vs 6+). Queue panel does not re-render on note changes.
- **Benefit**: Parallel development. Teams own different providers without merge conflicts in a single massive file.
- **Benefit**: Testability. Each provider can be tested in isolation with mocked children.
- **Cost**: Initial extraction is complex. 15+ consumers must be migrated carefully. Context shim adds temporary indirection.
- **Cost**: Provider composition adds nesting depth. Session page wraps 7 providers.
- **Benefit**: Future extensibility. New capabilities plug into extension slots or new providers without modifying existing ones.
- **Cost**: Event bus introduces async coupling. Missed events require fallback strategies.
## Consequences
- **Positive**: ConsultationContext reduced from 976 lines to <100 lines (compatibility shim). Module is now maintainable.
- **Positive**: Each provider has a clear interface (SessionProviderValue, DocumentationProviderValue, etc.). Consumer knows exactly what state it receives.
- **Positive**: Render performance improves measurably on low-end devices.
- **Negative**: During extraction (Phases 3-6), developers must understand both old and new paths. Dual-write period adds complexity.
- **Negative**: Provider composition must be carefully managed. Incorrect nesting order can cause stale closures or missed events.
- **Mitigation**: Strict provider boundary rules enforced via CI lint. Event bus implementation with subscription tracking and error boundaries.
## Compliance
- All new state must live in a focused provider
- No new logic may be added to ConsultationContext
- Provider interfaces must be typed and documented
- Cross-provider imports are forbidden; event bus or React Query must be used
