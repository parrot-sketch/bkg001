import { useCallback } from 'react';
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
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { StatusCounts } from '@/lib/constants/frontdesk';

export const STATUS_CHIPS = [
  { key: 'ALL', label: 'All', icon: CalendarDays },
  {
    key: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    label: 'Awaiting doctor',
    icon: Clock,
  },
  { key: AppointmentStatus.PENDING, label: 'Pending', icon: AlertCircle },
  { key: AppointmentStatus.SCHEDULED, label: 'Scheduled', icon: Calendar },
  { key: AppointmentStatus.CHECKED_IN, label: 'Checked in', icon: CheckCircle },
  {
    key: AppointmentStatus.IN_CONSULTATION,
    label: 'In consult',
    icon: Stethoscope,
  },
  { key: AppointmentStatus.COMPLETED, label: 'Completed', icon: CheckCircle },
  { key: AppointmentStatus.CANCELLED, label: 'Cancelled', icon: AlertCircle },
] as const;

interface AppointmentsFilterBarProps {
  selectedDate: Date;
  dateLabel: string;
  handleNavigateDate: (direction: 'prev' | 'next') => void;
  handleGoToToday: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  statusCounts: StatusCounts;
  isRefetching: boolean;
}

export function AppointmentsFilterBar({
  selectedDate,
  dateLabel,
  handleNavigateDate,
  handleGoToToday,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  statusCounts,
  isRefetching,
}: AppointmentsFilterBarProps): React.ReactElement {
  const handlePrevClick = useCallback((): void => {
    handleNavigateDate('prev');
  }, [handleNavigateDate]);

  const handleNextClick = useCallback((): void => {
    handleNavigateDate('next');
  }, [handleNavigateDate]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery],
  );

  const handleClearSearch = useCallback((): void => {
    setSearchQuery('');
  }, [setSearchQuery]);

  return (
    <div className="space-y-3 border border-white/15 bg-[#2c2e4b]/45 px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md text-[#e7d6bf] hover:bg-white/10 hover:text-white"
            onClick={handlePrevClick}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={handleGoToToday}
            className={cn(
              'min-w-[9.5rem] border px-3 py-1.5 text-left transition-colors',
              isToday(selectedDate)
                ? 'border-[#caa26a] bg-[#caa26a]/15 text-white'
                : 'border-white/20 bg-transparent text-white hover:border-[#caa26a]/50',
            )}
          >
            <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[#e7d6bf]">
              {dateLabel}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {format(selectedDate, 'MMM d, yyyy')}
            </span>
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md text-[#e7d6bf] hover:bg-white/10 hover:text-white"
            onClick={handleNextClick}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isToday(selectedDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoToToday}
              className="ml-1 h-8 rounded-md px-2 text-xs text-[#caa26a] hover:bg-white/10 hover:text-[#ee9b00]"
            >
              Today
            </Button>
          )}
        </div>

        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2c2e4b]/45" />
          <Input
            placeholder="Search patient, doctor, type..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-10 rounded-md border-0 bg-white pl-10 text-sm text-[#2c2e4b] placeholder:text-[#2c2e4b]/45 focus-visible:ring-[#caa26a]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2c2e4b]/45 hover:text-[#2c2e4b]"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {isRefetching && (
          <div className="flex items-center gap-1.5 text-xs text-[#e7d6bf]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Refreshing
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {STATUS_CHIPS.map((chip) => {
          const count = statusCounts[chip.key] || 0;
          const isActive = statusFilter === chip.key;
          const Icon = chip.icon;

          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setStatusFilter(chip.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'border-[#caa26a] bg-[#caa26a]/20 text-white'
                  : 'border-white/15 text-[#e7d6bf] hover:border-white/30 hover:text-white',
              )}
            >
              <Icon className="h-3 w-3" />
              {chip.label}
              {count > 0 && (
                <span
                  className={cn(
                    'ml-0.5 px-1.5 py-0.5 text-[10px] font-bold leading-none',
                    isActive ? 'bg-white/15 text-white' : 'bg-white/10 text-[#e7d6bf]',
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
