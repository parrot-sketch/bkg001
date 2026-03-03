# Surgical Plan Redesign — Commit Plan

**Based on:** `docs/surgical-plan-redesign-audit.md`  
**Strategy:** Highest-risk, highest-impact tabs first, then supporting features

---

## COMMIT STRATEGY

Each commit should:
1. Extract one tab OR one shared infrastructure piece
2. Maintain backward compatibility (old code remains until all tabs migrated)
3. Add tests alongside code
4. Pass `pnpm tsc --noEmit` and `pnpm test`
5. Be reviewable as a standalone PR

---

## PHASE 1: FOUNDATION (Shared Infrastructure)

### Commit 1.1: Core Types & Constants
**Files:**
- `features/surgical-plan/core/types.ts` (NEW)
- `features/surgical-plan/core/constants.ts` (NEW)

**Extract from:**
- `ClinicalPlanTab.tsx` lines 54-131 (type definitions)
- `ClinicalPlanTab.tsx` lines 45-52 (ANESTHESIA_TYPES)

**Changes:**
- Move all inline type definitions to shared types file
- Move constants to constants file
- Update imports in ClinicalPlanTab (keep working)

**Tests:** None (pure types)

**Risk:** Low  
**Impact:** Enables all other tabs

---

### Commit 1.2: Shared Components
**Files:**
- `features/surgical-plan/shared/components/ErrorState.tsx` (NEW)
- `features/surgical-plan/shared/components/EmptyState.tsx` (NEW)
- `features/surgical-plan/shared/components/SaveBar.tsx` (NEW)
- `features/surgical-plan/shared/components/SectionStatus.tsx` (NEW — extracted from ClinicalPlanTab)

**Extract from:**
- `ClinicalPlanTab.tsx` lines 140-151 (SectionStatus)
- Common error/empty patterns across tabs

**Changes:**
- Create reusable error/empty/save components
- Extract SectionStatus to shared

**Tests:** Component snapshot tests

**Risk:** Low  
**Impact:** Reduces duplication across tabs

---

### Commit 1.3: Shared Hooks & Mappers
**Files:**
- `features/surgical-plan/shared/hooks/useSurgicalCase.ts` (NEW — wrapper around useCasePlanDetail)
- `features/surgical-plan/shared/mappers/dtoMappers.ts` (NEW)

**Extract from:**
- `page.tsx` lines 132-173 (`adaptForLegacyTabs`)
- Common DTO transformation patterns

**Changes:**
- Create `useSurgicalCase` hook (wraps `useCasePlanDetail` with error handling)
- Create mapper functions for DTO → ViewModel transformations
- Keep `adaptForLegacyTabs` temporarily (will be removed in Phase 3)

**Tests:** Mapper unit tests

**Risk:** Low  
**Impact:** Standardizes data access pattern

---

### Commit 1.4: Tab Registry System
**Files:**
- `features/surgical-plan/core/tabRegistry.ts` (NEW)
- `features/surgical-plan/SurgicalPlanShell.tsx` (NEW)

**Changes:**
- Define `TabDefinition` interface
- Create registry with placeholder tabs (all delegate to old components initially)
- Create `SurgicalPlanShell` component that uses registry
- Update page.tsx to use `SurgicalPlanShell` (backward compatible)

**Tests:** Registry unit tests

**Risk:** Medium (touches page entry point)  
**Impact:** Enables declarative tab management

---

## PHASE 2: HIGH-RISK TABS (Core Clinical Data)

### Commit 2.1: Inventory Planning Tab
**Files:**
- `features/surgical-plan/tabs/inventory-planning/InventoryPlanningTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/inventory-planning/InventoryPlanningTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/inventory-planning/inventoryPlanningParsers.ts` (NEW)
- `features/surgical-plan/tabs/inventory-planning/useInventoryPlanningTab.ts` (NEW)
- `features/surgical-plan/tabs/inventory-planning/__tests__/` (NEW)

**Extract from:**
- `ClinicalPlanTab.tsx` lines 170-348 (inventory state + handlers)
- `ClinicalPlanTab.tsx` lines 604-759 (implants/devices UI)
- `InventoryTabs.tsx` PlannedItemsTab (merge with ClinicalPlanTab inventory section)

**API Endpoints:**
- `GET /api/inventory/items?category=IMPLANT&pageSize=100`
- `GET /api/inventory/items?category=INSTRUMENT&pageSize=100`
- `GET /api/doctor/surgical-cases/[caseId]/planned-items`
- `POST /api/doctor/surgical-cases/[caseId]/planned-items`

**Zod Schemas:**
- `PlannedItemsRequestSchema` (exists in `lib/parsers/inventoryBillingParsers.ts`)
- `InventoryItemResponseSchema` (NEW)

**Changes:**
- Extract inventory planning logic to dedicated tab
- Create hook for loading/saving planned items
- Create parsers for request/response validation
- Merge ClinicalPlanTab inventory section + PlannedItemsTab into one cohesive tab
- Update tab registry to use new component

**Tests:**
- Parser unit tests
- Hook unit tests (mock API calls)
- Integration tests for planned-items endpoints

**Risk:** High (most complex, most business logic)  
**Impact:** High (core inventory integration)

**Dependencies:** Phase 1 complete

---

### Commit 2.2: Procedure Tab
**Files:**
- `features/surgical-plan/tabs/procedure/ProcedureTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/procedure/ProcedureTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/procedure/procedureParsers.ts` (NEW)
- `features/surgical-plan/tabs/procedure/useProcedureTab.ts` (NEW)
- `features/surgical-plan/tabs/procedure/__tests__/` (NEW)

**Extract from:**
- `ClinicalPlanTab.tsx` lines 159-161, 230-255 (procedureName, procedurePlan state)
- `ClinicalPlanTab.tsx` lines 257-265 (auto-populate logic)
- `ClinicalPlanTab.tsx` lines 483-502 (Procedure Plan accordion section)
- `ClinicalPlanTab.tsx` lines 418-436, 464-474 (procedure selectors)

**API Endpoints:**
- `PATCH /api/doctor/surgical-cases/[caseId]/plan` (procedurePlan, procedureName)

**Zod Schemas:**
- `ProcedurePlanUpdateSchema` (NEW)

**Changes:**
- Extract procedure planning to dedicated tab
- Create hook for loading/saving procedure plan
- Create parser for procedure plan updates
- Update tab registry

**Tests:**
- Parser unit tests
- Hook unit tests
- Integration tests for plan update endpoint

**Risk:** Medium  
**Impact:** High (core clinical data)

**Dependencies:** Phase 1 complete

---

### Commit 2.3: Risk Factors Tab
**Files:**
- `features/surgical-plan/tabs/risk-factors/RiskFactorsTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/risk-factors/RiskFactorsTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/risk-factors/riskFactorsParsers.ts` (NEW)
- `features/surgical-plan/tabs/risk-factors/useRiskFactorsTab.ts` (NEW)
- `features/surgical-plan/tabs/risk-factors/__tests__/` (NEW)

**Extract from:**
- `ClinicalPlanTab.tsx` lines 162-163 (riskFactors, preOpNotes state)
- `ClinicalPlanTab.tsx` lines 350-367 (insertPreOpTemplate logic)
- `ClinicalPlanTab.tsx` lines 504-543 (Risk & Pre-op Assessment section)

**API Endpoints:**
- `PATCH /api/doctor/surgical-cases/[caseId]/plan` (riskFactors, preOpNotes)

**Zod Schemas:**
- `RiskFactorsUpdateSchema` (NEW)

**Changes:**
- Extract risk factors to dedicated tab
- Create hook for loading/saving
- Create parser
- Move template insertion logic to hook or utility

**Tests:**
- Parser unit tests
- Hook unit tests
- Integration tests

**Risk:** Medium  
**Impact:** High (core clinical data)

**Dependencies:** Phase 1 complete

---

### Commit 2.4: Anesthesia Tab
**Files:**
- `features/surgical-plan/tabs/anesthesia/AnesthesiaTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/anesthesia/AnesthesiaTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/anesthesia/anesthesiaParsers.ts` (NEW)
- `features/surgical-plan/tabs/anesthesia/useAnesthesiaTab.ts` (NEW)
- `features/surgical-plan/tabs/anesthesia/__tests__/` (NEW)

**Extract from:**
- `ClinicalPlanTab.tsx` lines 165-168 (anesthesiaPlan, specialInstructions, estimatedDurationMinutes, readinessStatus state)
- `ClinicalPlanTab.tsx` lines 545-602 (Anesthesia & OR Prep section)
- `ClinicalPlanTab.tsx` lines 438-463 (Planning Status selector)

**API Endpoints:**
- `PATCH /api/doctor/surgical-cases/[caseId]/plan` (anesthesiaPlan, specialInstructions, estimatedDurationMinutes, readinessStatus)

**Zod Schemas:**
- `AnesthesiaPlanUpdateSchema` (NEW)

**Changes:**
- Extract anesthesia planning to dedicated tab
- Create hook for loading/saving
- Create parser
- Handle duration string → number conversion in parser

**Tests:**
- Parser unit tests
- Hook unit tests
- Integration tests

**Risk:** Medium  
**Impact:** High (core clinical data)

**Dependencies:** Phase 1 complete

---

## PHASE 3: SUPPORTING TABS (Read-Only & Simpler)

### Commit 3.1: Used Items Tab
**Files:**
- `features/surgical-plan/tabs/used-items/UsedItemsTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/used-items/UsedItemsTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/used-items/useUsedItemsTab.ts` (NEW)
- `features/surgical-plan/tabs/used-items/__tests__/` (NEW)

**Extract from:**
- `InventoryTabs.tsx` UsedItemsTab

**API Endpoints:**
- `GET /api/nurse/surgical-cases/[caseId]/billing-summary`

**Changes:**
- Extract to dedicated module
- Create typed API client wrapper
- Create hook
- Remove `any` types

**Tests:**
- Hook unit tests
- Integration tests

**Risk:** Low (read-only)  
**Impact:** Medium

---

### Commit 3.2: Billing Summary Tab
**Files:**
- `features/surgical-plan/tabs/billing-summary/BillingSummaryTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/billing-summary/BillingSummaryTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/billing-summary/useBillingSummaryTab.ts` (NEW)
- `features/surgical-plan/tabs/billing-summary/__tests__/` (NEW)

**Extract from:**
- `InventoryTabs.tsx` BillingSummaryTab

**API Endpoints:**
- `GET /api/nurse/surgical-cases/[caseId]/billing-summary`

**Changes:**
- Extract to dedicated module
- Create typed API client wrapper
- Create hook
- Remove `any` types

**Tests:**
- Hook unit tests
- Integration tests

**Risk:** Low (read-only)  
**Impact:** Medium

---

### Commit 3.3: Variance Tab
**Files:**
- `features/surgical-plan/tabs/variance/VarianceTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/variance/VarianceTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/variance/useVarianceTab.ts` (NEW)
- `features/surgical-plan/tabs/variance/__tests__/` (NEW)

**Extract from:**
- `InventoryTabs.tsx` UsageVarianceTab

**API Endpoints:**
- `GET /api/surgical-cases/[caseId]/usage-variance`

**Changes:**
- Extract to dedicated module
- Create typed API client wrapper
- Create hook
- Remove `any` types

**Tests:**
- Hook unit tests
- Integration tests

**Risk:** Low (read-only)  
**Impact:** Medium

---

### Commit 3.4: Consents Tab (Refactor)
**Files:**
- `features/surgical-plan/tabs/consents/ConsentsTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/consents/ConsentsTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/consents/consentsParsers.ts` (NEW)
- `features/surgical-plan/tabs/consents/useConsentsTab.ts` (REFACTOR)

**Extract from:**
- `ConsentsTab.tsx` (already exists, refactor to container/view pattern)

**Changes:**
- Split into container/view
- Extract parsers
- Refactor hook (already exists, improve typing)

**Tests:**
- Parser unit tests
- Hook unit tests
- Integration tests

**Risk:** Low (already uses hooks)  
**Impact:** Medium

---

### Commit 3.5: Photos Tab (Refactor)
**Files:**
- `features/surgical-plan/tabs/photos/PhotosTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/photos/PhotosTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/photos/photosParsers.ts` (NEW)
- `features/surgical-plan/tabs/photos/usePhotosTab.ts` (REFACTOR)

**Extract from:**
- `PhotosTab.tsx` (already exists, refactor to container/view pattern)

**Changes:**
- Split into container/view
- Extract parsers
- Refactor hook (already exists, improve typing)

**Tests:**
- Parser unit tests
- Hook unit tests
- Integration tests

**Risk:** Low (already uses hooks)  
**Impact:** Medium

---

### Commit 3.6: Team Tab (Refactor)
**Files:**
- `features/surgical-plan/tabs/team/TeamTab.container.tsx` (NEW)
- `features/surgical-plan/tabs/team/TeamTab.view.tsx` (NEW)
- `features/surgical-plan/tabs/team/teamParsers.ts` (NEW)
- `features/surgical-plan/tabs/team/useTeamTab.ts` (REFACTOR)

**Extract from:**
- `TeamTab.tsx` (already exists, refactor to container/view pattern)

**Changes:**
- Split into container/view
- Extract parsers
- Refactor hook (already exists, improve typing)

**Tests:**
- Parser unit tests
- Hook unit tests
- Integration tests

**Risk:** Low (already uses hooks)  
**Impact:** Medium

---

## PHASE 4: PAGE REFACTORING

### Commit 4.1: Patient Context Bar Extraction
**Files:**
- `features/surgical-plan/shared/components/PatientContextBar.tsx` (NEW)

**Extract from:**
- `page.tsx` lines 323-500 (patient context bar)

**Changes:**
- Extract patient context bar to shared component
- Extract edit details modal to separate component
- Update page.tsx to use extracted components

**Tests:**
- Component tests

**Risk:** Medium (touches page layout)  
**Impact:** High (reduces page.tsx size)

---

### Commit 4.2: Page Component Simplification
**Files:**
- `app/doctor/surgical-cases/[caseId]/plan/page.tsx` (REFACTOR)

**Changes:**
- Remove `adaptForLegacyTabs()` (no longer needed)
- Remove `handleSaveClinical()` (tabs handle their own saves)
- Simplify to: load caseId → render `SurgicalPlanShell`
- Remove unused state/handlers

**Tests:**
- Page integration tests

**Risk:** Medium  
**Impact:** High (reduces page.tsx from 903 → ~100 lines)

---

## PHASE 5: CLEANUP

### Commit 5.1: Remove ClinicalPlanTab.tsx
**Files:**
- `components/doctor/case-plan/ClinicalPlanTab.tsx` (DELETE)

**Changes:**
- Delete file (all functionality extracted to feature modules)
- Update any remaining imports

**Tests:**
- Verify no broken imports

**Risk:** Low (all tabs migrated)  
**Impact:** High (removes 776-line monolith)

---

### Commit 5.2: Remove InventoryTabs.tsx
**Files:**
- `components/doctor/case-plan/InventoryTabs.tsx` (DELETE)

**Changes:**
- Delete file (all tabs extracted to feature modules)
- Update any remaining imports

**Tests:**
- Verify no broken imports

**Risk:** Low  
**Impact:** High (removes 623-line file)

---

### Commit 5.3: Final TypeScript Cleanup
**Files:**
- All feature modules

**Changes:**
- Remove all `as any` casts
- Fix any remaining type errors
- Ensure `pnpm tsc --noEmit` passes with 0 errors

**Tests:**
- Type checking

**Risk:** Low  
**Impact:** High (achieves strict TypeScript goal)

---

## COMMIT SUMMARY

**Total Commits:** ~20 commits across 5 phases

**Phase 1 (Foundation):** 4 commits  
**Phase 2 (High-Risk Tabs):** 4 commits  
**Phase 3 (Supporting Tabs):** 6 commits  
**Phase 4 (Page Refactoring):** 2 commits  
**Phase 5 (Cleanup):** 3 commits

**Estimated Timeline:**
- Phase 1: 1 week
- Phase 2: 2 weeks
- Phase 3: 1.5 weeks
- Phase 4: 0.5 weeks
- Phase 5: 0.5 weeks
- **Total: ~5-6 weeks**

---

## ROLLBACK STRATEGY

Each commit should be:
1. **Backward compatible** (old code remains until Phase 5)
2. **Feature-flagged** if needed (use tab registry to switch between old/new)
3. **Reversible** (can revert individual commits without breaking others)

---

## TESTING STRATEGY

### Per Commit
1. Run `pnpm tsc --noEmit` — must pass
2. Run `pnpm test` — must pass (new + existing)
3. Manual E2E test — verify tab still works
4. Visual regression — verify UI unchanged

### Per Phase
1. Full test suite
2. E2E test all tabs
3. Performance check (bundle size, render time)

---

**End of Commit Plan**
