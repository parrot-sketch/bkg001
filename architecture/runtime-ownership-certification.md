# Runtime Ownership Certification

## Executive Summary

This document certifies that every piece of state in the consultation room has exactly one owner. No state is duplicated across providers. No state is shared via mutable globals. All mutations flow through the designated owner.

**Certification Date:** 2026-07-26  
**Status:** CERTIFIED

---

## 1. Ownership Matrix

| Concern | Owner | Creator | Mutator | Consumer | Single Owner? |
|---------|-------|---------|---------|----------|---------------|
| **Workflow state** | SessionProvider | Server (factory) | Server Actions | UI components | ✅ Yes |
| **Appointment data** | SessionProvider | Server (factory) | Server Actions | UI components | ✅ Yes |
| **Patient data** | SessionProvider → PatientContextProvider | Server (factory) | Server Actions | UI components | ✅ Yes |
| **Vitals data** | SessionProvider → PatientContextProvider | Server (factory) | Server Actions | UI components | ✅ Yes |
| **Consultation data** | SessionProvider | Server (factory) | Server Actions | UI components | ✅ Yes |
| **Session notes** | DocumentationProvider | Server (factory) | Local reducer + Server Actions | RichTextEditor, tabs | ✅ Yes |
| **Outcome type** | DocumentationProvider | Server (factory) | Local reducer | UI components | ✅ Yes |
| **Patient decision** | DocumentationProvider | Server (factory) | Local reducer | UI components | ✅ Yes |
| **Draft version** | DocumentationProvider (lastSavedAt) | Server Actions | Server Actions | UI components | ✅ Yes |
| **Billing items** | BillingProvider | Client init / server | Local setters | BillingSummary | ✅ Yes |
| **Billing total** | BillingProvider | Derived from items | Local setters | UI components | ✅ Yes |
| **Billing discount** | BillingProvider | Client init | Local setter | UI components | ✅ Yes |
| **Dialog visibility** | DialogProvider | Client interaction | Local setters | UI components | ✅ Yes |
| **Timer display** | TimerContextProvider | Derived from props | setNow interval | Timer UI | ✅ Yes |
| **Queue state** | QueueContextProvider | React Query | loadWaitingQueue dispatch | QueuePanel | ✅ Yes |
| **Navigation** | SessionProvider | Client interaction | router.push | Header button | ✅ Yes |

---

## 2. State Flow Diagram

```
Server Component (page.tsx)
│
├── Authenticates user (server-only, getCurrentUser)
├── Invokes Composition Root (factory)
│   ├── Constructs services
│   ├── Initializes session
│   └── Serializes state to JSON
│
└── Passes SerializedSessionData to ConsultationRoomClient

ConsultationRoomClient (Client Shell)
│
└── SessionProvider
    ├── Initializes React state from serialized props
    ├── Composes child providers
    │
    ├── BillingProvider (owns billing state)
    ├── DialogProvider (owns dialog visibility)
    ├── TimerContextProvider (owns timer display)
    ├── QueueContextProvider (owns queue display)
    ├── PatientContextProvider (owns patient context)
    └── DocumentationProvider (owns notes/outcome)
    │
    └── Exposes mutations → Server Actions
```

---

## 3. Mutation Ownership

### 3.1 Server-Owned Mutations

| Mutation | Owner | Mechanism |
|----------|-------|-----------|
| Start consultation | Server Action | `startSessionAction` |
| Complete consultation | Server Action | `completeSessionAction` |
| Resume consultation | Server Action | `resumeSessionAction` |
| Cancel completion | Server Action | `cancelCompletionAction` |
| Switch patient | Server Action | `switchToPatientAction` |
| Advance queue | Server Action | `advanceQueueAction` |
| Heartbeat | Server Action | `sendHeartbeatAction` |
| Save draft | Server Action | `saveDraftAction` |
| Save completed notes | Server Action | `saveCompletedNotesAction` |
| Refresh patient | Server Action | `refreshPatientAction` |
| Refresh vitals | Server Action | `refreshVitalsAction` |

### 3.2 Client-Owned Mutations

| Mutation | Owner | Mechanism |
|----------|-------|-----------|
| Update note field | DocumentationProvider | Reducer dispatch |
| Set outcome | DocumentationProvider | Reducer dispatch |
| Set patient decision | DocumentationProvider | Reducer dispatch |
| Open/close dialogs | DialogProvider | State toggle |
| Collapse sidebar | ConsultationSessionContent | State toggle |
| Timer tick | TimerContextProvider | setInterval |

### 3.3 Navigation

| Mutation | Owner | Mechanism |
|----------|-------|-----------|
| goToSurgeryPlanning | SessionProvider | router.push() |

---

## 4. No Shared Mutable State

| Check | Status | Evidence |
|-------|--------|----------|
| No global state | ✅ | All state in React contexts |
| No module-level mutable variables | ✅ | No `let` or `var` at module scope |
| No singleton services in client | ✅ | All services in factory |
| No event bus in client | ✅ | Event bus only in factory |

---

## 5. State Initialization

| State | Initialized By | Source |
|-------|---------------|--------|
| Session data | Server Component | `createConsultationSession()` |
| User data | Server Component | `getCurrentUser()` |
| Provider state | Server Component → Client shell | Serialized props |
| Local UI state | Client providers | useState/useReducer defaults |
| Derived state | Client providers | useMemo |

**No state is initialized asynchronously in client effects.** All server-fetched data is pre-populated before hydration.

---

## 6. Certification

| Check | Status |
|-------|--------|
| Every concern has one owner | ✅ |
| No state duplication | ✅ |
| No shared mutable state | ✅ |
| No global singletons | ✅ |
| All mutations through designated owner | ✅ |

**Verdict: CERTIFIED**

Runtime ownership is clean. Every piece of state has exactly one owner.
