# PHASE 1: Inventory-Billing Integration Audit Report

**Date**: 2025-02-22  
**System**: Nairobi Sculpt Aesthetic Centre (NSAC)  
**Scope**: Inventory ↔ Billing Pipeline Integration

---

## Executive Summary

This audit maps the current state of inventory management, billing, and their integration points. The system has foundational pieces in place but lacks a unified, transactional, idempotent pipeline for inventory consumption → billing creation.

**Key Finding**: Planning (doctor case plan) and Consumption (nurse medication entry) are currently disconnected. MedicationService already handles consumption+billing for medications, but there's no equivalent for implants/devices, and no planned items tracking.

---

## 1. Database Models (Prisma Schema)

### 1.1 Core Inventory Models

**File**: `prisma/schema.prisma`

#### `InventoryItem` (Lines 620-646)
```prisma
model InventoryItem {
  id                 Int                        @id @default(autoincrement())
  name               String
  sku                String?                    @unique
  category           InventoryCategory          @default(OTHER)
  unit_cost          Float                      @default(0)
  quantity_on_hand   Int                        @default(0)
  reorder_point      Int                        @default(0)
  is_active          Boolean                    @default(true)
  is_billable        Boolean                    @default(true)
  is_implant         Boolean                    @default(false)
  manufacturer       String?
  // Relations
  batches            InventoryBatch[]
  usage_records      InventoryUsage[]
  medication_records SurgicalMedicationRecord[]
}
```

**Status**: ✅ Complete
- Has `is_billable` flag
- Has `is_implant` flag
- Has stock tracking (`quantity_on_hand`)
- **Missing**: No planned items relationship

#### `InventoryUsage` (Lines 670-698)
```prisma
model InventoryUsage {
  id                            Int                       @id @default(autoincrement())
  inventory_item_id             Int
  surgical_case_id              String?
  appointment_id                Int?
  quantity_used                 Float                     @default(1)
  unit_cost_at_time             Float
  total_cost                    Float
  recorded_by                   String
  notes                         String?
  bill_item_id                  Int?                      @unique
  inventory_batch_id            String?
  surgical_medication_record_id String?                   @unique
  created_at                    DateTime                  @default(now())
  // Relations
  inventory_item                InventoryItem             @relation(...)
  surgical_case                 SurgicalCase?             @relation(...)
  bill_item                     PatientBill?              @relation(...)
  surgical_medication_record    SurgicalMedicationRecord? @relation(...)
}
```

**Status**: ✅ Complete
- Links to `PatientBill` via `bill_item_id`
- Links to `SurgicalCase` and `Appointment`
- Has cost snapshot (`unit_cost_at_time`)
- **Missing**: No `external_ref` (idempotency key)
- **Missing**: No `source_form_key` (ward-prep/intra-op/recovery)
- **Missing**: No `used_at` timestamp (only `created_at`)

**Indexes Present**:
- `inventory_item_id`
- `surgical_case_id`
- `appointment_id`
- `recorded_by`
- `created_at`

**Missing Indexes**:
- Composite: `(surgical_case_id, inventory_item_id, created_at)` for usage queries
- `bill_item_id` (already unique, but no explicit index for joins)

### 1.2 Billing Models

#### `Payment` (Lines 546-576)
```prisma
model Payment {
  id               Int           @id @default(autoincrement())
  patient_id       String
  appointment_id   Int?          @unique
  surgical_case_id String?       @unique
  bill_date        DateTime
  payment_date     DateTime?
  discount         Float         @default(0)
  total_amount     Float
  amount_paid      Float         @default(0)
  payment_method   PaymentMethod @default(CASH)
  status           PaymentStatus @default(UNPAID)
  bill_type        BillType      @default(CONSULTATION)
  bill_items       PatientBill[]
}
```

**Status**: ✅ Complete
- Supports both `appointment_id` and `surgical_case_id`
- Has `bill_type` enum (CONSULTATION, SURGERY, LAB_TEST, FOLLOW_UP, OTHER)
- **Missing**: No automatic recalculation trigger (manual `increment` in code)

#### `PatientBill` (Lines 578-597)
```prisma
model PatientBill {
  id                            Int                       @id @default(autoincrement())
  payment_id                    Int
  service_id                    Int
  service_date                  DateTime
  quantity                      Int                       @default(1)
  unit_cost                     Float
  total_cost                    Float
  surgical_medication_record_id String?                   @unique
  // Relations
  payment                       Payment                   @relation(...)
  service                       Service                   @relation(...)
  inventory_usage               InventoryUsage?
  surgical_medication_record    SurgicalMedicationRecord? @relation(...)
}
```

**Status**: ✅ Complete
- Links to `InventoryUsage` (one-to-one via `bill_item_id` in InventoryUsage)
- Links to `SurgicalMedicationRecord`
- **Missing**: No direct `inventory_item_id` (must traverse `inventory_usage`)

**Indexes Present**:
- `payment_id`
- `service_id`
- `surgical_medication_record_id`

**Missing Indexes**:
- Composite: `(payment_id, service_id)` for duplicate detection

### 1.3 Case Plan Model

#### `CasePlan` (Lines 839-870)
```prisma
model CasePlan {
  id                         Int                      @id @default(autoincrement())
  appointment_id             Int                      @unique
  surgical_case_id           String?                  @unique
  patient_id                 String
  doctor_id                  String
  procedure_plan             String?
  risk_factors               String?
  pre_op_notes               String?
  implant_details            String?  // ⚠️ JSON string, NOT inventory-backed
  planned_anesthesia         String?
  special_instructions       String?
  readiness_status           CaseReadinessStatus      @default(NOT_STARTED)
  ready_for_surgery          Boolean                  @default(false)
  estimated_duration_minutes Int?
}
```

**Status**: ⚠️ **INCOMPLETE**
- `implant_details` is a JSON string (manual entry)
- **Missing**: No relationship to `InventoryItem`
- **Missing**: No `CasePlanPlannedItem` table for planned items
- **Missing**: No planned cost tracking

### 1.4 Medication Models

#### `SurgicalMedicationRecord` (Lines 1406-1433)
```prisma
model SurgicalMedicationRecord {
  id                String                @id @default(uuid())
  surgical_case_id  String
  form_response_id  String?
  inventory_item_id Int?
  name              String
  dose_value        Float
  dose_unit         String
  route             String
  status            String  // DRAFT, ADMINISTERED, VOIDED
  administered_at   DateTime?
  administered_by   String?
  voided_at         DateTime?
  voided_by         String?
  void_reason       String?
  notes             String?
  // Relations
  inventory_usage   InventoryUsage?       @relation(...)
  bill_item         PatientBill?          @relation(...)
  inventory_item    InventoryItem?        @relation(...)
  form_response     ClinicalFormResponse? @relation(...)
}
```

**Status**: ✅ Complete
- Links to `InventoryItem` (optional)
- Links to `InventoryUsage` and `PatientBill`
- Has status tracking (DRAFT vs ADMINISTERED)

---

## 2. Current Repositories and Services

### 2.1 Inventory Repository

**File**: `infrastructure/database/repositories/PrismaInventoryRepository.ts`

#### `recordUsage()` (Lines 172-217)
```typescript
async recordUsage(dto: RecordInventoryUsageDto): Promise<InventoryUsage> {
  // 1. Fetch item + validate stock
  // 2. Transaction: create InventoryUsage + decrement stock atomically
  const [usage] = await this.prisma.$transaction([
    this.prisma.inventoryUsage.create({ ... }),
    this.prisma.inventoryItem.update({
      where: { id: dto.inventoryItemId },
      data: { quantity_on_hand: { decrement: dto.quantityUsed } },
    }),
  ]);
  return usage;
}
```

**Status**: ✅ **GOOD**
- Atomic stock decrement
- Cost snapshot (`unit_cost_at_time`)
- **Missing**: No billing creation
- **Missing**: No idempotency check

#### `linkUsageToBillItem()` (Lines 237-243)
```typescript
async linkUsageToBillItem(usageId: number, billItemId: number): Promise<InventoryUsage> {
  return this.prisma.inventoryUsage.update({
    where: { id: usageId },
    data: { bill_item_id: billItemId },
  });
}
```

**Status**: ✅ **GOOD**
- Allows linking usage to billing after the fact

### 2.2 Medication Service

**File**: `application/services/MedicationService.ts`

#### `administerMedication()` (Lines 50-157)
```typescript
async administerMedication(caseId, formResponseId, dto, userId) {
  return this.db.$transaction(async (tx) => {
    // 1. Get inventory item (if linked)
    // 2. Create SurgicalMedicationRecord
    // 3. If administerNow && inventoryItemId:
    //    - Create InventoryUsage (decrements stock)
    //    - Create PatientBill (if billable)
    //    - Update Payment.total_amount
  });
}
```

**Status**: ✅ **GOOD** (for medications only)
- Transactional: record + stock + billing
- Handles DRAFT vs ADMINISTERED
- **Missing**: Only works for medications (not implants/devices)
- **Missing**: No idempotency key
- **Missing**: Hardcoded service lookup (`category: 'Medication'`)

**Issues**:
- Line 127-129: Hardcoded service lookup
- Line 142: Uses `inventory_usage: { connect: { id: usage.id } }` (Prisma relation syntax)
- No rollback if billing fails after stock decrement (should be in same transaction ✅)

### 2.3 Billing Creation Logic

**File**: `app/actions/medical.ts`

#### `addNewBill()` (Lines 58-126)
```typescript
export async function addNewBill(data: any) {
  // 1. Get or create Payment
  // 2. Create PatientBill
  // No inventory integration
}
```

**Status**: ⚠️ **MANUAL**
- No automatic inventory usage creation
- No stock validation
- Used by frontdesk/admin for manual billing

---

## 3. Current Case Plan Save Route

**File**: `app/api/doctor/surgical-cases/[caseId]/plan/route.ts`

#### `PATCH /api/doctor/surgical-cases/[caseId]/plan` (Lines 363-558)

**Current Flow**:
1. Authenticate + authorize (doctor must be primary surgeon)
2. Validate payload (anesthesia type, duration bounds)
3. Upsert `CasePlan` with fields:
   - `procedure_plan` (HTML string)
   - `risk_factors` (HTML string)
   - `pre_op_notes` (HTML string)
   - `implant_details` (JSON string) ⚠️ **MANUAL ENTRY**
   - `planned_anesthesia` (enum)
   - `special_instructions` (HTML string)
   - `estimated_duration_minutes` (number)
4. Update `SurgicalCase` fields (procedureName, side, diagnosis)
5. Auto-transition DRAFT → PLANNING
6. Audit log

**Status**: ⚠️ **NO INVENTORY INTEGRATION**
- `implant_details` is stored as JSON string
- No inventory item selection
- No planned items table
- No stock validation
- No billing creation

**DTO Structure** (from `lib/api/case-plan.ts`):
```typescript
interface CasePlanDetailDto {
  casePlan: {
    implantDetails: string | null;  // JSON string
    // ... other fields
  };
}
```

---

## 4. Nurse Medication Entry Points

### 4.1 Medication Administration API

**File**: `app/api/nurse/surgical-cases/[caseId]/med-admin/route.ts`

#### `POST /api/nurse/surgical-cases/[caseId]/med-admin` (Lines 36-85)

**Current Flow**:
1. Authenticate (NURSE or ADMIN)
2. Validate body (name, doseValue, doseUnit, route)
3. Call `MedicationService.administerMedication()`
4. Returns medication record

**Status**: ✅ **GOOD** (for medications)
- Uses `MedicationService` which handles stock + billing
- **Missing**: No idempotency key
- **Missing**: No external reference for duplicate prevention

### 4.2 Clinical Form Responses (Ward-Prep/Intra-op/Recovery)

**Files**:
- `app/api/nurse/surgical-cases/[caseId]/forms/preop-ward/route.ts`
- `app/api/nurse/surgical-cases/[caseId]/forms/intraop/route.ts`
- `app/api/nurse/surgical-cases/[caseId]/forms/recovery/route.ts`

**Current State**: Forms store data in `ClinicalFormResponse.data_json` (JSON string). Medication entries are separate via `/med-admin` endpoint.

**Status**: ⚠️ **PARTIALLY INTEGRATED**
- Medications can be recorded via `/med-admin`
- Forms don't directly trigger inventory usage
- No unified consumption event model

---

## 5. Current Billing Creation Logic

### 5.1 Consultation Billing

**File**: `application/use-cases/CompleteConsultationUseCase.ts` (Lines 24-464)

**Current Flow**:
- Creates `Payment` with `bill_type: CONSULTATION`
- Sets `total_amount` to `DEFAULT_CONSULTATION_FEE` (5000)
- No inventory integration

### 5.2 Medication Billing

**File**: `application/services/MedicationService.ts` (Lines 102-152)

**Current Flow**:
1. Get or create `Payment` for surgical case
2. Find service with `category: 'Medication'` (hardcoded)
3. Create `PatientBill` linked to medication record
4. Update `Payment.total_amount` via `increment`

**Status**: ✅ **GOOD** (transactional)
- **Issue**: Hardcoded service lookup
- **Issue**: No service fallback if not found

### 5.3 Manual Billing

**File**: `app/actions/medical.ts` (Lines 58-126)

**Current Flow**:
- Frontdesk/admin manually creates `PatientBill` entries
- No inventory integration

---

## 6. Risks and Gaps

### 6.1 Double Billing Risk

**Risk**: HIGH
- No idempotency keys on `InventoryUsage`
- Re-saving case plan could trigger duplicate billing (if we add it)
- Nurse could accidentally submit medication twice

**Mitigation Needed**:
- Add `external_ref` (UUID) to `InventoryUsage` with UNIQUE constraint
- Require idempotency key in API requests

### 6.2 Stock Drift Risk

**Risk**: MEDIUM
- `recordUsage()` is atomic, but if billing fails after usage, stock is already decremented
- **Current**: MedicationService handles this correctly (all in one transaction)
- **Future**: Need to ensure all consumption events use same pattern

### 6.3 Race Condition Risk

**Risk**: MEDIUM
- Multiple nurses could record same medication simultaneously
- Stock check happens before decrement (non-atomic check-then-act)
- **Current**: Prisma transaction handles this (row-level locking)

**Mitigation Needed**:
- Ensure all stock operations use transactions
- Add database constraints (CHECK constraint for `quantity_on_hand >= 0`)

### 6.4 Missing Indexes

**Risk**: LOW (performance)
- Missing composite index on `InventoryUsage(surgical_case_id, inventory_item_id, created_at)`
- Missing index on `PatientBill(payment_id, service_id)` for duplicate detection

### 6.5 Planning vs Consumption Confusion

**Risk**: HIGH (business logic)
- **Current**: Case plan stores `implant_details` as JSON (manual entry)
- **Issue**: No distinction between "planned" and "consumed"
- **Issue**: Doctor planning doesn't reserve stock
- **Issue**: Nurse consumption doesn't reference plan

**Decision Required**:
- Should planning decrement stock? **NO** (per requirements: planning ≠ consumption)
- Should planning create "planned items" records? **YES** (for visibility & costing)
- Should consumption reference planned items? **OPTIONAL** (for audit trail)

---

## 7. Missing Primitives

### 7.1 Planned Items Table

**Required**: `CasePlanPlannedItem`
```prisma
model CasePlanPlannedItem {
  id                 Int          @id @default(autoincrement())
  case_plan_id       Int
  inventory_item_id  Int?         // nullable if service
  service_id         Int?         // nullable if inventory
  planned_quantity   Float
  planned_unit_price Float        // snapshot for audit
  planned_by_user_id String
  created_at         DateTime     @default(now())
  updated_at         DateTime     @updatedAt
  
  case_plan          CasePlan     @relation(...)
  inventory_item     InventoryItem? @relation(...)
  service            Service?      @relation(...)
  
  @@index([case_plan_id])
  @@index([inventory_item_id])
  @@unique([case_plan_id, inventory_item_id]) // Prevent duplicates
}
```

**Purpose**:
- Store doctor's planned items (no stock decrement)
- Show cost estimate during planning
- Allow nurse to reference plan during consumption

### 7.2 Idempotency Key

**Required**: Add to `InventoryUsage`
```prisma
model InventoryUsage {
  // ... existing fields
  external_ref       String?      @unique  // UUID from client
  source_form_key   String?      // 'NURSE_PREOP_WARD_CHECKLIST', 'NURSE_INTRAOP', etc.
  used_at           DateTime?    // Explicit timestamp (vs created_at)
}
```

**Purpose**:
- Prevent duplicate consumption events
- Track source of usage (which form/action)
- Explicit usage timestamp (vs record creation time)

### 7.3 Service Fallback

**Required**: Service lookup strategy
- Current: Hardcoded `category: 'Medication'`
- Needed: Configurable service mapping per inventory category
- Or: Create service on-the-fly if missing

---

## 8. Current Flow Summary

### 8.1 Doctor Case Plan Save

```
Doctor fills form
  ↓
PATCH /api/doctor/surgical-cases/[caseId]/plan
  ↓
Upsert CasePlan.implant_details (JSON string)
  ↓
❌ NO inventory integration
❌ NO stock validation
❌ NO billing creation
```

### 8.2 Nurse Medication Entry

```
Nurse records medication
  ↓
POST /api/nurse/surgical-cases/[caseId]/med-admin
  ↓
MedicationService.administerMedication()
  ↓
Transaction:
  1. Create SurgicalMedicationRecord
  2. Create InventoryUsage (decrements stock)
  3. Create PatientBill (if billable)
  4. Update Payment.total_amount
  ↓
✅ Stock decremented
✅ Billing created
❌ No idempotency check
❌ Hardcoded service lookup
```

### 8.3 Implant/Device Consumption

```
❌ NO CURRENT FLOW
- No API endpoint for implant/device consumption
- No service equivalent to MedicationService
- Case plan stores manual JSON
```

---

## 9. File Paths Summary

### Database
- `prisma/schema.prisma` - All models

### Repositories
- `infrastructure/database/repositories/PrismaInventoryRepository.ts` - Inventory operations

### Services
- `application/services/MedicationService.ts` - Medication administration + billing

### API Routes
- `app/api/doctor/surgical-cases/[caseId]/plan/route.ts` - Case plan save (PATCH)
- `app/api/nurse/surgical-cases/[caseId]/med-admin/route.ts` - Medication entry (POST)
- `app/api/inventory/items/route.ts` - Inventory item CRUD
- `app/api/inventory/usage/route.ts` - Inventory usage recording

### Actions (Legacy)
- `app/actions/medical.ts` - Manual billing creation

### Frontend
- `components/doctor/case-plan/ClinicalPlanTab.tsx` - Case plan form (manual implant entry)
- `hooks/doctor/useCasePlan.ts` - Case plan mutations

---

## 10. Decision Check

### ✅ Planning Does NOT Decrement Stock
**Confirmed**: Per requirements, planning is a forecast. Stock decrement only happens at consumption (nurse records actual usage).

### ✅ Consumption DOES Decrement Stock and Create Bills
**Confirmed**: `MedicationService.administerMedication()` already does this for medications. Need equivalent for implants/devices.

### ✅ If Disagreement
**Justification**: Real clinical workflow:
1. Doctor plans procedure → selects items → creates plan (no stock change)
2. Nurse prepares case → records medications used → stock decremented + billed
3. Nurse in theater → records implants/devices used → stock decremented + billed

**Safeguards**:
- Planning creates "planned items" for visibility
- Consumption requires explicit nurse action (not automatic)
- All consumption events are transactional (stock + billing)

---

## 11. Next Steps

### Phase 2: Domain Design
- Define `CasePlanPlannedItem` model
- Define consumption event model (extend `InventoryUsage`)
- Design `InventoryBillingService` interface

### Phase 3: DB Changes
- Create migration for `CasePlanPlannedItem`
- Add `external_ref`, `source_form_key`, `used_at` to `InventoryUsage`
- Add missing indexes
- Add CHECK constraint for stock >= 0

### Phase 4: Service Implementation
- Create `InventoryBillingService` (transactional, idempotent)
- Extend `MedicationService` or create unified service
- Add service lookup strategy

### Phase 5: API Contracts
- `POST /api/surgical-cases/[caseId]/planned-items` - Store planned items
- `POST /api/surgical-cases/[caseId]/usage` - Record consumption (idempotent)
- `GET /api/surgical-cases/[caseId]/billing-summary` - View billing

### Phase 6: UI Integration
- Replace manual implant entry with inventory selector
- Show planned items in case plan
- Nurse forms trigger consumption API

### Phase 7: Tests
- Unit tests for `InventoryBillingService`
- Integration tests for consumption API
- Idempotency tests
- Rollback tests

---

## 12. Conclusion

The system has solid foundations:
- ✅ Inventory models with billing links
- ✅ Transactional stock decrement
- ✅ Medication consumption + billing working

**Gaps**:
- ❌ No planned items tracking
- ❌ No idempotency
- ❌ No unified consumption service (only medications)
- ❌ Case plan uses manual entry (not inventory-backed)

**Recommendation**: Proceed with Phase 2 (Domain Design) to define the canonical planning vs consumption model, then implement from DB up.
