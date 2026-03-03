# TypeScript Error Inventory

## Summary by Category

| Category | Count | Status |
|----------|-------|--------|
| API Contract Types | 8 | ⚠️ Pending |
| Enum Type Mismatch | 3 | ⚠️ Pending |
| Prisma Type Drift | 15 | ⚠️ Pending |
| Test Harness / Mock Typing | 60+ | ⚠️ Pending |
| React/Next Client vs Server typing | 25+ | ⚠️ Pending |
| Timer/Logger typing | 1 | ⚠️ Pending |
| Legacy Utility typing | 2 | ⚠️ Pending |
| Component State/Function Missing | 25+ | ⚠️ Pending |

**Total: ~116 errors**

## Detailed Error Table

| # | File | Line | Error Code | Category | Root Cause | Fix Strategy | Status |
|---|------|------|------------|----------|------------|--------------|--------|
| 1 | `app/api/stores/receipts/route.ts` | 19 | TS2345 | Enum Type Mismatch | `"READ_PURCHASE_ORDERS"` not in `InventoryOperation` | Add `READ_PURCHASE_ORDERS` to enum or use `VIEW_PURCHASE_ORDERS` | ⚠️ |
| 2 | `app/api/stores/vendors/[id]/route.ts` | 38 | TS2304 | Legacy Utility typing | `id` variable not in scope | Use `context.params.id` from async params | ⚠️ |
| 3-9 | `app/inventory/*/page.tsx` | various | TS2341 | API Contract Types | `apiClient.request` is private | Use public methods (`get`, `post`) or expose `request` | ⚠️ |
| 10-33 | `components/doctor/case-plan/InventoryTabs.tsx` | 86-191 | TS2304 | Component State/Function Missing | Missing state vars and functions from reconciliation code | Add missing state and function definitions | ⚠️ |
| 34-35 | `domain/permissions/InventoryRolePermissions.ts` | 173, 180 | TS2322 | Enum Type Mismatch | `"ALL"` not assignable to `InventoryOperation` | Change `forbiddenOperations` type to allow string literal or use different approach | ⚠️ |
| 36 | `lib/middleware/intake-security.ts` | 60 | TS2339 | React/Next Client vs Server typing | `NextRequest.ip` doesn't exist | Use `request.headers.get('x-forwarded-for')` or similar | ⚠️ |
| 37-39 | `tests/e2e/*.spec.ts` | various | TS2339 | Test Harness / Mock Typing | `.first()` on `Promise<void>` | Await promise first, then use `.first()` | ⚠️ |
| 40-43 | `tests/integration/frontdesk-booking/*.test.ts` | various | TS2339 | Test Harness / Mock Typing | Accessing properties on `void` | Fix async/await in test setup | ⚠️ |
| 44-45 | `tests/integration/frontdesk-theater-booking.test.ts` | 100, 212 | TS2353, TS2322 | Prisma Type Drift | Missing required fields in Prisma create input | Add required fields or use correct Prisma type | ⚠️ |
| 46-116 | `tests/integration/inventory-billing/*.test.ts` | various | TS2741, TS2554, TS18046 | Test Harness / Mock Typing | Promise handling, ApiResponse data access | Create typed test helpers, fix async/await | ⚠️ |
| 117-119 | `tests/integration/theater-tech/*.test.ts` | various | TS18046, TS2339 | Test Harness / Mock Typing | `data.data` is `unknown`, missing `message` on `ApiError` | Add type guards, fix ApiError type | ⚠️ |
| 120-123 | `tests/unit/app/api/_utils/handleApiError.test.ts` | various | TS2307, TS2304, TS2540 | Test Harness / Mock Typing | Jest globals missing, `fail` undefined, `NODE_ENV` readonly | Fix test framework setup | ⚠️ |
| 124 | `tests/unit/application/services/TheaterService.test.ts` | 8 | TS2307 | Test Harness / Mock Typing | Missing test database setup module | Create or fix import path | ⚠️ |
| 125-127 | `tests/unit/lib/http/apiResponse.test.ts` | various | TS2307, TS2554 | Test Harness / Mock Typing | Jest globals missing, wrong argument count | Fix test framework and function signatures | ⚠️ |
