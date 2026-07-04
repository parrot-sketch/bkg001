# Plan: Refactor Doctor Appointments Page

## Goal
Replace the redundant tab-based appointments view with a single unified, filterable table, add analytics charts, and separate concerns into reusable hooks/components.

## Current State Audit
- **Redundant tabs**: `today` / `pending` / `upcoming` filter the same dataset — unnecessary UI complexity.
- **Mixed concerns**: `page.tsx` contains auth guards, data fetching, client-side categorization, action handlers, and all rendering.
- **No table**: Uses div/flex rows instead of the existing `<Table>` component.
- **No analytics**: Zero visualization of appointment patterns or stats.
- **Dead code**: `AppointmentTabs.tsx` exists but is unused; `AppointmentRow.tsx` is card-based, not table-ready.

## Decisions

### 1. Remove Tab Navigation
- Replace tabs with a **single unified list**.
- Add a **date range filter** (Today / This Week / This Month / Custom) instead of hard tabs.
- Keep **status filter** and **search**, but make them more robust.

### 2. Use Proper Table Component
- Migrate from div-based rows to `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` from `@/components/ui/table`.
- Columns: Date/Time, Patient, Type, Status, Actions.
- Sticky header, sortable columns, responsive overflow container.

### 3. Add Analytics Chart
- Add an `AppointmentAnalytics` card above the table using **recharts** (already a dependency).
- Show:
  - **Status breakdown** (donut/pie chart) — counts by status.
  - **7-day volume trend** (bar chart) — appointments per day.
- Data derived client-side from the existing fetched appointments (no new API calls).

### 4. Separate Concerns
- Create `useAppointmentActions.ts` — encapsulate `handleConfirm`, `handleReject`, `handleStartConsultation`, toast + invalidation logic.
- Create `useAppointmentFilters.ts` — encapsulate search, status, date-range state + filtering/sorting logic.
- Keep `page.tsx` as a thin shell: fetch data → compose sections.

### 5. Improve Filtering Algorithm
- Multi-field search: patient name, file number, type, note, time.
- Status multi-filter (allow selecting multiple statuses).
- Date range filter with preset buttons.

## Implementation Steps

1. **Create hooks**
   - `hooks/doctor/useAppointmentActions.ts`
   - `hooks/doctor/useAppointmentFilters.ts`

2. **Create chart component**
   - `components/doctor/appointments/AppointmentAnalytics.tsx`

3. **Refactor page**
   - `app/doctor/appointments/page.tsx` → thin shell, remove inline categorization, use new hooks.

4. **Build table component**
   - `components/doctor/appointments/AppointmentTable.tsx` — proper `<Table>` with sort + actions.

5. **Cleanup dead/unused code**
   - Remove `AppointmentTabs.tsx` or archive it.
   - Update `AppointmentRow.tsx` if still needed elsewhere, else remove.

6. **Verify**
   - `npm run type-check`
   - Manual smoke test on `/doctor/appointments`.

## Out of Scope
- Pagination / server-side filtering (not requested; current dataset is small enough for client-side).
- Export to CSV/PDF.
- Drag-and-drop rescheduling.
