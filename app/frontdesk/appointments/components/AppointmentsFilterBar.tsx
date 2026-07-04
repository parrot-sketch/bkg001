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
  Stethoscope 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { StatusCounts } from '@/lib/constants/frontdesk';

export const STATUS_CHIPS = [
  {
    key: 'ALL',
    label: 'All',
    icon: CalendarDays,
  },
  {
    key: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    label: 'Awaiting Doctor',
    icon: Clock,
  },
  {
    key: AppointmentStatus.PENDING,
    label: 'Pending',
    icon: AlertCircle,
  },
  {
    key: AppointmentStatus.SCHEDULED,
    label: 'Scheduled',
    icon: Calendar,
  },
  {
    key: AppointmentStatus.CHECKED_IN,
    label: 'Checked In',
    icon: CheckCircle,
  },
  {
    key: AppointmentStatus.IN_CONSULTATION,
    label: 'In Consult',
    icon: Stethoscope,
  },
  {
    key: AppointmentStatus.COMPLETED,
    label: 'Completed',
    icon: CheckCircle,
  },
  {
    key: AppointmentStatus.CANCELLED,
    label: 'Cancelled',
    icon: AlertCircle,
  },
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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const handleClearSearch = useCallback((): void => {
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleStatusClick = useCallback((status: string) => {
    setStatusFilter(status);
  }, [setStatusFilter]);

  return (
    <div className="border border-[#e7d6bf] rounded-xl shadow-sm bg-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
            onClick={handlePrevClick}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            onClick={handleGoToToday}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
              isToday(selectedDate)
                ? 'bg-[#2c2e4b] text-white border-[#2c2e4b]'
                : 'bg-white text-[#2c2e4b] border-[#e7d6bf] hover:border-[#caa26a]/60 hover:bg-[#e7d6bf]/10'
            )}
          >
            <span className="block text-xs font-normal opacity-60">{dateLabel}</span>
            <span>{format(selectedDate, 'MMM d, yyyy')}</span>
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
            onClick={handleNextClick}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isToday(selectedDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoToToday}
              className="text-xs text-[#caa26a] hover:text-[#b8913e] hover:bg-[#e7d6bf]/15 rounded-lg ml-1"
            >
              Today
            </Button>
          )}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2c2e4b]/40" />
          <Input
            placeholder="Search patient, doctor, type..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 h-10 rounded-lg border-[#e7d6bf] text-[#2c2e4b] placeholder-[#2c2e4b]/40 focus:border-[#caa26a]"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2c2e4b]/40 hover:text-[#2c2e4b]"
            >
              ×
            </button>
          )}
        </div>

        {isRefetching && (
          <div className="flex items-center gap-1.5 text-xs text-[#2c2e4b]/40">
            <Loader2 className="h-3 w-3 animate-spin" />
            Refreshing...
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
        {STATUS_CHIPS.map((chip) => {
          const count = statusCounts[chip.key] || 0;
          const isActive = statusFilter === chip.key;
          const Icon = chip.icon;

          return (
            <button
              key={chip.key}
              onClick={() => handleStatusClick(chip.key)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                isActive
                  ? 'bg-[#caa26a]/10 text-[#caa26a] border-[#caa26a]'
                  : 'bg-white text-[#2c2e4b]/60 border-[#e7d6bf]/60 hover:border-[#caa26a]/60 hover:bg-[#e7d6bf]/10'
              )}
            >
              <Icon className="h-3 w-3" />
              {chip.label}
              {count > 0 && (
                <span
                  className={cn(
                    'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                    isActive
                      ? 'text-[#caa26a] bg-white/80'
                      : 'text-[#2c2e4b]/50 bg-[#e7d6bf]/20'
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
