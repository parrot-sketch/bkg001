# Surgical Plan Page — Redesign Audit Report

**Date:** 2025-02-24  
**Scope:** `/doctor/surgical-cases/[caseId]/plan` page and supporting components  
**Goal:** Identify all responsibilities, dependencies, and architectural issues to guide modular refactoring

---

## 1. CURRENT STATE ANALYSIS

### 1.1 File Structure

**Monolithic Components:**
- `components/doctor/case-plan/ClinicalPlanTab.tsx` — **776 lines** (exceeds 250 LOC target by 3x)
- `app/doctor/surgical-cases/[caseId]/plan/page.tsx` — **903 lines** (exceeds 250 LOC target by 3.6x)

**Tab Components:**
- `components/doctor/case-plan/ConsentsTab.tsx` — ~285 lines
- `components/doctor/case-plan/PhotosTab.tsx` — ~270 lines
- `components/doctor/case-plan/TeamTab.tsx` — ~298 lines
- `components/doctor/case-plan/InventoryTabs.tsx` — ~623 lines (contains 4 tabs: PlannedItemsTab, UsedItemsTab, BillingSummaryTab, UsageVarianceTab)

**Supporting:**
- `components/doctor/case-plan/StaffSelector.tsx`
- `hooks/doctor/useCasePlan.ts` — 278 lines
- `hooks/doctor/useSurgicalCases.ts` — 103 lines

---

## 2. RESPONSIBILITIES IN ClinicalPlanTab.tsx (776 lines)

### 2.1 Data Fetching (Lines 177-228)
- **Inventory items loading** (IMPLANT, INSTRUMENT categories)
  - Direct `apiClient.get()` calls
  - No Zod validation
  - Manual error handling with try/catch
  - State: `inventoryItems`, `loadingInventory`

- **Planned items loading**
  - Direct `apiClient.get()` call
  - Manual mapping from API response to component state
  - State: `selectedInventoryItems`

- **Case plan data loading**
  - Receives `casePlan` prop from parent
  - Manual synchronization via `useEffect`
  - Type assertions for missing properties (`estimatedDurationMinutes`, `procedureName`)

### 2.2 Form State Management (Lines 159-174)
**10+ useState declarations:**
- `procedureName`, `procedurePlan`, `selectedServiceId`
- `riskFactors`, `preOpNotes`
- `implantData` (ImplantData type with items array)
- `anesthesiaPlan`, `specialInstructions`
- `estimatedDurationMinutes` (string, converted to number on save)
- `readinessStatus` (CaseReadinessStatus enum)
- `inventoryItems`, `loadingInventory`, `inventorySearch`
- `selectedInventoryItems`

**Issues:**
- Mixed concerns: clinical plan fields + inventory planning
- No form validation before save
- String/number conversions scattered
- No dirty state tracking

### 2.3 Business Logic (Lines 267-348)
- **Save orchestration** (`handleSave`):
  - Combines clinical plan save + planned items save
  - Two separate API calls (not transactional)
  - Manual data transformation (string → number, object → JSON)
  - No rollback on partial failure

- **Inventory item management**:
  - `handleAddInventoryItem` — duplicate check logic
  - `handleRemoveInventoryItem` — array filtering
  - `handleUpdatePlannedQuantity` — quantity validation (Math.max)
  - `handleUpdatePlannedNotes` — direct state mutation

- **Template insertion** (`insertPreOpTemplate`):
  - HTML string manipulation
  - Browser `confirm()` dialog (not using shadcn Dialog)
  - String concatenation logic

- **Content validation helpers**:
  - `hasContent()` — checks for empty strings/HTML
  - `hasImplants()` — checks multiple data sources
  - `filteredInventoryItems` — client-side search filtering

### 2.4 UI Layout & Rendering (Lines 414-773)
**Accordion-based sections:**
1. **Procedure Plan** (Lines 484-502)
   - RichTextEditor component
   - Section status indicator

2. **Risk & Pre-op Assessment** (Lines 505-543)
   - Two RichTextEditor fields
   - Template insertion button
   - Section status indicator

3. **Anesthesia & OR Prep** (Lines 546-602)
   - Anesthesia type select (enum dropdown)
   - Duration input (number, 15-600 min)
   - Special instructions RichTextEditor

4. **Implants/Devices** (Lines 605-759)
   - Inventory item selector (search + dropdown)
   - Selected items list with quantity/notes editing
   - Stock availability display
   - Low stock warnings
   - Legacy free-text notes display

**Quick selectors** (Lines 418-475):
- Primary procedure dropdown (services)
- Planning status dropdown (readiness enum)
- Procedure name input

**Save button** (Lines 763-772):
- Single save action for all sections
- Loading state from parent prop

### 2.5 Cross-Cutting Concerns
- **Type definitions** (Lines 54-131): 4 interfaces defined inline
- **Constants** (Lines 45-52): ANESTHESIA_TYPES array
- **Helper components** (Lines 140-151): SectionStatus presentational

---

## 3. PAGE COMPONENT RESPONSIBILITIES (page.tsx — 903 lines)

### 3.1 Data Loading (Lines 184-186)
- `useCasePlanDetail(caseId)` — React Query hook
- `useUpdateCasePlan(caseId)` — React Query mutation
- `useMarkCaseReady()` — React Query mutation

### 3.2 State Management (Lines 188-228)
- `activeTab` — tab navigation state
- `showMissingModal`, `missingItems` — readiness validation modal
- `showEditDetails`, `editDetailsForm` — case details edit modal

### 3.3 Business Logic
- **Mark Ready handler** (Lines 193-210):
  - Calls `markReady.mutate()`
  - Handles `MarkReadyError` with structured missing items
  - Shows modal on failure

- **Edit Details handler** (Lines 241-251):
  - Calls `updatePlan.mutateAsync()`
  - Uses `as any` type assertion
  - Manual refetch after save

- **Save Clinical handler** (Lines 254-269):
  - Wrapper around `updatePlan.mutateAsync()`
  - Uses `as any` type assertion
  - Maps `ClinicalPlanSaveData` to API shape

- **Legacy adapter** (Lines 132-173):
  - `adaptForLegacyTabs()` function
  - Transforms `CasePlanDetailDto` → `CasePlanResponseDto`
  - Manual field mapping
  - Type assertions for missing properties

### 3.4 UI Layout
- **Patient context bar** (Lines 323-500):
  - Patient identity display
  - Readiness badges
  - Status badges
  - Action buttons (Edit Details, Print, Mark Ready)
  - Allergy alert
  - Safety progress strip (readiness checklist)
  - Theater booking info

- **Alerts panel** (Lines 503-539):
  - Missing items awareness
  - Tab navigation from checklist items

- **Operative timeline** (Lines 542-544, 753-864):
  - ReadOnlyTimelineSummary component
  - Direct `fetch()` call (not using apiClient)
  - Manual token retrieval (`getToken()`)
  - No error boundary

- **Tabbed workspace** (Lines 547-596):
  - 8 tabs rendered
  - Each tab wrapped in TabsContent
  - Legacy plan data passed to some tabs

- **Modals** (Lines 599-717):
  - Missing items modal
  - Edit details modal

### 3.5 Helper Functions
- `calculateAge()` — date calculation utility
- `getToken()` — localStorage access
- `adaptForLegacyTabs()` — DTO transformation
- `NavTab` — tab trigger component
- `ReadOnlyTimelineSummary` — timeline display component
- `PlanPageSkeleton` — loading skeleton

---

## 4. TAB BREAKDOWN & DATA DEPENDENCIES

### Tab 1: Clinical Plan (`clinical`)
**Component:** `ClinicalPlanTab.tsx`  
**Data Sources:**
- `CasePlanDetailDto.casePlan` (via `useCasePlanDetail`)
  - `procedurePlan`, `riskFactors`, `preOpNotes`
  - `implantDetails` (JSON string, legacy)
  - `anesthesiaPlan`, `specialInstructions`
  - `estimatedDurationMinutes`, `readinessStatus`
- `CasePlanDetailDto.procedureName`, `CasePlanDetailDto.side` (from surgical case)
- Services list (via `useServices()` hook)
- Inventory items (IMPLANT, INSTRUMENT) — direct API call
- Planned items — direct API call

**Mutations:**
- `PATCH /api/doctor/surgical-cases/[caseId]/plan` — updates clinical plan fields
- `POST /api/doctor/surgical-cases/[caseId]/planned-items` — replaces planned items

**Issues:**
- Two separate save operations (not atomic)
- No validation before save
- Direct API calls in component
- Mixed concerns (clinical plan + inventory planning)

### Tab 2: Consents (`consents`)
**Component:** `ConsentsTab.tsx`  
**Data Sources:**
- `CasePlanDetailDto.casePlan.consents[]`

**Mutations:**
- `POST /api/doctor/surgical-cases/[caseId]/consents` — create consent
- `PATCH /api/doctor/consents/[consentId]` — sign consent

**Issues:**
- Uses hooks (`useCreateConsent`, `useSignConsent`) — good pattern
- No Zod validation visible
- Form state managed locally

### Tab 3: Photos (`photos`)
**Component:** `PhotosTab.tsx`  
**Data Sources:**
- `CasePlanDetailDto.casePlan.images[]`

**Mutations:**
- `POST /api/doctor/surgical-cases/[caseId]/photos` — add photo

**Issues:**
- Uses hook (`useAddPhoto`) — good pattern
- Form state managed locally
- No validation visible

### Tab 4: Team (`team`)
**Component:** `TeamTab.tsx`  
**Data Sources:**
- `CasePlanDetailDto.casePlan.procedureRecord.staff[]`
- `CasePlanDetailDto.staffInvites[]`

**Mutations:**
- `POST /api/doctor/surgical-cases/[caseId]/team` — init/assign/remove
- `POST /api/doctor/surgical-cases/[caseId]/team/invite` — invite staff
- `DELETE /api/doctor/surgical-cases/[caseId]/team/invite/[inviteId]` — cancel invite

**Issues:**
- Uses hooks — good pattern
- Complex state (staff + invites)
- No validation visible

### Tab 5: Planned Items (`planned-items`)
**Component:** `PlannedItemsTab` (from `InventoryTabs.tsx`)  
**Data Sources:**
- `GET /api/doctor/surgical-cases/[caseId]/planned-items`
- `GET /api/surgical-cases/[caseId]/usage-variance` (for consumption status)

**Mutations:**
- `POST /api/doctor/surgical-cases/[caseId]/planned-items` — replace planned items
- `POST /api/nurse/surgical-cases/[caseId]/usage` — consume from plan

**Issues:**
- Direct `apiClient.request()` calls (not using typed methods)
- Uses `any` types throughout
- Manual externalRef generation (SHA-256 hashing in component)
- No Zod validation
- Business logic (consumption status calculation) in component

### Tab 6: Used Items (`used-items`)
**Component:** `UsedItemsTab` (from `InventoryTabs.tsx`)  
**Data Sources:**
- `GET /api/nurse/surgical-cases/[caseId]/billing-summary` (derived from usage)

**Issues:**
- Direct API calls
- Uses `any` types

### Tab 7: Billing Summary (`billing`)
**Component:** `BillingSummaryTab` (from `InventoryTabs.tsx`)  
**Data Sources:**
- `GET /api/nurse/surgical-cases/[caseId]/billing-summary`

**Issues:**
- Direct API calls
- Uses `any` types

### Tab 8: Usage Variance (`variance`)
**Component:** `UsageVarianceTab` (from `InventoryTabs.tsx`)  
**Data Sources:**
- `GET /api/surgical-cases/[caseId]/usage-variance`

**Issues:**
- Direct API calls
- Uses `any` types

---

## 5. API ENDPOINTS USED

### Case Plan Operations
- `GET /api/doctor/surgical-cases/[caseId]/plan` — get full case + plan detail
- `PATCH /api/doctor/surgical-cases/[caseId]/plan` — partial update plan fields
- `POST /api/doctor/surgical-cases/[caseId]/mark-ready` — transition to READY_FOR_SCHEDULING

### Planned Items
- `GET /api/doctor/surgical-cases/[caseId]/planned-items` — get planned items
- `POST /api/doctor/surgical-cases/[caseId]/planned-items` — replace planned items

### Inventory
- `GET /api/inventory/items?category=IMPLANT&pageSize=100` — get implants
- `GET /api/inventory/items?category=INSTRUMENT&pageSize=100` — get instruments

### Usage & Billing
- `GET /api/nurse/surgical-cases/[caseId]/billing-summary` — get billing summary
- `GET /api/surgical-cases/[caseId]/usage-variance` — get usage variance
- `POST /api/nurse/surgical-cases/[caseId]/usage` — record usage

### Consents
- `POST /api/doctor/surgical-cases/[caseId]/consents` — create consent
- `PATCH /api/doctor/consents/[consentId]` — sign consent

### Photos
- `POST /api/doctor/surgical-cases/[caseId]/photos` — add photo

### Team
- `POST /api/doctor/surgical-cases/[caseId]/team` — init/assign/remove staff
- `POST /api/doctor/surgical-cases/[caseId]/team/invite` — invite staff
- `DELETE /api/doctor/surgical-cases/[caseId]/team/invite/[inviteId]` — cancel invite

### Other
- `GET /api/theater-tech/surgical-cases/[caseId]/timeline` — get operative timeline (direct fetch, not apiClient)

---

## 6. DUPLICATED LOGIC

### 6.1 Data Transformation
- **DTO mapping** appears in:
  - `adaptForLegacyTabs()` in page.tsx
  - Manual field mapping in `ClinicalPlanTab` useEffect
  - Manual mapping in `PlannedItemsTab` loadPlannedItems

### 6.2 Error Handling
- **Toast error patterns** repeated across:
  - ClinicalPlanTab (inventory loading, planned items loading)
  - InventoryTabs (all 4 tabs)
  - Page component (mark ready, edit details)

### 6.3 Loading States
- **Skeleton patterns** duplicated:
  - PlanPageSkeleton in page.tsx
  - Individual skeletons in InventoryTabs
  - No shared skeleton component

### 6.4 Type Assertions
- **`as any` casts** found in:
  - `page.tsx` line 247: `updatePlan.mutateAsync({ ... } as any)`
  - `page.tsx` line 266: `updatePlan.mutateAsync({ ... } as any)`
  - `useSurgicalCases.ts` line 85: `response as any`

### 6.5 API Response Handling
- **Manual response unwrapping** repeated:
  - `response.success && response.data?.data?.data` pattern
  - `response.success && response.data` pattern
  - No shared helper for unwrapping

---

## 7. UNUSED / DEAD CODE

### 7.1 Legacy Implant Data
- `ImplantDevice`, `ImplantData` types (from `implantTypes.ts`)
- `parseImplantData()`, `serializeImplantData()` functions
- `implantData` state in ClinicalPlanTab
- `addImplant()`, `updateImplant()`, `removeImplant()` functions
- Legacy free-text notes display (Lines 752-757)

**Status:** Still used for backward compatibility, but should be deprecated after inventory integration is complete.

### 7.2 Unused Imports
- Need to verify all imports are used (not audited in detail)

### 7.3 Obsolete Patterns
- `adaptForLegacyTabs()` — should be removed once all tabs use `CasePlanDetailDto` directly

---

## 8. INCORRECT BOUNDARIES

### 8.1 Domain Logic in UI
- **Stock availability calculation** in `ClinicalPlanTab` (Lines 668, 724-726)
- **Consumption status calculation** in `PlannedItemsTab` (Lines 79-87)
- **ExternalRef generation** (SHA-256 hashing) in `PlannedItemsTab` (Lines 97-109)
- **Content validation** (`hasContent()`, `hasImplants()`) in component

**Should be:** Domain services or utility functions

### 8.2 Parsing in UI
- **JSON parsing** (`parseImplantData()`) in component
- **String → number conversion** in `handleSave`
- **Data transformation** (`adaptForLegacyTabs()`) in page component

**Should be:** Zod parsers or mapper functions

### 8.3 API Calls in Components
- **Direct `apiClient.get()`** calls in `ClinicalPlanTab` (Lines 183-184, 206)
- **Direct `apiClient.post()`** calls in `ClinicalPlanTab` (Line 289)
- **Direct `fetch()`** in `ReadOnlyTimelineSummary` (Line 760)
- **Direct `apiClient.request()`** in `InventoryTabs` (Lines 50, 64, 120)

**Should be:** Hooks or service functions

### 8.4 Type Definitions in Components
- **4 interfaces** defined in `ClinicalPlanTab.tsx` (Lines 54-131)
  - `InventoryItemResponse`
  - `PlannedItemResponse`
  - `PlannedItemsResponse`
  - `ClinicalPlanSaveData`
  - `SelectedInventoryItem`

**Should be:** In shared types file or DTO files

### 8.5 Constants in Components
- **ANESTHESIA_TYPES** array in `ClinicalPlanTab.tsx` (Lines 45-52)

**Should be:** In constants file or domain enums

---

## 9. MISSING VALIDATION

### 9.1 No Zod Schemas
- Clinical plan save data — no validation
- Planned items request — no validation (though parser exists: `parsePlannedItemsRequest`)
- Inventory item selection — no validation
- Edit details form — no validation

### 9.2 No Form Validation
- No client-side validation before API calls
- No validation feedback in UI
- No required field indicators (except visual asterisks)

---

## 10. TEST COVERAGE GAPS

### 10.1 No Unit Tests
- ClinicalPlanTab — no tests
- InventoryTabs — no tests
- Page component — no tests
- Parsers — `parsePlannedItemsRequest` exists but no tests found
- Mappers — no mapper tests

### 10.2 No Integration Tests
- Plan save endpoint — no contract tests
- Planned items endpoints — no contract tests
- Mark ready endpoint — no contract tests

---

## 11. PROPOSED TARGET ARCHITECTURE

### 11.1 Feature Module Structure

```
features/surgical-plan/
├── core/
│   ├── types.ts                    # Shared types (InventoryItemResponse, etc.)
│   ├── tabRegistry.ts             # Tab registration & metadata
│   ├── permissions.ts             # Role-based tab visibility
│   └── constants.ts               # ANESTHESIA_TYPES, etc.
├── shared/
│   ├── components/
│   │   ├── ErrorState.tsx         # Standardized error display
│   │   ├── EmptyState.tsx         # Standardized empty state
│   │   ├── SaveBar.tsx            # Reusable save button bar
│   │   └── SectionStatus.tsx      # Status indicator (extracted)
│   ├── hooks/
│   │   ├── useSurgicalCase.ts     # Case data loading
│   │   └── useCasePlan.ts         # Plan data loading (refactored)
│   ├── mappers/
│   │   └── dtoMappers.ts          # DTO → ViewModel transformations
│   └── parsers/
│       └── surgicalPlanParsers.ts # Zod schemas + parse helpers
└── tabs/
    ├── overview/                  # NEW: Case overview tab
    │   ├── OverviewTab.container.tsx
    │   ├── OverviewTab.view.tsx
    │   ├── overviewParsers.ts
    │   ├── useOverviewTab.ts
    │   └── __tests__/
    ├── procedure/                 # Extracted from ClinicalPlanTab
    │   ├── ProcedureTab.container.tsx
    │   ├── ProcedureTab.view.tsx
    │   ├── procedureParsers.ts
    │   ├── useProcedureTab.ts
    │   └── __tests__/
    ├── risk-factors/              # Extracted from ClinicalPlanTab
    │   ├── RiskFactorsTab.container.tsx
    │   ├── RiskFactorsTab.view.tsx
    │   ├── riskFactorsParsers.ts
    │   ├── useRiskFactorsTab.ts
    │   └── __tests__/
    ├── anesthesia/                # Extracted from ClinicalPlanTab
    │   ├── AnesthesiaTab.container.tsx
    │   ├── AnesthesiaTab.view.tsx
    │   ├── anesthesiaParsers.ts
    │   ├── useAnesthesiaTab.ts
    │   └── __tests__/
    ├── inventory-planning/        # Extracted from ClinicalPlanTab + PlannedItemsTab
    │   ├── InventoryPlanningTab.container.tsx
    │   ├── InventoryPlanningTab.view.tsx
    │   ├── inventoryPlanningParsers.ts
    │   ├── useInventoryPlanningTab.ts
    │   └── __tests__/
    ├── used-items/                # Extracted from InventoryTabs
    │   ├── UsedItemsTab.container.tsx
    │   ├── UsedItemsTab.view.tsx
    │   ├── useUsedItemsTab.ts
    │   └── __tests__/
    ├── billing-summary/           # Extracted from InventoryTabs
    │   ├── BillingSummaryTab.container.tsx
    │   ├── BillingSummaryTab.view.tsx
    │   ├── useBillingSummaryTab.ts
    │   └── __tests__/
    ├── variance/                  # Extracted from InventoryTabs
    │   ├── VarianceTab.container.tsx
    │   ├── VarianceTab.view.tsx
    │   ├── useVarianceTab.ts
    │   └── __tests__/
    ├── consents/                  # Refactored ConsentsTab
    │   ├── ConsentsTab.container.tsx
    │   ├── ConsentsTab.view.tsx
    │   ├── consentsParsers.ts
    │   ├── useConsentsTab.ts
    │   └── __tests__/
    ├── photos/                    # Refactored PhotosTab
    │   ├── PhotosTab.container.tsx
    │   ├── PhotosTab.view.tsx
    │   ├── photosParsers.ts
    │   ├── usePhotosTab.ts
    │   └── __tests__/
    └── team/                      # Refactored TeamTab
        ├── TeamTab.container.tsx
        ├── TeamTab.view.tsx
        ├── teamParsers.ts
        ├── useTeamTab.ts
        └── __tests__/
```

### 11.2 Page Component Structure

```typescript
// app/doctor/surgical-cases/[caseId]/plan/page.tsx
export default function CasePlanPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  
  return (
    <SurgicalPlanShell caseId={caseId} />
  );
}
```

### 11.3 Shell Component

```typescript
// features/surgical-plan/SurgicalPlanShell.tsx
export function SurgicalPlanShell({ caseId }: { caseId: string }) {
  const { data, isLoading, error } = useSurgicalCase(caseId);
  const tabs = useTabRegistry(caseId);
  
  if (isLoading) return <SurgicalPlanSkeleton />;
  if (error) return <ErrorState error={error} />;
  
  return (
    <div>
      <PatientContextBar case={data} />
      <TabbedWorkspace tabs={tabs} defaultTab="overview" />
    </div>
  );
}
```

### 11.4 Tab Registry Pattern

```typescript
// features/surgical-plan/core/tabRegistry.ts
export interface TabDefinition {
  key: string;
  label: string;
  icon: React.ComponentType;
  component: React.ComponentType<{ caseId: string }>;
  permissionCheck?: (role: Role) => boolean;
  badgeCount?: (data: CasePlanDetailDto) => number;
}

export const TAB_REGISTRY: TabDefinition[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: FileText,
    component: OverviewTabContainer,
  },
  {
    key: 'procedure',
    label: 'Procedure',
    icon: Stethoscope,
    component: ProcedureTabContainer,
    permissionCheck: (role) => role === Role.DOCTOR || role === Role.ADMIN,
  },
  // ... etc
];
```

---

## 12. MIGRATION PRIORITY

### High Priority (Core Functionality)
1. **Inventory Planning Tab** — Most complex, most business logic
2. **Procedure Tab** — Core clinical data
3. **Risk Factors Tab** — Core clinical data
4. **Anesthesia Tab** — Core clinical data

### Medium Priority (Supporting Features)
5. **Used Items Tab** — Read-only, simpler
6. **Billing Summary Tab** — Read-only, simpler
7. **Variance Tab** — Read-only, simpler
8. **Consents Tab** — Already uses hooks, needs parser extraction
9. **Photos Tab** — Already uses hooks, needs parser extraction
10. **Team Tab** — Already uses hooks, needs parser extraction

### Low Priority (Enhancement)
11. **Overview Tab** — NEW: Summary view combining key info from all tabs

---

## 13. ESTIMATED EFFORT

### Per Tab Module
- **Parser creation:** 2-4 hours
- **Hook creation:** 2-4 hours
- **Container + View:** 4-6 hours
- **Unit tests:** 2-3 hours
- **Integration tests:** 2-3 hours
- **Total per tab:** 12-20 hours

### Shared Infrastructure
- **Core types/constants:** 2-3 hours
- **Tab registry:** 2-3 hours
- **Shared components:** 4-6 hours
- **Shared hooks:** 4-6 hours
- **Mappers:** 3-4 hours
- **Total shared:** 15-22 hours

### Page Refactoring
- **Shell component:** 4-6 hours
- **Patient context bar extraction:** 3-4 hours
- **Cleanup:** 2-3 hours
- **Total page:** 9-13 hours

### Grand Total
- **10 tabs × 16 hours (avg):** 160 hours
- **Shared infrastructure:** 18 hours (avg)
- **Page refactoring:** 11 hours (avg)
- **Total:** ~189 hours (~5 weeks for 1 developer)

---

## 14. RISKS & MITIGATION

### Risk 1: Breaking Existing Functionality
**Mitigation:** Extract one tab at a time, maintain backward compatibility during transition

### Risk 2: Type Safety Regression
**Mitigation:** Strict TypeScript, no `any`, comprehensive type definitions

### Risk 3: Test Coverage Gaps
**Mitigation:** Write tests alongside refactoring, not after

### Risk 4: Performance Regression
**Mitigation:** Measure bundle size, lazy load tab components, optimize re-renders

---

## 15. SUCCESS METRICS

### Code Quality
- ✅ No file exceeds 250 LOC
- ✅ No `any` types in production code
- ✅ 100% Zod validation coverage
- ✅ All API calls go through typed client wrappers

### Test Coverage
- ✅ Unit tests for all parsers
- ✅ Unit tests for all mappers
- ✅ Integration tests for all route handlers
- ✅ Minimum 80% code coverage

### Architecture
- ✅ No business logic in React components
- ✅ No API calls in components
- ✅ No parsing in components
- ✅ Clear separation: View → Container → Hook → API

---

## 16. NEXT STEPS

1. **Review this audit** with team
2. **Approve target architecture**
3. **Create feature branch:** `refactor/surgical-plan-modular`
4. **Start with shared infrastructure:**
   - Create `features/surgical-plan/core/` structure
   - Extract shared types
   - Create tab registry
5. **Extract first tab** (Inventory Planning — highest complexity)
6. **Iterate tab-by-tab** following the pattern
7. **Final cleanup** — remove ClinicalPlanTab.tsx, adaptForLegacyTabs, etc.

---

**End of Audit Report**
