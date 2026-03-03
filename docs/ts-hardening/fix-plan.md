# TypeScript Hardening Fix Plan

## Patch Order (Highest Leverage First)

### Patch 1: API Client Public Interface (High Leverage, Low Risk)
**Files:** `lib/api/client.ts`, `app/inventory/*/page.tsx`, `components/doctor/case-plan/InventoryTabs.tsx`
- **Issue:** `apiClient.request` is private but used in UI components
- **Fix:** Expose public `request` method or migrate to existing public methods (`get`, `post`, etc.)
- **Risk:** Low - No behavior change, just visibility
- **Test:** Verify UI pages still load and make API calls

### Patch 2: InventoryTabs Component State (High Leverage, Low Risk)
**Files:** `components/doctor/case-plan/InventoryTabs.tsx`
- **Issue:** Missing state variables and functions from reconciliation workflow
- **Fix:** Add missing state (`varianceData`, `selectedItem`, `showConsumeDialog`, etc.) and functions
- **Risk:** Low - Restoring missing code
- **Test:** Verify Planned Items tab renders and "Consume" button works

### Patch 3: Enum Type Fixes (Medium Leverage, Low Risk)
**Files:** `domain/permissions/InventoryRolePermissions.ts`, `app/api/stores/receipts/route.ts`
- **Issue:** `"ALL"` and `"READ_PURCHASE_ORDERS"` not in `InventoryOperation` type
- **Fix:** 
  - Change `forbiddenOperations` to allow string literal `"ALL"` or use array of all operations
  - Add `READ_PURCHASE_ORDERS` to enum or use `VIEW_PURCHASE_ORDERS`
- **Risk:** Low - Type-only changes
- **Test:** Verify authorization still works correctly

### Patch 4: NextRequest IP Property (Low Leverage, Low Risk)
**Files:** `lib/middleware/intake-security.ts`
- **Issue:** `NextRequest.ip` doesn't exist
- **Fix:** Use `request.headers.get('x-forwarded-for')` or `request.headers.get('x-real-ip')`
- **Risk:** Low - Alternative way to get IP
- **Test:** Verify IP-based security checks still work

### Patch 5: Test Typing Helpers (High Leverage, Medium Risk)
**Files:** Create `tests/helpers/apiTestClient.ts`, `tests/helpers/mockPrisma.ts`
- **Issue:** Repeated `data.data` access and Promise handling issues
- **Fix:** Create typed helpers:
  - `unwrapApiSuccess<T>(res: ApiResponse<T>): T`
  - `assertApiSuccess<T>(res: ApiResponse<T>): asserts res is ApiSuccess<T>`
  - Typed mock factories
- **Risk:** Medium - Changes test code but improves type safety
- **Test:** Run all integration tests

### Patch 6: Prisma Type Fixes (Medium Leverage, Medium Risk)
**Files:** `tests/integration/frontdesk-theater-booking.test.ts`, various contract tests
- **Issue:** Missing required fields in Prisma create inputs
- **Fix:** Add required fields or use correct Prisma payload types
- **Risk:** Medium - Could affect test data setup
- **Test:** Run affected integration tests

### Patch 7: E2E Test Fixes (Low Leverage, Low Risk)
**Files:** `tests/e2e/*.spec.ts`
- **Issue:** `.first()` on `Promise<void>`
- **Fix:** Await promise first, then use `.first()`
- **Risk:** Low - Test-only changes
- **Test:** Run E2E tests

### Patch 8: Unit Test Framework (Low Leverage, Low Risk)
**Files:** `tests/unit/**/*.test.ts`
- **Issue:** Jest globals missing, wrong test framework
- **Fix:** Ensure Vitest setup is correct, fix imports
- **Risk:** Low - Test-only changes
- **Test:** Run unit tests

## No Behavior Change Test Checks

For each patch:
1. ✅ TypeScript compiles (`pnpm tsc --noEmit`)
2. ✅ Existing tests pass (`pnpm test`)
3. ✅ No runtime errors in affected code paths
4. ✅ API contracts unchanged (verify with contract tests)
