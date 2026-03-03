# Phase 4 Implementation Status

## Overview
Phase 4 extends the inventory system from "correct consumption engine" to a fully governed, role-integrated operational inventory lifecycle.

## Completed Components

### ✅ Section 1 — Governance & Role Model
- [x] Added `STORES` role to Role enum (domain + Prisma)
- [x] Created `InventoryRolePermissionMatrix` with complete role permissions
- [x] Created `authorizeInventoryOperation` utility
- [x] Created `authorizeRoles` convenience function

### ✅ Section 2 — Supply-Side Inventory Lifecycle

#### 2.1 Vendor Management ✅
- [x] Created `Vendor` Prisma model
- [x] Created `VendorService` with CRUD operations
- [x] Created Zod parsers for vendor requests
- [x] Created routes:
  - `POST /api/stores/vendors` - Create vendor
  - `GET /api/stores/vendors` - List vendors
  - `GET /api/stores/vendors/[id]` - Get vendor
  - `PATCH /api/stores/vendors/[id]` - Update vendor
  - `DELETE /api/stores/vendors/[id]` - Delete vendor
- [x] All routes use role-based authorization

#### 2.2 Purchase Order ✅
- [x] Created `PurchaseOrder` and `PurchaseOrderItem` Prisma models
- [x] Created `PurchaseOrderStatus` enum (DRAFT, SUBMITTED, APPROVED, PARTIALLY_RECEIVED, CLOSED, CANCELLED)
- [x] Created `PurchaseOrderService` with:
  - Create PO
  - List POs (with status filter)
  - Get PO by ID
  - Submit PO (STORES only)
  - Approve PO (ADMIN only)
- [x] Created Zod parsers
- [x] Created routes:
  - `POST /api/stores/purchase-orders` - Create PO
  - `GET /api/stores/purchase-orders` - List POs
  - `POST /api/stores/purchase-orders/[id]/submit` - Submit PO
  - `POST /api/stores/purchase-orders/[id]/approve` - Approve PO

#### 2.3 Goods Receipt ✅
- [x] Created `GoodsReceipt` and `GoodsReceiptItem` Prisma models
- [x] Created `GoodsReceiptService` with transactional receipt logic:
  - Validates PO status
  - Prevents over-receipt
  - Increments inventory stock
  - Creates inventory batches
  - Updates PO status (PARTIALLY_RECEIVED or CLOSED)
- [x] Created route:
  - `POST /api/stores/purchase-orders/[id]/receive` - Receive goods

### ✅ Section 3 — Prisma Schema Additions
- [x] All new models added to schema
- [x] All relations properly configured
- [x] All enums added
- [x] Schema validated and formatted

## Remaining Components

### ⏳ Section 3 — Clinical Workflow Integration
- [ ] Integrate usage endpoint into pre-op ward checklist
- [ ] Integrate usage endpoint into intra-op record
- [ ] Integrate usage endpoint into recovery form
- [ ] Add integration tests for form submissions

### ✅ Section 4 — Planned vs Used Visibility
- [x] Created `GET /api/surgical-cases/[caseId]/usage-variance` endpoint
- [x] Returns planned items, used items, variance per item
- [x] Returns total planned cost vs actual billed cost
- [x] Includes quantity and cost variance calculations

### ✅ Section 5 — Stock Adjustment
- [x] Created `StockAdjustmentService` with validation
- [x] Created `POST /api/stores/inventory/[id]/adjust` route
- [x] Enforces ADMIN-only access
- [x] Requires adjustment reason (enum)
- [x] Prevents negative stock
- [x] Creates audit trail (StockAdjustment record)

### ⏳ Section 6 — Reporting Endpoints
- [ ] Create `GET /api/admin/inventory/report/consumption`
- [ ] Create `GET /api/admin/inventory/report/stock`
- [ ] Add date range and category filters

### ⏳ Section 7 — Contract Tests
- [ ] Vendor routes contract tests
- [ ] Purchase order routes contract tests
- [ ] Goods receipt route contract tests
- [ ] Stock adjustment route contract tests
- [ ] Reporting endpoints contract tests
- [ ] Usage variance endpoint contract tests

### ⏳ Section 8 — UI Structure
- [ ] Create `/inventory/items` route
- [ ] Create `/inventory/vendors` route
- [ ] Create `/inventory/purchase-orders` route
- [ ] Create `/inventory/receipts` route
- [ ] Add tabs to surgical case view:
  - Planned Items
  - Used Items
  - Billing Summary

## Architecture Notes

### Role Permissions Matrix
The `InventoryRolePermissionMatrix` defines:
- **STORES**: Can manage vendors, POs, receive goods. Cannot approve POs or adjust stock.
- **FRONTDESK**: Can view items and billing. No inventory operations.
- **NURSE**: Can view items, record usage, view billing for own cases. Cannot plan items.
- **DOCTOR**: Can view items, plan items, view billing for own cases. Cannot record usage.
- **ADMIN**: Full access to all operations.

### Transaction Safety
- Goods receipt is fully transactional (receipt + stock increment + batch creation + PO status update)
- All operations use Prisma transactions where needed

### Idempotency
- Usage recording maintains Phase 3 idempotency via `external_ref`
- Goods receipt is not idempotent (intentional - each receipt is a distinct event)

## Next Steps

1. Complete clinical workflow integration
2. Implement usage variance endpoint
3. Implement stock adjustment
4. Implement reporting endpoints
5. Create comprehensive contract tests
6. Create minimal UI route structure
