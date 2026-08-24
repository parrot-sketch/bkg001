import type { PatientRegistryDto, PatientListMeta } from '@/application/dtos/PatientRegistryDto';

export type QuickFilter = 'today' | 'thisMonth';

export interface PatientUrlState {
  readonly page: number;
  readonly search: string;
  readonly createdToday: boolean;
  readonly createdThisMonth: boolean;
}

export interface PatientUrlActions {
  setPage: (page: number) => void;
  setFilter: (key: 'createdToday' | 'createdThisMonth', value: boolean) => void;
  setSearch: (search: string) => void;
  clearAll: () => void;
}

export type { PatientRegistryDto, PatientListMeta };

export interface PatientRegistryState {
  patients: ReadonlyArray<PatientRegistryDto>;
  stats: { totalRecords: number; newToday: number; newThisMonth: number } | undefined;
  meta: PatientListMeta;
  isLoading: boolean;
  isFetching: boolean;
  isStatsLoading: boolean;
  isBrowseMode: boolean;
  hasActiveFilters: boolean;
  hasMore: boolean;
  limit: number;
  urlState: PatientUrlState;
  urlActions: PatientUrlActions;
  activeQuickFilters: QuickFilter[];
  toggleQuickFilter: (filter: QuickFilter) => void;
  currentPage: number;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  handleLoadMore: () => void;
  drawerPatientId: string | null;
  drawerOpen: boolean;
  openDrawer: (patientId: string) => void;
  closeDrawer: () => void;
  registrationOpen: boolean;
  openRegistration: () => void;
  handleRegistrationSuccess: () => void;
}
