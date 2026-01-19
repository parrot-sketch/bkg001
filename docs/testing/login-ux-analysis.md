# Login Page UX & Authentication Analysis

## Current State Assessment

### ✅ Login Page Branding

**Status: PARTIALLY IMPLEMENTED**

The login page (`app/patient/login/page.tsx`) includes:
- ✅ Nairobi Sculpt logo/branding (NS logo with gradient)
- ✅ Brand colors defined in `globals.css`:
  - Primary: Deep Navy `#1a1a2e` (--primary)
  - Accent: Gold `#d4af37` (--accent)
  - Typography: Inter + Playfair Display
- ✅ Gradient class `nairobi-gradient` defined in `globals.css`
- ✅ Clean, professional layout
- ✅ Responsive design

**Issues Found:**
- ⚠️ Login page is role-specific (`/patient/login`) - other roles may need separate login pages
- ⚠️ No visual feedback for loading states (only button disabled)
- ⚠️ No "Forgot Password" functionality visible

### ⚠️ Authentication System

**Status: CONFLICT DETECTED**

**Current Implementation:**
1. **JWT-Based Auth (Application Layer):**
   - ✅ `AuthController` uses JWT tokens
   - ✅ `useAuth` hook manages JWT tokens in localStorage
   - ✅ `tokenStorage` utilities for token management
   - ✅ Login API endpoint: `POST /api/auth/login`
   - ✅ Token refresh mechanism implemented

2. **Clerk Middleware (Route Protection):**
   - ⚠️ `middleware.ts` uses `@clerk/nextjs/server`
   - ⚠️ Expects Clerk session claims for role-based access
   - ⚠️ **CONFLICT**: Application uses JWT, but middleware expects Clerk

**The Problem:**
- Login page authenticates via JWT and stores tokens in localStorage
- Middleware checks for Clerk sessions (which don't exist)
- This means route protection may not work correctly
- Users can login but may be blocked by middleware

**Recommendation:**
Replace Clerk middleware with JWT-based middleware that:
- Reads JWT token from Authorization header or cookies
- Verifies token using `JwtMiddleware`
- Extracts role from JWT payload
- Enforces route access based on role

### ⚠️ Role-Based Access Control (RBAC)

**Status: PARTIALLY IMPLEMENTED**

**Current State:**
1. **Route Access Rules** (`lib/routes.ts`):
   ```typescript
   "/admin(.*)": ["admin"],
   "/patient(.*)": ["patient", "admin", "doctor", "nurse"],
   "/doctor(.*)": ["doctor"],
   // etc.
   ```

2. **RBAC Middleware** (`controllers/middleware/RbacMiddleware.ts`):
   - ✅ Permission checking logic exists
   - ✅ Resource-action-role mapping
   - ✅ Used in controllers for fine-grained permissions

3. **Middleware Integration** (`middleware.ts`):
   - ⚠️ Uses Clerk, not JWT
   - ⚠️ Role extraction from Clerk session (won't work with JWT)
   - ⚠️ Route protection may not function correctly

**Issues:**
- Route access rules exist but middleware can't read JWT roles
- RBAC logic exists in controllers but not in Next.js middleware
- No unified permission checking across the stack

### ✅ User Context Management

**Status: WELL IMPLEMENTED**

**Current Implementation:**
1. **`useAuth` Hook** (`hooks/patient/useAuth.ts`):
   - ✅ Manages user state (user, isAuthenticated, isLoading)
   - ✅ Login/logout/register functions
   - ✅ Token refresh mechanism
   - ✅ Automatic token storage in localStorage
   - ✅ API client token injection

2. **Token Storage** (`lib/auth/token.ts`):
   - ✅ Access token storage
   - ✅ Refresh token storage
   - ✅ User data storage (id, email, role, firstName, lastName)
   - ✅ Clear/cleanup functions
   - ✅ Authentication check

3. **User Context Flow:**
   ```
   Login → API Call → JWT Tokens → localStorage → useAuth Hook → User State
   ```

**Strengths:**
- Clean separation of concerns
- Type-safe user data
- Automatic API client configuration
- Proper cleanup on logout

**Potential Issues:**
- No automatic token refresh on expiry
- No session timeout handling
- No multi-tab synchronization

## Recommendations

### 1. Fix Middleware Authentication

**Priority: CRITICAL**

Replace Clerk middleware with JWT-based middleware:

```typescript
// middleware.ts (proposed fix)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JwtMiddleware } from './controllers/middleware/JwtMiddleware';
import { routeAccess } from './lib/routes';

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip middleware for public routes
  if (pathname.startsWith('/api/auth/login') || 
      pathname.startsWith('/api/auth/register') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/public')) {
    return NextResponse.next();
  }

  // Extract JWT token from Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || 
                request.cookies.get('accessToken')?.value;

  if (!token) {
    // Redirect to login if no token
    if (pathname.startsWith('/patient') || 
        pathname.startsWith('/doctor') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/nurse') ||
        pathname.startsWith('/frontdesk')) {
      return NextResponse.redirect(new URL('/patient/login', url.origin));
    }
    return NextResponse.next();
  }

  // Verify token and extract role
  try {
    const jwtMiddleware = new JwtMiddleware(/* authService */);
    const authContext = await jwtMiddleware.verifyToken(token);
    const role = authContext.role.toLowerCase();

    // Check route access
    const matchingRoute = Object.keys(routeAccess).find(route => {
      const regex = new RegExp(route.replace('(.*)', '.*'));
      return regex.test(pathname);
    });

    if (matchingRoute) {
      const allowedRoles = routeAccess[matchingRoute];
      if (!allowedRoles.includes(role)) {
        // Redirect to role-appropriate dashboard
        return NextResponse.redirect(new URL(`/${role}/dashboard`, url.origin));
      }
    }

    // Add user context to request headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', authContext.userId);
    response.headers.set('x-user-role', authContext.role);
    return response;
  } catch (error) {
    // Invalid token - redirect to login
    return NextResponse.redirect(new URL('/patient/login', url.origin));
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### 2. Enhance Login Page UX

**Priority: HIGH**

- Add loading spinner during authentication
- Add "Forgot Password" link
- Add role-specific login pages or unified login with role selection
- Improve error message display
- Add password visibility toggle

### 3. Implement Token Refresh

**Priority: MEDIUM**

- Automatic token refresh before expiry
- Refresh token rotation
- Handle refresh failures gracefully

### 4. Add Session Management

**Priority: MEDIUM**

- Session timeout warnings
- Multi-tab synchronization
- "Remember me" functionality

## Testing Checklist

### Login Page UX Tests
- [ ] Branding colors match Nairobi Sculpt palette
- [ ] Typography (Inter + Playfair Display) applied correctly
- [ ] Logo/branding visible and styled
- [ ] Form validation works (email format, required fields)
- [ ] Loading states display during authentication
- [ ] Error messages are clear and helpful
- [ ] Success redirects to correct dashboard
- [ ] Responsive on mobile devices
- [ ] Accessible (keyboard navigation, ARIA labels)

### Authentication Tests
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] JWT tokens stored in localStorage
- [ ] User data stored correctly
- [ ] Logout clears tokens and user data
- [ ] Token refresh works
- [ ] Expired tokens handled gracefully

### RBAC Tests
- [ ] Patient can access `/patient/*` routes
- [ ] Doctor can access `/doctor/*` routes
- [ ] Admin can access `/admin/*` routes
- [ ] Unauthorized access redirects appropriately
- [ ] Role-based dashboard redirects work
- [ ] API endpoints enforce role permissions

### User Context Tests
- [ ] User state persists across page reloads
- [ ] User context available in all protected routes
- [ ] User data updates correctly after profile changes
- [ ] Multiple tabs stay synchronized
