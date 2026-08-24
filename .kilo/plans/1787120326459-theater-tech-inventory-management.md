# Theater-Tech Full Inventory Management

## Context & Decisions

The theater-tech inventory hub exists but is read-only for theater techs. The
RBAC matrix (`domain/permissions/InventoryRolePermissions.ts`) already grants
`THEATER_TECHNICIAN`: `VIEW_ITEMS`, `CREATE_ITEMS`, `UPDATE_ITEMS`, `ADJUST_STOCK`,
`VIEW_VENDORS`, `CREATE_VENDORS`, `UPDATE_VENDORS`, `VIEW_PURCHASE_ORDERS`,
`CREATE_PURCHASE_ORDERS`, `SUBMIT_PURCHASE_ORDERS`, `RECEIVE_GOODS`, `VIEW_USAGE`,
`RECORD_USAGE`, `VIEW_PLANNED_ITEMS`, `VIEW_REPORTS`.

The gap is purely **API enforcement + missing UI** — the backend routes hardcode
`ADMIN`-only checks and several endpoints/routes simply don't exist yet.

**Decisions (confirmed with user):**
- Theater techs get **ALL** inventory permissions, including pricing/supplier
  visibility. Widen the field-visibility map to match (the "viewing" map was
  stripping cost/supplier/reorder data, which also silently breaks the hub table
  status + supplier columns for theater techs).
- Scope = **Core + everything**: create/edit items, adjust stock, item detail,
  reports page, vendor edit/delete.

## Existing Patterns (follow these)

- **API routes** (`app/api/.../route.ts`): `JwtMiddleware.authenticate(request)`
  → `authorizeInventoryOperation(authResult, '<OP>')` (from
  `lib/auth/inventoryAuthorization.ts`) → service/repository →
  `handleApiSuccess` / `handleApiError`. Validation via Zod + `ValidationError`.
- **UI pages** are client components wrapped in `<Suspense>`, use `apiClient`
  (`lib/api/client.ts`), `toast` for feedback, local component state.
- **Dialog** for short forms (vendors create), **Sheet** for large forms (batches
  receive stock). Both patterns reuse Button/Input/Label/Card/Table primitives.
- **Vendor routes already support** `PATCH`/`DELETE` with `UPDATE_VENDORS` /
  `DELETE_VENDORS` — only the **vendors UI** is missing edit/delete.

## Correctness Fixes (must-do, low risk)

1. **`lib/rbac/inventory-field-visibility.ts`** — add to
   `FIELD_VISIBILITY_MAP[Role.THEATER_TECHNICIAN]`: `unitCost`, `reorderPoint`,
   `lowStockThreshold`, `supplier`, `manufacturer`, `createdAt`, `updatedAt`
   (keep existing operational fields). Fixes hub `InventoryDataTable` which
   currently renders wrong status/supplier for theater techs because those fields
   were stripped server-side.
2. **`GET /api/inventory/items`** (`app/api/inventory/items/route.ts`) — include
   `nearestExpiryDate` (min `expiry_date` among non-depleted batches) on each
   enriched item so the hub "Expiring Soon" tab and table column work.

## Backend Tasks

- **T1 — POST `/api/inventory/items`**: replace the
  `if (authResult.user.role !== Role.ADMIN)` block with
  `authorizeInventoryOperation(authResult, 'CREATE_ITEMS')` (keeps ADMIN/STORES/
  THEATER_TECH). Optionally emit an `INVENTORY_ITEM_CREATED` audit event
  (non-blocking, like vendors route).
- **T2 — New `GET /api/inventory/items/[id]/route.ts`**: authorize `VIEW_ITEMS`;
  return item + `quantityOnHand` (`getItemBalance`) + `nearestExpiryDate`. Powers
  the item detail page.
- **T3 — New `PATCH /api/inventory/items/[id]/route.ts`**: authorize
  `UPDATE_ITEMS`; validate with existing `UpdateItemSchema`
  (`lib/validation/inventory.ts`); call `inventoryRepository.updateItem(id, data)`;
  emit `INVENTORY_ITEM_UPDATED` audit (non-blocking).
- **T4 — `/api/stores/inventory/[id]/adjust`** (`app/api/stores/inventory/[id]/adjust/route.ts`):
  change `authorizeRoles(authResult, [Role.ADMIN])` →
  `authorizeInventoryOperation(authResult, 'ADJUST_STOCK')`. Also fix the
  `StockAdjustmentService.createStockAdjustment` DECREMENT branch (currently an
  empty `else {}`) so `newQuantity` is computed; the transaction multiplier is
  already correct (`-1`), but the dead branch is a latent bug.
- **T5 — Theater-tech reports**:
  - Extract the report query logic from the existing admin routes
    (`app/api/admin/inventory/report/stock/route.ts`,
    `app/api/admin/inventory/report/consumption/route.ts`) into a shared
    `InventoryReportService` (`application/services/InventoryReportService.ts`)
    with `buildStockReport(params)` and `buildConsumptionReport(params)`.
  - Keep admin routes delegating to the same service (no behavior change).
  - New routes `app/api/theater-tech/inventory/report/stock/route.ts` and
    `.../consumption/route.ts`: authorize `VIEW_REPORTS` for
    `THEATER_TECHNICIAN` + `ADMIN`; reuse the service. Since theater techs now
    have full perms, include pricing fields (mirror ADMIN output).
- **T6 — Hub summary real data**: fetch Pending PO count from
  `/api/stores/purchase-orders` (filter status `PENDING`/`SUBMITTED`) instead of
  the hardcoded `pendingPo: 3`.

## Frontend Tasks

- **T7 — Shared components** (`components/theater-tech/inventory/`):
  - `ItemFormDialog.tsx` — create/edit; props `{ open, onOpenChange, item?, onSaved }`.
    Fields: `name*`, `sku`, `category*` (Select of `InventoryCategory`),
    `unitOfMeasure*`, `unitCost`, `reorderPoint`, `lowStockThreshold`, `supplier`,
    `manufacturer`, `description`, `isBillable`, `isImplant`. Submit → POST
    (create) or PATCH (edit) `/api/inventory/items[/:id]`.
  - `AdjustStockDialog.tsx` — props `{ open, onOpenChange, item, onSaved }`.
    Fields: `adjustmentType` (INCREMENT/DECREMENT), `adjustmentReason` (enum),
    `quantityChange` (int > 0), `notes`. Submit →
    `PATCH /api/stores/inventory/{id}/adjust`.
  - `hooks/useInventoryItems.ts` — thin wrappers around `apiClient` for
    create/update/adjust; return `{ loading, error }`.
- **T8 — `InventoryActionBar`** (`app/theater-tech/inventory/components/InventoryActionBar.tsx`):
  add "Add Item" button (opens create dialog via new `onCreate` prop) and a
  "Reports" link to `/theater-tech/inventory/reports`.
- **T9 — `InventoryDataTable`** (`app/theater-tech/inventory/components/InventoryDataTable.tsx`):
  add `onEdit`, `onAdjust`, `onView` props; render a `DropdownMenu` (the
  `MoreHorizontal`/`FileEdit`/`Eye`/`Archive` icons are already imported but
  unused) per row with those actions.
- **T10 — Hub page** (`app/theater-tech/inventory/page.tsx`): lift dialog state;
  render `ItemFormDialog` + `AdjustStockDialog`; pass handlers to table + action
  bar; replace `pendingPo: 3` with real fetched count (T6).
- **T11 — Items page** (`app/theater-tech/inventory/items/page.tsx`): add "Add
  Item" button + row actions reusing the same dialogs/hook; currently read-only.
- **T12 — New item detail route** `app/theater-tech/inventory/items/[id]/page.tsx`:
  show item details, current balance, associated batches (via
  `/api/inventory/batches?itemId=`), and ledger (via `/api/inventory/transaction`
  or a new `/api/inventory/items/[id]/history`). Provide Edit + Adjust actions.
- **T13 — New reports page** `app/theater-tech/inventory/reports/page.tsx`:
  Tabs "Stock Report" (from `/api/theater-tech/inventory/report/stock`) and
  "Consumption Report" (from `.../report/consumption`). Filters: category,
  date range (consumption), below-reorder-only (stock). Render summary cards +
  tables (keep it table-based; no new charting dependency).
- **T14 — Vendors page** (`app/theater-tech/inventory/vendors/page.tsx`): add
  Edit + Delete actions (API already exists). Add edit dialog (reuse
  `UpdateVendorSchema` fields) and a delete-confirm dialog.
- **T15 — Sidebar** (`components/theater-tech/TheaterTechSidebar.tsx`): add a
  "Reports" nav item under INVENTORY → `/theater-tech/inventory/reports` (or rely
  on the hub "Reports" link from T8). Recommended: add the nav item for
  discoverability.

## Data Shapes / Relations (reference)

- **InventoryItem** (`domain/interfaces/repositories/IInventoryRepository.ts`):
  `id, name, sku, category(InventoryCategory), description, unitOfMeasure,
  unitCost, reorderPoint, lowStockThreshold, supplier, manufacturer, isActive,
  isBillable, isImplant, createdAt, updatedAt`. **Balance is derived** from
  `InventoryTransaction` (never stored on the item).
- **Stock adjustment DTO**: `{ adjustmentType: 'INCREMENT'|'DECREMENT',
  adjustmentReason: StockAdjustmentReason, quantityChange: int>0, notes? }`.
- **Stock report response**: `{ items[], summary{ totalItems,
  itemsBelowReorderPoint, totalStockValue? }, filters }`.
- **Consumption report response**: `{ totals{ totalQuantity, totalCost,
  billableCost, nonBillableCost }, grouped[], filters }`.
- **Relation**: `InventoryBatch → InventoryItem`; balance = Σ STOCK_IN − Σ
  STOCK_OUT − Σ ADJUSTMENT(neg) across `InventoryTransaction`.

## Risks

- Widening field visibility changes the GET items response for theater techs
  (now includes pricing/supplier). Intended; verify no theater-tech UI assumed
  their absence.
- `StockAdjustmentService` DECREMENT branch is a no-op bug — must fix or
  decrement adjustments won't record correctly.
- Consumption report query loads usage + users (potentially heavy); keep default
  7-day window and server-side filters.
- T5 refactor must not alter admin report output — admin routes delegate to the
  same extracted service.

## Validation

- `npm run lint` and `npm run typecheck` (or `tsc --noEmit`) pass.
- Existing integration test `tests/integration/inventory-billing/reporting.contract.test.ts`
  still passes (admin report behavior unchanged).
- Manual (as theater tech):
  - Create item → appears in catalog + hub; balance 0.
  - Edit item → fields persist.
  - Adjust stock (increment + decrement) → balance updates; ledger shows entries.
  - Open item detail → shows balance, batches, ledger.
  - Open Reports → Stock + Consumption render with real data.
  - Edit + delete a vendor.
- Negative: a `NURSE`/`FRONTDESK` token hitting POST/PATCH items or adjust
  returns 403 (permission matrix still forbids them).
