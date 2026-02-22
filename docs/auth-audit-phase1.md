# Phase 1: Authentication Code Audit

**Date:** 2024-12-19  
**Scope:** Login-only authentication system (no self-registration)  
**Goal:** Map all auth-related code and determine keep/refactor/delete actions

---

## Audit Results Table

| File Path | Purpose | Used by Login? | Action | Notes |
|-----------|---------|----------------|--------|-------|
| **UI PAGES** |
| `app/(auth)/login/page.tsx` | Unified login page for all roles | ✅ YES | **KEEP** | Core login UI - needs refactor for clean code |
| `app/(auth)/patient/login/page.tsx` | Patient-specific login page | ❌ NO | **DELETE** | Duplicate/unused - unified login exists |
| `app/(auth)/patient/register/page.tsx` | Patient self-registration page | ❌ NO | **DELETE** | Registration not allowed - remove entirely |
| **API ROUTES** |
| `app/api/auth/login/route.ts` | POST /api/auth/login endpoint | ✅ YES | **REFACTOR** | Core login route - needs Zod validation, remove `any`, standardize response |
| `app/api/auth/logout/route.ts` | POST /api/auth/logout endpoint | ✅ YES | **KEEP** | Used by login flow (logout after login) - minor refactor |
| `app/api/auth/refresh/route.ts` | POST /api/auth/refresh endpoint | ✅ YES | **KEEP** | Token refresh - minor refactor |
| `app/api/auth/register/route.ts` | POST /api/auth/register (backward compat) | ❌ NO | **DELETE** | Public registration - not allowed |
| `app/api/auth/register/public/route.ts` | POST /api/auth/register/public | ❌ NO | **DELETE** | Public registration - not allowed |
| **USE CASES** |
| `application/use-cases/LoginUseCase.ts` | Login business logic orchestration | ✅ YES | **KEEP** | Core use case - verify clean code compliance |
| `application/use-cases/LogoutUseCase.ts` | Logout business logic | ✅ YES | **KEEP** | Used by login flow - verify clean code |
| `application/use-cases/RefreshTokenUseCase.ts` | Token refresh business logic | ✅ YES | **KEEP** | Used by login flow - verify clean code |
| `application/use-cases/RegisterPublicUserUseCase.ts` | Public user registration | ❌ NO | **DELETE** | Registration not allowed |
| `application/use-cases/RegisterUserUseCase.ts` | Admin user registration | ❌ NO | **DELETE** | Self-registration not allowed (admin creates users) |
| **SERVICES** |
| `infrastructure/auth/JwtAuthService.ts` | JWT authentication service implementation | ✅ YES | **REFACTOR** | Core service - check for `any`, long functions, split responsibilities |
| `domain/interfaces/services/IAuthService.ts` | Auth service interface (port) | ✅ YES | **KEEP** | Domain interface - verify completeness |
| `infrastructure/auth/AuthFactory.ts` | Factory for creating auth use cases | ✅ YES | **KEEP** | Dependency injection - verify clean |
| `infrastructure/auth/mappers/UserMapper.ts` | User entity mapping | ✅ YES | **KEEP** | Used by login - verify clean |
| **MIDDLEWARE & HELPERS** |
| `lib/auth/middleware.ts` | JWT middleware for route protection | ✅ YES | **KEEP** | Core middleware - verify clean code |
| `lib/auth/jwt-helper.ts` | JWT helper functions | ✅ YES | **KEEP** | Used by login routes - verify clean |
| `lib/auth/server-auth.ts` | Server-side auth utilities | ✅ YES | **KEEP** | Used by login - verify clean |
| `lib/auth/rbac.ts` | Role-based access control | ✅ YES | **KEEP** | Used by login flow - verify clean |
| `lib/auth/token.ts` | Token storage utilities | ✅ YES | **KEEP** | Used by login - verify clean |
| `lib/auth/types.ts` | Auth type definitions | ✅ YES | **KEEP** | Type definitions - verify completeness |
| **API CLIENTS** |
| `lib/api/auth.ts` | Frontend auth API client | ✅ YES | **REFACTOR** | Has `register()` method - remove it, keep only login/logout/refresh |
| **DTOs** |
| `application/dtos/LoginDto.ts` | Login request/response DTOs | ✅ YES | **REFACTOR** | Add Zod validation schema |
| `application/dtos/RegisterUserDto.ts` | Registration DTOs | ❌ NO | **DELETE** | Registration not allowed |
| `application/dtos/PublicRegisterUserDto.ts` | Public registration DTOs | ❌ NO | **DELETE** | Registration not allowed |
| `application/dtos/RefreshTokenDto.ts` | Refresh token DTOs | ✅ YES | **REFACTOR** | Add Zod validation schema |
| **REPOSITORIES** |
| `infrastructure/database/repositories/PrismaUserRepository.ts` | User repository implementation | ✅ YES | **KEEP** | Used by login - verify clean code |
| `domain/interfaces/repositories/IUserRepository.ts` | User repository interface | ✅ YES | **KEEP** | Domain interface - verify completeness |
| **COMPONENTS** |
| `components/auth/PasswordInput.tsx` | Password input component | ✅ YES | **KEEP** | Used by login page - verify clean |
| **HOOKS** |
| `hooks/patient/useAuth.ts` | Auth hook (delegates to AuthContext) | ✅ YES | **REFACTOR** | Check if has register method - remove it |
| **TESTS** |
| `tests/unit/auth/LoginUseCase.test.ts` | Login use case unit tests | ✅ YES | **KEEP** | Core tests - verify coverage |
| `tests/unit/auth/LogoutUseCase.test.ts` | Logout use case unit tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/unit/auth/RefreshTokenUseCase.test.ts` | Refresh token use case tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/unit/auth/RegisterPublicUserUseCase.test.ts` | Public registration tests | ❌ NO | **DELETE** | Registration not allowed |
| `tests/unit/auth/AuthFactory.test.ts` | Auth factory tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/integration/auth/login.route.test.ts` | Login route integration tests | ✅ YES | **KEEP** | Core tests - verify coverage |
| `tests/integration/auth/refresh.route.test.ts` | Refresh route integration tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/e2e/auth/login-ux.spec.ts` | Login E2E tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/e2e/auth/jwt-authentication.spec.ts` | JWT auth E2E tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/e2e/auth/session-management.spec.ts` | Session management E2E tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/e2e/auth/cookie-verification.spec.ts` | Cookie verification E2E tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/e2e/auth/error-handling.spec.ts` | Error handling E2E tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/e2e/auth/rbac-route-protection.spec.ts` | RBAC route protection E2E tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/e2e/auth/api-protection.spec.ts` | API protection E2E tests | ✅ YES | **KEEP** | Verify coverage |
| `tests/e2e/auth/dashboard-integration.spec.ts` | Dashboard integration E2E tests | ✅ YES | **KEEP** | Verify coverage |
| **PRISMA MODELS** |
| `prisma/schema.prisma` (User model) | User database model | ✅ YES | **KEEP** | Core model - verify fields needed for login |
| `prisma/schema.prisma` (RefreshToken model) | Refresh token database model | ✅ YES | **KEEP** | Used by login flow |
| **NAVIGATION/LINKS** |
| Login page register link | Link to `/patient/register` | ❌ NO | **DELETE** | Remove "Create account" link from login page |
| Patient register page | Entire page | ❌ NO | **DELETE** | Remove registration page |

---

## Summary Statistics

- **Total Files Audited:** 40+
- **Files Used by Login:** 28
- **Files to Keep:** 24
- **Files to Refactor:** 6
- **Files to Delete:** 10

---

## Key Findings

### 1. **Registration Code Present**
- Two registration API routes exist (`/api/auth/register` and `/api/auth/register/public`)
- Two registration use cases exist (`RegisterPublicUserUseCase`, `RegisterUserUseCase`)
- Registration UI page exists (`app/(auth)/patient/register/page.tsx`)
- Registration DTOs exist (`RegisterUserDto`, `PublicRegisterUserDto`)
- Registration tests exist
- **Action:** All must be deleted

### 2. **Clean Code Violations**
- `app/api/auth/login/route.ts` uses `any` type (line 95)
- No Zod validation in login route (manual validation)
- `lib/api/auth.ts` includes `register()` method (should be removed)
- `hooks/patient/useAuth.ts` may include register method (needs check)
- Long functions in `JwtAuthService.ts` (needs splitting)
- **Action:** Refactor to remove `any`, add Zod, split functions

### 3. **Missing Features**
- No rate limiting on login endpoint
- No audit logging for login attempts (LOGIN_SUCCESS, LOGIN_FAILED)
- Inconsistent error codes (should be 401 for invalid creds, 429 for rate limit, 500 for unexpected)
- No standardized `ApiResult<T>` response shape
- **Action:** Add in Phase 2-3

### 4. **Test Coverage**
- Login use case has unit tests ✅
- Login route has integration tests ✅
- E2E tests exist ✅
- **Action:** Verify all tests pass, add missing coverage

---

## Next Steps (Phase 2-5)

1. **Phase 2:** Define canonical login flow with Zod validation
2. **Phase 3:** Refactor auth code (remove `any`, split functions, remove registration)
3. **Phase 4:** Add/update tests
4. **Phase 5:** Delete registration code, verify build/tests pass
