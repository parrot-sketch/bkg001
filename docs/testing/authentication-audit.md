# Authentication & RBAC System Audit

## Current State Analysis

### 🔴 CRITICAL ISSUE: Authentication System Conflict

The application has **two conflicting authentication systems**:

1. **JWT-Based Auth (Application Layer)** ✅ Working
   - Login page uses JWT (`app/patient/login/page.tsx`)
   - `useAuth` hook manages JWT tokens
   - `AuthController` generates JWT tokens
   - Tokens stored in localStorage

2. **Clerk Auth (Infrastructure Layer)** ⚠️ Conflicting
   - Root layout wraps app in `<ClerkProvider>` (`app/layout.tsx`)
   - Middleware uses `clerkMiddleware` (`middleware.ts`)
   - Expects Clerk sessions, not JWT tokens

**Result**: Users can login with JWT, but middleware can't verify them because it's looking for Clerk sessions.

---

## Login Page Analysis

### ✅ Branding Status: **GOOD**

**What's Working:**
- ✅ Nairobi Sculpt logo with gradient (`nairobi-gradient` class)
- ✅ Brand colors defined in CSS variables:
  - Primary: `#1a1a2e` (Deep Navy)
  - Accent: `#d4af37` (Gold)
- ✅ Typography: Inter (body) + Playfair Display (headings)
- ✅ Clean, professional layout
- ✅ Responsive design

**What's Missing:**
- ⚠️ No "Forgot Password" link
- ⚠️ No loading spinner (only button disabled state)
- ⚠️ Role-specific login pages (only `/patient/login` exists)
- ⚠️ No password visibility toggle

### 📋 Login Page Code Review

```tsx
// app/patient/login/page.tsx
- Uses useAuth hook ✅
- Calls authApi.login() ✅
- Stores JWT tokens ✅
- Redirects to /patient/dashboard ✅
- Shows toast notifications ✅
- Has Nairobi Sculpt branding ✅
```

---

## Authentication Flow Analysis

### Current Flow (JWT-Based)

```
1. User enters email/password
   ↓
2. handleSubmit() calls login(email, password)
   ↓
3. useAuth.login() calls authApi.login()
   ↓
4. POST /api/auth/login
   ↓
5. AuthController.login() → LoginUseCase
   ↓
6. JWT tokens generated (accessToken + refreshToken)
   ↓
7. Tokens returned to frontend
   ↓
8. tokenStorage.setAccessToken() stores in localStorage
   ↓
9. tokenStorage.setUser() stores user data
   ↓
10. router.push('/patient/dashboard')
   ↓
11. Middleware checks... ❌ (Clerk, not JWT)
```

### What Should Happen

```
11. Middleware extracts JWT from Authorization header ✅
12. JwtMiddleware.verifyToken() validates token ✅
13. Role extracted from token payload ✅
14. Route access checked against role ✅
15. Access granted/denied ✅
```

---

## RBAC (Role-Based Access Control) Analysis

### Route Access Rules (`lib/routes.ts`)

```typescript
"/admin(.*)": ["admin"],
"/patient(.*)": ["patient", "admin", "doctor", "nurse"],
"/doctor(.*)": ["doctor"],
"/staff(.*)": ["nurse", "lab_technician", "cashier"],
```

**Status**: ✅ Rules are well-defined

### RBAC Middleware (`controllers/middleware/RbacMiddleware.ts`)

**Status**: ✅ Logic exists and works in controllers

**Permissions Defined:**
- ADMIN: Full access
- DOCTOR: Appointments, consultations, patient records (read)
- NURSE: Check-in, vitals, patient records (read)
- FRONTDESK: Patient creation, check-in, scheduling
- PATIENT: Own records and appointments

### Next.js Middleware (`middleware.ts`)

**Status**: ❌ **BROKEN** - Uses Clerk instead of JWT

**Current Code:**
```typescript
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth(); // ❌ Clerk
  const role = sessionClaims?.metadata?.role; // ❌ Won't work with JWT
  // ...
});
```

**Problem**: 
- Expects Clerk session
- Application uses JWT
- Route protection won't work

---

## User Context Management

### ✅ `useAuth` Hook (`hooks/patient/useAuth.ts`)

**Status**: **EXCELLENT**

**Features:**
- ✅ Manages user state (user, isAuthenticated, isLoading)
- ✅ Login/logout/register functions
- ✅ Token refresh mechanism
- ✅ Automatic API client token injection
- ✅ Cleanup on logout

**User State:**
```typescript
{
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### ✅ Token Storage (`lib/auth/token.ts`)

**Status**: **GOOD**

**Storage Keys:**
- `hims_access_token` - JWT access token
- `hims_refresh_token` - JWT refresh token
- `hims_user` - User data (JSON)

**Functions:**
- ✅ `setAccessToken()` / `getAccessToken()`
- ✅ `setRefreshToken()` / `getRefreshToken()`
- ✅ `setUser()` / `getUser()`
- ✅ `clear()` - Cleans up all tokens
- ✅ `isAuthenticated()` - Checks if token exists

### ⚠️ Token Refresh

**Status**: **PARTIAL**

- ✅ Refresh function exists in `useAuth`
- ⚠️ No automatic refresh before expiry
- ⚠️ No refresh on API 401 responses
- ⚠️ Manual refresh only

---

## Protection Mechanisms

### Page-Level Protection

**Status**: ✅ **WORKING** (Client-side)

Each dashboard page checks authentication:

```tsx
if (!isAuthenticated || !user) {
  return <RedirectToLogin />;
}
```

**Examples:**
- `app/patient/dashboard/page.tsx` ✅
- `app/doctor/dashboard/page.tsx` ✅
- `app/admin/dashboard/page.tsx` ✅

### Route-Level Protection

**Status**: ❌ **BROKEN** (Middleware)

- Middleware uses Clerk (doesn't match JWT)
- Route protection may not work
- Unauthorized users might access protected routes

### API-Level Protection

**Status**: ✅ **WORKING**

- Controllers use `JwtMiddleware` to verify tokens
- RBAC middleware checks permissions
- API endpoints properly protected

---

## Issues Summary

### 🔴 Critical Issues

1. **Middleware Authentication Mismatch**
   - Middleware uses Clerk
   - Application uses JWT
   - Route protection broken

2. **ClerkProvider in Root Layout**
   - Wraps entire app
   - Not used by application
   - Creates confusion

### ⚠️ Medium Issues

3. **No Automatic Token Refresh**
   - Manual refresh only
   - No expiry handling
   - Users may get logged out unexpectedly

4. **Role-Specific Login Pages**
   - Only `/patient/login` exists
   - Other roles need separate pages or unified login

5. **No Session Management**
   - No timeout warnings
   - No multi-tab sync
   - No "Remember Me"

### ✅ Minor Issues

6. **Login Page UX**
   - No "Forgot Password"
   - No password visibility toggle
   - Loading state could be better

---

## Recommendations

### Priority 1: Fix Middleware (CRITICAL)

**Action**: Replace Clerk middleware with JWT-based middleware

**Steps:**
1. Remove `ClerkProvider` from `app/layout.tsx`
2. Update `middleware.ts` to use JWT verification
3. Extract role from JWT token payload
4. Enforce route access rules

**Impact**: Route protection will work correctly

### Priority 2: Unified Login Page

**Action**: Create role-agnostic login or role selection

**Options:**
- Option A: Single login page with role selection dropdown
- Option B: Unified login that detects role from email/domain
- Option C: Keep separate pages but share components

**Impact**: Better UX, easier maintenance

### Priority 3: Automatic Token Refresh

**Action**: Implement automatic refresh before expiry

**Implementation:**
- Intercept API responses for 401 errors
- Automatically refresh token
- Retry original request

**Impact**: Better user experience, fewer logouts

### Priority 4: Enhanced Login UX

**Action**: Add missing features

- Forgot Password link
- Password visibility toggle
- Better loading states
- Remember Me checkbox

**Impact**: Improved user experience

---

## Testing Status

### ✅ What Can Be Tested Now

- Login page UI and branding
- JWT token generation
- Token storage in localStorage
- User context in React components
- Client-side route protection
- API authentication

### ❌ What Cannot Be Tested Properly

- Next.js middleware route protection (broken)
- Automatic role-based redirects (middleware issue)
- Token verification in middleware (Clerk mismatch)

### 📋 Test Coverage Needed

- [ ] End-to-end login flow
- [ ] Route protection enforcement
- [ ] Role-based access control
- [ ] Token refresh mechanism
- [ ] Logout and cleanup
- [ ] Unauthorized access handling
- [ ] Multi-role login scenarios

---

## Files Requiring Updates

### Critical Updates

1. **`middleware.ts`** - Replace Clerk with JWT
2. **`app/layout.tsx`** - Remove ClerkProvider (or make optional)
3. **`package.json`** - Remove `@clerk/nextjs` if not needed

### Optional Updates

4. **`app/patient/login/page.tsx`** - Enhance UX
5. **`hooks/patient/useAuth.ts`** - Add auto-refresh
6. **`lib/auth/token.ts`** - Add session management

---

## Next Steps

1. **Immediate**: Document the conflict and create fix plan
2. **Short-term**: Fix middleware to use JWT
3. **Medium-term**: Add comprehensive E2E tests
4. **Long-term**: Enhance UX and add session management

---

## Conclusion

The authentication system has a **solid foundation** with JWT-based auth in the application layer, but the **middleware layer is broken** due to Clerk/JWT mismatch. Once fixed, the system will have:

- ✅ Secure JWT-based authentication
- ✅ Proper RBAC enforcement
- ✅ Clean user context management
- ✅ Role-based route protection

**Current Status**: ⚠️ **FUNCTIONAL BUT INCOMPLETE** - Login works, but route protection may not.
