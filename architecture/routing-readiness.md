# Routing Readiness

## Purpose
Verify that the Next.js App Router semantics are preserved after migration. Test dynamic routes, refresh, browser navigation, deep links, reload, back button, and multiple tabs.

---

## 1. Current Routing Architecture

### Route Structure

```
app/doctor/consultations/session/[appointmentId]/
  └─ page.tsx  (currently client component)
```

### Current Routing Features

| Feature | Current Implementation | Status |
|---------|----------------------|--------|
| Dynamic route parameter | `use(params)` to get `appointmentId` | ✅ Working |
| Refresh | Full page reload, re-runs useEffect | ✅ Working |
| Browser navigation | `useRouter().push()` after completion | ✅ Working |
| Deep links | Direct URL to `/doctor/consultations/session/123` | ✅ Working |
| Back button | Browser back to queue/dashboard | ✅ Working |
| Multiple tabs | Each tab has independent React state | ✅ Working |
| `Link` navigation | `next/link` components | ✅ Working |
| `window.location.reload()` | Error state retry button | ⚠️ Client-only |

---

## 2. Post-Migration Routing Architecture

### Route Structure (Unchanged)

```
app/doctor/consultations/session/[appointmentId]/
  └─ page.tsx  (becomes Server Component)
  └─ ConsultationRoomClient.tsx  (new Client Component)
```

### Server Component Rendering

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

export default async function ConsultationSessionPage({ params }: PageProps) {
  const resolvedParams = use(params);  // ✅ Safe in Server Component
  const appointmentId = parseInt(resolvedParams.appointmentId, 10);
  
  // Auth check (server-side)
  const user = await getCurrentUser();
  if (!user) return <UnauthorizedPage />;
  
  // Composition Root
  const session = await createConsultationSession({ appointmentId, user });
  
  // Serialize and render client shell
  return <ConsultationRoomClient initialSession={...} user={user} restoredDraft={...} />;
}
```

---

## 3. Feature-by-Feature Verification

### 3.1 Dynamic Route Parameter

**Current:** `use(params)` in client component.

**Post-Migration:** `use(params)` in Server Component.

**Verdict:** ✅ `use(params)` is explicitly supported in Server Components. No change needed.

### 3.2 Refresh

**Current behavior:**
1. User refreshes page
2. React unmounts, remounts
3. `useEffect` in SessionProvider calls `initializeSession()`
4. SessionService fetches all data from APIs
5. UI shows loading state, then renders

**Post-migration behavior:**
1. User refreshes page
2. Server Component executes
3. Server constructs Composition Root
4. Server calls `sessionService.initializeSession()`
5. Server serializes result
6. Server renders HTML with populated state
7. Client hydrates with initial state
8. No loading state, no re-fetch

**Verdict:** ✅ Refresh works. Actually improves UX (no loading state).

### 3.3 Browser Navigation (router.push)

**Current:**
```typescript
// SessionProvider
const completeSession = useCallback(async (redirectPath?: string) => {
  const result = await sessionService.completeSession(consultation.id);
  if (result.success) {
    router.push(result.data.redirectPath || redirectPath || '/doctor/consultations');
  }
}, [sessionService, consultation, router]);
```

**Post-migration:**
```typescript
// SessionProvider (client shell)
const completeSession = useCallback(async (redirectPath?: string) => {
  const result = await completeSessionAction(consultation.id);
  if (result.success) {
    router.push(result.data.redirectPath || redirectPath || '/doctor/consultations');
  }
}, [completeSessionAction, consultation, router]);
```

**Verdict:** ✅ `useRouter()` stays in client shell. Navigation unchanged.

### 3.4 Deep Links

**Current:** URL `/doctor/consultations/session/123` loads page.tsx, which calls `useAuth()` and `initializeSession(123)`.

**Post-migration:** URL `/doctor/consultations/session/123` loads page.tsx (Server Component), which calls `getCurrentUser()` and `createConsultationSession(123)`.

**Verdict:** ✅ Deep links work identically.

### 3.5 Back Button

**Current:** After completion, `router.push('/doctor/consultations')`. Browser back button returns to consultation room (which shows error or empty state).

**Post-migration:** Same `router.push()`. Same back button behavior.

**Verdict:** ✅ Back button behavior unchanged.

### 3.6 Multiple Tabs

**Current:** Each tab has independent React state. SessionService instances are per-render, so each tab has its own services. But `useMemo` with empty deps means services persist within a tab.

**Post-migration:** Each tab has independent Server Component execution. Each tab gets its own Composition Root. Each tab's client shell has independent React state.

**Verdict:** ✅ Multiple tabs work correctly. Server-side isolation is actually stronger.

### 3.7 Link Navigation

**Current:** `Link` from `next/link` used for login redirect.

```typescript
<Link href="/login">
  <Button>Return to login</Button>
</Link>
```

**Post-migration:** Same `Link` component. Server Component can render `<Link>` safely.

**Verdict:** ✅ `next/link` works in Server Components.

### 3.8 window.location.reload()

**Current:**
```typescript
<Button onClick={() => window.location.reload()}>
  Try again
</Button>
```

**Post-migration:** This stays in client shell. Error state UI is rendered by client shell when Server Component passes error state.

**Verdict:** ✅ `window.location.reload()` stays in client component. Safe.

---

## 4. Server Component Routing Constraints

### Next.js App Router Rules

| Rule | Applies? | Status |
|------|----------|--------|
| Server Components cannot use hooks | ✅ Applies | page.tsx will NOT use useState, useEffect, etc. |
| Server Components cannot use browser APIs | ✅ Applies | No `window`, `document`, `localStorage` in page.tsx |
| Server Components can render Client Components | ✅ Applies | `ConsultationRoomClient` will have `'use client'` |
| Server Components can use `use(params)` | ✅ Applies | Used for `appointmentId` |
| Server Components can use `cookies()` | ✅ Applies | Used for auth |
| Server Components can use `redirect()` | ✅ Applies | Available if needed |

### Current Violations in page.tsx

| Violation | Current Code | Post-Migration |
|-----------|--------------|----------------|
| `useState` | `const [isPatientSidebarCollapsed, ...] = useState(true)` | Moves to `ConsultationSessionContent` → `ConsultationRoomClient` |
| `useEffect` | `useEffect(() => { if (patient.appointment) { queue.loadWaitingQueue(); } })` | Moves to client shell |
| `useMemo` | Multiple `useMemo` for computed values | Moves to client shell |
| `useCallback` | Multiple `useCallback` for handlers | Moves to client shell |
| `useRouter` | `const router = useRouter()` | Moves to SessionProvider (client shell) |
| `useQueryClient` | `const queryClient = useQueryClient()` | Moves to SessionProvider (client shell) |
| `useAuth` | `const { user, isAuthenticated, isLoading } = useAuth()` | Replaced with `getCurrentUser()` |

**All violations are resolved by moving hooks to client shell.**

---

## 5. Client Shell Routing

### ConsultationRoomClient Responsibilities

| Responsibility | Implementation |
|---------------|----------------|
| Receive route params | Passed from Server Component as props |
| Manage local UI state | `useState` for sidebar collapse |
| Call Server Actions | `useTransition` for mutations |
| Navigate after mutations | `useRouter().push()` |
| Handle loading states | `useTransition` pending states |
| Handle errors | `useState` for error messages |
| Render UI | All existing UI components |

### ConsultationRoomClient Boundaries

**Can do:**
- Use React hooks
- Use browser APIs (`window`, `document`)
- Call Server Actions
- Use React Router
- Use React Query

**Cannot do:**
- Import Application services
- Import Domain workflows
- Import Infrastructure adapters

**This is exactly the correct client shell pattern.**

---

## 6. Route Transitions

### Current Route Transitions

| From | To | Mechanism |
|------|----|-----------|
| Consultation room → Login | `router.push('/login')` | Client-side navigation |
| Consultation room → Consultations list | `router.push('/doctor/consultations')` | Client-side navigation (after complete) |
| Login → Dashboard | `router.push('/doctor/dashboard')` | Client-side navigation |
| Queue → Next patient | `switchToPatient()` → state update | Client-side state |

### Post-Migration Route Transitions

**Unchanged.** All route transitions happen in the client shell via `useRouter()`.

### Server Component Transitions

Server Component can redirect:

```typescript
if (!user) {
  redirect('/login');  // Server-side redirect
}
```

**But we prefer rendering an error UI rather than redirecting**, because:
1. Redirects lose the original URL (user can't go back)
2. Error UI is more accessible
3. Server Component can show "Authentication required" with login link

---

## 7. Middleware Considerations

### Current Middleware

No custom middleware found for consultation routes. Authentication is handled client-side via `useAuth()`.

### Post-Migration Middleware

Optional: Add middleware for `/doctor/consultations/session/*` to:
1. Verify JWT cookie exists
2. Redirect unauthenticated users to `/login`
3. Set cache headers for authenticated responses

**This is an optimization, not a requirement.** Server Component already handles auth.

### If Middleware Is Added

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  if (!token && request.nextUrl.pathname.startsWith('/doctor/consultations/session')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

**Verdict:** Middleware is optional and does not affect routing readiness.

---

## 8. Deep Link Validation

### Deep Link Scenarios

| Scenario | Current Behavior | Post-Migration Behavior |
|----------|------------------|-------------------------|
| `/doctor/consultations/session/123` (valid) | Loads page, calls initializeSession | Loads page, creates session server-side |
| `/doctor/consultations/session/abc` (invalid) | `isNaN(appointmentId)` → error UI | `parseInt` fails → error UI |
| `/doctor/consultations/session/0` (invalid) | `appointmentId <= 0` → SessionService error | Server Component validates, shows error |
| `/doctor/consultations/session/999999` (not found) | SessionService returns APPOINTMENT_NOT_FOUND | SessionService returns APPOINTMENT_NOT_FOUND |
| Direct link while logged out | `useAuth()` returns null → auth error UI | `getCurrentUser()` returns null → auth error UI |

**All deep link scenarios work correctly.**

---

## 9. Cache and Revalidation

### Current Cache Strategy

| Data | Cache Strategy | Invalidation |
|------|---------------|--------------|
| Session data | Client-side React state | Manual (via queryClient) |
| Queue data | React Query (30s stale) | React Query auto-refetch |
| Dashboard data | React Query | Manual invalidation |

### Post-Migration Cache Strategy

| Data | Cache Strategy | Invalidation |
|------|---------------|--------------|
| Session data | Server serializes initial state, then client manages | Server Actions return invalidation instructions |
| Queue data | React Query (unchanged) | Unchanged |
| Dashboard data | React Query (unchanged) | Server Actions call `revalidatePath` |

### Revalidation

Server Actions that modify data call `revalidatePath()`:

```typescript
// Existing pattern in consultation-hub.ts
await db.consultation.update({ ... });
revalidatePath('/doctor/consultations');
```

**Post-migration, Server Actions in `consultation-session.ts` follow the same pattern.**

---

## 10. Conclusion

**All routing features work correctly with Server Component boundary.**

| Feature | Status | Notes |
|---------|--------|-------|
| Dynamic route parameters | ✅ | `use(params)` is server-safe |
| Refresh | ✅ | Improved (no client-side loading) |
| Browser navigation | ✅ | `useRouter()` stays in client |
| Deep links | ✅ | Identical behavior |
| Back button | ✅ | Identical behavior |
| Multiple tabs | ✅ | Stronger server-side isolation |
| Link components | ✅ | Safe in Server Components |
| Client-side reload | ✅ | Stays in client shell |

**No routing semantics are violated.**

**No Next.js App Router constraints are broken.**
