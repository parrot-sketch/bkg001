# ADR-005: Implement Extension Registry with Capability Slots
## Status
Proposed
## Context
The current ConsultationWorkspaceOptimized has hardcoded tabs and panels:
- SubjectiveTab, ObjectiveTab, AssessmentTab, PlanTab are hardcoded in the component
- PatientInfoSidebar has fixed sections (demographics, vitals, allergies, conditions, history)
- ConsultationQueuePanel has fixed layout (header, patient cards, footer)
- Header has fixed action buttons (save, complete)
This means any new capability (AI assistant, voice dictation, lab orders, imaging, referrals) requires modifying the core workspace code. Over 5-10 years, this will create a fragile monolith where every feature addition risks breaking existing functionality.
## Decision
Implement an extension registry with declarative slot system:
1. **ExtensionRegistry**: Central registry in Shared Kernel that manages plugin lifecycle, slot registration, and event distribution.
2. **Extension Slots**: Named mount points in the UI where plugins can inject content:
   - `workspace.subjective.before/after`
   - `workspace.objective.before/after`
   - `workspace.assessment.before/after`
   - `workspace.plan.before/after`
   - `sidebar.before-history/after-history`
   - `header.after-actions`
   - `queue.before-list/after-list`
   - `global.overlay`
3. **CapabilityPlugin Interface**: Each plugin declares id, version, dependencies, permissions, slots, events, emits, and lifecycle hooks (initialize, activate, deactivate).
4. **ExtensionContext**: Permission-gated context provided to plugins with read access to session, write access through mutators, event emission, UI controls, and API access.
5. **Isolation Guarantees**:
   - Plugin failure does not crash core UI (try-catch in event handlers)
   - Plugin cannot modify core state directly (permission-gated mutators)
   - Plugin dependencies are explicit and validated at registration
   - Plugin data is sandboxed (only data permissions allow is accessible)
6. **Manifest-Based Registration**: Plugins registered via manifest loaded at app initialization. Conditional registration via feature flags.
## Alternatives Considered
### Alternative 1: Render Props
Pass render props to core components for extensibility.
**Why rejected**: Requires modifying core components to accept new props. Does not scale to 10+ capabilities. Core team still owns all extension points.
### Alternative 2: Compound Component Pattern
Use compound components (Workspace.Subjective, Workspace.Plan) for composition.
**Why rejected**: Still requires core component to know about all possible children. No plugin lifecycle or isolation.
### Alternative 3: Keep Hardcoded Tabs; Add Features via Feature Flags
Use feature flags to show/hide hardcoded tabs.
**Why rejected**: Does not solve monolith problem. Every new capability still requires core modification. Feature flags become unwieldy with 10+ capabilities.
## Trade-offs
- **Benefit**: New capabilities integrate without modifying core workspace code. AI, voice, labs, imaging, referrals all plug into the same extension contract.
- **Benefit**: Plugin failures are isolated. A broken AI assistant does not crash the core SOAP workspace.
- **Benefit**: Teams can own plugins independently. Platform team owns core; specialty teams own plugins.
- **Cost**: Extension registry, slot system, and lifecycle management add ~500-800 lines of infrastructure code.
- **Cost**: Plugins must learn the extension contract and respect permission boundaries. Steeper learning curve for plugin developers.
- **Benefit**: Feature flags enable gradual rollout. Plugins can be enabled for beta users before production rollout.
- **Cost**: Debugging plugin interactions can be complex. Event ordering and timing require documentation.
## Consequences
- **Positive**: ConsultationWorkspace becomes a platform, not a page. New capabilities arrive without core modifications.
- **Positive**: Core team complexity is capped. Core owns session, documentation, patient, queue. Plugins own AI, voice, labs, imaging, etc.
- **Positive**: Plugin ecosystem enables third-party integrations (hospital systems, research tools) without exposing core APIs.
- **Negative**: Extension registry is custom-built infrastructure. It is not a standard React pattern. Documentation and training required.
- **Negative**: Plugin lifecycle adds memory management complexity. Plugins must clean up subscriptions, intervals, and WebSocket connections on deactivation.
- **Mitigation**: Comprehensive plugin developer guide. Plugin failure isolation tests in CI. Memory leak detection for plugin lifecycle.
- **Negative**: Over-engineering risk. If only 2-3 plugins are ever built, the registry is unnecessary complexity.
- **Mitigation**: Phase 7 delivers only the infrastructure + 2 pilot plugins (AI stub, voice stub). Actual AI and voice plugins are future work. Infrastructure is justified because it enables all future capabilities.
## Compliance
- All plugins must implement CapabilityPlugin interface
- Plugins must declare dependencies and permissions
- Plugins must handle missing dependencies gracefully
- Plugins must not block core UI rendering
- Plugin errors are logged and routed to NotificationProvider
- Core team reviews all plugins before registration in production
