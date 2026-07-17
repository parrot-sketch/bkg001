'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorPatients } from '@/hooks/doctor/useDoctorPatients';
import { useDoctorPatientsFilters } from './hooks/useDoctorPatientsFilters';
import { useDoctorPatientsStats } from './hooks/useDoctorPatientsStats';
import { useDoctorPatientsFiltered } from './hooks/useDoctorPatientsFiltered';
import { useDoctorPatientsPagination } from './hooks/useDoctorPatientsPagination';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

const PAGE_SIZE = 15;

interface DoctorPatientsContextValue {
  // Auth
  user: ReturnType<typeof useAuth>['user'];
  isAuthenticated: ReturnType<typeof useAuth>['isAuthenticated'];

  // Query
  patients: PatientResponseDto[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetchPatients: () => Promise<unknown>;

  // Filters
  filters: ReturnType<typeof useDoctorPatientsFilters>;

  // Stats
  stats: ReturnType<typeof useDoctorPatientsStats>;

  // Filtered
  filteredPatients: PatientResponseDto[];

  // Pagination
  pagination: ReturnType<typeof useDoctorPatientsPagination>;

  // UI
  refreshing: boolean;
  setRefreshing: (v: boolean) => void;
}

const DoctorPatientsContext = createContext<DoctorPatientsContextValue | null>(null);

export function useDoctorPatientsController() {
  const ctx = useContext(DoctorPatientsContext);
  if (!ctx) {
    throw new Error('useDoctorPatientsController must be used within DoctorPatientsProvider');
  }
  return ctx;
}

interface DoctorPatientsProviderProps {
  children: React.ReactNode;
}

export function DoctorPatientsProvider({ children }: DoctorPatientsProviderProps) {
  const { user, isAuthenticated } = useAuth();

  const filters = useDoctorPatientsFilters();
  const [refreshing, setRefreshing] = useState(false);

  const query = useDoctorPatients(!!user, {
    status: filters.statusFilter,
    skip: 0,
    take: PAGE_SIZE,
    search: filters.searchQuery || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const patients = query.data?.patients ?? [];
  const total = query.data?.total ?? 0;

  const stats = useDoctorPatientsStats(patients, total);
  const { filteredPatients } = useDoctorPatientsFiltered(patients, filters.allergiesOnly, filters.activeStatCard);

  const paginationBase = useDoctorPatientsPagination(total, PAGE_SIZE);

  const pagination = useMemo(() => ({
    ...paginationBase,
    setPage: (p: number) => {
      const clamped = Math.max(1, Math.min(paginationBase.totalPages, p));
      paginationBase.setPage(clamped);
    },
  }), [paginationBase]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query.refetch]);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    patients,
    total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetchPatients: handleRefresh,
    filters,
    stats,
    filteredPatients,
    pagination,
    refreshing,
    setRefreshing,
  }), [
    user,
    isAuthenticated,
    patients,
    total,
    query.isLoading,
    query.isFetching,
    query.error,
    handleRefresh,
    filters,
    stats,
    filteredPatients,
    pagination,
    refreshing,
  ]);

  return (
    <DoctorPatientsContext.Provider value={value}>
      {children}
    </DoctorPatientsContext.Provider>
  );
}
