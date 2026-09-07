'use client';

import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';

interface FrontdeskVisitHistoryFiltersProps {
  patientId: string;
  selectedDate?: string | null;
  filteredCount: number;
  totalCount: number;
}

export function FrontdeskVisitHistoryFilters({
  patientId,
  selectedDate,
  filteredCount,
  totalCount,
}: FrontdeskVisitHistoryFiltersProps) {
  const router = useRouter();

  const pushDate = (date: Date | undefined) => {
    const base = `/frontdesk/patient/${patientId}`;
    if (!date) {
      router.push(base, { scroll: false });
      return;
    }
    const value = format(date, 'yyyy-MM-dd');
    router.push(`${base}?visitDate=${value}`, { scroll: false });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <div className="w-full sm:w-[200px]">
        <DatePicker
          value={selectedDate ? parseISO(selectedDate) : undefined}
          onChange={pushDate}
          placeholder="Filter by date"
          className="h-8 text-xs border-[#e7d6bf] bg-white text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
        />
      </div>
      {selectedDate ? (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#2c2e4b]/60">
            Showing {filteredCount} of {totalCount} visit{totalCount === 1 ? '' : 's'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => pushDate(undefined)}
            className="h-8 px-2 text-xs text-[#2c2e4b]/70 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
