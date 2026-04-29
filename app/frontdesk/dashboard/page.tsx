'use client';

/**
 * Frontdesk Dashboard Page — Resilient Layout Shell
 *
 * This component is a pure layout orchestrator. It owns ZERO data fetching.
 * Each section is a self-contained container that manages its own data, loading,
 * and error states independently. If any one section fails, the rest of the
 * dashboard remains fully operational — no domino-effect collapse.
 *
 * Layout:
 * - Quick Assignment Banner (static action, always available)
 * - Pipeline Stats (DashboardPipelineStats — self-contained)
 * - Today's Schedule (TodaysSchedule — self-contained)
 * - Queue Management Panels (QueueManagementPanels — self-contained)
 * - Quick Actions (static links, always available)
 * - Pending Intakes Alert (PendingIntakesAlert — self-contained, renders null safely)
 */

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { TodaysSchedule } from '@/components/frontdesk/TodaysSchedule';
import { QueueManagementPanels } from '@/components/frontdesk/QueueManagementPanels';
import { QuickAssignmentDialog } from '@/components/frontdesk/QuickAssignmentDialog';
import { DashboardPipelineStats } from '@/components/frontdesk/DashboardPipelineStats';
import { PendingIntakesAlert } from '@/components/frontdesk/PendingIntakesAlert';
import { QuickActionBtn } from '@/components/frontdesk/QuickActionBtn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { QuickBookAppointmentDialog } from '@/components/frontdesk/dashboard/QuickBookAppointmentDialog';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { triggerAppointmentExpiry } from '@/app/actions/appointment-expiry';
import {
  Calendar,
  QrCode,
  FileText,
  Users,
  Activity,
  Building2,
  Plus,
} from 'lucide-react';

// ─── Main Component ─────────────────────────────────────────

export default function FrontdeskDashboardPage(): React.ReactElement {
  const { openBookingDialog } = useBookAppointmentStore();
  const [quickAssignmentOpen, setQuickAssignmentOpen] = useState<boolean>(false);
  const [quickBookOpen, setQuickBookOpen] = useState(false);

  // Background expiry check — fire and forget, never blocks UI
  useEffect(() => {
    triggerAppointmentExpiry().catch(() => {
      // Intentionally silent — expiry is a background operation
    });
  }, []);

  const handleOpenBooking = useCallback((): void => {
    openBookingDialog({
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.DASHBOARD,
    });
  }, [openBookingDialog]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Quick Assignment Banner — static, always rendered */}
      <section className="bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">Quick Patient Assignment</h2>
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

      {/* Pipeline Stats — self-contained, fails silently */}
      <DashboardPipelineStats />

      {/* Main Content */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Primary: Today's Schedule */}
        <div className="xl:col-span-8 2xl:col-span-9">
          <TodaysSchedule />
        </div>

        {/* Sidebar */}
        <div className="space-y-3 sm:space-y-4 xl:col-span-4 2xl:col-span-3">
          {/* Queue Management — self-contained, fails in isolation */}
          <QueueManagementPanels />

          {/* Quick Actions — fully static, never affected by data errors */}
          <Card className="border-slate-200/60 shadow-sm rounded-lg sm:rounded-xl overflow-hidden hidden sm:block">
            <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 space-y-1">
              <QuickActionBtn onClick={() => setQuickBookOpen(true)} icon={Plus} label="Book Appointment" />
              <QuickActionBtn href="/frontdesk/intake/start" icon={QrCode} label="Walk-in Intake" />
              <QuickActionBtn href="/frontdesk/theater-scheduling" icon={Building2} label="Theater Scheduling" />
              <QuickActionBtn href="/frontdesk/patients" icon={Users} label="Patient Registry" />
              <QuickActionBtn href="/frontdesk/billing" icon={FileText} label="Billing & Payments" />
            </CardContent>
          </Card>

          {/* Pending Intakes Alert — self-contained, renders null if no intakes or on error */}
          <PendingIntakesAlert />
        </div>
      </section>

      {/* Mobile Quick Actions — fully static */}
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
        onSuccess={() => {
          // No refetch needed here — child containers manage their own cache
        }}
      />

      <QuickBookAppointmentDialog open={quickBookOpen} onOpenChange={setQuickBookOpen} />
    </div>
  );
}
