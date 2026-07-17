'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SortKey, SortOrder, StatusFilter } from '../components/Filters/PatientFilters';
import type { ActiveStatCardType } from '../components/Stats/PatientStats';

export interface DoctorPatientsFilters {
  searchQuery: string;
  sortBy: SortKey;
  sortOrder: SortOrder;
  statusFilter: StatusFilter;
  allergiesOnly: boolean;
  activeStatCard: ActiveStatCardType;
}

export interface DoctorPatientsFiltersApi extends DoctorPatientsFilters {
  setSearchQuery: (value: string) => void;
  setSortBy: (key: SortKey) => void;
  toggleSortOrder: () => void;
  setStatusFilter: (key: StatusFilter) => void;
  toggleAllergiesOnly: () => void;
  setActiveStatCard: (card: ActiveStatCardType) => void;
  resetAll: () => void;
  clearActiveStatCard: () => void;
}

const PAGE_SIZE = 15;

export function useDoctorPatientsFilters(): DoctorPatientsFiltersApi {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('assignedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [allergiesOnly, setAllergiesOnly] = useState(false);
  const [activeStatCard, setActiveStatCard] = useState<ActiveStatCardType>(null);

  useEffect(() => {
    setActiveStatCard(null);
  }, [searchQuery, sortBy, sortOrder, statusFilter]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const toggleAllergiesOnly = useCallback(() => {
    setAllergiesOnly((prev) => !prev);
    setActiveStatCard(null);
  }, []);

  const resetAll = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ACTIVE');
    setAllergiesOnly(false);
    setActiveStatCard(null);
  }, []);

  const clearActiveStatCard = useCallback(() => {
    setActiveStatCard(null);
  }, []);

  return {
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    allergiesOnly,
    activeStatCard,
    setSearchQuery,
    setSortBy,
    toggleSortOrder,
    setStatusFilter,
    toggleAllergiesOnly,
    setActiveStatCard,
    resetAll,
    clearActiveStatCard,
  };
}
