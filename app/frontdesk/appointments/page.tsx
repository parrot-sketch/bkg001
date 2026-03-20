'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { User, Loader2 } from 'lucide-react';
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
    isRefetching,
    pipelineStats,
    statusCounts,
    handleNavigateDate,
    handleGoToToday,
    dateLabel,
    patientIdFilter,
    highlightedId,
  } = useAppointmentsPage();

  useEffect(() => {
    if (isAuthenticated && user) {
      triggerAppointmentExpiry().catch(console.error);
    }
  }, [isAuthenticated, user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-100 max-w-md">
          <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-500 mb-6">Please log in to manage appointments.</p>
          <Link href="/login">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const patientNameFromFilter = patientIdFilter && filteredAppointments.length > 0
    ? `${filteredAppointments[0].patient?.firstName ?? ''} ${filteredAppointments[0].patient?.lastName ?? ''}`.trim()
    : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
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

      <AppointmentsPipeline pipelineStats={pipelineStats} />

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
      <div className="h-12 w-48 bg-slate-100 rounded-xl animate-pulse" />
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
