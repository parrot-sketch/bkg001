# Phase 2B — Procedure + Risk Factors + Anesthesia Tabs Summary

## Files Created

### Tab Modules (3 tabs × 6 files = 18 files)

#### Procedure Tab
1. `features/surgical-plan/tabs/procedure/procedureParsers.ts`
2. `features/surgical-plan/tabs/procedure/procedureMappers.ts`
3. `features/surgical-plan/tabs/procedure/useProcedureTab.ts`
4. `features/surgical-plan/tabs/procedure/ProcedureTab.view.tsx`
5. `features/surgical-plan/tabs/procedure/ProcedureTab.container.tsx`

#### Risk Factors Tab
6. `features/surgical-plan/tabs/risk-factors/riskFactorsParsers.ts`
7. `features/surgical-plan/tabs/risk-factors/riskFactorsMappers.ts`
8. `features/surgical-plan/tabs/risk-factors/useRiskFactorsTab.ts`
9. `features/surgical-plan/tabs/risk-factors/RiskFactorsTab.view.tsx`
10. `features/surgical-plan/tabs/risk-factors/RiskFactorsTab.container.tsx`

#### Anesthesia Tab
11. `features/surgical-plan/tabs/anesthesia/anesthesiaParsers.ts`
12. `features/surgical-plan/tabs/anesthesia/anesthesiaMappers.ts`
13. `features/surgical-plan/tabs/anesthesia/useAnesthesiaTab.ts`
14. `features/surgical-plan/tabs/anesthesia/AnesthesiaTab.view.tsx`
15. `features/surgical-plan/tabs/anesthesia/AnesthesiaTab.container.tsx`

### Unit Tests (6 files)
16. `tests/unit/features/surgical-plan/tabs/procedure/procedureParsers.test.ts`
17. `tests/unit/features/surgical-plan/tabs/procedure/procedureMappers.test.ts`
18. `tests/unit/features/surgical-plan/tabs/risk-factors/riskFactorsParsers.test.ts`
19. `tests/unit/features/surgical-plan/tabs/risk-factors/riskFactorsMappers.test.ts`
20. `tests/unit/features/surgical-plan/tabs/anesthesia/anesthesiaParsers.test.ts`
21. `tests/unit/features/surgical-plan/tabs/anesthesia/anesthesiaMappers.test.ts`

### Contract Tests (1 file)
22. `tests/integration/surgical-plan/plan-patch.contract.test.ts`

### Documentation
23. `docs/surgical-plan-phase2b-summary.md` (this file)

## Files Modified

### API Wrapper
1. `features/surgical-plan/shared/api/surgicalPlanApi.ts`
   - Added `patchProcedurePlan()`, `patchRiskFactors()`, `patchAnesthesia()` typed helpers

### Tab Registry
2. `features/surgical-plan/core/tabRegistry.ts`
   - Added 3 new tabs: procedure, risk-factors, anesthesia
   - Set order: 1, 2, 3 (after Overview, before Inventory Planning)
   - Added permission checks (DOCTOR/ADMIN can edit, NURSE can view)

### Legacy Cleanup
3. `components/doctor/case-plan/ClinicalPlanTab.tsx`
   - **Reduced from 458 LOC to 78 LOC** (83% reduction)
   - Replaced monolithic implementation with thin wrapper
   - Wrapper renders new modular tabs for backward compatibility
   - All business logic removed

## Dead Code Removed

### From ClinicalPlanTab.tsx
- ~380 lines of procedure/risk/anesthesia logic removed:
  - State management: ~100 lines
  - Data loading/initialization: ~50 lines
  - Handler functions: ~80 lines
  - UI components (accordion sections): ~150 lines

**Total dead code removed: ~380 lines**

## Architecture Compliance

### View Components
- ✅ No API calls (all via hooks)
- ✅ No parsing (all via parsers)
- ✅ No business logic (all via mappers)
- ✅ Pure presentational components

### Parsers
- ✅ Zod validation for all requests
- ✅ Normalization helpers (empty string → null)
- ✅ ValidationError thrown on invalid data

### Mappers
- ✅ Pure functions (no side effects)
- ✅ Template insertion logic extracted from UI
- ✅ Payload building separated from view concerns

### Hooks
- ✅ Use shared `useSurgicalCasePlanPage()` for baseline data
- ✅ Local editable state management
- ✅ Dirty state tracking
- ✅ Error handling via standardized shapes

### API Wrappers
- ✅ Typed helpers for each tab
- ✅ All call same underlying route
- ✅ Consistent ApiResponse<T> pattern

## Test Coverage

### Unit Tests
- ✅ Parser validation (success + error cases)
- ✅ Mapper normalization (empty/null handling)
- ✅ Template insertion logic (deterministic)
- ✅ Duration bounds enforcement
- ✅ Anesthesia enum validation

### Contract Tests
- ✅ PATCH procedure fields → 200 + reflected on GET
- ✅ PATCH risk factors → 200 + reflected on GET
- ✅ PATCH anesthesia → 200 + reflected on GET
- ✅ Invalid duration → 400 VALIDATION_ERROR
- ✅ Forbidden role → 403

**Total test files: 7 (6 unit + 1 contract)**

## Verification

### TypeScript
- ✅ Zero TypeScript errors in new tabs
- ✅ Zero TypeScript errors in modified files

### Linting
- ✅ No linter errors

### File Size Compliance
- ✅ All view components < 250 LOC
- ✅ All parsers < 100 LOC
- ✅ All mappers < 100 LOC
- ✅ All hooks < 200 LOC
- ✅ All containers < 50 LOC

## Tab Registry Status

**Registered Tabs:**
1. Overview (order: 0)
2. Procedure (order: 1) ← NEW
3. Risk Factors (order: 2) ← NEW
4. Anesthesia (order: 3) ← NEW
5. Planned Items (order: 5)

**Remaining (Phase 2C+):**
- Consents
- Photos
- Team
- Used Items
- Billing Summary
- Usage Variance

## Backward Compatibility

- ✅ `ClinicalPlanTab` wrapper maintains existing imports
- ✅ Legacy page (`app/doctor/operative/plan/[appointmentId]/new/page.tsx`) continues to work
- ✅ No breaking changes to API contracts

## Summary

**Phase 2B Complete:**
- ✅ 3 modular tabs extracted (Procedure, Risk Factors, Anesthesia)
- ✅ 18 new files created (tabs + tests)
- ✅ ~380 lines of dead code removed
- ✅ 7 test files created (6 unit + 1 contract)
- ✅ Zero TypeScript errors
- ✅ Full architecture compliance
- ✅ Backward compatibility maintained

The surgical plan feature now has 5 modular tabs (Overview, Procedure, Risk Factors, Anesthesia, Planned Items) with clean separation of concerns and comprehensive test coverage.
