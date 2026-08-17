'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useFrontdeskPatients } from '@/hooks/frontdesk/useFrontdeskPatients';
import { usePatientStats } from '@/hooks/frontdesk/usePatientStats';
import { usePatientUrlState } from './usePatientUrlState';
import { usePatientFilters } from './usePatientFilters';
import { usePatientDrawer } from './usePatientDrawer';
import { usePatientRegistration } from './usePatientRegistration';
import { BATCH_SIZE, SEARCH_BATCH_SIZE } from '../constants/pagination';
import type { PatientRegistryDto, PatientListMeta } from '../types/patient-page';

const DEFAULT_META: PatientListMeta = {
  totalRecords: 0,
  totalPages: 1,
  currentPage: 1,
  limit: BATCH_SIZE,
};

/**
 * Top-level data orchestration hook for the patient registry page.
 *
 * This hook owns the page-counter state so it can thread it to both
 * `useFrontdeskPatients` (which needs it for the query key) and the
 * accumulation effect (which appends incoming pages to the patient list).
 *
 * Calling `usePatientPagination` as a child hook is architecturally clean for
 * stateless pagination logic, but the page-counter state itself must live here
 * to avoid the "two independent state machines" problem.
 *
 * The IntersectionObserver and Load More button both call `incrementPage`,
 * which is stable and flows through a ref sentinel rendered by `PatientLoadMore`.
 */
export function usePatientRegistry() {
  // ── URL state ─────────────────────────────────────────────────────────────
  const urlState = usePatientUrlState();
  const { search, createdToday, createdThisMonth, isSelectionMode, page: urlPage } = urlState;

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isBrowseMode = !search && !createdToday && !createdThisMonth;
  const limit = isBrowseMode ? BATCH_SIZE : SEARCH_BATCH_SIZE;
  const hasActiveFilters = !!(search || createdToday || createdThisMonth);

  // ── Filters ───────────────────────────────────────────────────────────────
  const { activeFilters: activeQuickFilters, toggleFilter: toggleQuickFilter } =
    usePatientFilters();

  // ── Sub-feature hooks ─────────────────────────────────────────────────────
  const drawer = usePatientDrawer();
  const registration = usePatientRegistration();

  // ── Browse-mode pagination state ──────────────────────────────────────────
  const [accumulatedPatients, setAccumulatedPatients] = useState<PatientRegistryDto[]>([]);
  const [browseCurrentPage, setBrowseCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Reset on search / filter change.
  const resetKey = `${search}|${createdToday}|${createdThisMonth}`;
  useEffect(() => {
    setAccumulatedPatients([]);
    setBrowseCurrentPage(1);
    setHasMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: listResult, isLoading, isFetching, error: listError } = useFrontdeskPatients({
    page: isBrowseMode ? browseCurrentPage : urlPage,
    limit,
    search,
    createdToday,
    createdThisMonth,
  });

  const { data: stats, isLoading: isStatsLoading, error: statsError } = usePatientStats();

  // ── Accumulate browse results ─────────────────────────────────────────────
  useEffect(() => {
    if (!listResult?.data) return;

    setAccumulatedPatients((prev) => {
      if (isBrowseMode) {
        const seen = new Set(prev.map((p) => p.id));
        const fresh = listResult.data.filter((p) => !seen.has(p.id));
        return [...prev, ...fresh];
      }
      return listResult.data;
    });

    setHasMore(listResult.data.length >= limit);
  }, [listResult, limit, isBrowseMode]);

  // ── IntersectionObserver ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isBrowseMode || !loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          setBrowseCurrentPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isBrowseMode, hasMore, isFetching]);

  // ── Deduplication ─────────────────────────────────────────────────────────
  const patients: ReadonlyArray<PatientRegistryDto> = (() => {
    const seen = new Set<string>();
    return accumulatedPatients.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  })();

  const handleLoadMore = useCallback(() => {
    setBrowseCurrentPage((p) => p + 1);
  }, []);

  // ── Meta fallback ─────────────────────────────────────────────────────────
  const meta = listResult?.meta ?? DEFAULT_META;

  return {
    // Data
    patients,
    stats,
    meta,

    // Loading
    isLoading,
    isFetching,
    isStatsLoading,
    error: listError,
    statsError,

    // Derived
    isBrowseMode,
    hasActiveFilters,
    hasMore,
    limit,
    isSelectionMode,

    // URL state (read + write)
    urlState,

    // Filters
    activeQuickFilters,
    toggleQuickFilter,

    // Pagination
    currentPage: browseCurrentPage,
    urlPage,
    loadMoreRef,
    handleLoadMore,

    // Drawer
    drawerPatientId: drawer.patientId,
    drawerOpen: drawer.isOpen,
    openDrawer: drawer.openDrawer,
    closeDrawer: drawer.closeDrawer,
    handleDrawerNavigate: drawer.handleNavigate,

    // Registration
    registrationOpen: registration.isOpen,
    openRegistration: registration.openDialog,
    closeRegistration: registration.closeDialog,
    handleRegistrationSuccess: registration.handleSuccess,
  };
}
