# PR-A06-06 — BillingProvider Extraction

## Overview

This PR extracts all billing-related state and UI concerns from `CompleteConsultationDialog` into a dedicated `BillingProvider`. This is the sixth Provider Extraction following:

- PR-A04 — Workflow Engine
- PR-A05 — SessionService
- PR-A06-01 — DocumentationProvider
- PR-A06-02 — PatientContextProvider
- PR-A06-03 — QueueContextProvider
- PR-A06-04 — TimerContextProvider
- PR-A06-05 — DialogProvider

**Status:** COMPLETE

---

## Files Added

| File | Purpose |
|------|---------|
| `providers/billing/BillingProvider.tsx` | Presentation Layer provider owning billing presentation state |
| `tests/frontend/providers/billing/BillingProvider.test.tsx` | 9 frontend tests |

**Total files added:** 2

---

## Files Modified

| File | Change |
|------|--------|
| `components/consultation/complete/CompleteConsultationDialog.tsx` | Migrated billing state from local useState to `useBillingContext()` |
| `contexts/ConsultationContext.tsx` | Added BillingProvider wrapper to provider tree |

**Total files modified:** 2

---

## Implementation Summary

### BillingProvider

- **Location:** `providers/billing/BillingProvider.tsx`
- **Layer:** Presentation Layer (React Context)
- **Lines:** ~140

**State Owned:**
- `billingItems` — Billing line items
- `billingTotal` — Billing total amount
- `discount` — Applied discount
- `billingWarnings` — Billing validation/warning messages

**Derived Values:**
- `hasBilling` — Whether any billing data exists (from existingBilling or state)
- `paymentStatus` — Payment status from existingBilling
- `consultationFee` — Fee from existingBilling or state
- `netAmount` — consultationFee minus discount

**Actions:**
- `setBillingItems(items)` — Update billing items
- `setBillingTotal(total)` — Update billing total
- `setDiscount(discount)` — Update discount
- `clearBillingWarnings()` — Clear all warnings

**Behavior:**
- Pure presentation state. No API calls, no business logic, no workflow transitions.
- Accepts `existingBilling` prop to derive values from persisted billing data.
- Discount initialized from `existingBilling.discount` to preserve persisted values.

### CompleteConsultationDialog Changes

- Replaced local `useState` for billing items, total, and discount with `useBillingContext()`.
- Billing data fetch (`useAppointmentBilling`) remains in component for data access.
- State updates wired through BillingProvider setters.

### ConsultationContext Changes

- Added `BillingProvider` wrapper in provider tree (outermost wrapper).
- Imports `BillingProvider` and `useBillingContext` for future use.

### Provider Tree (After)

```
BillingProvider
└── DialogProvider
    └── QueueContextProvider
        └── PatientContextProvider
            └── DocumentationProvider
                └── ConsultationContext.Provider
                    └── {children}
```

---

## Behavioral Parity Verification

### Preserved Behaviors

| Behavior | Implementation |
|----------|----------------|
| Billing items editing in complete dialog | `billing.setBillingItems()` |
| Billing total updates | `billing.setBillingTotal()` |
| Discount application | `billing.setDiscount()` |
| Discount persistence in DTO | `billing.discount` mapped to `CompleteConsultationDto.discount` |
| Billing display (read-only) in confirmation dialog | `useAppointmentBilling` hook remains |
| Billing visibility warnings | Computed in dialog from BillingProvider state |

### Public API Changes

| Property | Before | After |
|----------|--------|-------|
| `billingItems` | Local state in CompleteConsultationDialog | `useBillingContext().billingItems` |
| `billingTotal` | Local state in CompleteConsultationDialog | `useBillingContext().billingTotal` |
| `discount` | Local state in CompleteConsultationDialog | `useBillingContext().discount` |
| `setBillingItems` | Component callback | `useBillingContext().setBillingItems()` |
| `setBillingTotal` | Component callback | `useBillingContext().setBillingTotal()` |
| `setDiscount` | Component callback | `useBillingContext().setDiscount()` |

---

## Validation

### TypeScript

```
tsc --noEmit --skipLibCheck
```

**Result:** PASS (0 errors)

### Unit Tests

```
npx vitest run --config vitest.config.unit.ts
```

**Result:** 1697 passed (same as before PR)

### Frontend Tests

```
npx vitest run --config vitest.config.frontend.ts
```

**Result:** 64 passed (9 new BillingProvider tests)

| Test | Description | Status |
|------|-------------|--------|
| returns initial empty state | Default state verification | ✅ |
| derives billing values from existingBilling | existingBilling integration | ✅ |
| computes netAmount correctly | Derived value calculation | ✅ |
| updates billing items | State mutation | ✅ |
| updates billing total | State mutation | ✅ |
| updates discount | State mutation | ✅ |
| clears billing warnings | Warning state management | ✅ |
| hasBilling returns true when billingItems exist | Derived property | ✅ |
| throws error when used outside provider | Hook guard | ✅ |

---

## Dependencies

### Consumed Interfaces

| Interface | Purpose |
|-----------|---------|
| React (useState, useMemo, useCallback) | Presentation state management |

### Not Duplicated

| Concern | Source |
|---------|--------|
| Billing data persistence | `useAppointmentBilling` hook (unchanged) |
| Workflow transitions | ConsultationContext (unchanged) |
| API transport | `useAppointmentBilling` hook (unchanged) |
| Complete dialog step orchestration | CompleteConsultationDialog (unchanged) |

---

## Key Decisions

1. **BillingProvider placement:** Wrapped outermost in ConsultationContext provider tree so all nested components can consume billing state.
2. **Discount initialization:** Discount is initialized from `existingBilling?.discount` so persisted discounts are preserved when the component mounts.
3. **Read-only vs editable billing:** The old confirmation dialog (`CompleteConsultationDialog.tsx`) continues using `useAppointmentBilling` for read-only display. The multi-step dialog (`complete/CompleteConsultationDialog.tsx`) uses `useBillingContext()` for editable billing state.
4. **No API layer in provider:** BillingProvider does not fetch data. It receives `existingBilling` as props and manages local editing state only.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Consumer regression | Very Low | Low | Only CompleteConsultationDialog uses billing state; verified |
| State desync | Very Low | Medium | Provider owns single source of truth for billing state |
| Layer violation | Very Low | Medium | Provider has no API imports or service instantiation |

**Maximum Acceptable Risk:** VERY LOW

---

## ConsultationContext Reduction

| Metric | Before PR-A06-06 | After PR-A06-06 | Change |
|--------|------------------|-----------------|--------|
| Lines in ConsultationContext.tsx | 493 | ~493 | 0 (no billing was in ConsultationContext) |
| Extracted billing state | 0 | 3 sets + 4 derived values | In BillingProvider |
| Provider wrappers | 5 | 6 | +1 (BillingProvider) |

**Note:** Since there was no billing state in ConsultationContext.tsx to begin with, no lines were removed. BillingProvider serves as the new owner for billing presentation state that was previously scattered in dialog components.

---

## Future Work

- PR-A06-07: SessionProvider extraction (final provider extraction)
- After PR-A06-07, ConsultationContext will become a lightweight composition root
- Consider migrating old `CompleteConsultationDialog.tsx` to use BillingProvider for consistency
