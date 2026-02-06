'use client';

/**
 * Frontdesk Dashboard - Enhanced UI
 * 
 * Modern, clean dashboard with:
 * - Profile-centric header
 * - Refined stat cards
 * - Streamlined quick actions
 * - Better visual hierarchy and spacing
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useDashboardData } from '@/components/frontdesk/hooks/useDashboardData';
import { AvailableDoctorsPanel } from '@/components/frontdesk/AvailableDoctorsPanel';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  AlertCircle,
  QrCode,
  FileText,
  Loader2,
  Users,
  CheckCircle,
  ArrowRight,
  User,
  Activity,
  Inbox,
  ClipboardList,
} from 'lucide-react';

export default function FrontdeskDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { stats, loading } = useDashboardData();

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-cyan-500 animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-slate-300" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Loading reception desk...</p>
        </div>
      </div>
    );
  }

  // Auth state
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-500 mb-8">Please log in to access the reception dashboard.</p>
          <Link href="/login" className="w-full">
            <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Sticky Header - Profile-Centric Design */}
      <header className="sticky top-0 z-40 -mx-4 sm:-mx-5 lg:-mx-8 xl:-mx-10 px-4 sm:px-5 lg:px-8 xl:px-10 py-3 mb-5 bg-white/80 backdrop-blur-md border-b border-slate-100/60">
        <div className="flex items-center justify-between">
          {/* Profile Section */}
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="relative">
              <div className="h-11 w-11 rounded-full ring-2 ring-white shadow-sm overflow-hidden">
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-cyan-600 to-cyan-700 text-white text-sm font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            
            {/* Name & Context */}
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-slate-900 leading-tight">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Reception Desk • {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 border border-cyan-100 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[10px] font-medium text-cyan-700">On Duty</span>
            </div>
            
            <NotificationBell />
            
            {/* Quick Profile Link */}
            <Link href="/frontdesk/profile">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <div className="space-y-6">
        {/* Quick Actions Row - Urgent Items First */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* New Inquiries - Most Urgent */}
          {stats.newInquiries > 0 && (
            <QuickActionTile
              title="New Inquiries"
              count={stats.newInquiries}
              icon={Inbox}
              color="blue"
              href="/frontdesk/consultations?status=SUBMITTED,PENDING_REVIEW"
              loading={loading}
              pulse
            />
          )}

          {/* Pending Check-ins */}
          {stats.pendingCheckIns > 0 && (
            <QuickActionTile
              title="Pending Check-ins"
              count={stats.pendingCheckIns}
              icon={Clock}
              color="amber"
              href="/frontdesk/appointments?status=SCHEDULED"
              loading={loading}
              pulse
            />
          )}

          {/* Ready to Schedule */}
          {stats.awaitingScheduling > 0 && (
            <QuickActionTile
              title="Ready to Schedule"
              count={stats.awaitingScheduling}
              icon={Calendar}
              color="emerald"
              href="/frontdesk/consultations?status=APPROVED"
              loading={loading}
            />
          )}

          {/* New Walk-in */}
          <QuickActionTile
            title="New Walk-in"
            icon={QrCode}
            color="cyan"
            href="/frontdesk/intake/start"
            subtitle="Start Intake"
          />

          {/* Pending Intakes */}
          <QuickActionTile
            title="Pending Intakes"
            count={stats.pendingIntakeCount}
            icon={ClipboardList}
            color="indigo"
            href="/frontdesk/intake/pending"
            loading={loading}
          />
        </section>

        {/* Stats Overview - Compact Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Expected Today"
            value={stats.expectedPatients}
            icon={Calendar}
            color="slate"
          />
          <StatCard
            title="Checked In"
            value={stats.checkedInPatients}
            icon={CheckCircle}
            color="emerald"
          />
          <StatCard
            title="Awaiting Arrival"
            value={stats.pendingCheckIns}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="New Inquiries"
            value={stats.newInquiries}
            icon={AlertCircle}
            color="blue"
          />
        </section>

        {/* Main Content: Doctors Panel */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Doctors Panel - Full Width */}
          <div className="xl:col-span-8">
            <AvailableDoctorsPanel />
          </div>

          {/* Right Sidebar: Quick Links & Tools */}
          <div className="xl:col-span-4 space-y-5">
            {/* Quick Navigation */}
            <Card className="border-slate-200/60 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Quick Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <NavLink href="/frontdesk/appointments" icon={Calendar} label="All Appointments" />
                  <NavLink href="/frontdesk/patients" icon={Users} label="Patient Registry" />
                  <NavLink href="/frontdesk/billing" icon={FileText} label="Billing & Payments" />
                  <NavLink href="/frontdesk/consultation-requests" icon={Inbox} label="Consultation Requests" />
                </div>
              </CardContent>
            </Card>

            {/* Today's Timeline Summary */}
            <Card className="border-slate-200/60 shadow-sm rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 text-white">
              <CardHeader className="py-3 px-4 border-b border-white/10">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Shift Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total Sessions</span>
                    <span className="text-lg font-bold text-white">{stats.expectedPatients}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Completed</span>
                    <span className="text-lg font-bold text-emerald-400">{stats.checkedInPatients}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Pending</span>
                    <span className="text-lg font-bold text-amber-400">{stats.pendingCheckIns}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="pt-2">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${stats.expectedPatients > 0 ? (stats.checkedInPatients / stats.expectedPatients * 100) : 0}%` 
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                      {stats.expectedPatients > 0 
                        ? `${Math.round(stats.checkedInPatients / stats.expectedPatients * 100)}% processed` 
                        : 'No appointments today'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

/* Sub-components */

function QuickActionTile({ 
  title, 
  count, 
  icon: Icon, 
  color, 
  href, 
  loading = false,
  pulse = false,
  subtitle
}: {
  title: string;
  count?: number;
  icon: any;
  color: 'blue' | 'amber' | 'emerald' | 'cyan' | 'indigo' | 'slate';
  href: string;
  loading?: boolean;
  pulse?: boolean;
  subtitle?: string;
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200 hover:border-blue-300', icon: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200 hover:border-amber-300', icon: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200 hover:border-emerald-300', icon: 'text-emerald-600' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200 hover:border-cyan-300', icon: 'text-cyan-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200 hover:border-indigo-300', icon: 'text-indigo-600' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200 hover:border-slate-300', icon: 'text-slate-600' },
  };

  const styles = colorClasses[color];

  return (
    <Link href={href}>
      <Card className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-md border-2 rounded-xl overflow-hidden",
        styles.border
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={cn("p-2 rounded-lg", styles.bg)}>
              <Icon className={cn("h-4 w-4", styles.icon)} />
            </div>
            {pulse && count !== undefined && count > 0 && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-0.5">{title}</p>
            {count !== undefined ? (
              <div className="flex items-baseline gap-1">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <span className={cn("text-2xl font-bold", styles.text)}>{count}</span>
                )}
              </div>
            ) : subtitle ? (
              <p className={cn("text-xs font-medium", styles.text)}>{subtitle}</p>
            ) : null}
          </div>
          
          <div className={cn("mt-2 flex items-center text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity", styles.text)}>
            View <ArrowRight className="h-3 w-3 ml-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color: 'slate' | 'emerald' | 'amber' | 'blue';
}) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    slate: { bg: 'bg-slate-100', icon: 'text-slate-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  };

  const styles = colorClasses[color];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
      <div className={cn("p-2 rounded-lg", styles.bg)}>
        <Icon className={cn("h-4 w-4", styles.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide font-medium text-slate-400">{title}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group cursor-pointer">
        <div className="p-1.5 rounded-md bg-slate-100 group-hover:bg-cyan-100 transition-colors">
          <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-600 transition-colors" />
        </div>
        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{label}</span>
        <ArrowRight className="h-3 w-3 ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </Link>
  );
}
