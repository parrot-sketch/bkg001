'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/constants/queryKeys';
import { ScheduleProcedureDialog } from '@/components/frontdesk/ScheduleProcedureDialog';
import { useTheaterTechPatientUrlState } from './useTheaterTechPatientUrlState';
import { usePatientFilters } from './usePatientFilters';
import { usePatientDrawer } from '@/app/frontdesk/patients/_feature/hooks/usePatientDrawer';
import { usePatientRegistration } from '@/app/frontdesk/patients/_feature/hooks/usePatientRegistration';
import { BATCH_SIZE, SEARCH_BATCH_SIZE } from '../constants/pagination';
import type { PatientRegistryDto, PatientListMeta } from '../types/patient-page';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

const DEFAULT_META: PatientListMeta = {
  totalRecords: 0,
  totalPages: 1,
  currentPage: 1,
  limit: BATCH_SIZE,
};

export function useTheaterTechPatientRegistry() {
  const urlState = useTheaterTechPatientUrlState();
  const { search, createdToday, createdThisMonth } = urlState;

  const isBrowseMode = !search && !createdToday && !createdThisMonth;
  const limit = isBrowseMode ? BATCH_SIZE : SEARCH_BATCH_SIZE;
  const hasActiveFilters = !!(search || createdToday || createdThisMonth);

  const { activeFilters: activeQuickFilters, toggleFilter: toggleQuickFilter } =
    usePatientFilters();

  const drawer = usePatientDrawer();
  const router = useRouter();
  const [schedulePatient, setSchedulePatient] = useState<PatientResponseDto | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const openScheduleForPatient = useCallback((patient: PatientResponseDto) => {
    setSchedulePatient(patient);
    setScheduleOpen(true);
  }, []);

  const registration = usePatientRegistration({
    queryKeyPrefix: 'theater-tech',
    onPatientRegistered: (patient) => {
      drawer.openDrawer(patient.id);
      toast.success(`Registered ${patient.firstName} ${patient.lastName}. Schedule a procedure?`, {
        action: {
          label: 'Schedule now',
          onClick: () => openScheduleForPatient(patient),
        },
      });
    },
  });

  const [accumulatedPatients, setAccumulatedPatients] = useState<PatientRegistryDto[]>([]);
  const [browseCurrentPage, setBrowseCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const resetKey = `${search}|${createdToday}|${createdThisMonth}`;
  useEffect(() => {
    setAccumulatedPatients([]);
    setBrowseCurrentPage(1);
    setHasMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const { data: listResult, isLoading, isFetching, error: listError } = useQuery({
    queryKey: ['theater-tech', 'patients', { page: isBrowseMode ? browseCurrentPage : urlState.page, limit, search, createdToday, createdThisMonth }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (isBrowseMode ? browseCurrentPage : urlState.page).toString(),
        limit: limit.toString(),
      });
      if (search) params.set('q', search);
      if (createdToday) params.set('createdToday', 'true');
      if (createdThisMonth) params.set('createdThisMonth', 'true');

      const result = await apiClient.get(`/theater-tech/patients?${params.toString()}`);

      if (!result.success) {
        throw new Error(result.error);
      }

      const raw = result as unknown as {
        data: PatientRegistryDto[];
        meta: PatientListMeta;
      };

      return {
        data: raw.data,
        meta: raw.meta,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

  const { data: stats, isLoading: isStatsLoading, error: statsError } = useQuery({
    queryKey: ['theater-tech', 'patient-stats'],
    queryFn: async () => {
      const result = await apiClient.get('/theater-tech/patients/stats');
      if (!result.success) throw new Error(result.error);
      return result.data as { totalRecords: number; newToday: number; newThisMonth: number };
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

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

  const meta = listResult?.meta ?? DEFAULT_META;

  return {
    patients,
    stats,
    meta,
    isLoading,
    isFetching,
    isStatsLoading,
    error: listError,
    statsError,
    isBrowseMode,
    hasActiveFilters,
    hasMore,
    limit,
    urlState,
    activeQuickFilters,
    toggleQuickFilter,
    currentPage: browseCurrentPage,
    loadMoreRef,
    handleLoadMore,
    drawerPatientId: drawer.patientId,
    drawerOpen: drawer.isOpen,
    openDrawer: drawer.openDrawer,
    closeDrawer: drawer.closeDrawer,
    registrationOpen: registration.isOpen,
    openRegistration: registration.openDialog,
    closeRegistration: registration.closeDialog,
    handleRegistrationSuccess: registration.handleSuccess,
    scheduleDialog: (
      <ScheduleProcedureDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        initialPatient={schedulePatient}
        onSuccess={(data) => {
          setScheduleOpen(false);
          setSchedulePatient(null);
          toast.success(`Scheduled case for ${data.patientName}`);
          router.push(`/theater-tech/surgical-cases/${data.surgicalCaseId}`);
        }}
      />
    ),
  };
}
