/**
 * Component: BlockerIndicator
 *
 * Displays the blocker level indicator (clear/warning/blocked).
 */

import { cn } from '@/lib/utils';
import type { DayboardBlockersDto } from '@/application/dtos/TheaterTechDtos';
import { computeBlockerLevel } from '@/lib/theater-tech/dayboardHelpers';

interface BlockerIndicatorProps {
  blockers: DayboardBlockersDto;
}

export function BlockerIndicator({ blockers }: BlockerIndicatorProps) {
  const level = computeBlockerLevel(blockers);
  const config = {
    clear: { color: 'bg-emerald-500', label: 'Ready' },
    warning: { color: 'bg-amber-400', label: 'Warning' },
    blocked: { color: 'bg-red-500', label: 'Blocked' },
  }[level];

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('h-2 w-2 rounded-full', config.color)} />
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wider',
          level === 'clear'
            ? 'text-emerald-700'
            : level === 'warning'
            ? 'text-amber-700'
            : 'text-red-700'
        )}
      >
        {config.label}
      </span>
    </div>
  );
}
