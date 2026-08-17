'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PatientDrawer } from '@/components/frontdesk/PatientDrawer';
import { PatientRegistrationDialog } from '@/components/frontdesk/PatientRegistrationDialog';
import { PatientStats } from './components/PatientStats';
import { RecentPatients } from './components/RecentPatients';
import { PatientToolbar } from './components/PatientToolbar';
import { PatientTable } from './components/PatientTable';
import { PatientMobileList } from './components/PatientMobileList';
import { PatientLoadMore } from './components/PatientLoadMore';
import { PatientPagination } from './components/PatientPagination';
import { TableSkeleton } from './components/TableSkeleton';
import { EmptyState } from './components/EmptyState';
import { usePatientRegistry } from './hooks/usePatientRegistry';

/**
 * PatientsFeature — the client boundary and orchestration root for the
 * patient registry page.
 *
 * This component is intentionally declarative: it delegates all data fetching,
 * state management, URL sync, and business logic to `usePatientRegistry` and
 * its constituent hooks. The component itself contains zero business logic.
 */
export function PatientsFeature() {
  const {
    patients,
    stats,
    meta,
    isLoading,
    isFetching,
    isStatsLoading,
    isBrowseMode,
    hasActiveFilters,
    hasMore,
    limit,
    isSelectionMode,
    urlState,
    activeQuickFilters,
    toggleQuickFilter,
    currentPage,
    urlPage,
    loadMoreRef,
    handleLoadMore,
    drawerPatientId,
    drawerOpen,
    openDrawer,
    closeDrawer,
    handleDrawerNavigate,
    registrationOpen,
    openRegistration,
    closeRegistration,
    handleRegistrationSuccess,
    error,
    statsError,
  } = usePatientRegistry();

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <PatientStats
        stats={stats}
        isStatsLoading={isStatsLoading}
        isLoading={isLoading}
        displayedCount={patients.length}
        isBrowseMode={isBrowseMode}
        hasActiveFilters={hasActiveFilters}
        createdToday={urlState.createdToday}
        createdThisMonth={urlState.createdThisMonth}
        totalRecords={meta.totalRecords}
        onShowAll={urlState.clearAll}
        onShowToday={() => {
          urlState.clearAll();
          urlState.setFilter('createdToday', true);
        }}
        onShowThisMonth={() => {
          urlState.clearAll();
          urlState.setFilter('createdThisMonth', true);
        }}
        onShowResults={urlState.clearAll}
      />

      {/* ── Recently viewed ───────────────────────────────────────────── */}
      <RecentPatients onSelect={openDrawer} />

      {/* ── Main card ─────────────────────────────────────────────────── */}
      <Card className="border border-[#e7d6bf] bg-white shadow-sm">
        <PatientToolbar
          isSelectionMode={isSelectionMode}
          isBrowseMode={isBrowseMode}
          isFetching={isFetching}
          isLoading={isLoading}
          totalRecords={meta.totalRecords}
          hasActiveFilters={hasActiveFilters}
          activeQuickFilters={activeQuickFilters}
          onToggleFilter={toggleQuickFilter}
          onClearFilters={urlState.clearAll}
          onExitSelectionMode={urlState.exitSelectionMode}
          onSelectPatient={openDrawer}
          onOpenRegistration={openRegistration}
        />

        <CardContent className="p-0 min-h-[400px] flex flex-col">
          {(error || statsError) && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="h-14 w-14 rounded-xl border border-red-200 bg-red-50 flex items-center justify-center mb-4">
                <span className="text-red-500 text-xl">!</span>
              </div>
              <h3 className="text-sm font-semibold text-[#2c2e4b] mb-1">
                Unable to load patients
              </h3>
              <p className="text-xs text-[#2c2e4b]/50 text-center max-w-xs mb-5">
                {(error as Error)?.message || (statsError as Error)?.message || 'There was a problem loading the patient data. Please try again.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
              >
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <TableSkeleton />
          ) : patients.length === 0 ? (
            <EmptyState
              hasSearch={!!urlState.search}
              onClear={urlState.clearAll}
              onRegister={openRegistration}
            />
          ) : (
            <>
              {/* Desktop table */}
              <PatientTable patients={patients} onSelectPatient={openDrawer} />

              {/* Mobile list */}
              <PatientMobileList patients={patients} onSelectPatient={openDrawer} />

              {/* Browse mode: Load More */}
              {isBrowseMode && (
                <PatientLoadMore
                  hasMore={hasMore}
                  loading={isFetching && currentPage > 1}
                  onLoadMore={handleLoadMore}
                  sentinelRef={loadMoreRef}
                />
              )}

              {/* Search / filter mode: page pagination */}
              {!isBrowseMode && !isLoading && meta.totalPages > 1 && (
                <PatientPagination
                  meta={meta}
                  currentPage={urlPage}
                  limit={limit}
                  onPageChange={urlState.setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs & drawers ─────────────────────────────────────────── */}
      <PatientRegistrationDialog
        open={registrationOpen}
        onClose={closeRegistration}
        onSuccess={handleRegistrationSuccess}
      />

      <PatientDrawer
        patientId={drawerPatientId}
        open={drawerOpen}
        onOpenChange={(open) => !open && closeDrawer()}
        onNavigate={handleDrawerNavigate}
      />
    </div>
  );
}
