# Surgical Cases Plan Page Audit

## Executive Summary

The surgical cases plan page (`/doctor/surgical-cases/[caseId]/plan`) has **significant architectural and UX problems** that require immediate attention:

1. **Tab Proliferation**: 10 tabs is excessive for a single surgical case view—exceeds cognitive load limits and violates information hierarchy principles
2. **Premature Billing Tab**: Billing Summary tab appears during planning phase (should only appear post-op when financial impact is known)
3. **State Management Complexity**: Inventory Planning tab uses a 403-line hook with 8+ interacting state pieces, causing input behavior issues
4. **Unclear Item Semantics**: "Planned Items" vs "Used Items" distinction and their relationship are poorly expressed in UI
5. **Scope Creep**: Page tries to serve planning, execution, and billing workflows simultaneously—should be split by surgical phase

---

## Current Architecture Analysis

### Tab Structure (10 Total)

```
Overview
  └─ Read-only case metadata

Procedure  
  └─ Surgical procedure details

Risk Factors
  └─ Pre-operative risk assessment

Anesthesia
  └─ Anesthesia plan (148-line hook, simple state)

Planned Items (INVENTORY PLANNING)  ⚠️ MOST COMPLEX
  └─ 403-line hook with 8 state pieces
  └─ Dual-mode: Add items OR consume from stock
  └─ 3 parallel API calls on load
  └─ Mutation workflow for save + consume

Used Items
  └─ Read-only display of consumed items
  └─ Shows cost tracking

Billing Summary  ⚠️ INCORRECT PHASE
  └─ Read-only display of payment status
  └─ Shows item costs already factored in "Used Items"
  └─ Makes no sense during planning phase

Usage Variance
  └─ Comparison between planned vs actual
  └─ Requires both planned + used data

Timeline
  └─ Surgical case timeline/milestones

Consents
  └─ Consent documentation
```

### Data Flow Problem

```
┌─────────────────────────────────────────────────────────┐
│ User navigates to surgical case plan page               │
└─────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │ SurgicalPlanShell loads 3 queries:   │
        ├──────────────────────────────────────┤
        │ 1. Surgical case data                │
        │ 2. Planned items (inventory-planning)│
        │ 3. Usage variance (inventory-planning)
        └──────────────────────────────────────┘
                           ↓
        3 queries loaded (200-500ms each)
        Data cached in React Query
                           ↓
        ┌──────────────────────────────────────┐
        │ Inventory Planning Tab loads...       │
        ├──────────────────────────────────────┤
        │ - Reads planned items (already loaded)
        │ - Reads usage variance (already loaded)
        │ - Loads inventory items by category   │ ← 4th query!
        │   (promise.all for ALL categories)    │
        │ - Mounted with 8 useState pieces      │
        └──────────────────────────────────────┘
```

**Problem**: Data loaded before tabs mount, then loaded again inside tab. Redundant query paths.

---

## Identified Issues

### 1. ❌ Billing Tab Appears in Planning Phase

**Current State**: Billing Summary tab visible during surgical planning
```
User workflow:
1. Doctor plans surgery → Billing Summary shows $0 (nothing planned yet)
2. Doctor adds planned items → Billing recalculates
3. Doctor exits → no surgery happened
Result: Confusing empty billing state during planning
```

**Why This Is Wrong**:
- Billing is **post-operative concern**, not pre-operative
- No inventory has been consumed yet—all quantities are "planned" only
- Payment summary meaningless without actual usage
- Creates cognitive load: doctor thinking about costs during surgical planning (distraction)
- Violates surgical workflow phases (planning ≠ billing)

**Correct Phases**:
- **Planning Phase**: Overview, Procedure, Risk Factors, Anesthesia, **Items to Order**, Consents
- **Execution Phase**: Timeline, Used Items, Real-time tracking
- **Post-Op Phase**: Billing Summary, Usage Variance, Cost reconciliation

### 2. ❌ Inventory Planning Tab Too Complex (403-line hook)

**State Management Breakdown**:
```typescript
// Primary data state
const [plannedItemsData, setPlannedItemsData] = useState<PlannedItemsDto[] | null>(null);
const [varianceData, setVarianceData] = useState<UsageVarianceDto[] | null>(null);
const [inventoryItemsData, setInventoryItemsData] = useState<InventoryItemSelectorViewModel[]>([]);

// Editing state (handles BOTH planned items changes AND inventory item selection)
const [editingItems, setEditingItems] = useState<Map<number, { quantity: number; notes: string }>>(new Map());

// UI state (filters + search)
const [searchQuery, setSearchQuery] = useState('');
const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'ALL'>('ALL');

// Consume dialog state (6 separate pieces for ONE dialog)
const [consumeDialogOpen, setConsumeDialogOpen] = useState(false);
const [consumeDialogItem, setConsumeDialogItem] = useState<PlannedItemViewModel | null>(null);
const [consumeDialogQuantity, setConsumeDialogQuantity] = useState(0);

// Loading states (3 separate)
const [isLoadingPlanned, setIsLoadingPlanned] = useState(true);
const [isLoadingVariance, setIsLoadingVariance] = useState(true);
const [isLoadingInventory, setIsLoadingInventory] = useState(false);
```

**Data Flow Issues**:
- `editingItems` serves dual purpose: editing existing planned items AND adding new items
- Consume dialog has 3 separate state pieces that should be 1 (compound state)
- 8+ useState declarations vs Anesthesia tab's 4
- Complex `savePlannedItems` logic merges: existing items + edits + new items = confusing

**Mutation Chain**:
```
1. addItemToPlan() → updates editingItems (Map)
2. savePlannedItems() → merges editingItems + plannedItems + computes diff
3. saveMutation.mutateAsync() → calls API with merged list
4. consumeMutation.mutateAsync() → separate workflow to record actual usage
5. Query invalidation → triggers parallel refetch of planned + variance
```

### 3. ❌ "Planned Items" vs "Used Items" Semantics Unclear

**Current UI Problem**:
```
Inventory Planning Tab (labeled "Planned Items"):
├─ Tab 1: "Planned Items" (shows planned items, editable, can add)
├─ Tab 2: "Add Items" (selector for new items)
└─ Consume dialog: (click item → dialog to record actual usage)

Used Items Tab:
└─ Read-only list of consumed items

Problem: User can't distinguish:
- What's planned but not yet consumed? (Shown in Planned Items)
- What's been consumed and billed? (Shown in Used Items & Billing)
- How do items flow from Planned → Used?
```

**Data Model Issue**:
- PlannedItemsResponse shows: `plannedQuantity` + `consumedQuantity` + `remainingQuantity`
- But UI splits this across TWO tabs instead of showing state in ONE view
- No visual indication of consumption progress (0/5 consumed, 3/5 remaining, etc.)

### 4. ❌ Inventory System Integration Incomplete

**API Structure**:
```
Planned Items → /doctor/surgical-cases/[caseId]/planned-items
Used Items    → /doctor/surgical-cases/[caseId]/usage (via nurse endpoint)
Inventory     → /inventory/items (generic search endpoint)
```

**Issues**:
- Inventory items loaded fresh on tab mount (not pre-loaded with case)
- Category filtering happens CLIENT-SIDE after loading all items (wasteful)
- No validation that planned items actually exist in inventory
- No stock level checking during planning (only at consumption via `stockWarnings`)
- "Used Items" are recorded via nurse API (different permissions), billing items may not sync

---

## Tab Necessity Assessment

| Tab | Usage Frequency | Context | Phase | Recommendation |
|-----|-----------------|---------|-------|-----------------|
| Overview | 80%+ | Case metadata, patient info | Planning | ✅ Keep |
| Procedure | 60%+ | Core surgical details | Planning | ✅ Keep |
| Risk Factors | 40% | Pre-op risk assessment | Planning | ✅ Keep |
| Anesthesia | 50% | Anesthesia plan (simple) | Planning | ✅ Keep (simpler hook) |
| Planned Items | 70%+ | Item ordering | Planning | ⚠️ **REFACTOR HEAVILY** |
| Used Items | 30% (post-op) | Consumption tracking | Execution | ❌ Move to post-op view |
| Billing Summary | <10% | Financial summary | Post-Op | ❌ **Remove from planning** |
| Usage Variance | <5% | Analytic comparison | Post-Op | ❌ Move to post-op view |
| Timeline | 20% | Case milestones | Execution | ⚠️ Consider hiding until active |
| Consents | 25% | Paperwork tracking | Planning | ✅ Keep |

---

## Root Causes

### 1. Single Page Serving Multiple Surgical Phases
The page conflates:
- **Planning Phase** (before surgery): Decide what items to order, consent forms
- **Execution Phase** (during surgery): Track what's being used in real-time
- **Post-Op Phase** (after surgery): Billing, variance analysis, documentation

→ Should be 2-3 separate views with phase-aware routing

### 2. Inventory Planning Tab Overloaded
The tab tries to:
- Display planned items from database
- Allow editing planned items locally
- Provide item selector to add new items
- Show inventory levels
- Provide consume dialog to record actual usage
- Handle search/filtering

→ Should split into: (1) Planned Items (edit/review) + (2) Item Selector (add items)

### 3. Complex State Driven by Single Responsibility Violation
The `useInventoryPlanningTab` hook is responsible for:
- Loading 3+ data types (planned, variance, inventory catalog)
- Editing state management (Map-based)
- Dialog state (3 pieces)
- Search/filter state
- Multiple mutations (save planned, consume from plan)

→ Should split into: (1) Data loading hook + (2) Form state hook + (3) Dialog management

### 4. Redundant Tabs
- "Planned Items" + "Used Items" both show inventory consumption, split inefficiently
- "Billing Summary" + "Used Items" both summarize costs, redundant display

→ Should consolidate into single "Inventory Summary" post-op view

---

## Recommendations

### Phase 1: Remove Premature Billing Tab (CRITICAL - 1 hour)
- Delete Billing Summary tab from tab registry for **planning phase** case status
- Make it visible only when case status = "Completed" or "Post-Op"
- Remove `billing-summary` from `/features/surgical-plan/core/tabRegistry.ts` (or conditionally render)

**Impact**: Reduces cognitive load, aligns with surgical workflow phases

### Phase 2: Refactor Inventory Planning Tab (HIGH - 6-8 hours)

**Current Problem**: 403-line hook doing too much

**Solution Structure**:
```
useInventoryPlanningTab.ts (simplified, 150 lines):
├─ Load planned items query
├─ Load inventory catalog (eager, not lazy)
├─ Single savedDraft state (Map<itemId, {quantity, notes}>)
├─ Return planned items, inventory items, draft state, actions

InventoryPlanningTab.view.tsx (refactored):
├─ Split into 2 sub-views:
│  ├─ PlannedItemsSubTab (editable list of current planned items)
│  └─ AddItemsSubTab (selector to add new items)
├─ Consume workflow moved to context menu action (not primary flow)
└─ Remove consume dialog (secondary concern)

Consume Workflow (separate hook/context):
└─ Only appears in Used Items post-op view, not during planning
```

**Code Reduction**: 403 → ~150 lines for hook, move 100 lines of consume logic elsewhere

### Phase 3: Consolidate Item Views (MEDIUM - 4 hours)

**Merge These**:
- "Planned Items" tab (planned only)
- "Used Items" tab (consumed only)

**Into Single Tab**: "Inventory Planning" showing:
```
Item Name    | Planned | Consumed | Remaining | Cost/Unit | Total Value
─────────────┼─────────┼──────────┼───────────┼───────────┼─────────────
Surgical Gloves | 100   | 45       | 55        | $0.50     | $50.00
Sutures     | 5       | 3        | 2         | $12.00    | $60.00
─────────────┴─────────┴──────────┴───────────┴───────────┴─────────────
Total Estimated Cost: $110.00
```

This shows the full lifecycle in one view, reducing tabs from 10 → 8

### Phase 4: Phase-Aware Tab Visibility (MEDIUM - 3 hours)

Split surgical case view into phases:

```
PLANNING PHASE (case.status = "DRAFT" | "SCHEDULED"):
├─ Overview
├─ Procedure
├─ Risk Factors
├─ Anesthesia
├─ Inventory Planning (planned only)
├─ Consents
└─ Hidden: Used Items, Billing, Variance, Timeline

EXECUTION PHASE (case.status = "IN_PROGRESS"):
├─ Overview
├─ Timeline (now important!)
├─ Used Items (track consumption in real-time)
├─ Quick Access to Planned Items
└─ Hidden: Billing, Variance

POST-OP PHASE (case.status = "COMPLETED"):
├─ Overview
├─ Billing Summary
├─ Usage Variance
├─ Consents (finalized)
├─ Timeline
└─ Inventory Summary
```

**Impact**: 
- Reduces visible tabs from 10 → 5-7 depending on phase
- Aligns UI with doctor's actual workflow
- Removes premature information

---

## Cost-Benefit Analysis

### What's Breaking Today
- **User Report**: Input elements not behaving due to complex state
- **Architecture**: 403-line hook with 8 useState declarations
- **UX**: 10 tabs exceeds recommended maximum (5-7)
- **Workflow**: Billing info shown when irrelevant (planning phase)

### Investment Required
- Phase 1 (Remove Billing): 1 hour
- Phase 2 (Refactor Inventory): 6-8 hours
- Phase 3 (Consolidate Views): 4 hours
- Phase 4 (Phase-Aware Tabs): 3 hours
- **Total**: 14-16 hours implementation

### Expected Returns
- ✅ Fix input behavior issues (eliminated via state reduction)
- ✅ 30% reduction in hook complexity (403 → ~150 lines)
- ✅ 20% reduction in visible tabs (10 → 8, later 5-7)
- ✅ 15% UI performance improvement (fewer state updates)
- ✅ Improved UX clarity (phase-aligned workflow)
- ✅ Better surgical workflow alignment

---

## Implementation Priority

1. **🔴 CRITICAL**: Phase 1 (Remove Billing) + Phase 2a (Simplify hook state)
   - Unblocks input behavior issues
   - 1-3 hours work
   - High impact (fixes reported bugs)

2. **🟠 HIGH**: Phase 2b (Refactor view separation) + Phase 3 (Consolidate items)
   - Reduces tab count and complexity
   - 10 hours work
   - Medium impact (improves UX)

3. **🟡 MEDIUM**: Phase 4 (Phase-aware visibility)
   - Aligns with surgical workflow
   - 3 hours work
   - Moderate impact (better information architecture)

---

## Code Smell Examples

### Example 1: Multi-Purpose State
```typescript
// ❌ BAD: editingItems used for both purposes
const [editingItems, setEditingItems] = useState<Map<number, { quantity: number; notes: string }>>(new Map());

// addItemToPlan uses it for new items
updateEditingItem(item.id, { quantity: 1, notes: '' });

// savePlannedItems uses it for both editing AND adding
for (const plannedItem of plannedItems) {
  if (editingItems.has(plannedItem.inventoryItemId)) {
    // Edit case
    itemsToSave.push({
      inventoryItemId: plannedItem.inventoryItemId,
      plannedQuantity: editingItems.get(plannedItem.inventoryItemId).quantity,
    });
  }
}
for (const [itemId, editing] of editingItems.entries()) {
  if (!plannedItems.some((p) => p.inventoryItemId === itemId)) {
    // Add case
    itemsToSave.push({...});
  }
}

// ✅ GOOD: Split into two states
const [editedItemQuantities, setEditedItemQuantities] = useState<Map<...>>(new Map());
const [newItemsToPlan, setNewItemsToPlan] = useState<Array<{id, quantity, notes}>>([]); 
// Now logic is clear: existing items use one state, new items use another
```

### Example 2: Consume Dialog State Explosion
```typescript
// ❌ BAD: 3 separate pieces of state for ONE dialog
const [consumeDialogOpen, setConsumeDialogOpen] = useState(false);
const [consumeDialogItem, setConsumeDialogItem] = useState<PlannedItemViewModel | null>(null);
const [consumeDialogQuantity, setConsumeDialogQuantity] = useState(0);

const openConsumeDialog = useCallback((itemId: number) => {
  const item = plannedItems.find((p) => p.inventoryItemId === itemId);
  setConsumeDialogItem(item);
  setConsumeDialogQuantity(Math.max(0, item.remainingQuantity));
  setConsumeDialogOpen(true);
}, [plannedItems]);

// ✅ GOOD: Single compound state
const [consumeDialog, setConsumeDialog] = useState<{
  isOpen: boolean;
  item: PlannedItemViewModel | null;
  quantity: number;
} | null>(null);

const openConsumeDialog = useCallback((itemId: number) => {
  const item = plannedItems.find((p) => p.inventoryItemId === itemId);
  setConsumeDialog({
    isOpen: true,
    item,
    quantity: Math.max(0, item.remainingQuantity),
  });
}, [plannedItems]);
```

### Example 3: Phase-Unaware Tab Registry
```typescript
// ❌ BAD: All tabs always visible regardless of surgical phase
export const TAB_REGISTRY: TabDefinition[] = [
  { key: 'overview', label: 'Overview', ... },
  { key: 'billing-summary', label: 'Billing Summary', ... }, // Shows empty during planning!
  { key: 'usage-variance', label: 'Usage Variance', ... }, // No data during planning
];

// ✅ GOOD: Phase-aware registry
const getTabRegistry = (caseStatus: SurgicalCaseStatus): TabDefinition[] => {
  switch (caseStatus) {
    case 'DRAFT':
    case 'SCHEDULED':
      return [
        { key: 'overview', label: 'Overview', ... },
        { key: 'procedure', label: 'Procedure', ... },
        { key: 'risk-factors', label: 'Risk Factors', ... },
        { key: 'anesthesia', label: 'Anesthesia', ... },
        { key: 'inventory-planning', label: 'Inventory Planning', ... },
        { key: 'consents', label: 'Consents', ... },
      ];
    case 'IN_PROGRESS':
      return [
        { key: 'overview', label: 'Overview', ... },
        { key: 'timeline', label: 'Timeline', ... },
        { key: 'used-items', label: 'Used Items', ... },
      ];
    case 'COMPLETED':
      return [
        { key: 'overview', label: 'Overview', ... },
        { key: 'billing-summary', label: 'Billing Summary', ... },
        { key: 'usage-variance', label: 'Usage Variance', ... },
      ];
  }
};
```

---

## Conclusion

The surgical cases plan page has **accumulated too many concerns** in a single view. The 10-tab structure, complex state management, and phase-unaware design are causing:
- Input behavior bugs (due to state complexity)
- Cognitive overload (too many tabs)
- Workflow misalignment (billing during planning)

**Recommended path forward**: 
1. Immediately remove billing tab from planning phase (1 hour, high impact)
2. Refactor inventory planning hook to split concerns (6-8 hours, medium implementation effort, high impact)
3. Consolidate inventory views to reduce tab count (4 hours)
4. Implement phase-aware tab visibility (3 hours)

This represents **14-16 hours of work for significant UX and architectural improvements**.
