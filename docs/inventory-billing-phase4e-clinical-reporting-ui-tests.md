# Phase 4E — Clinical Workflow Integration + Admin Reporting + UI Route Shells + Contract Tests

## Overview

Phase 4E completes the inventory and billing integration by:
1. Integrating clinical forms (pre-op, intra-op, recovery) with the canonical usage endpoint
2. Implementing admin reporting endpoints for consumption and stock analysis
3. Creating UI route shells for inventory console
4. Adding inventory tabs to surgical case views
5. Providing comprehensive contract tests for all Phase 4 routes

## Implementation Summary

### Part A — Clinical Workflow Integration

#### A1. ClinicalInventoryIntegrationService

**File:** `application/services/ClinicalInventoryIntegrationService.ts`

**Responsibilities:**
- Extract usage events from clinical form data (pre-op, intra-op, recovery)
- Apply usage events sequentially via `InventoryConsumptionBillingService`
- Generate deterministic `externalRef` for idempotency
- Handle stock warnings and errors

**Key Methods:**
- `extractUsageEventsFromPreop(caseId, formResponseId, dataJson)` → `UsageEvent[]`
- `extractUsageEventsFromIntraop(caseId, formResponseId, dataJson)` → `UsageEvent[]`
- `extractUsageEventsFromRecovery(caseId, formResponseId, dataJson)` → `UsageEvent[]`
- `applyUsageEvents(caseId, events, userContext)` → `ApplyUsageEventsResult`

**Idempotency Strategy:**
- Deterministic `externalRef` generation using SHA-256 hash of:
  - `caseId + formResponseId + sectionKey + inventoryItemId + optionalUniqueSuffix`
- Format: UUID-like (8-4-4-4-12) for compatibility
- Same form submission generates same `externalRef` → idempotent replay

**Error Handling:**
- Stock failures return `422 GATE_BLOCKED` with metadata.items[]
- Transactional: stops at first failure (no partial application)
- Non-critical errors logged but don't fail form save

#### A2. Form Route Updates

**Updated Routes:**
- `PUT /api/nurse/surgical-cases/[caseId]/forms/preop-ward`
- `PUT /api/nurse/surgical-cases/[caseId]/forms/intraop`
- `PUT /api/nurse/surgical-cases/[caseId]/forms/recovery`

**Integration Pattern:**
1. Save form first (transactional)
2. Extract usage events from form data
3. Apply usage events sequentially
4. Return form data + usage integration metadata

**Response Metadata:**
```typescript
{
  ...formData,
  usageIntegration: {
    appliedUsageCount: number;
    appliedBillLinesCount: number;
    isIdempotentReplaySummary: boolean;
    stockWarnings: Array<{
      inventoryItemId: number;
      itemName: string;
      quantityOnHand: number;
      reorderPoint: number;
    }>;
  } | null;
}
```

**Scope Decisions:**
- Pre-op: Medications section (if `inventoryItemId` present)
- Intra-op: Medications + Implants/Devices (if `inventoryItemId` present)
- Recovery: Medications section (if `inventoryItemId` present)
- Backward compatibility: `MedicationService` remains for legacy flows

### Part B — Admin Reporting Endpoints

#### B1. Consumption Report

**Route:** `GET /api/admin/inventory/report/consumption`

**Query Parameters:**
- `from` (ISO date, optional) — default: 7 days ago
- `to` (ISO date, optional) — default: now
- `category` (InventoryCategory, optional)
- `sourceFormKey` (SourceFormKey, optional)
- `groupBy` ('day' | 'category' | 'item' | 'user' | 'source', default: 'day')

**Response:**
```typescript
{
  totals: {
    totalQuantity: number;
    totalCost: number;
    billableCost: number;
    nonBillableCost: number;
  };
  grouped: Array<{
    key: string;
    quantity: number;
    cost: number;
    billableCost: number;
    nonBillableCost: number;
    items: Array<{
      inventoryItemId: number;
      itemName: string;
      category: string;
      quantityUsed: number;
      unitCost: number;
      totalCost: number;
      isBillable: boolean;
      usedAt: Date;
      usedByUserId: string;
      usedByUserName: string | null;
      sourceFormKey: string;
    }>;
  }>;
  filters: {
    from: string;
    to: string;
    category: string | null;
    sourceFormKey: string | null;
    groupBy: string;
  };
}
```

**Authorization:** ADMIN only

**Performance:**
- Uses indexes: `(surgical_case_id, inventory_item_id, used_at)`, `(source_form_key, used_at)`, `(used_by_user_id, used_at)`

#### B2. Stock Report

**Route:** `GET /api/admin/inventory/report/stock`

**Query Parameters:**
- `belowReorderOnly` (boolean, default: true)
- `category` (InventoryCategory, optional)
- `activeOnly` (boolean, default: true)

**Response (ADMIN):**
```typescript
{
  items: Array<{
    id: number;
    name: string;
    sku: string;
    category: string;
    unitOfMeasure: string;
    quantityOnHand: number;
    reorderPoint: number;
    isActive: boolean;
    isBelowReorderPoint: boolean;
    unitCost: number; // ADMIN only
    stockValue: number; // ADMIN only
  }>;
  summary: {
    totalItems: number;
    itemsBelowReorderPoint: number;
    totalStockValue: number; // ADMIN only
    averageUnitCost: number; // ADMIN only
  };
  filters: {
    belowReorderOnly: boolean;
    category: string | null;
    activeOnly: boolean;
  };
}
```

**Response (STORES):**
- Same structure but `unitCost` and `stockValue` fields omitted
- `summary.totalStockValue` and `summary.averageUnitCost` omitted

**Authorization:** ADMIN and STORES (field-level visibility control)

### Part C — Contract Tests

**Test Files Created:**
- `tests/integration/inventory-billing/vendors.contract.test.ts`
- `tests/integration/inventory-billing/purchase-orders.contract.test.ts`
- `tests/integration/inventory-billing/goods-receipt.contract.test.ts`
- `tests/integration/inventory-billing/stock-adjustment.contract.test.ts`
- `tests/integration/inventory-billing/usage-variance.contract.test.ts`
- `tests/integration/inventory-billing/reporting.contract.test.ts`

**Test Coverage:**
- Success cases (200/201)
- Validation errors (400)
- Authorization errors (403)
- Not found errors (404)
- Gate blocked errors (422)
- Special cases:
  - Over-receipt prevention
  - Negative stock prevention
  - Role-based field visibility
  - Idempotent replay detection

**Test Patterns:**
- Direct route handler invocation
- Mocked JWT middleware
- Mocked service factories
- ApiResponse assertion helpers

### Part D — UI Route Structure

#### D1. Inventory Console Routes

**Routes Created:**
- `/inventory/items` — Inventory items list with stock levels
- `/inventory/vendors` — Vendor management
- `/inventory/purchase-orders` — Purchase order tracking
- `/inventory/receipts` — Goods receipt records

**Structure:**
- Header with title and description
- Card-based layout
- Search/filter placeholders
- Loading skeletons
- Empty states
- Error states
- No custom styling (uses existing shadcn components)

#### D2. Surgical Case Inventory Tabs

**Component:** `components/doctor/case-plan/InventoryTabs.tsx`

**Tabs Added to Surgical Case Plan Page:**
1. **Planned Items** — Shows items planned for the case with cost estimate
2. **Used Items** — Shows items actually consumed during the case
3. **Billing Summary** — Shows payment summary and usage totals
4. **Usage Variance** — Shows planned vs actual comparison with variance analysis

**Integration:**
- Added to existing tabs in `/doctor/surgical-cases/[caseId]/plan`
- Fetches from canonical endpoints:
  - `GET /api/doctor/surgical-cases/[caseId]/planned-items`
  - `GET /api/nurse/surgical-cases/[caseId]/billing-summary`
  - `GET /api/surgical-cases/[caseId]/usage-variance`

## Files Created/Modified

### Services
- ✅ `application/services/ClinicalInventoryIntegrationService.ts` (NEW)
- ✅ `lib/factories/clinicalInventoryIntegrationFactory.ts` (NEW)

### Routes
- ✅ `app/api/nurse/surgical-cases/[caseId]/forms/preop-ward/route.ts` (MODIFIED)
- ✅ `app/api/nurse/surgical-cases/[caseId]/forms/intraop/route.ts` (MODIFIED)
- ✅ `app/api/nurse/surgical-cases/[caseId]/forms/recovery/route.ts` (MODIFIED)
- ✅ `app/api/admin/inventory/report/consumption/route.ts` (NEW)
- ✅ `app/api/admin/inventory/report/stock/route.ts` (NEW)

### UI Components
- ✅ `components/doctor/case-plan/InventoryTabs.tsx` (NEW)
- ✅ `app/doctor/surgical-cases/[caseId]/plan/page.tsx` (MODIFIED)
- ✅ `app/inventory/items/page.tsx` (NEW)
- ✅ `app/inventory/vendors/page.tsx` (NEW)
- ✅ `app/inventory/purchase-orders/page.tsx` (NEW)
- ✅ `app/inventory/receipts/page.tsx` (NEW)

### Tests
- ✅ `tests/integration/inventory-billing/vendors.contract.test.ts` (NEW)
- ✅ `tests/integration/inventory-billing/purchase-orders.contract.test.ts` (NEW)
- ✅ `tests/integration/inventory-billing/goods-receipt.contract.test.ts` (NEW)
- ✅ `tests/integration/inventory-billing/stock-adjustment.contract.test.ts` (NEW)
- ✅ `tests/integration/inventory-billing/usage-variance.contract.test.ts` (NEW)
- ✅ `tests/integration/inventory-billing/reporting.contract.test.ts` (NEW)

## Idempotency Strategy

### ExternalRef Generation

**Algorithm:**
1. Concatenate: `caseId | formResponseId | sectionKey | inventoryItemId | optionalUniqueSuffix`
2. SHA-256 hash the concatenated string
3. Format as UUID-like: `{hash[0:8]}-{hash[8:12]}-{hash[12:16]}-{hash[16:20]}-{hash[20:32]}`

**Example:**
```
Input: "case-123|form-456|medications|789|2025-01-15T10:30:00"
Hash: SHA256(input) → "a1b2c3d4e5f6..."
ExternalRef: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**Properties:**
- Deterministic: same input → same output
- Unique: different inputs → different outputs (with high probability)
- Stable: form resubmission with same data → same externalRef → idempotent replay

## Reporting DTOs

### ConsumptionReportDto
```typescript
{
  totals: {
    totalQuantity: number;
    totalCost: number;
    billableCost: number;
    nonBillableCost: number;
  };
  grouped: Array<GroupedConsumptionItem>;
  filters: ConsumptionFilters;
}
```

### StockReportDto
```typescript
{
  items: Array<StockItemDto>;
  summary: StockSummaryDto;
  filters: StockFilters;
}
```

**Role-Based Field Visibility:**
- ADMIN: Full access (unit_cost, stock_value, totals)
- STORES: Limited access (omits cost fields)

## Test Matrix

### Vendor Routes
- ✅ POST /api/stores/vendors — Success, Validation, Authorization
- ✅ GET /api/stores/vendors — Success, Authorization
- ✅ PATCH /api/stores/vendors/[id] — Success, Not Found
- ✅ DELETE /api/stores/vendors/[id] — Success, Has POs (400), Authorization

### Purchase Order Routes
- ✅ POST /api/stores/purchase-orders — Success, Inactive Vendor (422)
- ✅ GET /api/stores/purchase-orders — Success, Authorization
- ✅ POST /api/stores/purchase-orders/[id]/submit — Success, Invalid Status (422)
- ✅ POST /api/stores/purchase-orders/[id]/approve — Success, Non-ADMIN (403)

### Goods Receipt Route
- ✅ POST /api/stores/purchase-orders/[id]/receive — Success, Over-receipt (422), Invalid Status (422)

### Stock Adjustment Route
- ✅ POST /api/stores/inventory/[id]/adjust — Success, Negative Stock (400), Non-ADMIN (403), Not Found (404)

### Usage Variance Route
- ✅ GET /api/surgical-cases/[caseId]/usage-variance — Success, No Case Plan, Not Found (404), Authorization (403)

### Reporting Routes
- ✅ GET /api/admin/inventory/report/consumption — Success, Non-ADMIN (403)
- ✅ GET /api/admin/inventory/report/stock — Success (ADMIN with costs), Success (STORES without costs), Authorization (403)

## Architecture Notes

### Transaction Safety
- Form save + usage application: Form saved first, then usage applied
- If usage fails: Form save is preserved, error returned to user
- Idempotency protects against duplicate submissions

### Error Propagation
- Stock failures: `422 GATE_BLOCKED` with detailed metadata
- Validation errors: `400 VALIDATION_ERROR` with field-level details
- Authorization errors: `403 FORBIDDEN` with role information

### Performance
- Reporting endpoints use indexed queries
- Grouping done in application layer (flexible, maintainable)
- Date range defaults to last 7 days (reduces query size)

### Backward Compatibility
- `MedicationService` remains functional
- Forms support both structured (inventoryItemId) and unstructured (name-based) data
- Existing form submissions continue to work

## Next Steps

1. **UI Implementation:** Complete table implementations in inventory console pages
2. **Form Enhancement:** Add `inventoryItemId` fields to form schemas for better integration
3. **Name Matching:** Implement name-to-inventory matching for unstructured form data
4. **Audit Logging:** Add comprehensive audit logging wrapper for inventory events
5. **Batch Operations:** Support batch usage (multiple items per call) if needed

## Non-Negotiable Standards Maintained

✅ Strict TypeScript (no `any`)  
✅ Zod validation for all inputs  
✅ `ApiResponse<T>` pattern everywhere  
✅ Clean architecture (routes = orchestration)  
✅ Role checks via authorization utilities  
✅ Phase 3 invariants preserved (idempotency, single-item constraint)  
✅ Transactional error handling  
✅ Comprehensive test coverage  
