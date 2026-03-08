import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Loader2, 
  CalendarDays, 
  Clock, 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  Stethoscope 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

export const STATUS_CHIPS = [
  {
    key: 'ALL',
    label: 'All',
    icon: CalendarDays,
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
  },
  {
    key: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    label: 'Awaiting Doctor',
    icon: Clock,
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-300',
  },
  {
    key: AppointmentStatus.PENDING,
    label: 'Pending',
    icon: AlertCircle,
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-300',
  },
  {
    key: AppointmentStatus.SCHEDULED,
    label: 'Scheduled',
    icon: Calendar,
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-300',
  },
  {
    key: AppointmentStatus.CHECKED_IN,
    label: 'Checked In',
    icon: CheckCircle,
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-300',
  },
  {
    key: AppointmentStatus.IN_CONSULTATION,
    label: 'In Consult',
    icon: Stethoscope,
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-300',
  },
  {
    key: AppointmentStatus.COMPLETED,
    label: 'Completed',
    icon: CheckCircle,
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-300',
  },
  {
    key: AppointmentStatus.CANCELLED,
    label: 'Cancelled',
    icon: AlertCircle,
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-300',
  },
];

interface AppointmentsFilterBarProps {
  selectedDate: Date;
  dateLabel: string;
  navigateDate: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  statusCounts: Record<string, number>;
  isRefetching: boolean;
}

export function AppointmentsFilterBar({
  selectedDate,
  dateLabel,
  navigateDate,
  goToToday,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  statusCounts,
  isRefetching,
}: AppointmentsFilterBarProps) {
  return (
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
  );
}
