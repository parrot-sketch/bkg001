# Inventory and Billing Integration Design

## Overview

This document outlines the integration between:
1. **Surgical Case Plan Form** - Where doctors plan procedures and select inventory items
2. **Inventory System** - Tracks stock levels and usage
3. **Billing System** - Automatically creates bills when items/services are used

## Current State

### What Works
- ✅ Inventory items can be created and managed
- ✅ Inventory usage can be recorded (decrements stock automatically)
- ✅ Billing system exists for appointments and surgical cases
- ✅ `InventoryUsage` has a `bill_item_id` field to link to `PatientBill`

### What's Missing
- ❌ Case plan form uses manual entry for implants (not linked to inventory)
- ❌ No automatic billing creation when inventory items are used
- ❌ No automatic billing creation when services are selected in case plan
- ❌ No integration between case plan saving and inventory usage recording

## Design Goals

1. **Smart Form**: Case plan form should select from actual inventory items
2. **Automatic Stock Management**: When items are selected, stock is decremented
3. **Automatic Billing**: When billable items/services are used, billing entries are created
4. **Single Source of Truth**: Inventory items are the source, not manual entry
5. **Audit Trail**: All inventory usage and billing is tracked

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Doctor fills Case Plan Form                                │
│  - Selects procedure/service                                │
│  - Selects inventory items (implants, devices)              │
│  - Saves plan                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Case Plan API (POST /api/doctor/case-plans/[id])          │
│  - Validates inventory items exist and have stock            │
│  - Creates/updates CasePlan record                          │
│  - Calls InventoryBillingService                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  InventoryBillingService                                    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 1. Record Inventory Usage                            │  │
│  │    - Creates InventoryUsage records                   │  │
│  │    - Decrements stock (via PrismaInventoryRepository)│  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 2. Create Billing Entries                             │  │
│  │    - Gets or creates Payment record                   │  │
│  │    - Creates PatientBill for billable items          │  │
│  │    - Links InventoryUsage.bill_item_id                │  │
│  │    - Creates PatientBill for services                │  │
│  │    - Updates Payment.total_amount                     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Update Case Plan Form UI

**File**: `components/doctor/case-plan/ClinicalPlanTab.tsx`

**Changes**:
1. Replace manual implant entry with inventory item selector
2. Add inventory item search/select component
3. Show stock availability for each item
4. Allow quantity selection
5. Show billable status

**UI Components Needed**:
- `InventoryItemSelector` - Searchable dropdown with stock info
- `SelectedInventoryItems` - List of selected items with quantities

### Phase 2: Create InventoryBillingService

**File**: `domain/services/InventoryBillingService.ts`

**Responsibilities**:
1. Record inventory usage for selected items
2. Create billing entries for billable items
3. Create billing entries for services
4. Link inventory usage to billing entries
5. Update payment totals

**Methods**:
```typescript
async recordInventoryUsageAndBilling(params: {
  surgicalCaseId: string;
  appointmentId?: number;
  inventoryItems: Array<{ itemId: number; quantity: number }>;
  services?: Array<{ serviceId: number; quantity?: number }>;
  recordedBy: string;
}): Promise<{
  usageRecords: InventoryUsage[];
  billItems: PatientBill[];
  payment: Payment;
}>
```

### Phase 3: Update Case Plan API

**File**: `app/api/doctor/case-plans/[id]/route.ts` (or wherever case plan is saved)

**Changes**:
1. Accept `inventoryItems` array in request body
2. Accept `serviceIds` array in request body
3. Call `InventoryBillingService` after saving case plan
4. Return inventory usage and billing info in response

### Phase 4: Update Seed Data

**File**: `prisma/seed.ts`

**Changes**:
1. Create sample inventory items (implants, devices)
2. Set proper stock levels
3. Mark items as billable/non-billable appropriately

## Data Flow

### When Case Plan is Saved

1. **Frontend** sends:
```json
{
  "procedurePlan": "...",
  "riskFactors": "...",
  "inventoryItems": [
    { "itemId": 1, "quantity": 2 },
    { "itemId": 5, "quantity": 1 }
  ],
  "serviceIds": [10, 15]
}
```

2. **Backend** processes:
   - Validates inventory items exist and have sufficient stock
   - Saves case plan
   - Calls `InventoryBillingService.recordInventoryUsageAndBilling()`
   - Returns updated case plan with usage/billing info

3. **InventoryBillingService**:
   - Records usage for each inventory item (decrements stock)
   - Gets or creates Payment record for surgical case
   - Creates PatientBill entries for billable items
   - Creates PatientBill entries for services
   - Links InventoryUsage.bill_item_id to PatientBill.id
   - Updates Payment.total_amount

## Database Schema

### Existing Tables (No Changes Needed)
- `InventoryItem` - Already has `is_billable`, `unit_cost`, `quantity_on_hand`
- `InventoryUsage` - Already has `bill_item_id`, `surgical_case_id`
- `Payment` - Already has `surgical_case_id`
- `PatientBill` - Already has `payment_id`, `service_id`

### Relationships
```
SurgicalCase
  ├── Payment (one-to-one via surgical_case_id)
  │     └── PatientBill[] (one-to-many via payment_id)
  │           └── InventoryUsage (one-to-one via bill_item_id)
  └── InventoryUsage[] (one-to-many via surgical_case_id)
```

## Error Handling

### Insufficient Stock
- **When**: User selects item with quantity > available stock
- **Action**: Show error in UI before save, or return error from API
- **Message**: "Insufficient stock for [Item Name]: requested X, available Y"

### Item Not Found
- **When**: Selected inventory item was deleted/deactivated
- **Action**: Return error from API
- **Message**: "Inventory item [ID] not found or inactive"

### Billing Errors
- **When**: Payment creation fails
- **Action**: Rollback inventory usage transaction
- **Message**: "Failed to create billing entry. Inventory usage not recorded."

## Testing Strategy

### Unit Tests
- `InventoryBillingService` methods
- Stock validation logic
- Billing calculation logic

### Integration Tests
- Case plan save with inventory items
- Stock decrement verification
- Billing entry creation
- Transaction rollback on errors

### E2E Tests
- Doctor selects inventory items in case plan
- Saves case plan
- Verifies stock decreased
- Verifies billing entries created
- Verifies payment total updated

## Migration Path

1. **Phase 1**: Update UI to show inventory selector (but still allow manual entry as fallback)
2. **Phase 2**: Implement InventoryBillingService
3. **Phase 3**: Update API to use InventoryBillingService
4. **Phase 4**: Remove manual entry option, require inventory selection
5. **Phase 5**: Migrate existing manual entries to inventory items (if needed)

## Future Enhancements

1. **Batch Selection**: Allow selecting multiple items at once
2. **Reservations**: Reserve items when case plan is created (before surgery)
3. **Return/Adjustment**: Handle item returns or quantity adjustments
4. **Price Override**: Allow doctors to override item prices for specific cases
5. **Service Pricing**: Allow doctors to set custom prices for services per case
