# Surgical Plan Redesign Guardrails

## Overview

This document defines architectural guardrails for the surgical plan feature module to prevent regression and maintain clean separation of concerns.

## Architecture Principles

### 1. View Components Are Pure

**Rule:** View components (`*.view.tsx`) must NOT contain:
- API calls (no `apiClient`, no `fetch`)
- Zod parsing (no `parse*` functions)
- Business logic (no status computation, no data transformation)
- Direct state management (use props from container)

**Allowed in views:**
- Rendering UI based on props
- Calling handler functions passed as props
- Using shadcn/ui components
- Conditional rendering based on view model data

**Example:**
```typescript
// ✅ CORRECT
function PlannedItemsTableView({ items, onEdit }: Props) {
  return <Table>{items.map(item => <Row key={item.id} data={item} />)}</Table>;
}

// ❌ WRONG
function PlannedItemsTableView() {
  const { data } = useQuery(['items'], () => apiClient.get('/items')); // NO API CALLS
  const parsed = parseItemsResponse(data); // NO PARSING
  return <Table>...</Table>;
}
```

### 2. Parsing in Parsers

**Rule:** All request/response validation MUST go through Zod parsers in `*Parsers.ts` files.

**Location:** `features/surgical-plan/tabs/*/tabNameParsers.ts`

**Pattern:**
```typescript
// ✅ CORRECT
export function parsePlannedItemsResponse(data: unknown): PlannedItemsResponse {
  try {
    return PlannedItemsResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid response');
    }
    throw error;
  }
}

// ❌ WRONG
function Component() {
  const data = response.data as PlannedItemsResponse; // NO TYPE CASTING
}
```

### 3. API Calls in API Wrappers + Hooks

**Rule:** All API calls MUST go through:
1. API wrapper in `*Api.ts` (uses `apiClient`)
2. Hook calls the API wrapper
3. Container calls the hook
4. View receives data from container

**Flow:**
```
View → Container → Hook → API Wrapper → apiClient → Server
```

**Example:**
```typescript
// ✅ CORRECT
// inventoryPlanningApi.ts
export const inventoryPlanningApi = {
  async getPlannedItems(caseId: string) {
    return apiClient.get(`/planned-items/${caseId}`);
  }
};

// useInventoryPlanningTab.ts
const { data } = useQuery({
  queryFn: () => inventoryPlanningApi.getPlannedItems(caseId)
});

// ❌ WRONG
// In view component
const { data } = useQuery({
  queryFn: () => apiClient.get('/planned-items') // NO DIRECT apiClient IN VIEWS
});
```

### 4. Business Logic in Mappers

**Rule:** All DTO → ViewModel transformations and business logic MUST be in `*Mappers.ts` files.

**Examples:**
- Status computation (complete/partial/over)
- Cost calculations
- Badge determination
- ExternalRef generation

**Location:** `features/surgical-plan/tabs/*/tabNameMappers.ts`

**Example:**
```typescript
// ✅ CORRECT
export function computePlannedConsumptionBadges(
  plannedQuantity: number,
  usedQuantity: number
): 'none' | 'partial' | 'full' | 'over' {
  if (usedQuantity === 0) return 'none';
  if (usedQuantity >= plannedQuantity) {
    return usedQuantity > plannedQuantity ? 'over' : 'full';
  }
  return 'partial';
}

// ❌ WRONG
// In view component
const status = usedQty >= plannedQty ? 'full' : 'partial'; // NO LOGIC IN VIEWS
```

## File Structure

```
features/surgical-plan/
├── tabs/
│   └── inventory-planning/
│       ├── InventoryPlanningTab.container.tsx  # Orchestration
│       ├── InventoryPlanningTab.view.tsx       # Pure UI
│       ├── useInventoryPlanningTab.ts          # Data + actions
│       ├── inventoryPlanningApi.ts             # API wrapper
│       ├── inventoryPlanningParsers.ts         # Zod validation
│       ├── inventoryPlanningMappers.ts         # Business logic
│       └── components/                         # Sub-components
│           ├── InventoryItemSelector.tsx        # Pure UI
│           ├── PlannedItemsTable.tsx           # Pure UI
│           └── ConsumeFromPlanDialog.tsx      # Pure UI
```

## ESLint Rules

The following ESLint rules are configured to enforce these guardrails:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "@/lib/api/client",
            "message": "Do not import apiClient in view components. Use API wrapper in *Api.ts instead."
          },
          {
            "name": "zod",
            "message": "Do not import zod in view components. Use parsers in *Parsers.ts instead."
          }
        ],
        "patterns": [
          {
            "group": ["**/features/surgical-plan/tabs/**/*.view.tsx"],
            "importNames": ["apiClient", "z"],
            "message": "View components must not import apiClient or zod. Use API wrappers and parsers instead."
          }
        ]
      }
    ]
  }
}
```

## Testing Requirements

### Unit Tests
- **Parsers:** Test validation success/failure for all schemas
- **Mappers:** Test business logic (status computation, cost calculations)
- **Hooks:** Test data loading, state transitions, action calls

### Contract Tests
- **API Routes:** Test ApiResponse<T> structure, HTTP status codes, error metadata
- **Endpoints:** Test success, validation (400), unauthorized (403), not found (404), domain violations (422)

## Migration Checklist

When extracting a new tab:

- [ ] Create API wrapper (`*Api.ts`)
- [ ] Create parsers (`*Parsers.ts`) with Zod schemas
- [ ] Create mappers (`*Mappers.ts`) with business logic
- [ ] Create hook (`use*Tab.ts`) for data + actions
- [ ] Create view (`*.view.tsx`) - pure UI only
- [ ] Create container (`*.container.tsx`) - orchestration
- [ ] Add unit tests for parsers and mappers
- [ ] Add contract tests for API routes
- [ ] Register tab in `tabRegistry.ts`
- [ ] Remove legacy code from monolithic components
- [ ] Verify ESLint rules pass
- [ ] Verify TypeScript compiles with zero errors

## Phase 3 Invariants (Preserved)

The following invariants from Phase 3 must be preserved:

1. **Planning ≠ Consumption:** Planning does not decrement stock
2. **Single-Item Invariant:** Usage endpoint requires `items.length === 1`
3. **Idempotency:** Deterministic `externalRef` via SHA-256 → UUID
4. **Transactionality:** All-or-nothing operations
5. **Billing Determinism:** Payment totals recomputed, not incremented

## Enforcement

These guardrails are enforced via:
1. ESLint rules (compile-time)
2. TypeScript strict mode (compile-time)
3. Contract tests (runtime)
4. Code review checklist

Violations should be caught during development and fixed before merge.
