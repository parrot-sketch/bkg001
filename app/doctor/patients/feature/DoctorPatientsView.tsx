'use client';

import { useMemo } from 'react';
import { useDoctorPatientsController } from './DoctorPatientsProvider';
import { DoctorPatientsHeader } from './components/Header/DoctorPatientsHeader';
import { DoctorPatientsError } from './components/ErrorState/DoctorPatientsError';
import { DoctorPatientsSkeleton } from './components/LoadingState/DoctorPatientsSkeleton';
import { DoctorPatientsTable } from './components/Table/DoctorPatientsTable';
import { DoctorPatientsPagination } from './components/Pagination/DoctorPatientsPagination';
import { DoctorPatientsEmptyState } from './components/EmptyState/DoctorPatientsEmptyState';
import { PatientStats } from './components/Stats/PatientStats';
import { PatientFilters } from './components/Filters/PatientFilters';

export function DoctorPatientsView() {
  const controller = useDoctorPatientsController();

  const {
    isAuthenticated,
    user,
    patients,
    total,
    isLoading,
    isFetching,
    error,
    refetchPatients,
    filters,
    stats,
    filteredPatients,
    pagination,
    refreshing,
  } = controller;

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

  if (error) {
    return <DoctorPatientsError onRetry={refetchPatients} />;
  }

  const loading = isLoading || isFetching;

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-500">
      <DoctorPatientsHeader
        total={total}
        loading={isLoading}
        onRefresh={refetchPatients}
        refreshing={refreshing}
      />

      <PatientStats
        stats={stats}
        loading={isLoading}
        activeCard={filters.activeStatCard}
        onTotalFilter={filters.resetAll}
        onNewFilter={() => filters.setActiveStatCard(filters.activeStatCard === 'new' ? null : 'new')}
        onAllergyFilter={() =>
          filters.setActiveStatCard(filters.activeStatCard === 'allergies' ? null : 'allergies')
        }
        onConditionsFilter={() =>
          filters.setActiveStatCard(filters.activeStatCard === 'conditions' ? null : 'conditions')
        }
      />

      <PatientFilters
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        sortBy={filters.sortBy}
        onSortByChange={filters.setSortBy}
        sortOrder={filters.sortOrder}
        onSortOrderToggle={filters.toggleSortOrder}
        statusFilter={filters.statusFilter}
        onStatusChange={filters.setStatusFilter}
        allergiesOnly={filters.allergiesOnly}
        onAllergiesToggle={filters.toggleAllergiesOnly}
        resultCount={filteredPatients.length}
        total={total}
        loading={loading}
      />

      {isLoading ? (
        <DoctorPatientsSkeleton />
      ) : patients.length === 0 ? (
        <DoctorPatientsEmptyState
          mode={filters.searchQuery ? 'no-search' : 'no-patients'}
          statusFilter={filters.statusFilter}
          searchQuery={filters.searchQuery}
          onClearSearch={() => filters.setSearchQuery('')}
        />
      ) : filteredPatients.length === 0 ? (
        <DoctorPatientsEmptyState
          mode="no-filters"
          onClearFilters={() => {
            filters.toggleAllergiesOnly();
            filters.clearActiveStatCard();
          }}
        />
      ) : (
        <>
          <DoctorPatientsTable
            patients={filteredPatients}
            isFetching={isFetching}
            isLoading={isLoading}
            onClearFilters={() => {
              filters.toggleAllergiesOnly();
              filters.clearActiveStatCard();
            }}
          />

          <DoctorPatientsPagination
            total={total}
            page={pagination.page}
            totalPages={pagination.totalPages}
            start={pagination.start}
            end={pagination.end}
            loading={loading}
            onPrevious={pagination.previous}
            onNext={pagination.next}
            onPageChange={pagination.setPage}
          />
        </>
      )}
    </div>
  );
}
