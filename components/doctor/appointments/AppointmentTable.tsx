'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye,
  Play,
  Stethoscope,
  Check,
  X,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, isToday, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { useAppointmentActions } from '@/hooks/doctor/useAppointmentActions';

interface AppointmentTableProps {
  appointments: AppointmentResponseDto[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const DATE_RANGE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All' },
] as const;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION, label: 'Needs Confirm' },
  { value: AppointmentStatus.SCHEDULED, label: 'Scheduled' },
  { value: AppointmentStatus.CONFIRMED, label: 'Confirmed' },
  { value: AppointmentStatus.CHECKED_IN, label: 'Checked In' },
  { value: AppointmentStatus.READY_FOR_CONSULTATION, label: 'Ready' },
  { value: AppointmentStatus.IN_CONSULTATION, label: 'In Consultation' },
  { value: AppointmentStatus.COMPLETED, label: 'Completed' },
  { value: AppointmentStatus.CANCELLED, label: 'Cancelled' },
  { value: AppointmentStatus.NO_SHOW, label: 'No Show' },
];

const ACTIVE_STATUSES = new Set([
  AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.READY_FOR_CONSULTATION,
  AppointmentStatus.IN_CONSULTATION,
  AppointmentStatus.COMPLETED,
]);

function getStatusBadge(status: string) {
  const config: Record<string, { bg: string; text: string }> = {
    PENDING_DOCTOR_CONFIRMATION: { bg: 'bg-[#e7d6bf]', text: 'text-[#2c2e4b]' },
    SCHEDULED: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
    CONFIRMED: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
    CHECKED_IN: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
    READY_FOR_CONSULTATION: { bg: 'bg-[#e7d6bf]', text: 'text-[#2c2e4b]' },
    IN_CONSULTATION: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]' },
    COMPLETED: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70' },
    CANCELLED: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70' },
    NO_SHOW: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70' },
    PENDING: { bg: 'bg-[#e7d6bf]', text: 'text-[#2c2e4b]' },
  };

  const c = config[status] || { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${c.bg} ${c.text}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function getRowAction(
  appointment: AppointmentResponseDto,
  router: ReturnType<typeof useRouter>,
  onConfirm: (id: number) => void,
  onReject: (id: number) => void,
  onStart: (appointment: AppointmentResponseDto) => void,
  isConfirming: boolean,
  isRejecting: boolean,
) {
  const status = appointment.status;
  const isPendingConfirm = status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
  const busy = (isConfirming && isPendingConfirm) || (isRejecting && isPendingConfirm);

  if (status === AppointmentStatus.IN_CONSULTATION) {
    return (
      <Button
        size="sm"
        className="h-7 px-2.5 text-[11px] font-medium rounded-md bg-violet-600 hover:bg-violet-700 text-white"
        onClick={() => router.push(`/doctor/consultations/session/${appointment.id}`)}
      >
        <Play className="h-3 w-3 mr-1" />
        Continue
      </Button>
    );
  }
  if (status === AppointmentStatus.CHECKED_IN || status === AppointmentStatus.READY_FOR_CONSULTATION) {
    return (
      <Button
        size="sm"
        className="h-7 px-2.5 text-[11px] font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={() => onStart(appointment)}
      >
        <Stethoscope className="h-3 w-3 mr-1" />
        Start
      </Button>
    );
  }
  if (isPendingConfirm) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 rounded-lg border-slate-200 text-xs"
          onClick={() => onReject(appointment.id)}
          disabled={busy}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          className="h-7 rounded-lg bg-[#0c5d69] hover:bg-[#0a4f59] text-white text-xs"
          onClick={() => onConfirm(appointment.id)}
          disabled={busy}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {busy ? 'Saving...' : 'Confirm'}
        </Button>
      </div>
    );
  }
  if (status === AppointmentStatus.COMPLETED) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-600"
        onClick={() => router.push(`/doctor/consultations/session/${appointment.id}`)}
      >
        <FileText className="h-3 w-3" />
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-slate-400 hover:text-slate-600"
      onClick={() => router.push(`/doctor/appointments/${appointment.id}`)}
    >
      <Eye className="h-3.5 w-3.5 mr-1" />
      View
    </Button>
  );
}

export function AppointmentTable({
  appointments,
  isLoading,
  isRefreshing,
  onRefresh,
}: AppointmentTableProps) {
  const router = useRouter();
  const { handleConfirm, handleReject, handleStartConsultation, confirmMutation, rejectMutation } = useAppointmentActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();

    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        if (dateRange === 'today' && !isToday(aptDate)) return false;
        if (dateRange === 'week') {
          const weekStart = startOfWeek(now, { weekStartsOn: 1 });
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (!isWithinInterval(aptDate, { start: weekStart, end: weekEnd })) return false;
        }
        if (dateRange === 'month') {
          const monthStart = startOfMonth(now);
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          if (!isWithinInterval(aptDate, { start: monthStart, end: monthEnd })) return false;
        }
        if (statusFilter !== 'ALL' && apt.status !== statusFilter) return false;
        if (q) {
          const patientName = apt.patient
            ? `${apt.patient.firstName} ${apt.patient.lastName}`
            : '';
          const fileNumber = apt.patient?.fileNumber ? String(apt.patient.fileNumber) : '';
          return (
            patientName.toLowerCase().includes(q) ||
            fileNumber.toLowerCase().includes(q) ||
            (apt.type || '').toLowerCase().includes(q) ||
            (apt.note || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const dateCompare =
          new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [appointments, searchQuery, dateRange, statusFilter]);

  const pendingCount = appointments.filter(
    (apt) => apt.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
  ).length;

  if (isLoading) {
    return (
      <div className="border border-[#e7d6bf] bg-white rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e7d6bf]">
          <div className="h-4 w-32 bg-[#e7d6bf]/60 animate-pulse rounded" />
        </div>
        <div className="space-y-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#e7d6bf] last:border-b-0">
              <div className="h-4 w-16 bg-[#e7d6bf]/60 animate-pulse rounded" />
              <div className="h-4 w-24 bg-[#e7d6bf]/60 animate-pulse rounded" />
              <div className="h-4 w-32 bg-[#e7d6bf]/60 animate-pulse rounded" />
              <div className="h-6 w-20 bg-[#e7d6bf]/60 animate-pulse rounded" />
              <div className="ml-auto h-8 w-20 bg-[#e7d6bf]/60 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-[#e7d6bf] border border-[#2c2e4b]/10 rounded-xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v)}>
              <SelectTrigger className="h-9 w-[140px] rounded-lg border-[#2c2e4b]/10 bg-white">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="h-9 w-[160px] rounded-lg border-[#2c2e4b]/10 bg-white">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 max-w-md">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, file #, type…"
              className="h-9 pl-3 pr-10 rounded-lg border-[#2c2e4b]/10 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2c2e4b]/50 hover:text-[#2c2e4b]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9 rounded-lg w-full sm:w-auto border-[#2c2e4b]/10 text-[#2c2e4b] hover:bg-white"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Pending Count */}
      {pendingCount > 0 && (
        <div className="text-xs text-white font-medium ml-1">
          {pendingCount} appointment{pendingCount > 1 ? 's' : ''} awaiting confirmation
        </div>
      )}

      {/* Table */}
      <div className="border border-[#e7d6bf] bg-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#e7d6bf]/30 hover:bg-[#e7d6bf]/30">
                <TableHead className="text-xs font-semibold text-[#2c2e4b] w-[100px]">DATE/TIME</TableHead>
                <TableHead className="text-xs font-semibold text-[#2c2e4b]">PATIENT</TableHead>
                <TableHead className="text-xs font-semibold text-[#2c2e4b]">TYPE</TableHead>
                <TableHead className="text-xs font-semibold text-[#2c2e4b] w-[120px]">STATUS</TableHead>
                <TableHead className="text-xs font-semibold text-[#2c2e4b] text-right w-[180px]">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-[#2c2e4b]/50">
                      <p className="text-sm font-medium">No appointments found</p>
                      <p className="text-xs mt-1">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((apt) => {
                  const patientName = apt.patient
                    ? `${apt.patient.firstName} ${apt.patient.lastName}`
                    : 'Unknown patient';
                  const fileNumber = apt.patient?.fileNumber
                    ? `#${apt.patient.fileNumber}`
                    : null;
                  const appointmentDate = new Date(apt.appointmentDate);
                  const isTodayDate = isToday(appointmentDate);
                  const displayDate = isTodayDate
                    ? 'Today'
                    : format(appointmentDate, 'MMM d, yyyy');
                  const displayTime = apt.time || '--:--';

                  return (
                    <TableRow
                      key={apt.id}
                      className="hover:bg-[#e7d6bf]/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/doctor/appointments/${apt.id}`)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#2c2e4b] tabular-nums">
                            {displayTime}
                          </span>
                          <span className="text-xs text-[#2c2e4b]/60">{displayDate}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium text-[#2c2e4b]">{patientName}</p>
                            {fileNumber && (
                              <p className="text-xs text-[#2c2e4b]/60 font-mono">{fileNumber}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[#2c2e4b]/70">{apt.type || 'Consultation'}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                      <TableCell className="text-right">
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-end gap-1"
                        >
                          {getRowAction(apt, router, handleConfirm, handleReject, handleStartConsultation, confirmMutation.isPending, rejectMutation.isPending)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
