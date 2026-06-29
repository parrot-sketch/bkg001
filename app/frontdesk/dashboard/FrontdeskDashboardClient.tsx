'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { TodaysSchedule } from '@/components/frontdesk/TodaysSchedule';
import { QueueManagementPanels } from '@/components/frontdesk/QueueManagementPanels';
import { QuickAssignmentDialog } from '@/components/frontdesk/QuickAssignmentDialog';
import { DashboardPipelineStats } from '@/components/frontdesk/DashboardPipelineStats';
import { PendingIntakesAlert } from '@/components/frontdesk/PendingIntakesAlert';
import { DoctorAvailabilityAtAGlance } from '@/components/frontdesk/DoctorAvailabilityAtAGlance';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { QuickBookAppointmentDialog } from '@/components/frontdesk/dashboard/QuickBookAppointmentDialog';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { triggerAppointmentExpiry } from '@/app/actions/appointment-expiry';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

/**
 * Frontdesk Dashboard Client Coordinator
 *
 * Implements client-side state, dialogs, background expiry verification,
 * and composes the dashboard structure using DashboardShell.
 */
export function FrontdeskDashboardClient() {
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
    <>
      <DashboardShell
        banner={<PendingIntakesAlert />}
        title="Frontdesk Operations"
        subtitle="Manage today's schedule, queue, and patient intake."
        stats={<DashboardPipelineStats />}
        sidebar={
          <>
            <Card className="border-slate-200/60 shadow-sm rounded-2xl bg-white">
              <CardContent className="p-4">
                <Button
                  onClick={(): void => setQuickAssignmentOpen(true)}
                  className="w-full bg-[#ecbf7b] text-white hover:bg-slate-800 font-medium shadow-sm rounded-xl"
                  size="lg"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Patient to Queue
                </Button>
              </CardContent>
            </Card>
            <DoctorAvailabilityAtAGlance />
            <QueueManagementPanels />
          </>
        }
        mobileActions={
          <>
            <div className="text-sm font-semibold text-slate-900 px-2">Quick actions</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleOpenBooking}
                variant="outline"
                size="sm"
                className="text-xs h-9 bg-white shadow-sm rounded-lg"
              >
                New Appt
              </Button>
              <Link href="/frontdesk/intake/start">
                <Button variant="outline" size="sm" className="text-xs h-9 w-full bg-white shadow-sm rounded-lg">
                  Walk-in
                </Button>
              </Link>
              <Link href="/frontdesk/theater-scheduling">
                <Button variant="outline" size="sm" className="text-xs h-9 w-full bg-white shadow-sm rounded-lg">
                  Theater
                </Button>
              </Link>
              <Link href="/frontdesk/patients">
                <Button variant="outline" size="sm" className="text-xs h-9 w-full bg-white shadow-sm rounded-lg">
                  Patients
                </Button>
              </Link>
            </div>
          </>
        }
      >
        <TodaysSchedule />
      </DashboardShell>

      {/* Dialog Components */}
      <QuickAssignmentDialog
        open={quickAssignmentOpen}
        onOpenChange={setQuickAssignmentOpen}
        onSuccess={() => {
          // Handled via RQ invalidate queries on mutation success
        }}
      />

      <QuickBookAppointmentDialog open={quickBookOpen} onOpenChange={setQuickBookOpen} />
    </>
  );
}
