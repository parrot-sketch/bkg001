'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuickFilter } from '../types/patient-page';
import { usePatientUrlState } from './usePatientUrlState';

interface UsePatientFiltersReturn {
  activeFilters: QuickFilter[];
  toggleFilter: (filter: QuickFilter) => void;
  clearFilters: () => void;
}

/**
 * Owns quick-filter state for the patient registry page.
 *
 * Local `activeFilters` is derived from URL params so it stays in sync
 * across navigation. All mutations propagate through the URL.
 */
export function usePatientFilters(): UsePatientFiltersReturn {
  const { createdToday, createdThisMonth, search, setFilter, clearAll } =
    usePatientUrlState();

  // Mirror URL → local so components receive a stable array reference.
  const [activeFilters, setActiveFilters] = useState<QuickFilter[]>(() => {
    const initial: QuickFilter[] = [];
    if (createdToday) initial.push('today');
    if (createdThisMonth) initial.push('thisMonth');
    return initial;
  });

  // Keep local state in sync when URL changes externally (e.g. browser back).
  useEffect(() => {
    const next: QuickFilter[] = [];
    if (createdToday) next.push('today');
    if (createdThisMonth) next.push('thisMonth');
    setActiveFilters(next);
  }, [createdToday, createdThisMonth]);

  const toggleFilter = useCallback(
    (filter: QuickFilter) => {
      const isActive = activeFilters.includes(filter);

      if (filter === 'today') {
        setFilter('createdToday', !isActive);
        if (!isActive) {
          // Activating "today" clears "thisMonth" to avoid conflicting filters.
          setFilter('createdThisMonth', false);
        }
      }

      if (filter === 'thisMonth') {
        setFilter('createdThisMonth', !isActive);
        if (!isActive) {
          setFilter('createdToday', false);
        }
      }
    },
    [activeFilters, setFilter],
  );

  const clearFilters = useCallback(() => {
    clearAll();
  }, [clearAll]);

  return { activeFilters, toggleFilter, clearFilters };
}
