# PHASE 2: Domain Design - Inventory ↔ Billing Canonical Pipeline

**Date**: 2025-02-22  
**System**: Nairobi Sculpt Aesthetic Centre (NSAC)  
**Phase**: Domain Design (No Implementation)

---

## Executive Summary (40 Lines Max)

This design establishes a canonical pipeline separating **Planning** (doctor forecasts) from **Consumption** (nurse actual usage). Planning stores `CasePlanPlannedItem` records without stock impact. Consumption uses `InventoryConsumptionBillingService` to atomically decrement stock and create bills, with mandatory idempotency via `external_ref` UUIDs. The service unifies medication, implant, device, and consumable handling. API contracts use Zod validation and `ApiResponse<T>`. All consumption events are transactional and idempotent. Billing linkage remains `InventoryUsage.bill_item_id → PatientBill.id` (one-to-one). The design extends `InventoryUsage` with `external_ref`, `source_form_key`, and `used_at` for traceability. `MedicationService` becomes a thin wrapper around the unified service. Tests cover idempotency, rollback, and billing determinism.

---

## 1. Domain Model Design

### 1.1 Planning Model: CasePlanPlannedItem

**Purpose**: Store doctor's planned items during case planning (forecast, no stock impact).

**Prisma Model Shape**:
```prisma
model CasePlanPlannedItem {
  id                 Int          @id @default(autoincrement())
  case_plan_id       Int
  inventory_item_id  Int?         // nullable if service-only
  service_id         Int?         // nullable if inventory-only
  planned_quantity   Float        // can be fractional (e.g., 0.5 vials)
  planned_unit_price Float        // snapshot from InventoryItem.unit_cost at plan time
  notes              String?      // optional doctor notes
  planned_by_user_id String       // doctor's user_id
  created_at         DateTime     @default(now())
  updated_at         DateTime     @updatedAt
  
  // Relations
  case_plan          CasePlan     @relation(fields: [case_plan_id], references: [id], onDelete: Cascade)
  inventory_item     InventoryItem? @relation(fields: [inventory_item_id], references: [id], onDelete: SetNull)
  service            Service?      @relation(fields: [service_id], references: [id], onDelete: SetNull)
  
  // Constraints
  @@unique([case_plan_id, inventory_item_id]) // Prevent duplicate planned items
  @@unique([case_plan_id, service_id])        // Prevent duplicate planned services
  @@index([case_plan_id])
  @@index([inventory_item_id])
  @@index([service_id])
  @@check(planned_quantity > 0, name: "positive_quantity")
  @@check(
    (inventory_item_id IS NOT NULL AND service_id IS NULL) OR
    (inventory_item_id IS NULL AND service_id IS NOT NULL),
    name: "exactly_one_reference"
  )
}
```

**Linkage Decision**: Link to `CasePlan` (not `SurgicalCase` directly)

**Justification**:
- `CasePlan` is the planning artifact (one-to-one with appointment/surgical case)
- Allows multiple plan revisions without affecting surgical case status
- Clear ownership: plan belongs to appointment, surgical case references plan
- Enables plan history if needed (future: versioning)

**Indexes**:
- `case_plan_id` (primary lookup)
- `inventory_item_id` (for inventory queries)
- `service_id` (for service queries)
- Unique constraints prevent duplicates per plan

**Replace Behavior**:
- On `POST /planned-items`, delete all existing items for `case_plan_id` in same transaction
- Then insert new items
- Atomic: all-or-nothing replacement

---

### 1.2 Consumption Model: InventoryUsage Extensions

**Current State**: `InventoryUsage` exists with `bill_item_id`, `surgical_case_id`, `appointment_id`, `recorded_by`, `created_at`.

**Required Extensions**:
```prisma
model InventoryUsage {
  // ... existing fields ...
  
  // NEW FIELDS
  external_ref      String?      @unique  // UUID from client (idempotency key)
  source_form_key   String?      // Enum: 'NURSE_MED_ADMIN', 'NURSE_PREOP_WARD', 'NURSE_INTRAOP', 'NURSE_RECOVERY', 'DOCTOR_OPERATIVE_NOTE'
  used_at           DateTime?    // Explicit usage timestamp (vs created_at for record creation)
  used_by_user_id   String?      // Explicit user who used it (vs recorded_by for who recorded it)
  
  // ... existing relations ...
}
```

**Field Usage**:
- `external_ref`: Client-generated UUID. If present and matches existing record, operation is idempotent replay.
- `source_form_key`: Tracks which form/action triggered usage (audit trail).
- `used_at`: Actual usage time (may differ from `created_at` for backdated entries).
- `used_by_user_id`: User who physically used item (may differ from `recorded_by` if nurse records for another).

**Decision**: Keep `recorded_by` AND add `used_by_user_id`

**Justification**:
- `recorded_by`: Who entered the record (audit trail)
- `used_by_user_id`: Who actually used it (clinical responsibility)
- Both needed for compliance (e.g., nurse records for surgeon's use)

**Unique/Index Constraints**:
```prisma
@@unique([external_ref])  // Idempotency enforcement
@@index([surgical_case_id, inventory_item_id, used_at])  // Performance: usage queries
@@index([source_form_key, used_at])  // Audit: form-based queries
@@index([used_by_user_id, used_at])  // Audit: user-based queries
```

**Stock Constraint Strategy**: Application Guard (Recommended)

**Reasoning**:
- Prisma doesn't support CHECK constraints directly (requires raw SQL)
- Application guard in transaction is sufficient (Prisma row-level locking)
- More flexible for error messages
- Can add DB constraint later if needed: `ALTER TABLE "InventoryItem" ADD CONSTRAINT "non_negative_stock" CHECK (quantity_on_hand >= 0);`

---

### 1.3 Billing Linkage Strategy

**Current**: `InventoryUsage.bill_item_id → PatientBill.id` (one-to-one, nullable)

**Decision**: **KEEP EXISTING** (no migration needed)

**Justification**:
- ✅ Query ergonomics: `InventoryUsage` is the source of truth for usage → easy to find bill
- ✅ Data integrity: Foreign key ensures bill exists if linked
- ✅ No orphan risk: `bill_item_id` is nullable (usage can exist without bill if non-billable)
- ✅ Existing compatibility: `MedicationService` already uses this pattern
- ✅ Unambiguous: One usage → one bill line (deterministic)

**Alternative Considered**: `PatientBill.inventory_usage_id`

**Rejected Because**:
- ❌ Requires migration of existing data
- ❌ Less intuitive (bill points to usage, but usage is the event)
- ❌ Breaks existing `MedicationService` pattern

**Canonical Query Pattern**:
```typescript
// Find all usage with bills for a case
const usageWithBills = await db.inventoryUsage.findMany({
  where: { surgical_case_id: caseId, bill_item_id: { not: null } },
  include: { bill_item: true, inventory_item: true }
});
```

---

## 2. Service Boundaries

### 2.1 Unified Service: InventoryConsumptionBillingService

**File**: `application/services/InventoryConsumptionBillingService.ts`

**Purpose**: Unified service for all inventory consumption (medications, implants, devices, consumables) with automatic billing.

**Interface**:
```typescript
export interface InventoryConsumptionBillingService {
  /**
   * Apply usage and billing atomically.
   * Idempotent: if externalRef exists, returns existing result.
   * 
   * @param params - Consumption parameters
   * @returns Usage records, bill items, and payment summary
   * @throws DomainException if stock insufficient or validation fails
   */
  applyUsageAndBilling(
    params: ApplyUsageAndBillingParams
  ): Promise<ApplyUsageAndBillingResult>;

  /**
   * Preview cost estimate for planned items (no side effects).
   * Used by doctor during planning.
   */
  previewPlanCost(
    params: PreviewPlanCostParams
  ): Promise<PreviewPlanCostResult>;
}
```

**Method Responsibilities**:

#### `applyUsageAndBilling(params)`
**Single Responsibility**: Orchestrate transactional consumption + billing

**Internal Helpers** (each does one thing):
1. `validateStock(items[])` → throws if insufficient
2. `checkIdempotency(externalRef)` → returns existing if found
3. `createUsageRecords(tx, items[], externalRef, sourceFormKey)` → creates InventoryUsage, decrements stock
4. `ensurePayment(tx, surgicalCaseId | appointmentId)` → gets or creates Payment
5. `createBillLinesIfBillable(tx, paymentId, usageRecords[])` → creates PatientBill for billable items
6. `linkUsageToBillLines(tx, usageRecords[], billItems[])` → sets InventoryUsage.bill_item_id
7. `recomputePaymentTotals(tx, paymentId)` → sums all PatientBill.total_cost, updates Payment.total_amount

**Transaction Boundary**: All helpers execute within `prisma.$transaction()`

**Idempotency**: Check `externalRef` BEFORE transaction. If exists, return existing result.

#### `previewPlanCost(params)`
**Single Responsibility**: Calculate cost estimate (read-only, no side effects)

**Internal Helpers**:
1. `fetchItemsWithPrices(itemIds[])` → gets current prices
2. `calculateTotals(items[], prices[])` → sums costs

**No Transaction**: Read-only operation

**DTOs**:
```typescript
interface ApplyUsageAndBillingParams {
  surgicalCaseId?: string;
  appointmentId?: number;
  externalRef: string;  // UUID from client (required)
  sourceFormKey: SourceFormKey;
  items: Array<{
    inventoryItemId: number;
    quantityUsed: number;
    notes?: string;
  }>;
  recordedBy: string;  // User ID who recorded
  usedBy?: string;      // User ID who used (optional, defaults to recordedBy)
  usedAt?: Date;        // Optional, defaults to now
}

interface ApplyUsageAndBillingResult {
  usageRecords: Array<{
    id: number;
    inventoryItemId: number;
    quantityUsed: number;
    totalCost: number;
    billItemId: number | null;
  }>;
  billItems: Array<{
    id: number;
    serviceId: number;
    totalCost: number;
    inventoryUsageId: number;
  }>;
  payment: {
    id: number;
    totalAmount: number;
    billItemCount: number;
  };
  isIdempotentReplay: boolean;  // true if externalRef was already processed
}

interface PreviewPlanCostParams {
  items: Array<{
    inventoryItemId: number;
    plannedQuantity: number;
  }>;
}

interface PreviewPlanCostResult {
  items: Array<{
    inventoryItemId: number;
    itemName: string;
    plannedQuantity: number;
    unitCost: number;
    totalCost: number;
    isBillable: boolean;
  }>;
  totalBillableCost: number;
  totalNonBillableCost: number;
  grandTotal: number;
}

enum SourceFormKey {
  NURSE_MED_ADMIN = 'NURSE_MED_ADMIN',
  NURSE_PREOP_WARD = 'NURSE_PREOP_WARD',
  NURSE_INTRAOP = 'NURSE_INTRAOP',
  NURSE_RECOVERY = 'NURSE_RECOVERY',
  DOCTOR_OPERATIVE_NOTE = 'DOCTOR_OPERATIVE_NOTE',
}
```

**MedicationService Refactoring Decision**: **WRAPPER PATTERN**

**Justification**:
- `MedicationService` has existing API contracts (`/med-admin` endpoint)
- Wrapper maintains backward compatibility
- Gradual migration: wrapper calls unified service
- Future: deprecate wrapper, migrate endpoints to unified API

**Wrapper Implementation**:
```typescript
// MedicationService becomes thin wrapper
class MedicationService {
  constructor(
    private db: PrismaClient,
    private consumptionService: InventoryConsumptionBillingService
  ) {}

  async administerMedication(caseId, formResponseId, dto, userId) {
    // Map medication DTO to unified service params
    const params: ApplyUsageAndBillingParams = {
      surgicalCaseId: caseId,
      externalRef: crypto.randomUUID(),  // Generate if not provided
      sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
      items: dto.inventoryItemId ? [{
        inventoryItemId: dto.inventoryItemId,
        quantityUsed: 1,  // Medications typically 1 unit
        notes: dto.notes,
      }] : [],
      recordedBy: userId,
      usedBy: dto.administerNow ? userId : undefined,
      usedAt: dto.administeredAt ? new Date(dto.administeredAt) : undefined,
    };

    const result = await this.consumptionService.applyUsageAndBilling(params);

    // Map result back to medication record format
    // Create SurgicalMedicationRecord if needed
    // Return in expected format
  }
}
```

---

## 3. API Contracts & DTOs

### 3.1 Planned Items API

#### `POST /api/doctor/surgical-cases/[caseId]/planned-items`

**Request Body** (Zod Schema):
```typescript
const PlannedItemsRequestSchema = z.object({
  items: z.array(z.object({
    inventoryItemId: z.number().int().positive(),
    plannedQuantity: z.number().positive(),
    notes: z.string().optional(),
  })).min(1),
  services: z.array(z.object({
    serviceId: z.number().int().positive(),
    plannedQuantity: z.number().int().positive().default(1),
    notes: z.string().optional(),
  })).optional(),
});
```

**Response**: `ApiResponse<PlannedItemsResponseDto>`
```typescript
interface PlannedItemsResponseDto {
  plannedItems: Array<{
    id: number;
    inventoryItemId: number | null;
    serviceId: number | null;
    plannedQuantity: number;
    plannedUnitPrice: number;
    notes: string | null;
    createdAt: string;
  }>;
  costEstimate: {
    totalBillableCost: number;
    totalNonBillableCost: number;
    grandTotal: number;
  };
}
```

**Behavior**:
1. Validate case exists and doctor is primary surgeon
2. Get or create `CasePlan` for surgical case
3. Transaction:
   - Delete all existing `CasePlanPlannedItem` for `case_plan_id`
   - Insert new planned items (snapshot `unit_cost` as `planned_unit_price`)
   - Insert new planned services (if provided)
4. Calculate cost estimate
5. Return planned items + estimate

**Errors**:
- 404: Surgical case not found
- 403: Not primary surgeon
- 400: Invalid item/service ID or inactive item
- 422: Item not found or inactive

#### `GET /api/doctor/surgical-cases/[caseId]/planned-items`

**Response**: `ApiResponse<PlannedItemsResponseDto>`

**Behavior**: Return existing planned items for case plan.

---

### 3.2 Consumption API

#### `POST /api/nurse/surgical-cases/[caseId]/usage`

**Request Body** (Zod Schema):
```typescript
const UsageRequestSchema = z.object({
  externalRef: z.string().uuid(),  // REQUIRED: client-generated UUID
  sourceFormKey: z.nativeEnum(SourceFormKey),
  items: z.array(z.object({
    inventoryItemId: z.number().int().positive(),
    quantityUsed: z.number().positive(),
    notes: z.string().optional(),
  })).min(1),
  usedBy: z.string().uuid().optional(),  // Defaults to authenticated user
  usedAt: z.string().datetime().optional(),  // ISO string, defaults to now
});
```

**Response**: `ApiResponse<UsageResponseDto>`
```typescript
interface UsageResponseDto {
  usageRecords: Array<{
    id: number;
    inventoryItemId: number;
    itemName: string;
    quantityUsed: number;
    unitCostAtTime: number;
    totalCost: number;
    billItemId: number | null;
    createdAt: string;
  }>;
  billItems: Array<{
    id: number;
    serviceId: number;
    serviceName: string;
    totalCost: number;
    inventoryUsageId: number;
  }>;
  payment: {
    id: number;
    totalAmount: number;
    billItemCount: number;
    status: PaymentStatus;
  };
  metadata: {
    isIdempotentReplay: boolean;  // true if externalRef was already processed
    stockWarnings: Array<{  // Items now below reorder point
      inventoryItemId: number;
      itemName: string;
      quantityOnHand: number;
      reorderPoint: number;
    }>;
  };
}
```

**Behavior**:
1. Validate `externalRef` format (UUID)
2. Check idempotency: if `externalRef` exists, return existing result with `isIdempotentReplay: true`
3. Validate case exists and user has permission (NURSE/ADMIN)
4. Call `InventoryConsumptionBillingService.applyUsageAndBilling()`
5. Check for stock warnings (items below reorder point)
6. Return usage records + billing summary

**Errors**:
- 400: Invalid UUID or validation error
- 404: Surgical case not found
- 403: Insufficient permissions
- 422: Insufficient stock (GATE_BLOCKED with metadata)

**Error Response Format** (422 Insufficient Stock):
```typescript
{
  success: false,
  error: "Insufficient stock for one or more items",
  code: "GATE_BLOCKED",
  metadata: {
    items: [
      {
        inventoryItemId: 123,
        itemName: "Mentor MemoryGel 350cc",
        requested: 2,
        available: 1,
      }
    ]
  }
}
```

#### `GET /api/nurse/surgical-cases/[caseId]/billing-summary`

**Response**: `ApiResponse<BillingSummaryDto>`
```typescript
interface BillingSummaryDto {
  payment: {
    id: number;
    billType: BillType;
    totalAmount: number;
    amountPaid: number;
    discount: number;
    status: PaymentStatus;
    billDate: string;
  };
  billItems: Array<{
    id: number;
    serviceId: number;
    serviceName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    serviceDate: string;
    inventoryUsageId: number | null;
    medicationRecordId: string | null;
  }>;
  usageSummary: {
    totalItemsUsed: number;
    totalBillableCost: number;
    totalNonBillableCost: number;
    byCategory: Record<InventoryCategory, { count: number; cost: number }>;
  };
}
```

---

### 3.3 Zod Schemas Summary

**Planned Items**:
- `PlannedItemsRequestSchema` (items[], services[])
- `PlannedItemsResponseDto` (plannedItems[], costEstimate)

**Usage**:
- `UsageRequestSchema` (externalRef, sourceFormKey, items[], usedBy?, usedAt?)
- `UsageResponseDto` (usageRecords[], billItems[], payment, metadata)

**Billing**:
- `BillingSummaryDto` (payment, billItems[], usageSummary)

**All endpoints return**: `ApiResponse<T>`

---

### 3.4 Error Mapping Table

| Error Condition | HTTP Status | ApiErrorCode | Metadata |
|----------------|-------------|--------------|----------|
| Invalid UUID format | 400 | VALIDATION_ERROR | `{ field: "externalRef", message: "..." }` |
| Missing required field | 400 | VALIDATION_ERROR | `{ field: "...", message: "..." }` |
| Surgical case not found | 404 | NOT_FOUND | `{ resource: "SurgicalCase", id: "..." }` |
| Not primary surgeon | 403 | FORBIDDEN | `{ reason: "Not primary surgeon" }` |
| Insufficient permissions | 403 | FORBIDDEN | `{ requiredRole: "NURSE", actualRole: "..." }` |
| Insufficient stock | 422 | GATE_BLOCKED | `{ items: [{ inventoryItemId, itemName, requested, available }] }` |
| Item not found/inactive | 422 | GATE_BLOCKED | `{ items: [{ inventoryItemId, reason: "..." }] }` |
| Duplicate externalRef | 200 | SUCCESS | `{ isIdempotentReplay: true }` (not an error) |
| Transaction failure | 500 | INTERNAL_ERROR | `{ message: "..." }` |

---

## 4. UX / Workflow Integration Rules

### 4.1 Doctor Case Plan UI Rule

**Current**: `CasePlan.implant_details` stored as JSON string (manual entry)

**New**: UI sends `plannedItems[]` (inventory-backed)

**Migration Strategy**:
- Phase 1: UI sends both `implantDetails` (legacy) and `plannedItems[]` (new)
- Backend stores both (for backward compatibility)
- Phase 2: UI removes `implantDetails` field, backend ignores it
- Phase 3: Remove `implant_details` column (future migration)

**UI Changes**:
- Replace manual implant entry form with `InventoryItemSelector` component
- Show stock availability for each item
- Show cost estimate (from `previewPlanCost`)
- Save sends `plannedItems[]` to `POST /planned-items`

### 4.2 Nurse Forms Mapping Table

| Form/Page | source_form_key | Inventory Categories | Endpoint Call |
|-----------|----------------|---------------------|---------------|
| Medication Administration | `NURSE_MED_ADMIN` | MEDICATION | `POST /api/nurse/surgical-cases/[caseId]/usage` |
| Pre-op Ward Checklist | `NURSE_PREOP_WARD` | MEDICATION, DISPOSABLE | `POST /api/nurse/surgical-cases/[caseId]/usage` |
| Intra-op Nurse Record | `NURSE_INTRAOP` | MEDICATION, IMPLANT, DEVICE, DISPOSABLE, SUTURE | `POST /api/nurse/surgical-cases/[caseId]/usage` |
| Recovery Form | `NURSE_RECOVERY` | MEDICATION, DISPOSABLE | `POST /api/nurse/surgical-cases/[caseId]/usage` |
| Doctor Operative Note | `DOCTOR_OPERATIVE_NOTE` | IMPLANT, DEVICE | `POST /api/nurse/surgical-cases/[caseId]/usage` (doctor can record) |

**Unified Flow**:
- All consumption flows call same endpoint
- `sourceFormKey` identifies origin
- Same idempotency + transaction guarantees

---

## 5. Test Strategy

### 5.1 Unit Tests

**File**: `tests/unit/application/services/InventoryConsumptionBillingService.test.ts`

**Test Cases**:

1. **Idempotency Test**
   - Name: `should return existing result when externalRef already processed`
   - Setup: Create usage record with `externalRef: "test-uuid"`
   - Action: Call `applyUsageAndBilling` with same `externalRef`
   - Assert: Returns existing result, `isIdempotentReplay: true`, no new records created

2. **Rollback Test**
   - Name: `should rollback stock decrement if billing fails`
   - Setup: Mock `createBillLinesIfBillable` to throw
   - Action: Call `applyUsageAndBilling`
   - Assert: Stock unchanged, no usage records created, transaction rolled back

3. **Billable vs Non-Billable Test**
   - Name: `should create bill only for billable items`
   - Setup: Two items (one billable, one not)
   - Action: Call `applyUsageAndBilling`
   - Assert: Both usage records created, only billable item has `billItemId`

4. **Payment Totals Update Test**
   - Name: `should update payment total_amount correctly`
   - Setup: Existing payment with `total_amount: 1000`
   - Action: Add usage with `totalCost: 500`
   - Assert: Payment `total_amount: 1500`

5. **Stock Validation Test**
   - Name: `should throw if insufficient stock`
   - Setup: Item with `quantity_on_hand: 1`
   - Action: Request `quantityUsed: 2`
   - Assert: Throws `DomainException` with stock details

6. **Multiple Items Transaction Test**
   - Name: `should process all items atomically`
   - Setup: Three items, one will fail validation
   - Action: Call `applyUsageAndBilling`
   - Assert: No items processed (all-or-nothing)

### 5.2 Contract Tests

**File**: `tests/contract/api/nurse/surgical-cases/[caseId]/usage.test.ts`

**Test Cases**:

1. **POST /usage Success**
   - Name: `should create usage and billing successfully`
   - Setup: Valid case, sufficient stock
   - Action: POST with valid `externalRef` and items
   - Assert: 200 OK, usage records created, bill items created, payment updated

2. **POST /usage Insufficient Stock**
   - Name: `should return 422 with stock details`
   - Setup: Item with insufficient stock
   - Action: POST with `quantityUsed > available`
   - Assert: 422 GATE_BLOCKED, metadata.items[] shows requested vs available

3. **POST /usage Duplicate externalRef**
   - Name: `should return 200 with idempotent replay flag`
   - Setup: Existing usage with `externalRef: "test-uuid"`
   - Action: POST with same `externalRef`
   - Assert: 200 OK, `isIdempotentReplay: true`, no new records

4. **POST /usage Invalid UUID**
   - Name: `should return 400 for invalid externalRef`
   - Action: POST with `externalRef: "not-a-uuid"`
   - Assert: 400 VALIDATION_ERROR

**File**: `tests/contract/api/doctor/surgical-cases/[caseId]/planned-items.test.ts`

**Test Cases**:

1. **POST /planned-items Replace Behavior**
   - Name: `should replace existing planned items`
   - Setup: Case plan with 3 existing planned items
   - Action: POST with 2 new items
   - Assert: Only 2 items exist (old ones deleted)

2. **POST /planned-items Invalid Item**
   - Name: `should return 422 for inactive item`
   - Action: POST with inactive `inventoryItemId`
   - Assert: 422 GATE_BLOCKED

---

## 6. Final Deliverables

### 6.1 Design Summary (40 Lines)

This design establishes a canonical pipeline separating **Planning** (doctor forecasts) from **Consumption** (nurse actual usage). Planning stores `CasePlanPlannedItem` records without stock impact. Consumption uses `InventoryConsumptionBillingService` to atomically decrement stock and create bills, with mandatory idempotency via `external_ref` UUIDs. The service unifies medication, implant, device, and consumable handling. API contracts use Zod validation and `ApiResponse<T>`. All consumption events are transactional and idempotent. Billing linkage remains `InventoryUsage.bill_item_id → PatientBill.id` (one-to-one). The design extends `InventoryUsage` with `external_ref`, `source_form_key`, and `used_at` for traceability. `MedicationService` becomes a thin wrapper around the unified service. Tests cover idempotency, rollback, and billing determinism.

### 6.2 Domain Model Table

| Model | Purpose | Key Fields | Stock Impact | Billing Impact |
|-------|---------|-----------|--------------|----------------|
| **CasePlanPlannedItem** | Planning (forecast) | `case_plan_id`, `inventory_item_id`, `planned_quantity`, `planned_unit_price`, `planned_by_user_id` | ❌ None | ❌ None (cost estimate only) |
| **InventoryUsage** | Consumption (actual) | `inventory_item_id`, `quantity_used`, `external_ref`, `source_form_key`, `used_at`, `used_by_user_id`, `bill_item_id` | ✅ Decrements | ✅ Creates bill if billable |
| **PatientBill** | Billing line item | `payment_id`, `service_id`, `total_cost`, linked to `InventoryUsage` | ❌ None | ✅ Bill line |
| **Payment** | Billing summary | `surgical_case_id`, `total_amount`, `bill_items[]` | ❌ None | ✅ Aggregates bills |

**Invariants**:
- Planning: `CasePlanPlannedItem` never affects stock
- Consumption: `InventoryUsage` always decrements stock (if item exists)
- Billing: `PatientBill` created only if `InventoryItem.is_billable = true`
- Linkage: `InventoryUsage.bill_item_id → PatientBill.id` (one-to-one, nullable)

### 6.3 Service Interface Signatures

```typescript
// application/services/InventoryConsumptionBillingService.ts

export interface InventoryConsumptionBillingService {
  applyUsageAndBilling(
    params: ApplyUsageAndBillingParams
  ): Promise<ApplyUsageAndBillingResult>;

  previewPlanCost(
    params: PreviewPlanCostParams
  ): Promise<PreviewPlanCostResult>;
}

// Internal helpers (private methods)
- validateStock(items[]): void
- checkIdempotency(externalRef): Promise<ApplyUsageAndBillingResult | null>
- createUsageRecords(tx, items[], externalRef, sourceFormKey): Promise<InventoryUsage[]>
- ensurePayment(tx, surgicalCaseId | appointmentId): Promise<Payment>
- createBillLinesIfBillable(tx, paymentId, usageRecords[]): Promise<PatientBill[]>
- linkUsageToBillLines(tx, usageRecords[], billItems[]): Promise<void>
- recomputePaymentTotals(tx, paymentId): Promise<void>
```

### 6.4 Endpoint Table

| Method | Path | Request Body | Response | Idempotent |
|--------|------|--------------|----------|------------|
| POST | `/api/doctor/surgical-cases/[caseId]/planned-items` | `PlannedItemsRequestSchema` | `ApiResponse<PlannedItemsResponseDto>` | ❌ No (replaces) |
| GET | `/api/doctor/surgical-cases/[caseId]/planned-items` | - | `ApiResponse<PlannedItemsResponseDto>` | ✅ Yes |
| POST | `/api/nurse/surgical-cases/[caseId]/usage` | `UsageRequestSchema` | `ApiResponse<UsageResponseDto>` | ✅ Yes (via externalRef) |
| GET | `/api/nurse/surgical-cases/[caseId]/billing-summary` | - | `ApiResponse<BillingSummaryDto>` | ✅ Yes |

### 6.5 Error Mapping Table

| Error Condition | HTTP | ApiErrorCode | Metadata Shape |
|----------------|------|--------------|----------------|
| Invalid UUID | 400 | VALIDATION_ERROR | `{ field: "externalRef", message: "..." }` |
| Missing field | 400 | VALIDATION_ERROR | `{ field: "...", message: "..." }` |
| Case not found | 404 | NOT_FOUND | `{ resource: "SurgicalCase", id: "..." }` |
| Not primary surgeon | 403 | FORBIDDEN | `{ reason: "Not primary surgeon" }` |
| Insufficient permissions | 403 | FORBIDDEN | `{ requiredRole: "NURSE", actualRole: "..." }` |
| Insufficient stock | 422 | GATE_BLOCKED | `{ items: [{ inventoryItemId, itemName, requested, available }] }` |
| Item not found/inactive | 422 | GATE_BLOCKED | `{ items: [{ inventoryItemId, reason: "..." }] }` |
| Duplicate externalRef | 200 | SUCCESS | `{ isIdempotentReplay: true }` |
| Transaction failure | 500 | INTERNAL_ERROR | `{ message: "..." }` |

### 6.6 Test Matrix

| Test Type | File | Test Cases | Coverage |
|-----------|------|------------|----------|
| Unit | `tests/unit/application/services/InventoryConsumptionBillingService.test.ts` | Idempotency, Rollback, Billable/Non-billable, Payment totals, Stock validation, Multi-item transaction | Service logic |
| Contract | `tests/contract/api/nurse/surgical-cases/[caseId]/usage.test.ts` | Success, Insufficient stock, Duplicate externalRef, Invalid UUID | API contracts |
| Contract | `tests/contract/api/doctor/surgical-cases/[caseId]/planned-items.test.ts` | Replace behavior, Invalid item | API contracts |

### 6.7 Phase 3 Implementation Checklist

**Database Changes**:
- [ ] Create `CasePlanPlannedItem` table with indexes and constraints
- [ ] Add `external_ref` (unique), `source_form_key`, `used_at`, `used_by_user_id` to `InventoryUsage`
- [ ] Add composite index on `InventoryUsage(surgical_case_id, inventory_item_id, used_at)`
- [ ] Add index on `InventoryUsage(source_form_key, used_at)`
- [ ] Add index on `InventoryUsage(used_by_user_id, used_at)`
- [ ] Add CHECK constraint `InventoryItem.quantity_on_hand >= 0` (optional, via raw SQL)
- [ ] Add composite index on `PatientBill(payment_id, service_id)` for duplicate detection

**Service Implementation**:
- [ ] Create `InventoryConsumptionBillingService` class
- [ ] Implement `applyUsageAndBilling()` with all helpers
- [ ] Implement `previewPlanCost()`
- [ ] Refactor `MedicationService` to wrapper pattern
- [ ] Add domain exceptions for stock validation

**API Implementation**:
- [ ] Create `POST /api/doctor/surgical-cases/[caseId]/planned-items` route
- [ ] Create `GET /api/doctor/surgical-cases/[caseId]/planned-items` route
- [ ] Create `POST /api/nurse/surgical-cases/[caseId]/usage` route
- [ ] Create `GET /api/nurse/surgical-cases/[caseId]/billing-summary` route
- [ ] Add Zod schemas for all DTOs
- [ ] Implement error handling with `ApiResponse<T>` pattern

**Repository Updates**:
- [ ] Extend `PrismaInventoryRepository` if needed (or use existing methods)
- [ ] Add methods for planned items CRUD

**Tests**:
- [ ] Write unit tests for `InventoryConsumptionBillingService`
- [ ] Write contract tests for all endpoints
- [ ] Verify idempotency behavior
- [ ] Verify rollback behavior

**UI Integration** (Phase 6, but prepare):
- [ ] Update `ClinicalPlanTab` to use inventory selector
- [ ] Remove manual `implant_details` entry
- [ ] Update nurse forms to call unified usage endpoint

---

## 7. Design Decisions Summary

1. **Planning ≠ Consumption**: Confirmed. Planning stores forecasts, consumption decrements stock.
2. **Idempotency**: Mandatory via `external_ref` UUID (client-generated).
3. **Transactionality**: All consumption operations in single transaction.
4. **Billing Linkage**: Keep existing `InventoryUsage.bill_item_id → PatientBill.id`.
5. **MedicationService**: Wrapper pattern (maintains backward compatibility).
6. **Stock Constraint**: Application guard (can add DB constraint later).
7. **Planned Items**: Link to `CasePlan` (not `SurgicalCase` directly).

---

**END OF PHASE 2 DESIGN**
