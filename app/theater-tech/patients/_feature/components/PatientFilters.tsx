import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QUICK_FILTERS } from '../constants/filters';
import type { QuickFilter } from '../types/patient-page';

interface PatientFiltersProps {
  activeFilters: QuickFilter[];
  onToggle: (filter: QuickFilter) => void;
}

export function PatientFilters({ activeFilters, onToggle }: PatientFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUICK_FILTERS.map((filter) => {
        const isActive = activeFilters.includes(filter.key);
        const Icon = filter.icon;
        return (
          <Button
            key={filter.key}
            variant="outline"
            size="sm"
            onClick={() => onToggle(filter.key)}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-medium transition-all border',
              isActive
                ? 'bg-[#e7d6bf]/20 border-[#caa26a]/40 text-[#2c2e4b] shadow-sm'
                : 'border-[#e7d6bf] text-[#2c2e4b]/60 hover:bg-[#e7d6bf]/10 hover:border-[#caa26a]/30',
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 mr-1.5', isActive ? 'text-[#caa26a]' : 'text-[#2c2e4b]/40')} />
            {filter.label}
            {isActive && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#caa26a]" />}
          </Button>
        );
      })}
    </div>
  );
}
