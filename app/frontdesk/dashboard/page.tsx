'use client';

/**
 * Frontdesk Dashboard
 * 
 * Primary surface for frontdesk staff.
 * 
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

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { TodaysSchedule } from '@/components/frontdesk/TodaysSchedule';
import { QueueManagementPanels } from '@/components/frontdesk/QueueManagementPanels';
import { QuickAssignmentDialog } from '@/components/frontdesk/QuickAssignmentDialog';
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

function PipelineCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'violet' | 'emerald';
  loading?: boolean;
}) {
  const styles: Record<string, { bg: string; icon: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-500', text: 'text-violet-700', border: 'border-violet-200' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' },
  };
  const s = styles[color];

  return (
    <Card className={`${s.bg} border ${s.border} shadow-sm`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-white/80 ${s.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-xl font-bold ${s.text}`}>{loading ? '...' : value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionBtn({
  href,
  icon: Icon,
  label,
  color,
  pulse,
  onClick,
}: {
  href?: string;
  icon: React.ElementType;
  label: string;
  color: 'cyan' | 'indigo' | 'blue' | 'slate';
  pulse?: boolean;
  onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    cyan: 'hover:bg-cyan-50 hover:text-cyan-700',
    indigo: 'hover:bg-indigo-50 hover:text-indigo-700',
    blue: 'hover:bg-blue-50 hover:text-blue-700',
    slate: 'hover:bg-slate-50 hover:text-slate-700',
  };

  const content = (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer ${colors[color]}`}>
      <div className="p-1.5 rounded-md bg-slate-100">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {pulse && <span className="ml-auto h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return <div onClick={onClick}>{content}</div>;
}

export default function FrontdeskDashboardPage() {
  const { stats, isLoading, refetch } = useFrontdeskDashboard();
  const { openBookingDialog } = useBookAppointmentStore();
  const [quickAssignmentOpen, setQuickAssignmentOpen] = useState(false);

  // Trigger appointment expiry check on dashboard load
  const handleExpiryCheck = useCallback(async () => {
    try {
      const result = await triggerAppointmentExpiry();
      if (result.success && result.expiredCount > 0) {
        refetch();
      }
    } catch (error) {
      console.error('[FRONTDESK] Error checking appointment expiry:', error);
    }
  }, [refetch]);

  // Run expiry check once on mount
  useState(() => {
    handleExpiryCheck();
  });

  return (
    <div className="space-y-5">
      {/* Quick Assignment Banner */}
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Quick Patient Assignment</h2>
            <p className="text-cyan-100 text-sm">Add a patient directly to a doctor&apos;s queue</p>
          </div>
          <Button onClick={() => setQuickAssignmentOpen(true)} className="bg-white text-cyan-700 hover:bg-cyan-50 font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Add Patient to Queue
          </Button>
        </div>
      </div>

      {/* Pipeline Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PipelineCard
          label="Arriving Today"
          value={stats.pendingCheckIns}
          icon={Calendar}
          color="blue"
          loading={isLoading}
        />
        <PipelineCard
          label="In Waiting Room"
          value={stats.checkedInPatients}
          icon={Clock}
          color="amber"
          loading={isLoading}
        />
        <PipelineCard
          label="In Consultation"
          value={stats.inConsultation}
          icon={Stethoscope}
          color="violet"
          loading={isLoading}
        />
        <PipelineCard
          label="Completed Today"
          value={stats.completedToday}
          icon={CheckCircle2}
          color="emerald"
          loading={isLoading}
        />
      </section>

      {/* Main Content */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Primary: Schedule & Queue */}
        <div className="xl:col-span-8 space-y-5">
          <TodaysSchedule />
          <QueueManagementPanels />
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-4 space-y-4">
          {/* Quick Actions */}
          <Card className="border-slate-200/60 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1">
              <div onClick={() => openBookingDialog({ source: AppointmentSource.FRONTDESK_SCHEDULED, bookingChannel: BookingChannel.DASHBOARD })}>
                <QuickActionBtn href="#" icon={Plus} label="New Appointment" color="cyan" />
              </div>
              <QuickActionBtn href="/frontdesk/intake/start" icon={QrCode} label="Walk-in Intake" color="indigo" />
              <QuickActionBtn href="/frontdesk/theater-scheduling" icon={Building2} label="Theater Scheduling" color="blue" />
              <QuickActionBtn href="/frontdesk/patients" icon={Users} label="Patient Registry" color="slate" />
              <QuickActionBtn href="/frontdesk/billing" icon={FileText} label="Billing & Payments" color="slate" />
            </CardContent>
          </Card>

          {/* Pending Intakes Alert */}
          {stats.pendingIntakeCount > 0 && (
            <Link href="/frontdesk/intake/pending">
              <Card className="border-indigo-200 bg-indigo-50 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100">
                    <ClipboardList className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-indigo-800">Pending Intakes</p>
                    <p className="text-xs text-indigo-600">
                      {stats.pendingIntakeCount} intake{stats.pendingIntakeCount !== 1 ? 's' : ''} awaiting review
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-indigo-400 shrink-0" />
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
