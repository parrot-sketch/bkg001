'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAllAppointments, useCancelAppointment } from '@/hooks/appointments/useAdminAppointments';
import {
  Calendar, Search, RefreshCw, MoreHorizontal, XCircle, ExternalLink, Loader2, Clock
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: AppointmentStatus.PENDING },
  { label: 'Scheduled', value: AppointmentStatus.SCHEDULED },
  { label: 'Completed', value: AppointmentStatus.COMPLETED },
  { label: 'Cancelled', value: AppointmentStatus.CANCELLED },
];

const STATUS_STYLES: Record<string, string> = {
  [AppointmentStatus.PENDING]: 'bg-amber-50 text-amber-700 border-amber-100',
  [AppointmentStatus.SCHEDULED]: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  [AppointmentStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  [AppointmentStatus.CANCELLED]: 'bg-rose-50 text-rose-600 border-rose-100',
};

export default function AdminAppointmentsPage() {
  const { user, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelTarget, setCancelTarget] = useState<AppointmentResponseDto | null>(null);

  const { data: appointments = [], isLoading, refetch, isRefetching } = useAllAppointments(isAuthenticated && !!user);
  const cancelMutation = useCancelAppointment();

  const filteredAppointments = useMemo(() => {
    let list = appointments as AppointmentResponseDto[];

    if (statusFilter !== 'ALL') {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (selectedDate) {
      list = list.filter((a) => {
        const d = new Date(a.appointmentDate);
        const sel = new Date(selectedDate);
        return (
          d.getFullYear() === sel.getFullYear() &&
          d.getMonth() === sel.getMonth() &&
          d.getDate() === sel.getDate()
        );
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) =>
        a.patient?.firstName?.toLowerCase().includes(q) ||
        a.patient?.lastName?.toLowerCase().includes(q) ||
        a.patient?.fileNumber?.toLowerCase().includes(q) ||
        a.doctor?.name?.toLowerCase().includes(q) ||
        a.doctor?.specialization?.toLowerCase().includes(q) ||
        a.type?.toLowerCase().includes(q) ||
        a.reason?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [appointments, statusFilter, selectedDate, searchQuery]);

  const counts = useMemo(() => {
    const all = appointments as AppointmentResponseDto[];
    return {
      ALL: all.length,
      [AppointmentStatus.PENDING]: all.filter((a) => a.status === AppointmentStatus.PENDING).length,
      [AppointmentStatus.SCHEDULED]: all.filter((a) => a.status === AppointmentStatus.SCHEDULED).length,
      [AppointmentStatus.COMPLETED]: all.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
      [AppointmentStatus.CANCELLED]: all.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
    };
  }, [appointments]);

  const todayCount = useMemo(
    () => (appointments as AppointmentResponseDto[]).filter((a) => isToday(new Date(a.appointmentDate))).length,
    [appointments]
  );

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({ id: cancelTarget.id });
      toast.success(`Appointment #${cancelTarget.id} cancelled`);
      setCancelTarget(null);
    } catch {
      toast.error('Failed to cancel appointment');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Appointments Overview</h2>
          <p className="text-slate-500 font-medium">Institution-wide appointment monitoring and control</p>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Today's Cases", value: todayCount, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
            { label: 'Total Records', value: (appointments as AppointmentResponseDto[]).length, color: 'text-slate-600 bg-slate-50 border-slate-200' },
            { label: 'Completed', value: counts[AppointmentStatus.COMPLETED], color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
            { label: 'Cancelled', value: counts[AppointmentStatus.CANCELLED], color: 'text-rose-600 bg-rose-50 border-rose-100' },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn('flex items-center gap-3 rounded-2xl border p-4', color)}>
              <div>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar: Status Tabs + Date + Search */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Tabs */}
          <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto shrink-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all',
                  statusFilter === tab.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                  statusFilter === tab.value ? 'bg-slate-100 text-slate-600' : 'text-slate-400'
                )}>
                  {counts[tab.value as keyof typeof counts] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Date + Search + Refresh */}
          <div className="flex flex-1 gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 shrink-0"
            />
            <Card className="flex-1 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by patient, doctor, type, reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 pl-12 pr-4 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-medium placeholder:text-slate-400"
                  />
                </div>
              </CardContent>
            </Card>
            {selectedDate && (
              <Button
                variant="ghost" size="icon"
                onClick={() => setSelectedDate('')}
                className="h-12 w-12 rounded-2xl shrink-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                title="Clear date filter"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline" size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-12 w-12 rounded-2xl shrink-0 bg-white border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className={cn('h-4 w-4 text-slate-500', isRefetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="h-14 pl-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient</TableHead>
                <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doctor</TableHead>
                <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</TableHead>
                <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</TableHead>
                <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
                <TableHead className="h-14 pr-8 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                      <span className="text-sm text-slate-400 font-medium">Loading appointment records…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                        <Calendar className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">
                        {searchQuery || statusFilter !== 'ALL' || selectedDate
                          ? 'No appointments match your filters'
                          : 'No appointments found'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((apt) => {
                  const aptDate = new Date(apt.appointmentDate);
                  const isAptToday = isToday(aptDate);
                  const canCancel = apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED;

                  return (
                    <TableRow key={apt.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                      {/* Patient */}
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                            {apt.patient?.firstName?.charAt(0)}{apt.patient?.lastName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-none">
                              {apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : `Patient #${apt.patientId.slice(0, 8)}`}
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

                      {/* Date & Time */}
                      <TableCell className="py-5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className={cn('text-sm font-bold leading-none', isAptToday ? 'text-indigo-600' : 'text-slate-700')}>
                              {isAptToday ? 'Today' : format(aptDate, 'dd MMM yyyy')}
                            </p>
                            {isAptToday && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">NOW</span>
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
                          STATUS_STYLES[apt.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          {apt.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-8 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 w-48 p-2 shadow-xl">
                            {apt.patient && (
                              <Link href={`/admin/patients/${apt.patient.id}`}>
                                <DropdownMenuItem className="rounded-xl font-bold cursor-pointer gap-3">
                                  <ExternalLink className="h-4 w-4 text-slate-400" />
                                  View Patient
                                </DropdownMenuItem>
                              </Link>
                            )}
                            {canCancel && (
                              <DropdownMenuItem
                                className="rounded-xl font-bold cursor-pointer gap-3 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                                onClick={() => setCancelTarget(apt)}
                              >
                                <XCircle className="h-4 w-4" />
                                Cancel Appointment
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Footer count */}
          {filteredAppointments.length > 0 && (
            <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/30">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Showing {filteredAppointments.length} of {(appointments as AppointmentResponseDto[]).length} appointment(s)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirm Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => { if (!v) setCancelTarget(null); }}>
        <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
              You are about to cancel the appointment for{' '}
              <strong>
                {cancelTarget?.patient
                  ? `${cancelTarget.patient.firstName} ${cancelTarget.patient.lastName}`
                  : `Appointment #${cancelTarget?.id}`}
              </strong>{' '}
              on <strong>{cancelTarget ? format(new Date(cancelTarget.appointmentDate), 'EEEE, dd MMM yyyy') : ''}</strong> at <strong>{cancelTarget?.time}</strong>.
              This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-3">
            <AlertDialogCancel
              disabled={cancelMutation.isPending}
              className="rounded-xl font-bold border-slate-200 hover:bg-slate-50"
            >
              Keep Appointment
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 px-6 shadow-lg shadow-rose-600/10"
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
