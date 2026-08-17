'use client';

/**
 * Doctor Patients Page
 *
 * Minimal orchestration layer. All data logic is extracted into hooks,
 * and all presentation is delegated to pure components.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorPatients } from '@/hooks/doctor/useDoctorPatients';
import { useQueuedPatients } from '@/hooks/doctor/useQueuedPatients';
import type { DoctorPatientSortBy, DoctorPatientSortOrder } from '@/hooks/doctor/useDoctorPatients';
import type { QueueSortBy, QueueSortOrder } from '@/hooks/doctor/useQueuedPatients';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isThisMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';

// Modular Components
import { PatientRow } from './components/PatientRow';
import { PatientStats } from './components/PatientStats';
import type { ActiveStatCardType } from './components/PatientStats';
import { PatientFilters } from './components/PatientFilters';
import type { SortKey, SortOrder, StatusFilter } from './components/PatientFilters';
import { DoctorPatientsTable } from './components/DoctorPatientsTable';
import { QueuePatientsView } from './components/QueuePatientsView';

const PAGE_SIZE = 15;
const QUEUE_PAGE_SIZE = 20;

export default function DoctorPatientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState('');
  const [sortBy,         setSortBy]         = useState<SortKey>('assignedAt');
  const [sortOrder,      setSortOrder]      = useState<SortOrder>('desc');
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('ACTIVE');
  const [allergiesOnly,  setAllergiesOnly]  = useState(false);
  const [activeStatCard, setActiveStatCard] = useState<ActiveStatCardType>(null);
  const [page,           setPage]           = useState(1);
  const [refreshing,     setRefreshing]     = useState(false);

  // ── Queue-specific state ────────────────────────────────────────────────────
  const [queuePage,       setQueuePage]       = useState(1);
  const [queueDate,       setQueueDate]       = useState(() => new Date().toISOString().split('T')[0]);

  // ── Server-side data: regular patients ──────────────────────────────────────
  const {
    data: patientsData,
    isLoading,
    isFetching,
    error: patientsError,
    refetch: refetchPatients,
  } = useDoctorPatients(!!user && statusFilter !== 'QUEUED', {
    status:    statusFilter === 'QUEUED' ? 'ACTIVE' : statusFilter,
    skip:      (page - 1) * PAGE_SIZE,
    take:      PAGE_SIZE,
    search:    searchQuery,
    sortBy:    sortBy as DoctorPatientSortBy,
    sortOrder: sortBy === 'name'
      ? (sortOrder as DoctorPatientSortOrder)
      : 'desc',
  });

  const patients = patientsData?.patients ?? [];
  const total    = patientsData?.total    ?? 0;

  // ── Queue data: QUEUED tab ───────────────────────────────────────────────────
  const {
    displayQueue,
    isLoadingQueued,
    total: queueTotal,
    totalPages: queueTotalPages,
    page: queueCurrentPage,
  } = useQueuedPatients({
    enabled: statusFilter === 'QUEUED' && !!user,
    date: statusFilter === 'QUEUED' ? queueDate : undefined,
    searchQuery: statusFilter === 'QUEUED' ? searchQuery : '',
    sortBy: (sortBy === 'name' ? 'name' : 'waitTime') as QueueSortBy,
    sortOrder: sortOrder as QueueSortOrder,
    page: queuePage,
    pageSize: QUEUE_PAGE_SIZE,
  });

  // ── Derived state ───────────────────────────────────────────────────────────
  const loading = isLoading || isFetching;

  const filteredPatients = useMemo(() => {
    if (statusFilter === 'QUEUED') return displayQueue;
    let list = [...patients];

    if (activeStatCard === 'new') {
      list = list.filter((p) => p.assignedAt && isThisMonth(new Date(p.assignedAt)));
    } else if (allergiesOnly || activeStatCard === 'allergies') {
      list = list.filter((p) => p.allergies?.trim());
    } else if (activeStatCard === 'conditions') {
      list = list.filter((p) => p.medicalConditions?.trim());
    }

    return list;
  }, [patients, displayQueue, statusFilter, allergiesOnly, activeStatCard]);

  const displayTotal = statusFilter === 'QUEUED' ? queueTotal : total;

  const stats = useMemo(() => {
    if (statusFilter === 'QUEUED') {
      return {
        total: queueTotal,
        newThisMonth: 0,
        withAllergies: 0,
        withConditions: 0,
      };
    }
    const roster = filteredPatients as PatientResponseDto[];
    const newThisMonth  = roster.filter((p) => p.assignedAt && isThisMonth(new Date(p.assignedAt))).length;
    const withAllergies = roster.filter((p) => p.allergies?.trim()).length;
    const withConditions = roster.filter((p) => p.medicalConditions?.trim()).length;
    return { total: displayTotal, newThisMonth, withAllergies, withConditions };
  }, [filteredPatients, displayTotal, statusFilter, queueTotal]);

  const totalPages = statusFilter === 'QUEUED' ? queueTotalPages : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start      = displayTotal === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, displayTotal);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setQueuePage(1);
  }, [statusFilter, allergiesOnly, searchQuery, sortBy, sortOrder, queueDate]);

  useEffect(() => {
    if (statusFilter !== 'QUEUED') {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.queue('patients-page') });
    }
  }, [statusFilter, queryClient]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchPatients();
    setRefreshing(false);
  };

  const handleNewConsultation = useCallback((patientId: string) => {
    router.push(`/doctor/consultations/new?patientId=${patientId}`);
  }, [router]);

  const handleOpenQueuedPatient = useCallback((appointmentId: number, status: string) => {
    router.push(`/doctor/consultations/session/${appointmentId}?start=true`);
  }, [router]);

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const handleTotalFilter = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ACTIVE');
    setAllergiesOnly(false);
    setActiveStatCard(null);
    setQueueDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleNewFilter = useCallback(() => {
    setActiveStatCard((prev) => (prev === 'new' ? null : 'new'));
  }, []);

  const handleAllergyFilter = useCallback(() => {
    setActiveStatCard((prev) => (prev === 'allergies' ? null : 'allergies'));
    setAllergiesOnly(false);
  }, []);

  const handleConditionsFilter = useCallback(() => {
    setActiveStatCard((prev) => (prev === 'conditions' ? null : 'conditions'));
  }, []);

  const handleAllergiesToggle = useCallback(() => {
    setAllergiesOnly((prev) => !prev);
    setActiveStatCard(null);
  }, []);

  const handleQueuePageChange = useCallback((newPage: number) => {
    setQueuePage(newPage);
  }, []);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 bg-[#e7d6bf] animate-pulse mx-auto" />
          <p className="text-sm text-[#2c2e4b]/60">Authenticating…</p>
        </div>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-full max-w-md border border-[#e7d6bf] bg-white p-6 text-center">
            <p className="text-sm font-semibold text-[#2c2e4b]">Unable to load patient roster</p>
            <p className="text-xs text-[#2c2e4b]/60 mt-1">Please retry.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-[#e7d6bf] text-[#2c2e4b]"
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-white">My Patients</h1>
          {!isLoading && (
            <p className="text-xs text-white/60 mt-0.5">
              {statusFilter === 'QUEUED'
                ? `${queueTotal} patient${queueTotal !== 1 ? 's' : ''} in queue`
                : `${total} patient${total !== 1 ? 's' : ''} in your roster`}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs self-start sm:self-auto border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <PatientStats
        stats={stats}
        loading={isLoading}
        activeCard={activeStatCard}
        onTotalFilter={handleTotalFilter}
        onNewFilter={handleNewFilter}
        onAllergyFilter={handleAllergyFilter}
        onConditionsFilter={handleConditionsFilter}
      />

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <PatientFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderToggle={handleSortOrderToggle}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        allergiesOnly={allergiesOnly}
        onAllergiesToggle={handleAllergiesToggle}
        resultCount={filteredPatients.length}
        total={displayTotal}
        loading={loading}
      />

      {/* ── Patient List ────────────────────────────────────────────────────── */}
      {statusFilter === 'QUEUED' ? (
        <QueuePatientsView
          queue={displayQueue}
          isLoading={isLoadingQueued}
          total={queueTotal}
          totalPages={queueTotalPages}
          currentPage={queueCurrentPage}
          onPageChange={handleQueuePageChange}
          onOpenPatient={handleOpenQueuedPatient}
          onNewConsultation={handleNewConsultation}
          selectedDate={queueDate}
          onDateChange={setQueueDate}
        />
      ) : (
        <DoctorPatientsTable
          patients={patients}
          isLoading={isLoading}
          onNewConsultation={handleNewConsultation}
        />
      )}

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {displayTotal > PAGE_SIZE && statusFilter !== 'QUEUED' && (
        <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/5 px-4 py-2.5">
          <span className="text-xs text-white/80 tabular-nums">
            Showing {start}–{end} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs text-white border-white/20 bg-white/5 hover:bg-white/10 gap-1"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>

            <div className="flex items-center gap-0.5 px-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                const nearCurrent = Math.abs(p - page) <= 1;
                const isEdge = p === 1 || p === totalPages;
                if (!nearCurrent && !isEdge) {
                  if (p === 2 || p === totalPages - 1) {
                    return <span key={p} className="text-white/50 text-xs px-1">…</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    disabled={loading}
                    className={`h-7 min-w-[28px] px-1.5 text-xs font-medium transition-colors duration-150 ${
                      p === page
                        ? 'bg-[#caa26a] text-[#2c2e4b]'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs text-white border-white/20 bg-white/5 hover:bg-white/10 gap-1"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
