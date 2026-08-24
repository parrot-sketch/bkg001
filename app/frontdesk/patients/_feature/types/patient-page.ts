import type { PatientRegistryDto, PatientListMeta } from '@/application/dtos/PatientRegistryDto';

// ─── Filter & Mode ────────────────────────────────────────────────────────────

/** The two supported quick-filter keys. */
export type QuickFilter = 'today' | 'thisMonth';

// ─── URL State ────────────────────────────────────────────────────────────────

/**
 * The parsed representation of the page's URL search params.
 * Components read from this; they never touch URLSearchParams directly.
 */
export interface PatientUrlState {
  readonly page: number;
  readonly search: string;
  readonly createdToday: boolean;
  readonly createdThisMonth: boolean;
  readonly isSelectionMode: boolean;
}

/**
 * Actions that can mutate the URL state.
 * All updates go through the router, keeping the URL as the single source of truth.
 */
export interface PatientUrlActions {
  setPage: (page: number) => void;
  setFilter: (key: 'createdToday' | 'createdThisMonth', value: boolean) => void;
  setSearch: (search: string) => void;
  clearAll: () => void;
  exitSelectionMode: () => void;
}

// ─── Data shapes ─────────────────────────────────────────────────────────────

/** Re-export for convenience so feature internals import from a single place. */
export type { PatientRegistryDto, PatientListMeta };

/** The combined shape returned by the orchestration hook. */
export interface PatientRegistryState {
  // Data
  patients: ReadonlyArray<PatientRegistryDto>;
  stats: { totalRecords: number; newToday: number; newThisMonth: number } | undefined;
  meta: PatientListMeta;

  // Loading
  isLoading: boolean;
  isFetching: boolean;
  isStatsLoading: boolean;

  // Derived flags
  isBrowseMode: boolean;
  hasActiveFilters: boolean;
  hasMore: boolean;
  limit: number;

  // URL state
  urlState: PatientUrlState;
  urlActions: PatientUrlActions;

  // Filters
  activeQuickFilters: QuickFilter[];
  toggleQuickFilter: (filter: QuickFilter) => void;

  // Pagination (search mode)
  currentPage: number;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  handleLoadMore: () => void;

  // Drawer
  drawerPatientId: string | null;
  drawerOpen: boolean;
  openDrawer: (patientId: string) => void;
  closeDrawer: () => void;
  handleDrawerNavigate: (patientId: string) => void;

  // Registration
  registrationOpen: boolean;
  openRegistration: () => void;
  handleRegistrationSuccess: () => void;
}
