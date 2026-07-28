# Consultation Module — Capability Assessment

## 1. Maturity Scale

| Level | Label | Description |
|-------|-------|-------------|
| 1 | Basic | Minimal viable functionality, manual processes, limited error handling |
| 2 | Functional | Core workflow complete, basic automation, standard error handling |
| 3 | Integrated | Cross-component coordination, background automation, recovery mechanisms |
| 4 | Reusable | Modular design, clear boundaries, testable, extensible |
| 5 | Platform Ready | Event-driven, observable, auditable, multi-tenant ready |

---

## 2. Capability Maturity Assessment

### 2.1 Authentication & Authorization
**Maturity Level:** 3 (Integrated)  
**Justification:**
- JWT-based authentication with refresh flow ✓
- Role-based access control (DOCTOR role check) ✓
- Doctor assignment validation with queue reconciliation ✓
- Middleware-based gate enforcement ✓
- **Gaps:** No rate limiting, no CSRF protection (mitigated by JWT), no multi-factor authentication

**Implementation Evidence:**
- `JwtMiddleware.authenticate` in all API routes
- `useAuth` hook provides global auth state
- `StartConsultationUseCase` validates doctor assignment

---

### 2.2 Doctor Assignment Validation
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Validates doctor-appointment relationship ✓
- Queue-based reconciliation for flexible assignment ✓
- Database-level enforcement via Prisma queries ✓
- **Gaps:** No caching of valid assignments, no audit trail for assignment changes

**Implementation Evidence:**
- `StartConsultationUseCase.ts:120-154` — doctor ID matching, queue fallback, assignment reconciliation

---

### 2.3 Consultation Session Management
**Maturity Level:** 4 (Reusable)  
**Justification:**
- Clean separation between session orchestration (Context) and UI (Page) ✓
- Multiple entry points (queue, direct navigation, resume) ✓
- Idempotent start handling ✓
- Two-tier parallel data loading ✓
- **Gaps:** Sequential patient/vitals loading could be parallelized, no session timeout warning for doctor

**Implementation Evidence:**
- `ConsultationSessionPageOptimized` — auth, layout, state init
- `ConsultationProvider` — data fetching, workflow state
- `loadAppointment` — parallel tier 1, parallel tier 2

---

### 2.4 Patient Profile Review
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Comprehensive demographic display ✓
- Vitals with clinical warning indicators ✓
- Allergies, conditions, contact, emergency contact ✓
- Branded UI consistent with module design ✓
- **Gaps:** No vitals trend visualization, no historical vitals comparison, no allergy severity classification

**Implementation Evidence:**
- `PatientInfoSidebar.tsx` — all sections rendered with clear visual hierarchy
- `VitalsGrid` — warning thresholds for temp, BP, SpO₂

---

### 2.5 Consultation History Review
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Fetches complete patient consultation history ✓
- Displays up to 8 most recent consultations ✓
- Summary statistics (total, completed, procedures, photos) ✓
- **Gaps:** No filtering by date range, outcome type, or doctor; no search; limited to 8 items (hardcoded)

**Implementation Evidence:**
- `usePatientConsultationHistory` — React Query with 5min stale time
- `GET /patients/:id/consultations` — backend aggregation endpoint
- `PatientConsultationHistoryDto` — rich DTO with photo counts, case plan linkage

---

### 2.6 Previous Consultation Reference (Modal)
**Maturity Level:** 2 (Functional)  
**Justification:**
- Modal overlay with consultation details ✓
- Shows outcome, duration, notes summary, photos, case plan ✓
- Links to full appointment details ✓
- Non-blocking (doesn't interrupt current session) ✓
- **Gaps:** No side-by-side comparison with current consultation, no export/print, no clinical decision support integration

**Implementation Evidence:**
- `PatientInfoSidebar.tsx` — `selectedConsultation` state, modal JSX
- Click handler on history cards

---

### 2.7 Clinical Documentation
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Structured SOAP tabbed interface ✓
- Real-time keystroke capture ✓
- Legacy full-text note parsing ✓
- URL-synced active tab ✓
- **Gaps:** No rich text editor (plain text only), no template support, no voice-to-text, no handwriting support, no clinical decision support alerts

**Implementation Evidence:**
- `ConsultationWorkspaceOptimized` — tab container with activeTab state
- `SubjectiveTab`, `ObjectiveTab`, `AssessmentTab`, `PlanTab` — lazy-loaded tab components
- `parseLegacyNotes` — regex-based full-text parsing

---

### 2.8 Draft Management (Auto-Save)
**Maturity Level:** 4 (Reusable)  
**Justification:**
- Debounced 3-second auto-save ✓
- Optimistic updates with rollback ✓
- Version conflict detection ✓
- localStorage crash recovery backup ✓
- **Gaps:** No visual indicator of save progress beyond status text, no configurable debounce interval, no save queue for rapid changes

**Implementation Evidence:**
- `ConsultationContext` — 3-second debounce `useEffect`
- `useSaveConsultationDraft` — React Query mutation with snapshot/rollback
- `localStorage.setItem` — crash recovery backup

---

### 2.9 Draft Management (Manual Save)
**Maturity Level:** 2 (Functional)  
**Justification:**
- Explicit save button in header ✓
- Immediate save (no debounce) ✓
- Visual feedback (saving/saved/error states) ✓
- **Gaps:** No keyboard shortcut, no save confirmation dialog, no version history

**Implementation Evidence:**
- `ConsultationSessionHeader` — Save button with `onSaveDraft` prop
- `ConsultationContext.saveDraft()` — explicit save with `SET_SAVING` flag

---

### 2.10 Draft Restoration (Session Recovery)
**Maturity Level:** 3 (Integrated)  
**Justification:**
- localStorage backup on every save ✓
- Timestamp-based conflict resolution ✓
- Silent restoration (no disruptive toast) ✓
- Automatic cleanup of stale drafts ✓
- **Gaps:** No user confirmation before restoration, no draft versioning, no cross-device sync

**Implementation Evidence:**
- `ConsultationContext.loadAppointment` — draft comparison logic
- `localStorage.getItem` / `localStorage.removeItem` — backup management

---

### 2.11 Version Conflict Recovery
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Detects `VERSION_CONFLICT` in mutation errors ✓
- Rolls back optimistic update ✓
- Refetches consultation from server ✓
- Reconciles notes (server wins) ✓
- **Gaps:** No user notification of conflict, no merge UI, last-save-wins after reconciliation

**Implementation Evidence:**
- `useSaveConsultationDraft` — error handler with conflict detection
- React Query snapshot/rollback pattern

---

### 2.12 Session Heartbeat
**Maturity Level:** 2 (Functional)  
**Justification:**
- 30-second interval during active session ✓
- Fire-and-forget with silent error handling ✓
- Cleanup on unmount/dependency change ✓
- **Gaps:** No adaptive interval (always 30s regardless of activity), no heartbeat response validation, no configurable interval

**Implementation Evidence:**
- `ConsultationContext` — `setInterval` + `clearInterval` pattern
- `apiClient.post` to `/consultations/:id/heartbeat`

---

### 2.13 Timer & Session Duration Tracking
**Maturity Level:** 2 (Functional)  
**Justification:**
- Displays elapsed/remaining time ✓
- 1-second update interval ✓
- Linked to appointment slot start time and duration ✓
- **Gaps:** No overtime warning, no pause/resume, no multiple timer modes (e.g.,Net vs Gross)

**Implementation Evidence:**
- `useConsultationTimer` hook — `setInterval` with 1-second tick
- `ConsultationSessionHeader` — timer display component

---

### 2.14 Queue Management
**Maturity Level:** 4 (Reusable)  
**Justification:**
- Collapsible panel with animation ✓
- Waiting vs in-consultation patient grouping ✓
- Background polling for real-time updates ✓
- Manual refresh button ✓
- Empty state handling ✓
- **Gaps:** No search/filter, no patient grouping by category, no batch actions

**Implementation Evidence:**
- `ConsultationQueuePanel` — collapsible panel with `framer-motion`
- `useDoctorTodayAppointments` — React Query with `refetchInterval`
- Sub-components: `QueueHeader`, `QueuePatientCard`, `QueueEmptyState`, `QueueFooter`, `CollapsedRail`

---

### 2.15 Patient Switching
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Draft save before switch ✓
- Confirmation dialog for dirty state ✓
- Graceful degradation (save failure doesn't block navigation) ✓
- Full context reset on new patient ✓
- **Gaps:** No switch history/undo, no patient comparison during switch, no confirmation for clean state

**Implementation Evidence:**
- `ConsultationQueuePanel` — `onSwitchPatient` callback, `PatientSwitchConfirmation`
- `ConsultationContext.switchToPatient` — save timeout clear, draft save, navigation

---

### 2.16 Outcome Management
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Five outcome types covering clinical scenarios ✓
- Auto-set patient decision for PROCEDURE_RECOMMENDED ✓
- Business rule: `requiresCasePlanning` for surgical workflow ✓
- Persistent via draft/completion ✓
- **Gaps:** No outcome templates, no outcome history per patient, no clinical decision support recommendations

**Implementation Evidence:**
- `ConsultationOutcomeType` enum — 5 clinical outcomes
- `PatientDecision` enum — YES/NO/PENDING
- `setOutcome` in ConsultationContext — auto-decision logic
- `requiresCasePlanning` — business rule function

---

### 2.17 Consultation Completion
**Maturity Level:** 4 (Reusable)  
**Justification:**
- Comprehensive completion dialog ✓
- Advisory warnings ✓
- Documentation checklist ✓
- Editable summary ✓
- Billing summary ✓
- Queue-aware auto-routing ✓
- Aggressive cache invalidation ✓
- **Gaps:** No completion undo, no completion reason required for early termination, no second confirmation for high-stakes outcomes

**Implementation Evidence:**
- `CompleteConsultationDialog` — multi-step confirmation
- `CompleteConsultationUseCase` — orchestrates 12 backend actions
- `ConsultationContext.completeConsultation` — cache clearing, routing

---

### 2.18 Billing Creation
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Automatic billing record creation on completion ✓
- Payment record created (UNPAID for frontdesk collection) ✓
- Billing summary displayed in completion dialog ✓
- **Gaps:** No automated insurance billing, no payment plan support, no invoice generation in module

**Implementation Evidence:**
- `CompleteConsultationUseCase` — creates billing + payment
- `useAppointmentBilling` — fetches billing data for display
- `BillingSummary` sub-component — displays items

---

### 2.19 Surgical Case Initiation
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Automatic creation when outcome + decision conditions met ✓
- CasePlan created alongside SurgicalCase ✓
- Linked to consultation and patient ✓
- **Gaps:** No surgical case preview before creation, no case type selection based on procedure, no theater scheduling integration at creation

**Implementation Evidence:**
- `CompleteConsultationUseCase` — conditional SurgicalCase + CasePlan creation
- `requiresCasePlanning` — business rule guard
- `chargeSheetService`, `resolveConsultationServiceId` — supporting services

---

### 2.20 Notification Dispatch
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Email notification to patient ✓
- In-app notifications to frontdesk/nurses ✓
- Non-blocking (failures caught internally) ✓
- Triggered on completion ✓
- **Gaps:** No SMS notifications, no notification preferences, no notification history/audit, no real-time push (relies on polling)

**Implementation Evidence:**
- `CompleteConsultationUseCase` — calls `emailNotificationService`
- In-app notification logic embedded in use case

---

### 2.21 Queue Progression & Auto-Routing
**Maturity Level:** 4 (Reusable)  
**Justification:**
- Automatic next patient detection ✓
- Priority logic (IN_CONSULTATION > CHECKED_IN) ✓
- Seamless session transition ✓
- Hub fallback when no queue ✓
- **Gaps:** No configurable routing rules, no skip option, no queue position preservation for completed patient

**Implementation Evidence:**
- `ConsultationContext.completeConsultation` — queue-aware routing logic
- `todayAppointments.find` — priority-based next patient selection

---

### 2.22 Error Recovery (Load Failure)
**Maturity Level:** 2 (Functional)  
**Justification:**
- Clear error state with message ✓
- "Try again" button ✓
- Full reload recovery ✓
- **Gaps:** No partial retry, no offline mode, no error reporting/analytics

**Implementation Evidence:**
- `ConsultationSessionPageOptimized` — error state conditional render
- `window.location.reload()` — recovery action

---

### 2.23 Error Recovery (Version Conflict)
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Proactive optimistic locking via version token ✓
- Automatic rollback on conflict ✓
- Server-wins reconciliation ✓
- **Gaps:** No user notification, no merge UI, no retry with merged data

**Implementation Evidence:**
- `useSaveConsultationDraft` — onError handler with VERSION_CONFLICT detection
- React Query cache refetch on conflict

---

### 2.24 Audit & Compliance Logging
**Maturity Level:** 3 (Integrated)  
**Justification:**
- Audit events for start and completion ✓
- Structured event data (userId, recordId, action, model, details) ✓
- Console-based audit service (development) ✓
- **Gaps:** No persistent audit store (ConsoleAuditService), no audit trail viewer, no compliance report generation

**Implementation Evidence:**
- `StartConsultationUseCase` — `auditService.recordEvent`
- `CompleteConsultationUseCase` — `auditService.recordEvent`
- `ConsoleAuditService` — console.log based

---

### 2.25 Legacy Data Migration
**Maturity Level:** 2 (Functional)  
**Justification:**
- Parses legacy full-text notes into structured format ✓
- Graceful fallback (if parsing fails, notes remain as fullText) ✓
- Automatic on consultation load ✓
- **Gaps:** Regex-based parsing is fragile, no migration batch job, no migration status tracking, no user notification of migrated data

**Implementation Evidence:**
- `ConsultationContext.parseLegacyNotes` — regex extraction of chief complaint, examination, assessment, plan
- Called in `loadAppointment` when `notes.structured` is undefined

---

## 3. Maturity Distribution Summary

| Maturity Level | Capability Count | Capabilities |
|----------------|------------------|--------------|
| Level 1 — Basic | 0 | — |
| Level 2 — Functional | 6 | Draft Management (Manual), Heartbeat, Timer, Error Recovery (Load), Legacy Migration, Previous Reference (Modal) |
| Level 3 — Integrated | 11 | Auth/Authorization, Doctor Assignment, Session Management, Patient Profile, History Review, Documentation, Draft Restoration, Version Conflict, Patient Switching, Outcome Management, Billing, Surgical Initiation, Notifications, Audit |
| Level 4 — Reusable | 4 | Session Management (overall), Draft Auto-Save, Queue Management, Completion, Queue Progression |
| Level 5 — Platform Ready | 0 | — |

### Majority Maturity: Level 3 (Integrated)

The module is predominantly at Level 3 — core workflows are integrated across components with background automation and recovery mechanisms. It has pockets of Level 4 (Reusable) for the most mature capabilities (session management, auto-save, queue management, completion, queue progression).

---

## 4. Implementation Quality Assessment

### 4.1 Strongly Implemented
- **Auto-Save with Crash Recovery** — 3-second debounce, optimistic updates, version conflict detection, localStorage backup. Production-grade data integrity.
- **Queue-Aware Completion** — Automatic next patient loading with priority logic. Seamless workflow continuity.
- **Idempotent Session Start** — Handles already-in-progress sessions without error. Supports concurrent sessions.
- **Dual State Machine** — Clean separation of clinical state and UI workflow state. Prevents coupling.

### 4.2 Adequately Implemented
- **Patient Profile Display** — Comprehensive but lacks visualization (vitals trends, allergy severity).
- **Consultation History** — Functional timeline but limited filtering and search.
- **Clinical Documentation** — Structured SOAP but plain-text only, no templates or decision support.
- **Outcome Management** — Five outcome types cover clinical scenarios, but no recommendations or templates.
- **Notification Dispatch** — Email and in-app present, but no SMS or real-time push.

### 4.3 Minimally Implemented
- **Legacy Data Migration** — Regex parsing works but is fragile. No batch migration or status tracking.
- **Audit Logging** — Events recorded but stored in console only. No persistent audit trail.
- **Timer** — Basic elapsed time display. No overtime warnings or pause functionality.
- **Error Recovery** — Load failure recovery is basic (full reload). Version conflict recovery is silent.

### 4.4 Missing or Not Observed
- **No WebSocket/Real-Time Push** — Polling-based queue updates only.
- **No Clinical Decision Support** — No alerts, reminders, or guidelines based on patient data.
- **No Voice/Handwriting Support** — Text-only documentation.
- **No Multi-Device Sync** — localStorage is per-device, per-browser.
- **No Offline Mode** — Requires network connectivity for all operations.
- **No Rate Limiting** — Not observed in API routes.
- **No Structured Error Reporting** — Console.log only, no error tracking service.

---

## 5. Technical Debt Impact on Capabilities

### 5.1 High Impact
- **ConsultationContext size (976 lines)** — All capabilities mediated through single context. Difficult to test, extend, or decompose.
- **Triple-write notes pattern** — Notes exist in reducer, React Query cache, and localStorage. Requires careful reconciliation; source of truth is ambiguous during save.

### 5.2 Medium Impact
- **Context value memoization** — `state` in dependency array makes `useMemo` ineffective. All consumers re-render on every keystroke during documentation.
- **Sequential data fetching** — Patient/vitals loaded in Tier 2 after Tier 1 completes. Could be parallelized.
- **CompleteConsultationUseCase breadth** — Handles billing, surgical case, notifications, queue, assignment, audit. Single responsibility violated.

### 5.3 Low Impact
- **Direct Prisma access in server components** — Bypasses repository pattern. Acceptable for read-only server components.
- **Fixed polling interval** — No exponential backoff. Minor during normal operation.
- **ConsoleAuditService** — Development-only. Production needs persistent store.

---

## 6. Capability Gap Analysis

### 6.1 Clinical Workflow Gaps
| Gap | Impact | Evidence |
|------|--------|----------|
| No clinical templates | Medium | Plain text fields in all SOAP tabs |
| No voice documentation | Medium | Text-only input in tabs |
| No vitals trend graphs | Low | Static grid display only |
| No allergy severity classification | Low | Text display only |
| No differential diagnosis support | Medium | Free-text assessment only |

### 6.2 Operational Workflow Gaps
| Gap | Impact | Evidence |
|------|--------|----------|
| No offline mode | High | All API calls require network |
| No multi-device sync | Medium | localStorage only |
| No real-time queue updates | Medium | Polling-based |
| No patient search in queue | Low | List view only |

### 6.3 Data Integrity Gaps
| Gap | Impact | Evidence |
|------|--------|----------|
| No draft versioning | Low | Single draft per appointment |
| No merge UI for conflicts | Medium | Server-wins reconciliation |
| No completion undo | Medium | Terminal state with no rollback |

---

## 7. Summary

The Consultation Module's capabilities are **predominantly Level 3 (Integrated)**, with **four capabilities reaching Level 4 (Reusable)**. The module is production-ready for its current scope but has clear boundaries where additional investment would increase maturity.

**Key Strengths:**
- Data integrity (auto-save, conflict recovery, draft restoration) is Level 4
- Session lifecycle management is robust and idempotent
- Queue-aware completion is a standout operational capability

**Key Weaknesses:**
- Clinical documentation is Level 3 — functional but lacks modern enhancements (templates, voice, decision support)
- Audit trail is Level 3 in concept but Level 2 in implementation (console-only)
- Legacy migration is Level 2 — functional but fragile

**Path to Level 5 (Platform Ready):**
1. Persistent audit store with query/reporting
2. Event-driven notifications (WebSocket/SSE)
3. Clinical decision support integration
4. Multi-device sync for drafts
5. Offline mode with sync
6. Configurable workflows (outcome types, routing rules)
7. Real-time collaboration (multi-user editing)
