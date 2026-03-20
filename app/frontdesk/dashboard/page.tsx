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
import { useFrontdeskDashboard } from '@/hooks/frontdesk/useFrontdeskDashboard';
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
} from 'lucide-react';



// ─── Main Component ─────────────────────────────────────────

export default function FrontdeskDashboardPage(): React.ReactElement {
  const { stats, isLoading, refetch } = useFrontdeskDashboard();
  const { openBookingDialog } = useBookAppointmentStore();
  const [quickAssignmentOpen, setQuickAssignmentOpen] = useState<boolean>(false);

  // Handle appointment expiry check on mount
  const handleExpiryCheck = useCallback(async (): Promise<void> => {
    try {
      const result = await triggerAppointmentExpiry();
      if (result.success && result.expiredCount > 0) {
        refetch();
      }
    } catch (err) {
      console.error('[FRONTDESK] Error checking appointment expiry:', err);
    }
  }, [refetch]);

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
    <div className="space-y-5">
      {/* Quick Assignment Banner */}
      <section className="bg-slate-800 rounded-xl p-4 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Quick Patient Assignment</h2>
            <p className="text-slate-300 text-sm">Add a patient directly to a doctor&apos;s queue</p>
          </div>
          <Button
            onClick={(): void => setQuickAssignmentOpen(true)}
            className="bg-white text-slate-800 hover:bg-slate-100 font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Patient to Queue
          </Button>
        </div>
      </section>

      {/* Pipeline Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      {/* Main Content */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Primary: Today's Schedule */}
        <div className="xl:col-span-8">
          <TodaysSchedule />
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-4 space-y-4">
          {/* Queue Management Panels */}
          <QueueManagementPanels />
          
          {/* Quick Actions */}
          <Card className="border-slate-200/60 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1">
              <div onClick={handleOpenBooking}>
                <QuickActionBtn href="#" icon={Plus} label="New Appointment" />
              </div>
              <QuickActionBtn href="/frontdesk/intake/start" icon={QrCode} label="Walk-in Intake" />
              <QuickActionBtn href="/frontdesk/theater-scheduling" icon={Building2} label="Theater Scheduling" />
              <QuickActionBtn href="/frontdesk/patients" icon={Users} label="Patient Registry" />
              <QuickActionBtn href="/frontdesk/billing" icon={FileText} label="Billing & Payments" />
            </CardContent>
          </Card>

          {/* Pending Intakes Alert */}
          {stats.pendingIntakeCount > 0 && (
            <Link href="/frontdesk/intake/pending">
              <Card className="border-slate-200 bg-slate-50 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-200">
                    <ClipboardList className="h-4 w-4 text-slate-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Pending Intakes</p>
                    <p className="text-xs text-slate-600">
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

      {/* Quick Assignment Dialog */}
      <QuickAssignmentDialog
        open={quickAssignmentOpen}
        onOpenChange={setQuickAssignmentOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
