'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PatientRegistryDto, PatientListMeta } from '../types/patient-page';

interface UsePaginationInput {
  listResult: { data: PatientRegistryDto[]; meta: PatientListMeta } | undefined;
  isBrowseMode: boolean;
  isFetching: boolean;
  limit: number;
  /** Resets accumulation when filters / search changes. */
  resetKey: string;
}

interface UsePaginationReturn {
  patients: ReadonlyArray<PatientRegistryDto>;
  /** The page number to pass to the data-fetching query. */
  queryPage: number;
  currentPage: number;
  hasMore: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  handleLoadMore: () => void;
}

/**
 * Owns all pagination logic for the patient registry page.
 *
 * - **Browse mode**: infinite scroll — accumulates patients across pages,
 *   wires up an IntersectionObserver for auto load-more.
 * - **Search / filter mode**: standard cursor pagination — returns the
 *   latest page's data directly without accumulation.
 *
 * The page never needs to know which mode it is in to compute `patients`.
 */
export function usePatientPagination({
  listResult,
  isBrowseMode,
  isFetching,
  limit,
  resetKey,
}: UsePaginationInput): UsePaginationReturn {
  const [accumulatedPatients, setAccumulatedPatients] = useState<PatientRegistryDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // ── Reset when search / filter changes ────────────────────────────────────
  useEffect(() => {
    setAccumulatedPatients([]);
    setCurrentPage(1);
    setHasMore(true);
  }, [resetKey]);

  // ── Accumulate results ────────────────────────────────────────────────────
  useEffect(() => {
    if (!listResult?.data) return;

    setAccumulatedPatients((prev) => {
      if (isBrowseMode) {
        const seen = new Set(prev.map((p) => p.id));
        const newPatients = listResult.data.filter((p) => !seen.has(p.id));
        return [...prev, ...newPatients];
      }
      return listResult.data;
    });

    setHasMore((listResult.data.length ?? 0) >= limit);
  }, [listResult, limit, isBrowseMode]);

  // ── IntersectionObserver for auto load-more ───────────────────────────────
  useEffect(() => {
    if (!isBrowseMode || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isBrowseMode, hasMore, isFetching]);

  // ── Deduplication ─────────────────────────────────────────────────────────
  const patients = (() => {
    const seen = new Set<string>();
    return accumulatedPatients.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  })();

  const handleLoadMore = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  return { patients, queryPage: currentPage, currentPage, hasMore, loadMoreRef, handleLoadMore };
}
