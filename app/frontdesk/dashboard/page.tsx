'use client';

/**
 * Frontdesk Dashboard Page
 * 
 * Primary surface for frontdesk staff.
 * Layout:
 * - Quick Assignment Banner (primary action)
 * - Pipeline Cards (live status counters)
 * - Today's Schedule (main workflow)
 * - Queue Management Panels (doctor assignments)
 * - Quick Actions (shortcuts)
 * - Alerts (pending intakes)
 * 
 * Uses useFrontdeskDashboard hook for all data - single source of truth.
 */

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { TodaysSchedule } from '@/components/frontdesk/TodaysSchedule';
import { QueueManagementPanels } from '@/components/frontdesk/QueueManagementPanels';
import { QuickAssignmentDialog } from '@/components/frontdesk/QuickAssignmentDialog';
import { PipelineCard } from '@/components/frontdesk/PipelineCard';
import { QuickActionBtn } from '@/components/frontdesk/QuickActionBtn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFrontdeskDashboard, useDashboardStats } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { triggerAppointmentExpiry } from '@/app/actions/appointment-expiry';
import {
  Calendar,
  Clock,
  QrCode,
  FileText,
  Users,
  ArrowRight,
  Activity,
  ClipboardList,
  Building2,
  Stethoscope,
  CheckCircle2,
  Plus,
  XCircle,
  RefreshCw,
} from 'lucide-react';



// ─── Main Component ─────────────────────────────────────────

export default function FrontdeskDashboardPage(): React.ReactElement {
  const { stats, isLoading, error, refetch } = useFrontdeskDashboard();
  const { openBookingDialog } = useBookAppointmentStore();
  const [quickAssignmentOpen, setQuickAssignmentOpen] = useState<boolean>(false);

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-100 max-w-md">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-sm text-slate-500 mb-6">
            {error.message || 'A network error occurred. Please check your connection and try again.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="rounded-xl"
            >
              Refresh Page
            </Button>
            <Button
              onClick={() => refetch()}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle appointment expiry check on mount
  const handleExpiryCheck = useCallback(async (): Promise<void> => {
    try {
      await triggerAppointmentExpiry();
      // Silently fail - expiry is a background operation
    } catch {
      // Ignore errors from background expiry check
    }
  }, []);

  useEffect(() => {
    handleExpiryCheck();
  }, [handleExpiryCheck]);

  // Handlers
  const handleOpenBooking = useCallback((): void => {
    openBookingDialog({
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.DASHBOARD,
    });
  }, [openBookingDialog]);

  const pipelineData = [
    { label: 'Arriving Today', value: stats.pendingCheckIns, icon: Calendar },
    { label: 'In Waiting Room', value: stats.checkedInPatients, icon: Clock },
    { label: 'In Consultation', value: stats.inConsultation, icon: Stethoscope },
    { label: 'Completed Today', value: stats.completedToday, icon: CheckCircle2, variant: 'accent' as const },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Quick Assignment Banner */}
      <section className="bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">Quick Patient Assignment</h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-tight">Add a patient directly to a doctor&apos;s queue</p>
          </div>
          <Button
            onClick={(): void => setQuickAssignmentOpen(true)}
            className="bg-white text-slate-800 hover:bg-slate-100 font-medium text-sm w-full sm:w-auto shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Patient to Queue
          </Button>
        </div>
      </section>

      {/* Pipeline Cards - Responsive grid */}
      <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {pipelineData.map((item) => (
          <PipelineCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            variant={item.variant}
            isLoading={isLoading}
          />
        ))}
      </section>

      {/* Main Content - Responsive layout */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Primary: Today's Schedule - the operational anchor of the page */}
        <div className="xl:col-span-8 2xl:col-span-9">
          <TodaysSchedule />
        </div>

        {/* Sidebar - secondary operational rail */}
        <div className="space-y-3 sm:space-y-4 xl:col-span-4 2xl:col-span-3">
          {/* Queue Management Panels */}
          <QueueManagementPanels />
          
          {/* Quick Actions Card */}
          <Card className="border-slate-200/60 shadow-sm rounded-lg sm:rounded-xl overflow-hidden hidden sm:block">
            <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 space-y-1">
              <div onClick={handleOpenBooking}>
                <QuickActionBtn href="#" icon={Plus} label="New Appointment" />
              </div>
              <QuickActionBtn href="/frontdesk/intake/start" icon={QrCode} label="Walk-in Intake" />
              <QuickActionBtn href="/frontdesk/theater-scheduling" icon={Building2} label="Theater Scheduling" />
              <QuickActionBtn href="/frontdesk/patients" icon={Users} label="Patient Registry" />
              <QuickActionBtn href="/frontdesk/billing" icon={FileText} label="Billing & Payments" />
            </CardContent>
          </Card>

          {/* Pending Intakes Alert - Hidden on small screens unless there are items */}
          {stats.pendingIntakeCount > 0 && (
            <Link href="/frontdesk/intake/pending">
              <Card className="border-slate-200 bg-slate-50 shadow-sm rounded-lg sm:rounded-xl cursor-pointer hover:shadow-md transition-shadow hidden sm:block">
                <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-slate-200 shrink-0">
                    <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">Pending Intakes</p>
                    <p className="text-[10px] sm:text-xs text-slate-600 truncate">
                      {stats.pendingIntakeCount} intake{stats.pendingIntakeCount !== 1 ? 's' : ''} awaiting review
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </section>

      {/* Mobile Quick Actions - Show on small screens */}
      <section className="sm:hidden space-y-2">
        <div className="text-sm font-semibold text-slate-700 px-2 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Quick Actions
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleOpenBooking}
            variant="outline" 
            size="sm" 
            className="text-xs h-9 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Appointment
          </Button>
          <Link href="/frontdesk/intake/start">
            <Button variant="outline" size="sm" className="text-xs h-9 rounded-lg w-full">
              <QrCode className="h-3.5 w-3.5 mr-1" />
              Walk-in
            </Button>
          </Link>
          <Link href="/frontdesk/theater-scheduling">
            <Button variant="outline" size="sm" className="text-xs h-9 rounded-lg w-full">
              <Building2 className="h-3.5 w-3.5 mr-1" />
              Theater
            </Button>
          </Link>
          <Link href="/frontdesk/patients">
            <Button variant="outline" size="sm" className="text-xs h-9 rounded-lg w-full">
              <Users className="h-3.5 w-3.5 mr-1" />
              Patients
            </Button>
          </Link>
        </div>
      </section>

      {/* Quick Assignment Dialog */}
      <QuickAssignmentDialog
        open={quickAssignmentOpen}
        onOpenChange={setQuickAssignmentOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
