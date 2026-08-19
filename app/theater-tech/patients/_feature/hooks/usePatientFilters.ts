'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuickFilter } from '../types/patient-page';
import { useTheaterTechPatientUrlState } from './useTheaterTechPatientUrlState';

interface UsePatientFiltersReturn {
  activeFilters: QuickFilter[];
  toggleFilter: (filter: QuickFilter) => void;
  clearFilters: () => void;
}

export function usePatientFilters(): UsePatientFiltersReturn {
  const { createdToday, createdThisMonth, setFilter, clearAll } =
    useTheaterTechPatientUrlState();

  const [activeFilters, setActiveFilters] = useState<QuickFilter[]>(() => {
    const initial: QuickFilter[] = [];
    if (createdToday) initial.push('today');
    if (createdThisMonth) initial.push('thisMonth');
    return initial;
  });

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
