'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { User, Loader2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAppointmentsPage } from '@/hooks/frontdesk/appointments/useAppointmentsPage';
import { AppointmentsHeader } from './components/AppointmentsHeader';
import { AppointmentsPipeline } from './components/AppointmentsPipeline';
import { AppointmentsFilterBar } from './components/AppointmentsFilterBar';
import { AppointmentsList } from './components/AppointmentsList';
import { PatientContextBanner } from './components/PatientContextBanner';
import { triggerAppointmentExpiry } from '@/app/actions/appointment-expiry';

export default function FrontdeskAppointmentsPage(): React.ReactElement {
  return (
    <ErrorBoundary>
      <Suspense fallback={<AppointmentsPageSkeleton />}>
        <FrontdeskAppointmentsContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function FrontdeskAppointmentsContent(): React.ReactElement {
  const {
    user,
    isAuthenticated,
    authLoading,
    selectedDate,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredAppointments,
    loading,
    error,
    isRefetching,
    pipelineStats,
    statusCounts,
    handleNavigateDate,
    handleGoToToday,
    dateLabel,
    patientIdFilter,
    highlightedId,
    refetch,
  } = useAppointmentsPage();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Fire and forget - don't block UI or show errors for background expiry check
      triggerAppointmentExpiry().catch(() => {
        // Silently fail - expiry check is a background operation
      });
    }
  }, [isAuthenticated, user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#caa26a] mx-auto" />
          <p className="text-sm text-[#2c2e4b]/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-[#e7d6bf] max-w-md">
          <User className="h-12 w-12 text-[#caa26a]/60 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2c2e4b] mb-2">Authentication Required</h2>
          <p className="text-sm text-[#2c2e4b]/60 mb-6">Please log in to manage appointments.</p>
          <Link href="/login">
            <Button className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-semibold rounded-lg shadow-sm h-10 px-6">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error state UI
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-red-200 max-w-md">
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#2c2e4b] mb-2">Unable to Load Appointments</h2>
          <p className="text-sm text-[#2c2e4b]/60 mb-6">
            {error.message || 'A network error occurred. Please check your connection and try again.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 hover:border-[#caa26a]/60 h-10 px-5"
            >
              Refresh Page
            </Button>
            <Button
              onClick={() => refetch()}
              className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-semibold rounded-lg shadow-sm h-10 px-5"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const patientNameFromFilter = patientIdFilter && filteredAppointments.length > 0
    ? `${filteredAppointments[0].patient?.firstName ?? ''} ${filteredAppointments[0].patient?.lastName ?? ''}`.trim()
    : null;

  return (
    <div className="px-4 sm:px-6 py-4 space-y-5 animate-in fade-in duration-500">
      {patientIdFilter && (
        <PatientContextBanner 
          patientIdFilter={patientIdFilter} 
          filteredAppointments={filteredAppointments} 
        />
      )}

      <AppointmentsHeader 
        patientIdFilter={patientIdFilter} 
        patientNameFromFilter={patientNameFromFilter} 
      />

      <AppointmentsPipeline 
        pipelineStats={pipelineStats} 
        onStatusClick={setStatusFilter}
        activeStatusFilter={statusFilter}
      />

      <AppointmentsFilterBar 
        selectedDate={selectedDate}
        dateLabel={dateLabel}
        handleNavigateDate={handleNavigateDate}
        handleGoToToday={handleGoToToday}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statusCounts={statusCounts}
        isRefetching={isRefetching}
      />

      <AppointmentsList 
        loading={loading}
        filteredAppointments={filteredAppointments}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        dateLabel={dateLabel}
        highlightedId={highlightedId}
        onClearFilters={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
        }}
      />
    </div>
  );
}

function AppointmentsPageSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="h-12 w-48 bg-[#e7d6bf]/10 border border-[#e7d6bf]/30 rounded-xl animate-pulse" />
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-[#e7d6bf]/10 border border-[#e7d6bf]/30 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-24 bg-[#e7d6bf]/10 border border-[#e7d6bf]/30 rounded-2xl animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#e7d6bf]/10 border border-[#e7d6bf]/30 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
