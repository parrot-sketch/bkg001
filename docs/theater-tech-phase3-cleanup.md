# Theater Tech Phase 3 Cleanup — Legacy Route Removal

## Overview
This document tracks the removal of legacy/duplicate routes and deprecated service methods as part of Phase 3D cleanup.

## Legacy Routes Removed

### 1. `/api/theater-tech/today` (GET)
**Status:** ✅ DELETED  
**Reason:** Replaced by canonical `/api/theater-tech/dayboard` endpoint  
**Used by:** `app/theater-tech/dashboard/page.tsx` (legacy page)  
**Migration:** Use `/api/theater-tech/dayboard?date=YYYY-MM-DD` instead

### 2. `/api/theater-tech/cases/[id]/checklist` (GET + PATCH)
**Status:** ✅ DELETED  
**Reason:** Replaced by canonical `/api/theater-tech/surgical-cases/[caseId]/checklist` endpoints  
**Used by:** `app/theater-tech/dashboard/page.tsx` (legacy page)  
**Migration:**
- GET: Use `/api/theater-tech/surgical-cases/[caseId]/checklist`
- PATCH: Use `/api/theater-tech/surgical-cases/[caseId]/checklist/{phase}/finalize` (POST)

### 3. `/api/theater-tech/cases/[id]/procedure-record/timestamps` (PATCH)
**Status:** ✅ DELETED  
**Reason:** Replaced by canonical `/api/theater-tech/surgical-cases/[caseId]/timeline` endpoint  
**Used by:** `app/theater-tech/dashboard/page.tsx` (legacy page)  
**Migration:** Use `/api/theater-tech/surgical-cases/[caseId]/timeline` (PATCH)

## Legacy UI Pages Removed

### `app/theater-tech/dashboard/page.tsx`
**Status:** ✅ DELETED  
**Reason:** Replaced by canonical `/theater-tech/dayboard` page  
**Sidebar:** Updated to remove "Legacy Board" link

## Deprecated Service Methods Removed

### TheaterTechService
**Status:** ✅ REMOVED  
**Methods removed:**
- `getChecklist()` → Use `getChecklistStatus()` instead
- `getChecklistByCaseId()` → Use `getChecklistStatus()` instead
- `updateProcedureTimestamps()` → Use `updateTimeline()` instead
- `completeChecklistPhase()` → Use `finalizeChecklistPhase()` instead

## Verification
- ✅ No remaining imports of legacy routes
- ✅ No remaining calls to deprecated service methods
- ✅ Sidebar updated to remove legacy links
- ✅ All functionality migrated to canonical endpoints
- ✅ Tests updated to remove deprecated method tests
- ✅ TypeScript compilation passes
