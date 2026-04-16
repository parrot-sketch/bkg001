'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePreOpAppointments, usePostOpAppointments } from '@/hooks/appointments/usePrePostOp';
import {
  Search, RefreshCw, Calendar, Clock, Loader2, ExternalLink, ChevronDown, ChevronRight
} from 'lucide-react';
import { format, isToday, differenceInDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  SCHEDULED: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

type TabKey = 'pre-op' | 'post-op';

export default function AdminPrePostOpPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('pre-op');
  const [searchQuery, setSearchQuery] = useState('');

  const ready = isAuthenticated && !!user;
  const { data: preOp = [], isLoading: preLoading, refetch: refetchPre, isRefetching: preRefetching } = usePreOpAppointments(ready);
  const { data: postOp = [], isLoading: postLoading, refetch: refetchPost, isRefetching: postRefetching } = usePostOpAppointments(ready);

  const isLoading = preLoading || postLoading;
  const isRefetching = preRefetching || postRefetching;

  const activeData = (activeTab === 'pre-op'
    ? (preOp as AppointmentResponseDto[])
    : (postOp as AppointmentResponseDto[])
  );

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return activeData;
    const q = searchQuery.toLowerCase();
    return activeData.filter((a) =>
      a.patient?.firstName?.toLowerCase().includes(q) ||
      a.patient?.lastName?.toLowerCase().includes(q) ||
      a.patient?.fileNumber?.toLowerCase().includes(q) ||
      a.doctor?.name?.toLowerCase().includes(q) ||
      a.doctor?.specialization?.toLowerCase().includes(q) ||
      a.type?.toLowerCase().includes(q)
    );
  }, [activeData, searchQuery]);

  // Pre-op urgency: appointments within 3 days are "imminent"
  const imminentCount = (preOp as AppointmentResponseDto[]).filter((a) => {
    const days = differenceInDays(new Date(a.appointmentDate), new Date());
    return days >= 0 && days <= 3;
  }).length;

  // Post-op: completed today
  const completedTodayCount = (postOp as AppointmentResponseDto[]).filter((a) => isToday(new Date(a.appointmentDate))).length;

  if (!isAuthenticated || !user) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Peri-Operative Appointments</h2>
          <p className="text-slate-500 font-medium">Administrative oversight for pre-op and post-op appointment activity</p>
        </div>
      </div>

      {/* Context Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Pre-Op Appointments',
            value: (preOp as AppointmentResponseDto[]).length,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
          },
          {
            label: 'Imminent (≤3 days)',
            value: imminentCount,
            color: imminentCount > 0 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-600 bg-slate-50 border-slate-200',
          },
          {
            label: 'Post-Op Appointments',
            value: (postOp as AppointmentResponseDto[]).length,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          },
          {
            label: 'Completed Today',
            value: completedTodayCount,
            color: 'text-slate-600 bg-slate-50 border-slate-200',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('flex items-center gap-3 rounded-2xl border p-4', color)}>
            <div>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Tab Toggle */}
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl shrink-0">
          {(
            [
              {
                key: 'pre-op' as TabKey,
                label: 'Pre-Operative',
                count: (preOp as AppointmentResponseDto[]).length,
              },
              {
                key: 'post-op' as TabKey,
                label: 'Post-Operative',
                count: (postOp as AppointmentResponseDto[]).length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {tab.label}
              <span className={cn(
                'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                activeTab === tab.key ? 'bg-slate-100 text-slate-600' : 'text-slate-400'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Refresh */}
        <div className="flex flex-1 gap-3">
          <Card className="flex-1 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by patient, doctor, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-12 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-medium placeholder:text-slate-400"
                />
              </div>
            </CardContent>
          </Card>
          <Button
            variant="outline" size="icon"
            onClick={() => { refetchPre(); refetchPost(); }}
            disabled={isRefetching}
            className="h-12 w-12 rounded-2xl shrink-0 bg-white border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={cn('h-4 w-4 text-slate-500', isRefetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Section context label */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-1 w-8 rounded-full',
          activeTab === 'pre-op' ? 'bg-indigo-400' : 'bg-emerald-400'
        )} />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {activeTab === 'pre-op'
            ? 'Upcoming procedures — ordered by earliest date'
            : 'Completed procedures — last 30 days, most recent first'}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="h-14 pl-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient</TableHead>
              <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Surgeon</TableHead>
              <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {activeTab === 'pre-op' ? 'Procedure Date' : 'Completed'}
              </TableHead>
              <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</TableHead>
              <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
              <TableHead className="h-14 pr-8 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                    <span className="text-sm text-slate-400 font-medium">
                      Loading {activeTab === 'pre-op' ? 'pre-operative' : 'post-operative'} data…
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">
                      {searchQuery
                        ? 'No records match your search'
                        : activeTab === 'pre-op'
                        ? 'No upcoming pre-operative appointments'
                        : 'No completed procedures in the last 30 days'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((apt) => {
                const aptDate = new Date(apt.appointmentDate);
                const daysUntil = differenceInDays(aptDate, new Date());
                const isImminent = activeTab === 'pre-op' && daysUntil >= 0 && daysUntil <= 3;
                const isAptToday = isToday(aptDate);

                return (
                  <TableRow key={apt.id} className={cn(
                    'group border-slate-50 transition-colors',
                    isImminent ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50/50'
                  )}>
                    {/* Patient */}
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all group-hover:shadow-sm',
                          isImminent ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 group-hover:bg-white'
                        )}>
                          {apt.patient?.firstName?.charAt(0)}{apt.patient?.lastName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-none">
                            {apt.patient
                              ? `${apt.patient.firstName} ${apt.patient.lastName}`
                              : `Patient #${apt.patientId.slice(0, 8)}`}
                          </p>
                          {apt.patient?.fileNumber && (
                            <p className="text-[10px] font-bold text-indigo-500 mt-1 font-mono">{apt.patient.fileNumber}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Doctor */}
                    <TableCell className="py-5">
                      <div>
                        <p className="text-sm font-bold text-slate-700 leading-none">{apt.doctor?.name || '—'}</p>
                        {apt.doctor?.specialization && (
                          <p className="text-[10px] text-slate-400 font-medium mt-1">{apt.doctor.specialization}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="py-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            'text-sm font-bold leading-none',
                            isAptToday ? 'text-indigo-600' : isImminent ? 'text-amber-700' : 'text-slate-700'
                          )}>
                            {isAptToday ? 'Today' : format(aptDate, 'dd MMM yyyy')}
                          </p>
                          {isImminent && !isAptToday && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md">
                              {daysUntil === 0 ? 'TODAY' : `${daysUntil}d`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-400">
                          <Clock className="h-3 w-3" />
                          {apt.time}
                        </div>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell className="py-5">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {apt.type}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-5">
                      <Badge className={cn(
                        'font-bold text-[9px] uppercase tracking-wider rounded-md border px-2 py-0.5',
                        STATUS_STYLES[apt.status] || 'bg-slate-50 text-slate-500 border-slate-200'
                      )}>
                        {apt.status}
                      </Badge>
                    </TableCell>

                    {/* Patient Profile Link */}
                    <TableCell className="pr-8 py-5 text-right">
                      {apt.patient?.id && (
                        <Link href={`/admin/patients/${apt.patient.id}`}>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 rounded-xl text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            View Patient
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        {filteredData.length > 0 && (
          <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/30">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {filteredData.length} {activeTab === 'pre-op' ? 'upcoming' : 'completed'} procedure(s)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
