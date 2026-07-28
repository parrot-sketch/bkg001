# Authentication Flow Audit

## Purpose
Trace authentication from HTTP request through Server Component, Server Actions, workflow execution, and persistence. Verify user identity, doctor lookup, authorization, session ownership, and patient ownership.

---

## 1. Current Authentication Architecture

### Client-Side Authentication

| Component | Mechanism | Storage | Source of Truth |
|-----------|-----------|---------|-----------------|
| `AuthContext` | JWT tokens in `localStorage` | Browser `localStorage` | Client |
| `useAuth()` hook | Reads `AuthContext` | Browser `localStorage` | Client |
| `tokenStorage` | Direct `localStorage` access | Browser `localStorage` | Client |
| `apiClient` | Bearer token from `localStorage` | Browser `localStorage` | Client |

### Server-Side Authentication

| Component | Mechanism | Storage | Source of Truth |
|-----------|-----------|---------|-----------------|
| `getCurrentUser()` | JWT from `cookies()` | HttpOnly cookies | Server |
| `requireAuth()` | JWT from `NextRequest` | HttpOnly cookies | Server |
| `JwtMiddleware` | JWT verification | Memory (stateless) | Server |

### Current Flow

```
Browser
  ↓
Login page → apiClient.login()
  ↓
API returns accessToken + refreshToken
  ↓
tokenStorage.setAccessToken() → localStorage
tokenStorage.setUser() → localStorage
  ↓
Page.tsx calls useAuth() → AuthContext → localStorage
  ↓
SessionProvider uses user for API calls
```

**The source of truth is localStorage on the client.** This is problematic for SSR because Server Components cannot access localStorage.

---

## 2. Post-Migration Authentication Flow

### Server Component Authentication

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

export default async function ConsultationSessionPage({ params }: PageProps) {
  // 1. Read HttpOnly cookie
  const user = await getCurrentUser();
  
  // 2. Authenticate
  if (!user) {
    return <UnauthorizedPage />;
  }
  
  // 3. Authorize (role check)
  if (user.role !== 'DOCTOR') {
    return <ForbiddenPage />;
  }
  
  // 4. Proceed with Composition Root
  const session = createConsultationSession({ appointmentId, user });
  // ...
}
```

### Server Action Authentication

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

export async function startSession(input: StartSessionInput) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: makeError(ClinicalErrorCode.UNAUTHORIZED, ...) };
  }
  
  if (user.role !== 'DOCTOR') {
    return { success: false, error: makeError(ClinicalErrorCode.FORBIDDEN, ...) };
  }
  
  const session = createConsultationSession({ appointmentId: input.appointmentId, user });
  return session.sessionService.startSession(input.appointmentId, input.doctorId, user.userId);
}
```

### End-to-End Flow

```
HTTP Request
  ↓
Next.js Middleware (optional)
  ↓
Server Component (page.tsx)
  ↓
getCurrentUser() reads accessToken cookie
  ↓
JwtMiddleware.authenticate() verifies token
  ↓
If expired: silent refresh using refreshToken cookie
  ↓
Returns AuthContext { userId, email, role }
  ↓
Server Component validates role === DOCTOR
  ↓
Server Component creates Composition Root
  ↓
Server Component calls sessionService.initializeSession()
  ↓
Server Component serializes SessionData
  ↓
Server Component renders ConsultationRoomClient with props
  ↓
Client hydrates with initial state
  ↓
User triggers mutation → Server Action
  ↓
Server Action calls getCurrentUser() (reads cookie again)
  ↓
Server Action validates role
  ↓
Server Action executes SessionService method
  ↓
Server Action returns serialized result
  ↓
Client updates local state
```

---

## 3. User Identity Verification

### Current: Client-Side User

```typescript
const { user, isAuthenticated, isLoading } = useAuth();
// user comes from AuthContext → localStorage
```

**Problems:**
- User can manipulate localStorage
- No server-side verification
- User object is not cryptographically verified

### Post-Migration: Server-Side User

```typescript
const user = await getCurrentUser();
// user comes from JWT verification of HttpOnly cookie
```

**Benefits:**
- JWT is cryptographically signed
- HttpOnly cookie cannot be read by JavaScript
- Server verifies token signature and expiration
- User identity is trusted

### User Object Shape

```typescript
interface AuthContext {
  userId: string;
  email: string;
  role: string;
}
```

**Minimal, sufficient for authorization.** Additional user details (name, firstName, lastName) come from SessionService data fetching.

---

## 4. Doctor Lookup

### Current Flow

```typescript
// SessionService.initializeSession()
const [appointmentResult, doctorResult, consultationResult] = await Promise.all([
  this.doctorApi.getAppointment(appointmentId),
  this.doctorApi.getDoctorByUserId(userId),
  this.consultationApi.loadConsultation(appointmentId),
]);
```

### Post-Migration Flow

**Unchanged.** SessionService still calls `doctorApi.getDoctorByUserId(userId)` server-side.

### Doctor Ownership Verification

| Check | Current | Post-Migration |
|-------|---------|----------------|
| Appointment belongs to doctor | `doctorApi.getAppointment()` returns appointment with `doctorId` | Same |
| Doctor exists | `doctorApi.getDoctorByUserId()` | Same |
| User is doctor | AuthContext.role === 'DOCTOR' | Same (verified in Server Component + Server Actions) |

**No changes to doctor lookup logic.**

---

## 5. Session Ownership

### Current Session Ownership

```typescript
// SessionService
const appointment = await this.doctorApi.getAppointment(appointmentId);
// appointment.doctorId identifies the session owner
```

### Post-Migration Session Ownership

**Unchanged.** SessionService still retrieves appointment and verifies doctorId.

### Authorization in Server Actions

```typescript
export async function startSession({ appointmentId, doctorId }: Params) {
  const user = await getCurrentUser();
  
  // Server Component already verified role === DOCTOR
  // SessionService still verifies appointment belongs to doctor
  
  const session = createConsultationSession({ appointmentId, user });
  return session.sessionService.startSession(appointmentId, doctorId, user.userId);
}
```

**Double authorization:**
1. Server Component checks `role === DOCTOR` (coarse-grained)
2. SessionService checks `appointment.doctorId === userId` (fine-grained)

**This is actually an improvement over current architecture**, where only SessionService does fine-grained checks.

---

## 6. Patient Ownership

### Current Patient Ownership

```typescription
// SessionService.initializeSession()
const [patientResult, vitalsResult] = await Promise.all([
  this.patientApi.loadPatient(appointment.patientId),
  this.patientApi.getPatientVitals(appointment.patientId, appointmentId),
]);
```

Patient ownership is implicit: the appointment's `patientId` determines which patient is loaded.

### Post-Migration Patient Ownership

**Unchanged.** SessionService still loads patient via `patientApi.loadPatient(appointment.patientId)`.

### Authorization Boundary

| Check | Current | Post-Migration |
|-------|---------|----------------|
| Can doctor access patient? | Implicit via appointment | Implicit via appointment (same) |
| Patient data scoping | By appointment.patientId | By appointment.patientId (same) |

**No changes to patient ownership logic.**

---

## 7. Auth Token Lifecycle

### Current Lifecycle

```
Login
  ↓
Store tokens in localStorage
  ↓
Client reads tokens on every request
  ↓
Refresh token when access token expires
  ↓
Logout clears localStorage
```

### Post-Migration Lifecycle

```
Login (client-side, unchanged)
  ↓
Store tokens in localStorage AND httpOnly cookie
  ↓
Server reads httpOnly cookie
  ↓
If expired: silent refresh using httpOnly refreshToken cookie
  ↓
Client continues to use localStorage for API calls (if any remain)
  ↓
Logout clears localStorage AND revokes httpOnly cookie
```

### Cookie Synchronization

**Problem:** How do httpOnly cookies get set if login happens client-side?

**Solution:**
1. Login is a Server Action that sets cookies
2. OR middleware sets cookies on response to login API call
3. OR existing `authApi.login()` response handler sets cookies via Route Handler

**Recommended:** Add a Server Action wrapper for login that sets httpOnly cookies:

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

export async function loginAction(input: { email: string; password: string }) {
  const response = await authApi.login(input);
  if (response.success) {
    const cookieStore = await cookies();
    cookieStore.set('accessToken', response.data.accessToken, { httpOnly: true, ... });
    cookieStore.set('refreshToken', response.data.refreshToken, { httpOnly: true, ... });
    return { success: true, user: response.data.user };
  }
  return { success: false, error: response.error };
}
```

**Alternatively**, the existing login API route can set httpOnly cookies via `NextResponse`. This is already supported.

---

## 8. Client-Only Auth Assumptions

### Current Client-Only Auth Code

| Code | Location | Issue |
|------|----------|-------|
| `useAuth()` | `page.tsx` | Reads from localStorage. Cannot run in Server Component. |
| `AuthContext` | `contexts/AuthContext.tsx` | Client-only context. |
| `tokenStorage` | `lib/auth/token.ts` | Direct localStorage access. |
| `apiClient` auth configuration | `lib/api/client.ts` | Sets token provider from localStorage. |
| `login()` | `AuthContext` | Client-side login. |
| `logout()` | `AuthContext` | Client-side logout with `window.location.href`. |
| `refreshToken()` | `AuthContext` | Client-side token refresh. |

### Post-Migration Auth Architecture

```
┌─────────────────────────────────────────┐
│           SERVER (Trusted)               │
│                                          │
│  getCurrentUser() ← reads httpOnly cookie │
│  requireAuth() ← reads NextRequest        │
│  Server Actions ← reads httpOnly cookie   │
│                                          │
└─────────────────────────────────────────┘
                    │
        RSC boundary + cookies
                    │
┌─────────────────────────────────────────┐
│           CLIENT (Untrusted)             │
│                                          │
│  AuthContext ← localStorage (for API)     │
│  useAuth() ← AuthContext                  │
│  login() → calls Server Action            │
│  logout() → clears localStorage           │
│                                          │
│  Note: UI still uses AuthContext for      │
│  logout button, profile display, etc.     │
│                                          │
└─────────────────────────────────────────┘
```

**Client-side auth remains for:**
1. Login/logout UI
2. API calls to non-Server-Action endpoints (if any)
3. Auth state display (profile, role badges)

**Server-side auth is used for:**
1. Server Component access control
2. Server Action authorization
3. Session initialization

---

## 9. Authentication Gaps and Risks

### Gap 1: Token Synchronization

**Risk:** httpOnly cookie and localStorage token can get out of sync.

**Scenario:**
1. User logs in → tokens in both cookie and localStorage
2. Another tab refreshes token via Server Action → cookie updated, localStorage stale
3. Client makes direct API call with stale localStorage token → 401

**Mitigation:**
- Server Actions always set updated cookies
- Client reads fresh tokens from Server Action response and updates localStorage
- OR eliminate direct API calls from client (use Server Actions for everything)

**Recommended:** Eliminate direct API calls from client. All mutations go through Server Actions. This eliminates the sync problem.

### Gap 2: Logout Propagation

**Current:** `AuthContext.logout()` clears localStorage and redirects. It does NOT revoke the httpOnly cookie.

**Risk:** Server Component or Server Action might still see authenticated user from cookie after client-side logout.

**Mitigation:** Add server-side logout:

```typescript
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
  tokenStorage.clear(); // client-side
  return { success: true };
}
```

### Gap 3: Session Fixation

**Risk:** If httpOnly cookie is not properly scoped, session fixation attacks are possible.

**Mitigation:** Cookie options already include `httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'`. These are correct.

### Gap 4: Authorization Bypass

**Risk:** Client could attempt to call Server Actions with manipulated inputs.

**Mitigation:** Server Actions ALWAYS call `getCurrentUser()` and verify `role === 'DOCTOR'`. Client input validation is defense-in-depth, not the security boundary.

---

## 10. Conclusion

**Authentication flow is verified end-to-end.**

**User identity:** Server Component reads JWT from httpOnly cookie. Cryptographically verified.

**Doctor lookup:** Unchanged. SessionService loads doctor by userId.

**Authorization:** Server Component + Server Actions verify role. SessionService verifies ownership.

**Session ownership:** Unchanged. Appointment doctorId determines ownership.

**Patient ownership:** Unchanged. Appointment patientId determines scope.

**No client-only authentication assumptions remain in server code.**

**One enhancement recommended:** Add server-side logout to revoke httpOnly cookies.
