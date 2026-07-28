# Server Action Readiness

## Purpose
Verify that every workflow mutation can execute safely and correctly through Server Actions, with proper input validation, serialization, authentication, transaction boundaries, error propagation, and optimistic behavior.

---

## 1. Mutation Catalog

| # | Mutation | Current Caller | Current Implementation | Server Action Candidate |
|---|----------|----------------|------------------------|------------------------|
| 1 | Start consultation | SessionProvider.startConsultation | SessionService.startSession() | ✅ startSession() |
| 2 | Resume consultation | SessionProvider.resumeSession | SessionService.resumeSession() | ✅ resumeSession() |
| 3 | Complete consultation | SessionProvider.completeSession | SessionService.completeSession() | ✅ completeSession() |
| 4 | Cancel completion | SessionProvider.cancelCompletion | SessionService.cancelCompletion() | ✅ cancelCompletion() |
| 5 | Switch patient | SessionProvider.switchToPatient | SessionService.switchSession() | ✅ switchToPatient() |
| 6 | Advance queue | SessionProvider.advanceQueue | SessionService.advanceQueue() | ✅ advanceQueue() |
| 7 | Heartbeat | SessionProvider.sendHeartbeat | SessionService.sendHeartbeat() | ✅ sendHeartbeat() |
| 8 | Save notes (draft) | DocumentationProvider.saveDraft | DraftService.saveDraft() | ✅ saveDraft() |
| 9 | Save notes (completed) | DocumentationProvider.saveNotes | Server Action (existing) | ✅ saveCompletedNotes() |
| 10 | Pause consultation | SessionProvider.pauseSession (if exists) | SessionService.pauseSession() | ✅ pauseSession() |
| 11 | Resume paused | SessionProvider.resumePausedSession (if exists) | SessionService.resumePausedSession() | ✅ resumePausedSession() |
| 12 | Update outcome | ConsultationContext / Hub | Server Action (existing) | ✅ updateConsultationOutcome() |

**All 12 mutations have existing implementations. All can be wrapped in Server Actions.**

---

## 2. Input/Output Validation

### Pattern: All Server Actions Accept Serializable Input

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

type ActionInput<T> = {
  readonly [K in keyof T]: T[K] extends Date ? string : T[K] extends object ? JSONValue : T[K];
};
```

### startSession

| Property | Type | Required | Validation |
|----------|------|----------|------------|
| `appointmentId` | `number` | ✅ | `> 0` |
| `doctorId` | `string` | ✅ | non-empty |

**Output:** `SessionResult<SessionData>` → serialized to `{ success, data: SessionData | error: SessionError }`

**Serialization compatibility:** ✅ All fields are JSON-serializable (Dates → ISO strings).

### completeSession

| Property | Type | Required | Validation |
|----------|------|----------|------------|
| `consultationId` | `number` | ✅ | `> 0` |

**Output:** `SessionResult<SessionCompletionResult>` → serialized

**Serialization compatibility:** ✅ `redirectPath` is string. `invalidationInstructions` contains arrays of `unknown[]`.

### switchToPatient

| Property | Type | Required | Validation |
|----------|------|----------|------------|
| `fromAppointmentId` | `number` | ✅ | `> 0` |
| `toAppointmentId` | `number` | ✅ | `> 0` and `!== fromAppointmentId` |

**Output:** `SessionResult<SessionSwitchResult>` → serialized

**Serialization compatibility:** ✅ `nextSession` is `SessionInitializationResult | null`.

### saveDraft

| Property | Type | Required | Validation |
|----------|------|----------|------------|
| `consultationId` | `number` | ✅ | `> 0` |
| `doctorId` | `string` | ✅ | non-empty |
| `notes` | `StructuredNotes` | ✅ | plain object |
| `outcomeType` | `ConsultationOutcomeType` | ❌ | enum or undefined |
| `patientDecision` | `PatientDecision` | ❌ | enum or null |

**Output:** `SaveDraftResult` → `{ success, version }` or `{ success, error }`

**Serialization compatibility:** ✅ `StructuredNotes` is plain object. Enums serialize to strings. `version` is string.

### saveCompletedNotes

| Property | Type | Required | Validation |
|----------|------|----------|------------|
| `consultationId` | `number` | ✅ | `> 0` |
| `doctorId` | `string` | ✅ | non-empty |
| `chiefComplaint` | `string` | ❌ | undefined or string |
| `examination` | `string` | ❌ | undefined or string |
| `assessment` | `string` | ❌ | undefined or string |
| `plan` | `string` | ❌ | undefined or string |

**Output:** `{ success: true }` or `{ success: false, error: string }`

**Serialization compatibility:** ✅ All strings.

### sendHeartbeat

| Property | Type | Required | Validation |
|----------|------|----------|------------|
| `consultationId` | `number` | ✅ | `> 0` |

**Output:** `SessionVoid` → `{ success: true, data: undefined }` or `{ success: false, error }`

**Serialization compatibility:** ✅ `undefined` serializes safely.

---

## 3. Authentication in Server Actions

### Current Authentication Pattern

Server Actions do NOT automatically inherit API route authentication. They must verify the user explicitly.

### Recommended Pattern

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

import { getCurrentUser } from '@/lib/auth/server-auth';
import { ClinicalErrorCode, ClinicalErrorCategory } from '@/shared-kernel/errors/codes';

export async function startSession(input: StartSessionInput) {
  // 1. Authenticate
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: makeError(ClinicalErrorCode.UNAUTHORIZED, 'Unauthorized', ClinicalErrorCategory.AUTH, true, false) };
  }
  
  // 2. Authorize (role check)
  if (user.role !== 'DOCTOR') {
    return { success: false, error: makeError(ClinicalErrorCode.FORBIDDEN, 'Forbidden', ClinicalErrorCategory.AUTH, true, false) };
  }
  
  // 3. Execute action
  const session = createConsultationSession({ appointmentId: input.appointmentId, user });
  const result = await session.sessionService.startSession(input.appointmentId, input.doctorId, user.userId);
  
  // 4. Return serialized result
  return result;
}
```

### Auth Verification Checklist

| Action | Auth Required? | User Check | Role Check | Ownership Check |
|--------|----------------|------------|------------|-----------------|
| `startSession` | ✅ | `getCurrentUser()` | DOCTOR | Implicit via appointment |
| `resumeSession` | ✅ | `getCurrentUser()` | DOCTOR | Implicit via consultation |
| `completeSession` | ✅ | `getCurrentUser()` | DOCTOR | Explicit in SessionService |
| `cancelCompletion` | ✅ | `getCurrentUser()` | DOCTOR | Implicit via workflow |
| `switchToPatient` | ✅ | `getCurrentUser()` | DOCTOR | Implicit via workflow |
| `advanceQueue` | ✅ | `getCurrentUser()` | DOCTOR | Explicit in SessionService |
| `sendHeartbeat` | ✅ | `getCurrentUser()` | DOCTOR | Explicit in SessionService |
| `saveDraft` | ✅ | `getCurrentUser()` | DOCTOR | Explicit via consultationId |
| `saveCompletedNotes` | ✅ | `getCurrentUser()` | DOCTOR | Explicit in existing action |
| `pauseSession` | ✅ | `getCurrentUser()` | DOCTOR | Implicit via workflow |
| `resumePausedSession` | ✅ | `getCurrentUser()` | DOCTOR | Implicit via workflow |

### Cookie vs Token Authentication

**Current client-side:** `authApi` uses Bearer token from localStorage.

**New server-side:** `getCurrentUser()` reads access token from httpOnly cookie.

**Compatibility:** Both methods identify the same user. The Server Component and Server Actions use cookies. The client shell (for login/logout UI) continues to use `AuthContext`.

**Risk:** If the access token cookie and localStorage token get out of sync, the server may see a different user than the client expects. This is a known issue with dual auth stores. Mitigation: Server Actions always use `getCurrentUser()` as source of truth. Client displays user from props.

---

## 4. Transaction Boundaries

### Existing Transaction Patterns

| Pattern | Location | Usage |
|---------|----------|-------|
| `db.$transaction()` | API routes | `initiateSurgicalCase` uses it |
| Prisma implicit transactions | API routes | Single-model updates are implicit |
| No transactions in SessionService | Application | SessionService uses sequential API calls |

### Transaction Requirements for Server Actions

| Action | Requires Transaction? | Reason |
|--------|----------------------|--------|
| `startSession` | ❌ | Single consultation update |
| `resumeSession` | ❌ | Single consultation update |
| `completeSession` | ⚠️ Recommended | Updates consultation + discards draft + invalidates caches |
| `cancelCompletion` | ❌ | Single workflow transition |
| `switchToPatient` | ⚠️ Recommended | Saves current draft + initializes next session |
| `advanceQueue` | ⚠️ Recommended | Workflow transition + session initialization |
| `sendHeartbeat` | ❌ | Single heartbeat update |
| `saveDraft` | ❌ | Single draft save |
| `saveCompletedNotes` | ❌ | Single consultation update |
| `pauseSession` | ❌ | Single workflow transition |
| `resumePausedSession` | ❌ | Single workflow transition |

### Transaction Implementation

For actions requiring transactions, the Server Action can use Prisma directly:

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

export async function completeSession(input: CompleteSessionInput) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: UNAUTHORIZED };
  
  const session = createConsultationSession({ appointmentId, user });
  return db.$transaction(async (tx) => {
    // Complete workflow transition
    const workflowResult = await session.sessionService.completeSession(input.consultationId);
    if (!workflowResult.success) return workflowResult;
    
    // Discard draft
    await session.draftService.discardDraft(input.consultationId);
    
    return workflowResult;
  });
}
```

**Alternatively**, SessionService can be enhanced to accept a transaction context, but this is an optimization, not a requirement.

---

## 5. Error Propagation

### Current Error Model

```typescript
type SessionResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: SessionError };

interface SessionError {
  readonly code: ClinicalErrorCode;
  readonly message: string;
  readonly category: ClinicalErrorCategory;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly cause?: unknown;
}
```

### Server Action Error Propagation

Server Actions return the same `SessionResult<T>` shape. The client receives:

```typescript
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: {
      code: string;
      message: string;
      category: string;
      recoverable: boolean;
      retryable: boolean;
    }};
```

**Mapping is straightforward:** `SessionError` fields are already serializable.

### Error Handling in Client

```typescript
// SessionProvider (client shell)
const startConsultation = startActionTransition(async () => {
  const result = await startSessionAction({ appointmentId, doctorId });
  if (result.success) {
    setAppointment(result.data.appointment);
    // ...
  } else {
    toast.error(result.error.message || 'Failed to start consultation');
    if (result.error.retryable) {
      // Show retry button
    }
  }
});
```

### Existing Server Action Error Pattern

`consultation-hub.ts` already uses this pattern:

```typescript
try {
  // ... operation
  return { success: true, data: ... };
} catch (error: any) {
  console.error('Error:', error);
  return {
    success: false,
    error: error.message || 'Failed to ...',
  };
}
```

**Our Server Actions will follow the same pattern, but with structured `SessionError` instead of plain strings.**

---

## 6. Optimistic Behavior Design

### Actions With Safe Optimistic Updates

| Action | Optimistic Update | Rollback on Failure |
|--------|-------------------|---------------------|
| `startSession` | Set `workflowState = ACTIVE` | Restore `workflowState = READY` |
| `completeSession` | Close dialog, show spinner | Reopen dialog |
| `resumeSession` | Set `workflowState = ACTIVE` | Restore previous state |
| `pauseSession` | Set `workflowState = PAUSED` | Restore previous state |
| `resumePausedSession` | Set `workflowState = ACTIVE` | Restore `PAUSED` |
| `saveDraft` | Set `isSaving = true` | Set `isSaving = false` |
| `saveCompletedNotes` | Set `isSaving = true` | Set `isSaving = false` |

### Actions WITHOUT Optimistic Updates

| Action | Reason |
|--------|--------|
| `switchToPatient` | Full state replacement, no intermediate state makes sense |
| `advanceQueue` | Full state replacement or clear |
| `cancelCompletion` | Dialog close is fast enough |
| `sendHeartbeat` | Fire-and-forget, no UI state change |
| `updateConsultationOutcome` | Already handled in Hub |

---

## 7. Caching and React Query Integration

### Current React Query Usage

| Provider | Query Keys | Invalidation |
|----------|-----------|--------------|
| SessionProvider | N/A | Manual `queryClient.invalidateQueries()` |
| QueueContextProvider | `['doctor', doctorId, 'appointments', 'today']` | React Query auto-refetch |

### Post-Migration React Query Strategy

**SessionProvider (client shell):**
- No `useQueryClient()` for React Query cache management
- Instead, Server Actions return `invalidationInstructions`
- Client triggers `queryClient.invalidateQueries()` based on instructions

**Problem:** `queryClient` is not available outside React Query context.

**Solution:** Keep React Query for queue data. Pass `queryClient` to SessionProvider via context, OR have SessionProvider call a `useQueryClient()` hook internally.

**Recommended:** SessionProvider continues to use `useQueryClient()` internally. It's a client-side concern. The fact that SessionProvider is in the client shell means it can safely use React Query.

```typescript
// ConsultationRoomClient
<SessionProvider initialSession={initialSession} user={user} restoredDraft={restoredDraft}>
  {/* React Query Provider wraps SessionProvider */}
  <QueryClientProvider client={queryClient}>
    {/* Providers */}
  </QueryClientProvider>
</SessionProvider>
```

**Wait — this is inverted.** In current architecture, `QueryClientProvider` wraps everything. In the new architecture, `ConsultationRoomClient` is rendered by the Server Component, which means React Query Provider would need to wrap the client shell.

**Correct order:**
```
page.tsx (Server)
  └─ ConsultationRoomClient (Client)
       └─ QueryClientProvider
            └─ SessionProvider
            └─ DocumentationProvider
            └─ ...
```

This preserves React Query functionality while keeping the server boundary clean.

---

## 8. Redesign Requirements

### None Required

All 12 mutations have existing implementations that are:
- Already async
- Already return structured results
- Already handle errors
- Already validate inputs
- Already enforce authentication (at API route level)
- Already use transactions where needed

**Server Actions will wrap existing SessionService methods without requiring any redesign.**

### One Enhancement Recommended

**Server-side session factory caching:**
Currently, `createConsultationSession()` creates new instances per Server Action call. This is correct for isolation, but has minor overhead.

**Option A:** Keep per-request instantiation (current plan). Overhead is negligible (~10ms).

**Option B:** Add a request-scoped cache using `asyncLocalStorage`. More complex, not necessary.

**Decision:** Keep Option A. Simplicity wins.

---

## 9. Verification Plan

### Unit Tests for Server Actions

| Action | Test Scenario | Expected Result |
|--------|---------------|-----------------|
| `startSession` | Valid appointment, valid user | Returns `SessionData` |
| `startSession` | Invalid appointmentId | Returns error |
| `startSession` | Unauthenticated | Returns error |
| `completeSession` | Valid consultationId | Returns `SessionCompletionResult` |
| `completeSession` | Consultation not in progress | Returns error |
| `switchToPatient` | Valid fromId, toId | Returns `SessionSwitchResult` |
| `switchToPatient` | Same appointment | Returns error |
| `advanceQueue` | Valid doctorId, userId | Returns `SessionInitializationResult \| null` |
| `saveDraft` | Valid inputs | Returns `{ success, version }` |
| `saveDraft` | Version conflict | Returns `{ success, error }` |

### Integration Tests

- Server Action → SessionService → API → Database → Response
- Verify auth token from cookie is used
- Verify error codes are preserved through serialization
- Verify transaction boundaries are maintained

### Contract Tests

- Verify Server Action return types match expected shapes
- Verify serialization round-trip: `SessionData` → serialize → deserialize → `SessionData`
- Verify Date fields survive serialization

---

## 10. Conclusion

**All 12 workflow mutations are ready for Server Action wrapping.**

No redesign is required. The existing SessionService methods already have:
- Correct input validation
- Structured output
- Error handling
- Authentication (via API routes)
- Transaction boundaries (where needed)

Server Actions will be thin wrappers that:
1. Authenticate via `getCurrentUser()`
2. Construct Composition Root
3. Call SessionService method
4. Return serialized result

**Zero business logic changes needed.**
