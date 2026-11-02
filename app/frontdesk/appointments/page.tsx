'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { format, isBefore, startOfDay } from 'date-fns';
import { User, Loader2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAppointmentsPage } from '@/hooks/frontdesk/appointments/useAppointmentsPage';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
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
    setSelectedDate,
    refetch,
  } = useAppointmentsPage();

  const { openBookingDialog } = useBookAppointmentStore();
  const [pastVisitOpen, setPastVisitOpen] = useState(false);

  const viewingPastDay = isBefore(startOfDay(selectedDate), startOfDay(new Date()));

  const openBookForSelectedDate = () => {
    openBookingDialog({
      initialPatientId: patientIdFilter || undefined,
      initialDate: viewingPastDay ? undefined : format(selectedDate, 'yyyy-MM-dd'),
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.DASHBOARD,
    });
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      triggerAppointmentExpiry().catch(() => {
        // Background expiry — ignore failures
      });
    }
  }, [isAuthenticated, user]);

  if (authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#caa26a]" />
          <p className="text-sm text-[#e7d6bf]">Loading appointments…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="max-w-md border border-white/15 bg-[#2c2e4b]/70 p-8 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-[#caa26a]" />
          <h2 className="mb-2 text-xl font-semibold text-white">Authentication required</h2>
          <p className="mb-6 text-sm text-[#e7d6bf]">Please log in to manage appointments.</p>
          <Link href="/login">
            <Button className="h-10 rounded-md bg-[#caa26a] px-6 font-semibold text-[#2c2e4b] hover:bg-[#b8913e]">
              Return to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-8">
        <div className="max-w-md border border-[#9b2226]/40 bg-[#2c2e4b]/70 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-[#9b2226]/40 bg-[#9b2226]/15">
            <XCircle className="h-6 w-6 text-[#e7d6bf]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">Unable to load appointments</h2>
          <p className="mb-6 text-sm text-[#e7d6bf]">
            {error.message || 'A network error occurred. Please check your connection and try again.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="h-10 rounded-md border-white/25 bg-transparent px-5 text-[#e7d6bf] hover:bg-white/10 hover:text-white"
            >
              Refresh page
            </Button>
            <Button
              onClick={() => refetch()}
              className="h-10 rounded-md bg-[#caa26a] px-5 font-semibold text-[#2c2e4b] hover:bg-[#b8913e]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const patientNameFromFilter =
    patientIdFilter && filteredAppointments.length > 0
      ? `${filteredAppointments[0].patient?.firstName ?? ''} ${filteredAppointments[0].patient?.lastName ?? ''}`.trim()
      : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {patientIdFilter && (
        <PatientContextBanner
          patientIdFilter={patientIdFilter}
          filteredAppointments={filteredAppointments}
        />
      )}

      <AppointmentsHeader
        patientIdFilter={patientIdFilter}
        patientNameFromFilter={patientNameFromFilter}
        selectedDate={selectedDate}
        pastVisitOpen={pastVisitOpen}
        onPastVisitOpenChange={setPastVisitOpen}
        onPastVisitRecorded={(visitDate) => {
          setSelectedDate(visitDate);
          refetch();
        }}
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
        viewingPastDay={viewingPastDay}
        onBookAppointment={openBookForSelectedDate}
        onRecordPastVisit={() => setPastVisitOpen(true)}
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
    <div className="space-y-5">
      <div className="h-12 w-56 animate-pulse border border-white/10 bg-white/5" />
      <div className="h-16 animate-pulse border border-white/10 bg-white/5" />
      <div className="h-24 animate-pulse border border-white/10 bg-white/5" />
      <div className="space-y-0 border border-white/10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse border-b border-white/10 bg-white/5 last:border-b-0" />
        ))}
      </div>
    </div>
  );
}
