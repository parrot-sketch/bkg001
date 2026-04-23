# Theater Tech Surgical Cases Implementation Plan

## Overview
This plan consolidates scattered call-to-action buttons into a more dropdown menu and implements full CRUD for theater tech surgical cases, including delete functionality for DRAFT cases.

## Changes Made

### 1. Actions Directory Structure Created
- **File**: `/home/bkg/fullstack-healthcare/app/actions/theater-tech/case-items.ts`
- **Purpose**: Contains all theater tech case item operations
- **Functions**:
  - `addCaseItem(caseId, inventoryItemId, quantity, notes)` - Adds inventory items to a surgical case
  - `removeCaseItem(itemId)` - Removes items from a surgical case
  - `updateCaseItemQuantity(itemId, quantity)` - Updates item quantities
  - `deleteCase(caseId)` - Deletes DRAFT surgical cases (NEW)

### 2. Delete API Route Created
- **File**: `/home/bkg/fullstack-healthcare/app/api/theater-tech/surgical-cases/[caseId]/route.ts`
- **Method**: DELETE
- **Functionality**:
  - Authenticates theater tech users
  - Validates case exists and is in DRAFT status
  - Deletes the case with cascade to related records
  - Returns appropriate error messages for non-draft cases

### 3. Surgical Cases Page Updated
- **File**: `/home/bkg/fullstack-healthcare/app/theater-tech/surgical-cases/page.tsx`
- **Changes**:
  - Consolidated scattered CTA buttons (Charges, Edit, Dayboard) into a MoreHorizontal dropdown menu
  - Added missing icon imports: `Pencil`, `Activity`, `MoreHorizontal`
  - Maintained separate charge sheet button and dayboard button outside dropdown for primary actions
  - Preserved all existing functionality (search, status tabs, filters)

### 4. Case Items Selector Updated
- **File**: `/home/bkg/fullstack-healthcare/app/theater-tech/dashboard/[caseId]/CaseItemsSelector.tsx`
- **No changes needed** - Already had full CRUD support via actions

## Technical Details

### Delete Validation Logic
```typescript
// Only allow deletion of DRAFT status cases
if (sc.status !== 'DRAFT') return { success: false, msg: 'Only draft cases can be deleted' };
```

### Cascade Deletion
- Deleting a surgical case automatically removes:
  - Related `SurgicalCaseItem` records
  - Related `SurgicalBillingLineItem` records
  - Related `SurgicalBillingEstimate` records
  - All other dependent records via Prisma cascade

### Icon Usage
- **MoreHorizontal**: Consolidated dropdown trigger for secondary actions
- **Pencil**: Edit case plan button (outside dropdown)
- **Activity**: Dayboard button (outside dropdown)
- **Receipt**: Charges button (outside dropdown)

## Files Modified
1. `/home/bkg/fullstack-healthcare/app/actions/theater-tech/case-items.ts` - Added deleteCase function
2. `/home/bkg/fullstack-healthcare/app/api/theater-tech/surgical-cases/[caseId]/route.ts` - New delete API route
3. `/home/bkg/fullstack-healthcare/app/theater-tech/surgical-cases/page.tsx` - Consolidated CTA buttons

## Files Verified (No Changes Needed)
1. `/home/bkg/fullstack-healthcare/app/theater-tech/dashboard/[caseId]/CaseItemsSelector.tsx` - Already has full CRUD
2. `/home/bkg/fullstack-healthcare/app/theater-tech/surgical-cases/[caseId]/page.tsx` - Detail page
3. `/home/bkg/fullstack-healthcare/app/theater-tech/surgical-cases/[caseId]/edit/page.tsx` - Edit form
4. `/home/bkg/fullstack-healthcare/app/theater-tech/dashboard/[caseId]/page.tsx` - Dashboard/Dayboard

## Testing Checklist
- [ ] Verify More dropdown appears with 3 buttons (Charges, Edit, Dayboard)
- [ ] Verify Charges button opens charge sheet
- [ ] Verify Edit button navigates to edit page
- [ ] Verify Dayboard button navigates to dayboard
- [ ] Verify delete only works for DRAFT cases
- [ ] Verify delete fails for non-DRAFT cases with proper error
- [ ] Verify case deletion removes all related records
- [ ] Verify UI revalidation after add/remove/update operations
