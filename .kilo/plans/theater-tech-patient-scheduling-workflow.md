# Robust Patient Search & Filter for Frontdesk + Theater-Tech

## Problem

Patient search/filter is reported as **slow** and **inconsistent** across the frontdesk and
theater-tech roles. Investigation shows the root causes are structural, not tuning issues.

### Root causes (verified)

1. **Theater-tech has no search input at all.** `app/theater-tech/patients/_feature/components/PatientToolbar.tsx`
   only renders the Today/Month chips + "Add Patient". There is no way to type a query.
2. **Frontdesk search does not filter the main list.** `components/frontdesk/SearchAutocomplete.tsx` is a
   quick-navigation popover — selecting a patient opens the drawer (`onSelectPatient`). It never writes
   `q` to the URL, so the table below is untouched by typed text. The `q` plumbing in the hooks/API is
   effectively dead for the main list on both modules.
3. **Inconsistent field coverage.** Frontdesk (`infrastructure/repositories/PatientRepository.ts:184`)
   searches 6+ fields (name, file_number, email, phone variants, multi-word AND-swaps). Theater-tech
   (`app/api/theater-tech/patients/route.ts:31`) searches only `first_name`, `last_name`, `file_number`.
4. **Heavy per-row eager loading on the frontdesk list.** `PatientRepository.findWithFilters` eager-loads
   `appointments`, `_count`, `patient_queue`, `payments` on every row (4 relations) — the table only shows
   name/file/phone/lastVisit/queue, so most of this is wasted work and the largest contributor to "slow".
5. **No debounce on the registry fetch.** Typing drives URL changes that fire React Query refetches, with
   `placeholderData: keepPreviousData` masking latency — produces flicker and "inconsistent" results.
6. **Theater-tech filter bug.** `app/api/theater-tech/patients/route.ts:41-52` — when both `createdToday` and
   `createdThisMonth` are set, the second `where.created_at = { ...where.created_at, gte: monthStart }`
   overwrites the first. URL-state guards make this mostly unreachable today, but it is still wrong.

## Design

Introduce a **single shared search experience** for both roles: a debounced text input that drives the
existing `q` URL param (single source of truth for filters), with consistent field coverage, trimmed
queries, and stable loading states. Keep the existing quick-filter chips (Today / This Month).

### A. Shared debounced search input (new component)
`components/patients/PatientSearchInput.tsx` (new, role-agnostic)
- Plain text input + leading search icon + clear (X) button.
- Local `query` state mirrored to the URL `q` param **debounced (~350ms)** via `useDebounce`.
- On change: `setFilter`-style URL write that **also resets `page` to 1** (search always starts at page 1).
- Empty query clears `q` (returns to browse mode). Leading/trailing whitespace trimmed before committing.
- Renders an inline "Searching…" affordance when the list `isFetching` (passed in as a prop).
- Reused by both `PatientToolbar`s — replacing the popover `SearchAutocomplete` on frontdesk for *list*
  filtering, and adding the missing input on theater-tech.

### B. Wire `q` to actually filter the list (frontdesk + theater-tech)
The hooks already read `search` from URL and the APIs already accept `q` — the gap is only that nothing
*sets* `q` from a typing input. Adding component (A) closes that gap; no hook change needed for filtering
itself. Keep `router.replace` (not push) for search commits so browser history isn't flooded.

### C. Consistent field coverage
- Extract the frontdesk search predicate into a small shared helper
  `lib/patients/buildPatientSearchWhere.ts` exporting `buildPatientSearchWhere(search): Prisma.PatientWhereInput`
  (the OR-of-contains/equals + phone-variant + multi-word logic currently in `PatientRepository`).
- Theater-tech route calls the same helper so both roles search identical fields → consistent results.
- Empty/whitespace-only search returns `{}` (unfiltered).

### D. Faster frontdesk list query
- Trim `PatientRepository.findWithFilters` to eager-load only what the table renders: drop
  `appointments`, `_count`, and `payments`; keep `patient_queue` (drives `queueStatus`). Keep `lastVisitAt`
  derivation but compute from a lean select rather than a full relation include.
- Keep the existing per-field indexes (`first_name`, `last_name`, `file_number`, `phone`); the `OR … contains`
  pattern is already `insensitive`. (No full-text/trgm index in this pass — out of scope, revisit if still slow.)

### E. Stable loading / no flicker
- Keep `placeholderData: keepPreviousData` (prevents layout swap) but add an `isFetching` spinner + the
  inline "Searching…" text so a refetch is always visible instead of showing stale rows silently.
- Reset accumulated browse list + `browseCurrentPage = 1` whenever `q` changes (the existing `resetKey`
  effect already keys on `search`, so this is mostly covered — verify and harden).

### F. Fix theater-tech filter bug
- In `app/api/theater-tech/patients/route.ts`, build `createdToday` / `createdThisMonth` as mutually
  exclusive (if `createdToday`, use today's start; else if `createdThisMonth`, use month start) — never
  spread-merge the two. Also have activating one chip clear the other at the URL layer (already done in
  `usePatientFilters`); make the route defend independently.

## Out of scope (intentionally)
- Replacing `SearchAutocomplete` quick-nav popover with a command-menu. It stays as a "open patient"
  shortcut on frontdesk where it already exists; the new `PatientSearchInput` handles *list* filtering.
- PostgreSQL `pg_trgm` / full-text indexing — a later optimization if trimming relations isn't enough.
- Changing pagination/sort semantics.

## Files to change
- **new** `components/patients/PatientSearchInput.tsx`
- **new** `lib/patients/buildPatientSearchWhere.ts`
- `app/frontdesk/patients/_feature/components/PatientToolbar.tsx` — add `PatientSearchInput`
- `app/theater-tech/patients/_feature/components/PatientToolbar.tsx` — add `PatientSearchInput`
- `app/theater-tech/patients/_feature/hooks/useTheaterTechPatientRegistry.tsx` — pass `isFetching`/search
  props; ensure page resets on `q`
- `app/frontdesk/patients/_feature/hooks/usePatientRegistry.ts` — ensure page resets on `q`
- `infrastructure/repositories/PatientRepository.ts` — reuse shared WHERE helper; trim eager relations
- `app/api/theater-tech/patients/route.ts` — use shared WHERE helper; fix filter bug

## Verification
- `npm run lint` (type-check) clean.
- `next build` compiles.
- Manual:
  - Frontdesk `/frontdesk/patients`: typing in the new input debounces, filters the table by name/phone/
    file/email, resets to page 1, shows "Searching…", clears with X.
  - Theater-tech `/theater-tech/patients`: same input now present and behaves identically; chip + text
    combine correctly; activating Today clears This Month.
  - Both: multi-word "first last" matches; phone with/without country code matches.
