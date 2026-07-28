'use client';

/**
 * Doctor Patients Page
 *
 * Purpose-built patient roster for the doctor's clinical context.
 *
 * Architecture:
 * - All filtering, searching, and primary sorting is server-side (pushed into
 *   useDoctorPatients → API route). The client never searches a page slice.
 * - Allergies-only is a lightweight in-memory filter on the current page.
 * - Pagination is server-driven (skip/take) with accurate total count.
 * - Visit decoration (lastVisitDate, visitCount) comes from the API directly
 *   — no second useDoctorAppointments call needed on this page.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorPatients } from '@/hooks/doctor/useDoctorPatients';
import type { DoctorPatientSortBy, DoctorPatientSortOrder } from '@/hooks/doctor/useDoctorPatients';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isThisMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Modular Components
import { PatientRow }     from './components/PatientRow';
import { PatientStats }   from './components/PatientStats';
import type { ActiveStatCardType } from './components/PatientStats';
import { PatientFilters } from './components/PatientFilters';
import type { SortKey, SortOrder, StatusFilter } from './components/PatientFilters';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 15;

// ============================================================================
// PAGE
// ============================================================================

export default function DoctorPatientsPage() {
  const router = useRouter();
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

  // ── Server-side data ────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetching,
    error: patientsError,
    refetch: refetchPatients,
  } = useDoctorPatients(!!user, {
    status:    statusFilter,
    skip:      (page - 1) * PAGE_SIZE,
    take:      PAGE_SIZE,
    search:    searchQuery,
    sortBy:    sortBy as DoctorPatientSortBy,
    sortOrder: sortOrder as DoctorPatientSortOrder,
  });

  const patients = data?.patients ?? [];
  const total    = data?.total    ?? 0;

  const loading = isLoading || isFetching;

  // ── Reset to page 1 on filter / search / sort changes ──────────────────────
  useEffect(() => {
    setPage(1);
  }, [statusFilter, allergiesOnly, searchQuery, sortBy, sortOrder]);

  // ── Stats — derived from full roster context ────────────────────────────────
  // newThisMonth counts within the current page (all we have client-side);
  // total, withAllergies, withConditions reference the full-page slice totals.
  // For an accurate cross-page newThisMonth we would need a stats endpoint —
  // acceptable trade-off for now (same as frontdesk registry approach).
  const stats = useMemo(() => {
    const newThisMonth  = patients.filter(
      (p) => p.assignedAt && isThisMonth(new Date(p.assignedAt))
    ).length;
    const withAllergies  = patients.filter((p) => p.allergies?.trim()).length;
    const withConditions = patients.filter((p) => p.medicalConditions?.trim()).length;
    return { total, newThisMonth, withAllergies, withConditions };
  }, [patients, total]);

  // ── Allergies / conditions/new in-memory filter (applied to current page only) ─
  const filteredPatients = useMemo(() => {
    let list = [...patients];

    if (activeStatCard === 'new') {
      list = list.filter((p) => p.assignedAt && isThisMonth(new Date(p.assignedAt)));
    } else if (allergiesOnly || activeStatCard === 'allergies') {
      list = list.filter((p) => p.allergies?.trim());
    } else if (activeStatCard === 'conditions') {
      list = list.filter((p) => p.medicalConditions?.trim());
    }

    return list;
  }, [patients, allergiesOnly, activeStatCard]);

  // ── Pagination math ─────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start      = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, total);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchPatients();
    setRefreshing(false);
  };

  const handleNewConsultation = useCallback((patientId: string) => {
    router.push(`/doctor/consultations/new?patientId=${patientId}`);
  }, [router]);

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const handleTotalFilter = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ACTIVE');
    setAllergiesOnly(false);
    setActiveStatCard(null);
  }, []);

  const handleNewFilter = useCallback(() => {
    setActiveStatCard((prev) => (prev === 'new' ? null : 'new'));
  }, []);

  const handleAllergyFilter = useCallback(() => {
    setActiveStatCard((prev) => (prev === 'allergies' ? null : 'allergies'));
    setAllergiesOnly(false); // stat card takes precedence
  }, []);

  const handleConditionsFilter = useCallback(() => {
    setActiveStatCard((prev) => (prev === 'conditions' ? null : 'conditions'));
  }, []);

  const handleAllergiesToggle = useCallback(() => {
    setAllergiesOnly((prev) => !prev);
    setActiveStatCard(null); // clear stat card shortcut when using the toggle
  }, []);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 bg-[#e7d6bf] rounded-full mx-auto animate-pulse" />
          <p className="text-sm text-[#2c2e4b]/60">Authenticating…</p>
        </div>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-full max-w-md border border-[#e7d6bf] bg-white p-6 text-center rounded-xl">
            <p className="text-sm font-semibold text-[#2c2e4b]">Unable to load patient roster</p>
            <p className="text-xs text-[#2c2e4b]/60 mt-1">Please retry.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
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
            <p className="text-xs text-white/40 mt-0.5">
              {total} patient{total !== 1 ? 's' : ''} in your roster
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs self-start sm:self-auto rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5"
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
        total={total}
        loading={loading}
      />

      {/* ── Patient List ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white border border-[#e7d6bf] rounded-lg">
              <Skeleton className="h-9 w-9 rounded-lg bg-[#e7d6bf]/30" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-44 bg-[#e7d6bf]/30" />
                <Skeleton className="h-3 w-28 bg-[#e7d6bf]/30" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg bg-[#e7d6bf]/30" />
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e7d6bf] rounded-xl">
          <h3 className="text-sm font-semibold text-[#2c2e4b]">
            {searchQuery
              ? 'No patients match your search'
              : statusFilter === 'ALL'
                ? 'No patients on record'
                : `No ${statusFilter.toLowerCase()} patients`}
          </h3>
          <p className="text-xs text-[#2c2e4b]/60 max-w-xs text-center mt-1">
            {searchQuery
              ? 'Try a different name, file number, or phone number.'
              : statusFilter === 'ACTIVE'
                ? 'Patients appear here once assigned to your active care.'
                : 'Try switching the status filter above.'}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e7d6bf] rounded-xl">
          <h3 className="text-sm font-semibold text-[#2c2e4b]">No patients match your filters</h3>
          <p className="text-xs text-[#2c2e4b]/60 max-w-xs text-center mt-1">
            Clear the active filter to see the full page.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
            onClick={() => { setAllergiesOnly(false); setActiveStatCard(null); }}
          >
            Clear filter
          </Button>
        </div>
      ) : (
        <>
          {/* ── Table ──────────────────────────────────────────────────────── */}
          <div className="border border-[#e7d6bf] bg-white overflow-hidden rounded-xl">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60 border-b border-[#e7d6bf]">
              <div className="col-span-4">Patient</div>
              <div className="col-span-2">File</div>
              <div className="col-span-2">Phone</div>
              <div className="col-span-2">Last visit</div>
              <div className="col-span-1">Visits</div>
              <div className="col-span-1">Flags</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Subtle fetch overlay */}
            {isFetching && !isLoading && (
              <div className="h-0.5 bg-[#caa26a]/40 animate-pulse" />
            )}

            <div className="divide-y divide-[#e7d6bf]">
              {filteredPatients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  onNewConsultation={handleNewConsultation}
                />
              ))}
            </div>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────────── */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 border border-white/10 bg-white/5 rounded-xl px-4 py-2.5">
              <span className="text-xs text-white/60 tabular-nums">
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

                {/* Page number pills */}
                <div className="flex items-center gap-0.5 px-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    // Show first, last, and pages around current
                    const p = i + 1;
                    const nearCurrent = Math.abs(p - page) <= 1;
                    const isEdge      = p === 1 || p === totalPages;
                    if (!nearCurrent && !isEdge) {
                      if (p === 2 || p === totalPages - 1) {
                        return <span key={p} className="text-white/30 text-xs px-1">…</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        disabled={loading}
                        className={`h-7 min-w-[28px] px-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                          p === page
                            ? 'bg-[#caa26a] text-[#2c2e4b]'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
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
        </>
      )}
    </div>
  );
}
