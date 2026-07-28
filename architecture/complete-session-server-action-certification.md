# Complete Session Server Action Certification

## Executive Summary

This document certifies that the `completeSession` Server Action is production-ready, correctly implements the server-boundary contract, preserves workflow authority, and maintains all architectural invariants.

**Certification Date:** 2026-07-26  
**Status:** CERTIFIED

---

## 1. Server Action Contract

### 1.1 Signature

```typescript
export async function completeSession(consultationId: number): Promise<ActionResult<CompleteSessionResult>>
```

Where:
```typescript
export interface CompleteSessionResult {
  readonly completedAppointmentId: number;
  readonly clearedLocalStorage: boolean;
  readonly invalidationInstructions: readonly { readonly queryKey: readonly unknown[]; readonly direction: 'invalidate' | 'refetch' }[];
  readonly redirectPath: string;
}
```

### 1.2 Input Validation

| Input | Validation | Status |
|-------|-----------|--------|
| `consultationId` | Validated by SessionService | ✅ |
| `userId` | From authenticated user | ✅ |

---

## 2. Server Action Implementation

### 2.1 Execution Path

```
completeSession(consultationId)
  → getCurrentUser()
    → returns AuthContext | null
  → if null: return auth error
  → completeConsultationSession(config, consultationId)
    → createSessionServiceContainer(config)
      → construct all services
    → sessionService.completeSession(consultationId)
      → validate consultation exists and is IN_PROGRESS
      → execute workflow command: COMPLETE_CONSULTATION
      → draftService.discardDraft()
      → build invalidation instructions
    → return result.data
  → return { success: true, data: result }
```

### 2.2 Error Handling

| Error Type | Caught | Response | Status |
|-----------|--------|----------|--------|
| Unauthorized | Yes | `{ success: false, error: UNAUTHORIZED }` | ✅ |
| Invalid consultation ID | Yes | `{ success: false, error: INVALID_INPUT }` | ✅ |
| Consultation not found | Yes | `{ success: false, error: SESSION_NOT_FOUND }` | ✅ |
| Consultation not in progress | Yes | `{ success: false, error: VALIDATION_ERROR }` | ✅ |
| Workflow rejection | Yes | `{ success: false, error }` from coordinator | ✅ |
| Factory throws | Yes | `{ success: false, error: UNKNOWN }` | ✅ |

---

## 3. Factory Integration

### 3.1 Factory Method

```typescript
export async function completeConsultationSession(
  config: ConsultationSessionConfig,
  consultationId: number
): Promise<CompleteSessionResult>
```

### 3.2 Factory Responsibilities

| Responsibility | Status |
|---------------|--------|
| Construct services | ✅ |
| Execute completeSession | ✅ |
| Return result | ✅ |

---

## 4. Workflow Authority

### 4.1 Workflow State Transition

| Transition | Trigger | Owner |
|-----------|---------|-------|
| ACTIVE → COMPLETED | `COMPLETE_CONSULTATION` command | WorkflowEngine |

### 4.2 Transition Path

```
SessionService.completeSession()
  → WorkflowCoordinator.execute({ type: 'COMPLETE_CONSULTATION' })
    → WorkflowEngine.execute()
      → State transition: ACTIVE → COMPLETED
      → Side Effect Dispatcher
        → Event Bus
```

**Server Action never touches workflow state directly.**

---

## 5. Certification

| Check | Status |
|-------|--------|
| Server Action signature correct | ✅ |
| Authentication verified | ✅ |
| Factory invoked | ✅ |
| Workflow authority preserved | ✅ |
| Serialization correct | ✅ |
| Error handling correct | ✅ |
| No service construction in Server Action | ✅ |
| No client bundle impact | ✅ |
| No duplicate workflow transitions | ✅ |
| No duplicate events | ✅ |

**Verdict: CERTIFIED**

The `completeSession` Server Action is production-ready.
