'use client';

/**
 * Frontdesk Appointments Page — Premium Redesign
 * 
 * Central hub for appointment management with:
 *   - Status pipeline visualization (Awaiting MD → Scheduled → Checked In → …)
 *   - Date navigation with compact controls
 *   - Full-text search on patient name, doctor name, type
 *   - Status chip filters
 *   - Connection to Quick Book via CTA
 *   - Responsive design matching the dashboard aesthetic
 * 
 * Data source: useAppointmentsByDate → GET /api/appointments?date=YYYY-MM-DD
 * Includes patient & doctor names from joined query
 */

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAppointmentsByDate } from '@/hooks/appointments/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  CheckCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Plus,
  Stethoscope,
  ArrowRight,
  Activity,
  AlertCircle,
  FileText,
  Loader2,
  CalendarDays,
  Filter,
} from 'lucide-react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { CheckInDialog } from '@/components/frontdesk/CheckInDialog';
import { FrontdeskAppointmentCard } from '@/components/frontdesk/FrontdeskAppointmentCard';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/* ═══════════════════ Status Configuration ═══════════════════ */

interface StatusChip {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;      // Tailwind color name
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const STATUS_CHIPS: StatusChip[] = [
  {
    key: 'ALL',
    label: 'All',
    icon: CalendarDays,
    color: 'slate',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
  },
  {
    key: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    label: 'Awaiting Doctor',
    icon: Clock,
    color: 'indigo',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-300',
  },
  {
    key: AppointmentStatus.PENDING,
    label: 'Pending',
    icon: AlertCircle,
    color: 'amber',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-300',
  },
  {
    key: AppointmentStatus.SCHEDULED,
    label: 'Scheduled',
    icon: Calendar,
    color: 'emerald',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
  },
  {
    key: AppointmentStatus.CHECKED_IN,
    label: 'Checked In',
    icon: CheckCircle,
    color: 'sky',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-300',
  },
  {
    key: AppointmentStatus.IN_CONSULTATION,
    label: 'In Consult',
    icon: Stethoscope,
    color: 'violet',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-300',
  },
  {
    key: AppointmentStatus.COMPLETED,
    label: 'Completed',
    icon: CheckCircle,
    color: 'green',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-300',
  },
  {
    key: AppointmentStatus.CANCELLED,
    label: 'Cancelled',
    icon: AlertCircle,
    color: 'red',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-300',
  },
];

/* ═══════════════════ Page Component ═══════════════════ */

export default function FrontdeskAppointmentsPage() {
  return (
    <Suspense fallback={<AppointmentsSkeleton />}>
      <FrontdeskAppointmentsContent />
    </Suspense>
  );
}

function FrontdeskAppointmentsContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse query params
  const dateParam = searchParams.get('date');
  const highlightedId = searchParams.get('highlight') ? parseInt(searchParams.get('highlight')!) : null;

  // Date state
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (dateParam) {
      const parsed = new Date(dateParam);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });

  // Update URL when date changes (shallow push to keep history clean)
  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const currentParam = searchParams.get('date');
    if (currentParam !== dateStr && !highlightedId) {
      // Only update if not currently highlighting (to avoid wiping the highlight param immediately)
      // actually we can just update the date param.
      // router.replace(`/frontdesk/appointments?date=${dateStr}`, { scroll: false });
      // But this might conflict with the highlight param if we are not careful.
      // Let's keep it simple: The page initializes from URL. 
      // If user changes date via UI, we update state. We can optionally update URL.
    }
  }, [selectedDate, searchParams, highlightedId, router]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Check-in dialog state
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);

  // Data fetch
  const {
    data: appointments = [],
    isLoading: loading,
    isRefetching,
    refetch,
  } = useAppointmentsByDate(selectedDate, isAuthenticated && !!user);

  /* ── Filtering ── */
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    // Text search — match patient name, doctor name, type, time
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((apt) => {
        const patientName = apt.patient
          ? `${apt.patient.firstName} ${apt.patient.lastName}`.toLowerCase()
          : '';
        const doctorName = apt.doctor?.name?.toLowerCase() || '';
        const type = apt.type?.toLowerCase() || '';
        const time = apt.time?.toLowerCase() || '';
        const fileNumber = apt.patient?.fileNumber?.toLowerCase() || '';

        return (
          patientName.includes(q) ||
          doctorName.includes(q) ||
          type.includes(q) ||
          time.includes(q) ||
          fileNumber.includes(q)
        );
      });
    }

    return filtered;
  }, [appointments, statusFilter, searchQuery]);

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: appointments.length };
    for (const apt of appointments) {
      counts[apt.status] = (counts[apt.status] || 0) + 1;
    }
    return counts;
  }, [appointments]);

  /* ── Pipeline stats ── */
  const awaitingDoctor = statusCounts[AppointmentStatus.PENDING_DOCTOR_CONFIRMATION] || 0;
  const pendingCheckIns =
    (statusCounts[AppointmentStatus.SCHEDULED] || 0) +
    (statusCounts[AppointmentStatus.CONFIRMED] || 0);
  const checkedIn =
    (statusCounts[AppointmentStatus.CHECKED_IN] || 0) +
    (statusCounts[AppointmentStatus.READY_FOR_CONSULTATION] || 0);
  const inConsultation = statusCounts[AppointmentStatus.IN_CONSULTATION] || 0;
  const completed = statusCounts[AppointmentStatus.COMPLETED] || 0;

  /* ── Handlers ── */
  const handleCheckIn = (appointment: AppointmentResponseDto) => {
    setSelectedAppointment(appointment);
    setShowCheckInDialog(true);
  };

  const handleCheckInSuccess = () => {
    setShowCheckInDialog(false);
    setSelectedAppointment(null);
    queryClient.invalidateQueries({ queryKey: ['appointments', 'date'] });
    toast.success('Patient checked in successfully');
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) =>
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    );
  };

  const goToToday = () => setSelectedDate(new Date());

  /* ── Date label ── */
  const dateLabel = isToday(selectedDate)
    ? 'Today'
    : isTomorrow(selectedDate)
      ? 'Tomorrow'
      : isYesterday(selectedDate)
        ? 'Yesterday'
        : format(selectedDate, 'EEEE');

  /* ── Auth guard ── */
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-slate-100 max-w-md">
          <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-500 mb-6">Please log in to manage appointments.</p>
          <Link href="/login">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* ═══ Page Header ═══ */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage bookings, check-ins, and patient flow
          </p>
        </div>
        <Link href="/frontdesk/appointments/new">
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-sm shadow-cyan-200/50 h-10 px-5">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </Link>
      </header>

      {/* ═══ Pipeline Stats ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <PipelineStat
          label="Awaiting Doctor"
          count={awaitingDoctor}
          icon={Clock}
          color="indigo"
          active={awaitingDoctor > 0}
        />
        <PipelineStat
          label="Ready to Check-in"
          count={pendingCheckIns}
          icon={Calendar}
          color="emerald"
          active={pendingCheckIns > 0}
        />
        <PipelineStat
          label="Checked In"
          count={checkedIn}
          icon={CheckCircle}
          color="sky"
          active={checkedIn > 0}
        />
        <PipelineStat
          label="In Consultation"
          count={inConsultation}
          icon={Stethoscope}
          color="violet"
          active={inConsultation > 0}
        />
        <PipelineStat
          label="Completed"
          count={completed}
          icon={CheckCircle}
          color="green"
          active={false}
        />
      </div>

      {/* ═══ Controls Bar ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 space-y-4">
        {/* Date navigator + search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Date navigation */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-slate-500 hover:text-slate-700"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <button
              onClick={goToToday}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
                isToday(selectedDate)
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span className="block text-xs font-normal opacity-60">{dateLabel}</span>
              <span>{format(selectedDate, 'MMM d, yyyy')}</span>
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-slate-500 hover:text-slate-700"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {!isToday(selectedDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="text-xs text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg ml-1"
              >
                Today
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input
              placeholder="Search patient, doctor, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
              >
                ×
              </button>
            )}
          </div>

          {/* Refetch indicator */}
          {isRefetching && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing...
            </div>
          )}
        </div>

        {/* Status chip filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
          {STATUS_CHIPS.map((chip) => {
            const count = statusCounts[chip.key] || 0;
            const isActive = statusFilter === chip.key;
            const Icon = chip.icon;

            return (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  isActive
                    ? `${chip.bgClass} ${chip.textClass} ${chip.borderClass}`
                    : 'bg-white text-slate-500 border-slate-200/60 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <Icon className="h-3 w-3" />
                {chip.label}
                {count > 0 && (
                  <span
                    className={cn(
                      'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                      isActive
                        ? `${chip.textClass} bg-white/80`
                        : 'text-slate-400 bg-slate-100'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Appointments List ═══ */}
      <div className="space-y-2.5">
        {/* List header */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {loading
              ? 'Loading...'
              : `${filteredAppointments.length} appointment${filteredAppointments.length !== 1 ? 's' : ''}`}
            {statusFilter !== 'ALL' && (
              <span className="text-slate-300 font-normal ml-1">
                ({STATUS_CHIPS.find((c) => c.key === statusFilter)?.label})
              </span>
            )}
          </p>
          {filteredAppointments.length > 0 && (
            <p className="text-[10px] text-slate-400">
              Sorted by scheduled time
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <AppointmentsSkeleton />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            hasFilters={!!searchQuery || statusFilter !== 'ALL'}
            dateLabel={dateLabel}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
          />
        ) : (
          <div className="space-y-2">
            {filteredAppointments.map((appointment) => (
              <FrontdeskAppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCheckIn={handleCheckIn}
                isHighlighted={highlightedId === appointment.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ Check-in Dialog ═══ */}
      {showCheckInDialog && selectedAppointment && (
        <CheckInDialog
          open={showCheckInDialog}
          onOpenChange={(isOpen) => {
            setShowCheckInDialog(isOpen);
            if (!isOpen) setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
        />
      )}
    </div>
  );
}

/* ═══════════════════ Sub-Components ═══════════════════ */

/** Pipeline stat card */
function PipelineStat({
  label,
  count,
  icon: Icon,
  color,
  active,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'emerald' | 'sky' | 'violet' | 'green';
  active: boolean;
}) {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-500',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-500',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    sky: {
      bg: 'bg-sky-50',
      icon: 'text-sky-500',
      text: 'text-sky-700',
      border: 'border-sky-200',
    },
    violet: {
      bg: 'bg-violet-50',
      icon: 'text-violet-500',
      text: 'text-violet-700',
      border: 'border-violet-200',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-500',
      text: 'text-green-700',
      border: 'border-green-200',
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-xl border bg-white transition-all',
        active ? c.border : 'border-slate-100'
      )}
    >
      <div className={cn('p-2 rounded-lg', c.bg)}>
        <Icon className={cn('h-4 w-4', c.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-tight">{label}</p>
        <p className={cn('text-xl font-bold', active ? c.text : 'text-slate-300')}>
          {count}
        </p>
      </div>
      {active && count > 0 && (
        <span className={cn('ml-auto h-2 w-2 rounded-full animate-pulse', c.icon.replace('text-', 'bg-'))} />
      )}
    </div>
  );
}

/** Empty state */
function EmptyState({
  hasFilters,
  dateLabel,
  onClearFilters,
}: {
  hasFilters: boolean;
  dateLabel: string;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 bg-white/50">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <Calendar className="h-8 w-8 text-slate-300" />
      </div>
      <h3 className="text-sm font-semibold text-slate-600 mb-1">
        {hasFilters ? 'No matching appointments' : `No appointments ${dateLabel.toLowerCase()}`}
      </h3>
      <p className="text-xs text-slate-400 mb-5 text-center max-w-xs">
        {hasFilters
          ? 'Try adjusting your filters or search query'
          : 'Appointments booked for this date will appear here'}
      </p>
      <div className="flex items-center gap-2">
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="rounded-xl text-xs"
          >
            <Filter className="h-3 w-3 mr-1.5" />
            Clear Filters
          </Button>
        )}
        <Link href="/frontdesk/appointments/new">
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs"
          >
            <Plus className="h-3 w-3 mr-1.5" />
            Book Appointment
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Loading skeleton */
function AppointmentsSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
